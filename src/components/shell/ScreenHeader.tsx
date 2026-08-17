export function ScreenHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <header className="px-5 pb-4 pt-safe">
      <div className="pt-5">
        <h1 className="text-h1 text-ink-900">{title}</h1>
        {subtitle && <p className="mt-1 text-body-sm text-ink-500">{subtitle}</p>}
      </div>
    </header>
  );
}
