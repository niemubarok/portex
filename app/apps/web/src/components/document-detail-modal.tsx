import { useState, useEffect } from 'react'
import { Document, useApproveDocument, useDocumentAuditLogs, useDocument, AuditLog } from '@/hooks/use-documents'
import { format } from 'date-fns'
import { id as idLocale } from 'date-fns/locale'
import { auth } from '@/lib/auth'
import { StatusBadge } from './status-badge'
import { ConfirmationModal, ConfirmationType } from './confirmation-modal'
import { api } from '@/lib/api'

interface DocumentDetailModalProps {
  document?: Document | null
  documentId?: string
  onClose: () => void
}

export function DocumentDetailModal({ document: providedDoc, documentId, onClose }: DocumentDetailModalProps) {
  const [managerNotes, setManagerNotes] = useState('')
  const [activePdfUrl, setActivePdfUrl] = useState<string | null>(null)
  const [isLoadingPdf, setIsLoadingPdf] = useState(false)
  const [activePdfType, setActivePdfType] = useState<string>('po')
  
  // If we only have documentId, fetch the full document details
  const { data: fetchedDoc, isLoading: isLoadingDoc } = useDocument(providedDoc ? '' : (documentId || ''))
  const selectedDoc = providedDoc || fetchedDoc

  const approveDoc = useApproveDocument()
  const user = auth.getUser()
  const isManager = user?.role === 'MANAGER' || user?.role === 'ADMIN'
  const [isTimelineOpen, setIsTimelineOpen] = useState(false)
  const { data: auditLogs, isLoading: isLoadingAudit } = useDocumentAuditLogs(selectedDoc?.id)

  const isAdminOrAuditor = user?.role === 'ADMIN' || user?.role === 'AUDITOR'
  const filteredLogs = (auditLogs || [])
    .filter(log => isAdminOrAuditor || !['DOWNLOAD_DOCUMENT', 'TEST_ACTION', 'TEST_FROM_SCRIPT'].includes(log.action))
    .reverse() // Show newest first for better accessibility in the UI

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

  const handleApprove = async (id: string, title: string, status: string) => {
    const action = status === 'Draft' ? 'Setujui (Level 1)' : 'Kunci (Final)'
    setConfirmState({
      isOpen: true,
      title: `${action} Dokumen`,
      message: `Apakah Anda yakin ingin melanjutkan proses "${action}" untuk dokumen "${title}"?`,
      type: status === 'Draft' ? 'info' : 'success',
      confirmText: status === 'Draft' ? 'Ya, Setujui' : 'Ya, Kunci',
      onConfirm: () => {
        approveDoc.mutate({ id, notes: managerNotes }, {
          onSuccess: () => {
            onClose()
            setManagerNotes('')
            setActivePdfUrl(null)
          }
        })
        closeConfirm()
      }
    })
  }

  const loadPdf = async (id: string, type: string) => {
    setIsLoadingPdf(true)
    setActivePdfType(type)
    try {
      const res = await api.get(`/api/documents/${id}/download`, { 
        params: { type, mode: 'view' },
        responseType: 'blob' 
      })
      const url = window.URL.createObjectURL(res.data)
      setActivePdfUrl(url)
    } catch (err) {
      console.error('Gagal memuat PDF:', err)
      setActivePdfUrl(null)
    } finally {
      setIsLoadingPdf(false)
    }
  }

  useEffect(() => {
    if (selectedDoc && selectedDoc.po_path) {
      loadPdf(selectedDoc.id, 'po')
    } else {
      setActivePdfUrl(null)
    }
  }, [selectedDoc?.id])

  if (isLoadingDoc) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[var(--bg-secondary)]">
        <svg className="animate-spin h-8 w-8 text-[var(--accent)]" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25"/><path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" className="opacity-75"/></svg>
      </div>
    )
  }

  if (!selectedDoc && !documentId) return null
  if (!selectedDoc) return null

  return (
    <>
      <div className="fixed inset-0 z-[100] flex bg-[var(--bg-secondary)] animate-in fade-in duration-200">
        {/* Left Sidebar - Details & Approval */}
        <div className="w-[400px] flex-shrink-0 border-r border-[var(--border)] flex flex-col bg-[var(--bg-primary)] overflow-hidden">
          <div className="px-6 py-4 border-b border-[var(--border)] flex items-center gap-4">
            <button 
              onClick={() => { onClose(); setActivePdfUrl(null) }} 
              className="p-2 -ml-2 rounded-lg hover:bg-[var(--bg-hover)] transition-colors flex items-center gap-2 font-medium"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" /></svg>
              Kembali
            </button>
            <h3 className="font-bold text-lg truncate flex-1">{selectedDoc.title}</h3>
          </div>
          
          <div className="p-6 space-y-6 flex-1 overflow-y-auto">
            <div className="grid grid-cols-1">
              <div>
                <label className="text-[10px] uppercase tracking-wider font-bold text-[var(--text-muted)]">Status</label>
                <div className="mt-1"><StatusBadge status={selectedDoc.status} /></div>
              </div>
            </div>

            {selectedDoc.notes && (
              <div className="p-3.5 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border)]">
                <label className="text-[10px] uppercase tracking-wider font-bold text-[var(--text-muted)] block mb-1">Catatan Officer</label>
                <p className="text-sm text-[var(--text-secondary)] leading-relaxed italic">"{selectedDoc.notes}"</p>
              </div>
            )}

            {selectedDoc.manager_notes && (
              <div className="p-3.5 rounded-xl bg-[var(--success)]/5 border border-[var(--success)]/20">
                <label className="text-[10px] uppercase tracking-wider font-bold text-[var(--success)] block mb-1">Catatan Manager</label>
                <p className="text-sm text-[var(--text-secondary)] leading-relaxed italic">"{selectedDoc.manager_notes}"</p>
              </div>
            )}

            <div>
              <label className="text-[10px] uppercase tracking-wider font-bold text-[var(--text-muted)] block mb-2">Dokumen Terlampir</label>
              <div className="space-y-2">
                <FileButton doc={selectedDoc} type="po" label="PO" path={selectedDoc.po_path} activeType={activePdfType} onClick={() => loadPdf(selectedDoc.id, 'po')} />
                <FileButton doc={selectedDoc} type="invoice" label="Invoice" path={selectedDoc.invoice_path} activeType={activePdfType} onClick={() => loadPdf(selectedDoc.id, 'invoice')} />
                <FileButton doc={selectedDoc} type="packing_list" label="Packing List" path={selectedDoc.packing_list_path} activeType={activePdfType} onClick={() => loadPdf(selectedDoc.id, 'packing_list')} />
                <FileButton doc={selectedDoc} type="peb" label="PEB" path={selectedDoc.peb_path} activeType={activePdfType} onClick={() => loadPdf(selectedDoc.id, 'peb')} />
                <FileButton doc={selectedDoc} type="bl" label="Bill of Lading" path={selectedDoc.bl_path} activeType={activePdfType} onClick={() => loadPdf(selectedDoc.id, 'bl')} />
                <FileButton doc={selectedDoc} type="other" label="Lainnya" path={selectedDoc.other_path} activeType={activePdfType} onClick={() => loadPdf(selectedDoc.id, 'other')} />
              </div>
            </div>

            {/* Timeline Section */}
            <div className="pt-2">
              <button 
                onClick={() => setIsTimelineOpen(!isTimelineOpen)}
                className="w-full flex items-center justify-between py-2 text-[10px] uppercase tracking-wider font-bold text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
              >
                <span>Timeline Proses</span>
                <svg 
                  className={`w-4 h-4 transition-transform duration-200 ${isTimelineOpen ? 'rotate-180' : ''}`} 
                  fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                </svg>
              </button>
              
              {isTimelineOpen && (
                <div className="mt-4 relative animate-in slide-in-from-top-2 duration-200">
                  {/* Vertical Line */}
                  <div className="absolute left-[11px] top-2 bottom-2 w-0.5 bg-[var(--border)]" />
                  
                  <div className="space-y-6 relative">
                    {isLoadingAudit ? (
                      <div className="flex items-center gap-3 pl-8 py-2">
                        <div className="w-4 h-4 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
                        <span className="text-xs text-[var(--text-muted)]">Memuat timeline...</span>
                      </div>
                    ) : filteredLogs.length > 0 ? (
                      filteredLogs.map((log, index) => (
                        <div key={log.id} className="flex gap-4 group">
                          <div className="relative flex items-start mt-1">
                            <div className={`w-6 h-6 rounded-full border-4 border-[var(--bg-primary)] z-10 flex items-center justify-center shrink-0 ${
                              log.action.includes('APPROVE_FINAL') || log.action.includes('LOCK') ? 'bg-[var(--success)] shadow-[0_0_8px_var(--success)]' :
                              log.action.includes('APPROVE') ? 'bg-[var(--accent)] shadow-[0_0_8px_var(--accent)]' :
                              log.action === 'UPLOAD_DOCUMENT' ? 'bg-[var(--accent)]' :
                              'bg-[var(--text-muted)]'
                            }`}>
                              {log.action.includes('APPROVE_FINAL') || log.action.includes('LOCK') ? (
                                <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
                              ) : log.action.includes('APPROVE') || log.action === 'UPLOAD_DOCUMENT' ? (
                                <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
                              ) : (
                                <div className="w-1.5 h-1.5 rounded-full bg-white/50" />
                              )}
                            </div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-xs font-bold truncate">
                                {log.action === 'UPLOAD_DOCUMENT' ? 'Dokumen Dibuat' :
                                 log.action === 'APPROVE_LEVEL_1' ? 'Persetujuan Level 1' :
                                 log.action === 'APPROVE_FINAL' ? 'Dokumen Terkunci' :
                                 log.action === 'UPDATE_DOCUMENT' ? 'Dokumen Diperbarui' :
                                 log.action.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase())}
                              </p>
                              <span className="text-[10px] text-[var(--text-muted)] whitespace-nowrap">
                                {format(new Date(log.created_at), 'dd MMM, HH:mm', { locale: idLocale })}
                              </span>
                            </div>
                            <p className="text-[10px] text-[var(--text-muted)] leading-relaxed mt-0.5 italic opacity-80 pl-0.5">
                              {log.details || 'Tidak ada detail'}
                            </p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-[var(--text-muted)] pl-8 italic">Belum ada riwayat proses.</p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Approval Section for Manager */}
            {isManager && (selectedDoc.status === 'Draft' || selectedDoc.status === 'Approved') && (
              <div className="pt-6 border-t border-[var(--border)] space-y-4">
                <div>
                  <label className="text-[10px] uppercase tracking-wider font-bold text-[var(--text-muted)] block mb-1.5">Tindakan Manager ({user?.role})</label>
                  <textarea 
                    value={managerNotes}
                    onChange={(e) => setManagerNotes(e.target.value)}
                    placeholder="Tambahkan catatan persetujuan..."
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] px-3.5 py-2.5 text-sm focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] transition-all"
                    rows={3}
                  />
                </div>
                <button
                  onClick={() => handleApprove(selectedDoc.id, selectedDoc.title, selectedDoc.status)}
                  disabled={approveDoc.isPending}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-[var(--success)] px-4 py-3 text-sm font-bold text-white hover:bg-[var(--success-hover)] disabled:opacity-50 transition-all shadow-lg shadow-[var(--success)]/20"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>
                  {selectedDoc.status === 'Draft' ? 'Setujui Dokumen (Level 1)' : 'Kunci Dokumen (Final)'}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right Main Area - PDF Viewer */}
        <div className="flex-1 bg-black/5 flex flex-col relative">
          {isLoadingPdf ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <svg className="animate-spin h-8 w-8 text-[var(--accent)]" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25"/><path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" className="opacity-75"/></svg>
            </div>
          ) : activePdfUrl ? (
            <iframe 
              src={`${activePdfUrl}#navpanes=0`} 
              className="w-full h-full border-0"
              title="Document Viewer"
            />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-[var(--text-muted)]">
              <svg className="w-16 h-16 mb-4 opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" /></svg>
              <p>Pilih dokumen di panel kiri untuk menampilkan pratinjau</p>
            </div>
          )}
        </div>
      </div>

      {/* Confirmation Modal */}
      <ConfirmationModal 
        isOpen={confirmState.isOpen}
        title={confirmState.title}
        message={confirmState.message}
        type={confirmState.type}
        confirmText={confirmState.confirmText}
        onClose={closeConfirm}
        onConfirm={confirmState.onConfirm}
        isLoading={approveDoc.isPending}
      />
    </>
  )
}

function FileButton({ doc, type, label, path, activeType, onClick }: { doc: Document; type: string; label: string; path?: string; activeType: string; onClick: () => void }) {
  if (!path && type !== 'po') return null; // PO is required, others hide if empty

  const isActive = activeType === type
  
  return (
    <button 
      onClick={path ? onClick : undefined}
      disabled={!path}
      className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all text-left ${
        isActive 
          ? 'border-[var(--accent)] bg-[var(--accent)]/5 ring-1 ring-[var(--accent)]/50' 
          : path 
            ? 'border-[var(--border)] bg-[var(--bg-primary)] hover:border-[var(--accent)]/50 hover:bg-[var(--bg-hover)]' 
            : 'border-dashed border-[var(--border)] bg-transparent opacity-60 cursor-not-allowed'
      }`}
    >
      <div className="flex items-center gap-3 overflow-hidden">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
          isActive ? 'bg-[var(--accent)] text-white shadow-sm' : 
          path ? 'bg-[var(--accent)]/10 text-[var(--accent)]' : 'bg-[var(--border)] text-[var(--text-muted)]'
        }`}>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
          </svg>
        </div>
        <div className="min-w-0">
          <p className={`text-xs font-bold ${isActive ? 'text-[var(--text-primary)]' : ''}`}>{label}</p>
          <p className="text-[10px] text-[var(--text-muted)] truncate">{path ? path.split('/').pop() : 'Tidak ada file'}</p>
        </div>
      </div>
      {isActive && path && (
        <div className="w-2 h-2 rounded-full bg-[var(--accent)] shadow-[0_0_8px_var(--accent)]" />
      )}
    </button>
  )
}
