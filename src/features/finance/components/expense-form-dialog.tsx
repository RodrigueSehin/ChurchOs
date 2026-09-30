"use client";

import { useActionState, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CreditCard, FolderOpen, Plus, Save, Wallet } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { FormSelect } from "@/components/shared/form-select";
import { createTransaction, type FinanceActionState } from "@/features/finance/actions";
import { PAYMENT_METHOD_LABELS } from "@/features/finance/schemas";

const initialState: FinanceActionState = {};
const DESCRIPTION_MAX = 500;

interface Option {
  id: string;
  name: string;
}

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

/** Formulaire « Nouvelle dépense » en 3 sections numérotées (maquette
 * `src/img/Formulaire nouvelle dépense ChurchOS.webp`). Seuls les champs réellement persistés par
 * `financial_transactions` sont proposés — pas de fournisseur, sous-catégorie, statut ni pièces
 * jointes tant que le schéma ne les porte pas. */
export function ExpenseFormDialog({
  categories,
  funds,
  accounts,
  currency,
  triggerLabel = "Nouvelle dépense",
}: {
  categories: Option[];
  funds: Option[];
  accounts: Option[];
  currency: string;
  triggerLabel?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [description, setDescription] = useState("");
  const [savedCount, setSavedCount] = useState(0);
  const formRef = useRef<HTMLFormElement>(null);

  const [state, formAction, pending] = useActionState(async (prev: FinanceActionState, formData: FormData) => {
    const result = await createTransaction(prev, formData);
    if (result.success) {
      if (formData.get("intent") === "new") {
        formRef.current?.reset();
        setDescription("");
        setSavedCount((c) => c + 1);
        router.refresh();
      } else {
        setOpen(false);
        window.location.reload();
      }
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

        <form ref={formRef} action={formAction} className="flex flex-col gap-5 px-6 pb-6">
          <input type="hidden" name="type" value="expense" />

          <section className="flex flex-col gap-4">
            <SectionHeader step={1} title="Informations générales" subtitle="Renseignez les informations principales de la dépense." tone="blue" />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="exp-date">Date de la dépense *</Label>
                <Input id="exp-date" name="transactionDate" type="date" defaultValue={new Date().toISOString().slice(0, 10)} required />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="exp-category">Catégorie *</Label>
                <FormSelect id="exp-category" name="categoryId" defaultValue="" required>
                  <option value="" disabled>
                    Sélectionner une catégorie
                  </option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </FormSelect>
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="exp-description">Libellé *</Label>
              <Input
                id="exp-description"
                name="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={DESCRIPTION_MAX}
                placeholder="Ex. : Réparation climatisation temple"
                required
              />
              <p className="text-right text-xs text-slate-400">
                {description.length}/{DESCRIPTION_MAX}
              </p>
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
            <div className="flex flex-col gap-1.5 sm:max-w-[50%]">
              <Label htmlFor="exp-reference" className="flex items-center gap-1.5">
                <CreditCard className="size-3.5 text-slate-400" />N° de facture / Référence
              </Label>
              <Input id="exp-reference" name="reference" placeholder="Ex. : FAC-2026-0785" />
            </div>
          </section>

          <section className="flex flex-col gap-4">
            <SectionHeader step={3} title="Affectation" subtitle="Précisez le fonds auquel la dépense est rattachée." tone="purple" />
            <div className="flex flex-col gap-1.5 sm:max-w-[50%]">
              <Label htmlFor="exp-fund" className="flex items-center gap-1.5">
                <FolderOpen className="size-3.5 text-slate-400" />
                Fonds / Projet
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
          </section>

          {state.error && (
            <p role="alert" className="text-sm text-danger">
              {state.error}
            </p>
          )}
          {savedCount > 0 && state.success && <p className="text-sm text-success">Dépense enregistrée. Vous pouvez en saisir une autre.</p>}

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
