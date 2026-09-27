import { Badge } from "@/components/ui/badge";
import { TEMPLATE_CHANNEL_LABELS } from "@/features/communication/schemas";
import { DeleteTemplateButton } from "@/features/communication/components/delete-template-button";
import type { getTemplates } from "@/features/communication/queries";

type Template = Awaited<ReturnType<typeof getTemplates>>[number];

export function TemplatesList({ templates, isAdmin }: { templates: Template[]; isAdmin: boolean }) {
  return (
    <div className="flex flex-col gap-2">
      {templates.map((template) => (
        <div key={template.id} className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 p-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="truncate text-sm font-medium text-navy">{template.name}</span>
              <Badge variant="secondary">{TEMPLATE_CHANNEL_LABELS[template.channel] ?? template.channel}</Badge>
            </div>
            {template.subject && <p className="mt-0.5 truncate text-xs text-slate-400">{template.subject}</p>}
          </div>
          {isAdmin && <DeleteTemplateButton templateId={template.id} templateName={template.name} />}
        </div>
      ))}
    </div>
  );
}
