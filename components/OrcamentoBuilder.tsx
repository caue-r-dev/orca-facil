'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { SEGMENTOS } from '@/lib/segmentos-seed'
import { formatarMoeda, nomeServicoSemAmbiente, valorFinalItem } from '@/lib/calc'
import { OrcamentoPreview } from './OrcamentoPreview'
import { NumeroInput } from './NumeroInput'
import { MaterialMultiSelect } from './MaterialMultiSelect'
import type { AmbienteOrcamento, Categoria, ItemBiblioteca, ItemOrcamento, MedidaAmbiente, ModoMedicao } from '@/lib/types'

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
  materialItemIds: string[]
  // Soma dos valor_unit_padrao dos materiais em materialItemIds — flat,
  // não multiplica por quantidade (ver calcularOrcamento).
  valor_material: number
  // Override manual do valor final da linha nesse orçamento — ver
  // valorFinalItem em lib/calc.ts. NULL = segue calculado normalmente.
  valor_customizado: number | null
  // Texto livre opcional, aparece na proposta/PDF.
  observacoes: string
  // Dobra a área de parede usada no cálculo desse item (só relevante
  // pra origem_ambiente === 'area_parede') — cobre os dois lados da
  // parede. Já embutido em `quantidade` (ver alternarChapeamentoDuplo).
  // Snake_case de propósito (como valor_customizado/observacoes acima)
  // pra bater direto com ItemOrcamento/PreviewItem sem remapear.
  chapeamento_duplo: boolean
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

interface PickerAmbiente {
  servicoId: string
  medida: MedidaAmbiente
  materialAberto: boolean
  materialIds: string[]
  quantidadeManual: number
}

const MEDIDA_LABEL: Record<MedidaAmbiente, string> = {
  perimetro: 'Perímetro',
  area: 'Área',
  area_parede: 'Área de parede',
}

// Serviços cobrados por unidade contada (não por medida do ambiente) —
// não faz sentido vincular a perímetro/área/área de parede, então em
// vez do seletor de medida pedimos só a quantidade de unidades.
const UNIDADES_SEM_MEDIDA = ['un', 'h', 'vb']
function servicoSemMedida(unidade: string): boolean {
  return UNIDADES_SEM_MEDIDA.includes(unidade)
}

function arredondar(n: number): number {
  return Math.round(n * 100) / 100
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

// Trabalhar com parede/pé-direito é um campo explícito da empresa
// (definido pelo admin no cadastro), não inferido do nome do
// segmento — segmento agora é texto livre.
function medidasDisponiveis(temParede: boolean): MedidaAmbiente[] {
  return temParede ? ['perimetro', 'area', 'area_parede'] : ['perimetro', 'area']
}

function calcularMedida(a: AmbienteForm, medida: MedidaAmbiente): number {
  if (medida === 'perimetro') return calcularPerimetro(a)
  if (medida === 'area_parede') return calcularAreaParede(a)
  return calcularArea(a)
}

// quantidade efetiva de um item = medida do ambiente, dobrada quando o
// chapeamento duplo está ativo (só faz sentido pra área de parede — em
// qualquer outra medida o multiplicador não se aplica).
function calcularQuantidadeEfetiva(a: AmbienteForm, medida: MedidaAmbiente, chapeamentoDuplo: boolean): number {
  const base = calcularMedida(a, medida)
  return medida === 'area_parede' && chapeamentoDuplo ? arredondar(base * 2) : base
}

export interface OrcamentoBuilderPayload {
  clienteNome: string
  clienteContato: string
  obraEndereco: string
  prazoExecucao: string
  validadeDias: number
  formaPagamento: string
  ocultarValorUnitario: boolean
  ambientes: AmbientePayload[]
  itens: ItemForm[]
}

interface OrcamentoBuilderProps {
  biblioteca: ItemBiblioteca[]
  segmentoPadrao: string
  temParede: boolean
  empresaNome: string
  cnpj?: string | null
  telefone?: string | null
  // Ausentes em "Novo orçamento" (ainda não existe id/data até salvar) —
  // o preview mostra "—" nesse caso.
  numeroOrcamento?: string
  dataCriacao?: string
  valoresIniciais?: {
    clienteNome: string
    clienteContato: string
    obraEndereco: string
    prazoExecucao: string
    validadeDias: number
    formaPagamento: string
    ocultarValorUnitario: boolean
    itens: ItemOrcamento[]
    ambientes: AmbienteOrcamento[]
  }
  onSalvar: (payload: OrcamentoBuilderPayload) => Promise<{ error?: string }>
}

let nextLocalId = 1
let nextAmbienteLocalId = 1

// Rascunho de orçamento NOVO (ainda não salvo) só existe no navegador —
// sair da tela (ex: pra Configurações) e voltar não pode zerar o
// progresso. Só se aplica à criação (valoresIniciais ausente); editar
// um orçamento existente já persiste no banco a cada Salvar.
const RASCUNHO_KEY = 'orcamento-rascunho-novo'

interface RascunhoOrcamento {
  clienteNome: string
  clienteContato: string
  obraEndereco: string
  prazoExecucao: string
  validadeDias: number
  formaPagamento: string
  ocultarValorUnitario: boolean
  ambientes: AmbientePayload[]
  itens: (ItemForm & { localId: number })[]
}

function carregarRascunho(): RascunhoOrcamento | null {
  if (typeof window === 'undefined') return null
  try {
    const bruto = window.localStorage.getItem(RASCUNHO_KEY)
    return bruto ? (JSON.parse(bruto) as RascunhoOrcamento) : null
  } catch {
    return null
  }
}

export function OrcamentoBuilder({ biblioteca, segmentoPadrao, temParede, empresaNome, cnpj, telefone, numeroOrcamento, dataCriacao, valoresIniciais, onSalvar }: OrcamentoBuilderProps) {
  const medidas = medidasDisponiveis(temParede)
  const isNovo = !valoresIniciais
  const rascunho = isNovo ? carregarRascunho() : null
  if (rascunho) {
    const maxAmbienteId = rascunho.ambientes.reduce((m, a) => Math.max(m, a.localId), 0)
    const maxItemId = rascunho.itens.reduce((m, it) => Math.max(m, it.localId), 0)
    nextAmbienteLocalId = Math.max(nextAmbienteLocalId, maxAmbienteId + 1)
    nextLocalId = Math.max(nextLocalId, maxItemId + 1)
  }

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
  const servicosBiblioteca = biblioteca.filter((item) => item.categoria === 'mao_obra')
  const [ambientes, setAmbientes] = useState<AmbientePayload[]>(rascunho?.ambientes ?? ambientesIniciais)
  const [itens, setItens] = useState<(ItemForm & { localId: number })[]>(
    rascunho?.itens.map((it) => ({
      ...it,
      valor_customizado: it.valor_customizado ?? null,
      observacoes: it.observacoes ?? '',
      chapeamento_duplo: it.chapeamento_duplo ?? false,
    })) ?? (valoresIniciais?.itens ?? []).map((it) => ({
      ...it,
      localId: nextLocalId++,
      ambienteLocalId: it.ambiente_id ? ambienteLocalIdPorDbId.get(it.ambiente_id) ?? null : null,
      origem_ambiente: it.origem_ambiente as MedidaAmbiente | null,
      // material_item_ids pode vir vazio em orçamentos salvos antes da
      // migração 0013 — cai pro material_item_id (uuid único) legado
      // pra não perder o material já escolhido.
      materialItemIds: it.material_item_ids && it.material_item_ids.length > 0
        ? it.material_item_ids
        : (it.material_item_id ? [it.material_item_id] : []),
      valor_material: it.valor_material,
      valor_customizado: it.valor_customizado ?? null,
      observacoes: it.observacoes ?? '',
      chapeamento_duplo: it.chapeamento_duplo ?? false,
    }))
  )
  const [picker, setPicker] = useState<Record<number, PickerAmbiente>>({})
  function pickerPadrao(ambienteLocalId: number, estado: Record<number, PickerAmbiente>): PickerAmbiente {
    return estado[ambienteLocalId] ?? { servicoId: '', medida: medidas[0], materialAberto: false, materialIds: [], quantidadeManual: 1 }
  }
  const [clienteNome, setClienteNome] = useState(rascunho?.clienteNome ?? valoresIniciais?.clienteNome ?? '')
  const [clienteContato, setClienteContato] = useState(rascunho?.clienteContato ?? valoresIniciais?.clienteContato ?? '')
  const [obraEndereco, setObraEndereco] = useState(rascunho?.obraEndereco ?? valoresIniciais?.obraEndereco ?? '')
  const [prazoExecucao, setPrazoExecucao] = useState(rascunho?.prazoExecucao ?? valoresIniciais?.prazoExecucao ?? '')
  const [validadeDias, setValidadeDias] = useState(rascunho?.validadeDias ?? valoresIniciais?.validadeDias ?? 7)
  const [formaPagamento, setFormaPagamento] = useState(rascunho?.formaPagamento ?? valoresIniciais?.formaPagamento ?? '50% de entrada, 50% na entrega')
  const [ocultarValorUnitario, setOcultarValorUnitario] = useState(rascunho?.ocultarValorUnitario ?? valoresIniciais?.ocultarValorUnitario ?? false)
  const [erro, setErro] = useState<string | null>(null)
  const [salvando, setSalvando] = useState(false)

  useEffect(() => {
    if (!isNovo) return
    const timer = setTimeout(() => {
      const draft: RascunhoOrcamento = { clienteNome, clienteContato, obraEndereco, prazoExecucao, validadeDias, formaPagamento, ocultarValorUnitario, ambientes, itens }
      window.localStorage.setItem(RASCUNHO_KEY, JSON.stringify(draft))
    }, 400)
    return () => clearTimeout(timer)
  }, [isNovo, clienteNome, clienteContato, obraEndereco, prazoExecucao, validadeDias, formaPagamento, ocultarValorUnitario, ambientes, itens])

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
      return { ...it, quantidade: calcularQuantidadeEfetiva(novoAmbiente, it.origem_ambiente, it.chapeamento_duplo) }
    }))
  }

  function removerAmbiente(localId: number) {
    setAmbientes((prev) => prev.filter((a) => a.localId !== localId))
    setItens((prev) => prev.filter((it) => it.ambienteLocalId !== localId))
  }

  function definirPickerServico(ambienteLocalId: number, servicoId: string) {
    setPicker((prev) => ({ ...prev, [ambienteLocalId]: { ...pickerPadrao(ambienteLocalId, prev), servicoId } }))
  }

  function definirPickerMedida(ambienteLocalId: number, medida: MedidaAmbiente) {
    setPicker((prev) => ({ ...prev, [ambienteLocalId]: { ...pickerPadrao(ambienteLocalId, prev), medida } }))
  }

  function definirPickerQuantidade(ambienteLocalId: number, quantidadeManual: number) {
    setPicker((prev) => ({ ...prev, [ambienteLocalId]: { ...pickerPadrao(ambienteLocalId, prev), quantidadeManual } }))
  }

  function alternarPickerMaterial(ambienteLocalId: number) {
    setPicker((prev) => {
      const atual = pickerPadrao(ambienteLocalId, prev)
      return { ...prev, [ambienteLocalId]: { ...atual, materialAberto: !atual.materialAberto, materialIds: atual.materialAberto ? [] : atual.materialIds } }
    })
  }

  function definirPickerMaterial(ambienteLocalId: number, materialIds: string[]) {
    setPicker((prev) => ({ ...prev, [ambienteLocalId]: { ...pickerPadrao(ambienteLocalId, prev), materialIds } }))
  }

  function adicionarServicoAoAmbiente(ambienteLocalId: number) {
    const escolha = picker[ambienteLocalId]
    const ambiente = ambientes.find((a) => a.localId === ambienteLocalId)
    const servico = escolha ? servicosBiblioteca.find((b) => b.id === escolha.servicoId) : undefined
    if (!ambiente || !servico || !escolha) return
    const materiais = escolha.materialIds
      .map((id) => materiaisBiblioteca.find((m) => m.id === id))
      .filter((m): m is ItemBiblioteca => !!m)
    const valorMaterial = arredondar(materiais.reduce((soma, m) => soma + m.valor_unit_padrao, 0))
    const semMedida = servicoSemMedida(servico.unidade)
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
        quantidade: semMedida ? escolha.quantidadeManual : calcularMedida(ambiente, escolha.medida),
        valor_unit: servico.valor_unit_padrao,
        ambienteLocalId: ambiente.localId,
        origem_ambiente: semMedida ? null : escolha.medida,
        materialItemIds: materiais.map((m) => m.id),
        valor_material: valorMaterial,
        valor_customizado: null,
        observacoes: '',
        chapeamento_duplo: false,
      },
    ])
    setPicker((prev) => ({ ...prev, [ambienteLocalId]: { servicoId: '', medida: escolha.medida, materialAberto: false, materialIds: [], quantidadeManual: 1 } }))
  }

  function removerItem(localId: number) {
    setItens((prev) => prev.filter((it) => it.localId !== localId))
  }

  // Marca override ativo pra esse item — quantidade/valor_unit/
  // valor_material continuam existindo (e a medida do ambiente
  // continua recalculando quantidade em atualizarAmbiente), mas
  // valorFinalItem() passa a ignorar tudo isso e usar direto este
  // valor até o override ser removido.
  function definirValorCustomizado(localId: number, valor: number) {
    setItens((prev) => prev.map((it) => (it.localId === localId ? { ...it, valor_customizado: valor } : it)))
  }

  // "Recalcular automaticamente": volta a usar quantidade*valor_unit+
  // valor_material — não desfaz nenhuma medida, só limpa o override.
  function removerValorCustomizado(localId: number) {
    setItens((prev) => prev.map((it) => (it.localId === localId ? { ...it, valor_customizado: null } : it)))
  }

  function definirObservacoes(localId: number, texto: string) {
    setItens((prev) => prev.map((it) => (it.localId === localId ? { ...it, observacoes: texto } : it)))
  }

  // Alterna chapeamento duplo — recalcula a quantidade (dobrada/normal)
  // e limpa um eventual override manual, porque a área usada de base
  // mudou e o valor customizado antigo não corresponde mais a nada
  // (o botão "Valor customizado" deixa claro visualmente que o valor
  // voltou a ser o calculado).
  function alternarChapeamentoDuplo(localId: number, ativo: boolean) {
    setItens((prev) => prev.map((it) => {
      if (it.localId !== localId) return it
      const ambiente = ambientes.find((a) => a.localId === it.ambienteLocalId)
      if (!ambiente || !it.origem_ambiente) return { ...it, chapeamento_duplo: ativo }
      return {
        ...it,
        chapeamento_duplo: ativo,
        quantidade: calcularQuantidadeEfetiva(ambiente, it.origem_ambiente, ativo),
        valor_customizado: null,
      }
    }))
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
    // Fase 1 do PWA offline é só visualização — salvar exige rede. Falha
    // rápido e com mensagem clara em vez de deixar a server action
    // tentar e travar/lançar um erro genérico de fetch.
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setErro('Sem conexão — não é possível salvar agora. Tente novamente quando a internet voltar.')
      return
    }
    setSalvando(true)
    // Limpa o rascunho local antes de enviar: se salvar com sucesso, o
    // redirect pra tela de edição não deve trazer o rascunho antigo de
    // volta na próxima vez que "Novo orçamento" for aberto.
    if (isNovo) window.localStorage.removeItem(RASCUNHO_KEY)
    try {
      const resultado = await onSalvar({
        clienteNome, clienteContato, obraEndereco, prazoExecucao, validadeDias, formaPagamento, ocultarValorUnitario,
        ambientes,
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        itens: itens.map(({ localId, ...rest }) => rest),
      })
      setSalvando(false)
      // redirect() bem-sucedido (criar orçamento novo) lança uma exceção
      // especial em vez de retornar — chega aqui só quando a action
      // termina sem redirecionar. Se por algum motivo ela não devolver
      // nada (bug de servidor, resposta cortada), trata como erro
      // genérico em vez de quebrar a tela tentando ler .error de undefined.
      if (!resultado) {
        setErro('Não foi possível salvar o orçamento. Tente novamente.')
        return
      }
      if (resultado.error) setErro(resultado.error)
    } catch (e) {
      // Erro de redirect do Next (navegação de sucesso) precisa continuar
      // subindo pra o framework tratar — não é uma falha real.
      if (e && typeof e === 'object' && 'digest' in e && typeof e.digest === 'string' && e.digest.startsWith('NEXT_REDIRECT')) {
        throw e
      }
      setSalvando(false)
      // TypeError é o que o browser lança pra fetch que não conseguiu
      // nem completar a requisição (rede caiu no meio da tentativa) —
      // navigator.onLine podia estar true no início e virar false só
      // durante o request.
      setErro(
        e instanceof TypeError
          ? 'Sem conexão — não é possível salvar agora. Tente novamente quando a internet voltar.'
          : 'Erro ao salvar orçamento. Tente novamente.'
      )
    }
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
              <NumeroInput value={validadeDias} onChange={setValidadeDias} className="font-mono-num border-b border-line bg-transparent py-1 outline-none focus:border-brass" />
            </label>
            <label className="flex flex-col gap-1 sm:col-span-2">
              <span className="text-[10px] font-bold uppercase tracking-wide text-ink-soft">Condições de pagamento</span>
              <input value={formaPagamento} onChange={(e) => setFormaPagamento(e.target.value)} className="border-b border-line bg-transparent py-1 outline-none focus:border-brass" />
            </label>
            <label className="flex items-center gap-2 sm:col-span-2">
              <input type="checkbox" checked={ocultarValorUnitario} onChange={(e) => setOcultarValorUnitario(e.target.checked)} className="h-4 w-4 accent-brass" />
              <span className="text-xs text-ink-soft">Ocultar valor unitário da mão de obra na proposta</span>
            </label>
          </div>
        </div>

        <div className="mb-5">
          <div className="mb-3 text-xs font-bold uppercase tracking-wide text-brass">Ambientes</div>
          <div className="flex flex-col gap-2.5">
            {ambientes.map((a) => {
              const itensDoAmbiente = itens.filter((it) => it.ambienteLocalId === a.localId)
              const totalAmbiente = itensDoAmbiente.reduce((soma, it) => soma + valorFinalItem(it), 0)
              const escolha = pickerPadrao(a.localId, picker)
              const servicoEscolhido = escolha.servicoId ? servicosBiblioteca.find((s) => s.id === escolha.servicoId) : undefined
              const semMedidaEscolhida = servicoEscolhido ? servicoSemMedida(servicoEscolhido.unidade) : false

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
                        <NumeroInput step="0.01" min="0" value={a.comprimento} onChange={(n) => atualizarAmbiente(a.localId, { comprimento: n })} className="font-mono-num border-b border-line bg-transparent py-1 outline-none focus:border-brass" />
                      </label>
                      <label className="flex flex-col gap-1">Largura (m)
                        <NumeroInput step="0.01" min="0" value={a.largura} onChange={(n) => atualizarAmbiente(a.localId, { largura: n })} className="font-mono-num border-b border-line bg-transparent py-1 outline-none focus:border-brass" />
                      </label>
                      {temParede && (
                        <label className="flex flex-col gap-1">Pé-direito (m)
                          <NumeroInput step="0.01" min="0" value={a.peDireito} onChange={(n) => atualizarAmbiente(a.localId, { peDireito: n })} className="font-mono-num border-b border-line bg-transparent py-1 outline-none focus:border-brass" />
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
                        {itensDoAmbiente.map((it) => {
                          const valorFinal = valorFinalItem(it)
                          const temOverride = it.valor_customizado !== null
                          const ehAreaParede = it.origem_ambiente === 'area_parede'
                          const areaBase = ehAreaParede ? calcularAreaParede(a) : null
                          return (
                            <div key={it.localId} className="rounded-sm bg-paper p-3.5">
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex-1">
                                  <div className="text-xs font-bold text-blueprint-deep">
                                    {it.descricao}
                                    {it.chapeamento_duplo && <span className="ml-1 text-[10px] font-normal normal-case text-brass">(chapeamento duplo)</span>}
                                  </div>
                                  <div className="mt-1 font-mono-num text-xs text-ink-soft">
                                    {it.origem_ambiente && MEDIDA_LABEL[it.origem_ambiente] ? MEDIDA_LABEL[it.origem_ambiente] : 'Manual'}
                                    {' · '}
                                    {it.chapeamento_duplo && areaBase !== null
                                      ? `${areaBase.toFixed(2)}${it.unidade} × 2 = ${it.quantidade.toFixed(2)}${it.unidade}`
                                      : `${it.quantidade.toFixed(2)}${it.unidade}`}
                                    {' × '}{formatarMoeda(it.valor_unit)}
                                    {it.valor_material > 0 && ` + ${formatarMoeda(it.valor_material)}`}
                                    {' '}= {formatarMoeda(it.quantidade * it.valor_unit + it.valor_material)}
                                    {temOverride && <span className="ml-1 text-brass">(calculado)</span>}
                                  </div>
                                  {ehAreaParede && (
                                    <label className="mt-1.5 flex items-center gap-1.5 text-[11px] text-ink-soft">
                                      <input
                                        type="checkbox"
                                        checked={it.chapeamento_duplo}
                                        onChange={(e) => alternarChapeamentoDuplo(it.localId, e.target.checked)}
                                      />
                                      Chapeamento duplo (dobra a área de parede)
                                    </label>
                                  )}
                                  {it.materialItemIds.length > 0 && (
                                    <div className="mt-0.5 text-[11px] text-ink-soft">
                                      Materiais: {it.materialItemIds.map((id) => materiaisBiblioteca.find((m) => m.id === id)?.descricao).filter(Boolean).join(', ')}
                                    </div>
                                  )}
                                  <div className="mt-2 flex flex-wrap items-end gap-2">
                                    <label className="flex flex-col gap-1 text-[10px] font-bold uppercase tracking-wide text-ink-soft">
                                      Valor deste serviço (R$)
                                      <NumeroInput
                                        step="0.01"
                                        min="0"
                                        value={valorFinal}
                                        onChange={(n) => definirValorCustomizado(it.localId, n)}
                                        className="font-mono-num w-28 border-b border-line bg-transparent py-1 text-xs outline-none focus:border-brass"
                                      />
                                    </label>
                                    {temOverride && (
                                      <>
                                        <span className="rounded-sm bg-brass-soft px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-blueprint-deep">Valor customizado</span>
                                        <button
                                          type="button"
                                          onClick={() => removerValorCustomizado(it.localId)}
                                          className="text-[11px] text-ink-soft underline"
                                        >
                                          Recalcular automaticamente
                                        </button>
                                      </>
                                    )}
                                  </div>
                                  <label className="mt-2 flex flex-col gap-1 text-[10px] font-bold uppercase tracking-wide text-ink-soft">
                                    Descrição adicional (opcional)
                                    <input
                                      value={it.observacoes}
                                      onChange={(e) => definirObservacoes(it.localId, e.target.value)}
                                      placeholder="Observações específicas desse serviço nesse orçamento"
                                      className="w-full border-b border-line bg-transparent py-1 text-xs font-normal normal-case outline-none focus:border-brass"
                                    />
                                  </label>
                                </div>
                                <button onClick={() => removerItem(it.localId)} className="text-danger">×</button>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}

                    {servicosBiblioteca.length === 0 ? (
                      <p className="text-xs text-ink-soft">Nenhum serviço de mão de obra cadastrado ainda. <Link href="/configuracoes" className="font-bold text-brass underline">Cadastre em Configurações</Link> primeiro.</p>
                    ) : (
                      <div className="flex flex-col gap-2">
                        <div className="flex flex-wrap items-end gap-2">
                          <label className="flex flex-1 flex-col gap-1 text-xs" style={{ minWidth: '160px' }}>Serviço (mão de obra)
                            <select
                              value={escolha.servicoId}
                              onChange={(e) => definirPickerServico(a.localId, e.target.value)}
                              className="border-b border-line bg-white py-1 outline-none focus:border-brass"
                            >
                              <option value="">Selecione um serviço</option>
                              {servicosBiblioteca.map((s) => (
                                <option key={s.id} value={s.id}>{s.descricao} · {formatarMoeda(s.valor_unit_padrao)}/{s.unidade}</option>
                              ))}
                            </select>
                          </label>
                          {semMedidaEscolhida ? (
                            <label className="flex flex-col gap-1 text-xs">Quantidade ({servicoEscolhido!.unidade})
                              <NumeroInput
                                step="1"
                                min="0"
                                value={escolha.quantidadeManual}
                                onChange={(n) => definirPickerQuantidade(a.localId, n)}
                                className="font-mono-num w-20 border-b border-line bg-transparent py-1 outline-none focus:border-brass"
                              />
                            </label>
                          ) : (
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
                          )}
                          {materiaisBiblioteca.length > 0 && (
                            <button
                              type="button"
                              onClick={() => alternarPickerMaterial(a.localId)}
                              className={`rounded-sm border px-3 py-1.5 text-xs ${escolha.materialAberto ? 'border-brass bg-brass-soft font-bold' : 'border-line text-ink-soft'}`}
                            >
                              + Material
                            </button>
                          )}
                          <button
                            onClick={() => adicionarServicoAoAmbiente(a.localId)}
                            disabled={!escolha.servicoId || (semMedidaEscolhida && escolha.quantidadeManual <= 0)}
                            className="rounded-sm border border-dashed border-line px-3.5 py-2 text-sm text-ink-soft disabled:opacity-50"
                          >
                            + Adicionar serviço ao ambiente
                          </button>
                        </div>
                        {escolha.materialAberto && (
                          <MaterialMultiSelect
                            materiais={materiaisBiblioteca}
                            selecionados={escolha.materialIds}
                            onChange={(ids) => definirPickerMaterial(a.localId, ids)}
                          />
                        )}
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

        <button onClick={salvar} disabled={salvando} className="btn-primary px-5 py-3">
          {salvando ? 'Salvando…' : 'Salvar orçamento'}
        </button>
      </div>

      <div className="lg:sticky lg:top-5 self-start">
        <OrcamentoPreview
          empresaNome={empresaNome}
          cnpj={cnpj}
          telefone={telefone}
          numeroOrcamento={numeroOrcamento}
          dataCriacao={dataCriacao}
          segmentoLabel={SEGMENTOS[segmentoPadrao as keyof typeof SEGMENTOS]?.label ?? segmentoPadrao}
          clienteNome={clienteNome}
          obraEndereco={obraEndereco}
          prazoExecucao={prazoExecucao}
          validadeDias={validadeDias}
          formaPagamento={formaPagamento}
          itens={itens}
          ambientes={ambientes.map((a) => ({
            nome: a.nome,
            comprimento: a.comprimento,
            largura: a.largura,
            peDireito: a.peDireito,
            servicos: itens.filter((it) => it.ambienteLocalId === a.localId).map((it) => {
              const base = nomeServicoSemAmbiente(it.descricao)
              const nomesMateriais = it.materialItemIds
                .map((id) => materiaisBiblioteca.find((m) => m.id === id)?.descricao)
                .filter((n): n is string => !!n)
              return nomesMateriais.length > 0 ? `${base} (${nomesMateriais.join(', ')})` : base
            }),
          }))}
        />
      </div>
    </div>
  )
}
