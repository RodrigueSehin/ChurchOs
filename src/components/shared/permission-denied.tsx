import { ShieldAlert } from "lucide-react";

interface PermissionDeniedProps {
  requiredPermission?: string;
}

export function PermissionDenied({ requiredPermission }: PermissionDeniedProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-white px-6 py-16 text-center">
      <div className="mb-4 flex size-12 items-center justify-center rounded-full bg-slate-100 text-slate-500">
        <ShieldAlert className="size-6" />
      </div>
      <h3 className="text-base font-semibold text-navy">Accès refusé</h3>
      <p className="mt-1.5 max-w-sm text-sm text-slate-500">
        Vous n&apos;avez pas la permission nécessaire pour voir cette page.
        {requiredPermission && (
          <>
            {" "}
            (<code className="rounded bg-slate-100 px-1 py-0.5 text-xs">{requiredPermission}</code>)
          </>
        )}
      </p>
    </div>
  );
}
