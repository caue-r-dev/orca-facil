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

interface PreviewAmbiente {
  nome: string
  comprimento: number
  largura: number
  peDireito: number
  // Nomes dos serviços vinculados a esse ambiente (sem o sufixo do
  // ambiente que já vem embutido em ItemForm.descricao), pra compor a
  // coluna Forro/Piso na tabela de Ambientes e Medidas.
  servicos: string[]
}

interface OrcamentoPreviewProps {
  empresaNome: string
  cnpj?: string | null
  telefone?: string | null
  segmentoLabel: string
  // Ausentes quando o orçamento ainda não foi salvo (preview do builder
  // em "Novo orçamento") — exibidos como "—" nesse caso.
  numeroOrcamento?: string
  dataCriacao?: string
  clienteNome: string
  obraEndereco: string
  prazoExecucao: string
  validadeDias: number
  formaPagamento: string
  itens: PreviewItem[]
  ambientes?: PreviewAmbiente[]
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

function arredondar(n: number): number {
  return Math.round(n * 100) / 100
}

function calcularPerimetro(a: Pick<PreviewAmbiente, 'comprimento' | 'largura'>): number {
  return arredondar(2 * ((Number(a.comprimento) || 0) + (Number(a.largura) || 0)))
}

export function OrcamentoPreview(props: OrcamentoPreviewProps) {
  const { subtotalMaterial, subtotalMaoObra, total } = calcularOrcamento(props.itens)
  const corDestaque = props.corPrimaria ? { color: props.corPrimaria } : undefined
  const corRegua = props.corPrimaria || '#2F4A5C'
  const ambientes = props.ambientes ?? []

  return (
    <div id="proposta-preview" style={FUNDO_PAPEL} className="border border-line px-8 py-9 print:border-none print:shadow-none">

      {/* Cabeçalho da empresa */}
      <div className="flex items-start gap-3">
        {props.logoUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={props.logoUrl} alt={props.empresaNome || 'Logo'} crossOrigin="anonymous" className="h-12 w-auto object-contain" />
        )}
        <div>
          <div className="font-serif-body text-2xl font-bold leading-tight" style={corDestaque}>{props.empresaNome || 'Sua Empresa'}</div>
          <div className="mt-1 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-ink-soft">
            <Wrench size={12} />
            {props.segmentoLabel}
          </div>
          {props.cnpj && <div className="mt-0.5 text-xs text-ink-soft">CNPJ: {props.cnpj}</div>}
        </div>
      </div>
      <div className="mt-3 h-[3px] w-full" style={{ backgroundColor: corRegua, WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }} />

      {/* Título da proposta + metadados */}
      <div className="mt-6 mb-6">
        <h1 className="font-serif-body text-xl font-bold text-ink">Proposta de Orçamento</h1>
        <div className="mt-3 grid grid-cols-2 gap-4 border-t border-line pt-3 sm:grid-cols-4">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wide text-ink-soft">Cliente</div>
            <div className="text-sm font-bold">{props.clienteNome || '—'}</div>
          </div>
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wide text-ink-soft">Obra / Local</div>
            <div className="text-sm font-bold">{props.obraEndereco || '—'}</div>
          </div>
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wide text-ink-soft">Nº Orçamento</div>
            <div className="font-mono-num text-sm font-bold">{props.numeroOrcamento ?? '—'}</div>
          </div>
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wide text-ink-soft">Data</div>
            <div className="font-mono-num text-sm font-bold">{props.dataCriacao ?? '—'}</div>
          </div>
        </div>
      </div>

      {/* Ambientes e medidas */}
      {ambientes.length > 0 && (
        <div className="mb-6">
          <div className="mb-2 text-xs font-bold uppercase tracking-wide text-brass">Ambientes e Medidas</div>
          <div className="grid grid-cols-[minmax(0,1.5fr)_minmax(0,1.1fr)_minmax(0,0.8fr)_minmax(0,0.8fr)_minmax(0,1.6fr)] gap-x-2 border-b border-ink pb-1.5 pt-1 text-[10px] font-bold uppercase tracking-wide" style={{ borderTop: '2px solid #1E2521' }}>
            <span>Ambiente</span>
            <span>Dimensões</span>
            <span className="text-center">Pé-direito</span>
            <span className="text-center">Perímetro</span>
            <span>Forro/Piso</span>
          </div>
          {ambientes.map((a, i) => (
            <div key={i} className="grid grid-cols-[minmax(0,1.5fr)_minmax(0,1.1fr)_minmax(0,0.8fr)_minmax(0,0.8fr)_minmax(0,1.6fr)] gap-x-2 border-b border-dotted border-line py-1.5 text-xs">
              <span className="font-serif-body break-words">{a.nome}</span>
              <span className="font-mono-num">{a.comprimento}m × {a.largura}m</span>
              <span className="font-mono-num text-center">{a.peDireito ? `${a.peDireito}m` : '—'}</span>
              <span className="font-mono-num text-center">{calcularPerimetro(a)}m</span>
              <span className="break-words">{a.servicos.length > 0 ? a.servicos.join(', ') : '—'}</span>
            </div>
          ))}
        </div>
      )}

      {/* Orçamento detalhado */}
      <div className="mb-6">
        <div className="mb-2 text-xs font-bold uppercase tracking-wide text-brass">Orçamento Detalhado</div>
        <div className="grid grid-cols-[minmax(0,0.3fr)_minmax(0,2.2fr)_minmax(0,0.6fr)_minmax(0,0.5fr)_minmax(0,0.9fr)_minmax(0,0.9fr)] gap-x-2 border-b border-ink pb-1.5 pt-1 text-[10px] font-bold uppercase tracking-wide" style={{ borderTop: '2px solid #1E2521' }}>
          <span>#</span>
          <span>Descrição do Serviço</span>
          <span className="text-center">Qtd</span>
          <span className="text-center">Und</span>
          <span className="text-right">Preço Unit.</span>
          <span className="text-right">Total</span>
        </div>

        {props.itens.length === 0 ? (
          <div className="py-4 text-sm italic text-ink-soft">Nenhum item adicionado.</div>
        ) : (
          <div className="font-mono-num text-xs">
            {props.itens.map((it, i) => (
              <div key={i} className="grid grid-cols-[minmax(0,0.3fr)_minmax(0,2.2fr)_minmax(0,0.6fr)_minmax(0,0.5fr)_minmax(0,0.9fr)_minmax(0,0.9fr)] gap-x-2 border-b border-dotted border-line py-1.5">
                <span>{i + 1}</span>
                <span className="font-serif-body break-words">{it.descricao || 'Item sem nome'}</span>
                <span className="text-center">{it.quantidade}</span>
                <span className="text-center">{it.unidade}</span>
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
            <span className="font-sans text-sm uppercase tracking-wide self-end">Total Geral da Proposta</span>
            <span className={props.corPrimaria ? '' : 'text-blueprint-deep'}>{formatarMoeda(total)}</span>
          </div>
        </div>
      </div>

      {/* Condições comerciais */}
      <div className="mb-8">
        <div className="mb-2 text-xs font-bold uppercase tracking-wide text-brass">Condições Comerciais</div>
        <ul className="list-disc pl-5 text-xs leading-6 text-ink-soft">
          <li>Proposta válida por {props.validadeDias || 0} dias a partir da data de emissão.</li>
          <li>Os valores contemplam apenas os serviços descritos nesta proposta.</li>
          {props.prazoExecucao && <li>Prazo de execução estimado: {props.prazoExecucao}.</li>}
          <li>Forma de pagamento: {props.formaPagamento || 'a combinar'} — condições finais a combinar após aprovação e assinatura do contrato.</li>
        </ul>
      </div>

      {/* Assinaturas */}
      <div className="mt-10 grid grid-cols-2 gap-8 text-center text-xs">
        <div className="border-t border-ink pt-2">Assinatura do Cliente</div>
        <div className="border-t border-ink pt-2">{props.empresaNome || 'Sua Empresa'}</div>
      </div>

      {/* Rodapé */}
      <div className="mt-8 border-t border-dotted border-line pt-3 text-center text-[10px] text-ink-soft">
        {[props.empresaNome, props.cnpj ? `CNPJ ${props.cnpj}` : null, props.telefone].filter(Boolean).join(' · ')}
      </div>
    </div>
  )
}
