export function Footer() {
  return (
    <footer className="flex flex-col gap-1 border-t border-slate-200 px-6 py-4 text-xs text-slate-400 sm:flex-row sm:items-center sm:justify-between">
      <span>ChurchOS v0.1.0</span>
      <a href="mailto:support@churchos.app" className="hover:text-slate-600">
        Besoin d&apos;aide ? support@churchos.app
      </a>
    </footer>
  );
}
