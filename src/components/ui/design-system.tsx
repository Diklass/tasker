// PROJECT HUB — Единая дизайн-система
// Совместима с Tailwind v4. Все кастомные цвета через style={} или CSS-переменные.

import { forwardRef, type ReactNode, type ButtonHTMLAttributes, type InputHTMLAttributes, type TextareaHTMLAttributes } from 'react'
import clsx from 'clsx'
import type { LucideIcon } from 'lucide-react'

// ── ТОКЕНЫ ────────────────────────────────────────────────────
export const C = {
  bg:       '#0F1117',
  surface:  '#1A1D27',
  surface2: '#22263A',
  surface3: '#2A2F45',
  text1:    '#F1F3FA',
  text2:    '#A8B0C8',
  text3:    '#6B7494',
  orange:   '#FF8639',
  blue:     '#47CAFB',
  pink:     '#FF88BD',
  green:    '#4ADE80',
  purple:   '#A78BFA',
  border:   'rgba(255,255,255,0.07)',
  borderHover: 'rgba(255,255,255,0.14)',
}

export function dim(hex: string, a = 0.15) {
  if (!hex || hex.startsWith('var(')) return hex
  return `${hex}${Math.round(a * 255).toString(16).padStart(2, '0')}`
}
// Алиас для обратной совместимости
export const dimColor = dim

// ── PAGE ──────────────────────────────────────────────────────
export function PageWrapper({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={clsx('p-5 min-h-full relative z-10', className)}>{children}</div>
}

export function PageHeader({ title, subtitle, children }: { title: ReactNode; subtitle?: string; children?: ReactNode }) {
  return (
    <div className="flex items-start justify-between mb-6">
      <div>
        <h1 className="text-2xl font-black mb-0.5" style={{ color: C.text1, fontFamily: 'Nunito, sans-serif' }}>{title}</h1>
        {subtitle && <p className="text-sm" style={{ color: C.text3 }}>{subtitle}</p>}
      </div>
      {children && <div className="flex items-center gap-2">{children}</div>}
    </div>
  )
}

// ── CARD ──────────────────────────────────────────────────────
export function Card({ children, className, onClick }: { children: ReactNode; className?: string; onClick?: () => void }) {
  return (
    <div onClick={onClick}
      className={clsx('rounded-[20px] p-5 transition-all duration-200', onClick && 'cursor-pointer hover:-translate-y-0.5', className)}
      style={{ background: C.surface, border: `1px solid ${C.border}` }}>
      {children}
    </div>
  )
}

// ── SECTION TITLE ─────────────────────────────────────────────
// Поддерживает два режима: { icon, label } и { children }
export function SectionTitle({ icon: Icon, label, extra, children, className }: {
  icon?: LucideIcon; label?: string; extra?: ReactNode; children?: ReactNode; className?: string
}) {
  return (
    <div className={clsx('flex items-center justify-between mb-4', className)}>
      <div className="flex items-center gap-2 font-bold text-sm" style={{ color: C.text2, fontFamily: 'Nunito, sans-serif' }}>
        {Icon && <Icon size={15} style={{ color: C.text3 }} />}
        {label || children}
      </div>
      {extra}
    </div>
  )
}

// ── STAT CARD ─────────────────────────────────────────────────
// Поддерживает { value, label, color } и { title, value, icon, description, trend }
export function StatCard({ value, label, color, title, icon, description, trend }: {
  value: ReactNode; label?: string; color?: string
  title?: string; icon?: ReactNode; description?: string; trend?: string
}) {
  const displayTitle = title ?? label
  const displayColor = color ?? C.orange
  return (
    <Card>
      {displayTitle && (
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold uppercase tracking-wider" style={{ color: C.text3, fontFamily: 'Nunito, sans-serif' }}>{displayTitle}</span>
          {icon && <div className="text-lg opacity-80">{icon}</div>}
        </div>
      )}
      <div className="text-5xl font-black text-center" style={{ color: displayColor, fontFamily: 'Nunito, sans-serif', lineHeight: 1.1 }}>{value}</div>
      {(description || trend) && (
        <div className="flex items-center gap-1.5 text-xs mt-2" style={{ color: C.text2 }}>
          {trend && <span className="font-bold" style={{ color: C.green }}>{trend}</span>}
          {description && <span style={{ color: C.text3 }}>{description}</span>}
        </div>
      )}
    </Card>
  )
}

// ── DIVIDER ───────────────────────────────────────────────────
export function Divider({ className }: { className?: string }) {
  return <div className={clsx('h-px', className)} style={{ background: C.border }} />
}

// ── BUTTON ────────────────────────────────────────────────────
export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success'
type BtnSize = 'sm' | 'md' | 'lg'

const BTN_STYLES: Record<ButtonVariant, React.CSSProperties> = {
  primary:   { background: C.orange,           color: '#fff',      boxShadow: `0 0 16px ${dim(C.orange, 0.3)}` },
  secondary: { background: C.surface2,         color: C.text2,     border: `1px solid ${C.border}` },
  ghost:     { background: 'transparent',      color: C.text2 },
  danger:    { background: dim('#FF6B6B', 0.12), color: '#FF6B6B', border: `1px solid ${dim('#FF6B6B', 0.25)}` },
  success:   { background: dim(C.green, 0.12),  color: C.green,    border: `1px solid ${dim(C.green, 0.25)}` },
}
const BTN_SIZE: Record<BtnSize, string> = {
  sm: 'px-3 py-1.5 text-xs  rounded-[10px] gap-1.5',
  md: 'px-4 py-2.5 text-sm  rounded-[12px] gap-2',
  lg: 'px-5 py-3   text-sm  rounded-[16px] gap-2',
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant; size?: BtnSize; icon?: ReactNode; loading?: boolean
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'secondary', size = 'md', icon, loading, children, className, disabled, style, ...rest }, ref
) {
  return (
    <button ref={ref} disabled={disabled || loading}
      className={clsx('inline-flex items-center justify-center font-bold transition-all duration-150 select-none disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.97]', BTN_SIZE[size], className)}
      style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 700, ...BTN_STYLES[variant], ...style }}
      {...rest}>
      {loading
        ? <span className="w-3.5 h-3.5 rounded-full border-2 border-current border-t-transparent animate-spin" />
        : icon
      }
      {children}
    </button>
  )
})
Button.displayName = 'Button'

// ── INPUT ─────────────────────────────────────────────────────
export interface InputProps extends InputHTMLAttributes<HTMLInputElement> { label?: string; accent?: string; error?: string }

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input({ label, accent, error, className, ...rest }, ref) {
  return (
    <div className="w-full">
      {label && <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: C.text3, fontFamily: 'Nunito, sans-serif' }}>{label}</label>}
      <input ref={ref}
        className={clsx('w-full rounded-[14px] px-4 py-2.5 text-sm outline-none transition-colors', className)}
        style={{ background: C.surface2, border: `2px solid ${error ? '#FF6B6B' : 'rgba(255,255,255,0.10)'}`, color: C.text1, fontFamily: 'Nunito Sans, sans-serif' }}
        {...rest} />
      {error && <p className="text-xs mt-1" style={{ color: '#FF6B6B' }}>{error}</p>}
    </div>
  )
})
Input.displayName = 'Input'

// ── TEXTAREA ──────────────────────────────────────────────────
export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> { label?: string; accent?: string }

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea({ label, accent, className, ...rest }, ref) {
  return (
    <div className="w-full">
      {label && <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: C.text3, fontFamily: 'Nunito, sans-serif' }}>{label}</label>}
      <textarea ref={ref}
        className={clsx('w-full rounded-[14px] px-4 py-3 text-sm outline-none resize-none transition-colors', className)}
        style={{ background: C.surface2, border: `2px solid rgba(255,255,255,0.10)`, color: C.text1, fontFamily: 'Nunito Sans, sans-serif' }}
        {...rest} />
    </div>
  )
})
Textarea.displayName = 'Textarea'

// ── SELECT ────────────────────────────────────────────────────
export interface SelectProps extends InputHTMLAttributes<HTMLSelectElement> { label?: string; children: ReactNode }

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select({ label, className, children, ...rest }, ref) {
  return (
    <div className="w-full">
      {label && <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: C.text3, fontFamily: 'Nunito, sans-serif' }}>{label}</label>}
      <select ref={ref}
        className={clsx('w-full rounded-[14px] px-4 py-2.5 text-sm outline-none cursor-pointer', className)}
        style={{ background: C.surface2, border: `2px solid rgba(255,255,255,0.10)`, color: C.text1, fontFamily: 'Nunito Sans, sans-serif' }}
        {...rest}>{children}</select>
    </div>
  )
})
Select.displayName = 'Select'

// ── CHIP ──────────────────────────────────────────────────────
// Поддерживает варианты из TaskCard/TaskModal (room, 3d, code, sound, text, urgent, default)
// и старые (info, success, warning, pink, approved, pending) через BadgeVariant
type ChipVariant = 'room' | '3d' | 'code' | 'sound' | 'text' | 'urgent' | 'default'
  | 'info' | 'success' | 'warning' | 'pink' | 'approved' | 'pending' | 'rejected'

const CHIP_S: Record<string, [string, string, string]> = {
  room:     ['#1A1F35', '#A8C4FF', '#2A3560'],
  '3d':     ['#2A1A0D', C.orange,  '#3A2510'],
  code:     ['#0D1F2A', C.blue,    '#102840'],
  sound:    ['#2A0D1A', C.pink,    '#3A1025'],
  text:     ['#0D2A18', C.green,   '#103520'],
  urgent:   ['#2A0D0D', '#FF6B6B', '#3A1010'],
  default:  [C.surface2, C.text2,  'rgba(255,255,255,0.10)'],
  info:     ['#0D1F2A', C.blue,    'rgba(71,202,251,0.25)'],
  success:  ['#0D2A18', C.green,   'rgba(74,222,128,0.25)'],
  warning:  ['#2A1A0D', C.orange,  'rgba(255,134,57,0.25)'],
  pink:     ['#2A0D1A', C.pink,    'rgba(255,136,189,0.25)'],
  approved: ['#0D2A18', C.green,   'rgba(74,222,128,0.25)'],
  pending:  ['#2A1A0D', C.orange,  'rgba(255,134,57,0.25)'],
  rejected: ['#2A0D0D', '#FF6B6B', 'rgba(255,107,107,0.25)'],
}

export function Chip({ label, variant = 'default', children }: { label?: string; variant?: ChipVariant; children?: ReactNode }) {
  const [bg, color, border] = CHIP_S[variant] ?? CHIP_S.default
  return (
    <span className="inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-[8px] tracking-wide"
      style={{ background: bg, color, border: `1px solid ${border}`, fontFamily: 'Nunito, sans-serif' }}>
      {label ?? children}
    </span>
  )
}

// ── BADGE ─────────────────────────────────────────────────────
// BadgeVariant совместим с TaskModal и page.tsx
export type BadgeVariant = 'info' | 'success' | 'warning' | 'pink' | 'default'
  | 'approved' | 'pending' | 'rejected' | 'urgent'

export function Badge({ children, variant = 'default' }: { children: ReactNode; variant?: BadgeVariant }) {
  const [bg, color, border] = CHIP_S[variant] ?? CHIP_S.default
  return (
    <span className="inline-flex items-center text-[10px] font-bold px-2.5 py-1 rounded-full tracking-wide"
      style={{ background: bg, color, border: `1px solid ${border}`, fontFamily: 'Nunito, sans-serif' }}>
      {children}
    </span>
  )
}

// Алиас — Chip экспортируется и как Badge-синоним
// (TaskCard использует Chip с variant="room", TaskModal — Chip с label)

// ── AVATAR ────────────────────────────────────────────────────
const AV = {
  xs: 'w-6 h-6 rounded-[7px]  text-[9px]',
  sm: 'w-7 h-7 rounded-[9px]  text-[10px]',
  md: 'w-9 h-9 rounded-[11px] text-xs',
  lg: 'w-11 h-11 rounded-[13px] text-sm',
}

export function Avatar({ initials, color, colorBg, size = 'md', border: showBorder, className }: {
  initials: string; color: string; colorBg?: string; size?: 'xs'|'sm'|'md'|'lg'; border?: boolean; className?: string
}) {
  return (
    <div className={clsx('flex items-center justify-center font-black shrink-0', AV[size], showBorder && 'outline outline-2 outline-white/10', className)}
      style={{ background: colorBg ?? dim(color, 0.18), color, fontFamily: 'Nunito, sans-serif' }}>
      {initials}
    </div>
  )
}

// ── PROGRESS BAR ──────────────────────────────────────────────
export function ProgressBar({ value, max = 100, color = C.orange, label, showPercent = true }: {
  value: number; max?: number; color?: string; label?: string; showPercent?: boolean
}) {
  const pct = Math.min(100, Math.max(0, max > 0 ? (value / max) * 100 : value))
  return (
    <div className="w-full">
      {(label || showPercent) && (
        <div className="flex justify-between text-xs mb-1.5">
          {label && <span className="font-semibold" style={{ color: C.text2 }}>{label}</span>}
          {showPercent && <span className="font-bold" style={{ color }}>{Math.round(pct)}%</span>}
        </div>
      )}
      <div className="h-2 rounded-full overflow-hidden" style={{ background: C.surface3 }}>
        <div className="h-full rounded-full progress-animated" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  )
}

// ── MODAL ─────────────────────────────────────────────────────
export function ModalBackdrop({ onClose, onClick, children }: { onClose?: () => void; onClick?: () => void; children: ReactNode }) {
  const handler = onClose ?? onClick
  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(14px)' }}
      onClick={e => e.target === e.currentTarget && handler?.()}>
      {children}
    </div>
  )
}

export function ModalSheet({ children, className, onClose }: { children: ReactNode; className?: string; onClose?: () => void }) {
  return (
    <div className={clsx('animate-slide-up w-full sm:max-w-[500px] rounded-t-[28px] sm:rounded-[28px] overflow-hidden', className)}
      style={{ background: C.surface, border: `1px solid rgba(255,255,255,0.09)`, boxShadow: '0 32px 64px rgba(0,0,0,0.6)' }}>
      {children}
    </div>
  )
}

export function ModalHeader({ icon, title, subtitle, accentColor = C.orange, onClose }: {
  icon?: ReactNode; title: ReactNode; subtitle?: ReactNode; accentColor?: string; onClose: () => void
}) {
  return (
    <div className="px-6 py-5 border-b flex items-center justify-between"
      style={{ background: `linear-gradient(135deg, ${dim(accentColor, 0.12)}, ${dim(accentColor, 0.04)})`, borderColor: 'rgba(255,255,255,0.07)' }}>
      <div className="flex items-center gap-3">
        {icon && (
          <div className="w-10 h-10 rounded-[14px] flex items-center justify-center border"
            style={{ background: dim(accentColor, 0.20), borderColor: dim(accentColor, 0.35) }}>
            {icon}
          </div>
        )}
        <div>
          <h2 className="font-black text-lg" style={{ fontFamily: 'Nunito, sans-serif', color: C.text1 }}>{title}</h2>
          {subtitle && <p className="text-xs" style={{ color: C.text3 }}>{subtitle}</p>}
        </div>
      </div>
      <button onClick={onClose} className="text-xl transition-colors" style={{ color: C.text2 }}>&times;</button>
    </div>
  )
}

// Полная обёртка модального окна (для простых случаев)
export function Modal({ isOpen, onClose, title, children }: { isOpen: boolean; onClose: () => void; title: string; children: ReactNode }) {
  if (!isOpen) return null
  return (
    <ModalBackdrop onClose={onClose}>
      <ModalSheet>
        <ModalHeader title={title} onClose={onClose} />
        <div className="p-6">{children}</div>
      </ModalSheet>
    </ModalBackdrop>
  )
}

// ── EMPTY / LOADING ───────────────────────────────────────────
export function EmptyState({ emoji, title, subtitle }: { emoji: string; title: string; subtitle?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="text-4xl mb-3">{emoji}</div>
      <p className="font-bold text-sm" style={{ color: C.text2, fontFamily: 'Nunito, sans-serif' }}>{title}</p>
      {subtitle && <p className="text-xs mt-1" style={{ color: C.text3 }}>{subtitle}</p>}
    </div>
  )
}

export function LoadingState({ text, message }: { text?: string; message?: string }) {
  const label = text ?? message ?? 'Загрузка...'
  return (
    <div className="flex items-center justify-center h-32 gap-2 font-semibold" style={{ color: C.text3 }}>
      <div className="w-4 h-4 rounded-full border-2 border-t-transparent animate-spin"
        style={{ borderColor: `${C.orange}40`, borderTopColor: C.orange }} />
      {label}
    </div>
  )
}

// ── INFO BANNER ───────────────────────────────────────────────
export function InfoBanner({ icon, title, body, color = C.blue }: { icon?: ReactNode; title: string; body: string; color?: string }) {
  return (
    <div className="rounded-[16px] p-4 border" style={{ background: dim(color, 0.10), borderColor: dim(color, 0.22) }}>
      <div className="font-bold text-sm mb-1 flex items-center gap-1.5" style={{ color, fontFamily: 'Nunito, sans-serif' }}>
        {icon} {title}
      </div>
      <p className="text-xs leading-relaxed" style={{ color: C.text2 }}>{body}</p>
    </div>
  )
}
