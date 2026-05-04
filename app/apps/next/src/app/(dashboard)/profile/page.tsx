'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
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

export default function ProfilePage() {
  const router = useRouter()
  const [user, setUser] = useState<UserType | null>(null)

  useEffect(() => {
    if (!auth.isAuthenticated()) {
      router.push('/login')
      return
    }
    setUser(auth.getUser())
  }, [router])

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
      <div className="relative rounded-3xl border border-border bg-muted/50 overflow-hidden shadow-xl shadow-black/5">
        {/* Abstract Background Pattern */}
        <div className="absolute inset-0 h-32 bg-gradient-to-r from-accent/20 via-accent/10 to-transparent" />
        <div className="absolute top-0 right-0 w-64 h-64 bg-accent/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
        
        <div className="relative pt-16 pb-8 px-8 flex flex-col md:flex-row items-end gap-6">
          <div className="relative shrink-0 group">
            <div className="h-32 w-32 rounded-2xl bg-gradient-to-tr from-card to-muted border-4 border-muted/50 flex items-center justify-center text-4xl text-accent font-black shadow-2xl transition-transform group-hover:scale-105 duration-300">
              {user?.first_name?.[0] || '?'}
            </div>
            <div className="absolute -bottom-2 -right-2 h-10 w-10 rounded-xl bg-background border border-border flex items-center justify-center text-accent shadow-lg cursor-pointer hover:bg-accent hover:text-white transition-all">
              <Edit3 size={18} />
            </div>
          </div>
          
          <div className="flex-1 pb-2">
            <div className="flex items-center gap-3 mb-2">
              <span className="px-2.5 py-1 rounded-full bg-accent/10 text-accent text-[10px] font-black uppercase tracking-widest border border-accent/20">
                {ROLE_LABELS[user.role] || user.role}
              </span>
              {user.active && (
                <span className="flex items-center gap-1.5 text-[10px] font-bold text-success uppercase tracking-wider">
                  <div className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
                  Akun Aktif
                </span>
              )}
            </div>
            <h1 className="text-3xl font-black tracking-tight">{user.first_name} {user.last_name}</h1>
            <p className="text-muted-foreground mt-1 flex items-center gap-2 font-medium">
              <Mail size={14} className="text-muted-foreground/60" />
              {user.email}
            </p>
          </div>

          <div className="flex flex-col gap-2 w-full md:w-auto">
            <button className="px-6 py-2.5 rounded-xl bg-accent text-white text-sm font-bold shadow-lg shadow-accent/20 hover:bg-accent-hover transition-all flex items-center justify-center gap-2">
              Edit Profil
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Side: Stats & Info */}
        <div className="lg:col-span-1 space-y-6">
          <div className="rounded-2xl border border-border bg-muted/50 p-6 space-y-6 shadow-sm">
            <h2 className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground">Informasi Akun</h2>
            
            <div className="space-y-4">
              <div className="flex items-center gap-4 group">
                <div className="h-10 w-10 rounded-xl bg-muted/50 border border-border flex items-center justify-center text-muted-foreground group-hover:text-accent transition-colors">
                  <Calendar size={18} />
                </div>
                <div>
                  <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Bergabung Sejak</p>
                  <p className="text-sm font-bold">{format(joinDate, 'dd MMMM yyyy', { locale: idLocale })}</p>
                </div>
              </div>

              <div className="flex items-center gap-4 group">
                <div className="h-10 w-10 rounded-xl bg-muted/50 border border-border flex items-center justify-center text-muted-foreground group-hover:text-accent transition-colors">
                  <Briefcase size={18} />
                </div>
                <div>
                  <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Departemen</p>
                  <p className="text-sm font-bold">Export Sales & Logistics</p>
                </div>
              </div>

              <div className="flex items-center gap-4 group">
                <div className="h-10 w-10 rounded-xl bg-muted/50 border border-border flex items-center justify-center text-muted-foreground group-hover:text-accent transition-colors">
                  <Shield size={18} />
                </div>
                <div>
                  <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Level Akses</p>
                  <p className="text-sm font-bold">Level {user.role === 'ADMIN' ? '5' : user.role === 'MANAGER' ? '4' : '2'}</p>
                </div>
              </div>
            </div>

            <div className="pt-6 border-t border-border/50">
              <button 
                onClick={() => { auth.logout(); router.push('/login') }}
                className="w-full px-4 py-3 rounded-xl bg-destructive/5 border border-destructive/10 text-destructive text-xs font-bold uppercase tracking-widest hover:bg-destructive hover:text-white transition-all flex items-center justify-center gap-2"
              >
                <LogOut size={16} /> Keluar dari Sistem
              </button>
            </div>
          </div>
        </div>

        {/* Right Side: Settings & Security */}
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-2xl border border-border bg-muted/50 overflow-hidden shadow-sm">
            <div className="px-6 py-4 border-b border-border/50 bg-muted/30 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Key className="text-accent" size={20} />
                <h2 className="font-bold">Keamanan & Password</h2>
              </div>
            </div>
            
            <div className="p-8 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Password Saat Ini</label>
                  <input type="password" disabled className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm outline-none opacity-50 cursor-not-allowed" value="********" />
                </div>
                <div className="hidden md:block" />
                
                <div className="space-y-2">
                  <label className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Password Baru</label>
                  <input type="password" placeholder="Min. 8 karakter" className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:border-accent focus:ring-4 focus:ring-accent/5 transition-all" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Konfirmasi Password</label>
                  <input type="password" placeholder="Ulangi password baru" className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:border-accent focus:ring-4 focus:ring-accent/5 transition-all" />
                </div>
              </div>

              <div className="p-4 rounded-xl bg-accent/5 border border-accent/10 flex gap-4">
                <Shield className="text-accent shrink-0" size={20} />
                <p className="text-xs text-secondary-foreground leading-relaxed italic">
                  Gunakan kombinasi huruf besar, kecil, angka, dan simbol untuk keamanan maksimal sesuai standar PT Semen Tonasa.
                </p>
              </div>

              <div className="flex justify-end pt-4">
                <button className="px-8 py-3 rounded-xl bg-muted border border-border text-sm font-bold hover:bg-muted-foreground/10 transition-all">
                  Perbarui Password
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="rounded-2xl border border-border bg-muted/50 p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <CheckCircle className="text-success" size={20} />
                <h3 className="font-bold text-sm">Verifikasi Dua Langkah</h3>
              </div>
              <p className="text-xs text-secondary-foreground leading-relaxed mb-6">
                Tambahkan lapisan keamanan ekstra dengan kode verifikasi sekali pakai ke email Anda.
              </p>
              <button className="text-accent text-xs font-bold uppercase tracking-wider hover:underline">Aktifkan Sekarang →</button>
            </div>

            <div className="rounded-2xl border border-border bg-muted/50 p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <Clock className="text-info" size={20} />
                <h3 className="font-bold text-sm">Sesi Aktif</h3>
              </div>
              <p className="text-xs text-secondary-foreground leading-relaxed mb-6">
                Kelola sesi aktif Anda di perangkat lain untuk memastikan tidak ada akses tidak sah.
              </p>
              <button className="text-accent text-xs font-bold uppercase tracking-wider hover:underline">Lihat Semua Sesi →</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
