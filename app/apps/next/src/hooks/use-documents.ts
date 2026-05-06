import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

export interface Document {
  id: string
  title: string
  status: string
  poPath: string
  invoicePath: string
  packingListPath: string
  pebPath: string
  blPath: string
  otherPath: string
  retentionYears: number
  uploaderId: string
  uploader?: {
    id: string
    firstName: string
    lastName: string
    email: string
  }
  notes?: string
  managerNotes?: string

  createdAt: string
  updatedAt: string
}

export function useDocuments(params?: { q?: string; status?: string }) {
  return useQuery({
    queryKey: ['documents', params],
    queryFn: async () => {
      const res = await api.get('/api/documents', { params })
      return res.data.data as Document[]
    },
  })
}

export function useDocument(id: string) {
  return useQuery({
    queryKey: ['documents', id],
    queryFn: async () => {
      const res = await api.get('/api/documents/' + id)
      return res.data.data as Document
    },
    enabled: !!id,
  })
}

export function useCreateDocument() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (data: FormData) => {
      const res = await api.post('/api/documents', data)
      return res.data.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] })
    },
  })
}

export function useUpdateDocument() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: FormData }) => {
      const res = await api.put('/api/documents/' + id, data)
      return res.data.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] })
    },
  })
}

export function useDeleteDocument() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete('/api/documents/' + id)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] })
    },
  })
}

export function useApproveDocument() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, notes }: { id: string; notes?: string }) => {
      const formData = new FormData()
      if (notes) formData.append('manager_notes', notes)
      const res = await api.post('/api/documents/' + id + '/approve', formData)
      return res.data.data
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['documents'] })
      queryClient.invalidateQueries({ queryKey: ['documents', id] })
    },
  })
}

export function useLockDocument() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.post('/api/documents/' + id + '/lock')
      return res.data.data
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['documents'] })
      queryClient.invalidateQueries({ queryKey: ['documents', id] })
    },
  })
}

export function useDownloadDocument() {
  return useMutation({
    mutationFn: async ({ id, type }: { id: string; type: string }) => {
      const res = await api.get(`/api/documents/${id}/download`, {
        params: { type },
        responseType: 'blob',
      })
      
      // If the response is a blob but actually contains a JSON error message
      if (res.data.type === 'application/json') {
        const text = await res.data.text()
        const error = JSON.parse(text)
        throw new Error(error.error || 'Gagal mengunduh berkas')
      }

      const url = window.URL.createObjectURL(res.data)
      const link = document.createElement('a')
      link.href = url
      
      // Try to get filename from content-disposition header
      const contentDisposition = res.headers['content-disposition']
      let filename = `document_${type}.pdf`
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="?(.+?)"?$/)
        if (filenameMatch && filenameMatch[1]) {
          filename = filenameMatch[1]
        }
      }
      
      link.setAttribute('download', filename)
      document.body.appendChild(link)
      link.click()
      
      // Cleanup
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
    },
  })
}

export interface AuditLog {
  id: string
  action: string
  userId: string
  documentId: string
  ipAddress: string
  details: string
  createdAt: string
}

export function useDocumentAuditLogs(documentId?: string, enabled = true) {
  return useQuery({
    queryKey: ['audit_logs', documentId],
    queryFn: async () => {
      const res = await api.get('/api/audit_logs', {
        params: { document_id: documentId, sort_by: 'created_at', sort_order: 'asc' }
      })
      return res.data.data as AuditLog[]
    },
    enabled: !!documentId && enabled,
  })
}
