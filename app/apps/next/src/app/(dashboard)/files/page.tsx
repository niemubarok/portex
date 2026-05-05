'use client'

import { useState, useMemo, Suspense } from 'react'
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

  const sortedDocuments = useMemo(() => {
    if (!documents) return []
    const sorted = [...documents]
    sorted.sort((a, b) => {
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
    return sorted
  }, [documents, sortMode, sortDir])

  const openFolder = sortedDocuments.find(d => d.id === openFolderId)
  const openFolderFiles = openFolder ? getFilesFromDocument(openFolder) : []

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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          {openFolderId && (
            <button
              onClick={() => setOpenFolderId(null)}
              className="p-2 -ml-2 rounded-xl hover:bg-[var(--bg-hover)] transition-colors"
            >
              <ArrowLeft size={20} />
            </button>
          )}
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
              {openFolderId ? openFolder?.title : 'Berkas Saya'}
            </h1>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">
              {openFolderId
                ? `${openFolderFiles.length} berkas`
                : `${sortedDocuments.length} folder · ${totalFiles} berkas`}
            </p>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2">
          {/* Sort Buttons */}
          <div className="flex items-center bg-[var(--bg-secondary)] rounded-xl border border-[var(--border)] p-0.5 gap-0.5">
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
          </div>

          {/* View Toggle */}
          <div className="flex items-center bg-[var(--bg-secondary)] rounded-xl border border-[var(--border)] p-0.5 gap-0.5">
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
      </div>

      {/* Breadcrumb */}
      {openFolderId && openFolder && (
        <div className="flex items-center gap-1.5 text-xs text-[var(--text-muted)] mb-5 px-1">
          <button onClick={() => setOpenFolderId(null)} className="hover:text-[var(--accent)] transition-colors font-medium">
            Berkas Saya
          </button>
          <ChevronRight size={12} />
          <span className="text-[var(--text-primary)] font-bold truncate">{openFolder.title}</span>
        </div>
      )}

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
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                {sortedDocuments.map((doc, idx) => {
                  const files = getFilesFromDocument(doc)
                  return (
                    <motion.button
                      key={doc.id}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: idx * 0.03, duration: 0.2 }}
                      onClick={() => setOpenFolderId(doc.id)}
                      className="group relative flex flex-col items-center p-4 sm:p-5 rounded-2xl bg-[var(--bg-primary)] hover:bg-[var(--bg-hover)] hover:shadow-lg hover:shadow-[var(--accent)]/5 transition-all duration-200 text-center cursor-pointer"
                    >
                      <div className="relative mb-3">
                        <Folder
                          size={48}
                          className="text-[var(--accent)] group-hover:scale-110 transition-transform duration-200"
                          strokeWidth={1.2}
                          fill="var(--accent)"
                          fillOpacity={0.1}
                        />
                        <span className="absolute -bottom-1 -right-1 text-[9px] font-black bg-[var(--accent)] text-white rounded-full w-5 h-5 flex items-center justify-center shadow-sm">
                          {files.length}
                        </span>
                      </div>
                      <p className="text-xs font-bold truncate w-full leading-snug">{doc.title}</p>
                      <p className="text-[10px] text-[var(--text-muted)] mt-1 truncate w-full">
                        {new Date(doc.createdAt).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </p>
                      <div className="mt-2">
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
                              <Folder size={20} className="text-[var(--accent)] shrink-0 group-hover:scale-110 transition-transform" strokeWidth={1.5} fill="var(--accent)" fillOpacity={0.1} />
                              <span className="font-bold truncate">{doc.title}</span>
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
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                {openFolderFiles.map((file, idx) => {
                  const config = FILE_TYPE_CONFIG[file.type]
                  const Icon = file.icon
                  return (
                    <motion.div
                      key={file.type}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: idx * 0.05, duration: 0.2 }}
                      className="group relative flex flex-col items-center p-5 rounded-2xl bg-[var(--bg-primary)] hover:bg-[var(--bg-hover)] hover:shadow-lg transition-all duration-200 cursor-pointer"
                      onClick={() => openFolder && setSelectedDoc(openFolder)}
                    >
                      {/* File icon with colored accent */}
                      <div
                        className="w-14 h-14 rounded-2xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform duration-200"
                        style={{ backgroundColor: `color-mix(in srgb, ${file.color} 12%, transparent)` }}
                      >
                        <Icon size={28} style={{ color: file.color }} strokeWidth={1.5} />
                      </div>
                      <p className="text-xs font-bold truncate w-full text-center">{file.label}</p>
                      <p className="text-[10px] text-[var(--text-muted)] truncate w-full text-center mt-0.5">{file.name}</p>
                      <p className="text-[10px] text-[var(--text-muted)] mt-1.5 font-medium">{formatFileSize(config?.sizeEstimate || 150)}</p>

                      {/* Hover overlay */}
                      <div className="absolute inset-0 rounded-2xl bg-black/0 group-hover:bg-black/[0.02] dark:group-hover:bg-white/[0.02] transition-colors" />
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
                    {openFolderFiles.map((file, idx) => {
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
                              <div
                                className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                                style={{ backgroundColor: `color-mix(in srgb, ${file.color} 12%, transparent)` }}
                              >
                                <Icon size={16} style={{ color: file.color }} strokeWidth={2} />
                              </div>
                              <div className="min-w-0">
                                <p className="font-bold text-xs truncate">{file.name}</p>
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
