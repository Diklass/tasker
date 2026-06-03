import './globals.css'
import NavRail from '@/components/NavRail'
import ToastProvider from '@/components/ui/ToastProvider'

export const metadata = {
  title: 'Project Hub — VR Музей',
  description: 'Управление командой VR-проекта',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body>
        <ToastProvider>
          <div className="flex h-screen overflow-hidden">
            <NavRail />
            <main className="flex-1 overflow-y-auto relative z-[1]">
              {children}
            </main>
          </div>
        </ToastProvider>
      </body>
    </html>
  )
}
