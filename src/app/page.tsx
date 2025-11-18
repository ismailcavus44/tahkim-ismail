'use client'
import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { supabaseBrowser } from "@/lib/supabase/client"
import { Users, TrendingUp, TrendingDown, DollarSign } from 'lucide-react'
import Link from 'next/link'

interface Transaction {
  id: string
  type: 'income' | 'expense'
  amount: number
  category: string
  description?: string | null
  transaction_date: string
  case_id?: string | null
  cases?: {
    title?: string
    case_no?: string
  } | null
  cases_2?: {
    case_type?: string
    court_name?: string
    case_no?: string
  } | null
}

export default function Dashboard() {
  const [tahkimStats, setTahkimStats] = useState({
    totalCases: 0,
    openCases: 0,
    closedCases: 0
  })
  const [davaStats, setDavaStats] = useState({
    totalCases: 0,
    openCases: 0,
    closedCases: 0
  })
  const [financialStats, setFinancialStats] = useState({
    totalIncome: 0,
    totalExpense: 0,
    balance: 0
  })
  const [totalClients, setTotalClients] = useState(0)
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([])
  const sb = supabaseBrowser()

  useEffect(() => {
    loadDashboardData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const loadDashboardData = async () => {
    try {
      // Tahkim dosyaları istatistikleri
      const [tahkimAll, tahkimOpen, tahkimClosed] = await Promise.all([
        sb.from('cases').select('id', { count: 'exact' }),
        sb.from('cases').select('id', { count: 'exact' }).eq('status', 'open'),
        sb.from('cases').select('id', { count: 'exact' }).eq('status', 'closed')
      ])

      setTahkimStats({
        totalCases: tahkimAll.count || 0,
        openCases: tahkimOpen.count || 0,
        closedCases: tahkimClosed.count || 0
      })

      // Dava dosyaları istatistikleri
      const [davaAll, davaOpen, davaClosed] = await Promise.all([
        sb.from('cases_2').select('id', { count: 'exact' }),
        sb.from('cases_2').select('id', { count: 'exact' }).eq('status', 'open'),
        sb.from('cases_2').select('id', { count: 'exact' }).eq('status', 'closed')
      ])

      setDavaStats({
        totalCases: davaAll.count || 0,
        openCases: davaOpen.count || 0,
        closedCases: davaClosed.count || 0
      })

      // Müvekkil sayısı
      const { count: clientCount } = await sb.from('clients').select('id', { count: 'exact' })
      setTotalClients(clientCount || 0)

      // Gelir-Gider İstatistikleri (her iki tablodan)
      const [transactions1, transactions2] = await Promise.all([
        sb.from('income_expenses').select('type, amount'),
        sb.from('income_expenses_2').select('type, amount')
      ])

      const allTransactions = [
        ...(transactions1.data || []),
        ...(transactions2.data || [])
      ]

      const income = allTransactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + (t.amount || 0), 0)
      
      const expense = allTransactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + (t.amount || 0), 0)

      setFinancialStats({
        totalIncome: income,
        totalExpense: expense,
        balance: income - expense
      })

      // Son işlemler (her iki tablodan)
      const [trans1, trans2] = await Promise.all([
        sb.from('income_expenses')
          .select('id, type, amount, category, description, transaction_date, case_id, cases(title, case_no)')
          .order('transaction_date', { ascending: false })
          .limit(5),
        sb.from('income_expenses_2')
          .select('id, type, amount, category, description, transaction_date, case_id, cases_2(case_type, court_name, case_no)')
          .order('transaction_date', { ascending: false })
          .limit(5)
      ])

      const combined = [
        ...(trans1.data || []).map(t => ({ ...t, source: 'tahkim' })),
        ...(trans2.data || []).map(t => ({ ...t, source: 'dava' }))
      ]
        .sort((a, b) => new Date(b.transaction_date).getTime() - new Date(a.transaction_date).getTime())
        .slice(0, 10)

      setRecentTransactions(combined as Transaction[])
    } catch (error) {
      console.error('Dashboard verileri yüklenirken hata:', error)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  return (
    <div className="space-y-4 md:space-y-6 lg:space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-xl md:text-2xl font-semibold text-gray-900">Dashboard</h1>
        <p className="text-xs md:text-sm text-gray-500 mt-1">Genel bakış ve özet bilgiler</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        {/* Müvekkiller */}
        <Card>
          <CardContent className="p-3 md:p-4 lg:p-5">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-[10px] md:text-xs text-gray-500 uppercase tracking-wide mb-1 md:mb-2">Müvekkil</p>
                <p className="text-lg md:text-xl lg:text-2xl font-semibold text-gray-900 truncate">{totalClients}</p>
              </div>
              <div className="h-8 w-8 md:h-10 md:w-10 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0 ml-2">
                <Users className="h-4 w-4 md:h-5 md:w-5 text-gray-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Toplam Gelir */}
        <Card>
          <CardContent className="p-3 md:p-4 lg:p-5">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-[10px] md:text-xs text-gray-500 uppercase tracking-wide mb-1 md:mb-2">Gelir</p>
                <p className="text-lg md:text-xl lg:text-2xl font-semibold text-gray-900 truncate">{formatCurrency(financialStats.totalIncome)}</p>
              </div>
              <div className="h-8 w-8 md:h-10 md:w-10 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0 ml-2">
                <TrendingUp className="h-4 w-4 md:h-5 md:w-5 text-gray-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Toplam Gider */}
        <Card>
          <CardContent className="p-3 md:p-4 lg:p-5">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-[10px] md:text-xs text-gray-500 uppercase tracking-wide mb-1 md:mb-2">Gider</p>
                <p className="text-lg md:text-xl lg:text-2xl font-semibold text-gray-900 truncate">{formatCurrency(financialStats.totalExpense)}</p>
              </div>
              <div className="h-8 w-8 md:h-10 md:w-10 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0 ml-2">
                <TrendingDown className="h-4 w-4 md:h-5 md:w-5 text-gray-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Net Bakiye */}
        <Card>
          <CardContent className="p-3 md:p-4 lg:p-5">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-[10px] md:text-xs text-gray-500 uppercase tracking-wide mb-1 md:mb-2">Bakiye</p>
                <p className="text-lg md:text-xl lg:text-2xl font-semibold text-gray-900 truncate">
                  {formatCurrency(financialStats.balance)}
                </p>
              </div>
              <div className="h-8 w-8 md:h-10 md:w-10 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0 ml-2">
                <DollarSign className="h-4 w-4 md:h-5 md:w-5 text-gray-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 md:gap-4">
        {/* Tahkim Dosyaları */}
        <Card>
          <CardHeader className="border-b pb-3 md:pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm md:text-base font-medium">Sigorta Tahkim</CardTitle>
              <Link href="/dosyalar" className="text-[10px] md:text-xs text-gray-500 hover:text-gray-900 whitespace-nowrap">
                Tümünü Gör →
              </Link>
            </div>
          </CardHeader>
          <CardContent className="p-3 md:p-4">
            <div className="grid grid-cols-3 gap-1.5 md:gap-2">
              <div className="text-center p-2 md:p-3 bg-gray-50 rounded">
                <p className="text-lg md:text-xl lg:text-2xl font-semibold text-gray-900">{tahkimStats.totalCases}</p>
                <p className="text-[10px] md:text-xs text-gray-500 mt-0.5 md:mt-1">Toplam</p>
              </div>
              <div className="text-center p-2 md:p-3 bg-gray-50 rounded">
                <p className="text-lg md:text-xl lg:text-2xl font-semibold text-gray-900">{tahkimStats.openCases}</p>
                <p className="text-[10px] md:text-xs text-gray-500 mt-0.5 md:mt-1">Açık</p>
              </div>
              <div className="text-center p-2 md:p-3 bg-gray-50 rounded">
                <p className="text-lg md:text-xl lg:text-2xl font-semibold text-gray-900">{tahkimStats.closedCases}</p>
                <p className="text-[10px] md:text-xs text-gray-500 mt-0.5 md:mt-1">Kapalı</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Dava Dosyaları */}
        <Card>
          <CardHeader className="border-b pb-3 md:pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm md:text-base font-medium">Hukuk Davaları</CardTitle>
              <Link href="/dosyalar-2" className="text-[10px] md:text-xs text-gray-500 hover:text-gray-900 whitespace-nowrap">
                Tümünü Gör →
              </Link>
            </div>
          </CardHeader>
          <CardContent className="p-3 md:p-4">
            <div className="grid grid-cols-3 gap-1.5 md:gap-2">
              <div className="text-center p-2 md:p-3 bg-gray-50 rounded">
                <p className="text-lg md:text-xl lg:text-2xl font-semibold text-gray-900">{davaStats.totalCases}</p>
                <p className="text-[10px] md:text-xs text-gray-500 mt-0.5 md:mt-1">Toplam</p>
              </div>
              <div className="text-center p-2 md:p-3 bg-gray-50 rounded">
                <p className="text-lg md:text-xl lg:text-2xl font-semibold text-gray-900">{davaStats.openCases}</p>
                <p className="text-[10px] md:text-xs text-gray-500 mt-0.5 md:mt-1">Açık</p>
              </div>
              <div className="text-center p-2 md:p-3 bg-gray-50 rounded">
                <p className="text-lg md:text-xl lg:text-2xl font-semibold text-gray-900">{davaStats.closedCases}</p>
                <p className="text-[10px] md:text-xs text-gray-500 mt-0.5 md:mt-1">Kapalı</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Son İşlemler */}
      <Card>
        <CardHeader className="border-b pb-3 md:pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm md:text-base font-medium">Son İşlemler</CardTitle>
            <div className="flex gap-2 md:gap-3 text-[10px] md:text-xs text-gray-500">
              <Link href="/gelir-gider" className="hover:text-gray-900 whitespace-nowrap">Tahkim →</Link>
              <Link href="/gelir-gider-2" className="hover:text-gray-900 whitespace-nowrap">Dava →</Link>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-3 md:p-4">
          {recentTransactions.length > 0 ? (
            <div className="space-y-1.5 md:space-y-2">
              {recentTransactions.map((transaction) => {
                // Dosya bilgilerini al
                let caseInfo = ''
                if (transaction.cases) {
                  // Tahkim dosyası
                  caseInfo = transaction.cases.title || 'Dosya bilgisi yok'
                  if (transaction.cases.case_no) {
                    caseInfo += ` - ${transaction.cases.case_no}`
                  }
                } else if (transaction.cases_2) {
                  // Dava dosyası
                  if (transaction.cases_2.court_name) {
                    caseInfo = transaction.cases_2.court_name
                    if (transaction.cases_2.case_no) {
                      caseInfo += ` - ${transaction.cases_2.case_no}`
                    }
                  } else {
                    caseInfo = transaction.cases_2.case_type || 'Dosya bilgisi yok'
                  }
                }

                return (
                  <div key={transaction.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-2 md:p-2.5 rounded border hover:bg-gray-50 transition-colors gap-1.5 sm:gap-0">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 md:gap-2 flex-wrap">
                        <span className="text-xs md:text-sm font-medium text-gray-900 truncate">
                          {transaction.category}
                        </span>
                        <span className="px-1.5 py-0.5 text-[10px] md:text-xs bg-gray-100 text-gray-600 rounded flex-shrink-0">
                          {transaction.type === 'income' ? 'Gelir' : 'Gider'}
                        </span>
                      </div>
                      <p className="text-[10px] md:text-xs text-gray-500 truncate mt-0.5">
                        {caseInfo} • {new Date(transaction.transaction_date).toLocaleDateString('tr-TR')}
                      </p>
                    </div>
                    <div className="text-left sm:text-right sm:ml-4 flex-shrink-0">
                      <p className="text-xs md:text-sm font-semibold text-gray-900">
                        {transaction.type === 'income' ? '+' : '-'}{formatCurrency(transaction.amount)}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="text-center py-6 md:py-8">
              <p className="text-xs md:text-sm text-gray-400">Henüz işlem bulunmuyor</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
