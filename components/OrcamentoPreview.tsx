'use client'

import { calcularOrcamento, formatarMoeda } from '@/lib/calc'
import type { Categoria } from '@/lib/types'

interface PreviewItem {
  descricao: string
  categoria: Categoria
  unidade: string
  quantidade: number
  valor_unit: number
}

interface OrcamentoPreviewProps {
  empresaNome: string
  segmentoLabel: string
  clienteNome: string
  obraEndereco: string
  prazoExecucao: string
  validadeDias: number
  formaPagamento: string
  itens: PreviewItem[]
  bdi: number
  // Só passados pela página pública/PDF (/o/[id]) — o builder interno
  // nunca envia essas props, então a UI de dentro do sistema continua
  // com a paleta padrão do protótipo para todo mundo.
  logoUrl?: string | null
  corPrimaria?: string
  // true só na página pública (/o/[id]): esconde o detalhamento
  // Materiais/Mão de obra do cliente, mostrando só BDI e Total.
  publico?: boolean
}

export function OrcamentoPreview(props: OrcamentoPreviewProps) {
  const { subtotalMaterial, subtotalMaoObra, valorBdi, total } = calcularOrcamento(props.itens, props.bdi)
  const corDestaque = props.corPrimaria ? { color: props.corPrimaria } : undefined

  return (
    <div className="border border-line bg-white px-8 py-9 print:border-none print:shadow-none">
      <div className="mb-5 flex items-start justify-between">
        <div>
          {props.logoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={props.logoUrl} alt={props.empresaNome || 'Logo'} className="mb-2 h-10 w-auto object-contain" />
          )}
          <div className="text-lg font-bold" style={corDestaque}>{props.empresaNome || 'Sua Empresa'}</div>
          <div className="mt-0.5 text-xs text-ink-soft">{props.segmentoLabel}</div>
        </div>
        <div className="text-right text-xs text-ink-soft">
          <div>Proposta de Orçamento</div>
          <div>Válida por {props.validadeDias || 0} dias</div>
        </div>
      </div>

      <div className="mb-5 text-sm leading-7">
        <div><strong>Cliente:</strong> {props.clienteNome || '—'}</div>
        <div><strong>Local da obra:</strong> {props.obraEndereco || '—'}</div>
        {props.prazoExecucao && <div><strong>Prazo de execução:</strong> {props.prazoExecucao}</div>}
      </div>

      <div className="grid grid-cols-[2.4fr_0.6fr_0.8fr_0.8fr] border-y border-ink py-1.5 text-xs font-bold uppercase tracking-wide">
        <span>Descrição</span>
        <span className="text-center">Qtd.</span>
        <span className="text-right">Unit.</span>
        <span className="text-right">Total</span>
      </div>

      {props.itens.length === 0 ? (
        <div className="py-4 text-sm italic text-ink-soft">Nenhum item adicionado.</div>
      ) : (
        <div className="font-mono-num text-xs">
          {props.itens.map((it, i) => (
            <div key={i} className="grid grid-cols-[2.4fr_0.6fr_0.8fr_0.8fr] border-b border-dotted border-line py-1.5">
              <span className="font-serif-body">{it.descricao || 'Item sem nome'}</span>
              <span className="text-center">{it.quantidade}{it.unidade}</span>
              <span className="text-right">{formatarMoeda(Number(it.valor_unit) || 0)}</span>
              <span className="text-right">{formatarMoeda((Number(it.quantidade) || 0) * (Number(it.valor_unit) || 0))}</span>
            </div>
          ))}
        </div>
      )}

      <div className="mt-4 flex flex-col gap-1.5 font-mono-num text-sm">
        {!props.publico && (
          <>
            <div className="flex justify-between"><span className="font-sans">Materiais</span><span>{formatarMoeda(subtotalMaterial)}</span></div>
            <div className="flex justify-between"><span className="font-sans">Mão de obra</span><span>{formatarMoeda(subtotalMaoObra)}</span></div>
          </>
        )}
        <div className="flex justify-between"><span className="font-sans">BDI ({props.bdi || 0}%)</span><span>{formatarMoeda(valorBdi)}</span></div>
        <div className="mt-1 flex justify-between border-t border-ink pt-2 text-lg font-bold" style={corDestaque}>
          <span className="font-sans">Total</span><span className={props.corPrimaria ? '' : 'text-blueprint-deep'}>{formatarMoeda(total)}</span>
        </div>
      </div>

      <div className="mt-5 text-xs leading-6 text-ink-soft">
        <strong className="font-sans">Forma de pagamento:</strong> {props.formaPagamento}
      </div>
    </div>
  )
}
