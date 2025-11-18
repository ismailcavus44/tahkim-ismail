"use client"
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { TrendingUp, TrendingDown, Plus, Search, DollarSign, Info, Trash2, Building2 } from 'lucide-react'
import { supabaseBrowser } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { useUserRole } from '@/hooks/useUserRole'

interface Case {
  id: string
  case_type: string
  case_no?: string
  client_id?: string
  court_name?: string
  client?: {
    id: string
    full_name: string
  }
}

interface IncomeExpense {
  id: string
  case_id: string | null
  type: 'income' | 'expense'
  category: string
  amount: number
  description: string
  transaction_date: string
  created_at: string
  case?: Case
}
export default function GelirGiderPage() {
  const [cases, setCases] = useState<Case[]>([])
  const [transactions, setTransactions] = useState<IncomeExpense[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const { isReadOnly } = useUserRole()

  const [transactionDialogOpen, setTransactionDialogOpen] = useState(false)
  const [caseTransactionDialogOpen, setCaseTransactionDialogOpen] = useState(false)
  const [selectedCaseForTransaction, setSelectedCaseForTransaction] = useState<{case: Case, transactions: IncomeExpense[]} | null>(null)

  const [transactionForm, setTransactionForm] = useState({
    case_id: '',
    type: 'income' as 'income' | 'expense',
    category: '',
    amount: '',
    description: '',
    transaction_date: new Date().toISOString().split('T')[0],
    isRelatedToCase: true
  })

  const sb = supabaseBrowser()

  const incomeCategories = ['Müvekkil Ödemesi', 'Vekalet Ücreti', 'Diğer Gelir']
  const expenseCategories = ['Dava Harcı', 'Islah Harcı', 'BK Ücreti', 'Keşif Harcı', 'Tebligat Giderleri', 'Ulaşım Giderleri', 'Kira', 'Elektrik', 'Su', 'İnternet', 'Kırtasiye', 'Personel Maaşı', 'Diğer Ofis Gideri', 'Diğer Giderler']

  const allCategories = [...incomeCategories, ...expenseCategories]

  useEffect(() => {
    void loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const normalizeTr = (value: string): string => {
    const lower = value.toLocaleLowerCase('tr')
    return lower
      .replace(/ğ/g, 'g')
      .replace(/ü/g, 'u')
      .replace(/ş/g, 's')
      .replace(/ı/g, 'i')
      .replace(/ö/g, 'o')
      .replace(/ç/g, 'c')
      .replace(/\s+/g, ' ')
      .trim()
  }

  const loadData = async () => {
    try {
      setLoading(true)
      const [casesResult, transactionsResult] = await Promise.all([
        sb.from('cases_2')
          .select(`id, case_type, case_no, client_id, court_name, client:clients(id, full_name)`) 
          .order('case_type'),
        sb.from('income_expenses_2')
          .select(`id, case_id, type, category, amount, description, transaction_date, created_at, case:cases_2(id, case_type, case_no, client_id, court_name, client:clients(id, full_name))`)
          .order('transaction_date', { ascending: false })
      ])
      const fetchedCases = (casesResult.data || []) as Array<Record<string, unknown>>
      setCases(
        fetchedCases.map((r) => ({
          id: String(r.id),
          case_type: String(r.case_type),
          case_no: r.case_no ? String(r.case_no) : undefined,
          client_id: r.client_id ? String(r.client_id) : undefined,
          court_name: r.court_name ? String(r.court_name) : undefined,
          client: Array.isArray(r.client)
            ? (r.client[0] as { id: string; full_name: string } | undefined)
            : (r.client as { id: string; full_name: string } | undefined),
        })) as Case[]
      )

      const fetchedTransactions = (transactionsResult.data || []) as Array<Record<string, unknown>>
      setTransactions(
        fetchedTransactions.map((r) => {
          const rawCase = Array.isArray((r as Record<string, unknown>).case)
            ? ((r as Record<string, unknown>).case as Array<Record<string, unknown>>)[0]
            : ((r as Record<string, unknown>).case as Record<string, unknown> | undefined)

          const clientRaw = rawCase ? (rawCase.client as unknown) : undefined
          const clientRel = Array.isArray(clientRaw)
            ? (clientRaw[0] as { id?: unknown; full_name?: unknown } | undefined)
            : (clientRaw as { id?: unknown; full_name?: unknown } | undefined)

          const normalizedCase = rawCase
            ? {
                id: String(rawCase.id as unknown),
                case_type: String(rawCase.case_type as unknown),
                case_no: rawCase.case_no ? String(rawCase.case_no as unknown) : undefined,
                client_id: rawCase.client_id ? String(rawCase.client_id as unknown) : undefined,
                court_name: rawCase.court_name ? String(rawCase.court_name as unknown) : undefined,
                client: clientRel
                  ? {
                      id: String(clientRel.id as unknown),
                      full_name: String(clientRel.full_name as unknown),
                    }
                  : undefined,
              }
            : undefined

          return {
            id: String(r.id as unknown),
            case_id: r.case_id ? String(r.case_id as unknown) : null,
            type: r.type as 'income' | 'expense',
            category: String(r.category as unknown),
            amount: Number(r.amount),
            description: String((r.description ?? '') as unknown),
            transaction_date: String(r.transaction_date as unknown),
            created_at: String(r.created_at as unknown),
            case: normalizedCase,
          } as IncomeExpense
        }) as IncomeExpense[]
      )
    } catch (_err) {
      console.error(_err)
      toast.error('Veriler yüklenirken hata oluştu')
    } finally {
      setLoading(false)
    }
  }

  const filteredTransactions = transactions.filter(transaction => {
    if (!searchTerm.trim()) {
      const matchesType = typeFilter === 'all' || transaction.type === typeFilter
      const matchesCategory = categoryFilter === 'all' || transaction.category === categoryFilter
      return matchesType && matchesCategory
    }
    
    const q = searchTerm.toLowerCase().trim()
    const desc = (transaction.description || '').toLowerCase()
    const cat = (transaction.category || '').toLowerCase()
    const caseType = normalizeTr(transaction.case?.case_type || '')
    const caseNo = (transaction.case?.case_no || '').toLowerCase()
    const courtName = normalizeTr(transaction.case?.court_name || '')
    const clientName = normalizeTr(transaction.case?.client?.full_name || '')
    const matchesSearch = desc.includes(q) ||
                         cat.includes(q) ||
                         caseType.includes(q) ||
                         caseNo.includes(q) ||
                         courtName.includes(q) ||
                         clientName.includes(q)
    const matchesType = typeFilter === 'all' || transaction.type === typeFilter
    const matchesCategory = categoryFilter === 'all' || transaction.category === categoryFilter
    return matchesSearch && matchesType && matchesCategory
  })

  // Sadece dosyalı işlemlerin toplamı (Genel ofis hariç)
  const totalIncome = filteredTransactions.filter(t => t.type === 'income' && t.case_id).reduce((s,t)=>s+t.amount,0)
  const totalExpense = filteredTransactions.filter(t => t.type === 'expense' && t.case_id).reduce((s,t)=>s+t.amount,0)
  const netAmount = totalIncome - totalExpense
  
  // Genel ofis işlemlerinin ayrı toplamı
  const generalOfficeIncome = filteredTransactions.filter(t => t.type === 'income' && !t.case_id).reduce((s,t)=>s+t.amount,0)
  const generalOfficeExpense = filteredTransactions.filter(t => t.type === 'expense' && !t.case_id).reduce((s,t)=>s+t.amount,0)
  const generalOfficeNet = generalOfficeIncome - generalOfficeExpense

  const groupedTransactions = filteredTransactions.reduce((groups, transaction) => {
    const caseId = transaction.case_id || 'genel_ofis'
    if (!groups[caseId]) {
      groups[caseId] = {
        case: transaction.case || null,
        transactions: [],
        totalIncome: 0,
        totalExpense: 0,
        isGeneralOffice: !transaction.case_id
      }
    }
    groups[caseId].transactions.push(transaction)
    if (transaction.type === 'income') {
      groups[caseId].totalIncome += transaction.amount
    } else {
      groups[caseId].totalExpense += transaction.amount
    }
    return groups
  }, {} as Record<string, {case: Case | null, transactions: IncomeExpense[], totalIncome: number, totalExpense: number, isGeneralOffice: boolean}>)

  // Genel Ofis grubu yoksa ekle (boş bile olsa göster)
  if (!groupedTransactions['genel_ofis']) {
    groupedTransactions['genel_ofis'] = {
      case: null,
      transactions: [],
      totalIncome: 0,
      totalExpense: 0,
      isGeneralOffice: true
    }
  }

  const handleShowCaseTransactions = (caseItem: Case | null, isGeneralOffice: boolean) => {
    const caseTransactions = isGeneralOffice 
      ? transactions.filter(t => !t.case_id)
      : transactions.filter(t => t.case_id === caseItem?.id)
    setSelectedCaseForTransaction({ case: caseItem!, transactions: caseTransactions })
    setCaseTransactionDialogOpen(true)
  }


  const getCategoryOptions = () => {
    if (transactionForm.type === 'income') return incomeCategories
    if (transactionForm.type === 'expense') return expenseCategories
    return []
  }

  const handleCreateTransaction = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const { data: { user } } = await sb.auth.getUser()
      if (!user) {
        toast.error('Giriş yapmanız gerekiyor')
        return
      }
      
      const { isRelatedToCase, ...formData } = transactionForm
      
      const { error } = await sb.from('income_expenses_2').insert({
        ...formData,
        case_id: isRelatedToCase && formData.case_id ? formData.case_id : null,
        amount: parseFloat(transactionForm.amount),
        created_by: user.id
      })
      if (error) throw error
      toast.success('İşlem başarıyla eklendi')
      setTransactionDialogOpen(false)
      setTransactionForm({ case_id: '', type: 'income', category: '', amount: '', description: '', transaction_date: new Date().toISOString().split('T')[0], isRelatedToCase: true })
      void loadData()
    } catch {
      toast.error('İşlem eklenemedi')
    }
  }

  const handleDeleteTransaction = async (transactionId: string) => {
    if (isReadOnly) return
    const confirmed = window.confirm('Bu işlemi silmek istediğinize emin misiniz?')
    if (!confirmed) return
    try {
      const { error } = await sb.from('income_expenses_2').delete().eq('id', transactionId)
      if (error) throw error
      toast.success('İşlem silindi')
      // UI state güncelle
      setTransactions(prev => prev.filter(t => t.id !== transactionId))
      setSelectedCaseForTransaction(prev => {
        if (!prev) return prev
        return {
          ...prev,
          transactions: prev.transactions.filter(t => t.id !== transactionId)
        }
      })
    } catch {
      toast.error('İşlem silinemedi')
    }
  }

  if (loading) {
    return <div className="flex justify-center items-center h-64">Yükleniyor...</div>
  }

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
        <div>
          <h1 className="text-lg md:text-xl lg:text-2xl font-bold text-gray-900 text-center md:text-left">Ofis Gelir-Gider Takibi</h1>
          <p className="text-xs md:text-sm text-gray-600 hidden md:block">Dosya ve genel ofis gelir-giderlerini takip edin</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={transactionDialogOpen} onOpenChange={(open) => {
            setTransactionDialogOpen(open)
            if (!open) {
              setTransactionForm({ case_id: '', type: 'income', category: '', amount: '', description: '', transaction_date: new Date().toISOString().split('T')[0], isRelatedToCase: true })
            }
          }}>
            <DialogTrigger asChild>
              {!isReadOnly && (
                <Button className="w-full sm:w-auto">
                  <Plus className="h-3 w-3 md:h-4 md:w-4 mr-2" />
                  <span className="text-xs md:text-sm">Yeni İşlem</span>
                </Button>
              )}
            </DialogTrigger>
            <DialogContent className="w-[95vw] sm:w-[90vw] md:max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-base md:text-lg">Yeni İşlem Ekle</DialogTitle>
                <DialogDescription className="text-xs md:text-sm">Dosya veya genel ofis gelir/gider işlemi ekleyin</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreateTransaction} className="space-y-4 md:space-y-6">
                <div className="flex items-center space-x-2 p-3 bg-gray-50 rounded-lg border">
                  <input
                    type="checkbox"
                    id="isRelatedToCase"
                    checked={transactionForm.isRelatedToCase}
                    onChange={(e) => setTransactionForm({ 
                      ...transactionForm, 
                      isRelatedToCase: e.target.checked,
                      case_id: e.target.checked ? transactionForm.case_id : ''
                    })}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <Label htmlFor="isRelatedToCase" className="text-sm font-medium text-gray-700 cursor-pointer">
                    Bu işlem bir dosya ile ilişkili
                  </Label>
                </div>
                {transactionForm.isRelatedToCase && (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-700">Dosya *</Label>
                    <Select value={transactionForm.case_id} onValueChange={(value) => setTransactionForm({ ...transactionForm, case_id: value })}>
                      <SelectTrigger className="h-11">
                        <SelectValue placeholder="Dosya seçin" />
                      </SelectTrigger>
                      <SelectContent>
                        {cases.map((caseItem) => {
                          const displayText = `${caseItem.court_name || 'Mahkeme belirtilmemiş'} - ${caseItem.case_no || 'Esas yok'}`
                          return (
                            <SelectItem key={caseItem.id} value={caseItem.id}>{displayText}</SelectItem>
                          )
                        })}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-700">İşlem Türü *</Label>
                    <Select value={transactionForm.type} onValueChange={(value: 'income' | 'expense') => setTransactionForm({ ...transactionForm, type: value, category: '' })}>
                      <SelectTrigger className="h-11">
                        <SelectValue placeholder="İşlem türünü seçin" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="income">Gelir</SelectItem>
                        <SelectItem value="expense">Gider</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-700">Kategori *</Label>
                    <Select value={transactionForm.category} onValueChange={(value) => setTransactionForm({ ...transactionForm, category: value })}>
                      <SelectTrigger className="h-11">
                        <SelectValue placeholder="Kategori seçin" />
                      </SelectTrigger>
                      <SelectContent>
                        {getCategoryOptions().map((category) => (
                          <SelectItem key={category} value={category}>{category}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-700">Tutar (TL) *</Label>
                    <Input type="number" value={transactionForm.amount} onChange={(e) => setTransactionForm({ ...transactionForm, amount: e.target.value })} className="h-11" placeholder="0.00" step="0.01" min="0" required />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-700">İşlem Tarihi *</Label>
                    <Input type="date" value={transactionForm.transaction_date} onChange={(e) => setTransactionForm({ ...transactionForm, transaction_date: e.target.value })} className="h-11" required />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700">Açıklama</Label>
                  <Textarea value={transactionForm.description} onChange={(e) => setTransactionForm({ ...transactionForm, description: e.target.value })} placeholder="İşlem açıklaması (opsiyonel)" className="min-h-[100px]" />
                </div>
                <div className="pt-2">
                  <Button type="submit" className="w-full h-11 text-base font-medium">İşlemi Kaydet</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6">
        <Card>
          <CardContent className="p-3 md:p-6">
            <div className="flex items-center gap-2 md:gap-0">
              <div className="p-2 md:p-3 rounded-lg bg-green-100 flex-shrink-0">
                <TrendingUp className="h-4 w-4 md:h-6 md:w-6 text-green-600" />
              </div>
              <div className="md:ml-4 min-w-0 flex-1">
                <p className="text-[10px] md:text-sm font-medium text-gray-600 truncate">Dosya Geliri</p>
                <p className="text-sm md:text-2xl font-bold text-green-600 truncate">{totalIncome.toLocaleString('tr-TR')} TL</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 md:p-6">
            <div className="flex items-center gap-2 md:gap-0">
              <div className="p-2 md:p-3 rounded-lg bg-red-100 flex-shrink-0">
                <TrendingDown className="h-4 w-4 md:h-6 md:w-6 text-red-600" />
              </div>
              <div className="md:ml-4 min-w-0 flex-1">
                <p className="text-[10px] md:text-sm font-medium text-gray-600 truncate">Dosya Gideri</p>
                <p className="text-sm md:text-2xl font-bold text-red-600 truncate">{totalExpense.toLocaleString('tr-TR')} TL</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 md:p-6">
            <div className="flex items-center gap-2 md:gap-0">
              <div className={`p-2 md:p-3 rounded-lg flex-shrink-0 ${netAmount >= 0 ? 'bg-blue-100' : 'bg-orange-100'}`}>
                <DollarSign className={`h-4 w-4 md:h-6 md:w-6 ${netAmount >= 0 ? 'text-blue-600' : 'text-orange-600'}`} />
              </div>
              <div className="md:ml-4 min-w-0 flex-1">
                <p className="text-[10px] md:text-sm font-medium text-gray-600 truncate">Dosya Net</p>
                <p className={`text-sm md:text-2xl font-bold truncate ${netAmount >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>{netAmount.toLocaleString('tr-TR')} TL</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white">
          <CardContent className="p-3 md:p-6">
            <div className="flex items-center gap-2 md:gap-0">
              <div className="p-2 md:p-3 rounded-lg bg-purple-100 flex-shrink-0">
                <Building2 className="h-4 w-4 md:h-6 md:w-6 text-purple-600" />
              </div>
              <div className="md:ml-4 min-w-0 flex-1">
                <p className="text-[10px] md:text-sm font-medium text-gray-600 truncate">Genel Ofis Net</p>
                <p className={`text-sm md:text-2xl font-bold truncate ${generalOfficeNet >= 0 ? 'text-purple-600' : 'text-red-600'}`}>{generalOfficeNet.toLocaleString('tr-TR')} TL</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-3 md:p-6">
          <div className="flex flex-col md:flex-row gap-3 md:gap-4">
            <div className="flex-1">
              <Label htmlFor="search" className="text-xs md:text-sm">Ara</Label>
              <div className="relative">
                <Search className="absolute left-3 top-2.5 md:top-3 h-3 w-3 md:h-4 md:w-4 text-gray-400" />
                <Input id="search" placeholder="Açıklama, kategori, mahkeme, esas no, müvekkil..." value={searchTerm} onChange={(e)=>setSearchTerm(e.target.value)} className="pl-9 md:pl-10 h-9 md:h-10 text-sm md:text-base" />
              </div>
            </div>
            <div className="w-full md:w-32">
              <Label htmlFor="type" className="text-xs md:text-sm">İşlem Türü</Label>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-full h-9 md:h-10 text-sm md:text-base"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tümü</SelectItem>
                  <SelectItem value="income">Gelir</SelectItem>
                  <SelectItem value="expense">Gider</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="w-full md:w-48">
              <Label htmlFor="category" className="text-xs md:text-sm">Kategori</Label>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-full h-9 md:h-10 text-sm md:text-base"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tümü</SelectItem>
                  {allCategories.map((c)=>(<SelectItem key={c} value={c}>{c}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="p-3 md:p-6">
          <CardTitle className="text-base md:text-xl">Dosya Bazında İşlemler</CardTitle>
          <CardDescription className="text-xs md:text-sm">
            {Object.keys(groupedTransactions).length} dosyada işlem var
          </CardDescription>
        </CardHeader>
        <CardContent className="p-3 md:p-6">
          {Object.keys(groupedTransactions).length > 0 ? (
            <>
              {/* Desktop Table View */}
              <div className="hidden lg:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Dosya</TableHead>
                      <TableHead>İşlem Sayısı</TableHead>
                      <TableHead>Toplam Gelir</TableHead>
                      <TableHead>Toplam Gider</TableHead>
                      <TableHead>Net Tutar</TableHead>
                      <TableHead>İşlemler</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Object.values(groupedTransactions)
                      .sort((a, b) => {
                        // Genel Ofis her zaman en üstte
                        if (a.isGeneralOffice) return -1
                        if (b.isGeneralOffice) return 1
                        return 0
                      })
                      .map((group, idx) => {
                      const netCaseAmount = group.totalIncome - group.totalExpense
                      return (
                        <TableRow key={group.case?.id || `genel_ofis_${idx}`}>
                          <TableCell>
                            <div>
                              {group.isGeneralOffice ? (
                                <>
                                  <div className="flex items-center gap-2">
                                    <Building2 className="h-4 w-4 text-purple-600" />
                                    <p className="font-medium text-purple-600">Genel Ofis</p>
                                  </div>
                                  <p className="text-sm text-gray-500">Dosya ile ilişkisiz işlemler</p>
                                </>
                              ) : (
                                <>
                                  <p className="font-medium">{group.case?.case_type}</p>
                                  {group.case?.court_name && (
                                    <p className="font-medium text-blue-600">{group.case.court_name}</p>
                                  )}
                                  {group.case?.case_no && (
                                    <p className="text-sm text-gray-500">Esas: {group.case.case_no}</p>
                                  )}
                                  {group.case?.client?.full_name && (
                                    <p className="text-sm text-gray-500">{group.case.client.full_name}</p>
                                  )}
                                </>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{group.transactions.length} işlem</Badge>
                          </TableCell>
                          <TableCell>
                            <span className="font-medium text-green-600">{group.totalIncome.toLocaleString('tr-TR')} TL</span>
                          </TableCell>
                          <TableCell>
                            <span className="font-medium text-red-600">{group.totalExpense.toLocaleString('tr-TR')} TL</span>
                          </TableCell>
                          <TableCell>
                            <span className={`font-medium ${netCaseAmount >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>{netCaseAmount.toLocaleString('tr-TR')} TL</span>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => handleShowCaseTransactions(group.case, group.isGeneralOffice)}
                                className="cursor-pointer"
                                title="İşlem detaylarını görüntüle"
                              >
                                <Info className="h-4 w-4" />
                              </Button>
                              {!isReadOnly && (
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  onClick={() => {
                                    if (group.isGeneralOffice) {
                                      // Genel ofis için
                                      setTransactionForm({
                                        case_id: '',
                                        type: 'income',
                                        category: '',
                                        amount: '',
                                        description: '',
                                        transaction_date: new Date().toISOString().split('T')[0],
                                        isRelatedToCase: false
                                      })
                                    } else {
                                      // Dosya için
                                      setTransactionForm({
                                        case_id: group.case?.id || '',
                                        type: 'income',
                                        category: '',
                                        amount: '',
                                        description: '',
                                        transaction_date: new Date().toISOString().split('T')[0],
                                        isRelatedToCase: true
                                      })
                                    }
                                    setTransactionDialogOpen(true)
                                  }}
                                  className="cursor-pointer"
                                  title={group.isGeneralOffice ? "Genel ofis işlemi ekle" : "Bu dosyaya işlem ekle"}
                                >
                                  <Plus className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile Card View */}
              <div className="lg:hidden space-y-3">
                {Object.values(groupedTransactions)
                  .sort((a, b) => {
                    // Genel Ofis her zaman en üstte
                    if (a.isGeneralOffice) return -1
                    if (b.isGeneralOffice) return 1
                    return 0
                  })
                  .map((group, idx) => {
                  const netCaseAmount = group.totalIncome - group.totalExpense
                  return (
                    <div key={group.case?.id || `genel_ofis_${idx}`} className="border rounded-lg p-3 md:p-4 space-y-3">
                      <div>
                        {group.isGeneralOffice ? (
                          <>
                            <div className="flex items-center gap-2 mb-1">
                              <Building2 className="h-4 w-4 text-purple-600" />
                              <p className="font-medium text-sm md:text-base text-purple-600">Genel Ofis</p>
                            </div>
                            <p className="text-[10px] md:text-xs text-gray-500">Dosya ile ilişkisiz işlemler</p>
                          </>
                        ) : (
                          <>
                            <p className="font-medium text-sm md:text-base">{group.case?.case_type}</p>
                            {group.case?.court_name && (
                              <p className="font-medium text-blue-600 text-xs md:text-sm">{group.case.court_name}</p>
                            )}
                            {group.case?.case_no && (
                              <p className="text-[10px] md:text-xs text-gray-500">Esas: {group.case.case_no}</p>
                            )}
                            {group.case?.client?.full_name && (
                              <p className="text-[10px] md:text-xs text-gray-500">{group.case.client.full_name}</p>
                            )}
                          </>
                        )}
                        <Badge variant="outline" className="mt-1 text-[10px] md:text-xs">{group.transactions.length} işlem</Badge>
                      </div>
                      
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div className="bg-green-50 rounded p-2">
                          <p className="text-[10px] md:text-xs text-gray-500 mb-1">Gelir</p>
                          <p className="font-medium text-green-600 text-xs md:text-sm">{group.totalIncome.toLocaleString('tr-TR')} TL</p>
                        </div>
                        <div className="bg-red-50 rounded p-2">
                          <p className="text-[10px] md:text-xs text-gray-500 mb-1">Gider</p>
                          <p className="font-medium text-red-600 text-xs md:text-sm">{group.totalExpense.toLocaleString('tr-TR')} TL</p>
                        </div>
                        <div className={`rounded p-2 ${netCaseAmount >= 0 ? 'bg-blue-50' : 'bg-orange-50'}`}>
                          <p className="text-[10px] md:text-xs text-gray-500 mb-1">Net</p>
                          <p className={`font-medium text-xs md:text-sm ${netCaseAmount >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>{netCaseAmount.toLocaleString('tr-TR')} TL</p>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleShowCaseTransactions(group.case, group.isGeneralOffice)}
                          className="flex-1 text-xs md:text-sm"
                          title="İşlem detaylarını görüntüle"
                        >
                          <Info className="h-3 w-3 md:h-4 md:w-4 mr-1" />
                          Detaylar
                        </Button>
                        {!isReadOnly && (
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => {
                              if (group.isGeneralOffice) {
                                // Genel ofis için
                                setTransactionForm({
                                  case_id: '',
                                  type: 'income',
                                  category: '',
                                  amount: '',
                                  description: '',
                                  transaction_date: new Date().toISOString().split('T')[0],
                                  isRelatedToCase: false
                                })
                              } else {
                                // Dosya için
                                setTransactionForm({
                                  case_id: group.case?.id || '',
                                  type: 'income',
                                  category: '',
                                  amount: '',
                                  description: '',
                                  transaction_date: new Date().toISOString().split('T')[0],
                                  isRelatedToCase: true
                                })
                              }
                              setTransactionDialogOpen(true)
                            }}
                            className="flex-1 text-xs md:text-sm"
                            title={group.isGeneralOffice ? "Genel ofis işlemi ekle" : "Bu dosyaya işlem ekle"}
                          >
                            <Plus className="h-3 w-3 md:h-4 md:w-4 mr-1" />
                            İşlem Ekle
                          </Button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
          ) : (
            <div className="text-center py-8">
              <DollarSign className="h-8 w-8 md:h-12 md:w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 text-sm md:text-base">Henüz işlem bulunmuyor</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dosya İşlem Detayları Modal */}
      <Dialog open={caseTransactionDialogOpen} onOpenChange={setCaseTransactionDialogOpen}>
        <DialogContent className="w-[95vw] sm:w-[90vw] md:max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader className="flex-shrink-0 p-3 md:p-6">
            <DialogTitle className="text-base md:text-xl font-semibold flex items-center gap-2">
              {selectedCaseForTransaction?.case 
                ? `${selectedCaseForTransaction.case.case_type} - İşlem Detayları`
                : (
                  <>
                    <Building2 className="h-5 w-5 text-purple-600" />
                    <span>Genel Ofis - İşlem Detayları</span>
                  </>
                )
              }
            </DialogTitle>
            <DialogDescription className="text-xs md:text-sm">
              {selectedCaseForTransaction?.case 
                ? 'Bu dosyaya ait tüm gelir-gider işlemleri'
                : 'Dosya ile ilişkilendirilmemiş genel ofis işlemleri'
              }
            </DialogDescription>
          </DialogHeader>
          {selectedCaseForTransaction && (
            <div className="flex-1 min-h-0 flex flex-col space-y-3 md:space-y-4 p-3 md:p-6 pt-0">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4 p-3 md:p-4 bg-gray-50 rounded-lg flex-shrink-0">
                {selectedCaseForTransaction.case ? (
                  <>
                <div className="text-center">
                  <p className="text-[10px] md:text-xs text-gray-500 mb-1">Esas No</p>
                  <p className="font-semibold text-xs md:text-sm truncate">{selectedCaseForTransaction.case.case_no || 'Belirtilmemiş'}</p>
                </div>
                {selectedCaseForTransaction.case.court_name && (
                  <div className="text-center">
                    <p className="text-[10px] md:text-xs text-gray-500 mb-1">Mahkeme</p>
                    <p className="font-semibold text-xs md:text-sm text-blue-600 truncate">{selectedCaseForTransaction.case.court_name}</p>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center">
                <p className="text-[10px] md:text-xs text-gray-500 mb-1">Tür</p>
                <div className="flex items-center justify-center gap-1.5">
                  <Building2 className="h-4 w-4 text-purple-600" />
                  <p className="font-semibold text-xs md:text-sm text-purple-600">Genel Ofis</p>
                </div>
              </div>
            )}
            <div className="text-center">
              <p className="text-[10px] md:text-xs text-gray-500 mb-1">İşlem Sayısı</p>
              <p className="font-semibold text-xs md:text-sm">{selectedCaseForTransaction?.transactions.length ?? 0}</p>
            </div>
            <div className="text-center">
              <p className="text-[10px] md:text-xs text-gray-500 mb-1">Toplam Gelir</p>
              <p className="font-semibold text-xs md:text-sm text-green-600 truncate">
                {(selectedCaseForTransaction?.transactions || []).filter(t => t.type === 'income').reduce((s,t)=>s+t.amount,0).toLocaleString('tr-TR')} TL
              </p>
            </div>
            <div className="text-center col-span-2 md:col-span-1">
              <p className="text-[10px] md:text-xs text-gray-500 mb-1">Toplam Gider</p>
              <p className="font-semibold text-xs md:text-sm text-red-600 truncate">
                {(selectedCaseForTransaction?.transactions || []).filter(t => t.type === 'expense').reduce((s,t)=>s+t.amount,0).toLocaleString('tr-TR')} TL
              </p>
            </div>
          </div>
          <div className="flex-1 min-h-0 overflow-hidden border rounded-lg">
            <div className="max-h-[50vh] md:max-h-[55vh] overflow-y-auto">
              <div className="space-y-2 md:space-y-3 p-2 md:p-4">
                {(selectedCaseForTransaction?.transactions || []).map((transaction) => (
                  <div key={transaction.id} className="bg-white border rounded-lg p-3 md:p-4 hover:shadow-sm transition-shadow">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <Badge variant={transaction.type === 'income' ? 'default' : 'destructive'} className="text-[10px] md:text-xs">
                            {transaction.type === 'income' ? 'Gelir' : 'Gider'}
                          </Badge>
                          <Badge variant="outline" className="text-[10px] md:text-xs">
                            {transaction.category}
                          </Badge>
                          <span className="text-[10px] md:text-xs text-gray-500">{new Date(transaction.transaction_date).toLocaleDateString('tr-TR')}</span>
                        </div>
                        {transaction.description && (
                          <p className="text-xs md:text-sm text-gray-700 mb-2 leading-relaxed">{transaction.description}</p>
                        )}
                        <div className="flex items-center justify-between">
                          <span className={`font-semibold text-sm md:text-lg ${transaction.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                            {transaction.amount.toLocaleString('tr-TR')} TL
                          </span>
                        </div>
                      </div>
                      {!isReadOnly && (
                        <div className="flex-shrink-0">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50 h-8 w-8 md:h-9 md:w-9"
                            title="İşlemi sil"
                            onClick={() => handleDeleteTransaction(transaction.id)}
                          >
                            <Trash2 className="h-3 w-3 md:h-4 md:w-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>


    </div>
  )
}


