'use client'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Plus, Search, Edit, Trash2, History, Info, Menu } from 'lucide-react'
import { supabaseBrowser } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { useUserRole } from '@/hooks/useUserRole'
import { CaseProgress, PROGRESS_TYPES, ProgressType } from '@/types/case-progress'

interface Client {
  id: string
  full_name: string
  tc_no?: string
  phone?: string
  email?: string
  created_at: string
}

interface Case {
  id: string
  case_type: string
  case_no?: string
  court_name?: string
  description?: string
  status: string
  client_id?: string
  created_at: string
  client?: Client
}

export default function DosyalarPage() {
  const [cases, setCases] = useState<Case[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const { isReadOnly } = useUserRole()
  const [statusFilter, setStatusFilter] = useState('all')
  
  // Dialog states
  const [clientDialogOpen, setClientDialogOpen] = useState(false)
  const [caseDialogOpen, setCaseDialogOpen] = useState(false)
  const [clientSelectDialogOpen, setClientSelectDialogOpen] = useState(false)
  const [editingCase, setEditingCase] = useState<Case | null>(null)
  
  // Safahat state'leri
  const [progressDialogOpen, setProgressDialogOpen] = useState(false)
  const [progressHistoryDialogOpen, setProgressHistoryDialogOpen] = useState(false)
  const [selectedCaseForProgress, setSelectedCaseForProgress] = useState<Case | null>(null)
  const [caseProgress, setCaseProgress] = useState<CaseProgress[]>([])
  const [progressForm, setProgressForm] = useState({
    progress_type: '' as ProgressType,
    custom_description: '',
    progress_date: new Date().toISOString().split('T')[0],
    notes: ''
  })
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())
  
  // Form states
  const [clientForm, setClientForm] = useState({ full_name: '', tc_no: '', phone: '', email: '' })
  const [caseForm, setCaseForm] = useState({ 
    case_type: '', 
    case_no: '', 
    court_name: '',
    description: '', 
    status: 'open', 
    client_id: ''
  })
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  
  // Dosya türü seçenekleri (Hukuk dosyaları için)
  const caseTypes = [
    'Boşanma Davası',
    'İcra Takibi',
    'Tazminat Davası',
    'İş Davası',
    'Miras Davası',
    'Alacak Davası',
    'Kira Uyuşmazlığı',
    'Ceza Davası',
    'Diğer'
  ]
  
  const sb = supabaseBrowser()

  useEffect(() => {
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const [casesResult, clientsResult] = await Promise.all([
        sb.from('cases_2')
          .select(`
            id, case_type, case_no, court_name, description, status, client_id, created_at,
            client:clients(id, full_name, phone, email)
          `)
          .order('created_at', { ascending: false }),
        sb.from('clients').select('*').order('full_name')
      ])

      setCases((casesResult.data as unknown as Case[]) || [])
      setClients((clientsResult.data as unknown as Client[]) || [])
    } catch {
      console.error('Veri yüklenirken hata')
      toast.error('Veriler yüklenirken hata oluştu')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      // Kullanıcı bilgisini al
      const { data: { user } } = await sb.auth.getUser()
      if (!user) {
        toast.error('Giriş yapmanız gerekiyor')
        return
      }

      const { error } = await sb.from('clients').insert({
        ...clientForm,
        created_by: user.id
      })
      if (error) throw error
      
      toast.success('Müvekkil başarıyla eklendi')
      setClientForm({ full_name: '', tc_no: '', phone: '', email: '' })
      setClientDialogOpen(false)
      loadData()
    } catch {
      toast.error('Hata')
    }
  }

  // Safahat fonksiyonları
  const handleAddProgress = (caseItem: Case) => {
    setSelectedCaseForProgress(caseItem)
    setProgressForm({
      progress_type: '' as ProgressType,
      custom_description: '',
      progress_date: new Date().toISOString().split('T')[0],
      notes: ''
    })
    setProgressDialogOpen(true)
  }

  const handleCreateProgress = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (!selectedCaseForProgress) return

      const { data: { user } } = await sb.auth.getUser()
      if (!user) {
        toast.error('Giriş yapmanız gerekiyor')
        return
      }

      const progressData = {
        case_id: selectedCaseForProgress.id,
        progress_type: progressForm.progress_type,
        custom_description: null,
        progress_date: progressForm.progress_date,
        notes: progressForm.notes || null,
        created_by: user.id
      }

      const { error } = await sb.from('case_progress_2').insert(progressData)
      if (error) throw error
      
      toast.success('Safahat kaydı eklendi')
      setProgressDialogOpen(false)
      loadData()
    } catch {
      toast.error('Hata')
    }
  }

  const handleShowProgressHistory = async (caseItem: Case) => {
    try {
      setSelectedCaseForProgress(caseItem)
      
      const { data, error } = await sb
        .from('case_progress_2')
        .select('*')
        .eq('case_id', caseItem.id)
        .order('progress_date', { ascending: false })

      if (error) throw error
      
      setCaseProgress(data || [])
      setProgressHistoryDialogOpen(true)
    } catch {
      toast.error('Safahat geçmişi yüklenirken hata oluştu')
    }
  }

  const toggleRowExpansion = (caseId: string) => {
    const newExpandedRows = new Set(expandedRows)
    if (newExpandedRows.has(caseId)) {
      newExpandedRows.delete(caseId)
    } else {
      newExpandedRows.add(caseId)
    }
    setExpandedRows(newExpandedRows)
  }

  const handleCreateCase = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const { data: { user } } = await sb.auth.getUser()
      if (!user) {
        toast.error('Giriş yapmanız gerekiyor')
        return
      }

      const newCase = {
        case_type: caseForm.case_type,
        case_no: caseForm.case_no || null,
        court_name: caseForm.court_name || null,
        description: caseForm.description || null,
        status: caseForm.status,
        client_id: caseForm.client_id,
        created_by: user.id
      }

      const { error } = await sb.from('cases_2').insert(newCase)
      if (error) throw error
      
      toast.success('Dosya başarıyla oluşturuldu')
      
      setCaseForm({ case_type: '', case_no: '', court_name: '', description: '', status: 'open', client_id: '' })
      setSelectedClient(null)
      setCaseDialogOpen(false)
      loadData()
    } catch {
      toast.error('Hata')
    }
  }

  const handleEditCase = (caseItem: Case) => {
    setEditingCase(caseItem)
    
    setCaseForm({
      case_type: caseItem.case_type,
      case_no: caseItem.case_no || '',
      court_name: caseItem.court_name || '',
      description: caseItem.description || '',
      status: caseItem.status,
      client_id: caseItem.client_id || ''
    })
    
    const client = clients.find(c => c.id === caseItem.client_id)
    setSelectedClient(client || null)
    
    setCaseDialogOpen(true)
  }

  const handleUpdateCase = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingCase) return

    try {
      const { error } = await sb
        .from('cases_2')
        .update({
          case_type: caseForm.case_type,
          case_no: caseForm.case_no || null,
          court_name: caseForm.court_name || null,
          description: caseForm.description || null,
          status: caseForm.status,
          client_id: caseForm.client_id
        })
        .eq('id', editingCase.id)

      if (error) throw error
      
      toast.success('Dosya bilgileri güncellendi')
      setCaseForm({ case_type: '', case_no: '', court_name: '', description: '', status: 'open', client_id: '' })
      setSelectedClient(null)
      setEditingCase(null)
      setCaseDialogOpen(false)
      loadData()
    } catch {
      toast.error('Hata')
    }
  }

  const handleDeleteCase = async (id: string) => {
    if (!confirm('Bu dosyayı silmek istediğinizden emin misiniz?')) return
    
    try {
      const { error } = await sb.from('cases_2').delete().eq('id', id)
      if (error) throw error
      
      toast.success('Dosya silindi')
      loadData()
    } catch {
      toast.error('Hata')
    }
  }

  const handleToggleStatus = async (e: React.MouseEvent, caseItem: Case) => {
    e.preventDefault()
    e.stopPropagation()
    
    const newStatus = caseItem.status === 'open' ? 'closed' : 'open'
    const statusText = newStatus === 'open' ? 'açık' : 'kapalı'
    
    try {
      const { error } = await sb
        .from('cases_2')
        .update({ status: newStatus })
        .eq('id', caseItem.id)

      if (error) throw error
      
      toast.success(`Dosya ${statusText} olarak işaretlendi`)
      loadData()
    } catch {
      toast.error('Hata')
    }
  }

  const filteredCases = cases.filter(caseItem => {
    const matchesSearch = caseItem.case_type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         caseItem.case_no?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         caseItem.court_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         caseItem.client?.full_name.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === 'all' || caseItem.status === statusFilter
    return matchesSearch && matchesStatus
  })

  if (loading) {
    return <div className="flex justify-center items-center h-64">Yükleniyor...</div>
  }

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
        <div>
          <h1 className="text-lg md:text-xl lg:text-2xl font-bold text-gray-900 text-center md:text-left">Dava Dosyaları</h1>
          <p className="text-xs md:text-sm text-gray-600 hidden md:block">Hukuk dosyalarını ve müvekkil bilgilerini yönetin</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Dialog open={clientDialogOpen} onOpenChange={setClientDialogOpen}>
            <DialogTrigger asChild>
              {!isReadOnly && (
                <Button variant="outline" className="flex-1 sm:flex-none">
                  <Plus className="h-3 w-3 md:h-4 md:w-4 mr-2" />
                  <span className="text-xs md:text-sm">Yeni Müvekkil</span>
                </Button>
              )}
            </DialogTrigger>
            <DialogContent className="w-[95vw] sm:w-[90vw] md:max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-base md:text-lg">Yeni Müvekkil Ekle</DialogTitle>
                <DialogDescription className="text-xs md:text-sm">
                  Yeni müvekkil bilgilerini girin
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreateClient} className="space-y-4 md:space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="full_name" className="text-xs md:text-sm font-medium text-gray-700">
                    Ad Soyad *
                  </Label>
                  <Input
                    id="full_name"
                    value={clientForm.full_name}
                    onChange={(e) => setClientForm({...clientForm, full_name: e.target.value})}
                    required
                    className="h-9 md:h-11 text-sm md:text-base"
                    placeholder="Müvekkil adı ve soyadı"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="tc_no" className="text-xs md:text-sm font-medium text-gray-700">
                    TC Kimlik No
                  </Label>
                  <Input
                    id="tc_no"
                    value={clientForm.tc_no}
                    onChange={(e) => setClientForm({...clientForm, tc_no: e.target.value})}
                    placeholder="11 haneli TC kimlik numarası"
                    maxLength={11}
                    className="h-9 md:h-11 text-sm md:text-base"
                  />
                  <p className="text-[10px] md:text-xs text-gray-500">Opsiyonel - 11 haneli TC kimlik numarası</p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="phone" className="text-xs md:text-sm font-medium text-gray-700">
                      Telefon
                    </Label>
                    <Input
                      id="phone"
                      value={clientForm.phone}
                      onChange={(e) => setClientForm({...clientForm, phone: e.target.value})}
                      placeholder="0555 123 45 67"
                      className="h-9 md:h-11 text-sm md:text-base"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-xs md:text-sm font-medium text-gray-700">
                      E-posta
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      value={clientForm.email}
                      onChange={(e) => setClientForm({...clientForm, email: e.target.value})}
                      placeholder="ornek@email.com"
                      className="h-9 md:h-11 text-sm md:text-base"
                    />
                  </div>
                </div>
                
                <div className="pt-2 md:pt-4">
                  <Button type="submit" className="w-full h-9 md:h-11 text-sm md:text-base font-medium">
                    Yeni Müvekkil Ekle
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>

          <Dialog open={caseDialogOpen} onOpenChange={(open) => {
            setCaseDialogOpen(open)
            if (!open) {
              setEditingCase(null)
              setCaseForm({ case_type: '', case_no: '', court_name: '', description: '', status: 'open', client_id: '' })
              setSelectedClient(null)
            }
          }}>
            <DialogTrigger asChild>
              {!isReadOnly && (
                <Button className="flex-1 sm:flex-none">
                  <Plus className="h-3 w-3 md:h-4 md:w-4 mr-2" />
                  <span className="text-xs md:text-sm">Yeni Dosya</span>
                </Button>
              )}
            </DialogTrigger>
            <DialogContent className="w-[95vw] sm:w-[90vw] md:max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-base md:text-lg">
                {editingCase ? 'Dosya Düzenle' : 'Yeni Dosya Oluştur'}
              </DialogTitle>
              <DialogDescription className="text-xs md:text-sm">
                {editingCase ? 'Dosya bilgilerini güncelleyin' : 'Yeni dava dosyası bilgilerini girin'}
              </DialogDescription>
            </DialogHeader>
              <form onSubmit={editingCase ? handleUpdateCase : handleCreateCase} className="space-y-4 md:space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="case_type" className="text-xs md:text-sm font-medium text-gray-700">
                    Dosya Türü *
                  </Label>
                  <Select value={caseForm.case_type} onValueChange={(value) => setCaseForm({...caseForm, case_type: value})}>
                    <SelectTrigger className="h-9 md:h-11 text-sm md:text-base">
                      <SelectValue placeholder="Dosya türünü seçin" />
                    </SelectTrigger>
                    <SelectContent>
                      {caseTypes.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="client_id" className="text-xs md:text-sm font-medium text-gray-700">
                    Müvekkil *
                  </Label>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <Input
                        value={selectedClient?.full_name || ''}
                        placeholder="Müvekkil seçin"
                        readOnly
                        className="h-9 md:h-11 text-sm md:text-base"
                        required
                      />
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setClientSelectDialogOpen(true)}
                      className="h-9 md:h-11 px-3 md:px-4 cursor-pointer text-xs md:text-sm"
                    >
                      Seç
                    </Button>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="court_name" className="text-xs md:text-sm font-medium text-gray-700">
                    Mahkeme Adı *
                  </Label>
                  <Input
                    id="court_name"
                    value={caseForm.court_name}
                    onChange={(e) => setCaseForm({...caseForm, court_name: e.target.value})}
                    required
                    className="h-9 md:h-11 text-sm md:text-base"
                    placeholder="Örn: İstanbul 1. Asliye Hukuk Mahkemesi"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="case_no" className="text-xs md:text-sm font-medium text-gray-700">
                    Esas Numarası
                  </Label>
                  <Input
                    id="case_no"
                    value={caseForm.case_no}
                    onChange={(e) => setCaseForm({...caseForm, case_no: e.target.value})}
                    className="h-9 md:h-11 text-sm md:text-base"
                    placeholder="Örn: 2024/123 Esas"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="description" className="text-xs md:text-sm font-medium text-gray-700">
                    Açıklama
                  </Label>
                  <Textarea
                    id="description"
                    value={caseForm.description}
                    onChange={(e) => setCaseForm({...caseForm, description: e.target.value})}
                    placeholder="Dosya hakkında açıklama (opsiyonel)"
                    className="min-h-[80px] md:min-h-[100px] text-sm md:text-base"
                  />
                </div>
                
                <div className="pt-2 md:pt-4">
                  <Button type="submit" className="w-full h-9 md:h-11 text-sm md:text-base font-medium">
                    {editingCase ? 'Dosya Bilgilerini Güncelle' : 'Yeni Dosya Oluştur'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>

          {/* Müvekkil Seçim Dialog'u */}
          <Dialog open={clientSelectDialogOpen} onOpenChange={setClientSelectDialogOpen}>
            <DialogContent className="w-[95vw] sm:w-[90vw] md:max-w-3xl max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-base md:text-xl font-semibold">Müvekkil Seç</DialogTitle>
                <DialogDescription className="text-xs md:text-base">
                  Bu dosyayı hangi müvekkile bağlayacağınızı seçin
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-6">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                  <Input
                    placeholder="Müvekkil adı, TC kimlik no veya telefon ile ara..."
                    className="pl-12 h-12 text-base"
                  />
                </div>
                
                <div className="max-h-96 overflow-y-auto space-y-3">
                  {clients.length > 0 ? (
                    clients.map((client) => (
                      <div
                        key={client.id}
                        className={`p-4 border-2 rounded-xl cursor-pointer transition-all duration-200 hover:shadow-md ${
                          selectedClient?.id === client.id 
                            ? 'bg-blue-50 border-blue-300 shadow-md' 
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                        onClick={() => {
                          setSelectedClient(client)
                          setCaseForm({...caseForm, client_id: client.id})
                          setClientSelectDialogOpen(false)
                        }}
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <h3 className="font-semibold text-lg text-gray-900 mb-1">
                              {client.full_name}
                            </h3>
                            <div className="space-y-1">
                              {client.tc_no && (
                                <p className="text-sm text-gray-600">
                                  <span className="font-medium">TC:</span> {client.tc_no}
                                </p>
                              )}
                              {client.phone && (
                                <p className="text-sm text-gray-600">
                                  <span className="font-medium">Tel:</span> {client.phone}
                                </p>
                              )}
                              {client.email && (
                                <p className="text-sm text-gray-600">
                                  <span className="font-medium">E-posta:</span> {client.email}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="ml-4 text-right">
                            <Badge variant="outline" className="mb-2">
                              {cases.filter(c => c.client_id === client.id).length} dosya
                            </Badge>
                            <p className="text-xs text-gray-500">
                              {new Date(client.created_at).toLocaleDateString('tr-TR')}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-12">
                      <div className="text-gray-400 mb-4">
                        <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                      </div>
                      <h3 className="text-lg font-medium text-gray-900 mb-2">Henüz müvekkil bulunmuyor</h3>
                      <p className="text-gray-500 mb-4">Önce müvekkil eklemeniz gerekiyor</p>
                      <Button 
                        variant="outline" 
                        onClick={() => {
                          setClientSelectDialogOpen(false)
                          setClientDialogOpen(true)
                        }}
                        className="cursor-pointer"
                      >
                        Yeni Müvekkil Ekle
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Filtreler */}
      <Card>
        <CardContent className="p-3 md:p-6">
          <div className="flex flex-col md:flex-row gap-3 md:gap-4">
            <div className="flex-1">
              <Label htmlFor="search" className="text-xs md:text-sm">Ara</Label>
              <div className="relative">
                <Search className="absolute left-3 top-2.5 md:top-3 h-3 w-3 md:h-4 md:w-4 text-gray-400" />
                <Input
                  id="search"
                  placeholder="Dosya başlığı, numarası veya müvekkil adı..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 md:pl-10 h-9 md:h-10 text-sm md:text-base"
                />
              </div>
            </div>
            <div className="w-full md:w-40">
              <Label htmlFor="status" className="text-xs md:text-sm">Durum</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full h-9 md:h-10 text-sm md:text-base">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tümü</SelectItem>
                  <SelectItem value="open">Açık</SelectItem>
                  <SelectItem value="closed">Kapalı</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Dosya Listesi */}
      <Card>
        <CardHeader className="p-3 md:p-6">
          <CardTitle className="text-base md:text-xl">Dosya Listesi</CardTitle>
          <CardDescription className="text-xs md:text-sm">
            {filteredCases.length} dosya bulundu
          </CardDescription>
        </CardHeader>
        <CardContent className="p-3 md:p-6">
          {filteredCases.length > 0 ? (
            <>
              {/* Desktop Table View */}
              <div className="hidden lg:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Müvekkil Adı</TableHead>
                      <TableHead>Dosya Türü</TableHead>
                      <TableHead>Mahkeme Adı</TableHead>
                      <TableHead>Esas Numarası</TableHead>
                      <TableHead>Durum</TableHead>
                      <TableHead>Tarih</TableHead>
                      <TableHead>İşlemler</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCases.map((caseItem) => (
                      <TableRow key={caseItem.id}>
                        <TableCell className="font-medium">{caseItem.client?.full_name || '-'}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{caseItem.case_type}</Badge>
                        </TableCell>
                        <TableCell>
                          {caseItem.court_name ? (
                            <span className="text-sm font-medium text-blue-600">
                              {caseItem.court_name}
                            </span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </TableCell>
                        <TableCell>{caseItem.case_no || '-'}</TableCell>
                        <TableCell>
                          <Badge 
                            variant={caseItem.status === 'open' ? 'default' : 'secondary'}
                            className="cursor-pointer hover:opacity-80 transition-opacity"
                            onClick={(e) => handleToggleStatus(e, caseItem)}
                            title={`Durumu değiştir (${caseItem.status === 'open' ? 'Kapalı' : 'Açık'} yap)`}
                          >
                            {caseItem.status === 'open' ? 'Açık' : 'Kapalı'}
                          </Badge>
                        </TableCell>
                        
                        <TableCell>
                          {new Date(caseItem.created_at).toLocaleDateString('tr-TR')}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button 
                              size="sm" 
                              variant="ghost"
                              onClick={() => toggleRowExpansion(caseItem.id)}
                              className="cursor-pointer"
                              title="İşlem seçenekleri"
                            >
                                <Menu className="h-4 w-4" />
                            </Button>
                            
                            {expandedRows.has(caseItem.id) && (
                              <div className="flex gap-2 animate-in slide-in-from-left-2 duration-200">
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  onClick={() => handleShowProgressHistory(caseItem)}
                                  className="cursor-pointer"
                                  title="Safahat geçmişi"
                                >
                                  <Info className="h-4 w-4" />
                                </Button>
                                {!isReadOnly && (
                                  <>
                                    <Button 
                                      size="sm" 
                                      variant="outline"
                                      onClick={() => handleAddProgress(caseItem)}
                                      className="cursor-pointer"
                                      title="Safahat ekle"
                                    >
                                      <History className="h-4 w-4" />
                                    </Button>
                                    <Button 
                                      size="sm" 
                                      variant="outline"
                                      onClick={() => handleEditCase(caseItem)}
                                      className="cursor-pointer"
                                      title="Düzenle"
                                    >
                                      <Edit className="h-4 w-4" />
                                    </Button>
                                    <Button 
                                      size="sm" 
                                      variant="outline" 
                                      onClick={() => handleDeleteCase(caseItem.id)}
                                      className="cursor-pointer"
                                      title="Sil"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </>
                                )}
                              </div>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile Card View */}
              <div className="lg:hidden space-y-3">
                {filteredCases.map((caseItem) => (
                  <div key={caseItem.id} className="border rounded-lg p-3 md:p-4 space-y-3">
                    <div className="flex justify-between items-start gap-2">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-sm md:text-base truncate">{caseItem.client?.full_name || 'Müvekkil belirtilmemiş'}</h3>
                        <Badge variant="outline" className="mt-1 text-[10px] md:text-xs">{caseItem.case_type}</Badge>
                      </div>
                      <Badge 
                        variant={caseItem.status === 'open' ? 'default' : 'secondary'}
                        className="cursor-pointer hover:opacity-80 transition-opacity text-[10px] md:text-xs flex-shrink-0"
                        onClick={(e) => handleToggleStatus(e, caseItem)}
                        title={`Durumu değiştir (${caseItem.status === 'open' ? 'Kapalı' : 'Açık'} yap)`}
                      >
                        {caseItem.status === 'open' ? 'Açık' : 'Kapalı'}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-1 gap-2 text-xs md:text-sm">
                      {caseItem.court_name && (
                        <div>
                          <span className="text-gray-500">Mahkeme:</span>
                          <p className="font-medium text-blue-600">{caseItem.court_name}</p>
                        </div>
                      )}
                      {caseItem.case_no && (
                        <div>
                          <span className="text-gray-500">Esas No:</span>
                          <p className="font-medium">{caseItem.case_no}</p>
                        </div>
                      )}
                      <div>
                        <span className="text-gray-500">Tarih:</span>
                        <p className="font-medium">{new Date(caseItem.created_at).toLocaleDateString('tr-TR')}</p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleShowProgressHistory(caseItem)}
                        className="flex-1 text-xs md:text-sm"
                        title="Safahat geçmişi"
                      >
                        <Info className="h-3 w-3 md:h-4 md:w-4 mr-1" />
                        Safahat
                      </Button>
                      {!isReadOnly && (
                        <>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handleAddProgress(caseItem)}
                            className="flex-1 text-xs md:text-sm"
                            title="Safahat ekle"
                          >
                            <History className="h-3 w-3 md:h-4 md:w-4 mr-1" />
                            Ekle
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handleEditCase(caseItem)}
                            className="flex-1 text-xs md:text-sm"
                            title="Düzenle"
                          >
                            <Edit className="h-3 w-3 md:h-4 md:w-4 mr-1" />
                            Düzenle
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline" 
                            onClick={() => handleDeleteCase(caseItem.id)}
                            className="flex-1 text-xs md:text-sm"
                            title="Sil"
                          >
                            <Trash2 className="h-3 w-3 md:h-4 md:w-4 mr-1" />
                            Sil
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500 text-sm md:text-base">Henüz dosya bulunmuyor</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Safahat Ekleme Modal */}
      <Dialog open={progressDialogOpen} onOpenChange={setProgressDialogOpen}>
        <DialogContent className="w-[95vw] sm:w-[90vw] md:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base md:text-lg">Safahat Ekle</DialogTitle>
            <DialogDescription className="text-xs md:text-sm">
              {selectedCaseForProgress?.case_type} - {selectedCaseForProgress?.case_no || 'Dosya'} için safahat kaydı ekleyin
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateProgress} className="space-y-4 md:space-y-6">
            <div className="space-y-2">
              <Label htmlFor="progress_type" className="text-sm font-medium text-gray-700">
                Safahat Türü *
              </Label>
              <Select value={progressForm.progress_type} onValueChange={(value: ProgressType) => setProgressForm({...progressForm, progress_type: value})}>
                <SelectTrigger className="h-11">
                  <SelectValue placeholder="Safahat türünü seçin" />
                </SelectTrigger>
                <SelectContent>
                  {PROGRESS_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {progressForm.progress_type === 'diğer' && (
              <div className="space-y-2">
                <Label htmlFor="custom_description" className="text-sm font-medium text-gray-700">
                  Açıklama *
                </Label>
                <Input
                  id="custom_description"
                  value={progressForm.custom_description}
                  onChange={(e) => setProgressForm({...progressForm, custom_description: e.target.value})}
                  required
                  className="h-11"
                  placeholder="Özel safahat açıklaması"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="progress_date" className="text-sm font-medium text-gray-700">
                Tarih *
              </Label>
              <Input
                id="progress_date"
                type="date"
                value={progressForm.progress_date}
                onChange={(e) => setProgressForm({...progressForm, progress_date: e.target.value})}
                required
                className="h-11"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes" className="text-sm font-medium text-gray-700">
                Notlar
              </Label>
              <Textarea
                id="notes"
                value={progressForm.notes}
                onChange={(e) => setProgressForm({...progressForm, notes: e.target.value})}
                placeholder="Ek notlar (opsiyonel)"
                className="min-h-[100px]"
              />
            </div>

            <div className="pt-4">
              <Button type="submit" className="w-full h-11 text-base font-medium">
                Safahat Ekle
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Safahat Geçmişi Modal */}
      <Dialog open={progressHistoryDialogOpen} onOpenChange={setProgressHistoryDialogOpen}>
        <DialogContent className="w-[95vw] sm:w-[90vw] md:max-w-4xl max-h-[85vh] flex flex-col overflow-hidden">
          <DialogHeader className="flex-shrink-0 p-3 md:p-6">
            <DialogTitle className="text-base md:text-xl font-semibold">
              Safahat Geçmişi - {selectedCaseForProgress?.case_type}
            </DialogTitle>
            <DialogDescription className="text-xs md:text-sm">
              Dosyanın safahat süreci tarih sırasına göre listelenmiştir
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 overflow-hidden">
            <div className="h-full overflow-y-auto">
              {caseProgress.length > 0 ? (
                <div className="space-y-4">
                  {caseProgress.map((progress) => {
                    const progressType = PROGRESS_TYPES.find(t => t.value === progress.progress_type)
                    const displayText = progressType ? progressType.label : progress.custom_description || 'Bilinmeyen'
                    
                    return (
                      <div key={progress.id} className="border rounded-lg p-4 bg-white shadow-sm">
                        <div className="mb-2 flex items-start justify-between">
                          <div>
                            <h4 className="font-medium text-gray-900">{displayText}</h4>
                            <p className="text-sm text-gray-500">
                              {new Date(progress.progress_date).toLocaleDateString('tr-TR')}
                            </p>
                          </div>
                          {!isReadOnly && (
                            <Button
                              size="icon"
                              variant="ghost"
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              title="Safahat kaydını sil"
                              onClick={async () => {
                                const confirmed = window.confirm('Bu safahat kaydını silmek istiyor musunuz?')
                                if (!confirmed) return
                                try {
                                  const { error } = await sb.from('case_progress_2').delete().eq('id', progress.id)
                                  if (error) throw error
                                  setCaseProgress(prev => prev.filter(p => p.id !== progress.id))
                                  toast.success('Safahat kaydı silindi')
                                } catch {
                                  toast.error('Safahat kaydı silinemedi')
                                }
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                        {progress.notes && (
                          <p className="text-sm text-gray-600 mt-2 bg-gray-50 p-2 rounded">
                            {progress.notes}
                          </p>
                        )}
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="text-gray-400 mb-4">
                    <History className="w-16 h-16 mx-auto" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Henüz safahat kaydı yok</h3>
                  <p className="text-gray-500">Bu dosya için henüz safahat kaydı eklenmemiş</p>
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
