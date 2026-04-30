import { createFileRoute, useNavigate, Link } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { useDocuments, useDocument, Document } from '@/hooks/use-documents'
import { useAuditLogs } from '@/hooks/use-audit-logs'
import { auth, User } from '@/lib/auth'
import { StatusBadge } from '@/components/status-badge'
import { DocumentDetailModal } from '@/components/document-detail-modal'
import { Shield, Activity, FileText, AlertCircle, CheckCircle2, Clock, History, Search } from 'lucide-react'

export const Route = createFileRoute('/dashboard')({
  component: DashboardPage,
  validateSearch: (search: Record<string, unknown>) => {
    return {
      docId: (search.docId as string) || undefined,
    }
  },
})

function DashboardPage() {
  const navigate = useNavigate()
  const { docId } = Route.useSearch()
  const [user, setUser] = useState<User | null>(null)
  const { data: documents, isLoading } = useDocuments()
  const { data: logs = [] } = useAuditLogs()
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null)

  useEffect(() => {
    if (!auth.isAuthenticated()) {
      navigate({ to: '/login' })
      return
    }
    setUser(auth.getUser())
  }, [navigate])

  if (!user) return null

  const stats = {
    total: documents?.length || 0,
    draft: documents?.filter(d => d.status === 'Draft').length || 0,
    approved: documents?.filter(d => d.status === 'Approved').length || 0,
    locked: documents?.filter(d => d.status === 'Locked').length || 0,
    expiring: documents?.filter(d => {
      const created = new Date(d.created_at)
      const now = new Date()
      const diffYears = (now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24 * 365)
      return d.retention_years - diffYears < 1 && d.status === 'Locked'
    }).length || 0
  }

  const ROLE_LABELS: Record<string, string> = {
    ADMIN: 'IT Administrator',
    OFFICER: 'Export Sales Officer',
    MANAGER: 'Manager Export',
    AUDITOR: 'Auditor External/Internal',
  }

  // --- MAIN RENDER ---
  return (
    <>
      {user.role === 'AUDITOR' ? (
        <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-700">
          {/* Header Auditor */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[var(--border)] pb-8">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="p-1.5 rounded-lg bg-[var(--accent)]/10 text-[var(--accent)]">
                  <Shield size={18} />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--accent)]">Compliance Dashboard</span>
              </div>
              <h1 className="text-3xl font-bold tracking-tight">Audit & Compliance</h1>
              <p className="text-sm text-[var(--text-secondary)] mt-1">
                Selamat datang, <span className="font-medium text-[var(--text-primary)]">{user.first_name} {user.last_name}</span>. Sistem dalam kondisi <span className="text-[var(--success)] font-bold">OPTIMAL</span>.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Link to="/admin/logs" className="px-4 py-2 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border)] text-xs font-bold uppercase tracking-widest hover:bg-[var(--bg-hover)] transition-all flex items-center gap-2">
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
                icon: <CheckCircle2 className="text-[var(--success)]" />,
                bg: 'bg-[var(--success)]/5'
              },
              { 
                label: 'Aktivitas Sistem', 
                value: logs.length, 
                sub: 'Total Log Audit Terrekam',
                icon: <Activity className="text-[var(--accent)]" />,
                bg: 'bg-[var(--accent)]/5'
              },
              { 
                label: 'Risiko Retensi', 
                value: stats.expiring, 
                sub: 'Dokumen Mendekati Masa Kadaluarsa',
                icon: <AlertCircle className="text-[var(--warning)]" />,
                bg: 'bg-[var(--warning)]/5'
              },
              { 
                label: 'Total Aset Digital', 
                value: stats.total, 
                sub: 'Seluruh Dokumen dalam Sistem',
                icon: <FileText className="text-[var(--info)]" />,
                bg: 'bg-[var(--info)]/5'
              },
            ].map((stat, i) => (
              <div key={i} className={`rounded-2xl border border-[var(--border)] p-6 transition-all hover:shadow-lg ${stat.bg}`}>
                <div className="flex items-center justify-between mb-4">
                  <div className="p-2.5 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border)] shadow-sm">
                    {stat.icon}
                  </div>
                </div>
                <p className="text-4xl font-black tracking-tight">{stat.value}</p>
                <p className="text-sm font-bold text-[var(--text-primary)] mt-1">{stat.label}</p>
                <p className="text-[10px] text-[var(--text-muted)] mt-1 font-medium">{stat.sub}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Recent Compliance Activities */}
            <div className="lg:col-span-2 space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold flex items-center gap-2">
                  <History size={20} className="text-[var(--accent)]" />
                  Aktivitas Kepatuhan Terbaru
                </h2>
              </div>
              
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-secondary)] overflow-hidden">
                <div className="p-4 bg-[var(--bg-tertiary)]/30 border-b border-[var(--border)]">
                  <div className="relative">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                    <input type="text" placeholder="Cari aktivitas..." className="w-full bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg pl-9 pr-4 py-1.5 text-xs outline-none focus:border-[var(--accent)]" />
                  </div>
                </div>
                <div className="divide-y divide-[var(--border)]">
                  {logs.slice(0, 8).map((log) => (
                    <div key={log.id} className="p-4 hover:bg-[var(--bg-hover)]/30 transition-colors flex items-start gap-4">
                      <div className={`mt-1 p-2 rounded-lg ${log.action.includes('LOCK') || log.action.includes('APPROVE') ? 'bg-[var(--success)]/10 text-[var(--success)]' : 'bg-[var(--accent)]/10 text-[var(--accent)]'}`}>
                        <Activity size={14} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-bold uppercase tracking-wider">{log.action}</span>
                          <span className="text-[10px] text-[var(--text-muted)] flex items-center gap-1">
                            <Clock size={10} /> {new Date(log.created_at).toLocaleTimeString()}
                          </span>
                        </div>
                        <p className="text-sm text-[var(--text-secondary)] truncate">{log.details}</p>
                        <p className="text-[10px] text-[var(--text-muted)] mt-1">
                          Oleh: <span className="font-medium text-[var(--text-primary)]">
                            {log.user ? `${log.user.first_name} ${log.user.last_name}` : (log.user_id || 'System')}
                          </span> • IP: {log.ip_address}
                        </p>
                        {log.document_id && (
                          <button 
                            onClick={() => {
                              // If document is in local list, use it, else modal will fetch
                              const doc = documents?.find(d => d.id === log.document_id)
                              setSelectedDoc(doc || null)
                              navigate({ search: { docId: log.document_id } })
                            }}
                            className="text-[10px] font-bold text-[var(--accent)] mt-2 hover:underline flex items-center gap-1"
                          >
                            Buka Detail Dokumen →
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                <Link to="/admin/logs" className="block w-full py-3 text-center text-xs font-bold text-[var(--accent)] bg-[var(--bg-tertiary)]/20 hover:bg-[var(--bg-tertiary)]/50 transition-colors uppercase tracking-[0.2em]">
                  Lihat Seluruh Log Audit
                </Link>
              </div>
            </div>

            {/* Compliance Info */}
            <div className="space-y-6">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <Shield size={20} className="text-[var(--success)]" />
                Status Kepatuhan
              </h2>
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-secondary)] p-6 space-y-6">
                <div>
                  <div className="flex justify-between items-end mb-2">
                    <span className="text-xs font-bold text-[var(--text-secondary)] uppercase">Integritas Dokumen</span>
                    <span className="text-sm font-bold text-[var(--success)]">{Math.round((stats.locked / (stats.total || 1)) * 100)}%</span>
                  </div>
                  <div className="h-2 w-full bg-[var(--bg-primary)] rounded-full overflow-hidden border border-[var(--border)]">
                    <div 
                      className="h-full bg-gradient-to-r from-[var(--success)] to-[#10b981] transition-all duration-1000" 
                      style={{ width: `${(stats.locked / (stats.total || 1)) * 100}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-[var(--text-muted)] mt-2 italic">Persentase dokumen yang telah melalui proses locking & watermarking.</p>
                </div>

                <div className="pt-6 border-t border-[var(--border)]">
                  <h3 className="text-xs font-bold uppercase mb-4 text-[var(--text-primary)]">Ringkasan Audit</h3>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 text-xs">
                      <div className="h-2 w-2 rounded-full bg-[var(--success)]" />
                      <span className="text-[var(--text-secondary)] flex-1">Watermark Terverifikasi</span>
                      <span className="font-bold">Aktif</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs">
                      <div className="h-2 w-2 rounded-full bg-[var(--success)]" />
                      <span className="text-[var(--text-secondary)] flex-1">Enkripsi Penyimpanan</span>
                      <span className="font-bold">AES-256</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs">
                      <div className="h-2 w-2 rounded-full bg-[var(--warning)]" />
                      <span className="text-[var(--text-secondary)] flex-1">Dokumen Akan Kadaluarsa</span>
                      <span className="font-bold text-[var(--warning)]">{stats.expiring}</span>
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-[var(--info)]/5 border border-[var(--info)]/20 text-[10px] leading-relaxed text-[var(--info)]">
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
              <p className="text-sm text-[var(--text-secondary)] mt-1">
                Selamat datang, <span className="font-medium text-[var(--text-primary)]">{user.first_name} {user.last_name}</span>
                <span className="mx-2 text-[var(--border)]">·</span>
                <span className="text-[var(--accent)]">{ROLE_LABELS[user.role] || user.role}</span>
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
              <div key={stat.label} className="rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] p-5 hover:border-[var(--text-muted)]/30 transition-colors">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-2xl">{stat.icon}</span>
                </div>
                <p className="text-3xl font-bold" style={{ color: stat.color }}>{stat.value}</p>
                <p className="text-xs text-[var(--text-muted)] mt-1">{stat.label}</p>
              </div>
            ))}
          </div>

          {/* Action Buttons */}
          {user?.role !== 'MANAGER' && user?.role !== 'AUDITOR' && (
            <div className="mb-6">
              <Link to="/documents/new" className="inline-flex items-center gap-2 rounded-lg bg-[var(--accent)] px-4 py-2.5 text-sm font-medium text-white hover:bg-[var(--accent-hover)] transition-colors shadow-lg shadow-[var(--accent)]/20">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
                Upload Dokumen
              </Link>
            </div>
          )}

          {/* Recent Documents Table */}
          <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] overflow-hidden">
            <div className="px-5 py-4 border-b border-[var(--border)] flex items-center justify-between">
              <h2 className="text-sm font-semibold">Dokumen Terbaru</h2>
              <Link to="/documents" className="text-xs font-bold text-[var(--accent)] hover:underline flex items-center gap-1">
                Lihat Semua
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" /></svg>
              </Link>
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-16">
                <svg className="animate-spin h-6 w-6 text-[var(--accent)]" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25"/><path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" className="opacity-75"/></svg>
              </div>
            ) : !documents || documents.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-[var(--text-muted)]">
                <svg className="w-12 h-12 mb-3 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" /></svg>
                <p className="text-sm">Belum ada dokumen</p>
                {user?.role !== 'MANAGER' && user?.role !== 'AUDITOR' && (
                  <Link to="/documents/new" className="mt-3 text-sm text-[var(--accent)] hover:underline">Upload dokumen pertama →</Link>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-[var(--text-muted)] text-xs uppercase tracking-wider">
                      <th className="px-5 py-3 font-medium">Judul</th>
                      <th className="px-5 py-3 font-medium">Status</th>
                      <th className="px-5 py-3 font-medium">Tanggal</th>
                      <th className="px-5 py-3 font-medium text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border)]">
                    {documents.slice(0, 10).map((doc) => (
                      <tr key={doc.id} className="hover:bg-[var(--bg-hover)]/50 transition-colors">
                        <td className="px-5 py-3.5 font-medium text-[var(--text-primary)]">{doc.title}</td>
                        <td className="px-5 py-3.5"><StatusBadge status={doc.status} /></td>
                        <td className="px-5 py-3.5 text-[var(--text-muted)]">
                          <div className="flex flex-col">
                            <span className="text-xs">{new Date(doc.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })}</span>
                            <span className="text-[10px] opacity-60">{new Date(doc.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <button 
                            onClick={() => setSelectedDoc(doc)}
                            className="text-[var(--accent)] hover:underline font-medium text-xs"
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
        documentId={docId}
        onClose={() => {
          setSelectedDoc(null)
          navigate({ 
            to: '/dashboard',
            search: (prev: any) => {
              const { docId, ...rest } = prev
              return rest
            }
          })
        }} 
      />
    </>
  )
}
