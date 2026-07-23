'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function entrar(formData: FormData): Promise<{ error?: string }> {
  const email = String(formData.get('email') ?? '')
  const senha = String(formData.get('senha') ?? '')

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password: senha })
  if (error) {
    return { error: 'E-mail ou senha inválidos.' }
  }
  redirect('/dashboard')
}
