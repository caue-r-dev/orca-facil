import { notFound } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import { OrcamentoPreview } from '@/components/OrcamentoPreview'
import type { Empresa, ItemOrcamento, Orcamento } from '@/lib/types'
import { SEGMENTOS } from '@/lib/segmentos-seed'
import { PrintButton } from './PrintButton'

export default async function OrcamentoPublicoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const admin = createAdminClient()

  const { data: orcamento } = await admin.from('orcamentos').select('*').eq('id', id).single<Orcamento>()
  if (!orcamento) notFound()

  const { data: itens } = await admin.from('itens_orcamento').select('*').eq('orcamento_id', id).returns<ItemOrcamento[]>()
  const { data: empresa } = await admin.from('empresas').select('*').eq('id', orcamento.empresa_id).single<Empresa>()

  return (
    <main className="mx-auto max-w-2xl px-5 py-10">
      <OrcamentoPreview
        empresaNome={empresa?.nome ?? ''}
        segmentoLabel={empresa ? (SEGMENTOS[empresa.segmento_padrao as keyof typeof SEGMENTOS]?.label ?? empresa.segmento_padrao) : ''}
        clienteNome={orcamento.cliente_nome}
        obraEndereco={orcamento.obra_endereco ?? ''}
        prazoExecucao={orcamento.prazo_execucao ?? ''}
        validadeDias={orcamento.validade_dias}
        formaPagamento={orcamento.forma_pagamento ?? ''}
        itens={itens ?? []}
        logoUrl={empresa?.logo_url ?? null}
        corPrimaria={empresa?.cor_primaria}
        publico
      />
      <PrintButton />
    </main>
  )
}
