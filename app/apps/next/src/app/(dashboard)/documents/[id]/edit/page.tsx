'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { useDocument, useUpdateDocument, useDownloadDocument } from '@/hooks/use-documents'
import { auth } from '@/lib/auth'
import { FileUpload } from '@/components/file-upload'

function FilePreview({ path, docId, type, downloadMutation }: { path?: string; docId: string; type: string; downloadMutation: any }) {
  const [isDownloading, setIsDownloading] = useState(false)
  if (!path) return null;
  const fileName = path.split('/').pop() || path;

  const handleDownload = async () => {
    setIsDownloading(true)
    try {
      await downloadMutation.mutateAsync({ id: docId, type })
    } finally {
      setIsDownloading(false)
    }
  }

  return (
    <div className="mt-2 p-2.5 rounded bg-background border border-border flex items-center justify-between text-xs">
      <div className="flex items-center gap-2 truncate">
        <svg className="w-4 h-4 text-accent shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" /></svg>
        <span className="truncate text-secondary-foreground" title={fileName}>{fileName}</span>
      </div>
      <button 
        type="button"
        onClick={handleDownload}
        disabled={isDownloading}
        className="text-accent hover:underline shrink-0 ml-2 font-medium disabled:opacity-50"
      >
        {isDownloading ? 'Downloading...' : 'Lihat/Download'}
      </button>
    </div>
  )
}

export default function EditDocumentPage() {
  const params = useParams()
  const id = params.id as string
  const router = useRouter()
  const { data: document, isLoading } = useDocument(id)
  const updateDoc = useUpdateDocument()
  const downloadDoc = useDownloadDocument()
  const [error, setError] = useState('')

  useEffect(() => {
    if (!auth.isAuthenticated()) router.push('/login')
  }, [router])

  const [form, setForm] = useState({
    title: '',
    notes: '',
  })

  useEffect(() => {
    if (document) {
      const user = auth.getUser()
      const isOwner = String(document.uploaderId) === user?.id

      if (document.status !== 'Draft' || !isOwner) {
        router.push('/documents')
      }
      setForm({
        title: document.title,
        notes: document.notes || '',
      })
    }
  }, [document, router])

  const [files, setFiles] = useState<{
    po_file: File | null;
    invoice_file: File | null;
    packing_list_file: File | null;
    peb_file: File | null;
    bl_file: File | null;
    other_file: File | null;
  }>({
    po_file: null,
    invoice_file: null,
    packing_list_file: null,
    peb_file: null,
    bl_file: null,
    other_file: null,
  })

  const handleFileValueChange = (field: keyof typeof files) => (file: File | null) => {
    setFiles(prev => ({ ...prev, [field]: file }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    const formData = new FormData()
    formData.append('title', form.title)
    formData.append('notes', form.notes)
    
    // Append files
    if (files.po_file) formData.append('po_file', files.po_file)
    if (files.invoice_file) formData.append('invoice_file', files.invoice_file)
    if (files.packing_list_file) formData.append('packing_list_file', files.packing_list_file)
    if (files.peb_file) formData.append('peb_file', files.peb_file)
    if (files.bl_file) formData.append('bl_file', files.bl_file)
    if (files.other_file) formData.append('other_file', files.other_file)

    try {
      await updateDoc.mutateAsync({ id, data: formData })
      router.push('/documents')
    } catch (err: any) {
      setError(err?.response?.data?.error?.message || 'Gagal mengubah dokumen.')
    }
  }

  if (isLoading) {
    return <div className="p-8 text-center text-muted-foreground">Loading...</div>
  }

  const inputClass = "w-full rounded-lg border border-border bg-background px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent transition-colors"

  return (
    <div className="max-w-3xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="mb-8">
        <Link href="/documents" className="text-sm text-muted-foreground hover:text-foreground transition-colors mb-4 inline-flex items-center gap-1">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" /></svg>
          Kembali
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">Edit Dokumen (Draf)</h1>
        <p className="text-sm text-muted-foreground mt-1">Ubah atau lengkapi dokumen yang masih berbentuk draft</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="rounded-lg bg-destructive/10 border border-destructive/30 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {/* Title */}
        <div className="rounded-xl border border-border bg-muted/50 p-5 space-y-4">
          <h2 className="text-sm font-semibold flex items-center gap-2">
            <svg className="w-4 h-4 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" /></svg>
            Informasi Dokumen
          </h2>

          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">Judul / Deskripsi Pengiriman</label>
            <input type="text" required value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} className={inputClass} />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">Catatan / Keterangan (Opsional)</label>
            <textarea 
              value={form.notes} 
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} 
              className={inputClass} 
              rows={3}
            />
          </div>
        </div>

        {/* PO */}
        <div className="rounded-xl border border-border bg-muted/50 p-5 space-y-4">
          <h2 className="text-sm font-semibold">Purchase Order (PO)</h2>
          <div>
            <FileUpload 
              accept=".pdf,.doc,.docx" 
              onChange={handleFileValueChange('po_file')} 
              currentFile={files.po_file}
              existingPath={document?.poPath}
              label="Pilih atau drop file PO baru"
            />
            <FilePreview path={document?.poPath} docId={id} type="po" downloadMutation={downloadDoc} />
          </div>
        </div>

        {/* Optional Documents */}
        <div className="rounded-xl border border-border bg-muted/50 p-5 space-y-4">
          <h2 className="text-sm font-semibold text-muted-foreground">Dokumen Pendukung</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">File Invoice</label>
              <FileUpload 
                accept=".pdf,.doc,.docx" 
                onChange={handleFileValueChange('invoice_file')} 
                 currentFile={files.invoice_file}
                existingPath={document?.invoicePath}
              />
              <FilePreview path={document?.invoicePath} docId={id} type="invoice" downloadMutation={downloadDoc} />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">File Packing List</label>
              <FileUpload 
                accept=".pdf,.doc,.docx" 
                onChange={handleFileValueChange('packing_list_file')} 
                currentFile={files.packing_list_file}
                existingPath={document?.packingListPath}
              />
              <FilePreview path={document?.packingListPath} docId={id} type="packing_list" downloadMutation={downloadDoc} />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">File PEB</label>
              <FileUpload 
                accept=".pdf,.doc,.docx" 
                onChange={handleFileValueChange('peb_file')} 
                currentFile={files.peb_file}
                existingPath={document?.pebPath}
              />
              <FilePreview path={document?.pebPath} docId={id} type="peb" downloadMutation={downloadDoc} />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">File Bill of Lading (B/L)</label>
              <FileUpload 
                accept=".pdf,.doc,.docx" 
                onChange={handleFileValueChange('bl_file')} 
                currentFile={files.bl_file}
                existingPath={document?.blPath}
              />
              <FilePreview path={document?.blPath} docId={id} type="bl" downloadMutation={downloadDoc} />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">Dokumen Lainnya</label>
            <FileUpload 
              accept=".pdf,.doc,.docx" 
              onChange={handleFileValueChange('other_file')} 
              currentFile={files.other_file}
              existingPath={document?.otherPath}
            />
            <FilePreview path={document?.otherPath} docId={id} type="other" downloadMutation={downloadDoc} />
          </div>
        </div>

        {/* Submit */}
        <div className="flex gap-3">
          <button type="submit" disabled={updateDoc.isPending} className="flex-1 rounded-lg bg-accent px-4 py-3 text-sm font-semibold text-white hover:bg-accent-hover disabled:opacity-50 transition-all shadow-lg shadow-accent/25">
            {updateDoc.isPending ? 'Menyimpan...' : 'Simpan Perubahan'}
          </button>
        </div>
      </form>
    </div>
  )
}
