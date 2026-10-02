"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Box, Calendar, Check, CircleDollarSign, Eye, FileText, ListChecks, MapPin, ReceiptText, ShieldCheck, Store, Tag } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormSelect } from "@/components/shared/form-select";
import { getResourceDocumentUrl, saveEquipment } from "@/features/resources/actions";
import { Field, FileDropzone, FormSection, TEXTAREA_CLASS, uploadFiles, useObjectUrl, type FileSlot } from "@/features/resources/components/form-parts";
import {
  CONDITION_LABELS,
  CONDITION_STYLES,
  DOC_MIME_EXTENSIONS,
  EQUIPMENT_CATEGORIES,
  MAX_DOCUMENTS,
  MAX_PHOTOS,
  PHOTO_MIME_EXTENSIONS,
  RESOURCE_DOC_BUCKET,
  RESOURCE_FILE_MAX_BYTES,
  RESOURCE_PHOTO_BUCKET,
  type ResourceDocument,
} from "@/features/resources/schemas";
import type { resources } from "@/lib/db/schema";
import { cn } from "@/lib/utils";

type Equipment = typeof resources.$inferSelect;

const fmtDate = (iso: string) => (iso ? new Intl.DateTimeFormat("fr-FR").format(new Date(`${iso}T00:00:00`)) : "");

/** Formulaire « Nouvel équipement » (création et modification) : 5 sections + aperçu en direct. */
export function EquipmentForm({
  organizationId,
  equipment,
  rooms,
  people,
}: {
  organizationId: string;
  equipment?: Equipment;
  rooms: { id: string; name: string }[];
  people: { id: string; name: string }[];
}) {
  const router = useRouter();
  const editing = Boolean(equipment);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState(equipment?.name ?? "");
  const [category, setCategory] = useState(equipment?.category ?? "");
  const [quantity, setQuantity] = useState(String(equipment?.quantity ?? 1));
  const [description, setDescription] = useState(equipment?.description ?? "");
  const [brand, setBrand] = useState(equipment?.brand ?? "");
  const [model, setModel] = useState(equipment?.model ?? "");
  const [serialNumber, setSerialNumber] = useState(equipment?.serialNumber ?? "");
  const [condition, setCondition] = useState(equipment?.condition ?? "good");
  const [purchaseDate, setPurchaseDate] = useState(equipment?.purchaseDate ?? "");
  const [purchaseValue, setPurchaseValue] = useState(equipment?.purchaseValue != null ? String(equipment.purchaseValue) : "");
  const [roomId, setRoomId] = useState(equipment?.roomId ?? "");
  const [responsible, setResponsible] = useState(equipment?.responsiblePersonId ?? "");
  const [warrantyEnd, setWarrantyEnd] = useState(equipment?.warrantyEnd ?? "");
  const [supplier, setSupplier] = useState(equipment?.supplier ?? "");
  const [invoiceRef, setInvoiceRef] = useState(equipment?.invoiceReference ?? "");

  const [existingPhotos, setExistingPhotos] = useState<string[]>(equipment?.photos ?? []);
  const [removedPhotos, setRemovedPhotos] = useState<string[]>([]);
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [existingDocs, setExistingDocs] = useState<ResourceDocument[]>(equipment?.documents ?? []);
  const [removedDocs, setRemovedDocs] = useState<string[]>([]);

  // Un seul champ de dépôt (photos et documents) : les images deviennent des photos, les PDF des documents.
  const newImages = newFiles.filter((f) => f.type.startsWith("image/"));
  const newDocs = newFiles.filter((f) => f.type === "application/pdf");
  const slot: FileSlot = {
    existing: [
      ...existingPhotos.map((u) => ({ key: `photo:${u}`, label: "Photo", previewUrl: u })),
      ...existingDocs.map((d) => ({ key: `doc:${d.path}`, label: d.name })),
    ],
    added: newFiles,
  };
  const localCover = useObjectUrl(newImages[0]);
  const cover = existingPhotos[0] ?? localCover;
  const roomName = rooms.find((r) => r.id === roomId)?.name;

  function submit(mode: "draft" | "create") {
    setError(null);
    startTransition(async () => {
      const images = await uploadFiles(RESOURCE_PHOTO_BUCKET, organizationId, newImages);
      if (images.error) return setError(images.error);
      const docs = await uploadFiles(RESOURCE_DOC_BUCKET, organizationId, newDocs);
      if (docs.error) {
        const { createClient } = await import("@/lib/supabase/client");
        await createClient().storage.from(RESOURCE_PHOTO_BUCKET).remove(images.refs.map((r) => r.path));
        return setError(docs.error);
      }
      const res = await saveEquipment({
        id: equipment?.id,
        fields: { name, category, quantity, description, brand, model, serialNumber, condition, purchaseDate, purchaseValue, roomId, responsiblePersonId: responsible, warrantyEnd, supplier, invoiceReference: invoiceRef, mode },
        newPhotos: images.refs,
        removedPhotos,
        newDocuments: docs.refs,
        removedDocuments: removedDocs,
      });
      if (res.error) return setError(res.error); // l'action retire déjà les nouveaux fichiers
      router.push("/resources?tab=equipment");
      router.refresh();
    });
  }

  async function openDoc(d: ResourceDocument) {
    if (!equipment) return;
    const res = await getResourceDocumentUrl(equipment.id, d.path);
    if (res.url) window.open(res.url, "_blank", "noopener,noreferrer");
    else setError(res.error ?? "Document indisponible.");
  }

  const extra: [typeof Tag, string, string][] = [
    [Tag, "Numéro de série", serialNumber],
    [Calendar, "Date d'achat", fmtDate(purchaseDate)],
    [CircleDollarSign, "Valeur d'achat", purchaseValue ? `${new Intl.NumberFormat("fr-FR").format(Number(purchaseValue.replace(/\s/g, "")) || 0)} FCFA` : ""],
    [ShieldCheck, "Fin de garantie", fmtDate(warrantyEnd)],
    [Store, "Fournisseur", supplier],
    [ReceiptText, "Référence facture", invoiceRef],
  ];

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_400px]">
      <div className="flex min-w-0 flex-col gap-5">
        <FormSection step={1} title="Informations générales" hint="Renseignez les informations principales de l'équipement." tone="blue">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-[1.4fr_1fr_110px]">
            <Field label="Nom de l'équipement" required htmlFor="eq-name">
              <Input id="eq-name" value={name} maxLength={100} onChange={(e) => setName(e.target.value)} placeholder="Ex : Projecteur, Micro sans fil, Chaise, Table…" />
            </Field>
            <Field label="Catégorie" required htmlFor="eq-category">
              <FormSelect id="eq-category" value={category} onChange={(e) => setCategory(e.target.value)}>
                <option value="">Sélectionner une catégorie</option>
                {category && !(EQUIPMENT_CATEGORIES as readonly string[]).includes(category) && <option value={category}>{category}</option>}
                {EQUIPMENT_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </FormSelect>
            </Field>
            <Field label="Quantité" htmlFor="eq-quantity">
              <Input id="eq-quantity" type="number" min={1} value={quantity} onChange={(e) => setQuantity(e.target.value)} />
            </Field>
          </div>
          <Field label="Description" htmlFor="eq-description" counter={`${description.length}/500`}>
            <textarea id="eq-description" rows={3} maxLength={500} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Décrivez l'équipement, ses caractéristiques, son utilisation…" className={TEXTAREA_CLASS} />
          </Field>
        </FormSection>

        <FormSection step={2} title="Détails et caractéristiques" hint="Précisez les informations techniques et l'état de l'équipement." tone="purple">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <Field label="Marque" htmlFor="eq-brand"><Input id="eq-brand" value={brand} maxLength={100} onChange={(e) => setBrand(e.target.value)} placeholder="Ex : Samsung, JBL, Shure…" /></Field>
            <Field label="Modèle" htmlFor="eq-model"><Input id="eq-model" value={model} maxLength={100} onChange={(e) => setModel(e.target.value)} placeholder="Ex : X123, SM58…" /></Field>
            <Field label="Numéro de série" htmlFor="eq-serial"><Input id="eq-serial" value={serialNumber} maxLength={100} onChange={(e) => setSerialNumber(e.target.value)} placeholder="Ex : SN123456…" /></Field>
            <Field label="État actuel" required htmlFor="eq-condition">
              <FormSelect id="eq-condition" value={condition} onChange={(e) => setCondition(e.target.value)}>
                {Object.entries(CONDITION_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </FormSelect>
            </Field>
            <Field label="Date d'achat" htmlFor="eq-purchase-date"><Input id="eq-purchase-date" type="date" value={purchaseDate} onChange={(e) => setPurchaseDate(e.target.value)} /></Field>
            <Field label="Valeur d'achat (FCFA)" htmlFor="eq-value"><Input id="eq-value" inputMode="numeric" value={purchaseValue} onChange={(e) => setPurchaseValue(e.target.value)} placeholder="Ex : 250 000" /></Field>
          </div>
        </FormSection>

        <FormSection step={3} title="Affectation et localisation" hint="Indiquez où se trouve l'équipement et qui en est responsable." tone="green">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field label="Salle / Localisation" htmlFor="eq-room">
              <FormSelect id="eq-room" value={roomId} onChange={(e) => setRoomId(e.target.value)}>
                <option value="">Sélectionner une salle</option>
                {rooms.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
              </FormSelect>
            </Field>
            <Field label="Responsable" htmlFor="eq-responsible">
              <FormSelect id="eq-responsible" value={responsible} onChange={(e) => setResponsible(e.target.value)}>
                <option value="">Sélectionner un responsable</option>
                {people.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </FormSelect>
            </Field>
          </div>
        </FormSection>

        <FormSection step={4} title="Informations supplémentaires" optional hint="Ajoutez des détails complémentaires selon vos besoins." tone="amber">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <Field label="Date de fin de garantie" htmlFor="eq-warranty"><Input id="eq-warranty" type="date" value={warrantyEnd} onChange={(e) => setWarrantyEnd(e.target.value)} /></Field>
            <Field label="Fournisseur" htmlFor="eq-supplier"><Input id="eq-supplier" value={supplier} maxLength={150} onChange={(e) => setSupplier(e.target.value)} placeholder="Ex : Nom du fournisseur…" /></Field>
            <Field label="Référence facture" htmlFor="eq-invoice"><Input id="eq-invoice" value={invoiceRef} maxLength={100} onChange={(e) => setInvoiceRef(e.target.value)} placeholder="Ex : FAC-2024-001…" /></Field>
          </div>
        </FormSection>

        <FormSection step={5} title="Photo et documents" optional hint="Ajoutez une photo et des documents liés à cet équipement." tone="pink">
          <FileDropzone
            title="Cliquez pour ajouter des images ou des documents"
            hint={<>JPG, PNG, PDF (max 5 Mo par fichier)<br />Format d&apos;image recommandé : 1200 x 800 px</>}
            accept=".jpg,.jpeg,.png,.pdf"
            mimes={[...Object.keys(PHOTO_MIME_EXTENSIONS).filter((m) => m !== "image/webp"), ...Object.keys(DOC_MIME_EXTENSIONS).filter((m) => m === "application/pdf")]}
            maxBytes={RESOURCE_FILE_MAX_BYTES}
            max={MAX_PHOTOS + MAX_DOCUMENTS}
            slot={slot}
            onError={setError}
            onChange={({ added, removeExisting }) => {
              if (added) setNewFiles(added);
              if (removeExisting?.startsWith("photo:")) {
                const url = removeExisting.slice(6);
                setExistingPhotos(existingPhotos.filter((u) => u !== url));
                setRemovedPhotos([...removedPhotos, url]);
              } else if (removeExisting?.startsWith("doc:")) {
                const path = removeExisting.slice(4);
                setExistingDocs(existingDocs.filter((d) => d.path !== path));
                setRemovedDocs([...removedDocs, path]);
              }
            }}
          />
          {existingDocs.length > 0 && equipment && (
            <p className="flex flex-wrap gap-2 text-xs">
              {existingDocs.map((d) => (
                <button key={d.path} type="button" onClick={() => openDoc(d)} className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-1 text-primary hover:underline">
                  <FileText className="size-3" />
                  {d.name}
                </button>
              ))}
            </p>
          )}
        </FormSection>
      </div>

      <aside className="flex flex-col gap-5 self-start xl:sticky xl:top-4">
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="flex items-center gap-3 bg-purple-50 px-4 py-3">
            <span className="flex size-9 items-center justify-center rounded-full bg-purple-100 text-purple-600"><Eye className="size-4" /></span>
            <div>
              <p className="font-semibold text-navy">Aperçu de l&apos;équipement</p>
              <p className="text-xs text-slate-500">Voici un aperçu des informations saisies.</p>
            </div>
          </div>
          <div className="flex flex-col gap-3 p-4">
            <div className="relative aspect-[16/9] overflow-hidden rounded-lg bg-gradient-to-br from-navy to-primary">
              {cover ? (
                // eslint-disable-next-line @next/next/no-img-element -- aperçu local (blob) ou image du bucket public
                <img src={cover} alt="" className="size-full object-cover" />
              ) : (
                <span className="flex size-full items-center justify-center text-white/70"><Box className="size-12" /></span>
              )}
              {!cover && <span className="absolute right-2 top-2 rounded-full bg-black/40 px-2 py-0.5 text-[11px] text-white">Aucune photo</span>}
            </div>
            <div className="flex items-start justify-between gap-2">
              <p className="min-w-0 break-words text-lg font-bold text-primary">{name || "Nom de l'équipement"}</p>
              <span className={cn("shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium", CONDITION_STYLES[condition])}>{CONDITION_LABELS[condition]}</span>
            </div>
            <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-600">
              <span className="inline-flex items-center gap-1.5"><Box className="size-4 text-primary" />{category || "Catégorie"}</span>
              <span className="inline-flex items-center gap-1.5"><Tag className="size-4 text-primary" />{[brand, model].filter(Boolean).join(" - ") || "Marque - Modèle"}</span>
              <span className="inline-flex items-center gap-1.5"><MapPin className="size-4 text-primary" />{roomName || "Salle"}</span>
            </p>
            <p className="text-sm text-slate-500">{description || "La description de l'équipement apparaîtra ici. Elle permettra aux membres de mieux comprendre son utilisation et ses caractéristiques."}</p>
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="flex items-center gap-3 bg-purple-50 px-4 py-3">
            <span className="flex size-9 items-center justify-center rounded-full bg-purple-100 text-purple-600"><ListChecks className="size-4" /></span>
            <div>
              <p className="font-semibold text-navy">Informations complémentaires</p>
              <p className="text-xs text-slate-500">Détails techniques et administratifs.</p>
            </div>
          </div>
          <dl className="flex flex-col gap-3 p-4 text-sm">
            {extra.map(([Icon, label, value]) => (
              <div key={label} className="grid grid-cols-[24px_1fr_auto] items-center gap-2">
                <Icon className="size-4 text-primary" />
                <dt className="text-slate-600">{label}</dt>
                <dd className="max-w-[170px] truncate text-right text-navy">{value || "—"}</dd>
              </div>
            ))}
          </dl>
        </div>

        {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_1.2fr]">
          <Button type="button" variant="secondary" disabled={pending} onClick={() => submit("draft")} className="bg-blue-50 text-primary">
            <FileText className="size-4" />
            Enregistrer en brouillon
          </Button>
          <Button type="button" disabled={pending} onClick={() => submit("create")} className="bg-navy hover:bg-navy/90">
            <Check className="size-4" />
            {pending ? "Enregistrement…" : editing ? "Enregistrer l'équipement" : "Créer l'équipement"}
          </Button>
        </div>
        <Link href="/resources?tab=equipment" className="self-center text-xs text-slate-500 underline">Annuler</Link>
      </aside>
    </div>
  );
}
