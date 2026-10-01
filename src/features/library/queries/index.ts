import "server-only";
import { and, asc, count, desc, eq, ilike, inArray, or, sql, type SQL } from "drizzle-orm";

import { db } from "@/lib/db/client";
import { libraryBookmarks, libraryCategories, libraryRatings, libraryResources } from "@/lib/db/schema";
import { DEFAULT_LIBRARY_CATEGORIES } from "@/features/library/schemas";

export const LIBRARY_PAGE_SIZE = 8;

/** Ce que voit l'utilisateur : les responsables voient tout (brouillons, archivés, « responsables »),
 * les autres uniquement les ressources publiées et visibles par tous les membres. */
function visibleTo(organizationId: string, canManage: boolean): SQL {
  return canManage
    ? eq(libraryResources.organizationId, organizationId)
    : and(
        eq(libraryResources.organizationId, organizationId),
        eq(libraryResources.status, "published"),
        eq(libraryResources.visibility, "members"),
      )!;
}

/** Catégories de l'organisation ; une organisation qui n'en a aucune reçoit les catégories par défaut. */
export async function getLibraryCategories(organizationId: string) {
  const list = () =>
    db
      .select({ id: libraryCategories.id, name: libraryCategories.name, createdAt: libraryCategories.createdAt })
      .from(libraryCategories)
      .where(eq(libraryCategories.organizationId, organizationId))
      .orderBy(asc(libraryCategories.createdAt), asc(libraryCategories.name));
  const existing = await list();
  if (existing.length > 0) return existing;
  await db
    .insert(libraryCategories)
    .values(DEFAULT_LIBRARY_CATEGORIES.map((name) => ({ organizationId, name })))
    .onConflictDoNothing();
  return list();
}

export async function getLibraryStats(organizationId: string, canManage: boolean) {
  const monthStart = new Date();
  monthStart.setUTCDate(1);
  monthStart.setUTCHours(0, 0, 0, 0);
  const since = monthStart.toISOString();

  const [[res], [cats], [rating]] = await Promise.all([
    db
      .select({
        total: sql<number>`count(*)::int`,
        newThisMonth: sql<number>`count(*) filter (where ${libraryResources.createdAt} >= ${since})::int`,
        downloads: sql<number>`coalesce(sum(${libraryResources.downloadCount}), 0)::int`,
      })
      .from(libraryResources)
      .where(visibleTo(organizationId, canManage)),
    db
      .select({
        total: sql<number>`count(*)::int`,
        newThisMonth: sql<number>`count(*) filter (where ${libraryCategories.createdAt} >= ${since})::int`,
      })
      .from(libraryCategories)
      .where(eq(libraryCategories.organizationId, organizationId)),
    db
      .select({ avg: sql<number | null>`avg(${libraryRatings.rating})::float` })
      .from(libraryRatings)
      .where(eq(libraryRatings.organizationId, organizationId)),
  ]);

  const total = res?.total ?? 0;
  const newThisMonth = res?.newThisMonth ?? 0;
  const before = total - newThisMonth;
  return {
    total,
    resourcesDeltaPct: before > 0 ? Math.round((newThisMonth / before) * 100) : null,
    categories: cats?.total ?? 0,
    newCategories: cats?.newThisMonth ?? 0,
    downloads: res?.downloads ?? 0,
    averageRating: rating?.avg ? Math.round(rating.avg * 10) / 10 : null,
  };
}

const FORMAT_CONDITIONS: Record<string, SQL> = {
  pdf: sql`${libraryResources.fileMime} = 'application/pdf'`,
  word: sql`${libraryResources.fileMime} like '%wordprocessingml%'`,
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TYPES = ["book", "bible_study", "teaching", "document"];

export async function getLibraryResources({
  organizationId,
  userId,
  canManage,
  search,
  type,
  categoryId,
  format,
  sort = "recent",
  bookmarked = false,
  page = 1,
}: {
  organizationId: string;
  userId: string;
  canManage: boolean;
  search?: string;
  type?: string;
  categoryId?: string;
  format?: string;
  sort?: string;
  bookmarked?: boolean;
  page?: number;
}) {
  const conditions: SQL[] = [visibleTo(organizationId, canManage)];
  if (search?.trim()) {
    const term = `%${search.trim()}%`;
    conditions.push(
      or(
        ilike(libraryResources.title, term),
        ilike(libraryResources.author, term),
        ilike(libraryResources.description, term),
        sql`exists (select 1 from unnest(${libraryResources.tags}) t where t ilike ${term})`,
      )!,
    );
  }
  if (type && TYPES.includes(type)) conditions.push(eq(libraryResources.resourceType, type));
  if (categoryId && UUID_RE.test(categoryId)) conditions.push(eq(libraryResources.categoryId, categoryId));
  if (format && FORMAT_CONDITIONS[format]) conditions.push(FORMAT_CONDITIONS[format]!);
  if (bookmarked) {
    conditions.push(
      sql`exists (select 1 from library_bookmarks b where b.resource_id = ${libraryResources.id} and b.user_id = ${userId})`,
    );
  }
  const where = and(...conditions);

  const orderBy =
    sort === "downloads"
      ? [desc(libraryResources.downloadCount), desc(libraryResources.createdAt)]
      : sort === "views"
        ? [desc(libraryResources.viewCount), desc(libraryResources.createdAt)]
        : sort === "title"
          ? [asc(libraryResources.title)]
          : [desc(libraryResources.createdAt)];

  const [rows, [totalRow]] = await Promise.all([
    db
      .select({
        id: libraryResources.id,
        title: libraryResources.title,
        resourceType: libraryResources.resourceType,
        author: libraryResources.author,
        description: libraryResources.description,
        fileMime: libraryResources.fileMime,
        fileSize: libraryResources.fileSize,
        coverUrl: libraryResources.coverUrl,
        status: libraryResources.status,
        viewCount: libraryResources.viewCount,
        downloadCount: libraryResources.downloadCount,
        categoryName: libraryCategories.name,
        createdBy: libraryResources.createdBy,
      })
      .from(libraryResources)
      .leftJoin(libraryCategories, eq(libraryCategories.id, libraryResources.categoryId))
      .where(where)
      .orderBy(...orderBy)
      .limit(LIBRARY_PAGE_SIZE)
      .offset((page - 1) * LIBRARY_PAGE_SIZE),
    db.select({ value: count() }).from(libraryResources).where(where),
  ]);

  const ids = rows.map((r) => r.id);
  const [saved, mine] = ids.length
    ? await Promise.all([
        db
          .select({ id: libraryBookmarks.resourceId })
          .from(libraryBookmarks)
          .where(and(eq(libraryBookmarks.userId, userId), inArray(libraryBookmarks.resourceId, ids))),
        db
          .select({ id: libraryRatings.resourceId, rating: libraryRatings.rating })
          .from(libraryRatings)
          .where(and(eq(libraryRatings.userId, userId), inArray(libraryRatings.resourceId, ids))),
      ])
    : [[], []];
  const savedIds = new Set(saved.map((s) => s.id));
  const myRatings = new Map(mine.map((m) => [m.id, m.rating]));

  return {
    rows: rows.map((r) => ({ ...r, bookmarked: savedIds.has(r.id), myRating: myRatings.get(r.id) ?? null })),
    total: totalRow?.value ?? 0,
    pageSize: LIBRARY_PAGE_SIZE,
  };
}

export async function getCategoryCounts(organizationId: string, canManage: boolean) {
  const [categories, counts] = await Promise.all([
    getLibraryCategories(organizationId),
    db
      .select({ categoryId: libraryResources.categoryId, value: count() })
      .from(libraryResources)
      .where(visibleTo(organizationId, canManage))
      .groupBy(libraryResources.categoryId),
  ]);
  const byCategory = new Map(counts.map((c) => [c.categoryId, c.value]));
  return categories.map((c) => ({ ...c, count: byCategory.get(c.id) ?? 0 }));
}

export async function getPopularResources(organizationId: string, canManage: boolean, limit = 5) {
  return db
    .select({
      id: libraryResources.id,
      title: libraryResources.title,
      author: libraryResources.author,
      coverUrl: libraryResources.coverUrl,
      downloadCount: libraryResources.downloadCount,
    })
    .from(libraryResources)
    .where(visibleTo(organizationId, canManage))
    .orderBy(desc(libraryResources.downloadCount), desc(libraryResources.createdAt))
    .limit(limit);
}

/** Une ressource que l'utilisateur a le droit de voir (mêmes règles que la liste), ou `null`. */
export async function getResourceForViewer(organizationId: string, resourceId: string, canManage: boolean) {
  if (!UUID_RE.test(resourceId)) return null;
  const [row] = await db
    .select({
      id: libraryResources.id,
      title: libraryResources.title,
      resourceType: libraryResources.resourceType,
      author: libraryResources.author,
      publisher: libraryResources.publisher,
      publishedOn: libraryResources.publishedOn,
      description: libraryResources.description,
      filePath: libraryResources.filePath,
      fileName: libraryResources.fileName,
      fileMime: libraryResources.fileMime,
      fileSize: libraryResources.fileSize,
      coverUrl: libraryResources.coverUrl,
      status: libraryResources.status,
      tags: libraryResources.tags,
      viewCount: libraryResources.viewCount,
      downloadCount: libraryResources.downloadCount,
      categoryName: libraryCategories.name,
    })
    .from(libraryResources)
    .leftJoin(libraryCategories, eq(libraryCategories.id, libraryResources.categoryId))
    .where(and(visibleTo(organizationId, canManage), eq(libraryResources.id, resourceId)));
  return row ?? null;
}
