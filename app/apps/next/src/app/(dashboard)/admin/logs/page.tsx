'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
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

function AuditLogsContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const q = searchParams.get('q') || undefined
  const action = searchParams.get('action') || undefined
  const start_date = searchParams.get('start_date') || undefined
  const end_date = searchParams.get('end_date') || undefined
  const showFilters = searchParams.get('showFilters') === 'true'

  const [actionFilter, setActionFilter] = useState(action || '')
  const [startDate, setStartDate] = useState(start_date || '')
  const [endDate, setEndDate] = useState(end_date || '')

  const { data: logs = [], isLoading } = useAuditLogs({
    search: q,
    action: actionFilter,
    startDate: startDate ? `${startDate}T00:00:00Z` : undefined,
    endDate: endDate ? `${endDate}T23:59:59Z` : undefined
  })

  useEffect(() => {
    const user = auth.getUser()
    if (!auth.isAuthenticated() || (user?.role !== 'ADMIN' && user?.role !== 'AUDITOR')) {
      router.push('/dashboard')
    }
  }, [router])

  const getActionColor = (action: string) => {
    if (action.includes('DELETE')) return 'text-destructive bg-destructive/10 border-destructive/20'
    if (action.includes('UPDATE') || action.includes('APPROVE')) return 'text-warning bg-warning/10 border-warning/20'
    if (action.includes('CREATE') || action.includes('UPLOAD')) return 'text-success bg-success/10 border-success/20'
    if (action.includes('DOWNLOAD')) return 'text-destructive bg-destructive/10 border-destructive/20'
    return 'text-info bg-info/10 border-info/20'
  }

  const actions = [
    'LOGIN', 'LOGOUT', 'UPLOAD', 'UPDATE', 'DELETE', 
    'APPROVE', 'DOWNLOAD', 'VIEW', 'LOCK'
  ]

  const updateFilters = (key: string, value: string | undefined) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value) params.set(key, value)
    else params.delete(key)
    router.push(`/admin/logs?${params.toString()}`)
  }

  return (
    <div className="flex flex-col gap-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Audit Logs</h1>
          <p className="text-muted-foreground mt-1">Rekaman aktivitas keamanan dan operasional sistem.</p>
        </div>
        <div className="p-3 rounded-xl bg-muted border border-border flex items-center gap-2">
          <Activity size={18} className="text-accent" />
          <span className="text-sm font-bold text-accent uppercase tracking-widest">{logs.length} Aktivitas Terdeteksi</span>
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
                router.push('/admin/logs?showFilters=true')
              }}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-destructive hover:bg-destructive/10 transition-all border border-destructive/20"
            >
              <X size={14} />
              Reset Filter Lanjutan
            </button>
          )}
        </div>

        {showFilters && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 rounded-xl border border-border bg-muted/30 animate-in slide-in-from-top-2 duration-300">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Jenis Aksi</label>
              <select 
                value={actionFilter}
                onChange={(e) => {
                  setActionFilter(e.target.value)
                  updateFilters('action', e.target.value)
                }}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-accent outline-none transition-all"
              >
                <option value="">Semua Aksi</option>
                {actions.map(a => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Dari Tanggal</label>
              <input 
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value)
                  updateFilters('start_date', e.target.value)
                }}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-accent outline-none transition-all"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Sampai Tanggal</label>
              <input 
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value)
                  updateFilters('end_date', e.target.value)
                }}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-accent outline-none transition-all"
              />
            </div>
          </div>
        )}
      </div>

      {/* Logs Timeline/Table */}
      <div className="rounded-xl border border-border bg-muted/50 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="border-b border-border bg-muted text-muted-foreground uppercase text-[10px] font-bold tracking-wider">
                <th className="px-6 py-4">Waktu</th>
                <th className="px-6 py-4">Aksi</th>
                <th className="px-6 py-4">Pengguna</th>
                <th className="px-6 py-4">Detail</th>
                <th className="px-6 py-4">IP Address</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-6 py-4"><div className="h-4 w-32 bg-muted rounded" /></td>
                    <td className="px-6 py-4"><div className="h-6 w-24 bg-muted rounded" /></td>
                    <td className="px-6 py-4"><div className="h-4 w-20 bg-muted rounded" /></td>
                    <td className="px-6 py-4"><div className="h-4 w-48 bg-muted rounded" /></td>
                    <td className="px-6 py-4"><div className="h-4 w-24 bg-muted rounded" /></td>
                  </tr>
                ))
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-20 text-center text-muted-foreground">
                    <div className="flex flex-col items-center gap-2">
                      <Shield size={40} className="opacity-10" />
                      <p>Tidak ada log audit ditemukan.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-col">
                        <div className="flex items-center gap-1.5 text-foreground font-medium">
                          <Calendar size={12} className="text-muted-foreground" />
                          {new Date(log.createdAt).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Clock size={12} />
                          {new Date(log.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
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
                      <div className="flex items-center gap-2 text-foreground">
                        <UserIcon size={14} className="text-muted-foreground" />
                        <span className="font-medium truncate max-w-[150px]">
                          {log.user ? `${log.user.firstName} ${log.user.lastName}` : (log.userId || 'System')}
                        </span>
                      </div>
                      {log.user && (
                        <div className="text-[10px] text-muted-foreground ml-5 truncate max-w-[150px]">
                          {log.user.email}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-2 max-w-xs sm:max-w-md">
                        <div className="flex items-start gap-2">
                          {log.documentId ? (
                            <FileText size={14} className="text-accent mt-0.5 shrink-0" />
                          ) : (
                            <Activity size={14} className="text-muted-foreground mt-0.5 shrink-0" />
                          )}
                          <span className="text-xs text-secondary-foreground leading-relaxed">{log.details}</span>
                        </div>
                        {log.documentId && (
                          <Link 
                            href={`/dashboard?docId=${log.documentId}`}
                            className="inline-flex items-center gap-1.5 text-[10px] font-bold text-accent hover:underline ml-5"
                          >
                            <ExternalLink size={10} />
                            Lihat Dokumen
                          </Link>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-muted-foreground font-mono text-xs bg-muted px-2 py-1 rounded border border-border w-fit">
                        <Monitor size={12} />
                        {log.ipAddress}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="px-6 py-4 bg-muted/20 border-t border-border text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center justify-between">
          <span>Menampilkan {logs.length} entri log</span>
        </div>
      </div>

      {/* Info Notice */}
      <div className="rounded-xl border border-info/20 bg-info/5 p-4 flex gap-4 items-center">
        <Shield size={20} className="text-info shrink-0" />
        <p className="text-xs text-info leading-relaxed">
          Log audit bersifat read-only dan tidak dapat diubah untuk menjaga integritas data sesuai standar kepatuhan PT Semen Tonasa.
        </p>
      </div>
    </div>
  )
}

export default function AuditLogsPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="h-8 w-8 border-4 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <AuditLogsContent />
    </Suspense>
  )
}
