'use client'

import React from 'react'

// 1. Аватар
interface AvatarProps {
  initials: string
  color?: string
  colorBg?: string
  size?: 'sm' | 'md' | 'lg'
}
export function Avatar({ initials, color = '#fff', colorBg = '#6750A4', size = 'md' }: AvatarProps) {
  const sizeClasses = { sm: 'w-6 h-6 text-[10px]', md: 'w-9 h-9 text-xs', lg: 'w-12 h-12 text-sm' }
  return (
    <div 
      className={`flex items-center justify-center rounded-full font-bold select-none shrink-0 ${sizeClasses[size]}`}
      style={{ backgroundColor: colorBg || '#6750A4', color: color || '#fff' }}
    >
      {initials?.toUpperCase() || '?'}
    </div>
  )
}

// 2. Чипсы (теги типов работ)
export function Chip({ children, className, variant }: { children: React.ReactNode, className?: string, variant?: string }) {
  const variants: Record<string, string> = {
    'type-3d': 'bg-[#FAF0ED] text-[#D4897A]',
    'type-code': 'bg-[#EDF3FA] text-[#7AA8D4]',
    'type-sound': 'bg-[#EFF5EC] text-[#8DAE7A]',
    'type-text': 'bg-[#FDFBF7] text-[#C4A86A]',
    'default': 'bg-[#F2EDE6] text-[#49454F]',
  }
  return (
    <span className={`text-[11px] font-display font-black px-2.5 py-1 rounded-[8px] ${variants[variant || 'default']} ${className || ''}`}>
      {children}
    </span>
  )
}

// 3. Бейджи (приоритеты / статусы времени)
export function Badge({ children, variant }: { children: React.ReactNode, variant?: 'urgent' | 'approved' | 'pending' | 'rejected' }) {
  const variants = {
    urgent: 'bg-[#FFEBEE] text-[#C62828] border border-[#FFCDD2]',
    approved: 'bg-[#E8F5E9] text-[#2E7D32]',
    pending: 'bg-[#FFF3E0] text-[#EF6C00]',
    rejected: 'bg-[#FFEBEE] text-[#C62828]',
  }
  return (
    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-[6px] ${variant ? variants[variant] : 'bg-gray-100 text-gray-700'}`}>
      {children}
    </span>
  )
}

// 4. Прогресс-бар для сцен
export function ProgressBar({ progress, color = '#6750A4' }: { progress: number, color?: string }) {
  return (
    <div className="w-full bg-black/[0.06] h-[6px] rounded-full overflow-hidden">
      <div 
        className="h-full rounded-full transition-all duration-500 ease-out"
        style={{ width: `${Math.min(Math.max(progress, 0), 100)}%`, background: color }}
      />
    </div>
  )
}