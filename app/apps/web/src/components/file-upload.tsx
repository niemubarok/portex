import React, { useState, useRef } from 'react'

interface FileUploadProps {
  accept?: string
  onChange: (file: File | null) => void
  required?: boolean
  label?: string
  currentFile?: File | null
  existingPath?: string
}

export function FileUpload({ accept, onChange, required, label, currentFile, existingPath }: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [dragCount, setDragCount] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragCount(prev => prev + 1)
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const newCount = dragCount - 1
    setDragCount(newCount)
    if (newCount === 0) {
      setIsDragging(false)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
    setDragCount(0)
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0]
      // Basic validation for accepted types if provided
      if (accept) {
        const fileType = file.name.split('.').pop()?.toLowerCase()
        const acceptedTypes = accept.split(',').map(t => t.trim().replace('.', '').toLowerCase())
        if (fileType && !acceptedTypes.includes(fileType)) {
          alert(`Format file tidak didukung. Harap gunakan: ${accept}`)
          return
        }
      }
      onChange(file)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onChange(e.target.files[0])
    } else {
      onChange(null)
    }
  }

  const fileName = currentFile ? currentFile.name : (existingPath ? existingPath.split('/').pop() : null)

  return (
    <div
      className={`relative group transition-all duration-200 rounded-xl border-2 border-dashed ${
        isDragging
          ? 'border-[var(--accent)] bg-[var(--accent)]/10 scale-[1.01] shadow-lg shadow-[var(--accent)]/10'
          : 'border-[var(--border)] bg-[var(--bg-secondary)] hover:border-[var(--accent)]/50'
      }`}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={handleFileChange}
        className="hidden"
      />
      
      <div className="flex flex-col items-center justify-center py-8 px-4 text-center cursor-pointer">
        <div className={`mb-3 p-4 rounded-full transition-all duration-300 ${
          isDragging 
            ? 'bg-[var(--accent)] text-white scale-110' 
            : 'bg-[var(--bg-primary)] text-[var(--text-muted)] group-hover:text-[var(--accent)] group-hover:bg-[var(--bg-hover)]'
        }`}>
          {isDragging ? (
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
            </svg>
          ) : (
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 0 1-.88-7.903A5 5 0 1 1 15.9 6L16 6a5 5 0 0 1 1 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
          )}
        </div>
        
        <div className="space-y-1">
          {fileName ? (
            <>
              <p className="text-sm font-semibold text-[var(--accent)] truncate max-w-[250px] mx-auto px-2">
                {fileName}
              </p>
              <p className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] font-bold">Terpilih</p>
            </>
          ) : (
            <>
              <p className="text-sm font-medium text-[var(--text-primary)] group-hover:text-[var(--accent)] transition-colors">
                {label || 'Klik atau seret file ke sini'}
              </p>
              <p className="text-xs text-[var(--text-muted)] font-normal">
                {accept ? `Menerima ${accept.replace(/\./g, '').toUpperCase()}` : 'Pilih file apa saja'}
              </p>
            </>
          )}
        </div>

        {isDragging && (
          <div className="absolute inset-0 bg-[var(--accent)]/5 rounded-xl pointer-events-none flex items-center justify-center">
            <span className="text-[var(--accent)] font-bold text-lg animate-pulse">Lepaskan untuk Unggah</span>
          </div>
        )}
      </div>
    </div>
  )
}
