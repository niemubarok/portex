'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { auth } from '@/lib/auth'

export default function HomePage() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)

  useEffect(() => {
    setIsLoggedIn(auth.isAuthenticated())
  }, [])

  return (
    <div className="relative">
      {/* Hero */}
      <section className="relative py-24 px-6">
        <div className="max-w-5xl mx-auto text-center">
          <span className="inline-flex items-center rounded-full bg-accent/10 border border-accent/20 px-4 py-1.5 text-sm font-medium text-accent mb-6">
            Portal E-Document Export Sales
          </span>
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6">
            <span className="text-foreground">Kelola Dokumen</span>{' '}
            <span className="bg-gradient-to-r from-accent to-red-500 bg-clip-text text-transparent">
              Ekspor Digital
            </span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
            Sistem pengelolaan dokumen ekspor terpusat, terdigitalisasi, dan patuh hukum
            untuk PT Semen Tonasa — SIG Group.
          </p>
          <div className="flex items-center justify-center gap-4">
            {isLoggedIn ? (
              <Link
                href="/dashboard"
                className="inline-flex items-center px-6 py-3 rounded-lg bg-accent text-white font-medium hover:bg-accent-hover transition-colors shadow-lg shadow-accent/25"
              >
                Buka Dashboard →
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  className="inline-flex items-center px-6 py-3 rounded-lg bg-accent text-white font-medium hover:bg-accent-hover transition-colors shadow-lg shadow-accent/25"
                >
                  Masuk ke Portal
                </Link>
                <a
                  href="/api/health"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center px-6 py-3 rounded-lg border border-border text-foreground font-medium hover:bg-muted transition-colors"
                >
                  API Status
                </a>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-6 border-t border-border/30">
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
              <div key={f.title} className="rounded-xl border border-border/40 bg-muted/50 p-6 hover:border-accent/30 transition-colors">
                <span className="text-2xl mb-3 block">{f.icon}</span>
                <h3 className="text-lg font-semibold mb-2">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
