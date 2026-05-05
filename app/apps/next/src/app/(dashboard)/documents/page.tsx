'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useDocuments, useDeleteDocument, useApproveDocument, Document } from '@/hooks/use-documents'
import { auth } from '@/lib/auth'
import { ConfirmationModal, ConfirmationType } from '@/components/confirmation-modal'
import { StatusBadge } from '@/components/status-badge'
import { DocumentDetailModal } from '@/components/document-detail-modal'
import { Search, Filter, Plus, FileText, Trash2, Edit3, Eye } from 'lucide-react'

function DocumentsContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const q = searchParams.get('q') || undefined
  const status = searchParams.get('status') || undefined

  const { data: documents, isLoading } = useDocuments({ 
    q: q,
    status: status
  })

  const deleteDoc = useDeleteDocument()
  const approveDoc = useApproveDocument()
  const user = auth.getUser()

  useEffect(() => {
    if (!auth.isAuthenticated()) router.push('/login')
  }, [router])

  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null)
  
  const [confirmState, setConfirmState] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    type: ConfirmationType;
    confirmText?: string;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
    type: 'question',
  })

  const closeConfirm = () => setConfirmState(prev => ({ ...prev, isOpen: false }))

  const handleDelete = async (id: string, title: string) => {
    setConfirmState({
      isOpen: true,
      title: 'Hapus Dokumen',
      message: `Apakah Anda yakin ingin menghapus dokumen "${title}"? Tindakan ini tidak dapat dibatalkan.`,
      type: 'danger',
      confirmText: 'Ya, Hapus',
      onConfirm: () => {
        deleteDoc.mutate(id)
        closeConfirm()
      }
    })
  }

  return (
    <div className="max-w-full mx-auto px-0 py-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dokumen Ekspor</h1>
          <p className="text-sm text-muted-foreground mt-1">Kelola semua dokumen kepatuhan ekspor</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          {user?.role !== 'MANAGER' && user?.role !== 'AUDITOR' && (
            <Link href="/documents/new" className="inline-flex items-center gap-2 rounded-xl bg-accent px-5 py-2.5 text-sm font-bold text-white hover:bg-accent-hover transition-all shadow-lg shadow-accent/20 hover:-translate-y-0.5 active:translate-y-0">
              <Plus size={18} />
              Upload
            </Link>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border bg-muted/50 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <svg className="animate-spin h-6 w-6 text-accent" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25"/><path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" className="opacity-75"/></svg>
          </div>
        ) : !documents || documents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <svg className="w-16 h-16 mb-4 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" /></svg>
            <p className="text-base font-medium mb-1">Belum ada dokumen</p>
            <p className="text-sm">Klik tombol "Upload Dokumen" untuk memulai</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted-foreground text-xs uppercase tracking-wider border-b border-border">
                  <th className="px-5 py-2 font-medium">Judul Dokumen</th>
                  <th className="px-5 py-2 font-medium">PO</th>
                  <th className="px-5 py-2 font-medium">Status</th>
                  <th className="px-5 py-2 font-medium">Tanggal Upload</th>
                  <th className="px-5 py-2 font-medium text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {documents.map((doc) => (
                  <tr key={doc.id} className="hover:bg-muted/50 transition-colors">
                    <td className="px-5 py-2.5">
                      <p className="font-medium text-foreground">{doc.title}</p>
                    </td>
                    <td className="px-5 py-2.5">
                      {doc.poPath ? (
                        <span className="text-success text-xs font-medium">✓ Ada</span>
                      ) : (
                        <span className="text-destructive text-xs font-medium">✗ Belum</span>
                      )}
                    </td>
                    <td className="px-5 py-2.5"><StatusBadge status={doc.status} /></td>
                    <td className="px-5 py-2.5 text-muted-foreground">
                      <div className="flex flex-col">
                        <span>{new Date(doc.createdAt).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                        <span className="text-[10px] opacity-60">{new Date(doc.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </td>
                    <td className="px-5 py-2.5 text-right flex justify-end gap-2">
                        <button
                          onClick={() => { setSelectedDoc(doc) }}
                          className="text-muted-foreground hover:text-accent transition-colors p-2 rounded-lg hover:bg-accent/10"
                          title="Lihat Detail"
                        >
                          <Eye size={18} />
                        </button>
                        {(doc.status === 'Draft' && (user?.role === 'ADMIN' || doc.uploaderId === user?.id)) && (
                          <Link
                            href={`/documents/${doc.id}/edit`}
                            className="text-muted-foreground hover:text-warning transition-colors p-2 rounded-lg hover:bg-warning/10"
                            title="Edit"
                          >
                            <Edit3 size={18} />
                          </Link>
                        )}

                      {(doc.status === 'Draft' && (user?.role === 'ADMIN' || doc.uploaderId === user?.id)) && (
                        <button
                          onClick={() => handleDelete(doc.id, doc.title)}
                          className="text-muted-foreground hover:text-destructive transition-colors p-2 rounded-lg hover:bg-destructive/10"
                          title="Hapus"
                        >
                          <Trash2 size={18} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <DocumentDetailModal document={selectedDoc} onClose={() => setSelectedDoc(null)} />

      {/* Confirmation Modal for Delete */}
      <ConfirmationModal 
        isOpen={confirmState.isOpen}
        title={confirmState.title}
        message={confirmState.message}
        type={confirmState.type}
        confirmText={confirmState.confirmText}
        onClose={closeConfirm}
        onConfirm={confirmState.onConfirm}
        isLoading={deleteDoc.isPending || approveDoc.isPending}
      />
    </div>
  )
}

export default function DocumentsPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="h-8 w-8 border-4 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <DocumentsContent />
    </Suspense>
  )
}
