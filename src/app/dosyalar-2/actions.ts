'use server'
import { supabaseServer } from '@/lib/supabase/server'

export async function createClientAction(data: {full_name: string; phone?: string; email?: string}) {
  const sb = supabaseServer()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) throw new Error('Giriş gerekli')
  const { error } = await sb.from('clients').insert({ ...data, created_by: user.id })
  if (error) throw error
}

export async function createCaseAction(data: {client_id?: string; case_no?: string; title: string; description?: string}) {
  const sb = supabaseServer()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) throw new Error('Giriş gerekli')
  const { error } = await sb.from('cases').insert({ ...data, created_by: user.id })
  if (error) throw error
}

export async function listCasesAction(query?: {text?: string; status?: string}) {
  const sb = supabaseServer()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return []
  let q = sb.from('cases').select('id,title,case_no,status,created_at,client_id')
  q = q.eq('created_by', user.id)
  if (query?.status) q = q.eq('status', query.status)
  if (query?.text) q = q.ilike('title', `%${query.text}%`)
  const { data, error } = await q.order('created_at', { ascending: false })
  if (error) throw error
  return data
}




