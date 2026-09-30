"use client";

import { useActionState, useState, useTransition } from "react";
import { CalendarDays, CircleDot, FileText, FolderOpen, Gift, MapPin, MessageSquare, PiggyBank, Plus, Save, Tag, User, Wallet } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { FormSelect } from "@/components/shared/form-select";
import { createBudget, type FinanceActionState } from "@/features/finance/actions";
import { formatMoney } from "@/features/finance/format";
import { cn } from "@/lib/utils";

const initialState: FinanceActionState = {};
const NAME_MAX = 100;
const TEXT_MAX = 500;

interface Option {
  id: string;
  name: string;
}

const PERIODS: { value: string; label: string; start: [number, number]; end: [number, number] }[] = [
  { value: "year", label: "Année", start: [1, 1], end: [12, 31] },
  { value: "s1", label: "Semestre 1", start: [1, 1], end: [6, 30] },
  { value: "s2", label: "Semestre 2", start: [7, 1], end: [12, 31] },
  { value: "q1", label: "Trimestre 1", start: [1, 1], end: [3, 31] },
  { value: "q2", label: "Trimestre 2", start: [4, 1], end: [6, 30] },
  { value: "q3", label: "Trimestre 3", start: [7, 1], end: [9, 30] },
  { value: "q4", label: "Trimestre 4", start: [10, 1], end: [12, 31] },
];

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function periodDates(period: string, year: number) {
  const p = PERIODS.find((x) => x.value === period) ?? PERIODS[0]!;
  return { start: `${year}-${pad(p.start[0])}-${pad(p.start[1])}`, end: `${year}-${pad(p.end[0])}-${pad(p.end[1])}` };
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

function RecapRow({ icon: Icon, label, children }: { icon: React.ElementType; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md bg-white text-slate-400 ring-1 ring-slate-200">
        <Icon className="size-3.5" />
      </span>
      <div className="min-w-0">
        <p className="text-xs text-slate-500">{label}</p>
        <p className="break-words text-sm font-semibold text-navy">{children}</p>
      </div>
    </div>
  );
}

/** Formulaire « Nouveau budget » avec récapitulatif en direct (maquette
 * `src/img/Formulaire nouveau budget ChurchOS.webp`). Crée le budget ET sa première ligne
 * (catégorie + fonds + montant) ; d'autres lignes s'ajoutent ensuite via « Lignes budgétaires ». */
export function BudgetFormDialog({
  categories,
  funds,
  ministries,
  campuses,
  people,
  currency,
  canApprove,
}: {
  categories: Option[];
  funds: Option[];
  ministries: Option[];
  campuses: Option[];
  people: Option[];
  currency: string;
  canApprove: boolean;
}) {
  const currentYear = new Date().getFullYear();
  const years = [currentYear - 1, currentYear, currentYear + 1, currentYear + 2];

  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [fundId, setFundId] = useState("");
  const [ministryId, setMinistryId] = useState("");
  const [description, setDescription] = useState("");
  const [period, setPeriod] = useState("year");
  const [year, setYear] = useState(currentYear);
  const [startsOn, setStartsOn] = useState(`${currentYear}-01-01`);
  const [endsOn, setEndsOn] = useState(`${currentYear}-12-31`);
  const [amount, setAmount] = useState("");
  const [campusId, setCampusId] = useState("");
  const [managerId, setManagerId] = useState("");
  const [status, setStatus] = useState<"active" | "draft">(canApprove ? "active" : "draft");
  const [notes, setNotes] = useState("");

  function applyPeriod(nextPeriod: string, nextYear: number) {
    setPeriod(nextPeriod);
    setYear(nextYear);
    const d = periodDates(nextPeriod, nextYear);
    setStartsOn(d.start);
    setEndsOn(d.end);
  }

  const [, startTransition] = useTransition();
  const [state, formAction, pending] = useActionState(async (prev: FinanceActionState, formData: FormData) => {
    const result = await createBudget(prev, formData);
    if (result.success) {
      setOpen(false);
      window.location.reload();
    }
    return result;
  }, initialState);

  const unit = currency === "XOF" || currency === "XAF" ? "FCFA" : currency;
  const amountNumber = Number(amount);
  const periodLabel = PERIODS.find((p) => p.value === period)?.label ?? "Année";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button type="button" onClick={() => setOpen(true)}>
        <Plus className="size-4" />
        Nouveau budget
      </Button>
      <DialogContent className="max-h-[94dvh] max-w-5xl overflow-y-auto p-0">
        <div className="flex items-center gap-4 px-6 pb-2 pt-6">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-600">
            <Gift className="size-6" />
          </span>
          <div>
            <DialogTitle className="text-xl font-semibold text-navy">Nouveau budget</DialogTitle>
            <DialogDescription className="text-sm text-slate-500">Créez un nouveau budget pour un ministère, un projet ou une activité.</DialogDescription>
          </div>
        </div>

        <form onSubmit={(e) => {
            // Pas de `action={formAction}` : React 19 réinitialiserait le formulaire après CHAQUE
            // soumission, y compris en cas d'erreur serveur (saisie et pièces jointes perdues).
            e.preventDefault();
            const data = new FormData(e.currentTarget, (e.nativeEvent as SubmitEvent).submitter);
            startTransition(() => {
              formAction(data);
            });
          }} className="flex flex-col gap-5 px-6 pb-6">
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_290px]">
            <div className="flex min-w-0 flex-col gap-5">
              <section className="flex flex-col gap-4">
                <SectionHeader step={1} title="Informations générales" subtitle="Renseignez les informations principales du budget." tone="blue" />
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="bud-name">Nom du budget *</Label>
                    <Input id="bud-name" name="name" value={name} onChange={(e) => setName(e.target.value)} maxLength={NAME_MAX} placeholder="Ex. : Ministère des Jeunes" required />
                    <p className="text-right text-xs text-slate-400">
                      {name.length}/{NAME_MAX}
                    </p>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="bud-category">Catégorie *</Label>
                    <FormSelect id="bud-category" name="categoryId" value={categoryId} onChange={(e) => setCategoryId(e.target.value)} required>
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
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="bud-ministry">Ministère / Projet *</Label>
                    <FormSelect id="bud-ministry" name="ministryId" value={ministryId} onChange={(e) => setMinistryId(e.target.value)} required={ministries.length > 0}>
                      <option value="" disabled={ministries.length > 0}>
                        {ministries.length > 0 ? "Sélectionner un ministère" : "Aucun ministère"}
                      </option>
                      {ministries.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name}
                        </option>
                      ))}
                    </FormSelect>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="bud-description">
                      Description <span className="font-normal text-slate-400">(optionnelle)</span>
                    </Label>
                    <textarea
                      id="bud-description"
                      name="description"
                      rows={3}
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
                <SectionHeader step={2} title="Période et montant" subtitle="Définissez la période et le montant du budget." tone="green" />
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="bud-period">Période *</Label>
                    <div className="grid grid-cols-2 gap-2">
                      <FormSelect id="bud-period" value={period} onChange={(e) => applyPeriod(e.target.value, year)}>
                        {PERIODS.map((p) => (
                          <option key={p.value} value={p.value}>
                            {p.label}
                          </option>
                        ))}
                      </FormSelect>
                      <FormSelect aria-label="Exercice" name="fiscalYear" value={String(year)} onChange={(e) => applyPeriod(period, Number(e.target.value))}>
                        {years.map((y) => (
                          <option key={y} value={y}>
                            {y}
                          </option>
                        ))}
                      </FormSelect>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="bud-amount">Montant total *</Label>
                    <div className="flex">
                      <Input id="bud-amount" name="plannedAmount" type="number" min={1} step="1" value={amount} onChange={(e) => setAmount(e.target.value)} required className="rounded-r-none" />
                      <span className="flex items-center rounded-r-lg border border-l-0 border-slate-200 bg-blue-50 px-3 text-sm text-slate-600">{unit}</span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="bud-start">Date de début</Label>
                    <Input id="bud-start" name="startsOn" type="date" value={startsOn} onChange={(e) => setStartsOn(e.target.value)} required />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="bud-end">Date de fin</Label>
                    <Input id="bud-end" name="endsOn" type="date" value={endsOn} min={startsOn} onChange={(e) => setEndsOn(e.target.value)} required />
                  </div>
                </div>
              </section>

              <section className="flex flex-col gap-4">
                <SectionHeader step={3} title="Répartition et paramètres" subtitle="Configurez les options de suivi et d'approbation." tone="purple" />
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="bud-campus">Centre de coût (optionnel)</Label>
                    <FormSelect id="bud-campus" name="campusId" value={campusId} onChange={(e) => setCampusId(e.target.value)}>
                      <option value="">—</option>
                      {campuses.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </FormSelect>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="bud-manager">Responsable du budget</Label>
                    <FormSelect id="bud-manager" name="managerPersonId" value={managerId} onChange={(e) => setManagerId(e.target.value)}>
                      <option value="">—</option>
                      {people.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </FormSelect>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="bud-fund">Fonds (optionnel)</Label>
                    <FormSelect id="bud-fund" name="fundId" value={fundId} onChange={(e) => setFundId(e.target.value)}>
                      <option value="">—</option>
                      {funds.map((f) => (
                        <option key={f.id} value={f.id}>
                          {f.name}
                        </option>
                      ))}
                    </FormSelect>
                  </div>
                  <fieldset className="flex flex-col gap-1.5">
                    <legend className="text-sm font-medium leading-none text-slate-700">Statut</legend>
                    <div className="mt-1.5 flex flex-wrap gap-2">
                      {(
                        [
                          { value: "active", label: "Actif", disabled: !canApprove },
                          { value: "draft", label: "Brouillon", disabled: false },
                        ] as const
                      ).map((o) => (
                        <label
                          key={o.value}
                          className={cn(
                            "flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-600 has-[:checked]:border-primary has-[:checked]:bg-blue-50 has-[:checked]:text-primary",
                            o.disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer",
                          )}
                        >
                          <input
                            type="radio"
                            name="status"
                            value={o.value}
                            checked={status === o.value}
                            disabled={o.disabled}
                            onChange={() => setStatus(o.value)}
                            className="accent-primary"
                          />
                          {o.label}
                        </label>
                      ))}
                    </div>
                    {!canApprove && <p className="text-xs text-slate-400">Un approbateur activera ce budget.</p>}
                  </fieldset>
                </div>
              </section>
            </div>

            <aside className="h-fit rounded-xl border border-slate-200 bg-slate-50/60 p-4 lg:sticky lg:top-0">
              <div className="mb-4 flex items-center gap-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-600">
                  <PiggyBank className="size-5" />
                </span>
                <p className="text-base font-semibold text-navy">Récapitulatif</p>
              </div>
              <div className="flex flex-col gap-3.5">
                <RecapRow icon={FileText} label="Nom du budget">
                  {name.trim() || "—"}
                </RecapRow>
                <RecapRow icon={Tag} label="Catégorie">
                  {categories.find((c) => c.id === categoryId)?.name ?? "—"}
                </RecapRow>
                <RecapRow icon={FolderOpen} label="Ministère / Projet">
                  {ministries.find((m) => m.id === ministryId)?.name ?? "—"}
                </RecapRow>
                <RecapRow icon={CalendarDays} label="Période">
                  {periodLabel} {year}
                </RecapRow>
                <RecapRow icon={Wallet} label="Montant total">
                  {amountNumber > 0 ? formatMoney(amountNumber, currency) : "—"}
                </RecapRow>
                <RecapRow icon={User} label="Responsable">
                  {people.find((p) => p.id === managerId)?.name ?? "—"}
                </RecapRow>
                <RecapRow icon={MapPin} label="Centre de coût">
                  {campuses.find((c) => c.id === campusId)?.name ?? "—"}
                </RecapRow>
                <RecapRow icon={CircleDot} label="Statut">
                  <span className={cn("inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium", status === "active" ? "bg-green-100 text-green-700" : "bg-slate-200 text-slate-600")}>
                    {status === "active" ? "Actif" : "Brouillon"}
                  </span>
                </RecapRow>
                {description.trim() && <RecapRow icon={MessageSquare} label="Description">{description.trim()}</RecapRow>}
              </div>
            </aside>
          </div>

          <section className="flex flex-col gap-2">
            <div className="flex items-center gap-3 rounded-lg bg-slate-100 px-4 py-3">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-slate-600 text-white">
                <MessageSquare className="size-4" />
              </span>
              <p className="text-base font-semibold text-navy">Commentaire (optionnel)</p>
            </div>
            <textarea
              name="notes"
              rows={3}
              maxLength={TEXT_MAX}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ajouter un commentaire, une note ou une instruction..."
              className={TEXTAREA_CLASS}
              aria-label="Commentaire"
            />
            <p className="text-right text-xs text-slate-400">
              {notes.length}/{TEXT_MAX}
            </p>
          </section>

          {state.error && (
            <p role="alert" className="text-sm text-danger">
              {state.error}
            </p>
          )}

          <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={pending}>
              <Save className="size-4" />
              {pending ? "Enregistrement..." : "Enregistrer le budget"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
