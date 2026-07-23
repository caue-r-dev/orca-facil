'use client'

import { Wrench } from 'lucide-react'
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
  // Só passados pela página pública/PDF (/o/[id]) — o builder interno
  // nunca envia essas props, então a UI de dentro do sistema continua
  // com a paleta padrão do protótipo para todo mundo.
  logoUrl?: string | null
  corPrimaria?: string
  // true só na página pública (/o/[id]): esconde o detalhamento
  // Materiais/Mão de obra do cliente, mostrando só o Total.
  publico?: boolean
}

// Grade sutil "papel de blueprint técnico" — mesmo padrão do
// protótipo original (orca-facil.jsx): linhas finas #EDEAE0 a cada
// 24px sobre o fundo papel/creme. printColorAdjust garante que a
// grade e as cores da marca sobrevivam ao gerar PDF (o navegador
// omite backgrounds na impressão por padrão).
const FUNDO_PAPEL: React.CSSProperties = {
  backgroundColor: '#F5F2EB',
  backgroundImage: 'linear-gradient(#EDEAE0 1px, transparent 1px), linear-gradient(90deg, #EDEAE0 1px, transparent 1px)',
  backgroundSize: '24px 24px',
  backgroundPosition: '-1px -1px',
  WebkitPrintColorAdjust: 'exact',
  printColorAdjust: 'exact',
}

export function OrcamentoPreview(props: OrcamentoPreviewProps) {
  const { subtotalMaterial, subtotalMaoObra, total } = calcularOrcamento(props.itens)
  const corDestaque = props.corPrimaria ? { color: props.corPrimaria } : undefined

  return (
    <div style={FUNDO_PAPEL} className="border border-line px-8 py-9 print:border-none print:px-6 print:py-6 print:shadow-none">
      <div className="mb-5 flex items-start justify-between">
        <div>
          {props.logoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={props.logoUrl} alt={props.empresaNome || 'Logo'} className="mb-2 h-10 w-auto object-contain" />
          )}
          <div className="font-serif-body text-lg font-bold" style={corDestaque}>{props.empresaNome || 'Sua Empresa'}</div>
          <div className="mt-0.5 flex items-center gap-1.5 text-xs text-ink-soft">
            <Wrench size={13} />
            {props.segmentoLabel}
          </div>
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

      <div className="grid grid-cols-[2.4fr_0.6fr_0.8fr_0.8fr] border-b border-ink pb-1.5 pt-1 text-xs font-bold uppercase tracking-wide" style={{ borderTop: '2px solid #1E2521' }}>
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
        <div className="mt-1 flex justify-between pt-2 text-lg font-bold" style={{ borderTop: '2px solid #1E2521', ...corDestaque }}>
          <span className="font-sans">Total</span><span className={props.corPrimaria ? '' : 'text-blueprint-deep'}>{formatarMoeda(total)}</span>
        </div>
      </div>

      <div className="mt-5 text-xs leading-6 text-ink-soft">
        <strong className="font-sans">Forma de pagamento:</strong> {props.formaPagamento}
      </div>
    </div>
  )
}
