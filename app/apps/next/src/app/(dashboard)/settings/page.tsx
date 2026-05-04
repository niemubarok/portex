'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { auth } from '@/lib/auth'
import { api } from '@/lib/api'
import { Save, RefreshCw, ShieldAlert, History } from 'lucide-react'

export default function SettingsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [settings, setSettings] = useState<Record<string, string>>({})
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    const user = auth.getUser()
    if (!auth.isAuthenticated() || user?.role !== 'ADMIN') {
      router.push('/dashboard')
      return
    }
    fetchSettings()
  }, [router])

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

  const handleSave = async (key: string, value: string) => {
    try {
      setSaving(true)
      setError(null)
      setSuccess(false)

      await api.put('/api/settings', { key, value })

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
        <RefreshCw className="animate-spin text-accent" size={32} />
      </div>
    )
  }

  return (
    <>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Pengaturan Sistem</h1>
          <p className="text-muted-foreground mt-1">Kelola konfigurasi global aplikasi PortEx.</p>
        </div>
      </div>

      <div className="grid gap-6">
        {/* Retention Policy Card */}
        <div className="rounded-xl border border-border bg-muted/50 overflow-hidden shadow-sm">
          <div className="px-6 py-4 border-b border-border/50 bg-muted/30 flex items-center gap-3">
            <History className="text-accent" size={20} />
            <h2 className="font-semibold">Kebijakan Retensi Dokumen</h2>
          </div>
          
          <div className="p-6 space-y-6">
            <div className="max-w-md">
              <label className="block text-sm font-medium text-muted-foreground mb-2">
                Masa Simpan Standar (Tahun)
              </label>
              <div className="flex gap-3">
                <input
                  type="number"
                  min="1"
                  max="30"
                  value={settings.retention_years || '10'}
                  onChange={(e) => setSettings({ ...settings, retention_years: e.target.value })}
                  className="block w-full rounded-lg border border-border bg-background px-4 py-2 text-foreground focus:border-accent focus:ring-1 focus:ring-accent outline-none transition-all"
                />
                <button
                  onClick={() => handleSave('retention_years', settings.retention_years || '10')}
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-lg bg-accent px-6 py-2 text-sm font-medium text-white hover:bg-accent-hover transition-colors shadow-lg shadow-accent/20 disabled:opacity-50"
                >
                  {saving ? <RefreshCw className="animate-spin" size={16} /> : <Save size={16} />}
                  Simpan
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Watermark Card */}
        <div className="rounded-xl border border-border bg-muted/50 overflow-hidden shadow-sm">
          <div className="px-6 py-4 border-b border-border/50 bg-muted/30 flex items-center gap-3">
            <div className="p-1 rounded bg-accent/10 text-accent">
              <ShieldAlert size={16} />
            </div>
            <h2 className="font-semibold">Konfigurasi Watermark</h2>
          </div>
          
          <div className="p-6 space-y-6">
            <div className="max-w-2xl">
              <label className="block text-sm font-medium text-muted-foreground mb-2">
                Teks Watermark Kunci (Final Lock)
              </label>
              <div className="flex gap-3">
                <input
                  type="text"
                  value={settings.watermark_text || 'LOCKED BY {user} - {date}'}
                  onChange={(e) => setSettings({ ...settings, watermark_text: e.target.value })}
                  className="block w-full rounded-lg border border-border bg-background px-4 py-2 text-foreground focus:border-accent focus:ring-1 focus:ring-accent outline-none transition-all"
                  placeholder="Contoh: CONFIDENTIAL - {user} - {date}"
                />
                <button
                  onClick={() => handleSave('watermark_text', settings.watermark_text || 'LOCKED BY {user} - {date}')}
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-lg bg-accent px-6 py-2 text-sm font-medium text-white hover:bg-accent-hover transition-colors shadow-lg shadow-accent/20 disabled:opacity-50"
                >
                  {saving ? <RefreshCw className="animate-spin" size={16} /> : <Save size={16} />}
                  Simpan
                </button>
              </div>
              <div className="mt-4 space-y-2">
                <p className="text-xs text-muted-foreground">
                  Gunakan placeholder berikut untuk teks dinamis:
                </p>
                <div className="flex flex-wrap gap-2">
                  <code className="text-[10px] bg-muted px-1.5 py-0.5 rounded border border-border">{"{user}"}</code>
                  <span className="text-[10px] text-muted-foreground">- Nama lengkap pengunci</span>
                  <code className="text-[10px] bg-muted px-1.5 py-0.5 rounded border border-border">{"{date}"}</code>
                  <span className="text-[10px] text-muted-foreground">- Tanggal penguncian</span>
                  <code className="text-[10px] bg-muted px-1.5 py-0.5 rounded border border-border">{"{id}"}</code>
                  <span className="text-[10px] text-muted-foreground">- ID Dokumen</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-3 rounded-lg bg-destructive/10 border border-destructive/20 p-4 text-destructive text-sm animate-in fade-in slide-in-from-top-1">
            <ShieldAlert size={18} />
            {error}
          </div>
        )}

        {success && (
          <div className="flex items-center gap-3 rounded-lg bg-success/10 border border-success/20 p-4 text-success text-sm animate-in fade-in slide-in-from-top-1">
            <div className="h-2 w-2 rounded-full bg-success" />
            Pengaturan berhasil diperbarui
          </div>
        )}

        {/* Info Card */}
        <div className="rounded-xl border border-border bg-background p-6 flex gap-4 items-start border-l-4 border-l-info shadow-sm">
          <div className="p-2 rounded-lg bg-info/10 text-info">
            <ShieldAlert size={20} />
          </div>
          <div>
            <h3 className="font-medium text-sm">Informasi Keamanan</h3>
            <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
              Hanya IT Administrator yang dapat mengubah pengaturan ini. Setiap perubahan akan dicatat dalam Audit Log untuk kepatuhan hukum dan keamanan data.
            </p>
          </div>
        </div>
      </div>
    </>
  )
}
