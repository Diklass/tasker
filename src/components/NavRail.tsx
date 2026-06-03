'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Columns2, BookOpen, BarChart2, ChevronDown } from 'lucide-react'
import clsx from 'clsx'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { useState } from 'react'
import { C, dim } from '@/components/ui/design-system'

const NAV = [
  { href: '/',        icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/board',   icon: Columns2,        label: 'Kanban' },
  { href: '/storage', icon: BookOpen,        label: 'Storage' },
  { href: '/pm',      icon: BarChart2,       label: 'PM Panel' },
]

export default function NavRail() {
  const pathname = usePathname()
  const { currentUser, members, switchUser } = useCurrentUser()
  const [open, setOpen] = useState(false)

  return (
    <nav className="w-[72px] flex flex-col items-center py-4 gap-1 shrink-0 relative z-10 border-r"
      style={{ background: C.surface, borderColor: C.border }}>

      {/* Logo */}
      <div className="w-9 h-9 rounded-[12px] flex items-center justify-center mb-2"
        style={{ background: 'linear-gradient(135deg, #FF8639, #FF4D6D)' }}>
        <span style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 900, fontSize: 13, color: '#fff' }}>VR</span>
      </div>
      <div className="w-8 h-px mb-1" style={{ background: C.border }} />

      {NAV.map(({ href, icon: Icon, label }) => {
        const active = pathname === href
        return (
          <Link key={href} href={href} title={label}
            className="relative group w-14 h-14 rounded-[14px] flex items-center justify-center transition-all duration-200"
            style={{
              background: active ? dim(C.orange, 0.2) : 'transparent',
              color: active ? C.orange : C.text3,
            }}
          >
            <Icon size={22} strokeWidth={active ? 2.2 : 1.8} />
            {active && (
              <div className="absolute right-0 top-1/2 -translate-y-1/2 w-0.5 h-6 rounded-l-full"
                style={{ background: C.orange }} />
            )}
            {/* Tooltip */}
            <span className="pointer-events-none absolute left-[68px] z-50 text-xs font-semibold px-2.5 py-1.5 rounded-[10px] whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-150"
              style={{ background: C.surface3, color: C.text1, border: `1px solid ${C.border}`, fontFamily: 'Nunito, sans-serif' }}>
              {label}
            </span>
          </Link>
        )
      })}

      {/* User switcher */}
      <div className="mt-auto relative">
        <button onClick={() => setOpen(p => !p)}
          className="w-14 h-14 rounded-[14px] flex flex-col items-center justify-center gap-0.5 transition-all">
          {currentUser ? (
            <>
              <div className="w-8 h-8 rounded-[10px] flex items-center justify-center text-[11px] font-black"
                style={{ background: dim(currentUser.color, 0.22), color: currentUser.color, fontFamily: 'Nunito, sans-serif' }}>
                {currentUser.initials}
              </div>
              <ChevronDown size={9} style={{ color: C.text3 }} />
            </>
          ) : (
            <div className="w-8 h-8 rounded-[10px] flex items-center justify-center" style={{ background: C.surface3, color: C.text3 }}>?</div>
          )}
        </button>

        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <div className="absolute bottom-0 left-[68px] z-50 rounded-[20px] p-2 min-w-[190px]"
              style={{ background: C.surface, border: `1px solid ${C.border}`, boxShadow: '0 16px 40px rgba(0,0,0,0.5)' }}>
              <p className="text-[10px] font-bold uppercase tracking-wider px-2 pt-1 pb-2"
                style={{ color: C.text3, fontFamily: 'Nunito, sans-serif' }}>Войти как</p>
              {members.map(m => (
                <button key={m.id} onClick={() => { switchUser(m.id); setOpen(false) }}
                  className="w-full flex items-center gap-2.5 px-2 py-2 rounded-[12px] transition-colors text-left"
                  style={{ background: currentUser?.id === m.id ? dim(C.orange, 0.1) : 'transparent' }}
                >
                  <div className="w-7 h-7 rounded-[9px] flex items-center justify-center font-black text-[10px] shrink-0"
                    style={{ background: dim(m.color, 0.22), color: m.color, fontFamily: 'Nunito, sans-serif' }}>
                    {m.initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold leading-none mb-0.5" style={{ color: C.text1, fontFamily: 'Nunito, sans-serif' }}>{m.name}</p>
                    <p className="text-[10px]" style={{ color: C.text3 }}>{m.role === 'manager' ? '👑 PM' : '👤'} · {m.xp} XP</p>
                  </div>
                  {currentUser?.id === m.id && <span className="text-xs font-bold" style={{ color: C.orange }}>✓</span>}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </nav>
  )
}
