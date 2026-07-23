'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function entrar(formData: FormData): Promise<{ error?: string }> {
  const email = String(formData.get('email') ?? '')
  const senha = String(formData.get('senha') ?? '')

  const supabase = await createClient()
  const { data: signInData, error } = await supabase.auth.signInWithPassword({ email, password: senha })
  if (error || !signInData.user) {
    return { error: 'E-mail ou senha inválidos.' }
  }

  const { data: usuario } = await supabase
    .from('usuarios')
    .select('role, empresa_id, empresas(ativo, data_vencimento)')
    .eq('id', signInData.user.id)
    .single<{ role: string; empresa_id: string | null; empresas: { ativo: boolean; data_vencimento: string } | null }>()

  if (!usuario) {
    await supabase.auth.signOut()
    return { error: 'Conta não encontrada.' }
  }

  if (usuario.role === 'admin') {
    redirect('/admin')
  }

  if (usuario.empresas && !usuario.empresas.ativo) {
    await supabase.auth.signOut()
    return { error: 'Esta conta está bloqueada. Entre em contato com o suporte.' }
  }

  if (usuario.empresas && usuario.empresas.data_vencimento < new Date().toISOString().slice(0, 10)) {
    await supabase.auth.signOut()
    return { error: 'Assinatura vencida. Entre em contato com o suporte para renovar.' }
  }

  await supabase.from('eventos_uso').insert({ empresa_id: usuario.empresa_id, tipo_evento: 'login' })

  redirect('/dashboard')
}
