import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { auth, User as UserType } from '@/lib/auth'
import { 
  User, 
  Mail, 
  Shield, 
  Calendar, 
  Key, 
  LogOut, 
  Edit3, 
  CheckCircle,
  Clock,
  Briefcase
} from 'lucide-react'
import { format } from 'date-fns'
import { id as idLocale } from 'date-fns/locale'

export const Route = createFileRoute('/profile')({
  component: ProfilePage,
})

function ProfilePage() {
  const navigate = useNavigate()
  const [user, setUser] = useState<UserType | null>(null)

  useEffect(() => {
    if (!auth.isAuthenticated()) {
      navigate({ to: '/login' })
      return
    }
    setUser(auth.getUser())
  }, [navigate])

  if (!user) return null

  const ROLE_LABELS: Record<string, string> = {
    ADMIN: 'IT Administrator',
    OFFICER: 'Export Sales Officer',
    MANAGER: 'Manager Export',
    AUDITOR: 'Auditor External/Internal',
  }

  const joinDate = user.created_at ? new Date(user.created_at) : new Date()

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header Profile */}
      <div className="relative rounded-3xl border border-[var(--border)] bg-[var(--bg-secondary)] overflow-hidden shadow-xl shadow-black/5">
        {/* Abstract Background Pattern */}
        <div className="absolute inset-0 h-32 bg-gradient-to-r from-[var(--accent)]/20 via-[var(--accent-hover)]/10 to-transparent" />
        <div className="absolute top-0 right-0 w-64 h-64 bg-[var(--accent)]/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
        
        <div className="relative pt-16 pb-8 px-8 flex flex-col md:flex-row items-end gap-6">
          <div className="relative shrink-0 group">
            <div className="h-32 w-32 rounded-2xl bg-gradient-to-tr from-[var(--bg-elevated)] to-[var(--bg-tertiary)] border-4 border-[var(--bg-secondary)] flex items-center justify-center text-4xl text-[var(--accent)] font-black shadow-2xl transition-transform group-hover:scale-105 duration-300">
              {user.first_name[0]}
            </div>
            <div className="absolute -bottom-2 -right-2 h-10 w-10 rounded-xl bg-[var(--bg-primary)] border border-[var(--border)] flex items-center justify-center text-[var(--accent)] shadow-lg cursor-pointer hover:bg-[var(--accent)] hover:text-white transition-all">
              <Edit3 size={18} />
            </div>
          </div>
          
          <div className="flex-1 pb-2">
            <div className="flex items-center gap-3 mb-2">
              <span className="px-2.5 py-1 rounded-full bg-[var(--accent)]/10 text-[var(--accent)] text-[10px] font-black uppercase tracking-widest border border-[var(--accent)]/20">
                {ROLE_LABELS[user.role] || user.role}
              </span>
              {user.active && (
                <span className="flex items-center gap-1.5 text-[10px] font-bold text-[var(--success)] uppercase tracking-wider">
                  <div className="h-1.5 w-1.5 rounded-full bg-[var(--success)] animate-pulse" />
                  Akun Aktif
                </span>
              )}
            </div>
            <h1 className="text-3xl font-black tracking-tight">{user.first_name} {user.last_name}</h1>
            <p className="text-[var(--text-secondary)] mt-1 flex items-center gap-2 font-medium">
              <Mail size={14} className="text-[var(--text-muted)]" />
              {user.email}
            </p>
          </div>

          <div className="flex flex-col gap-2 w-full md:w-auto">
            <button className="px-6 py-2.5 rounded-xl bg-[var(--accent)] text-white text-sm font-bold shadow-lg shadow-[var(--accent)]/20 hover:bg-[var(--accent-hover)] transition-all flex items-center justify-center gap-2">
              Edit Profil
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Side: Stats & Info */}
        <div className="lg:col-span-1 space-y-6">
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-secondary)] p-6 space-y-6 shadow-sm">
            <h2 className="text-xs font-black uppercase tracking-[0.2em] text-[var(--text-muted)]">Informasi Akun</h2>
            
            <div className="space-y-4">
              <div className="flex items-center gap-4 group">
                <div className="h-10 w-10 rounded-xl bg-[var(--bg-tertiary)]/50 border border-[var(--border)] flex items-center justify-center text-[var(--text-muted)] group-hover:text-[var(--accent)] transition-colors">
                  <Calendar size={18} />
                </div>
                <div>
                  <p className="text-[10px] uppercase font-bold text-[var(--text-muted)] tracking-wider">Bergabung Sejak</p>
                  <p className="text-sm font-bold">{format(joinDate, 'dd MMMM yyyy', { locale: idLocale })}</p>
                </div>
              </div>

              <div className="flex items-center gap-4 group">
                <div className="h-10 w-10 rounded-xl bg-[var(--bg-tertiary)]/50 border border-[var(--border)] flex items-center justify-center text-[var(--text-muted)] group-hover:text-[var(--accent)] transition-colors">
                  <Briefcase size={18} />
                </div>
                <div>
                  <p className="text-[10px] uppercase font-bold text-[var(--text-muted)] tracking-wider">Departemen</p>
                  <p className="text-sm font-bold">Export Sales & Logistics</p>
                </div>
              </div>

              <div className="flex items-center gap-4 group">
                <div className="h-10 w-10 rounded-xl bg-[var(--bg-tertiary)]/50 border border-[var(--border)] flex items-center justify-center text-[var(--text-muted)] group-hover:text-[var(--accent)] transition-colors">
                  <Shield size={18} />
                </div>
                <div>
                  <p className="text-[10px] uppercase font-bold text-[var(--text-muted)] tracking-wider">Level Akses</p>
                  <p className="text-sm font-bold">Level {user.role === 'ADMIN' ? '5' : user.role === 'MANAGER' ? '4' : '2'}</p>
                </div>
              </div>
            </div>

            <div className="pt-6 border-t border-[var(--border)]/50">
              <button 
                onClick={() => { auth.logout(); window.location.href = '/login' }}
                className="w-full px-4 py-3 rounded-xl bg-[var(--danger)]/5 border border-[var(--danger)]/10 text-[var(--danger)] text-xs font-bold uppercase tracking-widest hover:bg-[var(--danger)] hover:text-white transition-all flex items-center justify-center gap-2"
              >
                <LogOut size={16} /> Keluar dari Sistem
              </button>
            </div>
          </div>
        </div>

        {/* Right Side: Settings & Security */}
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-secondary)] overflow-hidden shadow-sm">
            <div className="px-6 py-4 border-b border-[var(--border)]/50 bg-[var(--bg-tertiary)]/30 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Key className="text-[var(--accent)]" size={20} />
                <h2 className="font-bold">Keamanan & Password</h2>
              </div>
            </div>
            
            <div className="p-8 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] uppercase font-bold text-[var(--text-muted)] tracking-wider">Password Saat Ini</label>
                  <input type="password" disabled className="w-full bg-[var(--bg-primary)] border border-[var(--border)] rounded-xl px-4 py-2.5 text-sm outline-none opacity-50 cursor-not-allowed" value="********" />
                </div>
                <div className="hidden md:block" />
                
                <div className="space-y-2">
                  <label className="text-[10px] uppercase font-bold text-[var(--text-muted)] tracking-wider">Password Baru</label>
                  <input type="password" placeholder="Min. 8 karakter" className="w-full bg-[var(--bg-primary)] border border-[var(--border)] rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--accent)]/5 transition-all" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] uppercase font-bold text-[var(--text-muted)] tracking-wider">Konfirmasi Password</label>
                  <input type="password" placeholder="Ulangi password baru" className="w-full bg-[var(--bg-primary)] border border-[var(--border)] rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--accent)]/5 transition-all" />
                </div>
              </div>

              <div className="p-4 rounded-xl bg-[var(--accent)]/5 border border-[var(--accent)]/10 flex gap-4">
                <Shield className="text-[var(--accent)] shrink-0" size={20} />
                <p className="text-xs text-[var(--text-secondary)] leading-relaxed italic">
                  Gunakan kombinasi huruf besar, kecil, angka, dan simbol untuk keamanan maksimal sesuai standar PT Semen Tonasa.
                </p>
              </div>

              <div className="flex justify-end pt-4">
                <button className="px-8 py-3 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border)] text-sm font-bold hover:bg-[var(--bg-hover)] transition-all">
                  Perbarui Password
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-secondary)] p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <CheckCircle className="text-[var(--success)]" size={20} />
                <h3 className="font-bold text-sm">Verifikasi Dua Langkah</h3>
              </div>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed mb-6">
                Tambahkan lapisan keamanan ekstra dengan kode verifikasi sekali pakai ke email Anda.
              </p>
              <button className="text-[var(--accent)] text-xs font-bold uppercase tracking-wider hover:underline">Aktifkan Sekarang →</button>
            </div>

            <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-secondary)] p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <Clock className="text-[var(--info)]" size={20} />
                <h3 className="font-bold text-sm">Sesi Aktif</h3>
              </div>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed mb-6">
                Kelola sesi aktif Anda di perangkat lain untuk memastikan tidak ada akses tidak sah.
              </p>
              <button className="text-[var(--accent)] text-xs font-bold uppercase tracking-wider hover:underline">Lihat Semua Sesi →</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
