import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { auth } from '@/lib/auth'
import { api } from '@/lib/api'
import { Save, RefreshCw, ShieldAlert, History } from 'lucide-react'

export const Route = createFileRoute('/settings/')({
  component: SettingsPage,
})

function SettingsPage() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [settings, setSettings] = useState<Record<string, string>>({})
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    const user = auth.getUser()
    if (!auth.isAuthenticated() || user?.role !== 'ADMIN') {
      navigate({ to: '/dashboard' })
      return
    }
    fetchSettings()
  }, [navigate])

  const fetchSettings = async () => {
    try {
      setLoading(true)
      const res = await api.get('/api/settings')
      // Convert list to map
      const map: Record<string, string> = {}
      if (res.data.data) {
        res.data.data.forEach((s: any) => {
          map[s.key] = s.value
        })
      }
      setSettings(map)
    } catch (err) {
      console.error('Failed to fetch settings:', err)
      setError('Gagal memuat pengaturan')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setSaving(true)
      setError(null)
      setSuccess(false)

      await api.put('/api/settings', {
        key: 'retention_years',
        value: settings.retention_years || '10'
      })

      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err) {
      console.error('Failed to save settings:', err)
      setError('Gagal menyimpan pengaturan')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="animate-spin text-[var(--accent)]" size={32} />
      </div>
    )
  }

  return (
    <>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Pengaturan Sistem</h1>
          <p className="text-[var(--text-secondary)] mt-1">Kelola konfigurasi global aplikasi PortEx.</p>
        </div>
      </div>

      <div className="grid gap-6">
        {/* Retention Policy Card */}
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] overflow-hidden shadow-sm">
          <div className="px-6 py-4 border-b border-[var(--border)]/50 bg-[var(--bg-tertiary)]/30 flex items-center gap-3">
            <History className="text-[var(--accent)]" size={20} />
            <h2 className="font-semibold">Kebijakan Retensi Dokumen</h2>
          </div>
          
          <form onSubmit={handleSave} className="p-6 space-y-6">
            <div className="max-w-md">
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                Masa Simpan Standar (Tahun)
              </label>
              <div className="flex gap-3">
                <input
                  type="number"
                  min="1"
                  max="30"
                  value={settings.retention_years || '10'}
                  onChange={(e) => setSettings({ ...settings, retention_years: e.target.value })}
                  className="block w-full rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] px-4 py-2 text-[var(--text-primary)] focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] outline-none transition-all"
                  placeholder="Contoh: 10"
                />
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-lg bg-[var(--accent)] px-6 py-2 text-sm font-medium text-white hover:bg-[var(--accent-hover)] transition-colors shadow-lg shadow-[var(--accent)]/20 disabled:opacity-50"
                >
                  {saving ? <RefreshCw className="animate-spin" size={16} /> : <Save size={16} />}
                  Simpan
                </button>
              </div>
              <p className="mt-3 text-xs text-[var(--text-muted)] leading-relaxed">
                Nilai ini akan digunakan sebagai masa retensi default untuk seluruh dokumen baru yang diunggah ke portal.
              </p>
            </div>

            {error && (
              <div className="flex items-center gap-3 rounded-lg bg-[var(--danger)]/10 border border-[var(--danger)]/20 p-4 text-[var(--danger)] text-sm animate-in fade-in slide-in-from-top-1">
                <ShieldAlert size={18} />
                {error}
              </div>
            )}

            {success && (
              <div className="flex items-center gap-3 rounded-lg bg-[var(--success)]/10 border border-[var(--success)]/20 p-4 text-[var(--success)] text-sm animate-in fade-in slide-in-from-top-1">
                <div className="h-2 w-2 rounded-full bg-[var(--success)]" />
                Pengaturan berhasil diperbarui
              </div>
            )}
          </form>
        </div>

        {/* Info Card */}
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-primary)] p-6 flex gap-4 items-start border-l-4 border-l-[var(--info)] shadow-sm">
          <div className="p-2 rounded-lg bg-[var(--info)]/10 text-[var(--info)]">
            <ShieldAlert size={20} />
          </div>
          <div>
            <h3 className="font-medium text-sm">Informasi Keamanan</h3>
            <p className="text-sm text-[var(--text-secondary)] mt-1 leading-relaxed">
              Hanya IT Administrator yang dapat mengubah pengaturan ini. Setiap perubahan akan dicatat dalam Audit Log untuk kepatuhan hukum dan keamanan data.
            </p>
          </div>
        </div>
      </div>
    </>
  )
}
