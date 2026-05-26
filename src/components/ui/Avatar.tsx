'use client'

interface AvatarProps {
  initials: string
  color?: string
  colorBg?: string
  size?: 'sm' | 'md' | 'lg'
}

export default function Avatar({ initials, color = '#fff', colorBg = '#6750A4', size = 'md' }: AvatarProps) {
  const sizeClasses = { sm: 'w-6 h-6 text-[10px]', md: 'w-9 h-9 text-xs', lg: 'w-12 h-12 text-sm' }
  return (
    <div 
      className={`flex items-center justify-center rounded-full font-bold select-none shrink-0 ${sizeClasses[size]}`}
      style={{ backgroundColor: colorBg, color }}
    >
      {initials.toUpperCase()}
    </div>
  )
}