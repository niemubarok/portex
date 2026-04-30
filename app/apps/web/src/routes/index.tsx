import { createFileRoute, Link } from '@tanstack/react-router'
import { auth } from '@/lib/auth'

export const Route = createFileRoute('/')(  {
  component: HomePage,
})

function HomePage() {
  const isLoggedIn = auth.isAuthenticated()

  return (
    <div className="relative">
      {/* Hero */}
      <section className="relative py-24 px-6">
        <div className="max-w-5xl mx-auto text-center">
          <span className="inline-flex items-center rounded-full bg-[var(--accent)]/10 border border-[var(--accent)]/20 px-4 py-1.5 text-sm font-medium text-[var(--accent)] mb-6">
            Portal E-Document Export Sales
          </span>
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6">
            <span className="text-[var(--text-primary)]">Kelola Dokumen</span>{' '}
            <span className="bg-gradient-to-r from-[var(--accent)] to-red-500 bg-clip-text text-transparent">
              Ekspor Digital
            </span>
          </h1>
          <p className="text-xl text-[var(--text-secondary)] max-w-2xl mx-auto mb-10 leading-relaxed">
            Sistem pengelolaan dokumen ekspor terpusat, terdigitalisasi, dan patuh hukum
            untuk PT Semen Tonasa — SIG Group.
          </p>
          <div className="flex items-center justify-center gap-4">
            {isLoggedIn ? (
              <Link
                to="/dashboard"
                className="inline-flex items-center px-6 py-3 rounded-lg bg-[var(--accent)] text-white font-medium hover:bg-[var(--accent-hover)] transition-colors shadow-lg shadow-[var(--accent)]/25"
              >
                Buka Dashboard →
              </Link>
            ) : (
              <>
                <Link
                  to="/login"
                  className="inline-flex items-center px-6 py-3 rounded-lg bg-[var(--accent)] text-white font-medium hover:bg-[var(--accent-hover)] transition-colors shadow-lg shadow-[var(--accent)]/25"
                >
                  Masuk ke Portal
                </Link>
                <a
                  href="/api/health"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center px-6 py-3 rounded-lg border border-[var(--border)] text-[var(--text-primary)] font-medium hover:bg-[var(--bg-secondary)] transition-colors"
                >
                  API Status
                </a>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-6 border-t border-[var(--border)]/30">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">Fitur Utama</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { title: 'Upload & Validasi', desc: 'Unggah PO, Invoice, Packing List, PEB, dan B/L dengan validasi sistem otomatis.', icon: '📤' },
              { title: 'Approval Digital', desc: 'Proses persetujuan tanpa tanda tangan manual. E-Signature tersertifikasi.', icon: '✅' },
              { title: 'Audit Trail', desc: 'Seluruh aktivitas tercatat otomatis. Timestamp server yang tidak dapat dimanipulasi.', icon: '🔍' },
              { title: 'Dokumen Terkunci', desc: 'Dokumen final dikunci dalam format PDF/A dengan watermark dinamis.', icon: '🔒' },
              { title: 'Role-Based Access', desc: 'Officer, Manager, Admin, dan Auditor memiliki hak akses yang berbeda.', icon: '🛡️' },
              { title: 'Kepatuhan Hukum', desc: 'Sesuai UU Kepabeanan, UU KUP, UU Dokumen Perusahaan, dan peraturan DHE.', icon: '⚖️' },
            ].map((f) => (
              <div key={f.title} className="rounded-xl border border-[var(--border)]/40 bg-[var(--bg-secondary)]/50 p-6 hover:border-[var(--accent)]/30 transition-colors">
                <span className="text-2xl mb-3 block">{f.icon}</span>
                <h3 className="text-lg font-semibold mb-2">{f.title}</h3>
                <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
