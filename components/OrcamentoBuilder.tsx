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
  valorMaterialChapeamento: number
  valorMaoObraForro: number
  materialForro: boolean
  valorMaterialForro: number
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

// Mirrors the Belini reference calculator: chapeamento área = perímetro
// (2 × (comprimento + largura)) × pé-direito, doubled when chapeamento
// is "duplo"; forro área = comprimento × largura (piso/teto do cômodo).
function calcularAreaChapeamento(a: AmbienteForm): number {
  const perimetro = 2 * ((Number(a.comprimento) || 0) + (Number(a.largura) || 0))
  const area = perimetro * (Number(a.peDireito) || 0)
  return arredondar(a.chapeamento === 'duplo' ? area * 2 : area)
}

function calcularAreaForro(a: AmbienteForm): number {
  return arredondar((Number(a.comprimento) || 0) * (Number(a.largura) || 0))
}

// Material "por conta do prestador" soma com a mão de obra num valor_unit
// único — o item nunca é desmembrado em material + mão de obra na linha
// do orçamento (mesmo padrão do sistema Belini).
function calcularValorUnitChapeamento(a: AmbienteForm): number {
  const material = a.materialChapeamento ? Number(a.valorMaterialChapeamento) || 0 : 0
  return arredondar((Number(a.valorMaoObraChapeamento) || 0) + material)
}

function calcularValorUnitForro(a: AmbienteForm): number {
  const material = a.materialForro ? Number(a.valorMaterialForro) || 0 : 0
  return arredondar((Number(a.valorMaoObraForro) || 0) + material)
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
  const [segmentoKey, setSegmentoKey] = useState<SegmentoKey>(segmentoPadrao)
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
    valorMaterialChapeamento: a.valor_material_chapeamento,
    valorMaoObraForro: a.valor_mao_obra_forro,
    materialForro: a.material_forro,
    valorMaterialForro: a.valor_material_forro,
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
      valorMaterialChapeamento: 0,
      valorMaoObraForro: 0,
      materialForro: false,
      valorMaterialForro: 0,
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
        <div className="mb-5 flex flex-wrap gap-2">
          {Object.entries(SEGMENTOS).map(([key, seg]) => (
            <button
              key={key}
              onClick={() => { setSegmentoKey(key as SegmentoKey); setBdi(seg.bdiPadrao) }}
              className={`rounded-sm border px-3.5 py-2 text-sm ${segmentoKey === key ? 'border-brass bg-brass-soft font-bold' : 'border-line'}`}
            >
              {seg.label}
            </button>
          ))}
        </div>

        <div className="mb-6 grid grid-cols-2 gap-3.5 border-b border-line pb-5 text-sm">
          <label className="flex flex-col gap-1">Cliente
            <input value={clienteNome} onChange={(e) => setClienteNome(e.target.value)} className="border-b border-line bg-transparent py-1 outline-none focus:border-brass" />
          </label>
          <label className="flex flex-col gap-1">Contato do cliente
            <input value={clienteContato} onChange={(e) => setClienteContato(e.target.value)} className="border-b border-line bg-transparent py-1 outline-none focus:border-brass" />
          </label>
          <label className="col-span-2 flex flex-col gap-1">Endereço da obra
            <input value={obraEndereco} onChange={(e) => setObraEndereco(e.target.value)} className="border-b border-line bg-transparent py-1 outline-none focus:border-brass" />
          </label>
          <label className="flex flex-col gap-1">Prazo de execução
            <input value={prazoExecucao} onChange={(e) => setPrazoExecucao(e.target.value)} className="border-b border-line bg-transparent py-1 outline-none focus:border-brass" />
          </label>
          <label className="flex flex-col gap-1">Validade (dias)
            <input type="number" value={validadeDias} onChange={(e) => setValidadeDias(Number(e.target.value))} className="border-b border-line bg-transparent py-1 outline-none focus:border-brass" />
          </label>
          <label className="col-span-2 flex flex-col gap-1">Condições de pagamento
            <input value={formaPagamento} onChange={(e) => setFormaPagamento(e.target.value)} className="border-b border-line bg-transparent py-1 outline-none focus:border-brass" />
          </label>
        </div>

        {segmentoPadrao === 'drywall' && (
          <div className="mb-5">
            <div className="mb-3 text-xs font-bold uppercase tracking-wide text-brass">Ambientes (cômodos)</div>
            <div className="flex flex-col gap-2.5">
              {ambientes.map((a) => (
                <div key={a.localId} className="border border-line bg-white px-3 py-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <input
                      value={a.nome}
                      onChange={(e) => atualizarAmbiente(a.localId, 'nome', e.target.value)}
                      className="font-bold text-brass bg-transparent outline-none border-b border-transparent focus:border-brass"
                    />
                    <button onClick={() => removerAmbiente(a.localId)} className="text-danger">×</button>
                  </div>

                  <div className="mt-2 grid grid-cols-1 gap-2 text-xs sm:grid-cols-3">
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

                  <div className="mt-2 flex flex-wrap items-center gap-4 text-xs">
                    <label className="flex items-center gap-1.5">Chapeamento
                      <select value={a.chapeamento} onChange={(e) => atualizarAmbiente(a.localId, 'chapeamento', e.target.value as ChapeamentoTipo)} className="border-b border-line bg-transparent py-1 outline-none focus:border-brass">
                        <option value="simples">Simples</option>
                        <option value="duplo">Duplo</option>
                      </select>
                    </label>
                    <label className="flex items-center gap-1.5">
                      <input type="checkbox" checked={a.forro} onChange={(e) => atualizarAmbiente(a.localId, 'forro', e.target.checked)} />
                      Forro
                    </label>
                  </div>

                  <div className="mt-2.5 flex flex-col gap-2 border-t border-dotted border-line pt-2.5 text-xs">
                    <div className="text-ink-soft">Chapeamento — mão de obra e material</div>
                    <div className="flex flex-wrap items-end gap-3">
                      <label className="flex flex-col gap-1">Mão de obra (R$/m²)
                        <input type="number" value={a.valorMaoObraChapeamento} onChange={(e) => atualizarAmbiente(a.localId, 'valorMaoObraChapeamento', Number(e.target.value))} className="font-mono-num w-28 border-b border-line bg-transparent py-1 outline-none focus:border-brass" />
                      </label>
                      <label className="flex items-center gap-1.5">
                        <input type="checkbox" checked={a.materialChapeamento} onChange={(e) => atualizarAmbiente(a.localId, 'materialChapeamento', e.target.checked)} />
                        Material por conta do prestador
                      </label>
                      {a.materialChapeamento && (
                        <label className="flex flex-col gap-1">Material (R$/m²)
                          <input type="number" value={a.valorMaterialChapeamento} onChange={(e) => atualizarAmbiente(a.localId, 'valorMaterialChapeamento', Number(e.target.value))} className="font-mono-num w-28 border-b border-line bg-transparent py-1 outline-none focus:border-brass" />
                        </label>
                      )}
                    </div>
                  </div>

                  {a.forro && (
                    <div className="mt-2.5 flex flex-col gap-2 border-t border-dotted border-line pt-2.5 text-xs">
                      <div className="text-ink-soft">Forro — mão de obra e material</div>
                      <div className="flex flex-wrap items-end gap-3">
                        <label className="flex flex-col gap-1">Mão de obra (R$/m²)
                          <input type="number" value={a.valorMaoObraForro} onChange={(e) => atualizarAmbiente(a.localId, 'valorMaoObraForro', Number(e.target.value))} className="font-mono-num w-28 border-b border-line bg-transparent py-1 outline-none focus:border-brass" />
                        </label>
                        <label className="flex items-center gap-1.5">
                          <input type="checkbox" checked={a.materialForro} onChange={(e) => atualizarAmbiente(a.localId, 'materialForro', e.target.checked)} />
                          Material por conta do prestador
                        </label>
                        {a.materialForro && (
                          <label className="flex flex-col gap-1">Material (R$/m²)
                            <input type="number" value={a.valorMaterialForro} onChange={(e) => atualizarAmbiente(a.localId, 'valorMaterialForro', Number(e.target.value))} className="font-mono-num w-28 border-b border-line bg-transparent py-1 outline-none focus:border-brass" />
                          </label>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="mt-2.5 font-mono-num text-xs text-ink-soft">
                    Chapeamento: {calcularAreaChapeamento(a).toFixed(2)} m² × {formatarMoeda(calcularValorUnitChapeamento(a))}
                    {a.forro && ` · Forro: ${calcularAreaForro(a).toFixed(2)} m² × ${formatarMoeda(calcularValorUnitForro(a))}`}
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
          <div className="mb-5">
            <div className="mb-3 text-xs font-bold uppercase tracking-wide text-brass">Itens da sua biblioteca</div>
            <div className="flex flex-wrap gap-2">
              {biblioteca.map((item) => (
                <button key={item.id} onClick={() => adicionarDaBiblioteca(item)} className="flex items-center gap-1 rounded-sm border border-line bg-white px-3 py-1.5 text-xs">
                  + {item.descricao} <span className="opacity-50">· R$ {item.valor_unit_padrao}/{item.unidade}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <div>
          <div className="mb-3 text-xs font-bold uppercase tracking-wide text-brass">Itens do orçamento</div>
          <div className="flex flex-col gap-2.5">
            {itens.map((it) => {
              const vinculadoAmbiente = it.ambienteLocalId !== null
              return (
                <div key={it.localId} className="border-b border-dotted border-line pb-2.5">
                  <div className="grid grid-cols-[2.2fr_0.9fr_0.7fr_0.9fr_auto] items-center gap-2 text-sm">
                    <input
                      value={it.descricao}
                      onChange={(e) => atualizarItem(it.localId, 'descricao', e.target.value)}
                      placeholder="Descrição"
                      disabled={vinculadoAmbiente}
                      className="border-b border-line bg-transparent py-1 outline-none focus:border-brass disabled:opacity-60"
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
                      disabled={vinculadoAmbiente}
                      className="font-mono-num border-b border-line bg-transparent py-1 outline-none focus:border-brass disabled:opacity-60"
                    />
                    {vinculadoAmbiente ? (
                      <span className="text-center text-xs text-ink-soft" title="Gerado por um ambiente — edite ou remova o ambiente para alterar">🔗</span>
                    ) : (
                      <button onClick={() => removerItem(it.localId)} className="text-danger">×</button>
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
          <button onClick={adicionarItemVazio} className="mt-3 rounded-sm border border-dashed border-line px-3.5 py-2 text-sm text-ink-soft">
            + Item manual
          </button>
        </div>

        <div className="mt-6 flex items-center gap-2.5 border-t border-line pt-5 text-sm">
          <span>BDI / margem:</span>
          <input type="number" value={bdi} onChange={(e) => setBdi(Number(e.target.value))} className="font-mono-num w-14 border-b border-line bg-transparent py-1 text-center outline-none focus:border-brass" />
          <span>%</span>
        </div>

        {erro && <p className="mt-4 text-sm text-danger">{erro}</p>}

        <button onClick={salvar} disabled={salvando} className="mt-5 rounded-sm bg-blueprint-deep px-5 py-3 font-sans font-bold text-paper disabled:opacity-50">
          {salvando ? 'Salvando…' : 'Salvar orçamento'}
        </button>
      </div>

      <div className="lg:sticky lg:top-5 self-start">
        <OrcamentoPreview
          empresaNome={empresaNome}
          segmentoLabel={SEGMENTOS[segmentoKey].label}
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
