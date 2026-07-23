'use client'

import { useState } from 'react'
import { SEGMENTOS } from '@/lib/segmentos-seed'
import { formatarMoeda } from '@/lib/calc'
import { OrcamentoPreview } from './OrcamentoPreview'
import type { AmbienteOrcamento, Categoria, ChapeamentoTipo, ItemBiblioteca, ItemOrcamento, ModoMedicao, OrigemAmbiente, SegmentoKey } from '@/lib/types'

interface ItemForm {
  descricao: string
  categoria: Categoria
  unidade: string
  modo_medicao: ModoMedicao
  comprimento: number | null
  altura: number | null
  quantidade: number
  valor_unit: number
  ambienteLocalId: number | null
  origem_ambiente: OrigemAmbiente | null
}

interface AmbienteForm {
  nome: string
  comprimento: number
  largura: number
  peDireito: number
  chapeamento: ChapeamentoTipo
  forro: boolean
  valorMaoObraChapeamento: number
  materialChapeamento: boolean
  custoLoteChapeamento: number
  rendimentoLoteChapeamento: number
  valorMaoObraForro: number
  materialForro: boolean
  custoLoteForro: number
  rendimentoLoteForro: number
}

export interface AmbientePayload extends AmbienteForm {
  localId: number
}

const MODO_MEDICAO_LABEL: Record<ModoMedicao, string> = {
  manual: 'Manual',
  metro_linear: 'Metro linear',
  metro_quadrado: 'Metro quadrado',
}

function calcularQuantidade(modo: ModoMedicao, comprimento: number | null, altura: number | null, quantidadeManual: number): number {
  if (modo === 'metro_linear') return Number(comprimento) || 0
  if (modo === 'metro_quadrado') return (Number(comprimento) || 0) * (Number(altura) || 0)
  return quantidadeManual
}

function modoMedicaoPadrao(unidade: string): ModoMedicao {
  if (unidade === 'm') return 'metro_linear'
  if (unidade === 'm²') return 'metro_quadrado'
  return 'manual'
}

function arredondar(n: number): number {
  return Math.round(n * 100) / 100
}

// Mirrors the Belini reference calculator: perímetro = 2×(comprimento +
// largura); parede = perímetro × pé-direito (uma face); chapeamento
// dobra a parede quando é "2 lados"; forro/piso = comprimento × largura.
function calcularPerimetro(a: AmbienteForm): number {
  return arredondar(2 * ((Number(a.comprimento) || 0) + (Number(a.largura) || 0)))
}

function calcularAreaParede(a: AmbienteForm): number {
  return arredondar(calcularPerimetro(a) * (Number(a.peDireito) || 0))
}

function calcularAreaChapeamento(a: AmbienteForm): number {
  const parede = calcularAreaParede(a)
  return arredondar(a.chapeamento === 'duplo' ? parede * 2 : parede)
}

function calcularAreaForro(a: AmbienteForm): number {
  return arredondar((Number(a.comprimento) || 0) * (Number(a.largura) || 0))
}

// Material diluído por lote: o prestador informa o custo do lote/pacote
// comprado e quantos m² aquele lote rende; valor por m² = custo ÷
// rendimento (0 se o rendimento ainda não foi preenchido, evita /0).
function calcularValorMaterialPorM2(custoLote: number, rendimentoLote: number): number {
  const rendimento = Number(rendimentoLote) || 0
  if (rendimento <= 0) return 0
  return (Number(custoLote) || 0) / rendimento
}

// Material "por conta do prestador" soma com a mão de obra num valor_unit
// único — o item nunca é desmembrado em material + mão de obra na linha
// do orçamento (mesmo padrão do sistema Belini).
function calcularValorUnitChapeamento(a: AmbienteForm): number {
  const material = a.materialChapeamento ? calcularValorMaterialPorM2(a.custoLoteChapeamento, a.rendimentoLoteChapeamento) : 0
  return arredondar((Number(a.valorMaoObraChapeamento) || 0) + material)
}

function calcularValorUnitForro(a: AmbienteForm): number {
  const material = a.materialForro ? calcularValorMaterialPorM2(a.custoLoteForro, a.rendimentoLoteForro) : 0
  return arredondar((Number(a.valorMaoObraForro) || 0) + material)
}

function calcularTotalAmbiente(a: AmbienteForm): number {
  const totalChapeamento = calcularAreaChapeamento(a) * calcularValorUnitChapeamento(a)
  const totalForro = a.forro ? calcularAreaForro(a) * calcularValorUnitForro(a) : 0
  return arredondar(totalChapeamento + totalForro)
}

export interface OrcamentoBuilderPayload {
  clienteNome: string
  clienteContato: string
  obraEndereco: string
  prazoExecucao: string
  validadeDias: number
  formaPagamento: string
  bdi: number
  ambientes: AmbientePayload[]
  itens: ItemForm[]
}

interface OrcamentoBuilderProps {
  biblioteca: ItemBiblioteca[]
  segmentoPadrao: SegmentoKey
  empresaNome: string
  valoresIniciais?: {
    clienteNome: string
    clienteContato: string
    obraEndereco: string
    prazoExecucao: string
    validadeDias: number
    formaPagamento: string
    bdi: number
    itens: ItemOrcamento[]
    ambientes: AmbienteOrcamento[]
  }
  onSalvar: (payload: OrcamentoBuilderPayload) => Promise<{ error?: string }>
}

let nextLocalId = 1
let nextAmbienteLocalId = 1

function itemChapeamentoDoAmbiente(a: AmbientePayload): ItemForm & { localId: number } {
  return {
    localId: nextLocalId++,
    descricao: `Chapeamento — ${a.nome}`,
    categoria: 'mao_obra',
    unidade: 'm²',
    modo_medicao: 'manual',
    comprimento: null,
    altura: null,
    quantidade: calcularAreaChapeamento(a),
    valor_unit: calcularValorUnitChapeamento(a),
    ambienteLocalId: a.localId,
    origem_ambiente: 'chapeamento',
  }
}

function itemForroDoAmbiente(a: AmbientePayload): ItemForm & { localId: number } {
  return {
    localId: nextLocalId++,
    descricao: `Forro — ${a.nome}`,
    categoria: 'mao_obra',
    unidade: 'm²',
    modo_medicao: 'manual',
    comprimento: null,
    altura: null,
    quantidade: calcularAreaForro(a),
    valor_unit: calcularValorUnitForro(a),
    ambienteLocalId: a.localId,
    origem_ambiente: 'forro',
  }
}

export function OrcamentoBuilder({ biblioteca, segmentoPadrao, empresaNome, valoresIniciais, onSalvar }: OrcamentoBuilderProps) {
  const ambientesIniciais: AmbientePayload[] = (valoresIniciais?.ambientes ?? []).map((a) => ({
    localId: nextAmbienteLocalId++,
    nome: a.nome,
    comprimento: a.comprimento,
    largura: a.largura,
    peDireito: a.pe_direito,
    chapeamento: a.chapeamento,
    forro: a.forro,
    valorMaoObraChapeamento: a.valor_mao_obra_chapeamento,
    materialChapeamento: a.material_chapeamento,
    custoLoteChapeamento: a.custo_lote_chapeamento,
    rendimentoLoteChapeamento: a.rendimento_lote_chapeamento,
    valorMaoObraForro: a.valor_mao_obra_forro,
    materialForro: a.material_forro,
    custoLoteForro: a.custo_lote_forro,
    rendimentoLoteForro: a.rendimento_lote_forro,
  }))
  const ambienteLocalIdPorDbId = new Map(
    (valoresIniciais?.ambientes ?? []).map((a, i) => [a.id, ambientesIniciais[i].localId])
  )
  const [ambientes, setAmbientes] = useState<AmbientePayload[]>(ambientesIniciais)
  const [itens, setItens] = useState<(ItemForm & { localId: number })[]>(
    (valoresIniciais?.itens ?? []).map((it) => ({
      ...it,
      localId: nextLocalId++,
      ambienteLocalId: it.ambiente_id ? ambienteLocalIdPorDbId.get(it.ambiente_id) ?? null : null,
    }))
  )
  const [bdi, setBdi] = useState(valoresIniciais?.bdi ?? SEGMENTOS[segmentoPadrao].bdiPadrao)
  const [clienteNome, setClienteNome] = useState(valoresIniciais?.clienteNome ?? '')
  const [clienteContato, setClienteContato] = useState(valoresIniciais?.clienteContato ?? '')
  const [obraEndereco, setObraEndereco] = useState(valoresIniciais?.obraEndereco ?? '')
  const [prazoExecucao, setPrazoExecucao] = useState(valoresIniciais?.prazoExecucao ?? '')
  const [validadeDias, setValidadeDias] = useState(valoresIniciais?.validadeDias ?? 7)
  const [formaPagamento, setFormaPagamento] = useState(valoresIniciais?.formaPagamento ?? '50% de entrada, 50% na entrega')
  const [erro, setErro] = useState<string | null>(null)
  const [salvando, setSalvando] = useState(false)

  function adicionarDaBiblioteca(item: ItemBiblioteca) {
    const modo = modoMedicaoPadrao(item.unidade)
    const comprimento = modo === 'manual' ? null : 1
    const altura = modo === 'metro_quadrado' ? 1 : null
    setItens((prev) => [
      ...prev,
      {
        localId: nextLocalId++,
        descricao: item.descricao,
        unidade: item.unidade,
        categoria: item.categoria,
        modo_medicao: modo,
        comprimento,
        altura,
        quantidade: calcularQuantidade(modo, comprimento, altura, 1),
        valor_unit: item.valor_unit_padrao,
        ambienteLocalId: null,
        origem_ambiente: null,
      },
    ])
  }

  function adicionarItemVazio() {
    setItens((prev) => [
      ...prev,
      { localId: nextLocalId++, descricao: '', unidade: 'un', categoria: 'mao_obra', modo_medicao: 'manual', comprimento: null, altura: null, quantidade: 1, valor_unit: 0, ambienteLocalId: null, origem_ambiente: null },
    ])
  }

  function atualizarItem<K extends keyof ItemForm>(localId: number, campo: K, valor: ItemForm[K]) {
    setItens((prev) => prev.map((it) => (it.localId === localId ? { ...it, [campo]: valor } : it)))
  }

  function adicionarAmbiente() {
    const novo: AmbientePayload = {
      localId: nextAmbienteLocalId++,
      nome: `Ambiente ${ambientes.length + 1}`,
      comprimento: 3,
      largura: 3,
      peDireito: 2.8,
      chapeamento: 'simples',
      forro: false,
      valorMaoObraChapeamento: 0,
      materialChapeamento: false,
      custoLoteChapeamento: 0,
      rendimentoLoteChapeamento: 0,
      valorMaoObraForro: 0,
      materialForro: false,
      custoLoteForro: 0,
      rendimentoLoteForro: 0,
    }
    setAmbientes((prev) => [...prev, novo])
    setItens((prev) => [...prev, itemChapeamentoDoAmbiente(novo)])
  }

  function atualizarAmbiente<K extends keyof AmbienteForm>(localId: number, campo: K, valor: AmbienteForm[K]) {
    const ambienteAtual = ambientes.find((a) => a.localId === localId)
    if (!ambienteAtual) return
    const novoAmbiente: AmbientePayload = { ...ambienteAtual, [campo]: valor }

    setAmbientes((prev) => prev.map((a) => (a.localId === localId ? novoAmbiente : a)))

    setItens((prev) => {
      let novos = prev.map((it) => {
        if (it.ambienteLocalId !== localId) return it
        if (it.origem_ambiente === 'chapeamento') {
          return { ...it, descricao: `Chapeamento — ${novoAmbiente.nome}`, quantidade: calcularAreaChapeamento(novoAmbiente), valor_unit: calcularValorUnitChapeamento(novoAmbiente) }
        }
        if (it.origem_ambiente === 'forro') {
          return { ...it, descricao: `Forro — ${novoAmbiente.nome}`, quantidade: calcularAreaForro(novoAmbiente), valor_unit: calcularValorUnitForro(novoAmbiente) }
        }
        return it
      })
      const temForro = novos.some((it) => it.ambienteLocalId === localId && it.origem_ambiente === 'forro')
      if (novoAmbiente.forro && !temForro) {
        novos = [...novos, itemForroDoAmbiente(novoAmbiente)]
      } else if (!novoAmbiente.forro && temForro) {
        novos = novos.filter((it) => !(it.ambienteLocalId === localId && it.origem_ambiente === 'forro'))
      }
      return novos
    })
  }

  function removerAmbiente(localId: number) {
    setAmbientes((prev) => prev.filter((a) => a.localId !== localId))
    setItens((prev) => prev.filter((it) => it.ambienteLocalId !== localId))
  }

  function definirModoMedicao(localId: number, modo: ModoMedicao) {
    setItens((prev) => prev.map((it) => {
      if (it.localId !== localId) return it
      const comprimento = modo === 'manual' ? null : (it.comprimento ?? 1)
      const altura = modo === 'metro_quadrado' ? (it.altura ?? 1) : null
      return { ...it, modo_medicao: modo, comprimento, altura, quantidade: calcularQuantidade(modo, comprimento, altura, it.quantidade) }
    }))
  }

  function atualizarMedida(localId: number, campo: 'comprimento' | 'altura', valor: number) {
    setItens((prev) => prev.map((it) => {
      if (it.localId !== localId) return it
      const atualizado = { ...it, [campo]: valor }
      return { ...atualizado, quantidade: calcularQuantidade(atualizado.modo_medicao, atualizado.comprimento, atualizado.altura, atualizado.quantidade) }
    }))
  }

  function removerItem(localId: number) {
    setItens((prev) => prev.filter((it) => it.localId !== localId))
  }

  async function salvar() {
    setErro(null)
    if (!clienteNome.trim()) {
      setErro('Informe o nome do cliente.')
      return
    }
    if (itens.length === 0) {
      setErro('Adicione ao menos um item ao orçamento.')
      return
    }
    setSalvando(true)
    const resultado = await onSalvar({
      clienteNome, clienteContato, obraEndereco, prazoExecucao, validadeDias, formaPagamento, bdi,
      ambientes,
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      itens: itens.map(({ localId, ...rest }) => rest),
    })
    setSalvando(false)
    if (resultado.error) setErro(resultado.error)
  }

  return (
    <div className="mx-auto grid max-w-6xl grid-cols-1 gap-7 px-5 py-8 lg:grid-cols-[1.05fr_1fr]">
      <div>

        <div className="mb-7">
          <div className="mb-3 text-xs font-bold uppercase tracking-wide text-brass">Dados do orçamento</div>
          <div className="grid grid-cols-1 gap-4 border border-line bg-white p-4 text-sm sm:grid-cols-2 sm:gap-5 sm:p-5">
            <label className="flex flex-col gap-1">
              <span className="text-[10px] font-bold uppercase tracking-wide text-ink-soft">Cliente</span>
              <input value={clienteNome} onChange={(e) => setClienteNome(e.target.value)} className="border-b border-line bg-transparent py-1 outline-none focus:border-brass" />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[10px] font-bold uppercase tracking-wide text-ink-soft">Contato do cliente</span>
              <input value={clienteContato} onChange={(e) => setClienteContato(e.target.value)} className="border-b border-line bg-transparent py-1 outline-none focus:border-brass" />
            </label>
            <label className="flex flex-col gap-1 sm:col-span-2">
              <span className="text-[10px] font-bold uppercase tracking-wide text-ink-soft">Endereço da obra</span>
              <input value={obraEndereco} onChange={(e) => setObraEndereco(e.target.value)} className="border-b border-line bg-transparent py-1 outline-none focus:border-brass" />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[10px] font-bold uppercase tracking-wide text-ink-soft">Prazo de execução</span>
              <input value={prazoExecucao} onChange={(e) => setPrazoExecucao(e.target.value)} className="border-b border-line bg-transparent py-1 outline-none focus:border-brass" />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[10px] font-bold uppercase tracking-wide text-ink-soft">Validade (dias)</span>
              <input type="number" value={validadeDias} onChange={(e) => setValidadeDias(Number(e.target.value))} className="font-mono-num border-b border-line bg-transparent py-1 outline-none focus:border-brass" />
            </label>
            <label className="flex flex-col gap-1 sm:col-span-2">
              <span className="text-[10px] font-bold uppercase tracking-wide text-ink-soft">Condições de pagamento</span>
              <input value={formaPagamento} onChange={(e) => setFormaPagamento(e.target.value)} className="border-b border-line bg-transparent py-1 outline-none focus:border-brass" />
            </label>
          </div>
        </div>

        {segmentoPadrao === 'drywall' && (
          <div className="mb-5">
            <div className="mb-3 text-xs font-bold uppercase tracking-wide text-brass">Ambientes (cômodos)</div>
            <div className="flex flex-col gap-2.5">
              {ambientes.map((a) => (
                <div key={a.localId} className="flex flex-col gap-5 border border-line bg-white p-4 sm:p-5">

                  {/* Bloco 1 — identificação */}
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <label className="flex-1">
                        <span className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-brass">Nome / descrição do ambiente</span>
                        <input
                          value={a.nome}
                          onChange={(e) => atualizarAmbiente(a.localId, 'nome', e.target.value)}
                          className="w-full border-b border-line bg-transparent py-1 text-lg font-bold text-blueprint-deep outline-none focus:border-brass"
                        />
                      </label>
                      <button onClick={() => removerAmbiente(a.localId)} className="mt-5 text-danger">×</button>
                    </div>

                    <div className="mt-3 grid grid-cols-1 gap-3 text-xs sm:grid-cols-3">
                      <label className="flex flex-col gap-1">Comprimento (m)
                        <input type="number" value={a.comprimento} onChange={(e) => atualizarAmbiente(a.localId, 'comprimento', Number(e.target.value))} className="font-mono-num border-b border-line bg-transparent py-1 outline-none focus:border-brass" />
                      </label>
                      <label className="flex flex-col gap-1">Largura (m)
                        <input type="number" value={a.largura} onChange={(e) => atualizarAmbiente(a.localId, 'largura', Number(e.target.value))} className="font-mono-num border-b border-line bg-transparent py-1 outline-none focus:border-brass" />
                      </label>
                      <label className="flex flex-col gap-1">Pé-direito (m)
                        <input type="number" value={a.peDireito} onChange={(e) => atualizarAmbiente(a.localId, 'peDireito', Number(e.target.value))} className="font-mono-num border-b border-line bg-transparent py-1 outline-none focus:border-brass" />
                      </label>
                    </div>

                    <div className="mt-4 flex flex-wrap items-center gap-4 text-xs">
                      <div className="flex items-center gap-1.5">
                        <span className="text-ink-soft">Chapeamento:</span>
                        <button
                          type="button"
                          onClick={() => atualizarAmbiente(a.localId, 'chapeamento', 'simples')}
                          className={`rounded-sm border px-3 py-1.5 text-xs ${a.chapeamento === 'simples' ? 'border-brass bg-brass-soft font-bold' : 'border-line'}`}
                        >
                          1 lado
                        </button>
                        <button
                          type="button"
                          onClick={() => atualizarAmbiente(a.localId, 'chapeamento', 'duplo')}
                          className={`rounded-sm border px-3 py-1.5 text-xs ${a.chapeamento === 'duplo' ? 'border-brass bg-brass-soft font-bold' : 'border-line'}`}
                        >
                          2 lados
                        </button>
                      </div>
                      <label className="flex items-center gap-1.5">
                        <input type="checkbox" checked={a.forro} onChange={(e) => atualizarAmbiente(a.localId, 'forro', e.target.checked)} />
                        Forro
                      </label>
                    </div>
                  </div>

                  {/* Bloco 2 — métricas calculadas */}
                  <div className="border-t border-line pt-4">
                    <div className="mb-2.5 text-[10px] font-bold uppercase tracking-wide text-ink-soft">Métricas calculadas</div>
                    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                      <div className="rounded-sm bg-paper px-3 py-2.5">
                        <div className="text-[10px] uppercase tracking-wide text-ink-soft">Perímetro</div>
                        <div className="font-mono-num text-lg font-bold text-blueprint-deep">{calcularPerimetro(a).toFixed(2)}<span className="ml-1 text-xs font-normal text-ink-soft">ML</span></div>
                      </div>
                      <div className="rounded-sm bg-paper px-3 py-2.5">
                        <div className="text-[10px] uppercase tracking-wide text-ink-soft">Parede</div>
                        <div className="font-mono-num text-lg font-bold text-blueprint-deep">{calcularAreaParede(a).toFixed(2)}<span className="ml-1 text-xs font-normal text-ink-soft">m²</span></div>
                      </div>
                      <div className="rounded-sm bg-paper px-3 py-2.5">
                        <div className="text-[10px] uppercase tracking-wide text-ink-soft">Chapeamento <span className="text-brass">({a.chapeamento === 'duplo' ? '2 lados' : '1 lado'})</span></div>
                        <div className="font-mono-num text-lg font-bold text-blueprint-deep">{calcularAreaChapeamento(a).toFixed(2)}<span className="ml-1 text-xs font-normal text-ink-soft">m²</span></div>
                      </div>
                      <div className={`rounded-sm px-3 py-2.5 ${a.forro ? 'bg-paper' : 'bg-paper opacity-50'}`}>
                        <div className="text-[10px] uppercase tracking-wide text-ink-soft">Forro / Piso</div>
                        <div className="font-mono-num text-lg font-bold text-blueprint-deep">{calcularAreaForro(a).toFixed(2)}<span className="ml-1 text-xs font-normal text-ink-soft">m²</span></div>
                      </div>
                    </div>
                  </div>

                  {/* Bloco 3 — composição de custo */}
                  <div className="border-t border-line pt-4">
                    <div className="mb-2.5 text-[10px] font-bold uppercase tracking-wide text-ink-soft">Composição de custo</div>

                    <div className="rounded-sm bg-paper p-3.5">
                      <div className="mb-2 text-xs font-bold text-blueprint-deep">Chapeamento</div>
                      <div className="flex flex-wrap items-end gap-3 text-xs">
                        <label className="flex flex-col gap-1">Mão de obra (R$/m²)
                          <input type="number" value={a.valorMaoObraChapeamento} onChange={(e) => atualizarAmbiente(a.localId, 'valorMaoObraChapeamento', Number(e.target.value))} className="font-mono-num w-28 border-b border-line bg-white py-1 outline-none focus:border-brass" />
                        </label>
                        <label className="flex items-center gap-1.5">
                          <input type="checkbox" checked={a.materialChapeamento} onChange={(e) => atualizarAmbiente(a.localId, 'materialChapeamento', e.target.checked)} />
                          Material por conta do prestador
                        </label>
                      </div>
                      {a.materialChapeamento && (
                        <>
                          <div className="mt-2.5 flex flex-wrap items-end gap-3 text-xs">
                            <label className="flex flex-col gap-1">Custo do lote (R$)
                              <input type="number" value={a.custoLoteChapeamento} onChange={(e) => atualizarAmbiente(a.localId, 'custoLoteChapeamento', Number(e.target.value))} className="font-mono-num w-28 border-b border-line bg-white py-1 outline-none focus:border-brass" />
                            </label>
                            <label className="flex flex-col gap-1">Rendimento do lote (m²)
                              <input type="number" value={a.rendimentoLoteChapeamento} onChange={(e) => atualizarAmbiente(a.localId, 'rendimentoLoteChapeamento', Number(e.target.value))} className="font-mono-num w-28 border-b border-line bg-white py-1 outline-none focus:border-brass" />
                            </label>
                          </div>
                          <div className="mt-1.5 font-mono-num text-xs text-ink-soft">
                            {formatarMoeda(a.custoLoteChapeamento)} ÷ {(Number(a.rendimentoLoteChapeamento) || 0).toFixed(2)}m² = {formatarMoeda(calcularValorMaterialPorM2(a.custoLoteChapeamento, a.rendimentoLoteChapeamento))}/m²
                          </div>
                        </>
                      )}
                      <div className="mt-2 font-mono-num text-xs text-ink-soft">
                        Valor unitário: {formatarMoeda(calcularValorUnitChapeamento(a))}/m² · Total: {formatarMoeda(calcularAreaChapeamento(a) * calcularValorUnitChapeamento(a))}
                      </div>
                    </div>

                    {a.forro && (
                      <div className="mt-3 rounded-sm bg-paper p-3.5">
                        <div className="mb-2 text-xs font-bold text-blueprint-deep">Forro</div>
                        <div className="flex flex-wrap items-end gap-3 text-xs">
                          <label className="flex flex-col gap-1">Mão de obra (R$/m²)
                            <input type="number" value={a.valorMaoObraForro} onChange={(e) => atualizarAmbiente(a.localId, 'valorMaoObraForro', Number(e.target.value))} className="font-mono-num w-28 border-b border-line bg-white py-1 outline-none focus:border-brass" />
                          </label>
                          <label className="flex items-center gap-1.5">
                            <input type="checkbox" checked={a.materialForro} onChange={(e) => atualizarAmbiente(a.localId, 'materialForro', e.target.checked)} />
                            Material por conta do prestador
                          </label>
                        </div>
                        {a.materialForro && (
                          <>
                            <div className="mt-2.5 flex flex-wrap items-end gap-3 text-xs">
                              <label className="flex flex-col gap-1">Custo do lote (R$)
                                <input type="number" value={a.custoLoteForro} onChange={(e) => atualizarAmbiente(a.localId, 'custoLoteForro', Number(e.target.value))} className="font-mono-num w-28 border-b border-line bg-white py-1 outline-none focus:border-brass" />
                              </label>
                              <label className="flex flex-col gap-1">Rendimento do lote (m²)
                                <input type="number" value={a.rendimentoLoteForro} onChange={(e) => atualizarAmbiente(a.localId, 'rendimentoLoteForro', Number(e.target.value))} className="font-mono-num w-28 border-b border-line bg-white py-1 outline-none focus:border-brass" />
                              </label>
                            </div>
                            <div className="mt-1.5 font-mono-num text-xs text-ink-soft">
                              {formatarMoeda(a.custoLoteForro)} ÷ {(Number(a.rendimentoLoteForro) || 0).toFixed(2)}m² = {formatarMoeda(calcularValorMaterialPorM2(a.custoLoteForro, a.rendimentoLoteForro))}/m²
                            </div>
                          </>
                        )}
                        <div className="mt-2 font-mono-num text-xs text-ink-soft">
                          Valor unitário: {formatarMoeda(calcularValorUnitForro(a))}/m² · Total: {formatarMoeda(calcularAreaForro(a) * calcularValorUnitForro(a))}
                        </div>
                      </div>
                    )}

                    <div className="mt-3 flex items-center justify-between rounded-sm bg-blueprint-deep px-4 py-3">
                      <span className="text-xs font-bold uppercase tracking-wide text-paper">Total do ambiente</span>
                      <span className="font-mono-num text-lg font-bold text-paper">{formatarMoeda(calcularTotalAmbiente(a))}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <button onClick={adicionarAmbiente} className="mt-3 rounded-sm border border-dashed border-line px-3.5 py-2 text-sm text-ink-soft">
              + Adicionar ambiente
            </button>
          </div>
        )}

        {biblioteca.length > 0 && (
          <div className="mb-7">
            <div className="mb-3 text-xs font-bold uppercase tracking-wide text-brass">Itens da sua biblioteca</div>
            <div className="flex flex-wrap gap-2 border border-line bg-white p-4 sm:p-5">
              {biblioteca.map((item) => (
                <button key={item.id} onClick={() => adicionarDaBiblioteca(item)} className="flex items-center gap-1 rounded-sm border border-line bg-paper px-3 py-1.5 text-xs">
                  + {item.descricao} <span className="opacity-50">· R$ {item.valor_unit_padrao}/{item.unidade}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="mb-7">
          <div className="mb-3 text-xs font-bold uppercase tracking-wide text-brass">Itens do orçamento</div>
          <div className="border border-line bg-white p-4 sm:p-5">
          <div className="flex flex-col gap-4">
            {itens.map((it) => {
              const vinculadoAmbiente = it.ambienteLocalId !== null
              return (
                <div key={it.localId} className="border-b border-dotted border-line pb-2.5">
                  {vinculadoAmbiente && (
                    <div className="mb-1.5 font-bold text-blueprint-deep" title={it.descricao}>
                      {it.descricao}
                    </div>
                  )}
                  <div className={`grid items-center gap-2 text-sm ${vinculadoAmbiente ? 'grid-cols-[0.9fr_0.7fr_0.9fr_auto]' : 'grid-cols-[2.2fr_0.9fr_0.7fr_0.9fr_auto]'}`}>
                    {vinculadoAmbiente ? (
                      <>
                        <span className="text-ink-soft">{it.categoria === 'material' ? 'Material' : 'Mão de obra'}</span>
                        <span className="font-mono-num text-ink-soft">{it.quantidade.toFixed(2)}{it.unidade}</span>
                        <span className="font-mono-num text-blueprint-deep">{formatarMoeda(it.quantidade * it.valor_unit)}</span>
                        <span className="text-center text-xs text-ink-soft" title="Gerado por um ambiente — edite mão de obra e material no card do ambiente">🔗</span>
                      </>
                    ) : (
                      <>
                        <input
                          value={it.descricao}
                          onChange={(e) => atualizarItem(it.localId, 'descricao', e.target.value)}
                          placeholder="Descrição"
                          className="border-b border-line bg-transparent py-1 outline-none focus:border-brass"
                        />
                        <select value={it.categoria} onChange={(e) => atualizarItem(it.localId, 'categoria', e.target.value as Categoria)} className="border-b border-line bg-transparent py-1 outline-none focus:border-brass">
                          <option value="material">Material</option>
                          <option value="mao_obra">Mão de obra</option>
                        </select>
                        <input value={it.unidade} onChange={(e) => atualizarItem(it.localId, 'unidade', e.target.value)} className="border-b border-line bg-transparent py-1 outline-none focus:border-brass" />
                        <input
                          type="number"
                          value={it.valor_unit}
                          onChange={(e) => atualizarItem(it.localId, 'valor_unit', Number(e.target.value))}
                          className="font-mono-num border-b border-line bg-transparent py-1 outline-none focus:border-brass"
                        />
                        <button onClick={() => removerItem(it.localId)} className="text-danger">×</button>
                      </>
                    )}
                  </div>

                  {vinculadoAmbiente ? (
                    <div className="mt-1.5 font-mono-num text-xs text-ink-soft">
                      Gerado pelo ambiente · {it.origem_ambiente === 'chapeamento' ? 'Chapeamento' : 'Forro'} = {it.quantidade.toFixed(2)}{it.unidade} × {formatarMoeda(it.valor_unit)} (mão de obra + material, se marcado)
                    </div>
                  ) : (
                    <div className="mt-1.5 grid grid-cols-[1fr_1fr_1fr_1fr] items-center gap-2 text-xs">
                      <select
                        value={it.modo_medicao}
                        onChange={(e) => definirModoMedicao(it.localId, e.target.value as ModoMedicao)}
                        className="border-b border-line bg-transparent py-1 outline-none focus:border-brass"
                      >
                        {(Object.keys(MODO_MEDICAO_LABEL) as ModoMedicao[]).map((modo) => (
                          <option key={modo} value={modo}>{MODO_MEDICAO_LABEL[modo]}</option>
                        ))}
                      </select>

                      {it.modo_medicao === 'manual' && (
                        <input
                          type="number"
                          value={it.quantidade}
                          onChange={(e) => atualizarItem(it.localId, 'quantidade', Number(e.target.value))}
                          placeholder="Quantidade"
                          className="font-mono-num border-b border-line bg-transparent py-1 outline-none focus:border-brass"
                        />
                      )}

                      {it.modo_medicao === 'metro_linear' && (
                        <input
                          type="number"
                          value={it.comprimento ?? 0}
                          onChange={(e) => atualizarMedida(it.localId, 'comprimento', Number(e.target.value))}
                          placeholder="Comprimento (m)"
                          className="font-mono-num border-b border-line bg-transparent py-1 outline-none focus:border-brass"
                        />
                      )}

                      {it.modo_medicao === 'metro_quadrado' && (
                        <>
                          <input
                            type="number"
                            value={it.comprimento ?? 0}
                            onChange={(e) => atualizarMedida(it.localId, 'comprimento', Number(e.target.value))}
                            placeholder="Comprimento (m)"
                            className="font-mono-num border-b border-line bg-transparent py-1 outline-none focus:border-brass"
                          />
                          <input
                            type="number"
                            value={it.altura ?? 0}
                            onChange={(e) => atualizarMedida(it.localId, 'altura', Number(e.target.value))}
                            placeholder="Altura (m)"
                            className="font-mono-num border-b border-line bg-transparent py-1 outline-none focus:border-brass"
                          />
                        </>
                      )}

                      {it.modo_medicao !== 'manual' && (
                        <span className="font-mono-num text-ink-soft">= {it.quantidade}{it.unidade}</span>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
          <button onClick={adicionarItemVazio} className="mt-4 rounded-sm border border-dashed border-line px-3.5 py-2 text-sm text-ink-soft">
            + Item manual
          </button>
          </div>
        </div>

        <div className="mb-7">
          <div className="mb-3 text-xs font-bold uppercase tracking-wide text-brass">BDI / margem</div>
          <div className="flex items-center gap-2.5 border border-line bg-white p-4 text-sm sm:p-5">
            <input type="number" value={bdi} onChange={(e) => setBdi(Number(e.target.value))} className="font-mono-num w-16 border-b border-line bg-transparent py-1 text-center text-lg font-bold text-blueprint-deep outline-none focus:border-brass" />
            <span className="text-ink-soft">%</span>
          </div>
        </div>

        {erro && <p className="mb-4 text-sm text-danger">{erro}</p>}

        <button onClick={salvar} disabled={salvando} className="rounded-sm bg-blueprint-deep px-5 py-3 font-sans font-bold text-paper disabled:opacity-50">
          {salvando ? 'Salvando…' : 'Salvar orçamento'}
        </button>
      </div>

      <div className="lg:sticky lg:top-5 self-start">
        <OrcamentoPreview
          empresaNome={empresaNome}
          segmentoLabel={SEGMENTOS[segmentoPadrao].label}
          clienteNome={clienteNome}
          obraEndereco={obraEndereco}
          prazoExecucao={prazoExecucao}
          validadeDias={validadeDias}
          formaPagamento={formaPagamento}
          itens={itens}
          bdi={bdi}
        />
      </div>
    </div>
  )
}
