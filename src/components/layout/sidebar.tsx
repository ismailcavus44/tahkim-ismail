'use client'
import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { 
  LayoutDashboard, 
  FileText, 
  Users,
  FileEdit,
  DollarSign,
  CheckSquare,
  LogOut,
  Menu,
  X,
  Scale,
  Wallet
} from 'lucide-react'
import { supabaseBrowser } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

const menuGroups = [
  {
    title: null,
    items: [
      { href: '/', label: 'Anasayfa', icon: LayoutDashboard },
      { href: '/muvekkiller', label: 'Müvekkil Yönetimi', icon: Users },
      { href: '/is-takip', label: 'İş Takip', icon: CheckSquare },
      { href: '/dilekce', label: 'Dilekçe Oluştur', icon: FileEdit },
    ]
  },
  {
    title: 'Sigorta Tahkim',
    items: [
      { href: '/gelir-gider', label: 'Gelir-Gider Takibi', icon: DollarSign },
      { href: '/dosyalar', label: 'Dosya Yönetimi', icon: FileText },
    ]
  },
  {
    title: 'Hukuk Dosyaları',
    items: [
      { href: '/gelir-gider-2', label: 'Ofis Gelir Gider', icon: Wallet },
      { href: '/dosyalar-2', label: 'Dava Dosyaları', icon: Scale },
    ]
  }
]

export default function Sidebar() {
  const [isOpen, setIsOpen] = useState(false)
  const pathname = usePathname()
  const router = useRouter()
  const sb = supabaseBrowser()

  const handleLogout = async () => {
    const { error } = await sb.auth.signOut()
    if (error) {
      toast.error('Çıkış yapılırken hata oluştu')
    } else {
      toast.success('Çıkış yapıldı')
      router.push('/auth/login')
    }
  }

  return (
    <>
      {/* Mobile menu button */}
      <Button
        variant="outline"
        size="sm"
        className="md:hidden fixed top-4 left-4 z-50 cursor-pointer"
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
      </Button>

      {/* Sidebar */}
      <div className={`
        fixed inset-y-0 left-0 z-40 w-64 bg-white border-r border-gray-200 transform transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        md:translate-x-0
      `}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-center h-16 px-4 border-b border-gray-200">
            <h1 className="text-xl font-bold text-gray-900">Ofis Yönetim</h1>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 overflow-y-auto">
            {menuGroups.map((group, groupIndex) => (
              <div key={groupIndex}>
                {groupIndex > 0 && (
                  <div className="my-4 border-t border-gray-200" />
                )}
                {group.title && (
                  <h3 className="px-3 mb-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    {group.title}
                  </h3>
                )}
                <div className="space-y-1">
                  {group.items.map((item) => {
                    const Icon = item.icon
                    const isActive = pathname === item.href
                    
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={`
                          flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors cursor-pointer
                          ${isActive 
                            ? 'bg-blue-100 text-blue-700' 
                            : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                          }
                        `}
                        onClick={() => setIsOpen(false)}
                      >
                        <Icon className="mr-3 h-5 w-5" />
                        {item.label}
                      </Link>
                    )
                  })}
                </div>
              </div>
            ))}
          </nav>

          {/* Logout */}
          <div className="p-4 border-t border-gray-200">
            <Button
              variant="outline"
              className="w-full justify-start cursor-pointer"
              onClick={handleLogout}
            >
              <LogOut className="mr-3 h-4 w-4" />
              Çıkış Yap
            </Button>
          </div>
        </div>
      </div>

      {/* Overlay for mobile */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-30 backdrop-blur-[2px] backdrop-brightness-90 md:hidden cursor-pointer"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  )
}
