import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useCreateDocument } from '@/hooks/use-documents'
import { auth } from '@/lib/auth'
import { useState, useEffect } from 'react'
import { FileUpload } from '@/components/file-upload'

export const Route = createFileRoute('/documents/new')({
  component: NewDocumentPage,
})

function NewDocumentPage() {
  const navigate = useNavigate()
  const createDoc = useCreateDocument()
  const [error, setError] = useState('')

  useEffect(() => {
    if (!auth.isAuthenticated()) navigate({ to: '/login' })
  }, [navigate])

  const [form, setForm] = useState({
    title: '',
    notes: '',
  })

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

    if (!files.po_file) {
      setError('File Purchase Order (PO) wajib diunggah sesuai ketentuan hukum.')
      return
    }

    const user = auth.getUser()

    const formData = new FormData()
    formData.append('title', form.title)
    formData.append('notes', form.notes)
    formData.append('uploader_id', user?.id || '')
    
    // Append files
    if (files.po_file) formData.append('po_file', files.po_file)
    if (files.invoice_file) formData.append('invoice_file', files.invoice_file)
    if (files.packing_list_file) formData.append('packing_list_file', files.packing_list_file)
    if (files.peb_file) formData.append('peb_file', files.peb_file)
    if (files.bl_file) formData.append('bl_file', files.bl_file)
    if (files.other_file) formData.append('other_file', files.other_file)

    try {
      await createDoc.mutateAsync(formData)
      navigate({ to: '/documents' })
    } catch (err: any) {
      setError(err?.response?.data?.error?.message || 'Gagal menyimpan dokumen.')
    }
  }

  const inputClass = "w-full rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] px-3.5 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)] transition-colors"
  const fileInputClass = "block w-full text-sm text-[var(--text-secondary)] file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-[var(--accent)]/10 file:text-[var(--accent)] hover:file:bg-[var(--accent)]/20 cursor-pointer"

  return (
    <div className="max-w-3xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="mb-8">
        <button onClick={() => navigate({ to: '/documents' })} className="text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors mb-4 inline-flex items-center gap-1">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" /></svg>
          Kembali
        </button>
        <h1 className="text-2xl font-bold tracking-tight">Upload Dokumen Ekspor</h1>
        <p className="text-sm text-[var(--text-secondary)] mt-1">Unggah PO beserta dokumen pendukung lainnya</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="rounded-lg bg-[var(--danger)]/10 border border-[var(--danger)]/30 px-4 py-3 text-sm text-[var(--danger)]">
            {error}
          </div>
        )}

        {/* Title */}
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] p-5 space-y-4">
          <h2 className="text-sm font-semibold flex items-center gap-2">
            <svg className="w-4 h-4 text-[var(--accent)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" /></svg>
            Informasi Dokumen
          </h2>

          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">Judul / Deskripsi Pengiriman</label>
            <input type="text" required value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} className={inputClass} placeholder="Misal: Ekspor Semen Tonasa ke Vietnam - April 2026" />
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">Catatan / Keterangan (Opsional)</label>
            <textarea 
              value={form.notes} 
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} 
              className={inputClass} 
              placeholder="Tambahkan catatan internal untuk peninjau jika diperlukan..."
              rows={3}
            />
          </div>
        </div>

        {/* PO (Mandatory) */}
        <div className="rounded-xl border-2 border-[var(--accent)]/30 bg-[var(--accent)]/5 p-5 space-y-4">
          <h2 className="text-sm font-semibold flex items-center gap-2">
            <span className="inline-flex items-center justify-center w-5 h-5 rounded bg-[var(--accent)] text-white text-[10px] font-bold">!</span>
            File Purchase Order (PO) — Wajib
          </h2>
          <div>
            <FileUpload 
              accept=".pdf,.doc,.docx" 
              required 
              onChange={handleFileValueChange('po_file')} 
              currentFile={files.po_file}
              label="Pilih atau drop file PO (PDF/Word)"
            />
          </div>
        </div>

        {/* Optional Documents */}
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] p-5 space-y-4">
          <h2 className="text-sm font-semibold text-[var(--text-secondary)]">Dokumen Pendukung (Opsional)</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">File Invoice</label>
              <FileUpload 
                accept=".pdf,.doc,.docx" 
                onChange={handleFileValueChange('invoice_file')} 
                currentFile={files.invoice_file}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">File Packing List</label>
              <FileUpload 
                accept=".pdf,.doc,.docx" 
                onChange={handleFileValueChange('packing_list_file')} 
                currentFile={files.packing_list_file}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">File PEB</label>
              <FileUpload 
                accept=".pdf,.doc,.docx" 
                onChange={handleFileValueChange('peb_file')} 
                currentFile={files.peb_file}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">File Bill of Lading (B/L)</label>
              <FileUpload 
                accept=".pdf,.doc,.docx" 
                onChange={handleFileValueChange('bl_file')} 
                currentFile={files.bl_file}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">Dokumen Lainnya</label>
            <FileUpload 
              accept=".pdf,.doc,.docx" 
              onChange={handleFileValueChange('other_file')} 
              currentFile={files.other_file}
            />
          </div>
        </div>

        {/* Submit */}
        <div className="flex gap-3">
          <button type="submit" disabled={createDoc.isPending} className="flex-1 rounded-lg bg-[var(--accent)] px-4 py-3 text-sm font-semibold text-white hover:bg-[var(--accent-hover)] disabled:opacity-50 transition-all shadow-lg shadow-[var(--accent)]/25">
            {createDoc.isPending ? 'Menyimpan...' : 'Simpan Dokumen'}
          </button>
          <button type="button" onClick={() => navigate({ to: '/documents' })} className="rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] px-6 py-3 text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all">
            Batal
          </button>
        </div>
      </form>
    </div>
  )
}
