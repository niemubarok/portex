import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

export interface AppSetting {
  id: string
  key: string
  value: string

  created_at: string
  updated_at: string
}

export function useAppSettings() {
  return useQuery({
    queryKey: ['app_settings'],
    queryFn: async () => {
      const res = await api.get('/api/app_settings')
      return res.data.data as AppSetting[]
    },
  })
}

export function useAppSetting(id: string) {
  return useQuery({
    queryKey: ['app_settings', id],
    queryFn: async () => {
      const res = await api.get('/api/app_settings/' + id)
      return res.data.data as AppSetting
    },
    enabled: !!id,
  })
}

export function useCreateAppSetting() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (data: Partial<AppSetting>) => {
      const res = await api.post('/api/app_settings', data)
      return res.data.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['app_settings'] })
    },
  })
}

export function useUpdateAppSetting() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<AppSetting> }) => {
      const res = await api.put('/api/app_settings/' + id, data)
      return res.data.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['app_settings'] })
    },
  })
}

export function useDeleteAppSetting() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete('/api/app_settings/' + id)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['app_settings'] })
    },
  })
}
