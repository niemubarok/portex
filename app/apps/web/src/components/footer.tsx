
export function Footer() {
  return (
    <footer className="border-t border-[var(--border)]/50 bg-[var(--bg-primary)]">
      <div className="mx-auto max-w-6xl px-6 py-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
            <span className="font-semibold text-[var(--text-secondary)]">PortEx</span>
            <span className="text-[var(--border)]">·</span>
            <span>Portal E-Document Export Sales</span>
          </div>
          <div className="flex items-center gap-6 text-sm text-[var(--text-muted)]">
            <span>PT Semen Tonasa</span>
            <span className="text-[var(--border)]">·</span>
            <span>SIG Group</span>
          </div>
        </div>
        <div className="mt-6 pt-6 border-t border-[var(--border)]/30 text-center">
          <p className="text-xs text-[var(--text-muted)]">
            &copy; {new Date().getFullYear()} PT Semen Tonasa. Dokumen Internal — Corporate Use Only.
          </p>
        </div>
      </div>
    </footer>
  );
}
