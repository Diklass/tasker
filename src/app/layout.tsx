import './globals.css'
import Link from 'next/link'
import { ToastProvider } from '@/components/ui/ToastProvider'

export const metadata = {
  title: 'Museum VR Tasker',
  description: 'Панель управления разработкой VR-экскурсии',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ru">
      <body className="bg-[#FBFAF6] font-sans antialiased text-[#1C1B1F]">
        <ToastProvider>
          {/* Верхняя панель навигации в стиле Material Design 3 Expressive */}
          <header className="sticky top-0 z-40 bg-[#FBFAF6]/80 backdrop-blur-md border-b border-black/[0.04] px-6 py-3 flex items-center justify-between">
            <div className="flex items-center gap-8">
              <Link href="/" className="font-display font-black text-[16px] tracking-tight text-[#6750A4] hover:opacity-80 transition-opacity">
                🏛️ Museum.Dev
              </Link>
              
              <nav className="flex items-center gap-1">
                <Link href="/" className="px-4 py-2 rounded-full text-[13px] font-display font-bold text-[#49454F] hover:bg-black/[0.04] transition-colors">
                  Главная
                </Link>
                <Link href="/board" className="px-4 py-2 rounded-full text-[13px] font-display font-bold text-[#49454F] hover:bg-black/[0.04] transition-colors">
                  Канбан-доска
                </Link>
                <Link href="/pm" className="px-4 py-2 rounded-full text-[13px] font-display font-bold text-[#49454F] hover:bg-black/[0.04] transition-colors">
                  Утверждение часов
                </Link>
                <Link href="/storage" className="px-4 py-2 rounded-full text-[13px] font-display font-bold text-[#49454F] hover:bg-black/[0.04] transition-colors">
                  Документация
                </Link>
              </nav>
            </div>

            {/* Профиль текущего пользователя */}
            <div className="flex items-center gap-2 bg-[#E8DEF8] px-3 py-1.5 rounded-full">
              <span className="w-5 h-5 rounded-full bg-[#6750A4] text-white text-[10px] font-black flex items-center justify-center">
                ЭЛ
              </span>
              <span className="text-[11px] font-bold text-[#211F26]">Эльдар (Lead)</span>
            </div>
          </header>

          {/* Основной контент страницы */}
          <main className="min-h-[calc(100vh-60px)]">
            {children}
          </main>
        </ToastProvider>
      </body>
    </html>
  )
}