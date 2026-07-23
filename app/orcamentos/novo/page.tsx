import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { OrcamentoBuilder } from '@/components/OrcamentoBuilder'
import { criarOrcamento } from './actions'
import type { Empresa, ItemBiblioteca } from '@/lib/types'

export default async function NovoOrcamentoPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: usuario } = await supabase.from('usuarios').select('empresa_id').eq('id', user!.id).single()
  if (!usuario) redirect('/login')

  const { data: empresa } = await supabase.from('empresas').select('*').eq('id', usuario.empresa_id).single<Empresa>()
  const { data: biblioteca } = await supabase
    .from('itens_biblioteca_empresa')
    .select('*')
    .eq('empresa_id', usuario.empresa_id)
    .returns<ItemBiblioteca[]>()

  const criarComEmpresa = criarOrcamento.bind(null, usuario.empresa_id)

  return (
    <OrcamentoBuilder
      biblioteca={biblioteca ?? []}
      segmentoPadrao={empresa?.segmento_padrao ?? 'geral'}
      empresaNome={empresa?.nome ?? ''}
      onSalvar={criarComEmpresa}
    />
  )
}
