'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useDocuments, Document } from '@/hooks/use-documents'
import { useAuditLogs } from '@/hooks/use-audit-logs'
import { auth, User } from '@/lib/auth'
import { StatusBadge } from '@/components/status-badge'
import { DocumentDetailModal } from '@/components/document-detail-modal'
import { Shield, Activity, FileText, AlertCircle, CheckCircle2, Clock, History, Search } from 'lucide-react'

export default function DashboardPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const docId = searchParams.get('docId')
  
  const [user, setUser] = useState<User | null>(null)
  const { data: documents, isLoading } = useDocuments()
  const { data: logs = [] } = useAuditLogs({
    enabled: user?.role === 'ADMIN' || user?.role === 'AUDITOR'
  } as any)
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null)

  useEffect(() => {
    if (!auth.isAuthenticated()) {
      router.push('/login')
      return
    }
    setUser(auth.getUser())
  }, [router])

  if (!user) return null

  const stats = {
    total: documents?.length || 0,
    draft: documents?.filter(d => d.status === 'Draft').length || 0,
    approved: documents?.filter(d => d.status === 'Approved').length || 0,
    locked: documents?.filter(d => d.status === 'Locked').length || 0,
    expiring: documents?.filter(d => {
      const created = new Date(d.createdAt)
      const now = new Date()
      const diffYears = (now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24 * 365)
      return d.retentionYears - diffYears < 1 && d.status === 'Locked'
    }).length || 0
  }

  const ROLE_LABELS: Record<string, string> = {
    ADMIN: 'IT Administrator',
    OFFICER: 'Export Sales Officer',
    MANAGER: 'Manager Export',
    AUDITOR: 'Auditor External/Internal',
  }

  return (
    <>
      {user.role === 'AUDITOR' ? (
        <div className="space-y-8 animate-in fade-in duration-700">
          {/* Header Auditor */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-8">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="p-1.5 rounded-lg bg-accent/10 text-accent">
                  <Shield size={18} />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-accent">Compliance Dashboard</span>
              </div>
              <h1 className="text-3xl font-bold tracking-tight">Audit & Compliance</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Selamat datang, <span className="font-medium text-foreground">{user.first_name} {user.last_name}</span>. Sistem dalam kondisi <span className="text-success font-bold">OPTIMAL</span>.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Link href="/admin/logs" className="px-4 py-2 rounded-xl bg-muted border border-border text-xs font-bold uppercase tracking-widest hover:bg-muted-foreground/10 transition-all flex items-center gap-2">
                <History size={14} /> Full Audit Logs
              </Link>
            </div>
          </div>

          {/* Auditor Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[
              { 
                label: 'Integritas Data', 
                value: stats.locked, 
                sub: 'Dokumen Terkunci & Watermarked',
                icon: <CheckCircle2 className="text-success" />,
                bg: 'bg-success/5'
              },
              { 
                label: 'Aktivitas Sistem', 
                value: logs.length, 
                sub: 'Total Log Audit Terrekam',
                icon: <Activity className="text-accent" />,
                bg: 'bg-accent/5'
              },
              { 
                label: 'Risiko Retensi', 
                value: stats.expiring, 
                sub: 'Dokumen Mendekati Masa Kadaluarsa',
                icon: <AlertCircle className="text-warning" />,
                bg: 'bg-warning/5'
              },
              { 
                label: 'Total Aset Digital', 
                value: stats.total, 
                sub: 'Seluruh Dokumen dalam Sistem',
                icon: <FileText className="text-info" />,
                bg: 'bg-info/5'
              },
            ].map((stat, i) => (
              <div key={i} className={`rounded-2xl border border-border p-6 transition-all hover:shadow-lg ${stat.bg}`}>
                <div className="flex items-center justify-between mb-4">
                  <div className="p-2.5 rounded-xl bg-muted border border-border shadow-sm">
                    {stat.icon}
                  </div>
                </div>
                <p className="text-4xl font-black tracking-tight">{stat.value}</p>
                <p className="text-sm font-bold text-foreground mt-1">{stat.label}</p>
                <p className="text-[10px] text-muted-foreground mt-1 font-medium">{stat.sub}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Recent Compliance Activities */}
            <div className="lg:col-span-2 space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold flex items-center gap-2">
                  <History size={20} className="text-accent" />
                  Aktivitas Kepatuhan Terbaru
                </h2>
              </div>
              
              <div className="rounded-2xl border border-border bg-muted/50 overflow-hidden">
                <div className="p-4 bg-muted border-b border-border">
                  <div className="relative">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <input type="text" placeholder="Cari aktivitas..." className="w-full bg-background border border-border rounded-lg pl-9 pr-4 py-1.5 text-xs outline-none focus:border-accent" />
                  </div>
                </div>
                <div className="divide-y divide-border">
                  {logs.slice(0, 8).map((log) => (
                    <div key={log.id} className="p-4 hover:bg-muted/50 transition-colors flex items-start gap-4">
                      <div className={`mt-1 p-2 rounded-lg ${log.action.includes('LOCK') || log.action.includes('APPROVE') ? 'bg-success/10 text-success' : 'bg-accent/10 text-accent'}`}>
                        <Activity size={14} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-bold uppercase tracking-wider">{log.action}</span>
                          <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                            <Clock size={10} /> {new Date(log.createdAt).toLocaleTimeString()}
                          </span>
                        </div>
                        <p className="text-sm text-secondary-foreground truncate">{log.details}</p>
                        <p className="text-[10px] text-muted-foreground mt-1">
                          Oleh: <span className="font-medium text-foreground">
                            {log.user ? `${log.user.first_name} ${log.user.last_name}` : (log.userId || 'System')}
                          </span> • IP: {log.ipAddress}
                        </p>
                        {log.documentId && (
                          <button 
                            onClick={() => {
                              const doc = documents?.find(d => d.id === log.documentId)
                              setSelectedDoc(doc || null)
                              const params = new URLSearchParams(searchParams.toString())
                              params.set('docId', log.documentId!)
                              router.push(`/dashboard?${params.toString()}`)
                            }}
                            className="text-[10px] font-bold text-accent mt-2 hover:underline flex items-center gap-1"
                          >
                            Buka Detail Dokumen →
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                <Link href="/admin/logs" className="block w-full py-3 text-center text-xs font-bold text-accent bg-muted/20 hover:bg-muted/50 transition-colors uppercase tracking-[0.2em]">
                  Lihat Seluruh Log Audit
                </Link>
              </div>
            </div>

            {/* Compliance Info */}
            <div className="space-y-6">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <Shield size={20} className="text-success" />
                Status Kepatuhan
              </h2>
              <div className="rounded-2xl border border-border bg-muted/50 p-6 space-y-6">
                <div>
                  <div className="flex justify-between items-end mb-2">
                    <span className="text-xs font-bold text-muted-foreground uppercase">Integritas Dokumen</span>
                    <span className="text-sm font-bold text-success">{Math.round((stats.locked / (stats.total || 1)) * 100)}%</span>
                  </div>
                  <div className="h-2 w-full bg-background rounded-full overflow-hidden border border-border">
                    <div 
                      className="h-full bg-gradient-to-r from-success to-success/80 transition-all duration-1000" 
                      style={{ width: `${(stats.locked / (stats.total || 1)) * 100}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-2 italic">Persentase dokumen yang telah melalui proses locking & watermarking.</p>
                </div>

                <div className="pt-6 border-t border-border">
                  <h3 className="text-xs font-bold uppercase mb-4 text-foreground">Ringkasan Audit</h3>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 text-xs">
                      <div className="h-2 w-2 rounded-full bg-success" />
                      <span className="text-muted-foreground flex-1">Watermark Terverifikasi</span>
                      <span className="font-bold">Aktif</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs">
                      <div className="h-2 w-2 rounded-full bg-success" />
                      <span className="text-muted-foreground flex-1">Enkripsi Penyimpanan</span>
                      <span className="font-bold">AES-256</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs">
                      <div className="h-2 w-2 rounded-full bg-warning" />
                      <span className="text-muted-foreground flex-1">Dokumen Akan Kadaluarsa</span>
                      <span className="font-bold text-warning">{stats.expiring}</span>
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-info/5 border border-info/20 text-[10px] leading-relaxed text-info">
                  <strong>Catatan Auditor:</strong> Seluruh akses ke sistem PortEx direkam secara real-time dan tidak dapat dimanipulasi sesuai dengan kebijakan keamanan informasi PT Semen Tonasa.
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="max-w-6xl mx-auto px-6 py-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Selamat datang, <span className="font-medium text-foreground">{user.first_name} {user.last_name}</span>
                <span className="mx-2 text-border">·</span>
                <span className="text-accent">{ROLE_LABELS[user.role] || user.role}</span>
              </p>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {[
              { label: 'Total Dokumen', value: stats.total, icon: '📄', color: 'var(--accent)' },
              { label: 'Draf', value: stats.draft, icon: '📝', color: 'var(--warning)' },
              { label: 'Disetujui', value: stats.approved, icon: '✅', color: 'var(--success)' },
              { label: 'Terkunci', value: stats.locked, icon: '🔒', color: 'var(--info)' },
            ].map((stat) => (
              <div key={stat.label} className="rounded-xl border border-border bg-muted/50 p-5 hover:border-muted-foreground/30 transition-colors">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-2xl">{stat.icon}</span>
                </div>
                <p className="text-3xl font-bold" style={{ color: stat.color }}>{stat.value}</p>
                <p className="text-xs text-muted-foreground mt-1">{stat.label}</p>
              </div>
            ))}
          </div>

          {/* Action Buttons */}
          {user?.role !== 'MANAGER' && user?.role !== 'AUDITOR' && (
            <div className="mb-6">
              <Link href="/documents/new" className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-white hover:bg-accent-hover transition-colors shadow-lg shadow-accent/20">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
                Upload Dokumen
              </Link>
            </div>
          )}

          {/* Recent Documents Table */}
          <div className="rounded-xl border border-border bg-muted/50 overflow-hidden">
            <div className="px-5 py-4 border-b border-border flex items-center justify-between">
              <h2 className="text-sm font-semibold">Dokumen Terbaru</h2>
              <Link href="/documents" className="text-xs font-bold text-accent hover:underline flex items-center gap-1">
                Lihat Semua
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" /></svg>
              </Link>
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-16">
                <svg className="animate-spin h-6 w-6 text-accent" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25"/><path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" className="opacity-75"/></svg>
              </div>
            ) : !documents || documents.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <svg className="w-12 h-12 mb-3 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" /></svg>
                <p className="text-sm">Belum ada dokumen</p>
                {user?.role !== 'MANAGER' && user?.role !== 'AUDITOR' && (
                  <Link href="/documents/new" className="mt-3 text-sm text-accent hover:underline">Upload dokumen pertama →</Link>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-muted-foreground text-xs uppercase tracking-wider">
                      <th className="px-5 py-3 font-medium">Judul</th>
                      <th className="px-5 py-3 font-medium">Status</th>
                      <th className="px-5 py-3 font-medium">Tanggal</th>
                      <th className="px-5 py-3 font-medium text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {documents.slice(0, 10).map((doc) => (
                      <tr key={doc.id} className="hover:bg-muted/50 transition-colors">
                        <td className="px-5 py-3.5 font-medium text-foreground">{doc.title}</td>
                        <td className="px-5 py-3.5"><StatusBadge status={doc.status} /></td>
                        <td className="px-5 py-3.5 text-muted-foreground">
                          <div className="flex flex-col">
                            <span className="text-xs">{new Date(doc.createdAt).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })}</span>
                            <span className="text-[10px] opacity-60">{new Date(doc.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <button 
                            onClick={() => setSelectedDoc(doc)}
                            className="text-accent hover:underline font-medium text-xs"
                          >
                            Detail
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      <DocumentDetailModal 
        document={selectedDoc} 
        documentId={docId || undefined}
        onClose={() => {
          setSelectedDoc(null)
          const params = new URLSearchParams(searchParams.toString())
          params.delete('docId')
          router.push(`/dashboard?${params.toString()}`)
        }} 
      />
    </>
  )
}
