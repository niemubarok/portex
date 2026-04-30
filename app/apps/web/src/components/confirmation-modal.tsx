import React from 'react'
import { X, AlertTriangle, Info, CheckCircle2, HelpCircle } from 'lucide-react'

export type ConfirmationType = 'danger' | 'warning' | 'info' | 'success' | 'question'

interface ConfirmationModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  type?: ConfirmationType
  isLoading?: boolean
}

export function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Ya, Lanjutkan',
  cancelText = 'Batal',
  type = 'question',
  isLoading = false
}: ConfirmationModalProps) {
  if (!isOpen) return null

  const getIcon = () => {
    switch (type) {
      case 'danger': return <AlertTriangle className="text-red-500" size={24} />
      case 'warning': return <AlertTriangle className="text-yellow-500" size={24} />
      case 'info': return <Info className="text-blue-500" size={24} />
      case 'success': return <CheckCircle2 className="text-green-500" size={24} />
      case 'question': return <HelpCircle className="text-[var(--accent)]" size={24} />
      default: return <HelpCircle className="text-[var(--accent)]" size={24} />
    }
  }

  const getButtonClass = () => {
    switch (type) {
      case 'danger': return 'bg-red-500 hover:bg-red-600 shadow-red-500/20'
      case 'warning': return 'bg-yellow-500 hover:bg-yellow-600 shadow-yellow-500/20 text-black'
      case 'success': return 'bg-green-500 hover:bg-green-600 shadow-green-500/20'
      default: return 'bg-[var(--accent)] hover:bg-[var(--accent-hover)] shadow-[var(--accent)]/20'
    }
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
        <div className="p-6">
          <div className="flex items-start gap-4">
            <div className={`p-3 rounded-xl bg-[var(--bg-primary)] border border-[var(--border)] shrink-0`}>
              {getIcon()}
            </div>
            <div className="flex-1 space-y-1">
              <h3 className="text-lg font-bold text-[var(--text-primary)]">{title}</h3>
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                {message}
              </p>
            </div>
            <button onClick={onClose} className="p-1 rounded-lg hover:bg-[var(--bg-hover)] text-[var(--text-muted)] transition-colors">
              <X size={18} />
            </button>
          </div>
          
          <div className="mt-8 flex gap-3">
            <button
              onClick={onClose}
              disabled={isLoading}
              className="flex-1 px-4 py-2.5 rounded-xl border border-[var(--border)] text-sm font-medium hover:bg-[var(--bg-hover)] transition-all disabled:opacity-50"
            >
              {cancelText}
            </button>
            <button
              onClick={onConfirm}
              disabled={isLoading}
              className={`flex-1 px-4 py-2.5 rounded-xl text-white text-sm font-bold transition-all shadow-lg disabled:opacity-50 ${getButtonClass()}`}
            >
              {isLoading ? 'Memproses...' : confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
