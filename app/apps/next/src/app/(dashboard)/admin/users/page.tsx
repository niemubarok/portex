'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { auth, User } from '@/lib/auth'
import { useUsers, useCreateUser, useUpdateUser, useDeleteUser } from '@/hooks/use-users'
import { 
  Search, 
  Filter, 
  MoreVertical, 
  UserPlus, 
  Mail, 
  Shield, 
  CheckCircle2, 
  XCircle,
  Pencil,
  Trash2,
  X,
  AlertCircle
} from 'lucide-react'
import { ConfirmationModal, ConfirmationType } from '@/components/confirmation-modal'

export default function UsersPage() {
  const router = useRouter()
  const { data: users = [], isLoading } = useUsers()
  const createUser = useCreateUser()
  const updateUser = useUpdateUser()
  const deleteUser = useDeleteUser()
  
  const [searchTerm, setSearchTerm] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  
  // Form State
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    role: 'OFFICER',
    active: true
  })

  const [confirmState, setConfirmState] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    type: ConfirmationType;
    confirmText?: string;
    cancelText?: string;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
    type: 'question',
  })

  const closeConfirm = () => setConfirmState(prev => ({ ...prev, isOpen: false }))

  const showAlert = (title: string, message: string, type: ConfirmationType = 'warning') => {
    setConfirmState({
      isOpen: true,
      title,
      message,
      type,
      confirmText: 'OK',
      cancelText: '',
      onConfirm: closeConfirm
    })
  }

  useEffect(() => {
    const user = auth.getUser()
    if (!auth.isAuthenticated() || user?.role !== 'ADMIN') {
      router.push('/dashboard')
    }
  }, [router])

  const filteredUsers = users.filter(u => 
    u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.lastName.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleOpenModal = (user: User | null = null) => {
    if (user) {
      setEditingUser(user)
      setFormData({
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        password: '', // Don't show password
        role: user.role,
        active: user.active
      })
    } else {
      setEditingUser(null)
      setFormData({
        firstName: '',
        lastName: '',
        email: '',
        password: '',
        role: 'OFFICER',
        active: true
      })
    }
    setIsModalOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (editingUser) {
        const updateData: any = { ...formData }
        if (!updateData.password) delete updateData.password
        await updateUser.mutateAsync({ id: editingUser.id, data: updateData })
      } else {
        await createUser.mutateAsync(formData)
      }
      setIsModalOpen(false)
    } catch (err) {
      console.error('Failed to save user:', err)
      showAlert('Gagal Menyimpan', 'Gagal menyimpan user. Pastikan email unik dan password minimal 6 karakter.', 'danger')
    }
  }

  const handleDelete = async (user: User) => {
    if (user.id === auth.getUser()?.id) {
      showAlert('Peringatan', 'Anda tidak dapat menghapus akun Anda sendiri.', 'warning')
      return
    }

    setConfirmState({
      isOpen: true,
      title: 'Hapus User',
      message: `Apakah Anda yakin ingin menghapus user ${user.firstName} ${user.lastName}? Pengguna ini akan kehilangan akses ke sistem.`,
      type: 'danger',
      confirmText: 'Ya, Hapus',
      onConfirm: async () => {
        try {
          await deleteUser.mutateAsync(user.id)
          closeConfirm()
        } catch (err) {
          console.error('Failed to delete user:', err)
          showAlert('Error', 'Gagal menghapus user.', 'danger')
        }
      }
    })
  }

  const getRoleBadge = (role: string) => {
    const roles: Record<string, string> = {
      ADMIN: 'bg-destructive/10 text-destructive border-destructive/20',
      OFFICER: 'bg-info/10 text-info border-info/20',
      MANAGER: 'bg-success/10 text-success border-success/20',
      AUDITOR: 'bg-warning/10 text-warning border-warning/20',
    }
    return roles[role] || 'bg-gray-500/10 text-gray-400 border-gray-500/20'
  }

  return (
    <div className="flex flex-col gap-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Manajemen Pengguna</h1>
          <p className="text-muted-foreground mt-1">Kelola akses dan perizinan anggota tim PortEx.</p>
        </div>
        <button 
          onClick={() => handleOpenModal()}
          className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-white hover:bg-accent-hover transition-colors shadow-lg shadow-accent/20"
        >
          <UserPlus size={18} />
          Tambah User
        </button>
      </div>

      {/* Filters and Search */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between rounded-xl border border-border bg-muted/50 p-4 shadow-sm">
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
          <input
            type="text"
            placeholder="Cari nama atau email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-lg border border-border bg-background pl-10 pr-4 py-2.5 text-sm focus:border-accent outline-none transition-all"
          />
        </div>
        <div className="flex items-center gap-2">
          <button className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-4 py-2.5 text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-all">
            <Filter size={16} />
            Filter
          </button>
        </div>
      </div>

      {/* Users Table */}
      <div className="rounded-xl border border-border bg-muted/50 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="border-b border-border bg-muted text-muted-foreground uppercase text-[10px] font-bold tracking-wider">
                <th className="px-6 py-4">User</th>
                <th className="px-6 py-4">Role</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Bergabung</th>
                <th className="px-6 py-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-6 py-4"><div className="h-10 w-40 bg-muted rounded" /></td>
                    <td className="px-6 py-4"><div className="h-6 w-20 bg-muted rounded" /></td>
                    <td className="px-6 py-4"><div className="h-6 w-16 bg-muted rounded" /></td>
                    <td className="px-6 py-4"><div className="h-4 w-24 bg-muted rounded" /></td>
                    <td className="px-6 py-4 text-right"><div className="h-8 w-8 bg-muted rounded ml-auto" /></td>
                  </tr>
                ))
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-20 text-center text-muted-foreground">
                    <div className="flex flex-col items-center gap-2">
                      <Shield size={40} className="opacity-10" />
                      <p>Tidak ada pengguna ditemukan.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-card to-muted border border-border flex items-center justify-center text-accent font-bold shadow-inner">
                          {u.firstName?.[0] || '?'}{u.lastName?.[0] || ''}
                        </div>
                        <div>
                          <div className="font-bold text-foreground">{u.firstName} {u.lastName}</div>
                          <div className="text-xs text-muted-foreground flex items-center gap-1">
                            <Mail size={12} />
                            {u.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase border ${getRoleBadge(u.role)}`}>
                        <Shield size={10} />
                        {u.role}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {u.active ? (
                        <span className="flex items-center gap-1.5 text-success text-xs font-medium bg-success/10 px-2.5 py-1 rounded-full">
                          <CheckCircle2 size={14} />
                          Aktif
                        </span>
                      ) : (
                        <span className="flex items-center gap-1.5 text-destructive text-xs font-medium bg-destructive/10 px-2.5 py-1 rounded-full">
                          <XCircle size={14} />
                          Nonaktif
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-muted-foreground text-xs">
                      {new Date(u.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button 
                          onClick={() => handleOpenModal(u)}
                          className="p-2 text-muted-foreground hover:text-accent hover:bg-accent/10 rounded-lg transition-all"
                          title="Edit User"
                        >
                          <Pencil size={16} />
                        </button>
                        <button 
                          onClick={() => handleDelete(u)}
                          className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-all"
                          title="Hapus User"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="px-6 py-4 bg-muted/20 border-t border-border text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center justify-between">
          <span>Menampilkan {filteredUsers.length} dari {users.length} pengguna</span>
        </div>
      </div>

      {/* User Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-muted border border-border rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h2 className="text-lg font-bold">{editingUser ? 'Edit Pengguna' : 'Tambah Pengguna Baru'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-muted-foreground/10 rounded-xl transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Nama Depan</label>
                  <input
                    required
                    type="text"
                    value={formData.firstName}
                    onChange={e => setFormData({...formData, firstName: e.target.value})}
                    className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:border-accent transition-all"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Nama Belakang</label>
                  <input
                    required
                    type="text"
                    value={formData.lastName}
                    onChange={e => setFormData({...formData, lastName: e.target.value})}
                    className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:border-accent transition-all"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Email</label>
                <input
                  required
                  type="email"
                  value={formData.email}
                  onChange={e => setFormData({...formData, email: e.target.value})}
                  className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:border-accent transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Password {editingUser && <span className="text-[10px] normal-case italic font-normal">(Kosongkan jika tidak ingin diubah)</span>}
                </label>
                <input
                  required={!editingUser}
                  type="password"
                  value={formData.password}
                  onChange={e => setFormData({...formData, password: e.target.value})}
                  className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:border-accent transition-all"
                  placeholder="Min. 6 karakter"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Role</label>
                  <select
                    value={formData.role}
                    onChange={e => setFormData({...formData, role: e.target.value})}
                    className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:border-accent transition-all appearance-none"
                  >
                    <option value="OFFICER">OFFICER</option>
                    <option value="MANAGER">MANAGER</option>
                    <option value="AUDITOR">AUDITOR</option>
                    <option value="ADMIN">ADMIN</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Status</label>
                  <select
                    value={formData.active ? 'true' : 'false'}
                    onChange={e => setFormData({...formData, active: e.target.value === 'true'})}
                    className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:border-accent transition-all appearance-none"
                  >
                    <option value="true">Aktif</option>
                    <option value="false">Nonaktif</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-border text-sm font-medium hover:bg-muted transition-all"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={createUser.isPending || updateUser.isPending}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-accent text-white text-sm font-medium hover:bg-accent-hover transition-all shadow-lg shadow-accent/20 disabled:opacity-50"
                >
                  {createUser.isPending || updateUser.isPending ? 'Menyimpan...' : (editingUser ? 'Simpan Perubahan' : 'Tambah User')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Confirmation Modal */}
      <ConfirmationModal 
        isOpen={confirmState.isOpen}
        title={confirmState.title}
        message={confirmState.message}
        type={confirmState.type}
        confirmText={confirmState.confirmText}
        cancelText={confirmState.cancelText}
        onClose={closeConfirm}
        onConfirm={confirmState.onConfirm}
        isLoading={deleteUser.isPending}
      />
    </div>
  )
}
