"use client";

import { useActionState, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CreditCard, FileText, FolderOpen, Plus, Save, Store, UploadCloud, Wallet, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { FormSelect } from "@/components/shared/form-select";
import { createTransaction, type FinanceActionState } from "@/features/finance/actions";
import {
  ATTACHMENT_ALLOWED_MIME_TYPES,
  ATTACHMENT_MAX_BYTES,
  ATTACHMENT_MAX_FILES,
  PAYMENT_METHOD_LABELS,
  TRANSACTION_STATUS_LABELS,
} from "@/features/finance/schemas";
import { cn } from "@/lib/utils";

const initialState: FinanceActionState = {};
const TEXT_MAX = 500;

interface Option {
  id: string;
  name: string;
}
interface CategoryOption extends Option {
  parentId: string | null;
}

const TEXTAREA_CLASS =
  "flex w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-colors focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20";

function SectionHeader({ step, title, subtitle, tone }: { step: number; title: string; subtitle: string; tone: "blue" | "green" | "purple" }) {
  const tones = {
    blue: { band: "bg-blue-50", dot: "bg-blue-600", title: "text-blue-900" },
    green: { band: "bg-green-50", dot: "bg-green-600", title: "text-green-900" },
    purple: { band: "bg-purple-50", dot: "bg-purple-600", title: "text-purple-900" },
  }[tone];
  return (
    <div className={`flex items-center gap-3 rounded-lg px-4 py-3 ${tones.band}`}>
      <span className={`flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white ${tones.dot}`}>{step}</span>
      <div>
        <p className={`text-base font-semibold ${tones.title}`}>{title}</p>
        <p className="text-xs text-slate-500">{subtitle}</p>
      </div>
    </div>
  );
}

function formatSize(bytes: number) {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
  return `${Math.max(1, Math.round(bytes / 1024))} Ko`;
}

/** Formulaire « Nouvelle dépense » en 3 sections numérotées (maquette
 * `src/img/Formulaire nouvelle dépense ChurchOS.webp`). Les champs supplémentaires (libellé,
 * fournisseur, sous-catégorie, centre de coût, statut, notes, pièces jointes) sont portés par
 * `db/migrations/2026-09-30-expense-form-fields.sql`. */
export function ExpenseFormDialog({
  categories,
  funds,
  accounts,
  campuses,
  vendors,
  currency,
  canApprove,
  triggerLabel = "Nouvelle dépense",
}: {
  categories: CategoryOption[];
  funds: Option[];
  accounts: Option[];
  campuses: Option[];
  vendors: string[];
  currency: string;
  /** Sans `finance.approve`, la dépense est toujours créée « En attente » (contrôlé aussi côté serveur). */
  canApprove: boolean;
  triggerLabel?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [categoryId, setCategoryId] = useState("");
  const [description, setDescription] = useState("");
  const [notes, setNotes] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [fileError, setFileError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [savedNew, setSavedNew] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const topLevel = categories.filter((c) => !c.parentId);
  const subcategories = categories.filter((c) => c.parentId === categoryId);

  function syncInput(next: File[]) {
    const dt = new DataTransfer();
    for (const f of next) dt.items.add(f);
    if (fileInputRef.current) fileInputRef.current.files = dt.files;
    setFiles(next);
  }

  function addFiles(incoming: FileList | File[]) {
    setFileError(null);
    const next = [...files];
    for (const f of Array.from(incoming)) {
      if (!ATTACHMENT_ALLOWED_MIME_TYPES.includes(f.type)) {
        setFileError(`« ${f.name} » : format non accepté (PDF, JPG ou PNG).`);
        continue;
      }
      if (f.size > ATTACHMENT_MAX_BYTES) {
        setFileError(`« ${f.name} » dépasse 10 Mo.`);
        continue;
      }
      if (next.length >= ATTACHMENT_MAX_FILES) {
        setFileError(`${ATTACHMENT_MAX_FILES} fichiers maximum.`);
        break;
      }
      next.push(f);
    }
    syncInput(next);
  }

  function resetForm() {
    formRef.current?.reset();
    setCategoryId("");
    setDescription("");
    setNotes("");
    syncInput([]);
    setFileError(null);
  }

  const [, startTransition] = useTransition();
  const [state, formAction, pending] = useActionState(async (prev: FinanceActionState, formData: FormData) => {
    const result = await createTransaction(prev, formData);
    if (result.success) {
      if (formData.get("intent") === "new") {
        resetForm();
        setSavedNew(true);
        router.refresh();
      } else {
        setOpen(false);
        window.location.reload();
      }
    } else {
      setSavedNew(false);
    }
    return result;
  }, initialState);

  const unit = currency === "XOF" || currency === "XAF" ? "FCFA" : currency;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button type="button" onClick={() => setOpen(true)}>
        <Plus className="size-4" />
        {triggerLabel}
      </Button>
      <DialogContent className="max-h-[94dvh] max-w-3xl overflow-y-auto p-0">
        <div className="flex items-center gap-4 px-6 pb-2 pt-6">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-red-100 text-red-600">
            <Wallet className="size-6" />
          </span>
          <div>
            <DialogTitle className="text-xl font-semibold text-navy">Nouvelle dépense</DialogTitle>
            <DialogDescription className="text-sm text-slate-500">Enregistrez une nouvelle dépense pour votre église.</DialogDescription>
          </div>
        </div>

        <form ref={formRef} onSubmit={(e) => {
            // Pas de `action={formAction}` : React 19 réinitialiserait le formulaire après CHAQUE
            // soumission, y compris en cas d'erreur serveur (saisie et pièces jointes perdues).
            e.preventDefault();
            const data = new FormData(e.currentTarget, (e.nativeEvent as SubmitEvent).submitter);
            startTransition(() => {
              formAction(data);
            });
          }} className="flex flex-col gap-5 px-6 pb-6">
          <input type="hidden" name="type" value="expense" />

          <section className="flex flex-col gap-4">
            <SectionHeader step={1} title="Informations générales" subtitle="Renseignez les informations principales de la dépense." tone="blue" />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="exp-date">Date de la dépense *</Label>
                <Input id="exp-date" name="transactionDate" type="date" defaultValue={new Date().toISOString().slice(0, 10)} required />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="exp-category">Catégorie *</Label>
                <FormSelect id="exp-category" name="categoryId" value={categoryId} onChange={(e) => setCategoryId(e.target.value)} required>
                  <option value="" disabled>
                    Sélectionner une catégorie
                  </option>
                  {topLevel.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </FormSelect>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="exp-subcategory">Sous-catégorie</Label>
                <FormSelect id="exp-subcategory" name="subcategoryId" defaultValue="" disabled={subcategories.length === 0} key={categoryId}>
                  <option value="">{subcategories.length === 0 ? "Aucune" : "—"}</option>
                  {subcategories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </FormSelect>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="exp-title">Libellé *</Label>
                <Input id="exp-title" name="title" maxLength={150} placeholder="Ex. : Réparation climatisation temple" required />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="exp-description">Description</Label>
                <textarea
                  id="exp-description"
                  name="description"
                  rows={2}
                  maxLength={TEXT_MAX}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className={TEXTAREA_CLASS}
                />
                <p className="text-right text-xs text-slate-400">
                  {description.length}/{TEXT_MAX}
                </p>
              </div>
            </div>
          </section>

          <section className="flex flex-col gap-4">
            <SectionHeader step={2} title="Montant et paiement" subtitle="Indiquez le montant et le mode de paiement." tone="green" />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="exp-amount">Montant *</Label>
                <div className="flex">
                  <Input id="exp-amount" name="amount" type="number" min={0.01} step="0.01" required className="rounded-r-none" />
                  <span className="flex items-center rounded-r-lg border border-l-0 border-slate-200 bg-blue-50 px-3 text-sm text-slate-600">{unit}</span>
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="exp-method">Mode de paiement *</Label>
                <FormSelect id="exp-method" name="paymentMethod" defaultValue="" required>
                  <option value="" disabled>
                    Sélectionner
                  </option>
                  {Object.entries(PAYMENT_METHOD_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </FormSelect>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="exp-account">Compte</Label>
                <FormSelect id="exp-account" name="accountId" defaultValue="">
                  <option value="">—</option>
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </FormSelect>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="exp-vendor" className="flex items-center gap-1.5">
                  <Store className="size-3.5 text-slate-400" />
                  Fournisseur
                </Label>
                <Input id="exp-vendor" name="vendorName" list="exp-vendors" maxLength={120} placeholder="Nom du fournisseur" autoComplete="off" />
                <datalist id="exp-vendors">
                  {vendors.map((v) => (
                    <option key={v} value={v} />
                  ))}
                </datalist>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="exp-reference" className="flex items-center gap-1.5">
                  <CreditCard className="size-3.5 text-slate-400" />N° de facture / Référence
                </Label>
                <Input id="exp-reference" name="reference" maxLength={80} placeholder="Ex. : FAC-2026-0785" />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="exp-invoice-date">Date de facture</Label>
                <Input id="exp-invoice-date" name="invoiceDate" type="date" />
              </div>
            </div>
          </section>

          <section className="flex flex-col gap-4">
            <SectionHeader step={3} title="Affectation et pièces jointes" subtitle="Précisez l'affectation et ajoutez les justificatifs." tone="purple" />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="exp-fund" className="flex items-center gap-1.5">
                  <FolderOpen className="size-3.5 text-slate-400" />
                  Affectation / Projet
                </Label>
                <FormSelect id="exp-fund" name="fundId" defaultValue="">
                  <option value="">—</option>
                  {funds.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name}
                    </option>
                  ))}
                </FormSelect>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="exp-campus">Centre de coût (optionnel)</Label>
                <FormSelect id="exp-campus" name="campusId" defaultValue="">
                  <option value="">—</option>
                  {campuses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </FormSelect>
              </div>
              <fieldset className="flex flex-col gap-1.5">
                <legend className="text-sm font-medium leading-none text-slate-700">Statut</legend>
                <div className="mt-1.5 flex flex-wrap gap-2">
                  {Object.entries(TRANSACTION_STATUS_LABELS).map(([value, label]) => (
                    <label
                      key={value}
                      className={cn("flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm text-slate-600 has-[:checked]:border-primary has-[:checked]:bg-blue-50 has-[:checked]:text-primary", !canApprove && value !== "pending" ? "cursor-not-allowed opacity-50" : "cursor-pointer")}
                    >
                      <input
                        type="radio"
                        name="status"
                        value={value}
                        defaultChecked={value === (canApprove ? "validated" : "pending")}
                        disabled={!canApprove && value !== "pending"}
                        className="accent-primary"
                      />
                      {label}
                    </label>
                  ))}
                </div>
              </fieldset>
            </div>

            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragging(false);
                addFiles(e.dataTransfer.files);
              }}
              className={cn("grid gap-4 sm:grid-cols-2", "items-stretch")}
            >
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className={cn(
                  "flex flex-col items-center justify-center gap-1.5 rounded-lg border-2 border-dashed px-4 py-5 text-center transition-colors",
                  dragging ? "border-primary bg-blue-50" : "border-slate-200 bg-slate-50 hover:border-primary/50",
                )}
              >
                <UploadCloud className="size-7 text-primary" />
                <span className="text-sm font-semibold text-navy">Glissez-déposez vos fichiers ici</span>
                <span className="text-xs text-primary">ou cliquez pour sélectionner</span>
                <span className="text-xs text-slate-400">PDF, JPG, PNG — 10 Mo max par fichier, {ATTACHMENT_MAX_FILES} fichiers max</span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                name="attachments"
                multiple
                accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/png,image/jpeg"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files) addFiles(e.target.files);
                }}
              />
              <ul className="flex flex-col gap-2">
                {files.map((f, i) => (
                  <li key={`${f.name}-${i}`} className="flex items-center gap-3 rounded-lg border border-slate-200 px-3 py-2">
                    <FileText className={cn("size-5 shrink-0", f.type === "application/pdf" ? "text-red-500" : "text-green-600")} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-navy">{f.name}</p>
                      <p className="text-xs text-slate-400">{formatSize(f.size)}</p>
                    </div>
                    <button
                      type="button"
                      aria-label={`Retirer ${f.name}`}
                      onClick={() => syncInput(files.filter((_, j) => j !== i))}
                      className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                    >
                      <X className="size-4" />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
            {fileError && <p className="text-xs text-danger">{fileError}</p>}

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="exp-notes">Notes internes (optionnel)</Label>
              <textarea
                id="exp-notes"
                name="notes"
                rows={2}
                maxLength={TEXT_MAX}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className={TEXTAREA_CLASS}
              />
              <p className="text-right text-xs text-slate-400">
                {notes.length}/{TEXT_MAX}
              </p>
            </div>
          </section>

          {state.error && (
            <p role="alert" className="text-sm text-danger">
              {state.error}
            </p>
          )}
          {savedNew && state.success && <p className="text-sm text-success">Dépense enregistrée. Vous pouvez en saisir une autre.</p>}

          <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Annuler
            </Button>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button type="submit" name="intent" value="new" variant="outline" disabled={pending}>
                <Plus className="size-4" />
                Enregistrer et nouveau
              </Button>
              <Button type="submit" name="intent" value="close" disabled={pending}>
                <Save className="size-4" />
                {pending ? "Enregistrement..." : "Enregistrer la dépense"}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
