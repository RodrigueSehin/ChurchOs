"use client";

import { useActionState, useState } from "react";
import { Plus, Settings2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FormSelect } from "@/components/shared/form-select";
import { createFinanceCategory, createFinancialAccount, createFund, type FinanceActionState } from "@/features/finance/actions";
import { ACCOUNT_TYPE_LABELS, FINANCE_TYPE_LABELS } from "@/features/finance/schemas";
import type { getFinanceCategories, getFinancialAccounts, getFunds } from "@/features/finance/queries";

const initialState: FinanceActionState = {};

export function FinanceSetupManager({
  categories,
  funds,
  accounts,
}: {
  categories: Awaited<ReturnType<typeof getFinanceCategories>>;
  funds: Awaited<ReturnType<typeof getFunds>>;
  accounts: Awaited<ReturnType<typeof getFinancialAccounts>>;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button type="button" variant="secondary" size="sm" onClick={() => setOpen(true)}>
        <Settings2 className="size-4" />
        Paramètres financiers
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Paramètres financiers</DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-6">
            <CategorySection categories={categories} />
            <FundSection funds={funds} />
            <AccountSection accounts={accounts} />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function CategorySection({ categories }: { categories: Awaited<ReturnType<typeof getFinanceCategories>> }) {
  const [state, formAction, pending] = useActionState(createFinanceCategory, initialState);

  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm font-medium text-navy">Catégories</p>
      <ul className="flex flex-col gap-1">
        {categories.map((c) => (
          <li key={c.id} className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-navy">
            {c.name} <span className="text-slate-400">({FINANCE_TYPE_LABELS[c.type] ?? c.type})</span>
          </li>
        ))}
      </ul>
      <form action={formAction} className="flex items-end gap-2">
        <Input name="name" placeholder="Ex : Dîmes" required className="flex-1" />
        <FormSelect name="type" defaultValue="income" className="max-w-[140px]">
          {Object.entries(FINANCE_TYPE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </FormSelect>
        <FormSelect name="parentId" defaultValue="" className="max-w-[170px]" aria-label="Catégorie parente">
          <option value="">Catégorie principale</option>
          {categories
            .filter((c) => !c.parentId)
            .map((c) => (
              <option key={c.id} value={c.id}>
                Sous-catégorie de {c.name}
              </option>
            ))}
        </FormSelect>
        <Button type="submit" size="sm" disabled={pending}>
          <Plus className="size-4" />
        </Button>
      </form>
      {state.error && <p className="text-xs text-danger">{state.error}</p>}
    </div>
  );
}

function FundSection({ funds }: { funds: Awaited<ReturnType<typeof getFunds>> }) {
  const [state, formAction, pending] = useActionState(createFund, initialState);

  return (
    <div className="flex flex-col gap-2 border-t border-slate-100 pt-4">
      <p className="text-sm font-medium text-navy">Fonds</p>
      <ul className="flex flex-col gap-1">
        {funds.map((f) => (
          <li key={f.id} className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-navy">
            {f.name} {f.isRestricted && <span className="text-slate-400">(affecté)</span>}
          </li>
        ))}
      </ul>
      <form action={formAction} className="flex items-end gap-2">
        <Input name="name" placeholder="Ex : Fonds missions" required className="flex-1" />
        <label className="flex items-center gap-1.5 text-xs text-slate-500">
          <Checkbox name="isRestricted" />
          Affecté
        </label>
        <Button type="submit" size="sm" disabled={pending}>
          <Plus className="size-4" />
        </Button>
      </form>
      {state.error && <p className="text-xs text-danger">{state.error}</p>}
    </div>
  );
}

function AccountSection({ accounts }: { accounts: Awaited<ReturnType<typeof getFinancialAccounts>> }) {
  const [state, formAction, pending] = useActionState(createFinancialAccount, initialState);

  return (
    <div className="flex flex-col gap-2 border-t border-slate-100 pt-4">
      <p className="text-sm font-medium text-navy">Comptes</p>
      <ul className="flex flex-col gap-1">
        {accounts.map((a) => (
          <li key={a.id} className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-navy">
            {a.name} <span className="text-slate-400">({ACCOUNT_TYPE_LABELS[a.accountType] ?? a.accountType})</span>
          </li>
        ))}
      </ul>
      <form action={formAction} className="flex items-end gap-2">
        <Input name="name" placeholder="Ex : Caisse principale" required className="flex-1" />
        <FormSelect name="accountType" defaultValue="cash" className="max-w-[160px]">
          {Object.entries(ACCOUNT_TYPE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </FormSelect>
        <Button type="submit" size="sm" disabled={pending}>
          <Plus className="size-4" />
        </Button>
      </form>
      {state.error && <p className="text-xs text-danger">{state.error}</p>}
    </div>
  );
}
