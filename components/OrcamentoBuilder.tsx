'use client'

import { useState } from 'react'
import Link from 'next/link'
import { SEGMENTOS } from '@/lib/segmentos-seed'
import { formatarMoeda } from '@/lib/calc'
import { OrcamentoPreview } from './OrcamentoPreview'
import type { AmbienteOrcamento, Categoria, ItemBiblioteca, ItemOrcamento, MedidaAmbiente, ModoMedicao, SegmentoKey } from '@/lib/types'

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
  origem_ambiente: MedidaAmbiente | null
  materialItemId: string | null
  valorMaterial: number
}

interface AmbienteForm {
  nome: string
  comprimento: number
  largura: number
  peDireito: number
}

export interface AmbientePayload extends AmbienteForm {
  localId: number
}

const MEDIDA_LABEL: Record<MedidaAmbiente, string> = {
  perimetro: 'Perímetro',
  area: 'Área',
  area_parede: 'Área de parede',
}

function arredondar(n: number): number {
  return Math.round(n * 100) / 100
}

// Segmentos que orçam por parede construída (drywall, alvenaria) usam
// pé-direito e área de parede. Elétrica/hidráulica não orçam por
// parede, só precisam de área/perímetro do ambiente.
function segmentoTemParede(segmento: SegmentoKey): boolean {
  return segmento === 'drywall' || segmento === 'construcao'
}

function calcularPerimetro(a: AmbienteForm): number {
  return arredondar(2 * ((Number(a.comprimento) || 0) + (Number(a.largura) || 0)))
}

function calcularArea(a: AmbienteForm): number {
  return arredondar((Number(a.comprimento) || 0) * (Number(a.largura) || 0))
}

function calcularAreaParede(a: AmbienteForm): number {
  return arredondar(calcularPerimetro(a) * (Number(a.peDireito) || 0))
}

function medidasDisponiveis(segmento: SegmentoKey): MedidaAmbiente[] {
  return segmentoTemParede(segmento) ? ['perimetro', 'area', 'area_parede'] : ['perimetro', 'area']
}

function calcularMedida(a: AmbienteForm, medida: MedidaAmbiente): number {
  if (medida === 'perimetro') return calcularPerimetro(a)
  if (medida === 'area_parede') return calcularAreaParede(a)
  return calcularArea(a)
}

export interface OrcamentoBuilderPayload {
  clienteNome: string
  clienteContato: string
  obraEndereco: string
  prazoExecucao: string
  validadeDias: number
  formaPagamento: string
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
    itens: ItemOrcamento[]
    ambientes: AmbienteOrcamento[]
  }
  onSalvar: (payload: OrcamentoBuilderPayload) => Promise<{ error?: string }>
}

let nextLocalId = 1
let nextAmbienteLocalId = 1

export function OrcamentoBuilder({ biblioteca, segmentoPadrao, empresaNome, valoresIniciais, onSalvar }: OrcamentoBuilderProps) {
  const temParede = segmentoTemParede(segmentoPadrao)
  const medidas = medidasDisponiveis(segmentoPadrao)

  const ambientesIniciais: AmbientePayload[] = (valoresIniciais?.ambientes ?? []).map((a) => ({
    localId: nextAmbienteLocalId++,
    nome: a.nome,
    comprimento: a.comprimento,
    largura: a.largura,
    peDireito: a.pe_direito,
  }))
  const ambienteLocalIdPorDbId = new Map(
    (valoresIniciais?.ambientes ?? []).map((a, i) => [a.id, ambientesIniciais[i].localId])
  )
  const materiaisBiblioteca = biblioteca.filter((item) => item.categoria === 'material')
  const [ambientes, setAmbientes] = useState<AmbientePayload[]>(ambientesIniciais)
  const [itens, setItens] = useState<(ItemForm & { localId: number })[]>(
    (valoresIniciais?.itens ?? []).map((it) => ({
      ...it,
      localId: nextLocalId++,
      ambienteLocalId: it.ambiente_id ? ambienteLocalIdPorDbId.get(it.ambiente_id) ?? null : null,
      origem_ambiente: it.origem_ambiente as MedidaAmbiente | null,
      materialItemId: it.material_item_id,
      valorMaterial: it.valor_material,
    }))
  )
  const [picker, setPicker] = useState<Record<number, { servicoId: string; medida: MedidaAmbiente }>>({})
  const [clienteNome, setClienteNome] = useState(valoresIniciais?.clienteNome ?? '')
  const [clienteContato, setClienteContato] = useState(valoresIniciais?.clienteContato ?? '')
  const [obraEndereco, setObraEndereco] = useState(valoresIniciais?.obraEndereco ?? '')
  const [prazoExecucao, setPrazoExecucao] = useState(valoresIniciais?.prazoExecucao ?? '')
  const [validadeDias, setValidadeDias] = useState(valoresIniciais?.validadeDias ?? 7)
  const [formaPagamento, setFormaPagamento] = useState(valoresIniciais?.formaPagamento ?? '50% de entrada, 50% na entrega')
  const [erro, setErro] = useState<string | null>(null)
  const [salvando, setSalvando] = useState(false)

  function adicionarAmbiente() {
    const novo: AmbientePayload = {
      localId: nextAmbienteLocalId++,
      nome: `Ambiente ${ambientes.length + 1}`,
      comprimento: 3,
      largura: 3,
      peDireito: temParede ? 2.8 : 0,
    }
    setAmbientes((prev) => [...prev, novo])
  }

  function atualizarAmbiente(localId: number, patch: Partial<AmbienteForm>) {
    const ambienteAtual = ambientes.find((a) => a.localId === localId)
    if (!ambienteAtual) return
    const novoAmbiente: AmbientePayload = { ...ambienteAtual, ...patch }
    setAmbientes((prev) => prev.map((a) => (a.localId === localId ? novoAmbiente : a)))
    setItens((prev) => prev.map((it) => {
      if (it.ambienteLocalId !== localId || !it.origem_ambiente) return it
      if (!medidas.includes(it.origem_ambiente)) return it
      return { ...it, quantidade: calcularMedida(novoAmbiente, it.origem_ambiente) }
    }))
  }

  function removerAmbiente(localId: number) {
    setAmbientes((prev) => prev.filter((a) => a.localId !== localId))
    setItens((prev) => prev.filter((it) => it.ambienteLocalId !== localId))
  }

  function definirPickerServico(ambienteLocalId: number, servicoId: string) {
    setPicker((prev) => ({ ...prev, [ambienteLocalId]: { medida: prev[ambienteLocalId]?.medida ?? medidas[0], servicoId } }))
  }

  function definirPickerMedida(ambienteLocalId: number, medida: MedidaAmbiente) {
    setPicker((prev) => ({ ...prev, [ambienteLocalId]: { servicoId: prev[ambienteLocalId]?.servicoId ?? '', medida } }))
  }

  function adicionarServicoAoAmbiente(ambienteLocalId: number) {
    const escolha = picker[ambienteLocalId]
    const ambiente = ambientes.find((a) => a.localId === ambienteLocalId)
    const servico = escolha ? biblioteca.find((b) => b.id === escolha.servicoId) : undefined
    if (!ambiente || !servico || !escolha) return
    setItens((prev) => [
      ...prev,
      {
        localId: nextLocalId++,
        descricao: `${servico.descricao} — ${ambiente.nome}`,
        categoria: servico.categoria,
        unidade: servico.unidade,
        modo_medicao: 'manual',
        comprimento: null,
        altura: null,
        quantidade: calcularMedida(ambiente, escolha.medida),
        valor_unit: servico.valor_unit_padrao,
        ambienteLocalId: ambiente.localId,
        origem_ambiente: escolha.medida,
        materialItemId: null,
        valorMaterial: 0,
      },
    ])
    setPicker((prev) => ({ ...prev, [ambienteLocalId]: { servicoId: '', medida: escolha.medida } }))
  }

  function atualizarMaterialItem(itemLocalId: number, materialId: string) {
    setItens((prev) => prev.map((it) => {
      if (it.localId !== itemLocalId) return it
      const base = it.valor_unit - it.valorMaterial
      const material = materialId ? materiaisBiblioteca.find((m) => m.id === materialId) : undefined
      const valorMaterial = material ? material.valor_unit_padrao : 0
      return { ...it, materialItemId: material ? material.id : null, valorMaterial, valor_unit: arredondar(base + valorMaterial) }
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
      setErro('Adicione ao menos um serviço a um ambiente.')
      return
    }
    setSalvando(true)
    const resultado = await onSalvar({
      clienteNome, clienteContato, obraEndereco, prazoExecucao, validadeDias, formaPagamento,
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

        <div className="mb-5">
          <div className="mb-3 text-xs font-bold uppercase tracking-wide text-brass">Ambientes</div>
          <div className="flex flex-col gap-2.5">
            {ambientes.map((a) => {
              const itensDoAmbiente = itens.filter((it) => it.ambienteLocalId === a.localId)
              const totalAmbiente = itensDoAmbiente.reduce((soma, it) => soma + it.quantidade * it.valor_unit, 0)
              const escolha = picker[a.localId] ?? { servicoId: '', medida: medidas[0] }

              return (
                <div key={a.localId} className="flex flex-col gap-5 border border-line bg-white p-4 sm:p-5">

                  {/* Bloco 1 — identificação */}
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <label className="flex-1">
                        <span className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-brass">Nome / descrição do ambiente</span>
                        <input
                          value={a.nome}
                          onChange={(e) => atualizarAmbiente(a.localId, { nome: e.target.value })}
                          className="w-full border-b border-line bg-transparent py-1 text-lg font-bold text-blueprint-deep outline-none focus:border-brass"
                        />
                      </label>
                      <button onClick={() => removerAmbiente(a.localId)} className="mt-5 text-danger">×</button>
                    </div>

                    <div className={`mt-3 grid grid-cols-1 gap-3 text-xs ${temParede ? 'sm:grid-cols-3' : 'sm:grid-cols-2'}`}>
                      <label className="flex flex-col gap-1">Comprimento (m)
                        <input type="number" value={a.comprimento} onChange={(e) => atualizarAmbiente(a.localId, { comprimento: Number(e.target.value) })} className="font-mono-num border-b border-line bg-transparent py-1 outline-none focus:border-brass" />
                      </label>
                      <label className="flex flex-col gap-1">Largura (m)
                        <input type="number" value={a.largura} onChange={(e) => atualizarAmbiente(a.localId, { largura: Number(e.target.value) })} className="font-mono-num border-b border-line bg-transparent py-1 outline-none focus:border-brass" />
                      </label>
                      {temParede && (
                        <label className="flex flex-col gap-1">Pé-direito (m)
                          <input type="number" value={a.peDireito} onChange={(e) => atualizarAmbiente(a.localId, { peDireito: Number(e.target.value) })} className="font-mono-num border-b border-line bg-transparent py-1 outline-none focus:border-brass" />
                        </label>
                      )}
                    </div>
                  </div>

                  {/* Bloco 2 — métricas calculadas */}
                  <div className="border-t border-line pt-4">
                    <div className="mb-2.5 text-[10px] font-bold uppercase tracking-wide text-ink-soft">Métricas calculadas</div>
                    <div className={`grid grid-cols-2 gap-2.5 ${temParede ? 'sm:grid-cols-3' : 'sm:grid-cols-2'}`}>
                      <div className="rounded-sm bg-paper px-3 py-2.5">
                        <div className="text-[10px] uppercase tracking-wide text-ink-soft">Perímetro</div>
                        <div className="font-mono-num text-lg font-bold text-blueprint-deep">{calcularPerimetro(a).toFixed(2)}<span className="ml-1 text-xs font-normal text-ink-soft">ML</span></div>
                      </div>
                      <div className="rounded-sm bg-paper px-3 py-2.5">
                        <div className="text-[10px] uppercase tracking-wide text-ink-soft">Área</div>
                        <div className="font-mono-num text-lg font-bold text-blueprint-deep">{calcularArea(a).toFixed(2)}<span className="ml-1 text-xs font-normal text-ink-soft">m²</span></div>
                      </div>
                      {temParede && (
                        <div className="rounded-sm bg-paper px-3 py-2.5">
                          <div className="text-[10px] uppercase tracking-wide text-ink-soft">Área de parede</div>
                          <div className="font-mono-num text-lg font-bold text-blueprint-deep">{calcularAreaParede(a).toFixed(2)}<span className="ml-1 text-xs font-normal text-ink-soft">m²</span></div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Bloco 3 — serviços do ambiente */}
                  <div className="border-t border-line pt-4">
                    <div className="mb-2.5 text-[10px] font-bold uppercase tracking-wide text-ink-soft">Serviços do ambiente</div>

                    {itensDoAmbiente.length > 0 && (
                      <div className="mb-3 flex flex-col gap-3">
                        {itensDoAmbiente.map((it) => (
                          <div key={it.localId} className="rounded-sm bg-paper p-3.5">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <div className="text-xs font-bold text-blueprint-deep">{it.descricao}</div>
                                <div className="mt-1 font-mono-num text-xs text-ink-soft">
                                  {it.origem_ambiente && MEDIDA_LABEL[it.origem_ambiente] ? MEDIDA_LABEL[it.origem_ambiente] : 'Manual'} · {it.quantidade.toFixed(2)}{it.unidade} × {formatarMoeda(it.valor_unit)} = {formatarMoeda(it.quantidade * it.valor_unit)}
                                </div>
                              </div>
                              <button onClick={() => removerItem(it.localId)} className="text-danger">×</button>
                            </div>
                            {materiaisBiblioteca.length > 0 && (
                              <label className="mt-2 flex flex-col gap-1 text-xs">Material (biblioteca) — opcional, soma ao valor
                                <select
                                  value={it.materialItemId ?? ''}
                                  onChange={(e) => atualizarMaterialItem(it.localId, e.target.value)}
                                  className="w-full max-w-xs border-b border-line bg-white py-1 outline-none focus:border-brass"
                                >
                                  <option value="">Nenhum</option>
                                  {materiaisBiblioteca.map((m) => (
                                    <option key={m.id} value={m.id}>{m.descricao} — {formatarMoeda(m.valor_unit_padrao)}/{m.unidade}</option>
                                  ))}
                                </select>
                              </label>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {biblioteca.length === 0 ? (
                      <p className="text-xs text-ink-soft">Nenhum serviço cadastrado ainda. <Link href="/configuracoes" className="font-bold text-brass underline">Cadastre em Configurações</Link> primeiro.</p>
                    ) : (
                      <div className="flex flex-wrap items-end gap-2">
                        <label className="flex flex-1 flex-col gap-1 text-xs" style={{ minWidth: '160px' }}>Serviço
                          <select
                            value={escolha.servicoId}
                            onChange={(e) => definirPickerServico(a.localId, e.target.value)}
                            className="border-b border-line bg-white py-1 outline-none focus:border-brass"
                          >
                            <option value="">Selecione um serviço</option>
                            {biblioteca.map((s) => (
                              <option key={s.id} value={s.id}>{s.descricao} · {formatarMoeda(s.valor_unit_padrao)}/{s.unidade}</option>
                            ))}
                          </select>
                        </label>
                        <label className="flex flex-col gap-1 text-xs">Medida
                          <select
                            value={escolha.medida}
                            onChange={(e) => definirPickerMedida(a.localId, e.target.value as MedidaAmbiente)}
                            className="border-b border-line bg-white py-1 outline-none focus:border-brass"
                          >
                            {medidas.map((m) => (
                              <option key={m} value={m}>{MEDIDA_LABEL[m]}</option>
                            ))}
                          </select>
                        </label>
                        <button
                          onClick={() => adicionarServicoAoAmbiente(a.localId)}
                          disabled={!escolha.servicoId}
                          className="rounded-sm border border-dashed border-line px-3.5 py-2 text-sm text-ink-soft disabled:opacity-50"
                        >
                          + Adicionar serviço ao ambiente
                        </button>
                      </div>
                    )}

                    <div className="mt-3 flex items-center justify-between rounded-sm bg-blueprint-deep px-4 py-3">
                      <span className="text-xs font-bold uppercase tracking-wide text-paper">Total do ambiente</span>
                      <span className="font-mono-num text-lg font-bold text-paper">{formatarMoeda(totalAmbiente)}</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
          <button onClick={adicionarAmbiente} className="mt-3 rounded-sm border border-dashed border-line px-3.5 py-2 text-sm text-ink-soft">
            + Adicionar ambiente
          </button>
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
        />
      </div>
    </div>
  )
}
