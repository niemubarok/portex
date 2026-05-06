'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
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
  Bell,
  Search,
  User,
  Home,
  Sun,
  Moon,
  Filter,
  ChevronDown,
  Activity,
  FolderOpen,
  Plus
} from 'lucide-react'

import { motion, AnimatePresence } from 'framer-motion'
import { auth } from '@/lib/auth'
import { useAuditLogs } from '@/hooks/use-audit-logs'


interface AppLayoutProps {
  children: React.ReactNode
}

export function AppLayout({ children }: AppLayoutProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false)
  const [statusFilterOpen, setStatusFilterOpen] = useState(false)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState(searchParams.get('q') || '')


  const user = auth.getUser()
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [lastReadNotifications, setLastReadNotifications] = useState<string | null>(null)
  const [hoveredItem, setHoveredItem] = useState<string | null>(null)

  const [hoverPos, setHoverPos] = useState(0)

  const { data: notifications = [], isLoading: loadingNotifications } = useAuditLogs({ 
    pageSize: 5,
    enabled: isLoggedIn 
  })


  useEffect(() => {
    setIsLoggedIn(auth.isAuthenticated())
    if (!auth.isAuthenticated() && !['/', '/login'].includes(pathname)) {
      router.push('/login')
    }
    
    if (typeof window !== 'undefined') {
      setLastReadNotifications(localStorage.getItem('portex_last_read_notifications'))
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
    if (pathname.includes('/files')) return 'Cari berkas...'
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

  // Close status filter dropdown when clicking outside
  useEffect(() => {
    const handleClick = () => {
      setStatusFilterOpen(false)
      setNotificationsOpen(false)
    }
    if (statusFilterOpen || notificationsOpen) {
      window.addEventListener('click', handleClick)
    }
    
    if (notificationsOpen) {
      const now = new Date().toISOString()
      setLastReadNotifications(now)
      localStorage.setItem('portex_last_read_notifications', now)
    }

    return () => window.removeEventListener('click', handleClick)
  }, [statusFilterOpen, notificationsOpen])





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
    { name: 'Berkas', href: '/files', icon: FolderOpen },
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
          ${sidebarOpen ? 'w-[260px]' : 'w-20'} 
          ${mobileSidebarOpen ? 'translate-x-0 !w-[260px]' : '-translate-x-full lg:translate-x-0'} 
          flex flex-col bg-background transition-all duration-300 ease-in-out shadow-2xl lg:shadow-none
        `}
      >
        {/* Branding Area */}
        <div className="flex h-20 items-center px-4 border-b border-border shrink-0 overflow-hidden">
          <Link href="/" className="flex items-center gap-3 shrink-0 pl-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white shadow-sm shrink-0 overflow-hidden border border-border/30">
              <Image src="/icon.png" alt="PortEx" width={24} height={24} className="object-contain" />
            </div>
            {(sidebarOpen || mobileSidebarOpen) && (
              <div className="flex flex-col min-w-0 animate-in fade-in slide-in-from-left-2 duration-300">
                <span className="font-semibold text-lg text-foreground truncate">PortEx</span>
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

        {/* New Button & Navigation Area */}
        <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col py-4 mt-2">
          {/* New Button (Drive Style) */}
          <div className={`px-4 mb-6 ${!sidebarOpen && !mobileSidebarOpen ? 'flex justify-center' : ''}`}>
            <Link 
              href="/documents/new"
              className={`flex items-center gap-3 bg-background hover:bg-muted/50 border border-border shadow-sm transition-all duration-200 text-foreground ${sidebarOpen || mobileSidebarOpen ? 'rounded-2xl px-4 py-3.5 w-max pr-6' : 'rounded-2xl p-3 w-max'}`}
            >
              <div className="flex items-center justify-center text-foreground">
                 <Plus size={24} />
              </div>
              {(sidebarOpen || mobileSidebarOpen) && (
                <span className="font-medium text-sm">Baru</span>
              )}
            </Link>
          </div>

          <nav className="flex-1 px-3 space-y-1">
            {filteredNavigation.map((item, idx) => {
              if (item.type === 'divider') {
                return <div key={idx} className="my-3 border-t border-border/40 mx-3" />
              }
              const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href as string))
              return (
                <Link
                  key={typeof item.name === 'string' ? item.name : 'nav-item'}
                  href={item.href as string}
                  onMouseEnter={(e) => {
                    if (!sidebarOpen && !mobileSidebarOpen) {
                      const rect = e.currentTarget.getBoundingClientRect()
                      setHoverPos(rect.top + rect.height / 2)
                      setHoveredItem(typeof item.name === 'string' ? item.name : '')
                    }
                  }}
                  onMouseLeave={() => setHoveredItem(null)}
                  className={`group relative flex items-center gap-3 rounded-full px-4 py-2.5 text-sm transition-all duration-200 ${
                    isActive
                      ? 'bg-accent/10 text-accent font-medium'
                      : 'text-foreground/70 hover:bg-muted hover:text-foreground'
                  }`}
                >
                  <div className={`shrink-0 ${isActive ? 'text-accent' : 'text-foreground/50 group-hover:text-foreground transition-colors'}`}>
                    {item.icon && <item.icon size={20} />}
                  </div>
                  {(sidebarOpen || mobileSidebarOpen) && (
                    <span className="truncate animate-in fade-in slide-in-from-left-2 duration-300">
                      {item.name}
                    </span>
                  )}
                </Link>
              )
            })}
          </nav>
        </div>

        {/* User Profile Section (Bottom) */}
        <div className="p-3 shrink-0">
          <div className={`flex items-center ${sidebarOpen || mobileSidebarOpen ? 'gap-2 px-2 py-2 rounded-xl hover:bg-muted/50 transition-colors group/profile' : 'justify-center'}`}>
            <Link href="/profile" className="flex items-center gap-3 min-w-0 flex-1" title="Lihat Profil">
              <div 
                className="relative shrink-0"
                onMouseEnter={(e) => {
                  if (!sidebarOpen && !mobileSidebarOpen) {
                    const rect = e.currentTarget.getBoundingClientRect()
                    setHoverPos(rect.top + rect.height / 2)
                    setHoveredItem(`${user?.firstName} ${user?.lastName}`)
                  }
                }}
                onMouseLeave={() => setHoveredItem(null)}
              >
                <div className="h-9 w-9 rounded-full bg-accent/10 flex items-center justify-center text-accent text-sm font-bold shadow-sm group-hover/profile:bg-accent/20 transition-colors">
                  {user?.firstName?.[0] || '?'}
                </div>
              </div>
              
              {(sidebarOpen || mobileSidebarOpen) && (
                <div className="flex flex-col min-w-0 flex-1 animate-in fade-in duration-300">
                  <span className="font-medium text-sm leading-tight truncate text-foreground group-hover/profile:text-accent transition-colors">{user?.firstName} {user?.lastName}</span>
                  <span className="text-xs text-muted-foreground truncate">{user?.role}</span>
                </div>
              )}
            </Link>
            
            {(sidebarOpen || mobileSidebarOpen) && (
              <button 
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); auth.logout(); router.push('/login') }}
                className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors shrink-0"
                title="Keluar"
              >
                <LogOut size={16} />
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        {/* Topbar */}
        <header className={`${mobileSearchOpen ? 'py-4 h-auto min-h-[80px]' : 'h-20'} border-b border-border bg-background flex items-center justify-between px-4 lg:px-8 z-20 shrink-0 transition-all duration-300`}>
          <div className="flex items-center gap-3 lg:gap-6 flex-1 min-w-0">
            {!mobileSearchOpen && (
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
            )}

            {/* Mobile Search View */}
            {mobileSearchOpen ? (
              <div className="flex items-center gap-3 w-full animate-in slide-in-from-top-2 duration-300">
                <div className="relative flex-1 flex items-center bg-background border border-accent rounded-xl focus-within:ring-4 focus-within:ring-accent/5 shadow-lg shadow-accent/5 transition-all">
                  <Search className="ml-4 text-accent shrink-0" size={18} />
                  <input 
                    autoFocus
                    type="text" 
                    placeholder={getSearchPlaceholder()}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-transparent border-none py-2.5 pl-3 pr-2 text-sm outline-none placeholder:text-muted-foreground/60"
                  />
                  
                  {/* Mobile Filters Integrated */}
                  {(pathname.includes('/documents') || pathname.includes('/admin/logs')) && (
                    <div className="flex items-center pr-2 border-l border-border/50 shrink-0 h-6 my-2 relative">
                      {pathname.includes('/documents') && !pathname.includes('/new') && !pathname.includes('/edit') && (
                        <div className="relative ml-2">
                          <button 
                            onClick={(e) => { e.stopPropagation(); setStatusFilterOpen(!statusFilterOpen) }}
                            className={`flex items-center gap-1.5 p-1.5 rounded-lg transition-all ${searchParams.get('status') ? 'bg-accent text-white' : 'text-accent hover:bg-accent/10'}`}
                          >
                            <Filter size={14} />
                            {searchParams.get('status') && (
                              <span className="text-[10px] font-bold uppercase tracking-wider">{searchParams.get('status')}</span>
                            )}
                          </button>
                          
                          {statusFilterOpen && (
                            <div className="absolute top-full right-0 mt-3 w-32 bg-background border border-border rounded-xl shadow-2xl z-50 py-1.5 animate-in slide-in-from-top-2 duration-200">
                              {['', 'Draft', 'Approved', 'Locked', 'Rejected'].map((status) => (
                                <button
                                  key={status}
                                  onClick={() => {
                                    const params = new URLSearchParams(searchParams.toString())
                                    if (status) params.set('status', status)
                                    else params.delete('status')
                                    router.push(`${pathname}?${params.toString()}`)
                                    setStatusFilterOpen(false)
                                  }}
                                  className={`w-full text-left px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest hover:bg-muted transition-colors ${searchParams.get('status') === status || (!status && !searchParams.get('status')) ? 'text-accent bg-accent/5' : 'text-foreground/70'}`}
                                >
                                  {status || 'Semua'}
                                </button>
                              ))}
                            </div>
                          )}
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
                          className={`flex items-center gap-1.5 ml-2 px-2.5 py-1.5 rounded-lg transition-all text-[10px] font-bold uppercase tracking-wider ${searchParams.get('showFilters') === 'true' ? 'bg-accent text-white' : 'bg-accent/5 text-accent hover:bg-accent/10'}`}
                        >
                          <Filter size={12} />
                          Filter
                        </button>
                      )}
                    </div>
                  )}
                  
                  {searchTerm && !pathname.includes('/documents') && !pathname.includes('/admin/logs') && (
                    <button 
                      onClick={() => setSearchTerm('')}
                      className="pr-3 text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
                <button 
                  onClick={() => setMobileSearchOpen(false)}
                  className="p-2.5 rounded-xl bg-accent/5 text-accent hover:bg-accent/10 transition-colors shrink-0"
                  title="Tutup Pencarian"
                >
                  <X size={20} />
                </button>
              </div>
            ) : (
              <>
                {/* Universal Search Bar - Desktop */}
                <div className="flex items-center flex-1 max-w-4xl group hidden md:flex">
                  <div className="relative flex-1 max-w-2xl flex items-center bg-background border border-border rounded-2xl focus-within:border-accent focus-within:ring-4 focus-within:ring-accent/5 transition-all shadow-sm hover:border-muted-foreground/30">
                    <Search className="ml-5 text-muted-foreground group-focus-within:text-accent transition-colors shrink-0" size={20} />
                    <input 
                      type="text" 
                      placeholder={getSearchPlaceholder()}
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full bg-transparent border-none py-3 pl-4 pr-4 text-base outline-none placeholder:text-muted-foreground/50"
                    />
                    
                    {/* Desktop Filters Integrated */}
                    {(pathname.includes('/documents') || pathname.includes('/admin/logs')) && (
                      <div className="flex items-center pr-3 border-l border-border/50 ml-2 h-8 my-2 relative">
                        {pathname.includes('/documents') && !pathname.includes('/new') && !pathname.includes('/edit') && (
                          <div className="relative ml-4">
                            <button 
                              onClick={(e) => { e.stopPropagation(); setStatusFilterOpen(!statusFilterOpen) }}
                              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl transition-all font-bold text-xs uppercase tracking-widest ${searchParams.get('status') ? 'bg-accent text-white shadow-lg shadow-accent/20' : 'text-muted-foreground hover:text-accent hover:bg-accent/5'}`}
                            >
                              <Filter size={16} />
                              {searchParams.get('status') || 'Filter Status'}
                              <ChevronDown size={14} className={`transition-transform ${statusFilterOpen ? 'rotate-180' : ''}`} />
                            </button>
                            
                            {statusFilterOpen && (
                              <div className="absolute top-full right-0 mt-3 w-44 bg-background border border-border rounded-2xl shadow-2xl z-50 py-2 animate-in slide-in-from-top-2 duration-200">
                                {['', 'Draft', 'Approved', 'Locked', 'Rejected'].map((status) => (
                                  <button
                                    key={status}
                                    onClick={() => {
                                      const params = new URLSearchParams(searchParams.toString())
                                      if (status) params.set('status', status)
                                      else params.delete('status')
                                      router.push(`${pathname}?${params.toString()}`)
                                      setStatusFilterOpen(false)
                                    }}
                                    className={`w-full text-left px-4 py-2 text-xs font-bold uppercase tracking-widest hover:bg-muted transition-colors ${searchParams.get('status') === status || (!status && !searchParams.get('status')) ? 'text-accent bg-accent/5' : 'text-foreground/70'}`}
                                  >
                                    {status || 'Semua Status'}
                                  </button>
                                ))}
                              </div>
                            )}
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
                            className={`flex items-center gap-2 ml-3 px-3 py-1.5 rounded-xl transition-all font-bold text-xs uppercase tracking-widest whitespace-nowrap ${searchParams.get('showFilters') === 'true' ? 'bg-accent text-white shadow-lg shadow-accent/20' : 'text-muted-foreground hover:text-accent hover:bg-accent/5'}`}
                          >
                            <Filter size={16} />
                            {searchParams.get('showFilters') === 'true' ? 'Tutup Filter' : 'Filter Lanjutan'}
                          </button>
                        )}
                      </div>
                    )}

                    {searchTerm && !pathname.includes('/documents') && !pathname.includes('/admin/logs') && (
                      <button 
                        onClick={() => setSearchTerm('')}
                        className="pr-4 text-muted-foreground hover:text-destructive transition-all"
                      >
                        <X size={16} />
                      </button>
                    )}
                  </div>
                </div>
                
                {/* Page Title on Mobile */}
                <h1 className="md:hidden font-bold text-sm truncate">{currentPage}</h1>
              </>
            )}
          </div>

          {/* Right Section */}
          <div className="flex items-center gap-2 lg:gap-4 shrink-0">
            {!mobileSearchOpen && (
              <button 
                onClick={() => setMobileSearchOpen(true)}
                className="md:hidden p-2.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
                title="Cari"
              >
                <Search size={20} />
              </button>
            )}

            {!mobileSearchOpen && (
              <>
                <button 
                  onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                  className="p-2.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted border border-transparent hover:border-border transition-all"
                  title={theme === 'dark' ? 'Aktifkan Mode Terang' : 'Aktifkan Mode Gelap'}
                >
                  {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
                </button>

                <div className="relative">
                  <button 
                    onClick={(e) => { e.stopPropagation(); setNotificationsOpen(!notificationsOpen) }}
                    className={`hidden sm:flex p-2.5 rounded-xl transition-all relative ${notificationsOpen ? 'bg-accent text-white shadow-lg shadow-accent/20' : 'text-muted-foreground hover:text-foreground hover:bg-muted'}`}
                  >
                    <Bell size={20} />
                    {notifications.length > 0 && (!lastReadNotifications || new Date(notifications[0].createdAt) > new Date(lastReadNotifications)) && (
                      <span className="absolute top-2.5 right-2.5 h-2 w-2 rounded-full bg-destructive border-2 border-background animate-pulse" />
                    )}
                  </button>


                  <AnimatePresence>
                    {notificationsOpen && (
                      <motion.div 
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        className="absolute right-0 mt-3 w-80 sm:w-96 bg-background border border-border rounded-2xl shadow-2xl z-[100] overflow-hidden"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="px-5 py-4 border-b border-border bg-muted/30 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Activity size={16} className="text-accent" />
                            <h3 className="font-bold text-sm uppercase tracking-widest">Notifikasi</h3>
                          </div>
                          <span className="text-[10px] font-bold bg-accent/10 text-accent px-2 py-0.5 rounded-full uppercase">Terbaru</span>
                        </div>
                        
                        <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
                          {loadingNotifications ? (
                            <div className="p-10 flex flex-col items-center justify-center gap-3">
                              <div className="h-6 w-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Memuat...</span>
                            </div>
                          ) : notifications.length === 0 ? (
                            <div className="p-10 flex flex-col items-center justify-center gap-3 text-center">
                              <Bell size={32} className="text-muted-foreground/20" />
                              <p className="text-xs text-muted-foreground font-medium">Belum ada notifikasi baru untuk Anda.</p>
                            </div>
                          ) : (
                            <div className="divide-y divide-border/50">
                              {notifications.map((notif: any) => (
                                <Link 
                                  key={notif.id}
                                  href={notif.documentId ? `/dashboard?docId=${notif.documentId}` : '/admin/logs'}
                                  onClick={() => setNotificationsOpen(false)}
                                  className="flex flex-col gap-1 px-5 py-4 hover:bg-muted/50 transition-colors"
                                >
                                  <div className="flex items-center justify-between gap-2">
                                    <span className={`text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded border ${
                                      notif.action.includes('CREATE') || notif.action.includes('UPLOAD') ? 'text-success border-success/20 bg-success/5' :
                                      notif.action.includes('APPROVE') ? 'text-info border-info/20 bg-info/5' :
                                      notif.action.includes('LOCK') ? 'text-warning border-warning/20 bg-warning/5' :
                                      'text-muted-foreground border-border bg-muted'
                                    }`}>
                                      {notif.action === 'UPLOAD_DOCUMENT' ? 'Upload Dokumen' :
                                       notif.action === 'APPROVE_LEVEL_1' ? 'Persetujuan Lvl 1' :
                                       notif.action === 'APPROVE_FINAL' ? 'Dokumen Terkunci' :
                                       notif.action === 'UPDATE_DOCUMENT' ? 'Perbarui Dokumen' :
                                       notif.action === 'VIEW_DOCUMENT' ? 'Lihat Dokumen' :
                                       notif.action === 'DOWNLOAD_DOCUMENT' ? 'Unduh Dokumen' :
                                       notif.action.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c: string) => c.toUpperCase())}
                                    </span>
                                    <span className="text-[9px] text-muted-foreground font-bold uppercase">
                                      {new Date(notif.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                  </div>
                                  <p className="text-xs font-medium text-foreground/80 leading-relaxed">
                                    {notif.details}
                                  </p>
                                  <div className="flex items-center gap-2 mt-1">
                                    <div className="h-4 w-4 rounded-full bg-accent/10 flex items-center justify-center text-[8px] font-bold text-accent">
                                      {notif.user?.firstName?.[0] || 'S'}
                                    </div>
                                    <span className="text-[10px] text-muted-foreground font-semibold">
                                      {notif.user ? `${notif.user.firstName} ${notif.user.lastName}` : 'System'}
                                    </span>
                                  </div>
                                </Link>
                              ))}
                            </div>
                          )}
                        </div>
                        
                        {(user?.role === 'ADMIN' || user?.role === 'AUDITOR') && (
                          <Link 
                            href="/admin/logs"
                            onClick={() => setNotificationsOpen(false)}
                            className="block w-full py-3 text-center text-[10px] font-bold text-accent bg-muted/20 hover:bg-muted/40 transition-colors uppercase tracking-[0.2em] border-t border-border"
                          >
                            Lihat Semua Log Audit
                          </Link>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

              </>
            )}
            

          </div>
        </header>

        {/* Scrollable Content */}
        <main className="flex-1 overflow-y-auto bg-background custom-scrollbar">
          <div className="p-4 sm:p-6 lg:p-6 max-w-full mx-auto min-h-[calc(100vh-160px)] animate-in fade-in duration-500">
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
      {/* Floating Label for Mini Sidebar */}
      <AnimatePresence>
        {!sidebarOpen && !mobileSidebarOpen && hoveredItem && (
          <motion.div
            initial={{ opacity: 0, x: -10, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: -10, scale: 0.95 }}
            transition={{ type: 'spring', damping: 20, stiffness: 300 }}
            className="fixed left-24 z-[100] pointer-events-none"
            style={{ top: hoverPos, translateY: '-50%' }}
          >
            <div className="flex items-center">
              <div className="h-8 w-1.5 bg-accent rounded-full shadow-[0_0_15px_rgba(188,38,24,0.5)] mr-3" />
              <div className="px-4 py-2.5 bg-background/90 backdrop-blur-xl border border-border shadow-2xl rounded-2xl">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground whitespace-nowrap">
                  {hoveredItem}
                </span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
