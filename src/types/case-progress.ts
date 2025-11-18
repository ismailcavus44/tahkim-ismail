export interface CaseProgress {
  id: string
  case_id: string
  progress_type: string
  custom_description?: string
  progress_date: string
  notes?: string
  created_by: string
  created_at: string
  case?: {
    id: string
    title: string
    case_no?: string
  }
}

export const PROGRESS_TYPES = [
  { value: 'dilekce_sunuldu', label: 'Dava dilekçesi mahkemeye sunuldu' },
  { value: 'harc_yatirildi', label: 'Dava harç ve giderleri yatırıldı, dosya esas kaydına alındı' },
  { value: 'tensip_zapti', label: 'Tensip zaptı düzenlendi' },
  { value: 'teatisi_basladi', label: 'Dilekçe teatisi başlatıldı' },
  { value: 'teblig_cikarildi', label: 'Davalıya dava dilekçesi tebliğe çıkarıldı' },
  { value: 'cevap_suresi', label: 'Davalının cevap süresi başladı' },
  { value: 'cevap_sunuldu', label: 'Davalı tarafından cevap dilekçesi sunuldu' },
  { value: 'karsi_beyan', label: 'Davacı olarak cevaplara karşı beyanda bulunuldu' },
  { value: 'ikinci_cevap', label: 'Davalının ikinci cevap dilekçesi' },
  { value: 'teatisi_tamamlandi', label: 'Dilekçe teatisi tamamlandı' },
  { value: 'on_inceleme_gun', label: 'Ön inceleme duruşma günü verildi' },
  { value: 'on_inceleme_katilim', label: 'Ön inceleme duruşmasına katılım sağlandı' },
  { value: 'delil_sunuldu', label: 'Tarafların delil listesi ve delilleri sunuldu' },
  { value: 'tanik_listesi', label: 'Tanık listesi bildirildi' },
  { value: 'muzekkereler', label: 'Delillerin toplanması için müzekkereler yazıldı' },
  { value: 'bilirkisi_tevdi', label: 'Bilirkişi incelemesi için dosya tevdi edildi' },
  { value: 'bilirkisi_rapor', label: 'Bilirkişi raporu dosyaya sunuldu' },
  { value: 'bilirkisi_itiraz', label: 'Bilirkişi raporuna itiraz dilekçesi sunuldu' },
  { value: 'tanik_dinlendi', label: 'Tanıklar dinlendi' },
  { value: 'kesif', label: 'Keşif işlemi gerçekleştirildi' },
  { value: 'tahkikat_tamamlandi', label: 'Deliller toplandı, tahkikat aşaması tamamlandı' },
  { value: 'sozlu_yargilama', label: 'Sözlü yargılama günü verildi' },
  { value: 'esas_beyan', label: 'Esasa ilişkin beyan dilekçesi sunuldu' },
  { value: 'dosya_birakildi', label: 'Dosya karar için mahkemeye bırakıldı' },
  { value: 'karar_teblig', label: 'Mahkeme kararı tebliğe çıkarıldı' },
  { value: 'istinaf_basvuru', label: 'İstinaf yoluna başvuruldu' },
  { value: 'istinaf_karar', label: 'İstinaf karar verdi' },
  { value: 'temyiz_basvuru', label: 'Temyiz başvurusu yapıldı' },
  { value: 'yargitay_karar', label: 'Yargıtay kararı verildi' },
  { value: 'karar_kesinlesti', label: 'Karar kesinleşti' }
] as const

export type ProgressType = typeof PROGRESS_TYPES[number]['value']

