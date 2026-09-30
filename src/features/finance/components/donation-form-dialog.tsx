"use client";

import { useActionState, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, Gift, Landmark, MapPin, MessageSquare, Save, Tag, Wallet, CreditCard } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { FormSelect } from "@/components/shared/form-select";
import { createTransaction, type FinanceActionState } from "@/features/finance/actions";
import { formatMoney } from "@/features/finance/format";
import { PAYMENT_METHOD_LABELS } from "@/features/finance/schemas";
import { cn } from "@/lib/utils";

const initialState: FinanceActionState = {};
const COMMENT_MAX = 500;

type DonorMode = "member" | "guest" | "anonymous";

const DONOR_MODES: { value: DonorMode; label: string }[] = [
  { value: "member", label: "Membre de l'église" },
  { value: "guest", label: "Visiteur / Autre personne" },
  { value: "anonymous", label: "Don anonyme" },
];

interface Option {
  id: string;
  name: string;
}

const TEXTAREA_CLASS =
  "flex w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-colors focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20";

function SectionHeader({ step, title, subtitle, tone }: { step: number; title: string; subtitle: string; tone: "blue" | "green" }) {
  const tones = {
    blue: { band: "bg-blue-50", dot: "bg-blue-600", title: "text-blue-900" },
    green: { band: "bg-green-50", dot: "bg-green-600", title: "text-green-900" },
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

function initialsOf(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

function formatDate(value: string) {
  if (!value) return "—";
  const [y, m, d] = value.split("-");
  return `${d}/${m}/${y}`;
}

function RecapRow({ icon: Icon, label, children }: { icon: React.ElementType; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="flex items-center gap-2 text-xs text-slate-500">
        <Icon className="size-3.5" />
        {label}
      </span>
      <span className="truncate text-right font-medium text-navy">{children}</span>
    </div>
  );
}

/** Formulaire « Nouveau don / offrande » avec récapitulatif en direct (maquette
 * `src/img/Formulaire nouveau don ChurchOS.webp`). Le commentaire est stocké dans `notes` et le
 * donateur « visiteur / autre personne » dans `donor_name` (db/migrations/2026-09-30-*.sql). */
export function DonationFormDialog({
  categories,
  funds,
  accounts,
  people,
  currency,
  triggerLabel = "Nouveau don",
}: {
  categories: Option[];
  funds: Option[];
  accounts: Option[];
  people: Option[];
  currency: string;
  triggerLabel?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<DonorMode>("member");
  const [personId, setPersonId] = useState("");
  const [guestName, setGuestName] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [method, setMethod] = useState("");
  const [fundId, setFundId] = useState("");
  const [reference, setReference] = useState("");
  const [comment, setComment] = useState("");
  const [addAnother, setAddAnother] = useState(false);
  const [savedAgain, setSavedAgain] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  function resetForm() {
    setPersonId("");
    setGuestName("");
    setCategoryId("");
    setAmount("");
    setMethod("");
    setFundId("");
    setReference("");
    setComment("");
  }

  const [state, formAction, pending] = useActionState(async (prev: FinanceActionState, formData: FormData) => {
    const result = await createTransaction(prev, formData);
    if (result.success) {
      if (formData.get("addAnother") === "on") {
        resetForm();
        setSavedAgain(true);
        router.refresh();
      } else {
        setOpen(false);
        window.location.reload();
      }
    } else {
      setSavedAgain(false);
    }
    return result;
  }, initialState);

  const unit = currency === "XOF" || currency === "XAF" ? "FCFA" : currency;
  const person = people.find((p) => p.id === personId);
  const donorName = mode === "member" ? person?.name : mode === "guest" ? guestName.trim() || undefined : "Don anonyme";
  const donorKind = mode === "member" ? "Membre" : mode === "guest" ? "Visiteur / Autre personne" : "Anonyme";
  const amountNumber = Number(amount);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button type="button" onClick={() => setOpen(true)}>
        <Gift className="size-4" />
        {triggerLabel}
      </Button>
      <DialogContent className="max-h-[94dvh] max-w-4xl overflow-y-auto p-0">
        <div className="flex items-center gap-4 px-6 pb-2 pt-6">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-600">
            <Gift className="size-6" />
          </span>
          <div>
            <DialogTitle className="text-xl font-semibold text-navy">Nouveau don / offrande</DialogTitle>
            <DialogDescription className="text-sm text-slate-500">Enregistrez un nouveau don ou offrande dans votre église.</DialogDescription>
          </div>
        </div>

        <form ref={formRef} action={formAction} className="flex flex-col gap-5 px-6 pb-6">
          <input type="hidden" name="type" value="income" />

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_280px]">
            <div className="flex min-w-0 flex-col gap-5">
              <section className="flex flex-col gap-4">
                <SectionHeader step={1} title="Informations du donateur" subtitle="Choisissez le donateur ou indiquez un autre donateur." tone="blue" />
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                  {DONOR_MODES.map((m) => (
                    <button
                      key={m.value}
                      type="button"
                      onClick={() => setMode(m.value)}
                      className={cn(
                        "rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                        mode === m.value ? "bg-primary text-white" : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
                      )}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>

                {mode === "member" && (
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="don-person">Donateur *</Label>
                    <FormSelect id="don-person" name="donorPersonId" value={personId} onChange={(e) => setPersonId(e.target.value)} required>
                      <option value="" disabled>
                        Sélectionner un membre
                      </option>
                      {people.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </FormSelect>
                  </div>
                )}
                {mode === "guest" && (
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="don-guest">Nom du donateur *</Label>
                    <Input id="don-guest" name="donorName" value={guestName} onChange={(e) => setGuestName(e.target.value)} maxLength={120} placeholder="Nom et prénom" required />
                  </div>
                )}
                {mode === "anonymous" && <p className="text-sm text-slate-500">Aucun donateur ne sera rattaché à ce don.</p>}
              </section>

              <section className="flex flex-col gap-4">
                <SectionHeader step={2} title="Détails du don" subtitle="Renseignez les informations du don/offrande." tone="green" />
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="don-category">Type de don *</Label>
                    <FormSelect id="don-category" name="categoryId" value={categoryId} onChange={(e) => setCategoryId(e.target.value)} required>
                      <option value="" disabled>
                        Sélectionner un type
                      </option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </FormSelect>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="don-amount">Montant *</Label>
                    <div className="flex">
                      <Input
                        id="don-amount"
                        name="amount"
                        type="number"
                        min={0.01}
                        step="0.01"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        required
                        className="rounded-r-none"
                      />
                      <span className="flex items-center rounded-r-lg border border-l-0 border-slate-200 bg-blue-50 px-3 text-sm text-slate-600">{unit}</span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="don-date">Date du don *</Label>
                    <Input id="don-date" name="transactionDate" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="don-method">Mode de paiement *</Label>
                    <FormSelect id="don-method" name="paymentMethod" value={method} onChange={(e) => setMethod(e.target.value)} required>
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
                    <Label htmlFor="don-fund">Affectation</Label>
                    <FormSelect id="don-fund" name="fundId" value={fundId} onChange={(e) => setFundId(e.target.value)}>
                      <option value="">—</option>
                      {funds.map((f) => (
                        <option key={f.id} value={f.id}>
                          {f.name}
                        </option>
                      ))}
                    </FormSelect>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="don-reference">
                      Référence <span className="font-normal text-slate-400">(optionnelle)</span>
                    </Label>
                    <Input id="don-reference" name="reference" value={reference} onChange={(e) => setReference(e.target.value)} maxLength={80} placeholder="Code, numéro, description..." />
                  </div>
                </div>
                {accounts.length > 0 && (
                  <div className="flex flex-col gap-1.5 sm:max-w-[50%]">
                    <Label htmlFor="don-account">Compte de dépôt</Label>
                    <FormSelect id="don-account" name="accountId" defaultValue="">
                      <option value="">—</option>
                      {accounts.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.name}
                        </option>
                      ))}
                    </FormSelect>
                  </div>
                )}
              </section>
            </div>

            <aside className="h-fit rounded-xl border border-slate-200 bg-slate-50/60 p-4 lg:sticky lg:top-0">
              <div className="mb-4 flex items-center gap-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-600">
                  <Gift className="size-5" />
                </span>
                <p className="text-base font-semibold text-navy">Récapitulatif</p>
              </div>
              <p className="mb-2 text-xs font-medium text-slate-500">Donateur</p>
              <div className="mb-4 flex items-center gap-3">
                <Avatar className="size-10">
                  <AvatarFallback>{donorName && mode !== "anonymous" ? initialsOf(donorName) : "?"}</AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-navy">{donorName ?? "—"}</p>
                  <p className="text-xs text-slate-400">{donorKind}</p>
                </div>
              </div>
              <div className="flex flex-col gap-3 border-t border-slate-200 pt-3">
                <RecapRow icon={Tag} label="Type de don">
                  {categories.find((c) => c.id === categoryId)?.name ?? "—"}
                </RecapRow>
                <RecapRow icon={Wallet} label="Montant">
                  {amountNumber > 0 ? formatMoney(amountNumber, currency) : "—"}
                </RecapRow>
                <RecapRow icon={CalendarDays} label="Date">
                  {formatDate(date)}
                </RecapRow>
                <RecapRow icon={CreditCard} label="Mode de paiement">
                  {method ? PAYMENT_METHOD_LABELS[method] : "—"}
                </RecapRow>
                <RecapRow icon={MapPin} label="Affectation">
                  {funds.find((f) => f.id === fundId)?.name ?? "—"}
                </RecapRow>
                <RecapRow icon={Landmark} label="Référence">
                  {reference.trim() || "—"}
                </RecapRow>
              </div>
            </aside>
          </div>

          <section className="flex flex-col gap-2">
            <div className="flex items-center gap-3 rounded-lg bg-blue-50 px-4 py-3">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white">
                <MessageSquare className="size-4" />
              </span>
              <p className="text-base font-semibold text-blue-900">Commentaire (optionnel)</p>
            </div>
            <textarea
              name="notes"
              rows={3}
              maxLength={COMMENT_MAX}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Ajouter un commentaire sur ce don..."
              className={TEXTAREA_CLASS}
              aria-label="Commentaire"
            />
            <p className="text-right text-xs text-slate-400">
              {comment.length}/{COMMENT_MAX}
            </p>
          </section>

          {state.error && (
            <p role="alert" className="text-sm text-danger">
              {state.error}
            </p>
          )}
          {savedAgain && state.success && <p className="text-sm text-success">Don enregistré. Vous pouvez en saisir un autre.</p>}

          <div className="flex flex-col gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
            <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-600">
              <input type="checkbox" name="addAnother" checked={addAnother} onChange={(e) => setAddAnother(e.target.checked)} className="size-4 accent-primary" />
              Enregistrer et ajouter un autre don
            </label>
            <div className="flex flex-col-reverse gap-3 sm:flex-row">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Annuler
              </Button>
              <Button type="submit" disabled={pending}>
                <Save className="size-4" />
                {pending ? "Enregistrement..." : "Enregistrer le don"}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
