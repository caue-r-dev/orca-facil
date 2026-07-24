import { notFound } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import { OrcamentoPreview } from '@/components/OrcamentoPreview'
import { nomeServicoSemAmbiente } from '@/lib/calc'
import type { AmbienteOrcamento, Empresa, ItemOrcamento, Orcamento } from '@/lib/types'
import { SEGMENTOS } from '@/lib/segmentos-seed'
import { PrintButton } from './PrintButton'

export default async function OrcamentoPublicoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const admin = createAdminClient()

  const { data: orcamento } = await admin.from('orcamentos').select('*').eq('id', id).single<Orcamento>()
  if (!orcamento) notFound()

  const { data: itens } = await admin.from('itens_orcamento').select('*').eq('orcamento_id', id).returns<ItemOrcamento[]>()
  const { data: ambientes } = await admin.from('ambientes_orcamento').select('*').eq('orcamento_id', id).returns<AmbienteOrcamento[]>()
  const { data: empresa } = await admin.from('empresas').select('*').eq('id', orcamento.empresa_id).single<Empresa>()

  const ambientesPreview = (ambientes ?? []).map((a) => ({
    nome: a.nome,
    comprimento: a.comprimento,
    largura: a.largura,
    peDireito: a.pe_direito,
    servicos: (itens ?? [])
      .filter((it) => it.ambiente_id === a.id)
      .map((it) => nomeServicoSemAmbiente(it.descricao)),
  }))

  return (
    <main className="mx-auto max-w-2xl px-5 py-10">
      <OrcamentoPreview
        empresaNome={empresa?.nome ?? ''}
        cnpj={empresa?.cnpj}
        telefone={empresa?.telefone}
        segmentoLabel={empresa ? (SEGMENTOS[empresa.segmento_padrao as keyof typeof SEGMENTOS]?.label ?? empresa.segmento_padrao) : ''}
        numeroOrcamento={orcamento.id.slice(0, 8).toUpperCase()}
        dataCriacao={new Date(orcamento.created_at).toLocaleDateString('pt-BR')}
        clienteNome={orcamento.cliente_nome}
        obraEndereco={orcamento.obra_endereco ?? ''}
        prazoExecucao={orcamento.prazo_execucao ?? ''}
        validadeDias={orcamento.validade_dias}
        formaPagamento={orcamento.forma_pagamento ?? ''}
        itens={itens ?? []}
        ambientes={ambientesPreview}
        logoUrl={empresa?.logo_url ?? null}
        corPrimaria={empresa?.cor_primaria}
        publico
      />
      <PrintButton />
    </main>
  )
}
