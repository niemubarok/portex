'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { 
  LayoutDashboard, 
  Settings, 
  Users, 
  FileText, 
  Shield, 
  Menu, 
  X,
  LogOut, 
  ChevronRight,
  Bell,
  Search,
  User,
  Home,
  ChevronDown,
  History,
  Sun,
  Moon,
  Filter
} from 'lucide-react'
import { auth } from '@/lib/auth'

interface AppLayoutProps {
  children: React.ReactNode
}

export function AppLayout({ children }: AppLayoutProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState(searchParams.get('q') || '')

  const user = auth.getUser()
  const [isLoggedIn, setIsLoggedIn] = useState(false)

  useEffect(() => {
    setIsLoggedIn(auth.isAuthenticated())
    if (!auth.isAuthenticated() && !['/', '/login'].includes(pathname)) {
      router.push('/login')
    }
  }, [pathname, router])

  // Handle window width for sidebar
  useEffect(() => {
    setSidebarOpen(window.innerWidth > 1024)
    const handleResize = () => {
      if (window.innerWidth > 1024) {
        setMobileSidebarOpen(false)
      }
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Handle search with debouncing
  useEffect(() => {
    const timer = setTimeout(() => {
      const currentQ = searchParams.get('q') || ''
      if (searchTerm !== currentQ) {
        const params = new URLSearchParams(searchParams.toString())
        if (searchTerm) params.set('q', searchTerm)
        else params.delete('q')
        router.push(`${pathname}?${params.toString()}`)
      }
    }, 500)
    return () => clearTimeout(timer)
  }, [searchTerm, pathname, router, searchParams])

  const getSearchPlaceholder = () => {
    if (pathname.includes('/admin/logs')) return 'Cari aktivitas log...'
    if (pathname.includes('/admin/users')) return 'Cari pengguna...'
    if (pathname.includes('/documents')) return 'Cari dokumen...'
    return 'Cari di sistem...'
  }

  // Close mobile sidebar when route changes
  useEffect(() => {
    setMobileSidebarOpen(false)
  }, [pathname])

  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('theme') as 'light' | 'dark'
      if (saved) return saved
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    }
    return 'dark'
  })

  useEffect(() => {
    const root = window.document.documentElement
    if (theme === 'dark') {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }
    localStorage.setItem('theme', theme)
  }, [theme])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClick = () => setProfileDropdownOpen(false)
    if (profileDropdownOpen) {
      window.addEventListener('click', handleClick)
    }
    return () => window.removeEventListener('click', handleClick)
  }, [profileDropdownOpen])

  if (!isLoggedIn && !['/', '/login'].includes(pathname)) {
    return null
  }

  if (!isLoggedIn) {
    return <div className="min-h-screen bg-background">{children}</div>
  }

  const navigation = [
    { name: 'Beranda', href: '/', icon: Home },
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { 
      name: (user?.role === 'MANAGER' || user?.role === 'ADMIN' || user?.role === 'AUDITOR') ? 'Daftar Dokumen' : 'Dokumen Saya', 
      href: '/documents', 
      icon: FileText 
    },
    { type: 'divider', roles: ['ADMIN', 'AUDITOR'] },
    { name: 'Audit Logs', href: '/admin/logs', icon: Shield, roles: ['ADMIN', 'AUDITOR'] },
    { type: 'divider', roles: ['ADMIN'] },
    { name: 'Manajemen User', href: '/admin/users', icon: Users, roles: ['ADMIN'] },
    { name: 'Pengaturan Sistem', href: '/settings', icon: Settings, roles: ['ADMIN'] },
  ]

  const filteredNavigation = navigation.filter(item => {
    // @ts-ignore
    if (item.roles) return item.roles.includes(user?.role || '');
    // @ts-ignore
    return !item.role || user?.role === item.role;
  })
  const currentPage = navigation.find(n => n.href === pathname)?.name || 'Portal'

  return (
    <div className="flex h-screen bg-background overflow-hidden font-sans text-foreground">
      {/* Mobile Sidebar Overlay */}
      {mobileSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[40] lg:hidden animate-in fade-in duration-300"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside 
        className={`
          fixed inset-y-0 left-0 z-[50] lg:relative 
          ${sidebarOpen ? 'w-72' : 'w-24'} 
          ${mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'} 
          flex flex-col border-r border-border bg-muted/30 transition-all duration-300 ease-in-out shadow-2xl lg:shadow-none
        `}
      >
        {/* Branding Area */}
        <div className="flex h-20 items-center px-6 border-b border-border/50 shrink-0 overflow-hidden">
          <Link href="/" className="flex items-center gap-3 shrink-0">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-accent to-accent-hover text-white font-bold shadow-lg shadow-accent/20 shrink-0">
              P
            </div>
            {(sidebarOpen || mobileSidebarOpen) && (
              <div className="flex flex-col min-w-0 animate-in fade-in slide-in-from-left-2 duration-300">
                <span className="font-bold tracking-tight text-lg leading-tight truncate">PortEx</span>
                <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold truncate">E-Document</span>
              </div>
            )}
          </Link>
          <button 
            onClick={() => setMobileSidebarOpen(false)}
            className="ml-auto lg:hidden p-2 text-muted-foreground hover:text-foreground"
          >
            <X size={20} />
          </button>
        </div>

        {/* Demo Mode Indicator */}
        {typeof window !== 'undefined' && localStorage.getItem('portex_demo_mode') === 'true' && (
          <div className="mx-4 mt-4 p-3 rounded-xl bg-accent/10 border border-accent/20 flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-accent animate-pulse" />
              <span className="text-[10px] font-bold text-accent uppercase tracking-wider">Mode Demo Aktif</span>
            </div>
            <p className="text-[9px] text-muted-foreground leading-tight">Data disimpan di browser Anda (LocalStorage & IndexedDB).</p>
            <button 
              onClick={() => {
                localStorage.removeItem('portex_demo_mode');
                window.location.href = '/login';
              }}
              className="text-[9px] font-bold text-accent hover:underline text-left mt-1"
            >
              Keluar dari Mode Demo →
            </button>
          </div>
        )}

        {/* Navigation Area */}
        <nav className="flex-1 px-4 py-6 overflow-y-auto custom-scrollbar space-y-1">
          {filteredNavigation.map((item, idx) => {
            if (item.type === 'divider') {
              return <div key={idx} className="my-4 border-t border-border/30 mx-2" />
            }
            const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href as string))
            return (
              <Link
                key={item.name}
                href={item.href as string}
                className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-accent text-white shadow-lg shadow-accent/10'
                    : 'text-secondary-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                <div className={`shrink-0 ${isActive ? 'text-white' : 'text-muted-foreground group-hover:text-foreground transition-colors'}`}>
                  {item.icon && <item.icon size={20} />}
                </div>
                {(sidebarOpen || mobileSidebarOpen) && (
                  <span className="truncate animate-in fade-in slide-in-from-left-2 duration-300">
                    {item.name}
                  </span>
                )}
                {(sidebarOpen || mobileSidebarOpen) && isActive && (
                  <div className="ml-auto h-1.5 w-1.5 rounded-full bg-white/50" />
                )}
              </Link>
            )
          })}
        </nav>

        {/* Profile Area */}
        <div className="p-4 border-t border-border/50 bg-muted/5 shrink-0 overflow-hidden">
          <div className={`flex items-center ${(sidebarOpen || mobileSidebarOpen) ? 'gap-3' : 'justify-center'}`}>
            <div className="h-10 w-10 shrink-0 rounded-xl bg-gradient-to-tr from-card to-muted border border-border flex items-center justify-center text-accent font-bold shadow-inner">
              {user?.first_name?.[0] || '?'}
            </div>
            {(sidebarOpen || mobileSidebarOpen) && (
              <div className="flex-1 min-w-0 animate-in fade-in slide-in-from-left-2 duration-300">
                <p className="text-sm font-bold truncate leading-tight">{user?.first_name} {user?.last_name}</p>
                <p className="text-[10px] text-accent font-bold uppercase tracking-wider truncate">{user?.role}</p>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        {/* Topbar */}
        <header className="h-20 border-b border-border bg-muted/30 backdrop-blur-xl flex items-center justify-between px-4 lg:px-8 z-20 shrink-0">
          <div className="flex items-center gap-3 lg:gap-6 flex-1 min-w-0">
            <button 
              onClick={() => {
                if (window.innerWidth < 1024) {
                  setMobileSidebarOpen(true)
                } else {
                  setSidebarOpen(!sidebarOpen)
                }
              }}
              className="p-2.5 rounded-xl bg-muted/50 text-muted-foreground hover:text-foreground border border-border transition-all shrink-0"
            >
              <Menu size={20} className={sidebarOpen && window.innerWidth >= 1024 ? 'rotate-90 transition-transform' : ''} />
            </button>

            {/* Universal Search Bar - Enlarged */}
            <div className="flex items-center gap-3 flex-1 max-w-4xl group hidden md:flex">
              <div className="relative flex-1 max-w-2xl">
                <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-accent transition-colors" size={20} />
                <input 
                  type="text" 
                  placeholder={getSearchPlaceholder()}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-background border border-border rounded-2xl pl-14 pr-12 py-3 text-base outline-none focus:border-accent focus:ring-4 focus:ring-accent/5 transition-all shadow-sm group-hover:border-muted-foreground/30"
                />
                {searchTerm && (
                  <button 
                    onClick={() => setSearchTerm('')}
                    className="absolute right-4 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>

              {/* Page Specific Filters in Topbar */}
              {pathname.includes('/documents') && !pathname.includes('/new') && !pathname.includes('/edit') && (
                <div className="relative shrink-0">
                  <Filter size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <select 
                    value={searchParams.get('status') || ''}
                    onChange={(e) => {
                      const params = new URLSearchParams(searchParams.toString())
                      if (e.target.value) params.set('status', e.target.value)
                      else params.delete('status')
                      router.push(`${pathname}?${params.toString()}`)
                    }}
                    className="appearance-none bg-background border border-border rounded-xl pl-10 pr-10 py-3 text-sm outline-none focus:border-accent transition-all cursor-pointer min-w-[150px] shadow-sm hover:border-muted-foreground/30"
                  >
                    <option value="">Semua Status</option>
                    <option value="Draft">Draft</option>
                    <option value="Approved">Approved</option>
                    <option value="Locked">Locked</option>
                    <option value="Rejected">Rejected</option>
                  </select>
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground">
                    <ChevronDown size={16} />
                  </div>
                </div>
              )}

              {pathname.includes('/admin/logs') && (
                <button 
                  onClick={() => {
                    const params = new URLSearchParams(searchParams.toString())
                    const show = params.get('showFilters') === 'true'
                    if (!show) params.set('showFilters', 'true')
                    else params.delete('showFilters')
                    router.push(`${pathname}?${params.toString()}`)
                  }}
                  className={`flex items-center gap-2 px-5 py-3 rounded-xl border transition-all text-sm font-bold shadow-sm ${searchParams.get('showFilters') === 'true' ? 'bg-accent text-white border-accent' : 'bg-background text-secondary-foreground border-border hover:bg-muted'}`}
                >
                  <Filter size={16} />
                  {searchParams.get('showFilters') === 'true' ? 'Tutup Filter' : 'Filter Lanjutan'}
                </button>
              )}
            </div>
            
            {/* Page Title on Mobile */}
            <h1 className="md:hidden font-bold text-sm truncate">{currentPage}</h1>
          </div>

          {/* Right Section */}
          <div className="flex items-center gap-2 lg:gap-4 shrink-0">
            <button 
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="p-2.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted border border-transparent hover:border-border transition-all"
              title={theme === 'dark' ? 'Aktifkan Mode Terang' : 'Aktifkan Mode Gelap'}
            >
              {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
            </button>

            <button className="hidden sm:flex p-2.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-all relative">
              <Bell size={20} />
              <span className="absolute top-2.5 right-2.5 h-2 w-2 rounded-full bg-destructive border-2 border-background" />
            </button>
            
            <div className="hidden sm:block h-8 w-[1px] bg-border mx-1" />

            {/* User Dropdown */}
            <div className="relative">
              <button 
                onClick={(e) => { e.stopPropagation(); setProfileDropdownOpen(!profileDropdownOpen) }}
                className="flex items-center gap-2 lg:gap-3 pl-2 pr-1 py-1 rounded-2xl hover:bg-muted transition-all border border-transparent hover:border-border"
              >
                <div className="flex flex-col items-end hidden lg:flex">
                  <span className="text-sm font-bold text-foreground leading-none mb-1">{user?.first_name}</span>
                  <span className="text-[10px] text-accent font-bold uppercase tracking-widest">{user?.role}</span>
                </div>
                <div className="h-9 w-9 lg:h-10 lg:w-10 rounded-xl bg-gradient-to-tr from-card to-muted border border-border flex items-center justify-center text-accent font-bold shadow-inner text-sm shrink-0">
                  {user?.first_name?.[0] || '?'}
                </div>
                <ChevronDown size={14} className={`text-muted-foreground transition-transform ${profileDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {profileDropdownOpen && (
                <div className="absolute right-0 mt-3 w-56 bg-background border border-border rounded-2xl shadow-2xl py-2 z-50 animate-in fade-in zoom-in-95 duration-200">
                  <div className="px-4 py-2 border-b border-border/50 mb-2 lg:hidden">
                    <p className="text-sm font-bold truncate">{user?.first_name} {user?.last_name}</p>
                    <p className="text-[10px] text-accent font-bold uppercase">{user?.role}</p>
                  </div>
                  <Link href="/profile" className="flex items-center gap-3 px-4 py-2 text-sm text-secondary-foreground hover:text-foreground hover:bg-muted transition-colors">
                    <User size={16} /> Profil Saya
                  </Link>
                  {user?.role === 'ADMIN' && (
                    <Link href="/settings" className="flex items-center gap-3 px-4 py-2 text-sm text-secondary-foreground hover:text-foreground hover:bg-muted transition-colors">
                      <Settings size={16} /> Pengaturan Sistem
                    </Link>
                  )}
                  <div className="my-2 border-t border-border/50" />
                  <button 
                    onClick={() => { auth.logout(); router.push('/login') }}
                    className="flex w-full items-center gap-3 px-4 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors"
                  >
                    <LogOut size={16} /> Keluar
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Scrollable Content */}
        <main className="flex-1 overflow-y-auto bg-background custom-scrollbar">
          <div className="p-4 sm:p-6 lg:p-10 max-w-7xl mx-auto min-h-[calc(100vh-160px)] animate-in fade-in duration-500">
            {children}
          </div>
          
          <footer className="px-4 lg:px-10 py-6 border-t border-border/50 flex flex-col sm:flex-row items-center justify-between gap-4 text-[10px] uppercase font-bold tracking-widest text-muted-foreground bg-muted/10">
            <div className="flex items-center gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-success shadow-sm shadow-success/50" />
              <span>Sistem Aktif</span>
            </div>
            <div className="flex items-center gap-6">
              <Link href="/" className="hover:text-foreground transition-colors">Bantuan</Link>
              <span>&copy; 2026 PortEx</span>
            </div>
          </footer>
        </main>
      </div>
    </div>
  )
}
