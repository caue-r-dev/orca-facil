import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { NovaContaForm } from './NovaContaForm'

export default async function NovaContaPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: usuarioAtual } = await supabase.from('usuarios').select('role').eq('id', user.id).single<{ role: string }>()
  if (!usuarioAtual || usuarioAtual.role !== 'admin') redirect('/dashboard')

  const vencimentoPadrao = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)

  return (
    <main className="mx-auto max-w-md px-6 py-12">
      <h1 className="text-2xl font-bold text-blueprint-deep">Criar conta de prestador</h1>
      <NovaContaForm vencimentoPadrao={vencimentoPadrao} />
    </main>
  )
}
