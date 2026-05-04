import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

export interface AuditLog {
  id: string
  action: string
  userId: string
  user?: {
    first_name: string
    last_name: string
    email: string
    role: string
  }
  documentId: string
  ipAddress: string
  details: string
  createdAt: string
  updatedAt: string
}

export function useAuditLogs(params?: {
  search?: string
  documentId?: string
  userId?: string
  action?: string
  startDate?: string
  endDate?: string
  page?: number
  pageSize?: number
  enabled?: boolean
}) {
  const { enabled = true, ...apiParams } = params || {}
  return useQuery({
    queryKey: ['audit_logs', apiParams],
    queryFn: async () => {
      const res = await api.get('/api/audit_logs', { params: apiParams })
      return res.data.data as AuditLog[]
    },
    enabled
  })
}

export function useAuditLog(id: string) {
  return useQuery({
    queryKey: ['audit_logs', id],
    queryFn: async () => {
      const res = await api.get('/api/audit_logs/' + id)
      return res.data.data as AuditLog
    },
    enabled: !!id,
  })
}

export function useCreateAuditLog() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (data: Partial<AuditLog>) => {
      const res = await api.post('/api/audit_logs', data)
      return res.data.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['audit_logs'] })
    },
  })
}

export function useUpdateAuditLog() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<AuditLog> }) => {
      const res = await api.put('/api/audit_logs/' + id, data)
      return res.data.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['audit_logs'] })
    },
  })
}

export function useDeleteAuditLog() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete('/api/audit_logs/' + id)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['audit_logs'] })
    },
  })
}
