import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { auth } from '@/lib/auth'
import { useAuditLogs } from '@/hooks/use-audit-logs'
import { 
  Shield, 
  Search, 
  Filter, 
  Calendar,
  Clock,
  User as UserIcon,
  FileText,
  Activity,
  Terminal,
  Monitor,
  ExternalLink,
  X
} from 'lucide-react'
import { Link } from '@tanstack/react-router'

export const Route = createFileRoute('/admin/logs')({
  component: AuditLogsPage,
  validateSearch: (search: Record<string, unknown>) => {
    return {
      q: (search.q as string) || undefined,
      action: (search.action as string) || undefined,
      start_date: (search.start_date as string) || undefined,
      end_date: (search.end_date as string) || undefined,
      showFilters: (search.showFilters as boolean) || false,
    }
  },
})

function AuditLogsPage() {
  const navigate = useNavigate()
  const { q, action, start_date, end_date, showFilters } = Route.useSearch()
  const [actionFilter, setActionFilter] = useState(action || '')
  const [startDate, setStartDate] = useState(start_date || '')
  const [endDate, setEndDate] = useState(end_date || '')

  const { data: logs = [], isLoading } = useAuditLogs({
    search: q,
    action: actionFilter,
    start_date: startDate ? `${startDate}T00:00:00Z` : undefined,
    end_date: endDate ? `${endDate}T23:59:59Z` : undefined
  })

  useEffect(() => {
    const user = auth.getUser()
    if (!auth.isAuthenticated() || (user?.role !== 'ADMIN' && user?.role !== 'AUDITOR')) {
      navigate({ to: '/dashboard' })
    }
  }, [navigate])

  const getActionColor = (action: string) => {
    if (action.includes('DELETE')) return 'text-[var(--danger)] bg-[var(--danger)]/10 border-[var(--danger)]/20'
    if (action.includes('UPDATE') || action.includes('APPROVE')) return 'text-[var(--warning)] bg-[var(--warning)]/10 border-[var(--warning)]/20'
    if (action.includes('CREATE') || action.includes('UPLOAD')) return 'text-[var(--success)] bg-[var(--success)]/10 border-[var(--success)]/20'
    if (action.includes('DOWNLOAD')) return 'text-[var(--danger)] bg-[var(--danger)]/10 border-[var(--danger)]/20'
    return 'text-[var(--info)] bg-[var(--info)]/10 border-[var(--info)]/20'
  }

  const actions = [
    'LOGIN', 'LOGOUT', 'UPLOAD', 'UPDATE', 'DELETE', 
    'APPROVE', 'DOWNLOAD', 'VIEW', 'LOCK'
  ]

  return (
    <div className="flex flex-col gap-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Audit Logs</h1>
          <p className="text-[var(--text-secondary)] mt-1">Rekaman aktivitas keamanan dan operasional sistem.</p>
        </div>
        <div className="p-3 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border)] flex items-center gap-2">
          <Activity size={18} className="text-[var(--accent)]" />
          <span className="text-sm font-bold text-[var(--accent)] uppercase tracking-widest">{logs.length} Aktivitas Terdeteksi</span>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-3">
          {(actionFilter || startDate || endDate) && (
            <button 
              onClick={() => {
                setActionFilter('')
                setStartDate('')
                setEndDate('')
              }}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-[var(--danger)] hover:bg-[var(--danger)]/10 transition-all border border-[var(--danger)]/20"
            >
              <X size={14} />
              Reset Filter Lanjutan
            </button>
          )}
        </div>

        {showFilters && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 rounded-xl border border-[var(--border)] bg-[var(--bg-tertiary)]/30 animate-in slide-in-from-top-2 duration-300">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Jenis Aksi</label>
              <select 
                value={actionFilter}
                onChange={(e) => setActionFilter(e.target.value)}
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] px-3 py-2 text-sm focus:border-[var(--accent)] outline-none transition-all"
              >
                <option value="">Semua Aksi</option>
                {actions.map(a => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Dari Tanggal</label>
              <input 
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] px-3 py-2 text-sm focus:border-[var(--accent)] outline-none transition-all"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Sampai Tanggal</label>
              <input 
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] px-3 py-2 text-sm focus:border-[var(--accent)] outline-none transition-all"
              />
            </div>
          </div>
        )}
      </div>

      {/* Logs Timeline/Table */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--bg-tertiary)]/30 text-[var(--text-muted)] uppercase text-[10px] font-bold tracking-wider">
                <th className="px-6 py-4">Waktu</th>
                <th className="px-6 py-4">Aksi</th>
                <th className="px-6 py-4">Pengguna</th>
                <th className="px-6 py-4">Detail</th>
                <th className="px-6 py-4">IP Address</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-6 py-4"><div className="h-4 w-32 bg-[var(--bg-hover)] rounded" /></td>
                    <td className="px-6 py-4"><div className="h-6 w-24 bg-[var(--bg-hover)] rounded" /></td>
                    <td className="px-6 py-4"><div className="h-4 w-20 bg-[var(--bg-hover)] rounded" /></td>
                    <td className="px-6 py-4"><div className="h-4 w-48 bg-[var(--bg-hover)] rounded" /></td>
                    <td className="px-6 py-4"><div className="h-4 w-24 bg-[var(--bg-hover)] rounded" /></td>
                  </tr>
                ))
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-20 text-center text-[var(--text-muted)]">
                    <div className="flex flex-col items-center gap-2">
                      <Shield size={40} className="opacity-10" />
                      <p>Tidak ada log audit ditemukan.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-[var(--bg-hover)]/30 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-col">
                        <div className="flex items-center gap-1.5 text-[var(--text-primary)] font-medium">
                          <Calendar size={12} className="text-[var(--text-muted)]" />
                          {new Date(log.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
                          <Clock size={12} />
                          {new Date(log.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase border ${getActionColor(log.action)}`}>
                        <Terminal size={10} />
                        {log.action}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-[var(--text-primary)]">
                        <UserIcon size={14} className="text-[var(--text-muted)]" />
                        <span className="font-medium truncate max-w-[150px]">
                          {log.user ? `${log.user.first_name} ${log.user.last_name}` : (log.user_id || 'System')}
                        </span>
                      </div>
                      {log.user && (
                        <div className="text-[10px] text-[var(--text-muted)] ml-5 truncate max-w-[150px]">
                          {log.user.email}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-2 max-w-xs sm:max-w-md">
                        <div className="flex items-start gap-2">
                          {log.document_id ? (
                            <FileText size={14} className="text-[var(--accent)] mt-0.5 shrink-0" />
                          ) : (
                            <Activity size={14} className="text-[var(--text-muted)] mt-0.5 shrink-0" />
                          )}
                          <span className="text-xs text-[var(--text-secondary)] leading-relaxed">{log.details}</span>
                        </div>
                        {log.document_id && (
                          <Link 
                            to="/dashboard" 
                            search={{ docId: log.document_id }}
                            className="inline-flex items-center gap-1.5 text-[10px] font-bold text-[var(--accent)] hover:underline ml-5"
                          >
                            <ExternalLink size={10} />
                            Lihat Dokumen
                          </Link>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-[var(--text-muted)] font-mono text-xs bg-[var(--bg-primary)] px-2 py-1 rounded border border-[var(--border)] w-fit">
                        <Monitor size={12} />
                        {log.ip_address}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="px-6 py-4 bg-[var(--bg-tertiary)]/20 border-t border-[var(--border)] text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)] flex items-center justify-between">
          <span>Menampilkan {logs.length} entri log</span>
        </div>
      </div>

      {/* Info Notice */}
      <div className="rounded-xl border border-[var(--info)]/20 bg-[var(--info)]/5 p-4 flex gap-4 items-center">
        <Shield size={20} className="text-[var(--info)] shrink-0" />
        <p className="text-xs text-[var(--info)] leading-relaxed">
          Log audit bersifat read-only dan tidak dapat diubah untuk menjaga integritas data sesuai standar kepatuhan PT Semen Tonasa.
        </p>
      </div>
    </div>
  )
}
