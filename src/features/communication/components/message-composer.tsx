"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Calendar, Clock, FileText, Send, Users, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FormSelect } from "@/components/shared/form-select";
import { Input } from "@/components/ui/input";
import { countRecipients, saveMessage } from "@/features/communication/actions/messages";
import { SMS_MAX_LENGTH } from "@/features/communication/schemas/sms-constants";
import { cn } from "@/lib/utils";

export interface ComposerOptions {
  groups: { id: string; name: string }[];
  ministries: { id: string; name: string }[];
  people: { id: string; name: string; hasEmail: boolean; hasPhone: boolean }[];
  templates: { id: string; name: string; channel: "sms" | "email"; subject: string | null; body: string }[];
  activeMembers: number;
}

export interface ComposerDraft {
  key: string;
  id?: string;
  channel: "sms" | "email";
  title: string;
  body: string;
  audience: string[];
  scheduledAt: string;
  templateId: string;
}

type Mode = "all" | "targets" | "people";

function modeOf(audience: string[]): Mode {
  if (audience.some((a) => a.startsWith("person:"))) return "people";
  if (audience.some((a) => a.startsWith("group:") || a.startsWith("ministry:"))) return "targets";
  return "all";
}

/** Monté avec `key={draft.key}` : « Modifier » / « Dupliquer » remonte le composeur avec les valeurs du brouillon. */
export function MessageComposer({
  options,
  draft,
  notice,
  onNotice,
  onReset,
}: {
  options: ComposerOptions;
  draft: ComposerDraft | null;
  notice: string | null;
  onNotice: (notice: string | null) => void;
  onReset: () => void;
}) {
  const router = useRouter();
  const [channel, setChannel] = useState<"sms" | "email">(draft?.channel ?? "sms");
  const [title, setTitle] = useState(draft?.title ?? "");
  const [body, setBody] = useState(draft?.body ?? "");
  const [audience, setAudience] = useState<string[]>(draft?.audience ?? ["all"]);
  const [when, setWhen] = useState<"now" | "later">(draft?.scheduledAt ? "later" : "now");
  const [date, setDate] = useState(draft?.scheduledAt.slice(0, 10) ?? "");
  const [time, setTime] = useState(draft?.scheduledAt.slice(11, 16) ?? "");
  const [templateId, setTemplateId] = useState(draft?.templateId ?? "");
  const [editingId, setEditingId] = useState<string | undefined>(draft?.id);
  const [picker, setPicker] = useState<Mode | null>(null);
  const [countState, setCountState] = useState<{ key: string; count: number; withoutContact: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const mode = modeOf(audience);
  const names = useMemo(() => {
    const map = new Map<string, string>();
    for (const g of options.groups) map.set(`group:${g.id}`, g.name);
    for (const m of options.ministries) map.set(`ministry:${m.id}`, m.name);
    for (const p of options.people) map.set(`person:${p.id}`, p.name);
    return map;
  }, [options]);

  // Nombre de destinataires joignables par ce canal (recalculé à chaque changement).
  const countKey = `${channel}|${audience.join(",")}`;
  const count = countState?.key === countKey ? countState : null;
  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(async () => {
      const [ch, ids] = countKey.split("|") as ["sms" | "email", string];
      const res = await countRecipients(ch, ids.split(","));
      if (!cancelled && !res.error) setCountState({ key: countKey, count: res.count, withoutContact: res.withoutContact });
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [countKey]);

  function reset() {
    setTitle("");
    setBody("");
    setAudience(["all"]);
    setWhen("now");
    setDate("");
    setTime("");
    setTemplateId("");
    setEditingId(undefined);
    if (draft) onReset();
  }

  function submit(kind: "draft" | "send") {
    setError(null);
    onNotice(null);
    const scheduling = kind === "send" && when === "later";
    startTransition(async () => {
      const res = await saveMessage({
        id: editingId,
        fields: {
          channel,
          title,
          body,
          audience,
          mode: kind === "draft" ? "draft" : scheduling ? "schedule" : "send",
          scheduledAt: scheduling && date && time ? `${date}T${time}` : "",
          templateId,
        },
      });
      if (res.error) {
        setError(res.error);
        // Un envoi qui échoue laisse le message en brouillon : on garde son identifiant pour ne pas le dupliquer.
        if (res.messageId) setEditingId(res.messageId);
        router.refresh();
        return;
      }
      onNotice(res.notice ?? "Enregistré.");
      reset();
      router.refresh();
    });
  }

  function applyTemplate(id: string) {
    setTemplateId(id);
    const t = options.templates.find((x) => x.id === id);
    if (t) {
      setBody(t.body);
      if (t.subject) setTitle(t.subject);
    }
  }

  const templates = options.templates.filter((t) => t.channel === channel);
  const limit = channel === "sms" ? SMS_MAX_LENGTH : 5000;
  const segments = channel === "sms" ? Math.max(1, Math.ceil(body.length / SMS_MAX_LENGTH)) : 1;

  return (
    <Card className="self-start xl:sticky xl:top-4">
      <CardContent className="flex flex-col gap-5 pt-5">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-navy">{editingId ? "Modifier le message" : "Nouveau message"}</h2>
          {(editingId || draft) && (
            <button type="button" onClick={reset} className="text-xs text-slate-500 underline">
              Annuler
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2 rounded-xl bg-slate-100 p-1">
          {(["sms", "email"] as const).map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setChannel(c)}
              className={cn("rounded-lg py-2 text-sm font-semibold transition-colors", channel === c ? "bg-navy text-white" : "text-navy hover:bg-white/60")}
            >
              {c === "sms" ? "SMS" : "Email"}
            </button>
          ))}
        </div>

        <Step n={1} title="Destinataires" subtitle="Sélectionnez les destinataires de votre message.">
          <div className="flex flex-col gap-2 text-sm text-navy">
            {(
              [
                ["all", "Tous les membres"],
                ["targets", "Groupes spécifiques"],
                ["people", "Liste personnalisée"],
              ] as const
            ).map(([value, label]) => (
              <label key={value} className="flex cursor-pointer items-center gap-2.5">
                <input
                  type="radio"
                  name="audience-mode"
                  checked={mode === value}
                  onChange={() => {
                    if (value === "all") setAudience(["all"]);
                    else {
                      setAudience([]);
                      setPicker(value);
                    }
                  }}
                  className="size-4 accent-primary"
                />
                {label}
              </label>
            ))}
            {mode !== "all" && (
              <Button type="button" variant="secondary" size="sm" className="self-start" onClick={() => setPicker(mode)}>
                <Users className="size-4" />
                Sélectionner des destinataires
              </Button>
            )}
          </div>
          <div className="mt-3 rounded-lg bg-slate-50 p-3 text-xs text-slate-600">
            <p className="font-medium">
              {count === null ? "Calcul…" : `${count.count} destinataire${count.count > 1 ? "s" : ""} joignable${count.count > 1 ? "s" : ""}`}
              {count && count.withoutContact > 0 && (
                <span className="font-normal text-amber-700">
                  {" "}
                  · {count.withoutContact} sans {channel === "sms" ? "numéro" : "email"} valide
                </span>
              )}
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {mode === "all" ? (
                <Chip label="Tous les membres" />
              ) : (
                audience.slice(0, 6).map((id) => <Chip key={id} label={names.get(id) ?? "?"} onRemove={() => setAudience((a) => a.filter((x) => x !== id))} />)
              )}
              {audience.length > 6 && <Chip label={`+${audience.length - 6}`} />}
            </div>
          </div>
        </Step>

        <Step
          n={2}
          title="Contenu du message"
          subtitle={`Rédigez votre message ${channel === "sms" ? "SMS" : "email"}.`}
          action={
            templates.length > 0 ? (
              <FormSelect value={templateId} onChange={(e) => applyTemplate(e.target.value)} className="h-9 w-44 text-xs" aria-label="Insérer un modèle">
                <option value="">Insérer un modèle</option>
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </FormSelect>
            ) : undefined
          }
        >
          <div className="flex flex-col gap-2">
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={channel === "email" ? "Sujet de l'email *" : "Titre (pour votre suivi, non envoyé)"} maxLength={200} />
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={channel === "sms" ? 6 : 9}
              maxLength={channel === "sms" ? SMS_MAX_LENGTH * 4 : 5000}
              placeholder="Bonjour {{prenom}}, ..."
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20"
            />
            <p className={cn("text-right text-xs", body.length > limit && channel === "sms" ? "text-amber-700" : "text-slate-400")}>
              {body.length}/{limit}
              {channel === "sms" && segments > 1 && ` · ${segments} SMS facturés`}
            </p>
            <p className="text-xs text-slate-400">Variables : {"{{prenom}}"}, {"{{nom}}"}</p>
          </div>
        </Step>

        <Step n={3} title="Planification" optional subtitle="Choisissez quand envoyer votre message.">
          <div className="flex flex-col gap-2 text-sm text-navy">
            <label className="flex cursor-pointer items-center gap-2.5">
              <input type="radio" name="when" checked={when === "now"} onChange={() => setWhen("now")} className="size-4 accent-primary" />
              Envoyer maintenant
            </label>
            <label className="flex cursor-pointer items-center gap-2.5">
              <input type="radio" name="when" checked={when === "later"} onChange={() => setWhen("later")} className="size-4 accent-primary" />
              Programmer l&apos;envoi
            </label>
            {when === "later" && (
              <div className="grid grid-cols-2 gap-2">
                <label className="relative flex items-center">
                  <Calendar className="pointer-events-none absolute left-3 size-4 text-slate-400" />
                  <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="pl-9" aria-label="Date d'envoi" />
                </label>
                <label className="relative flex items-center">
                  <Clock className="pointer-events-none absolute left-3 size-4 text-slate-400" />
                  <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="pl-9" aria-label="Heure d'envoi" />
                </label>
              </div>
            )}
          </div>
        </Step>

        {error && <p role="alert" className="text-sm text-danger">{error}</p>}
        {notice && <p role="status" className="text-sm text-success">{notice}</p>}

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_1.2fr]">
          <Button type="button" variant="secondary" disabled={pending || !body.trim()} onClick={() => submit("draft")}>
            <FileText className="size-4" />
            Enregistrer en brouillon
          </Button>
          <Button type="button" disabled={pending || !body.trim() || (mode !== "all" && audience.length === 0)} onClick={() => submit("send")} className="bg-navy hover:bg-navy/90">
            <Send className="size-4" />
            {pending ? "Envoi…" : when === "later" ? "Planifier le message" : "Envoyer le message"}
          </Button>
        </div>
      </CardContent>

      {picker && (
        <AudiencePicker
          key={picker}
          mode={picker}
          options={options}
          channel={channel}
          selected={audience}
          onClose={() => setPicker(null)}
          onConfirm={(ids) => {
            setAudience(ids.length ? ids : ["all"]);
            setPicker(null);
          }}
        />
      )}
    </Card>
  );
}

function Step({ n, title, subtitle, optional, action, children }: { n: number; title: string; subtitle: string; optional?: boolean; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-start gap-3">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-white">{n}</span>
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-navy">
            {title} {optional && <span className="font-normal text-slate-500">(optionnelle)</span>}
          </h3>
          <p className="text-xs text-slate-500">{subtitle}</p>
        </div>
        {action}
      </div>
      <div className="pl-11">{children}</div>
    </section>
  );
}

function Chip({ label, onRemove }: { label: string; onRemove?: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-md bg-white px-2 py-1 text-xs font-medium text-navy ring-1 ring-slate-200">
      {label}
      {onRemove && (
        <button type="button" onClick={onRemove} aria-label={`Retirer ${label}`}>
          <X className="size-3" />
        </button>
      )}
    </span>
  );
}

function AudiencePicker({
  mode,
  options,
  channel,
  selected,
  onClose,
  onConfirm,
}: {
  mode: Mode;
  options: ComposerOptions;
  channel: "sms" | "email";
  selected: string[];
  onClose: () => void;
  onConfirm: (ids: string[]) => void;
}) {
  const [picked, setPicked] = useState<string[]>(() => selected.filter((s) => s !== "all"));
  const [search, setSearch] = useState("");

  const items: { id: string; label: string; hint?: string; disabled?: boolean }[] =
    mode === "people"
      ? options.people
          .filter((p) => p.name.toLowerCase().includes(search.trim().toLowerCase()))
          .map((p) => {
            const reachable = channel === "sms" ? p.hasPhone : p.hasEmail;
            return { id: `person:${p.id}`, label: p.name, hint: reachable ? undefined : channel === "sms" ? "pas de téléphone" : "pas d'email" };
          })
      : [
          ...options.groups.map((g) => ({ id: `group:${g.id}`, label: g.name, hint: "Groupe" })),
          ...options.ministries.map((m) => ({ id: `ministry:${m.id}`, label: m.name, hint: "Ministère" })),
        ].filter((i) => i.label.toLowerCase().includes(search.trim().toLowerCase()));

  const toggle = (id: string) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{mode === "people" ? "Liste personnalisée" : "Groupes et ministères"}</DialogTitle>
          <DialogDescription>{picked.length} sélectionné(s)</DialogDescription>
        </DialogHeader>
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher…" />
        <div className="max-h-72 overflow-y-auto rounded-lg border border-slate-200 p-1">
          {items.length === 0 ? (
            <p className="p-3 text-sm text-slate-400">Aucun résultat.</p>
          ) : (
            items.map((i) => (
              <label key={i.id} className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-slate-50">
                <input type="checkbox" checked={picked.includes(i.id)} onChange={() => toggle(i.id)} className="size-4 rounded border-slate-300" />
                <span className="text-navy">{i.label}</span>
                {i.hint && <span className="text-xs text-slate-400">{i.hint}</span>}
              </label>
            ))
          )}
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Annuler
          </Button>
          <Button type="button" onClick={() => onConfirm(picked)}>
            Valider
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
