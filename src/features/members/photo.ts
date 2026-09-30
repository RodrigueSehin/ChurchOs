/** Photo d'un membre : bucket public `churchos-member-photos`, chemin
 * `<organization_id>/<person_id>/photo-<uuid>.<ext>`, URL publique dans `people.photo_url`. */
export const MEMBER_PHOTO_BUCKET = "churchos-member-photos";
export const MEMBER_PHOTO_MAX_BYTES = 2 * 1024 * 1024;
export const MEMBER_PHOTO_MIME_EXTENSIONS: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};

/** Chemin Storage d'une photo de NOTRE bucket (sinon `null` : URL externe ou absente). */
export function memberPhotoStoragePath(url: string | null | undefined) {
  const marker = `/object/public/${MEMBER_PHOTO_BUCKET}/`;
  const i = url?.indexOf(marker) ?? -1;
  return url && i >= 0 ? decodeURIComponent(url.slice(i + marker.length)) : null;
}
