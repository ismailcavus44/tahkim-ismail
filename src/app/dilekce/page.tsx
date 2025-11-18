'use client'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { FileText, Download, Eye } from 'lucide-react'
import { Document, Packer, Paragraph, TextRun, AlignmentType } from 'docx'
import { saveAs } from 'file-saver'
import { toast } from 'sonner'
import { supabaseBrowser } from '@/lib/supabase/client'
import { useUserRole } from '@/hooks/useUserRole'

interface DilekceForm {
  dilekceTuru: string
  mahkeme: string
  davaNo: string
  davaci: string
  davali: string
  konu: string
  talep: string
  tarih: string
  avukat: string
}

interface ClientLite {
  id: string
  full_name: string
  tc_no?: string | null
}

interface InsuranceForm {
  client_id: string
  client_name: string
  client_tc: string
  client_address: string
  insurer_name: string
  insurer_address: string
  client_plate: string
  opponent_plate: string
  amount: string
  policy_no: string
  policy_date: string
  accident_date: string
}

export default function DilekcePage() {
  const { isReadOnly } = useUserRole()
  const [form, setForm] = useState<DilekceForm>({
    dilekceTuru: '',
    mahkeme: '',
    davaNo: '',
    davaci: '',
    davali: '',
    konu: '',
    talep: '',
    tarih: new Date().toLocaleDateString('tr-TR'),
    avukat: ''
  })

  const [clients, setClients] = useState<ClientLite[]>([])
  const [insuranceForm, setInsuranceForm] = useState<InsuranceForm>({
    client_id: '',
    client_name: '',
    client_tc: '',
    client_address: '',
    insurer_name: '',
    insurer_address: '',
    client_plate: '',
    opponent_plate: '',
    amount: '',
    policy_no: '',
    policy_date: '',
    accident_date: ''
  })

  const formatAmountTR = (value: string) => {
    if (!value) return '...'
    const normalized = value.toString().replace(/\s/g, '').replace(/\./g, '').replace(',', '.')
    const num = Number(normalized)
    if (Number.isNaN(num)) return value
    return new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(num)
  }

  const dilekceTurleri = [
    'Sigorta Başvurusu',
    'Tahkim Başvuru Formu'
  ]

  useEffect(() => {
    const fetchClients = async () => {
      try {
        const supabase = supabaseBrowser()
        const { data, error } = await supabase
          .from('clients')
          .select('id, full_name, tc_no')
          .order('full_name', { ascending: true })
        if (error) throw error
        setClients((data || []) as ClientLite[])
      } catch (err) {
        console.error('Müvekkiller alınamadı:', err)
        toast.error('Müvekkiller alınamadı')
      }
    }
    fetchClients()
  }, [])

  const generateDocument = async () => {
    try {
      const doc = new Document({
        sections: [{
          properties: {},
          children: [
            // Başlık
            new Paragraph({
              children: [
                new TextRun({
                  text: form.dilekceTuru,
                  bold: true,
                  size: 32,
                }),
              ],
              alignment: AlignmentType.CENTER,
              spacing: { after: 400 },
            }),

            // Mahkeme bilgisi
            new Paragraph({
              children: [
                new TextRun({
                  text: `${form.mahkeme} MAHKEMESİ'NE`,
                  bold: true,
                  size: 28,
                }),
              ],
              alignment: AlignmentType.CENTER,
              spacing: { after: 400 },
            }),

            // Dava bilgileri
            new Paragraph({
              children: [
                new TextRun({
                  text: `DAVA NO: ${form.davaNo}`,
                  bold: true,
                  size: 24,
                }),
              ],
              spacing: { after: 200 },
            }),

            new Paragraph({
              children: [
                new TextRun({
                  text: `DAVACI: ${form.davaci}`,
                  bold: true,
                  size: 24,
                }),
              ],
              spacing: { after: 200 },
            }),

            new Paragraph({
              children: [
                new TextRun({
                  text: `DAVALI: ${form.davali}`,
                  bold: true,
                  size: 24,
                }),
              ],
              spacing: { after: 400 },
            }),

            // Dilekçe içeriği
            new Paragraph({
              children: [
                new TextRun({
                  text: "KONU:",
                  bold: true,
                  size: 24,
                }),
              ],
              spacing: { after: 200 },
            }),

            new Paragraph({
              children: [
                new TextRun({
                  text: form.konu,
                  size: 24,
                }),
              ],
              spacing: { after: 400 },
            }),

            new Paragraph({
              children: [
                new TextRun({
                  text: "TALEP:",
                  bold: true,
                  size: 24,
                }),
              ],
              spacing: { after: 200 },
            }),

            new Paragraph({
              children: [
                new TextRun({
                  text: form.talep,
                  size: 24,
                }),
              ],
              spacing: { after: 400 },
            }),

            // İmza bölümü
            new Paragraph({
              children: [
                new TextRun({
                  text: "Gereğinin saygılarımla arz edilir.",
                  size: 24,
                }),
              ],
              spacing: { after: 600 },
            }),

            new Paragraph({
              children: [
                new TextRun({
                  text: form.tarih,
                  size: 24,
                }),
              ],
              alignment: AlignmentType.RIGHT,
              spacing: { after: 200 },
            }),

            new Paragraph({
              children: [
                new TextRun({
                  text: form.avukat,
                  bold: true,
                  size: 24,
                }),
              ],
              alignment: AlignmentType.RIGHT,
            }),
          ],
        }],
      })

      const blob = await Packer.toBlob(doc)
      const fileName = `${form.dilekceTuru}_${form.davaNo}_${new Date().toISOString().split('T')[0]}.docx`
      saveAs(blob, fileName)
      
      toast.success('Dilekçe başarıyla oluşturuldu ve indirildi!')
    } catch (error) {
      console.error('Dilekçe oluşturulurken hata:', error)
      toast.error('Dilekçe oluşturulurken hata oluştu')
    }
  }

  const generateInsuranceDocument = async () => {
    try {
      const doc = new Document({
        sections: [{
          properties: {},
          children: [
            // Sigorta şirketi
            new Paragraph({
              children: [
                new TextRun({ text: insuranceForm.insurer_name, bold: true, size: 28 })
              ],
              alignment: AlignmentType.CENTER,
              spacing: { after: 100 }
            }),
            ...(insuranceForm.insurer_address
              ? [new Paragraph({
                  children: [new TextRun({ text: insuranceForm.insurer_address, size: 22 })],
                  alignment: AlignmentType.CENTER,
                  spacing: { after: 400 }
                })]
              : []),

            // Başlık blokları
            new Paragraph({
              children: [
                new TextRun({ text: 'MÜRACAAT EDEN/MAĞDUR', bold: true, size: 24 }),
                new TextRun({ text: ' : ' }),
                new TextRun({ text: `${insuranceForm.client_name} (T.C.Kimlik No: ${insuranceForm.client_tc || '-'})`, size: 24 })
              ],
              spacing: { after: 200 }
            }),
            ...(insuranceForm.client_address ? [
              new Paragraph({
                children: [ new TextRun({ text: `\t${insuranceForm.client_address}`, size: 22 }) ],
                spacing: { after: 200 }
              })
            ] : []),
            new Paragraph({
              children: [
                new TextRun({ text: 'VEKİLİ', bold: true, size: 24 }),
                new TextRun({ text: ' : ' }),
                new TextRun({ text: 'Av. Samet AYGÜN (Manisa Barosu 2606 Sicil No)', size: 24 })
              ],
              spacing: { after: 50 }
            }),
            new Paragraph({
              children: [
                new TextRun({ text: "\tUncubozköy Mahallesi 5515 Sokak No:31 Manisa Meydan AVM A4  Blok Kat:13 Daire:160 Yunusemre/MANİSA", size: 22 })
              ],
              spacing: { after: 150 }
            }),
            new Paragraph({
              children: [
                new TextRun({ text: 'KONU', bold: true, size: 24 }),
                new TextRun({ text: ' : ' }),
                new TextRun({ text: `Yaşanan trafik kazası neticesi müvekkilin ${insuranceForm.client_plate || '...'} plaka sayılı aracında meydana gelen ${insuranceForm.amount || '...'} TL Araç Değer Kaybı Bedelinin (fazlaya ilişkin haklarımız saklı kalmak kaydıyla), Zorunlu Sorumluluk Sigortasından kaynaklı teminat limiti ile sınırlı olmak kaydıyla işbu başvurunun şirketinize ulaştığı tarihten itibaren 15 gün içinde mağdur vekili ${form.avukat || '...'}'e ait Vakıf Bank TR66 0001 5001 5800 7300 1461 98 IBAN no'lu hesaba yatırılması talebidir.`, size: 24 })
              ],
              spacing: { after: 400 }
            }),

            // Açıklamalar
            new Paragraph({ children: [ new TextRun({ text: 'AÇIKLAMALAR	:', bold: true, size: 24 }) ], spacing: { after: 200 } }),
            new Paragraph({
              children: [
                new TextRun({ text: `${insuranceForm.accident_date || '...'} tarihinde müvekkil ${insuranceForm.client_name} adına kayıtlı ${insuranceForm.client_plate || '...'} plaka sayılı aracına, şirketinize ${insuranceForm.policy_no || '...'} no'lu poliçe ile ZMMS sigortalı bulunan ${insuranceForm.opponent_plate || '...'} plaka sayılı aracın çarpması neticesi maddi hasarlı trafik kazası meydana gelmiştir.`, size: 22 })
              ],
              spacing: { after: 200 }
            }),
            new Paragraph({
              children: [
                new TextRun({ text: `Meydana gelen kaza ${insuranceForm.opponent_plate || '...'} plaka sayılı aracın asli ve tam kusuru ile meydana gelmiş, müvekkile ait araç hasar görmüştür. İşbu nedenle;`, size: 22 })
              ],
              spacing: { after: 200 }
            }),
            new Paragraph({
              children: [
                new TextRun({ text: `Fazlaya ilişkin haklarımız saklı kalmak kaydıyla, ekte sunulan belgelerden faydalanılarak; Yaşanan trafik kazası neticesi müvekkilin ${insuranceForm.client_plate || '...'} plaka sayılı aracında meydana gelen ARAÇ DEĞER KAYBI BEDELİNİN Zorunlu Sorumluluk Sigortasından kaynaklı ${insuranceForm.amount || '...'} TL teminat limiti ile sınırlı olmak kaydıyla, işbu başvurunun şirketinize ulaştığı tarihten itibaren 15 gün içinde mağdur vekili ${form.avukat || '...'}'e ait Vakıf Bank TR66 0001 5001 5800 7300 1461 98 IBAN no'lu hesaba yatırılması, aksi taktirde aleyhinize yargı yoluna başvurulacağı, yargılama masrafı, ticari temerrüt faizi ve avukatlık ücretinden sorumlu tutulacağınız hususlarını ihtaren bildiririz. ${form.tarih}`, size: 22 })
              ],
              spacing: { after: 300 }
            }),
            new Paragraph({
              children: [ new TextRun({ text: "(Aşağıda liste halinde, Zorunlu Mali Mesuliyet Sigortası Genel Şartları Ekinde belirtilen belgeler, huzurdaki dilekçe ekinde şirketinize sunulmaktadır.)", size: 22 }) ],
              spacing: { after: 300 }
            }),

            // Ekler
            new Paragraph({ children: [new TextRun({ text: 'EKLERİ\t\t:', bold: true, size: 24 })], spacing: { after: 200 } }),
            new Paragraph({ children: [new TextRun({ text: 'Maddi Hasarlı Trafik Kazası Tespit Tutanağı (Ek-1),', size: 22 })], spacing: { after: 50 } }),
            new Paragraph({ children: [new TextRun({ text: 'Mağdur araca ait ruhsatname ve ehliyet fotokopisi. (Ek-2),', size: 22 })], spacing: { after: 50 } }),
            new Paragraph({ children: [new TextRun({ text: "Elvan Meydanlıoğlu Sigorta Ekspertiz'in düzenlediği hasar tespit, onarım ve montaj işçiliklerini gösterir tablo (Ek-3),", size: 22 })], spacing: { after: 50 } }),
            new Paragraph({ children: [new TextRun({ text: 'Mağdur araca ait fotoğraflar (Ek-4),', size: 22 })], spacing: { after: 50 } }),
            new Paragraph({ children: [new TextRun({ text: 'Iban no yukarıda belirtilmektedir,', size: 22 })], spacing: { after: 50 } }),
            new Paragraph({ children: [new TextRun({ text: 'Vekaletname sureti.', size: 22 })], spacing: { after: 300 } }),

            // Sonuç ve talep
            new Paragraph({
              children: [
                new TextRun({ text: 'SONUÇ VE İSTEM:', bold: true, size: 24 })
              ],
              spacing: { after: 200 }
            }),
            new Paragraph({
              children: [
                new TextRun({ text: `Yukarıda arz ve izah edilen nedenlerle; müvekkilin ${insuranceForm.client_plate || '...'} plakalı aracına ilişkin hasar ve araç değer kaybı bedelinin (${(insuranceForm.amount || '...')} TL) tarafımıza ödenmesini, aksi halde yasal yollara başvuracağımızı bilgilerinize sunarız.`, size: 22 })
              ],
              spacing: { after: 400 }
            }),

            // İmza
            new Paragraph({ children: [ new TextRun({ text: 'BAŞVURUDA BULUNAN MAĞDUR', bold: true, size: 22 }) ], alignment: AlignmentType.RIGHT }),
            new Paragraph({ children: [ new TextRun({ text: 'VEKİLİ', bold: true, size: 22 }) ], alignment: AlignmentType.RIGHT }),
            new Paragraph({ children: [ new TextRun({ text: form.avukat || 'Avukat', bold: true, size: 22 }) ], alignment: AlignmentType.RIGHT })
          ]
        }]
      })

      const blob = await Packer.toBlob(doc)
      const fileName = `Sigorta_Basvurusu_${insuranceForm.client_plate || 'PLAKA'}_${new Date().toISOString().split('T')[0]}.docx`
      saveAs(blob, fileName)
      toast.success('Sigorta başvuru dilekçesi indirildi')
    } catch (error) {
      console.error('Sigorta başvurusu oluşturulurken hata:', error)
      toast.error('Sigorta başvurusu oluşturulurken hata oluştu')
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!form.dilekceTuru) {
      toast.error('Lütfen dilekçe türünü seçin')
      return
    }

    if (form.dilekceTuru === 'Sigorta Başvurusu') {
      // Validasyon
      const required = [
        insuranceForm.client_id,
        insuranceForm.client_plate,
        insuranceForm.opponent_plate,
        insuranceForm.amount,
        insuranceForm.policy_no,
        insuranceForm.policy_date,
        insuranceForm.accident_date,
        insuranceForm.insurer_name,
        form.avukat
      ]
      if (required.some((v) => !v || String(v).trim() === '')) {
        toast.error('Lütfen Sigorta Başvurusu alanlarını eksiksiz doldurun')
        return
      }
      void generateInsuranceDocument()
      return
    }

    // Diğer türler (mevcut genel şablon)
    if (!form.mahkeme || !form.davaNo || !form.davaci || !form.davali || !form.konu || !form.talep || !form.avukat) {
      toast.error('Lütfen tüm alanları doldurun')
      return
    }
    generateDocument()
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-lg md:text-xl lg:text-2xl font-bold text-gray-900 text-center md:text-left">Dilekçe Oluştur</h1>
          <p className="text-gray-600 hidden md:block">Otomatik dilekçe oluşturun ve Word dosyası olarak indirin</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Eye className="h-4 w-4 mr-2" />
            Önizle
          </Button>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <FileText className="h-5 w-5 mr-2" />
              Dilekçe Bilgileri
            </CardTitle>
            <CardDescription>
              Dilekçe için gerekli bilgileri girin
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="dilekceTuru" className="text-sm font-medium text-gray-700">
                  Dilekçe Türü *
                </Label>
                <Select value={form.dilekceTuru} onValueChange={(value) => setForm({...form, dilekceTuru: value})} disabled={isReadOnly}>
                  <SelectTrigger className="h-11">
                    <SelectValue placeholder="Dilekçe türünü seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    {dilekceTurleri.map((turu) => (
                      <SelectItem key={turu} value={turu}>
                        {turu}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {form.dilekceTuru === 'Sigorta Başvurusu' ? (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-gray-700">Müvekkil *</Label>
                      <Select value={insuranceForm.client_id} onValueChange={(value) => {
                        const selected = clients.find(c => c.id === value)
                        setInsuranceForm({
                          ...insuranceForm,
                          client_id: value,
                          client_name: selected?.full_name || '',
                          client_tc: selected?.tc_no || ''
                        })
                      }}>
                        <SelectTrigger className="h-11">
                          <SelectValue placeholder="Müvekkil seçin" />
                        </SelectTrigger>
                        <SelectContent>
                          {clients.map((c) => (
                            <SelectItem key={c.id} value={c.id}>{c.full_name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-gray-700">T.C. Kimlik No</Label>
                      <Input value={insuranceForm.client_tc} readOnly className="h-11 bg-gray-50" disabled={isReadOnly} />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-700">Müvekkil Adresi</Label>
                    <Textarea value={insuranceForm.client_address} onChange={(e) => setInsuranceForm({...insuranceForm, client_address: e.target.value})} placeholder="Müvekkil adresi (istemiyorsanız boş bırakın)" className="min-h-[80px]" disabled={isReadOnly} />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-gray-700">Müvekkil Araç Plakası *</Label>
                      <Input value={insuranceForm.client_plate} onChange={(e) => setInsuranceForm({...insuranceForm, client_plate: e.target.value.toUpperCase()})} className="h-11" placeholder="Örn: 35 ABC 123" disabled={isReadOnly} />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-gray-700">Karşı Araç Plakası *</Label>
                      <Input value={insuranceForm.opponent_plate} onChange={(e) => setInsuranceForm({...insuranceForm, opponent_plate: e.target.value.toUpperCase()})} className="h-11" placeholder="Örn: 45 XYZ 987" disabled={isReadOnly} />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-gray-700">Tutar (TL) *</Label>
                      <Input type="number" value={insuranceForm.amount} onChange={(e) => setInsuranceForm({...insuranceForm, amount: e.target.value})} className="h-11" placeholder="Örn: 300000" disabled={isReadOnly} />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-gray-700">Kaza Tarihi *</Label>
                      <Input value={insuranceForm.accident_date} onChange={(e) => setInsuranceForm({...insuranceForm, accident_date: e.target.value})} className="h-11" placeholder="GG/AA/YYYY" disabled={isReadOnly} />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-gray-700">Poliçe No *</Label>
                      <Input value={insuranceForm.policy_no} onChange={(e) => setInsuranceForm({...insuranceForm, policy_no: e.target.value})} className="h-11" placeholder="Poliçe numarası" disabled={isReadOnly} />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-gray-700">Poliçe Tarihi *</Label>
                      <Input value={insuranceForm.policy_date} onChange={(e) => setInsuranceForm({...insuranceForm, policy_date: e.target.value})} className="h-11" placeholder="GG/AA/YYYY" disabled={isReadOnly} />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-700">Sigorta Şirketi *</Label>
                    <Input value={insuranceForm.insurer_name} onChange={(e) => setInsuranceForm({...insuranceForm, insurer_name: e.target.value})} className="h-11" placeholder="Örn: Ankara Sigorta A.Ş." disabled={isReadOnly} />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-700">Sigorta Şirketi Adresi</Label>
                    <Textarea value={insuranceForm.insurer_address} onChange={(e) => setInsuranceForm({...insuranceForm, insurer_address: e.target.value})} placeholder="Adres" className="min-h-[80px]" disabled={isReadOnly} />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-700">Avukat *</Label>
                    <Input value={form.avukat} onChange={(e) => setForm({...form, avukat: e.target.value})} className="h-11" placeholder="Avukat adı soyadı" />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-700">Tarih *</Label>
                    <Input value={form.tarih} onChange={(e) => setForm({...form, tarih: e.target.value})} className="h-11" placeholder="GG/AA/YYYY" />
                  </div>
                </>
              ) : (
                <>
                  {/* Eski genel şablon alanları, diğer türler için */}
                  <div className="space-y-2">
                    <Label htmlFor="mahkeme" className="text-sm font-medium text-gray-700">Mahkeme *</Label>
                    <Input id="mahkeme" value={form.mahkeme} onChange={(e) => setForm({...form, mahkeme: e.target.value})} className="h-11" placeholder="Örn: İstanbul 1. Asliye Hukuk Mahkemesi" />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="davaNo" className="text-sm font-medium text-gray-700">Dava No *</Label>
                      <Input id="davaNo" value={form.davaNo} onChange={(e) => setForm({...form, davaNo: e.target.value})} className="h-11" placeholder="Örn: 2025/123" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="tarih" className="text-sm font-medium text-gray-700">Tarih *</Label>
                      <Input id="tarih" value={form.tarih} onChange={(e) => setForm({...form, tarih: e.target.value})} className="h-11" placeholder="GG/AA/YYYY" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="davaci" className="text-sm font-medium text-gray-700">Davacı *</Label>
                    <Input id="davaci" value={form.davaci} onChange={(e) => setForm({...form, davaci: e.target.value})} className="h-11" placeholder="Davacı adı soyadı" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="davali" className="text-sm font-medium text-gray-700">Davalı *</Label>
                    <Input id="davali" value={form.davali} onChange={(e) => setForm({...form, davali: e.target.value})} className="h-11" placeholder="Davalı adı soyadı" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="konu" className="text-sm font-medium text-gray-700">Konu *</Label>
                    <Textarea id="konu" value={form.konu} onChange={(e) => setForm({...form, konu: e.target.value})} placeholder="Dava konusunu açıklayın" className="min-h-[100px]" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="talep" className="text-sm font-medium text-gray-700">Talep *</Label>
                    <Textarea id="talep" value={form.talep} onChange={(e) => setForm({...form, talep: e.target.value})} placeholder="Mahkemeden talep edilenleri yazın" className="min-h-[100px]" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-700">Avukat *</Label>
                    <Input value={form.avukat} onChange={(e) => setForm({...form, avukat: e.target.value})} className="h-11" placeholder="Avukat adı soyadı" />
                  </div>
                </>
              )}

              <div className="pt-4">
                <Button type="submit" className="w-full h-11 text-base font-medium">
                  <Download className="h-4 w-4 mr-2" />
                  Dilekçeyi Oluştur ve İndir
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Önizleme */}
        <Card>
          <CardHeader>
            <CardTitle>Dilekçe Önizlemesi</CardTitle>
            <CardDescription>
              Oluşturulacak dilekçenin önizlemesi
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="p-6 bg-white border rounded-lg min-h-[600px]">
              {form.dilekceTuru === 'Sigorta Başvurusu' ? (
                <>
                  <div className="text-center mb-8">
                    <h2 className="text-2xl font-bold mb-2">{insuranceForm.insurer_name || 'Ankara Sigorta A.Ş.'}</h2>
                    <p className="text-sm text-gray-600 whitespace-pre-line">{insuranceForm.insurer_address || "Ünalan Mahallesi Libadiye Caddesi No:84/2 İç Kapı No:1 Üsküdar/İstanbul"}</p>
                  </div>

                  <div className="space-y-2 mb-6">
                    <p><strong>MÜRACAAT EDEN/MAĞDUR</strong> : {insuranceForm.client_name || 'Müvekkil'} (T.C.Kimlik No: {insuranceForm.client_tc || '-'})</p>
                    {insuranceForm.client_address && (
                      <p className="whitespace-pre-line">{insuranceForm.client_address}</p>
                    )}
                    <p><strong>VEKİLİ</strong> : Av. Samet AYGÜN (Manisa Barosu 2606 Sicil No)</p>
                    <p className="whitespace-pre-line">Uncubozköy Mahallesi 5515 Sokak No:31 Manisa Meydan AVM A4  Blok Kat:13 Daire:160 Yunusemre/MANİSA</p>
                  </div>

                  <div className="space-y-2 mb-6">
                    <p className="font-bold">KONU :</p>
                    <p className="text-sm">
                      Yaşanan trafik kazası neticesi müvekkilin {insuranceForm.client_plate || '...'} plaka sayılı aracında meydana gelen {formatAmountTR(insuranceForm.amount)} TL Araç Değer Kaybı Bedelinin (fazlaya ilişkin haklarımız saklı kalmak kaydıyla), Zorunlu Sorumluluk Sigortasından kaynaklı teminat limiti ile sınırlı olmak kaydıyla işbu başvurunun şirketinize ulaştığı tarihten itibaren 15 gün içinde mağdur vekili {form.avukat || 'Av. Samet AYGÜN'}’e ait Vakıf Bank TR66 0001 5001 5800 7300 1461 98 IBAN no’lu hesaba yatırılması talebidir.
                    </p>
                  </div>

                  <div className="space-y-3 mb-8 text-sm">
                    <p className="font-bold">AÇIKLAMALAR :</p>
                    <p>{insuranceForm.accident_date || '...'} tarihinde müvekkil {insuranceForm.client_name || '...'} adına kayıtlı {insuranceForm.client_plate || '...'} plaka sayılı aracına, şirketinize {insuranceForm.policy_no || '...'} no’lu poliçe ile ZMMS sigortalı bulunan {insuranceForm.opponent_plate || '...'} plaka sayılı aracın çarpması neticesi maddi hasarlı trafik kazası meydana gelmiştir.</p>
                    <p>Meydana gelen kaza {insuranceForm.opponent_plate || '...'} plaka sayılı aracın asli ve tam kusuru ile meydana gelmiş, müvekkile ait araç hasar görmüştür. İşbu nedenle;</p>
                    <p>Fazlaya ilişkin haklarımız saklı kalmak kaydıyla, ekte sunulan belgelerden faydalanılarak; Yaşanan trafik kazası neticesi müvekkilin {insuranceForm.client_plate || '...'} plaka sayılı aracında meydana gelen ARAÇ DEĞER KAYBI BEDELİNİN Zorunlu Sorumluluk Sigortasından kaynaklı {formatAmountTR(insuranceForm.amount)} TL teminat limiti ile sınırlı olmak kaydıyla, işbu başvurunun şirketinize ulaştığı tarihten itibaren 15 gün içinde mağdur vekili {form.avukat || 'Av. Samet AYGÜN'}’e ait Vakıf Bank TR66 0001 5001 5800 7300 1461 98 IBAN no’lu hesaba yatırılması, aksi taktirde aleyhinize yargı yoluna başvurulacağı, yargılama masrafı, ticari temerrüt faizi ve avukatlık ücretinden sorumlu tutulacağınız hususlarını ihtaren bildiririz. {form.tarih}</p>
                    <p className="text-xs mt-2">(Aşağıda liste halinde, Zorunlu Mali Mesuliyet Sigortası Genel Şartları Ekinde belirtilen belgeler, huzurdaki dilekçe ekinde şirketinize sunulmaktadır.)</p>
                  </div>

                  <div className="text-right space-y-1">
                    <p className="font-semibold">BAŞVURUDA BULUNAN MAĞDUR</p>
                    <p className="font-semibold">VEKİLİ</p>
                    <p className="font-bold">{form.avukat || 'Av. Samet AYGÜN'}</p>
                  </div>

                  <div className="mt-8 text-sm">
                    <p className="font-semibold">EKLER:</p>
                    <ol className="list-decimal ml-5 space-y-1">
                      <li>Maddi Hasarlı Trafik Kazası Tespit Tutanağı (Ek-1)</li>
                      <li>Araç ruhsatnamesi ve sürücü belgesi fotokopileri (Ek-2)</li>
                      <li>Sigorta ekspertiz/hasar tespit raporu ve işçilik kalemleri (Ek-3)</li>
                      <li>Araca ait fotoğraflar (Ek-4)</li>
                      <li>IBAN ve iletişim bilgileri (Ek-5)</li>
                      <li>Vekaletname sureti (Ek-6)</li>
                    </ol>
                  </div>
                </>
              ) : (
                <>
                  <div className="text-center mb-8">
                    <h2 className="text-2xl font-bold mb-4">{form.dilekceTuru || 'Dilekçe Türü'}</h2>
                    <h3 className="text-xl font-bold">{form.mahkeme || 'Mahkeme'} MAHKEMESİ’NE</h3>
                  </div>
                  <div className="space-y-4 mb-8">
                    <p><strong>DAVA NO:</strong> {form.davaNo || 'Dava No'}</p>
                    <p><strong>DAVACI:</strong> {form.davaci || 'Davacı'}</p>
                    <p><strong>DAVALI:</strong> {form.davali || 'Davalı'}</p>
                  </div>
                  <div className="space-y-4 mb-8">
                    <div>
                      <p className="font-bold mb-2">KONU:</p>
                      <p className="text-sm">{form.konu || 'Konu bilgisi girilmedi'}</p>
                    </div>
                    <div>
                      <p className="font-bold mb-2">TALEP:</p>
                      <p className="text-sm">{form.talep || 'Talep bilgisi girilmedi'}</p>
                    </div>
                  </div>
                  <div className="text-right space-y-2">
                    <p>Gereğinin saygılarımla arz edilir.</p>
                    <p>{form.tarih}</p>
                    <p className="font-bold">{form.avukat || 'Avukat'}</p>
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

