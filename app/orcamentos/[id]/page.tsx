import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { OrcamentoBuilder } from '@/components/OrcamentoBuilder'
import { atualizarOrcamento } from './actions'
import { PublicarOrcamento } from './PublicarOrcamento'
import type { AmbienteOrcamento, Empresa, ItemBiblioteca, ItemOrcamento, Orcamento } from '@/lib/types'

export default async function EditarOrcamentoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: usuario } = await supabase.from('usuarios').select('empresa_id').eq('id', user!.id).single()
  if (!usuario) redirect('/login')

  const { data: orcamento } = await supabase.from('orcamentos').select('*').eq('id', id).single<Orcamento>()
  if (!orcamento) notFound()

  const { data: itens } = await supabase.from('itens_orcamento').select('*').eq('orcamento_id', id).returns<ItemOrcamento[]>()
  const { data: ambientes } = await supabase.from('ambientes_orcamento').select('*').eq('orcamento_id', id).returns<AmbienteOrcamento[]>()
  const { data: empresa } = await supabase.from('empresas').select('*').eq('id', usuario.empresa_id).single<Empresa>()
  const { data: biblioteca } = await supabase
    .from('itens_biblioteca_empresa')
    .select('*')
    .eq('empresa_id', usuario.empresa_id)
    .returns<ItemBiblioteca[]>()

  const atualizarComId = atualizarOrcamento.bind(null, id)

  return (
    <>
    <div className="mx-auto max-w-6xl px-5 pt-6">
      <PublicarOrcamento orcamentoId={id} statusInicial={orcamento.status} />
    </div>
    <OrcamentoBuilder
      biblioteca={biblioteca ?? []}
      segmentoPadrao={empresa?.segmento_padrao ?? 'geral'}
      temParede={empresa?.tem_parede ?? false}
      empresaNome={empresa?.nome ?? ''}
      cnpj={empresa?.cnpj}
      telefone={empresa?.telefone}
      numeroOrcamento={orcamento.id.slice(0, 8).toUpperCase()}
      dataCriacao={new Date(orcamento.created_at).toLocaleDateString('pt-BR')}
      valoresIniciais={{
        clienteNome: orcamento.cliente_nome,
        clienteContato: orcamento.cliente_contato ?? '',
        obraEndereco: orcamento.obra_endereco ?? '',
        prazoExecucao: orcamento.prazo_execucao ?? '',
        validadeDias: orcamento.validade_dias,
        formaPagamento: orcamento.forma_pagamento ?? '',
        itens: itens ?? [],
        ambientes: ambientes ?? [],
      }}
      onSalvar={atualizarComId}
    />
    </>
  )
}
