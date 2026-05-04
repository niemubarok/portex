import { Clock, CheckCircle2, Lock, XCircle } from 'lucide-react'

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string; icon: any }> = {
  Draft: { 
    label: 'Draf', 
    bg: 'bg-[var(--warning)]/10', 
    text: 'text-[var(--warning)]', 
    icon: Clock 
  },
  Approved: { 
    label: 'Disetujui', 
    bg: 'bg-[var(--accent)]/10', 
    text: 'text-[var(--accent)]', 
    icon: CheckCircle2 
  },
  Locked: { 
    label: 'Terkunci', 
    bg: 'bg-[var(--success)]/10', 
    text: 'text-[var(--success)]', 
    icon: Lock 
  },
  Rejected: { 
    label: 'Ditolak', 
    bg: 'bg-[var(--danger)]/10', 
    text: 'text-[var(--danger)]', 
    icon: XCircle 
  },
}

export function StatusBadge({ status }: { status: string }) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.Draft
  const Icon = config.icon

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${config.bg} ${config.text}`}>
      <Icon size={12} strokeWidth={2.5} />
      {config.label}
    </span>
  )
}
