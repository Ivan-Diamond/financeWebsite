'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { signOut } from 'next-auth/react'
import { DashboardGrid } from '@/components/dashboard/DashboardGrid'
import { WidgetToolbar } from '@/components/dashboard/WidgetToolbar'
import { WebSocketProvider } from '@/components/WebSocketProvider'

export default function DashboardPage() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    } else if (status === 'authenticated') {
      setIsLoading(false)
    }
  }, [status, router])

  const handleLogout = async () => {
    await signOut({ redirect: true, callbackUrl: '/login' })
  }

  if (isLoading || status === 'loading') {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    )
  }

  return (
    <WebSocketProvider>
      <div className="h-screen w-screen bg-gray-900 flex flex-col overflow-hidden">
        {/* Top Navigation Bar - Full Width */}
        <header className="bg-gray-800 border-b border-gray-700 flex-shrink-0">
          <div className="w-full px-4">
            <div className="flex justify-between items-center h-14">
              {/* Left: Logo & Nav */}
              <div className="flex items-center space-x-4">
                <h1 className="text-xl font-bold text-white">📈 FinanceDash</h1>
                <nav className="flex space-x-2">
                  <a href="/dashboard" className="text-white px-3 py-1.5 rounded text-sm font-medium bg-gray-700">
                    Dashboard
                  </a>
                  <a href="/dashboard/test-working" className="text-gray-300 hover:text-white px-3 py-1.5 rounded text-sm font-medium hover:bg-gray-700">
                    🧪 Test API
                  </a>
                </nav>
              </div>
              
              {/* Right: User & Logout */}
              <div className="flex items-center space-x-3">
                <span className="text-gray-400 text-sm">
                  {session?.user?.username}
                </span>
                <button
                  onClick={handleLogout}
                  className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded text-sm font-medium transition-colors"
                >
                  Logout
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Toolbar - Full Width Horizontal */}
        <div className="bg-gray-800 border-b border-gray-700 flex-shrink-0">
          <WidgetToolbar />
        </div>

        {/* Dashboard Grid - Full Screen */}
        <main className="flex-1 w-full overflow-hidden">
          <DashboardGrid />
        </main>
      </div>
    </WebSocketProvider>
  )
}
