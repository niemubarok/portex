'use client'

import { useState, useMemo, useEffect, useRef, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { useDocuments, Document } from '@/hooks/use-documents'
import { StatusBadge } from '@/components/status-badge'
import { DocumentDetailModal } from '@/components/document-detail-modal'
import {
  Folder,
  FileText,
  ChevronRight,
  ArrowLeft,
  Grid3X3,
  List,
  SortAsc,
  SortDesc,
  Clock,
  HardDrive,
  ArrowDownAZ,
  LayoutGrid,
  File,
  FileCheck2,
  FileSpreadsheet,
  FileBadge,
  Ship,
  MoreHorizontal,
  Eye,
  Download,
  FolderOpen,
  CalendarDays,
  ChevronDown,
  Filter,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

type SortMode = 'time' | 'size' | 'az'
type SortDir = 'asc' | 'desc'
type ViewMode = 'grid' | 'list'

interface FileItem {
  name: string
  type: string
  label: string
  path: string
  icon: any
  color: string
}

const FILE_TYPE_CONFIG: Record<string, { label: string; icon: any; color: string; sizeEstimate: number }> = {
  po: { label: 'Purchase Order', icon: FileText, color: 'var(--accent)', sizeEstimate: 245 },
  invoice: { label: 'Invoice', icon: FileSpreadsheet, color: 'var(--info)', sizeEstimate: 180 },
  packing_list: { label: 'Packing List', icon: FileCheck2, color: 'var(--success)', sizeEstimate: 120 },
  peb: { label: 'PEB', icon: FileBadge, color: 'var(--warning)', sizeEstimate: 310 },
  bl: { label: 'Bill of Lading', icon: Ship, color: '#8b5cf6', sizeEstimate: 200 },
  other: { label: 'Lainnya', icon: File, color: 'var(--text-muted)', sizeEstimate: 150 },
}

function getFilesFromDocument(doc: Document): FileItem[] {
  const files: FileItem[] = []
  const pathMap: [string, string | undefined][] = [
    ['po', doc.poPath],
    ['invoice', doc.invoicePath],
    ['packing_list', doc.packingListPath],
    ['peb', doc.pebPath],
    ['bl', doc.blPath],
    ['other', doc.otherPath],
  ]
  for (const [type, path] of pathMap) {
    if (path) {
      const config = FILE_TYPE_CONFIG[type]
      files.push({
        name: path.split('/').pop() || `${type}.pdf`,
        type,
        label: config.label,
        path,
        icon: config.icon,
        color: config.color,
      })
    }
  }
  return files
}

function formatFileSize(kb: number) {
  if (kb >= 1024) return `${(kb / 1024).toFixed(1)} MB`
  return `${kb} KB`
}

function FilesContent() {
  const searchParams = useSearchParams()
  const q = searchParams.get('q') || undefined
  const { data: documents, isLoading } = useDocuments({ q })

  const [openFolderId, setOpenFolderId] = useState<string | null>(null)
  const [sortMode, setSortMode] = useState<SortMode>('time')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null)
  const [contextMenu, setContextMenu] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false)
  const statusRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (statusRef.current && !statusRef.current.contains(e.target as Node)) {
        setStatusDropdownOpen(false)
      }
    }
    if (statusDropdownOpen) document.addEventListener('click', handleClick)
    return () => document.removeEventListener('click', handleClick)
  }, [statusDropdownOpen])

  const sortedDocuments = useMemo(() => {
    if (!documents) return []
    let filtered = [...documents]
    if (statusFilter) {
      filtered = filtered.filter(d => d.status === statusFilter)
    }
    filtered.sort((a, b) => {
      let cmp = 0
      switch (sortMode) {
        case 'time':
          cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          break
        case 'size': {
          const aFiles = getFilesFromDocument(a).length
          const bFiles = getFilesFromDocument(b).length
          cmp = aFiles - bFiles
          break
        }
        case 'az':
          cmp = a.title.localeCompare(b.title, 'id')
          break
      }
      return sortDir === 'asc' ? cmp : -cmp
    })
    return filtered
  }, [documents, sortMode, sortDir, statusFilter])

  const openFolder = sortedDocuments.find(d => d.id === openFolderId)
  const openFolderFiles = openFolder ? getFilesFromDocument(openFolder) : []

  const processedOpenFolderFiles = useMemo(() => {
    let files = [...openFolderFiles]
    
    if (q) {
      const lowerQ = q.toLowerCase()
      files = files.filter(f => 
        f.name.toLowerCase().includes(lowerQ) || 
        f.label.toLowerCase().includes(lowerQ) ||
        f.type.toLowerCase().includes(lowerQ)
      )
    }

    files.sort((a, b) => {
      let cmp = 0
      switch (sortMode) {
        case 'time':
          // File creation time is not available in FileItem, maintain original order
          cmp = 0
          break
        case 'size': {
          const aSize = FILE_TYPE_CONFIG[a.type]?.sizeEstimate || 150
          const bSize = FILE_TYPE_CONFIG[b.type]?.sizeEstimate || 150
          cmp = aSize - bSize
          break
        }
        case 'az':
          cmp = a.name.localeCompare(b.name, 'id')
          break
      }
      return sortDir === 'asc' ? cmp : -cmp
    })

    return files
  }, [openFolderFiles, q, sortMode, sortDir])

  const totalFiles = useMemo(() => {
    if (!documents) return 0
    return documents.reduce((acc, doc) => acc + getFilesFromDocument(doc).length, 0)
  }, [documents])

  const toggleSort = (mode: SortMode) => {
    if (sortMode === mode) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortMode(mode)
      setSortDir(mode === 'az' ? 'asc' : 'desc')
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 border-[3px] border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-bold uppercase tracking-widest text-[var(--text-muted)]">Memuat berkas...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-full mx-auto py-6 sm:py-8">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 mb-5">
        <div className="min-w-0">
          {openFolderId ? (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setOpenFolderId(null)}
                className="p-1.5 -ml-1 rounded-lg hover:bg-[var(--bg-hover)] transition-colors shrink-0"
              >
                <ArrowLeft size={18} />
              </button>
              <div className="min-w-0">
                <h1 className="hidden md:block text-xl font-bold tracking-tight truncate">{openFolder?.title}</h1>
                <span className="md:hidden text-sm font-bold truncate block">{openFolder?.title}</span>
                <p className="hidden md:block text-[10px] text-[var(--text-muted)] font-medium">{processedOpenFolderFiles.length} berkas</p>
              </div>
            </div>
          ) : (
            <div>
              <h1 className="hidden md:block text-xl font-bold tracking-tight">Berkas Saya</h1>
              <p className="hidden md:block text-xs text-[var(--text-muted)] font-medium">
                {sortedDocuments.length} folder · {totalFiles} berkas
              </p>
            </div>
          )}
        </div>

        {/* Controls - unified bar */}
        <div className="flex items-center bg-[var(--bg-secondary)] rounded-xl border border-[var(--border)] p-0.5 gap-0.5">
          {/* Status Dropdown */}
          <div className="relative" ref={statusRef}>
            <button
              onClick={() => setStatusDropdownOpen(!statusDropdownOpen)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${
                statusFilter
                  ? 'bg-[var(--accent)] text-white shadow-lg shadow-[var(--accent)]/20'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]'
              }`}
            >
              <Filter size={14} />
              <span className="hidden sm:inline">{statusFilter ? ({ Draft: 'Draf', Approved: 'Disetujui', Locked: 'Terkunci', Rejected: 'Ditolak' } as Record<string,string>)[statusFilter] || statusFilter : 'Status'}</span>
              <ChevronDown size={12} className={`transition-transform ${statusDropdownOpen ? 'rotate-180' : ''}`} />
            </button>
            {statusDropdownOpen && (
              <div className="absolute top-full left-0 mt-2 w-40 bg-[var(--bg-primary)] border border-[var(--border)] rounded-xl shadow-2xl z-50 py-1.5 animate-in slide-in-from-top-2 duration-200">
                {[
                  { value: '', label: 'Semua Status' },
                  { value: 'Draft', label: 'Draf' },
                  { value: 'Approved', label: 'Disetujui' },
                  { value: 'Locked', label: 'Terkunci' },
                  { value: 'Rejected', label: 'Ditolak' },
                ].map(({ value, label }) => (
                  <button
                    key={value}
                    onClick={() => { setStatusFilter(value); setStatusDropdownOpen(false) }}
                    className={`w-full text-left px-4 py-2 text-[10px] font-bold uppercase tracking-widest hover:bg-[var(--bg-hover)] transition-colors ${
                      statusFilter === value ? 'text-[var(--accent)] bg-[var(--accent)]/5' : 'text-[var(--text-secondary)]'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="h-5 w-px bg-[var(--border)] mx-0.5" />

          {/* Sort Buttons */}
          {([
            { mode: 'time' as SortMode, icon: Clock, label: 'Waktu' },
            { mode: 'size' as SortMode, icon: HardDrive, label: 'Ukuran' },
            { mode: 'az' as SortMode, icon: ArrowDownAZ, label: 'A-Z' },
          ]).map(({ mode, icon: Icon, label }) => (
            <button
              key={mode}
              onClick={() => toggleSort(mode)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${
                sortMode === mode
                  ? 'bg-[var(--accent)] text-white shadow-lg shadow-[var(--accent)]/20'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]'
              }`}
              title={`Urutkan: ${label}`}
            >
              <Icon size={14} />
              <span className="hidden sm:inline">{label}</span>
              {sortMode === mode && (
                sortDir === 'asc' ? <SortAsc size={12} /> : <SortDesc size={12} />
              )}
            </button>
          ))}

          <div className="h-5 w-px bg-[var(--border)] mx-0.5" />

          {/* View Toggle */}
          <button
            onClick={() => setViewMode('grid')}
            className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-[var(--bg-primary)] text-[var(--text-primary)] shadow-sm' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}
            title="Tampilan Grid"
          >
            <LayoutGrid size={16} />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-[var(--bg-primary)] text-[var(--text-primary)] shadow-sm' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}
            title="Tampilan List"
          >
            <List size={16} />
          </button>
        </div>
      </div>

      {/* Content */}
      <AnimatePresence mode="wait">
        {!openFolderId ? (
          /* === FOLDER VIEW === */
          <motion.div
            key="folders"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            {sortedDocuments.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 text-[var(--text-muted)]">
                <FolderOpen size={56} className="mb-4 opacity-20" strokeWidth={1} />
                <p className="text-base font-medium mb-1">Belum ada berkas</p>
                <p className="text-sm">Upload dokumen terlebih dahulu untuk melihat berkas di sini</p>
              </div>
            ) : viewMode === 'grid' ? (
              /* Grid View - Folders */
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 gap-4">
                {sortedDocuments.map((doc, idx) => {
                  const files = getFilesFromDocument(doc)
                  return (
                    <motion.button
                      key={doc.id}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: idx * 0.03, duration: 0.2 }}
                      onClick={() => setOpenFolderId(doc.id)}
                      className="group flex items-center p-3 gap-3 rounded-xl bg-[var(--bg-primary)] border border-[var(--border)] hover:bg-[var(--bg-hover)] hover:border-[var(--accent)] hover:shadow-sm transition-all duration-200 cursor-pointer text-left"
                    >
                      <div className="shrink-0 flex items-center justify-center w-10 h-10 rounded-lg bg-[var(--bg-secondary)] group-hover:bg-[var(--accent)]/10 transition-colors">
                        <Folder
                          size={20}
                          className="text-[var(--text-secondary)] group-hover:text-[var(--accent)] transition-colors"
                          fill="currentColor"
                          fillOpacity={0.2}
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate leading-tight text-[var(--text-primary)]">{doc.title}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <p className="text-[10px] text-[var(--text-muted)] truncate">
                            {new Date(doc.createdAt).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </p>
                          <span className="w-1 h-1 rounded-full bg-[var(--border)]" />
                          <p className="text-[10px] text-[var(--text-muted)] truncate">{files.length} item</p>
                        </div>
                      </div>
                      <div className="shrink-0 scale-75 origin-right">
                        <StatusBadge status={doc.status} />
                      </div>
                    </motion.button>
                  )
                })}
              </div>
            ) : (
              /* List View - Folders */
              <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-primary)] overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-[var(--text-muted)] text-[10px] uppercase tracking-widest border-b border-[var(--border)] bg-[var(--bg-secondary)]">
                      <th className="px-5 py-3 font-bold">Nama Folder</th>
                      <th className="px-5 py-3 font-bold hidden sm:table-cell">Berkas</th>
                      <th className="px-5 py-3 font-bold hidden md:table-cell">Status</th>
                      <th className="px-5 py-3 font-bold hidden lg:table-cell">Tanggal</th>
                      <th className="px-5 py-3 font-bold text-right">Ukuran</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border)]">
                    {sortedDocuments.map((doc, idx) => {
                      const files = getFilesFromDocument(doc)
                      const totalSize = files.reduce((acc, f) => acc + (FILE_TYPE_CONFIG[f.type]?.sizeEstimate || 150), 0)
                      return (
                        <motion.tr
                          key={doc.id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: idx * 0.02 }}
                          onClick={() => setOpenFolderId(doc.id)}
                          className="hover:bg-[var(--bg-hover)] cursor-pointer transition-colors group"
                        >
                          <td className="px-5 py-3">
                            <div className="flex items-center gap-3">
                              <Folder size={20} className="text-[var(--text-secondary)] shrink-0 group-hover:text-[var(--text-primary)] transition-colors" strokeWidth={1.5} fill="currentColor" fillOpacity={0.2} />
                              <span className="font-medium text-sm truncate">{doc.title}</span>
                            </div>
                          </td>
                          <td className="px-5 py-3 hidden sm:table-cell">
                            <span className="text-xs text-[var(--text-muted)]">{files.length} berkas</span>
                          </td>
                          <td className="px-5 py-3 hidden md:table-cell"><StatusBadge status={doc.status} /></td>
                          <td className="px-5 py-3 hidden lg:table-cell text-[var(--text-muted)] text-xs">
                            {new Date(doc.createdAt).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </td>
                          <td className="px-5 py-3 text-right text-xs text-[var(--text-muted)]">
                            {formatFileSize(totalSize)}
                          </td>
                        </motion.tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </motion.div>
        ) : (
          /* === FILE VIEW (inside a folder) === */
          <motion.div
            key="files"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            {viewMode === 'grid' ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {processedOpenFolderFiles.length === 0 ? (
                  <div className="col-span-full flex flex-col items-center justify-center py-12 text-[var(--text-muted)]">
                    <p className="text-sm font-medium">Tidak ada berkas yang cocok dengan filter</p>
                  </div>
                ) : processedOpenFolderFiles.map((file, idx) => {
                  const config = FILE_TYPE_CONFIG[file.type]
                  const Icon = file.icon
                  return (
                    <motion.div
                      key={file.type}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: idx * 0.05, duration: 0.2 }}
                      className="group flex flex-col rounded-xl bg-[var(--bg-primary)] hover:bg-[var(--bg-hover)] border border-[var(--border)] overflow-hidden cursor-pointer shadow-sm hover:shadow-md transition-all duration-200"
                      onClick={() => openFolder && setSelectedDoc(openFolder)}
                    >
                      {/* Top preview area */}
                      <div className="bg-[var(--bg-secondary)] h-32 flex items-center justify-center border-b border-[var(--border)] relative overflow-hidden transition-colors">
                        <Icon size={48} style={{ color: file.color }} strokeWidth={1} className="opacity-50 group-hover:scale-110 transition-transform duration-300" />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 dark:group-hover:bg-white/5 transition-colors duration-300" />
                      </div>
                      
                      {/* Bottom info area */}
                      <div className="p-3 flex items-start gap-3 bg-[var(--bg-primary)]">
                        <div className="shrink-0 mt-0.5">
                          <Icon size={18} style={{ color: file.color }} strokeWidth={2} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate text-[var(--text-primary)]" title={file.name}>{file.name}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <p className="text-[10px] text-[var(--text-muted)] truncate">{file.label}</p>
                            <span className="w-1 h-1 rounded-full bg-[var(--border)]" />
                            <p className="text-[10px] text-[var(--text-muted)] truncate">{formatFileSize(config?.sizeEstimate || 150)}</p>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )
                })}
              </div>
            ) : (
              <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-primary)] overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-[var(--text-muted)] text-[10px] uppercase tracking-widest border-b border-[var(--border)] bg-[var(--bg-secondary)]">
                      <th className="px-5 py-3 font-bold">Nama Berkas</th>
                      <th className="px-5 py-3 font-bold hidden sm:table-cell">Tipe</th>
                      <th className="px-5 py-3 font-bold text-right">Ukuran</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border)]">
                    {processedOpenFolderFiles.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="px-5 py-8 text-center text-sm text-[var(--text-muted)] font-medium">
                          Tidak ada berkas yang cocok dengan filter
                        </td>
                      </tr>
                    ) : processedOpenFolderFiles.map((file, idx) => {
                      const config = FILE_TYPE_CONFIG[file.type]
                      const Icon = file.icon
                      return (
                        <motion.tr
                          key={file.type}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: idx * 0.03 }}
                          onClick={() => openFolder && setSelectedDoc(openFolder)}
                          className="hover:bg-[var(--bg-hover)] cursor-pointer transition-colors group"
                        >
                          <td className="px-5 py-3">
                            <div className="flex items-center gap-3">
                              <div className="shrink-0">
                                <Icon size={20} style={{ color: file.color }} strokeWidth={2} />
                              </div>
                              <div className="min-w-0">
                                <p className="font-medium text-sm truncate">{file.name}</p>
                                <p className="text-[10px] text-[var(--text-muted)]">{file.label}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-3 hidden sm:table-cell">
                            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border border-[var(--border)] bg-[var(--bg-secondary)]">
                              PDF
                            </span>
                          </td>
                          <td className="px-5 py-3 text-right text-xs text-[var(--text-muted)]">
                            {formatFileSize(config?.sizeEstimate || 150)}
                          </td>
                        </motion.tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Document Detail Modal */}
      <DocumentDetailModal document={selectedDoc} onClose={() => setSelectedDoc(null)} />
    </div>
  )
}

export default function FilesPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="h-8 w-8 border-4 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <FilesContent />
    </Suspense>
  )
}
