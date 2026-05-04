'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { auth } from '@/lib/auth'
import { motion, AnimatePresence } from 'framer-motion'
import { LogIn, UserPlus, Mail, Lock, User, ArrowRight, Loader2, ShieldCheck } from 'lucide-react'
import Image from 'next/image'

export default function LoginPage() {
  const router = useRouter()
  const [isLogin, setIsLogin] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      if (isLogin) {
        await auth.login(form.email, form.password)
      } else {
        await auth.register(form)
      }
      router.push('/dashboard')
    } catch (err: any) {
      const msg = err?.response?.data?.error?.message || 'Terjadi kesalahan, coba lagi.'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen bg-background overflow-hidden">
      {/* Left Side: Brand & Visuals */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-neutral-900 overflow-hidden">
        <Image
          src="/login-bg.png"
          alt="Semen Tonasa Industrial"
          fill
          className="object-cover opacity-60 mix-blend-overlay scale-105"
          priority
        />
        
        {/* Abstract Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-accent/40 via-transparent to-black/60" />
        
        {/* Content Overlay */}
        <div className="relative z-10 flex flex-col justify-between p-16 w-full">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center">
              <ShieldCheck className="text-white w-7 h-7" />
            </div>
            <span className="text-white text-xl font-bold tracking-tight">PortEx Portal</span>
          </div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="max-w-lg"
          >
            <h2 className="text-5xl font-extrabold text-white leading-tight mb-6">
              Sistem Manajemen <br />
              <span className="text-accent italic">E-Document</span> Ekspor
            </h2>
            <p className="text-lg text-white/70 leading-relaxed">
              Platform terintegrasi untuk pengelolaan dokumen ekspor PT Semen Tonasa. 
              Keamanan data, efisiensi alur kerja, dan transparansi dalam setiap transaksi.
            </p>
          </motion.div>

          <div className="flex items-center gap-6 text-white/50 text-sm">
            <span>© 2026 PT Semen Tonasa</span>
            <div className="w-1 h-1 rounded-full bg-white/20" />
            <span>SIG Group</span>
            <div className="w-1 h-1 rounded-full bg-white/20" />
            <span>Internal Access</span>
          </div>
        </div>

        {/* Decorative Elements */}
        <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-accent/20 rounded-full blur-[120px]" />
        <div className="absolute top-1/4 -left-24 w-64 h-64 bg-accent/10 rounded-full blur-[100px]" />
      </div>

      {/* Right Side: Auth Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-background relative">
        <div className="w-full max-w-md relative z-10">
          {/* Mobile Logo */}
          <div className="lg:hidden flex flex-col items-center mb-10">
            <div className="w-16 h-16 rounded-2xl bg-accent/10 flex items-center justify-center mb-4">
              <ShieldCheck className="text-accent w-8 h-8" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">PortEx Portal</h1>
            <p className="text-sm text-muted-foreground">Export Sales — PT Semen Tonasa</p>
          </div>

          <div className="mb-10">
            <h2 className="text-3xl font-bold tracking-tight text-foreground mb-2">
              {isLogin ? 'Selamat Datang' : 'Buat Akun Baru'}
            </h2>
            <p className="text-muted-foreground">
              {isLogin 
                ? 'Silakan masuk untuk mengakses portal dokumen ekspor.' 
                : 'Lengkapi data diri Anda untuk mendaftar ke sistem.'}
            </p>
          </div>

          {/* Form Card */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <AnimatePresence mode="wait">
              {error && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm font-medium flex items-center gap-3 overflow-hidden"
                >
                  <div className="w-1.5 h-1.5 rounded-full bg-destructive" />
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence mode="wait">
              {!isLogin && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="grid grid-cols-2 gap-4"
                >
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-secondary-foreground ml-1">Nama Depan</label>
                    <div className="relative">
                      <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-muted-foreground" />
                      <input
                        type="text"
                        required
                        value={form.firstName}
                        onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))}
                        className="w-full bg-muted/50 border border-border rounded-xl py-3 pl-11 pr-4 text-sm focus:ring-2 focus:ring-accent/20 focus:border-accent outline-none transition-all placeholder:text-muted-foreground/50"
                        placeholder="John"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-secondary-foreground ml-1">Nama Belakang</label>
                    <div className="relative">
                      <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-muted-foreground" />
                      <input
                        type="text"
                        required
                        value={form.lastName}
                        onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))}
                        className="w-full bg-muted/50 border border-border rounded-xl py-3 pl-11 pr-4 text-sm focus:ring-2 focus:ring-accent/20 focus:border-accent outline-none transition-all placeholder:text-muted-foreground/50"
                        placeholder="Doe"
                      />
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-secondary-foreground ml-1">Alamat Email</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-muted-foreground" />
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  className="w-full bg-muted/50 border border-border rounded-xl py-3 pl-11 pr-4 text-sm focus:ring-2 focus:ring-accent/20 focus:border-accent outline-none transition-all placeholder:text-muted-foreground/50"
                  placeholder="name@sementonasa.co.id"
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between ml-1">
                <label className="text-sm font-semibold text-secondary-foreground">Password</label>
                {isLogin && (
                  <button type="button" className="text-xs text-accent hover:underline font-medium">Lupa Password?</button>
                )}
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-muted-foreground" />
                <input
                  type="password"
                  required
                  minLength={8}
                  value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  className="w-full bg-muted/50 border border-border rounded-xl py-3 pl-11 pr-4 text-sm focus:ring-2 focus:ring-accent/20 focus:border-accent outline-none transition-all placeholder:text-muted-foreground/50"
                  placeholder="Minimal 8 karakter"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-accent hover:bg-accent-hover text-white rounded-xl py-3.5 text-sm font-bold transition-all shadow-xl shadow-accent/20 flex items-center justify-center gap-2 group disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  {isLogin ? 'Masuk ke Portal' : 'Daftar Akun'}
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>

            <div className="relative py-4">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border"></div></div>
              <div className="relative flex justify-center text-xs uppercase"><span className="bg-background px-2 text-muted-foreground">Atau</span></div>
            </div>

            <button
              type="button"
              onClick={() => { setIsLogin(!isLogin); setError('') }}
              className="w-full bg-transparent border border-border hover:bg-muted text-foreground rounded-xl py-3.5 text-sm font-semibold transition-all flex items-center justify-center gap-2"
            >
              {isLogin ? <UserPlus className="w-4.5 h-4.5" /> : <LogIn className="w-4.5 h-4.5" />}
              {isLogin ? 'Buat Akun Baru' : 'Sudah Memiliki Akun? Masuk'}
            </button>

            {/* Local Demo Mode Toggle */}
            <button
              type="button"
              onClick={() => {
                localStorage.setItem('portex_demo_mode', 'true');
                window.location.reload();
              }}
              className="w-full mt-2 bg-gradient-to-r from-accent/10 to-accent/5 border border-accent/20 hover:border-accent/40 text-accent rounded-xl py-3 text-xs font-bold transition-all flex items-center justify-center gap-2"
            >
              <div className="w-2 h-2 rounded-full bg-accent animate-pulse" />
              Aktifkan Mode Demo Lokal (LocalStorage & IndexedDB)
            </button>
          </form>

          {/* Demo Credentials Section */}
          {isLogin && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-8 p-5 rounded-2xl bg-muted/30 border border-border/50"
            >
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-4 flex items-center gap-2">
                <ShieldCheck size={14} className="text-accent" />
                Akses Demo Sistem
              </h3>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { role: 'Admin', email: 'admin@example.com' },
                  { role: 'Manager', email: 'manager@example.com' },
                  { role: 'Officer', email: 'officer@example.com' },
                  { role: 'Auditor', email: 'auditor@example.com' },
                ].map((demo) => (
                  <button
                    key={demo.role}
                    type="button"
                    onClick={() => setForm({ ...form, email: demo.email, password: 'password' })}
                    className="flex flex-col items-start p-3 rounded-xl border border-border bg-background hover:border-accent hover:bg-accent/5 transition-all group text-left shadow-sm hover:shadow-md"
                  >
                    <span className="text-[10px] font-bold text-accent uppercase tracking-tight mb-0.5">{demo.role}</span>
                    <span className="text-[11px] text-muted-foreground truncate w-full font-medium">{demo.email}</span>
                  </button>
                ))}
              </div>
              <p className="mt-4 text-[10px] text-muted-foreground italic text-center">
                *Klik salah satu akun di atas untuk mengisi form secara otomatis. <br />
                Password default: <span className="text-foreground font-bold not-italic">password</span>
              </p>
            </motion.div>
          )}

          {/* Footer Info */}
          <div className="mt-12 text-center">
            <p className="text-xs text-muted-foreground flex items-center justify-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-success" />
              Sistem Keamanan Terenkripsi SIG Group
            </p>
          </div>
        </div>

        {/* Decorative background shapes for mobile */}
        <div className="lg:hidden absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-accent/5 to-transparent pointer-events-none" />
      </div>
    </div>
  )
}
