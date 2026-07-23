'use client'

import { useState } from 'react'
import { SEGMENTOS } from '@/lib/segmentos-seed'
import { OrcamentoPreview } from './OrcamentoPreview'
import type { Categoria, ItemBiblioteca, ItemOrcamento, ModoMedicao, SegmentoKey } from '@/lib/types'

interface ItemForm {
  descricao: string
  categoria: Categoria
  unidade: string
  modo_medicao: ModoMedicao
  comprimento: number | null
  altura: number | null
  quantidade: number
  valor_unit: number
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

export interface OrcamentoBuilderPayload {
  clienteNome: string
  clienteContato: string
  obraEndereco: string
  prazoExecucao: string
  validadeDias: number
  formaPagamento: string
  bdi: number
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
  }
  onSalvar: (payload: OrcamentoBuilderPayload) => Promise<{ error?: string }>
}

let nextLocalId = 1

export function OrcamentoBuilder({ biblioteca, segmentoPadrao, empresaNome, valoresIniciais, onSalvar }: OrcamentoBuilderProps) {
  const [segmentoKey, setSegmentoKey] = useState<SegmentoKey>(segmentoPadrao)
  const [itens, setItens] = useState<(ItemForm & { localId: number })[]>(
    (valoresIniciais?.itens ?? []).map((it) => ({ ...it, localId: nextLocalId++ }))
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
      },
    ])
  }

  function adicionarItemVazio() {
    setItens((prev) => [
      ...prev,
      { localId: nextLocalId++, descricao: '', unidade: 'un', categoria: 'mao_obra', modo_medicao: 'manual', comprimento: null, altura: null, quantidade: 1, valor_unit: 0 },
    ])
  }

  function atualizarItem<K extends keyof ItemForm>(localId: number, campo: K, valor: ItemForm[K]) {
    setItens((prev) => prev.map((it) => (it.localId === localId ? { ...it, [campo]: valor } : it)))
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
            {itens.map((it) => (
              <div key={it.localId} className="border-b border-dotted border-line pb-2.5">
                <div className="grid grid-cols-[2.2fr_0.9fr_0.7fr_0.9fr_auto] items-center gap-2 text-sm">
                  <input value={it.descricao} onChange={(e) => atualizarItem(it.localId, 'descricao', e.target.value)} placeholder="Descrição" className="border-b border-line bg-transparent py-1 outline-none focus:border-brass" />
                  <select value={it.categoria} onChange={(e) => atualizarItem(it.localId, 'categoria', e.target.value as Categoria)} className="border-b border-line bg-transparent py-1 outline-none focus:border-brass">
                    <option value="material">Material</option>
                    <option value="mao_obra">Mão de obra</option>
                  </select>
                  <input value={it.unidade} onChange={(e) => atualizarItem(it.localId, 'unidade', e.target.value)} className="border-b border-line bg-transparent py-1 outline-none focus:border-brass" />
                  <input type="number" value={it.valor_unit} onChange={(e) => atualizarItem(it.localId, 'valor_unit', Number(e.target.value))} className="font-mono-num border-b border-line bg-transparent py-1 outline-none focus:border-brass" />
                  <button onClick={() => removerItem(it.localId)} className="text-danger">×</button>
                </div>

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
              </div>
            ))}
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
