# Override de Valor de Serviço + Descrição por Item — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deixar o valor de um serviço-no-orçamento sobrescrevível manualmente sem ser perdido em recálculos automáticos de medida, adicionar um campo de descrição livre por item, e criar uma tela `/servicos` (biblioteca de preços-base) espelhando `/materiais`.

**Architecture:** Duas colunas novas em `itens_orcamento` (`valor_customizado numeric null`, `observacoes text null`). Uma função pura `valorFinalItem()` em `lib/calc.ts` vira a única fonte de verdade pro valor final de qualquer item — usada no total do ambiente (`OrcamentoBuilder`), no total geral (`calcularOrcamento`) e na proposta/PDF (`OrcamentoPreview`). `valor_customizado !== null` = override ativo; `atualizarAmbiente` já não recalcula esse campo (só `quantidade`), então usar a função em todo lugar resolve o bug de raiz. Nova tela `/servicos` reaproveita `adicionarItemBiblioteca`/`removerItemBiblioteca` já existentes, só filtrando `categoria='mao_obra'`.

**Tech Stack:** Next.js 14 (App Router), Supabase (Postgres + PostgREST), Vitest.

## Global Constraints

- Preço base do serviço (`itens_biblioteca_empresa.valor_unit_padrao`) nunca é alterado por um override feito dentro de um orçamento — `valor_unit` já é copiado por valor em `adicionarServicoAoAmbiente` (linha 279 de `OrcamentoBuilder.tsx`), então isso já vale estruturalmente; só precisa de um teste manual confirmando.
- Migrations são aditivas — nunca dropar/renomear coluna existente (convenção documentada em 0004/0007/0008/0010/0013). Coluna nova `descricao` colidiria com a `descricao` já existente (nome do serviço) — por isso o campo de texto livre chama-se `observacoes`.
- Toda migration termina com `notify pgrst, 'reload schema';` (padrão de todas as migrations existentes).
- Rodar `npm run test` (vitest) e `npm run build` antes de commitar.
- Commits em português, estilo `feat: ...` (ver `git log`), sem `--no-verify`.

---

### Task 1: Migration — colunas `valor_customizado` e `observacoes`

**Files:**
- Create: `supabase/migrations/0015_override_valor_e_observacoes_item.sql`

**Interfaces:**
- Produces: colunas `itens_orcamento.valor_customizado numeric null` e `itens_orcamento.observacoes text null`, usadas por todas as tasks seguintes.

- [ ] **Step 1: Escrever a migration**

```sql
-- valor_customizado: quando preenchido, é o valor final da linha (em vez
-- de quantidade*valor_unit+valor_material) — override manual do usuário
-- pra ESSE orçamento específico. NULL = comportamento atual (calculado).
-- Nunca sobrescrito por recálculo de medida do ambiente (só quantidade
-- muda em atualizarAmbiente, nunca valor_customizado) e nunca escreve de
-- volta no preço-base da biblioteca (itens_biblioteca_empresa).
--
-- observacoes: texto livre opcional por item, aparece na proposta/PDF
-- junto da descrição do serviço. Não reaproveita a coluna "descricao"
-- já existente porque ela já serve de nome do serviço.
alter table itens_orcamento
  add column valor_customizado numeric null,
  add column observacoes text null;

notify pgrst, 'reload schema';
```

- [ ] **Step 2: Rodar a migration no Supabase**

Aplicar via Supabase CLI (`supabase db push`) ou SQL editor do painel, conforme o fluxo já usado pras migrations anteriores deste projeto. Confirmar rodando no SQL editor:

```sql
select column_name, data_type, is_nullable
from information_schema.columns
where table_name = 'itens_orcamento' and column_name in ('valor_customizado', 'observacoes');
```

Esperado: as duas colunas listadas, `is_nullable = YES`.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/0015_override_valor_e_observacoes_item.sql
git commit -m "feat: adiciona colunas valor_customizado e observacoes em itens_orcamento"
```

---

### Task 2: Tipos — `ItemOrcamento` ganha os dois campos novos

**Files:**
- Modify: `lib/types.ts:59-81`

**Interfaces:**
- Consumes: nenhuma (tipos puros).
- Produces: `ItemOrcamento.valor_customizado: number | null`, `ItemOrcamento.observacoes: string | null` — usados por `lib/calc.ts`, `OrcamentoBuilder.tsx`, `OrcamentoPreview.tsx`, `app/o/[id]/page.tsx`, `app/orcamentos/novo/actions.ts`, `app/orcamentos/[id]/actions.ts`.

- [ ] **Step 1: Editar a interface**

Em `lib/types.ts`, dentro de `ItemOrcamento` (depois de `valor_material: number`), adicionar:

```ts
export interface ItemOrcamento {
  id: string
  orcamento_id: string
  descricao: string
  categoria: Categoria
  unidade: string
  modo_medicao: ModoMedicao
  comprimento: number | null
  altura: number | null
  quantidade: number
  valor_unit: number
  ambiente_id: string | null
  origem_ambiente: OrigemAmbiente | null
  material_item_id: string | null
  material_item_ids: string[]
  valor_material: number
  // Quando preenchido, é o valor final da linha nesse orçamento
  // específico (substitui quantidade*valor_unit+valor_material). NULL =
  // segue calculado normalmente. Nunca sobrescrito por recálculo de
  // medida do ambiente nem propagado de volta ao preço-base da
  // biblioteca — ver migração 0015.
  valor_customizado: number | null
  // Texto livre opcional por item, aparece na proposta/PDF junto da
  // descrição do serviço — ver migração 0015.
  observacoes: string | null
}
```

- [ ] **Step 2: Rodar o typecheck/build pra confirmar que nada quebrou ainda**

Run: `npm run build`
Expected: falha nos arquivos que constroem `ItemOrcamento`/`ItemForm` sem os campos novos (esperado — serão corrigidos nas próximas tasks). Se não houver nenhum erro de tipo aqui, algo está errado (os campos não propagaram) — investigar antes de seguir.

- [ ] **Step 3: Commit**

```bash
git add lib/types.ts
git commit -m "feat: adiciona valor_customizado e observacoes em ItemOrcamento"
```

---

### Task 3: `lib/calc.ts` — função `valorFinalItem` + `calcularOrcamento` usa ela

**Files:**
- Modify: `lib/calc.ts:17-29`
- Test: `lib/calc.test.ts`

**Interfaces:**
- Consumes: `ItemOrcamento` (Task 2).
- Produces: `valorFinalItem(item: Pick<ItemOrcamento, 'quantidade' | 'valor_unit' | 'valor_material' | 'valor_customizado'>): number` — usada por `OrcamentoBuilder.tsx` (total do ambiente e input editável) e `OrcamentoPreview.tsx` (linha e total da proposta). `calcularOrcamento` passa a exigir também `'valor_customizado'` no Pick.

- [ ] **Step 1: Escrever os testes falhando**

Em `lib/calc.test.ts`, atualizar o helper `item()` pra aceitar `valor_customizado` e adicionar os testes de override:

```ts
import { describe, it, expect } from 'vitest'
import { calcularOrcamento, formatarMoeda, valorFinalItem } from './calc'
import type { ItemOrcamento } from './types'

const item = (
  categoria: 'material' | 'mao_obra',
  quantidade: number,
  valor_unit: number,
  valor_material = 0,
  valor_customizado: number | null = null
): Pick<ItemOrcamento, 'categoria' | 'quantidade' | 'valor_unit' | 'valor_material' | 'valor_customizado'> => ({
  categoria, quantidade, valor_unit, valor_material, valor_customizado,
})

describe('valorFinalItem', () => {
  it('uses the calculated formula when valor_customizado is null', () => {
    expect(valorFinalItem({ quantidade: 3, valor_unit: 50, valor_material: 10, valor_customizado: null })).toBe(160)
  })

  it('uses valor_customizado directly when set, ignoring quantidade/valor_unit/valor_material', () => {
    expect(valorFinalItem({ quantidade: 3, valor_unit: 50, valor_material: 10, valor_customizado: 999 })).toBe(999)
  })

  it('treats valor_customizado of 0 as an active override, not "unset"', () => {
    expect(valorFinalItem({ quantidade: 3, valor_unit: 50, valor_material: 10, valor_customizado: 0 })).toBe(0)
  })
})

describe('calcularOrcamento', () => {
  it('splits material and mao_obra subtotals and totals as their direct sum', () => {
    const itens = [item('material', 2, 100), item('mao_obra', 3, 50)]
    const result = calcularOrcamento(itens)
    expect(result.subtotalMaterial).toBe(200)
    expect(result.subtotalMaoObra).toBe(150)
    expect(result.subtotal).toBe(350)
    expect(result.total).toBe(350)
  })

  it('returns zeros for an empty item list', () => {
    const result = calcularOrcamento([])
    expect(result).toEqual({ subtotalMaterial: 0, subtotalMaoObra: 0, subtotal: 0, total: 0 })
  })

  it('treats missing/NaN quantidade or valor_unit as zero', () => {
    const itens = [item('material', NaN, 100)]
    const result = calcularOrcamento(itens)
    expect(result.subtotalMaterial).toBe(0)
  })

  it('adds valor_material (soma dos materiais por conta do prestador) flat, sem multiplicar por quantidade', () => {
    const itens = [item('mao_obra', 1, 80, 55)]
    const result = calcularOrcamento(itens)
    expect(result.subtotalMaoObra).toBe(135)
    expect(result.total).toBe(135)
  })

  it('does not multiply valor_material by quantidade', () => {
    const itens = [item('mao_obra', 10, 8, 55)]
    const result = calcularOrcamento(itens)
    expect(result.total).toBe(135)
  })

  it('uses valor_customizado as the line total when set, instead of quantidade*valor_unit+valor_material', () => {
    const itens = [item('mao_obra', 10, 8, 55, 300)]
    const result = calcularOrcamento(itens)
    expect(result.subtotalMaoObra).toBe(300)
    expect(result.total).toBe(300)
  })
})

describe('formatarMoeda', () => {
  it('formats as BRL currency', () => {
    expect(formatarMoeda(1234.5)).toBe('R$ 1.234,50')
  })
})
```

- [ ] **Step 2: Rodar os testes e confirmar que falham**

Run: `npm run test -- calc.test.ts`
Expected: FAIL — `valorFinalItem` não existe, e o teste de override em `calcularOrcamento` falha (soma 8*10+55=135 em vez de 300).

- [ ] **Step 3: Implementar**

Em `lib/calc.ts`, substituir o corpo de `calcularOrcamento` e adicionar `valorFinalItem`:

```ts
import type { ItemOrcamento } from './types'

export interface ResultadoCalculo {
  subtotalMaterial: number
  subtotalMaoObra: number
  subtotal: number
  total: number
}

// Valor final de UM item: se valor_customizado foi definido (override
// manual do usuário nesse orçamento específico), ele é o valor final e
// ignora quantidade/valor_unit/valor_material. Caso contrário, segue o
// cálculo normal. Única fonte de verdade pro valor de um item — usada
// aqui, no total por ambiente (OrcamentoBuilder) e na proposta/PDF
// (OrcamentoPreview), pra nunca haver 3 fórmulas divergentes.
export function valorFinalItem(
  item: Pick<ItemOrcamento, 'quantidade' | 'valor_unit' | 'valor_material' | 'valor_customizado'>
): number {
  if (item.valor_customizado !== null && item.valor_customizado !== undefined) {
    return Number(item.valor_customizado) || 0
  }
  return (Number(item.quantidade) || 0) * (Number(item.valor_unit) || 0) + (Number(item.valor_material) || 0)
}

// Sem BDI: mão de obra já é o valor final decidido pelo prestador, e
// material já embute sua própria margem (custo + %) — aplicar um
// percentual por cima do total duplicaria a margem. Total = soma direta.
export function calcularOrcamento(
  itens: Pick<ItemOrcamento, 'categoria' | 'quantidade' | 'valor_unit' | 'valor_material' | 'valor_customizado'>[]
): ResultadoCalculo {
  let subtotalMaterial = 0
  let subtotalMaoObra = 0
  for (const item of itens) {
    const valor = valorFinalItem(item)
    if (item.categoria === 'material') subtotalMaterial += valor
    else subtotalMaoObra += valor
  }
  const subtotal = subtotalMaterial + subtotalMaoObra
  return { subtotalMaterial, subtotalMaoObra, subtotal, total: subtotal }
}

// Itens de ambiente nascem como "Serviço — Nome do Ambiente" (ver
// adicionarServicoAoAmbiente em OrcamentoBuilder). Usado pra listar só
// o nome do serviço sem repetir o ambiente já indicado na própria linha.
export function nomeServicoSemAmbiente(descricao: string): string {
  return descricao.split(' — ')[0]
}

export function formatarMoeda(n: number): string {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

// Preço de venda de material = custo de aquisição + margem do prestador
// em cima desse custo. Vale para qualquer segmento (não só drywall).
export function calcularValorVendaMaterial(custoAquisicao: number, margemPercentual: number): number {
  const valor = (Number(custoAquisicao) || 0) * (1 + (Number(margemPercentual) || 0) / 100)
  return Math.round(valor * 100) / 100
}
```

- [ ] **Step 4: Rodar os testes e confirmar que passam**

Run: `npm run test -- calc.test.ts`
Expected: PASS (todos os testes, incluindo os 3 novos de `valorFinalItem` e o novo caso de override em `calcularOrcamento`).

- [ ] **Step 5: Commit**

```bash
git add lib/calc.ts lib/calc.test.ts
git commit -m "feat: valorFinalItem — valor_customizado vira o valor final do item quando definido"
```

---

### Task 4: `OrcamentoBuilder.tsx` — estado, override manual, recálculo intocado

**Files:**
- Modify: `components/OrcamentoBuilder.tsx`

**Interfaces:**
- Consumes: `valorFinalItem` de `lib/calc.ts` (Task 3), `ItemOrcamento.valor_customizado`/`observacoes` (Task 2).
- Produces: `ItemForm.valor_customizado: number | null`, `ItemForm.observacoes: string` — consumidos por Task 5 (actions.ts) e Task 6 (OrcamentoPreview, via `itens={itens}` já passado hoje).

- [ ] **Step 1: Importar `valorFinalItem` e atualizar `ItemForm`**

No topo do arquivo, trocar a linha de import de `lib/calc`:

```ts
import { formatarMoeda, nomeServicoSemAmbiente, valorFinalItem } from '@/lib/calc'
```

Em `ItemForm` (linhas 12-27), adicionar os dois campos novos:

```ts
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
  valor_material: number
  // Override manual do valor final da linha nesse orçamento — ver
  // valorFinalItem em lib/calc.ts. NULL = segue calculado normalmente.
  valor_customizado: number | null
  // Texto livre opcional, aparece na proposta/PDF.
  observacoes: string
}
```

- [ ] **Step 2: Inicializar os campos ao carregar um orçamento existente e ao ler rascunho local**

Na montagem de `itens` a partir de `valoresIniciais` (linhas 174-188), o spread `...it` já traz `valor_customizado` do banco (Task 2 adicionou a coluna em `ItemOrcamento`) — mas `observacoes` pode vir `null` do banco e o campo do form é `string` (não nullable), então precisa normalizar. Trocar:

```ts
  const [itens, setItens] = useState<(ItemForm & { localId: number })[]>(
    rascunho?.itens.map((it) => ({
      ...it,
      valor_customizado: it.valor_customizado ?? null,
      observacoes: it.observacoes ?? '',
    })) ?? (valoresIniciais?.itens ?? []).map((it) => ({
      ...it,
      localId: nextLocalId++,
      ambienteLocalId: it.ambiente_id ? ambienteLocalIdPorDbId.get(it.ambiente_id) ?? null : null,
      origem_ambiente: it.origem_ambiente as MedidaAmbiente | null,
      materialItemIds: it.material_item_ids && it.material_item_ids.length > 0
        ? it.material_item_ids
        : (it.material_item_id ? [it.material_item_id] : []),
      valor_material: it.valor_material,
      valor_customizado: it.valor_customizado ?? null,
      observacoes: it.observacoes ?? '',
    }))
  )
```

O `rascunho?.itens.map(...)` normaliza rascunhos salvos no `localStorage` **antes** desta feature existir (onde `valor_customizado`/`observacoes` viriam `undefined` do JSON antigo) — sem isso, `undefined !== null` quebraria a checagem de "override ativo".

- [ ] **Step 3: Inicializar os campos ao adicionar um serviço novo ao ambiente**

Em `adicionarServicoAoAmbiente` (linhas 259-287), no objeto inserido em `setItens`, adicionar as duas props:

```ts
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
        materialItemIds: materiais.map((m) => m.id),
        valor_material: valorMaterial,
        valor_customizado: null,
        observacoes: '',
      },
    ])
```

- [ ] **Step 4: Adicionar as funções de override e descrição**

Logo depois de `removerItem` (linha 289-291), adicionar:

```ts
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
```

- [ ] **Step 5: Usar `valorFinalItem` no total do ambiente**

Na linha 380, trocar:

```ts
              const totalAmbiente = itensDoAmbiente.reduce((soma, it) => soma + it.quantidade * it.valor_unit + it.valor_material, 0)
```

por:

```ts
              const totalAmbiente = itensDoAmbiente.reduce((soma, it) => soma + valorFinalItem(it), 0)
```

- [ ] **Step 6: Card do item — input editável de valor, badge de override, botão de recalcular, campo de observações**

Substituir o bloco `{itensDoAmbiente.map((it) => ( ... ))}` (linhas 442-461) por:

```tsx
                        {itensDoAmbiente.map((it) => {
                          const valorFinal = valorFinalItem(it)
                          const temOverride = it.valor_customizado !== null
                          return (
                            <div key={it.localId} className="rounded-sm bg-paper p-3.5">
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex-1">
                                  <div className="text-xs font-bold text-blueprint-deep">{it.descricao}</div>
                                  <div className="mt-1 font-mono-num text-xs text-ink-soft">
                                    {it.origem_ambiente && MEDIDA_LABEL[it.origem_ambiente] ? MEDIDA_LABEL[it.origem_ambiente] : 'Manual'} · {it.quantidade.toFixed(2)}{it.unidade} × {formatarMoeda(it.valor_unit)}
                                    {it.valor_material > 0 && ` + ${formatarMoeda(it.valor_material)}`}
                                    {' '}= {formatarMoeda(it.quantidade * it.valor_unit + it.valor_material)}
                                    {temOverride && <span className="ml-1 text-brass">(calculado)</span>}
                                  </div>
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
```

Nota: a linha de breakdown (`{it.origem_ambiente ...} = {formatarMoeda(...)}`) continua mostrando o valor **calculado** (não o final) de propósito — é informativo, mostra "quanto daria" mesmo com override ativo, com a tag `(calculado)` deixando isso explícito. O valor que realmente conta é o do input `Valor deste serviço`.

- [ ] **Step 7: Verificação manual — bug original resolvido**

Rodar `npm run dev`, abrir `/orcamentos/novo`:
1. Criar um ambiente, adicionar um serviço — confirmar que o campo "Valor deste serviço" mostra o valor calculado (quantidade × valor_unit).
2. Editar esse campo manualmente pra outro valor — confirmar que aparece a tag "Valor customizado" e o botão "Recalcular automaticamente".
3. Mudar o comprimento/largura do ambiente — confirmar que o campo "Valor deste serviço" **não muda** (continua com o valor digitado), mas a linha de breakdown `(calculado)` muda pra refletir a nova medida.
4. Clicar "Recalcular automaticamente" — confirmar que o campo volta a mostrar o valor calculado e a tag some.

- [ ] **Step 8: Commit**

```bash
git add components/OrcamentoBuilder.tsx
git commit -m "feat: valor de serviço editável no orçamento, com override que sobrevive a recálculo de medida"
```

---

### Task 5: Persistir `valor_customizado`/`observacoes` ao salvar o orçamento

**Files:**
- Modify: `app/orcamentos/novo/actions.ts`
- Modify: `app/orcamentos/[id]/actions.ts`

**Interfaces:**
- Consumes: `ItemForm.valor_customizado`/`observacoes` (Task 4), via `OrcamentoBuilderPayload.itens`.
- Produces: linhas de `itens_orcamento` gravadas com `valor_customizado`/`observacoes` — consumidas por `app/o/[id]/page.tsx` e `OrcamentoBuilder` na próxima edição.

- [ ] **Step 1: `criarOrcamentoInterno` — incluir os dois campos no insert**

Em `app/orcamentos/novo/actions.ts`, no `.insert(payload.itens.map((it) => ({ ... })))`, adicionar duas linhas ao objeto mapeado:

```ts
  const { error: itensError } = await supabase.from('itens_orcamento').insert(
    payload.itens.map((it) => ({
      orcamento_id: orcamento.id,
      descricao: it.descricao,
      categoria: it.categoria,
      unidade: it.unidade,
      modo_medicao: it.modo_medicao,
      comprimento: it.comprimento,
      altura: it.altura,
      quantidade: it.quantidade,
      valor_unit: it.valor_unit,
      ambiente_id: it.ambienteLocalId !== null ? ambienteIdPorLocalId.get(it.ambienteLocalId) ?? null : null,
      origem_ambiente: it.origem_ambiente,
      material_item_ids: it.materialItemIds,
      valor_material: it.valor_material,
      valor_customizado: it.valor_customizado,
      observacoes: it.observacoes || null,
    }))
  )
```

- [ ] **Step 2: `atualizarOrcamentoInterno` — mesma mudança**

Em `app/orcamentos/[id]/actions.ts`, no `.insert(payload.itens.map((it) => ({ ... })))` (reinsert após delete-all), aplicar a mesma alteração:

```ts
  const { error: insertError } = await supabase.from('itens_orcamento').insert(
    payload.itens.map((it) => ({
      orcamento_id: orcamentoId,
      descricao: it.descricao,
      categoria: it.categoria,
      unidade: it.unidade,
      modo_medicao: it.modo_medicao,
      comprimento: it.comprimento,
      altura: it.altura,
      quantidade: it.quantidade,
      valor_unit: it.valor_unit,
      ambiente_id: it.ambienteLocalId !== null ? ambienteIdPorLocalId.get(it.ambienteLocalId) ?? null : null,
      origem_ambiente: it.origem_ambiente,
      material_item_ids: it.materialItemIds,
      valor_material: it.valor_material,
      valor_customizado: it.valor_customizado,
      observacoes: it.observacoes || null,
    }))
  )
```

- [ ] **Step 3: Verificação manual — override sobrevive a salvar/recarregar**

No orçamento criado na Task 4/Step 7 (com um item já com override ativo), clicar "Salvar orçamento", recarregar a página de edição (`/orcamentos/[id]`). Confirmar: o campo "Valor deste serviço" mostra o valor customizado salvo, a tag "Valor customizado" aparece, e o texto de "Descrição adicional" (se preenchido) também volta.

- [ ] **Step 4: Commit**

```bash
git add "app/orcamentos/novo/actions.ts" "app/orcamentos/[id]/actions.ts"
git commit -m "feat: persiste valor_customizado e observacoes ao salvar orçamento"
```

---

### Task 6: `OrcamentoPreview.tsx` — usar `valorFinalItem` e exibir observações

**Files:**
- Modify: `components/OrcamentoPreview.tsx`

**Interfaces:**
- Consumes: `valorFinalItem` de `lib/calc.ts` (Task 3), `PreviewItem.valor_customizado`/`observacoes`.

- [ ] **Step 1: Atualizar `PreviewItem` e o import**

No topo do arquivo:

```ts
import { calcularOrcamento, formatarMoeda, valorFinalItem } from '@/lib/calc'
```

Em `PreviewItem` (linhas 7-16), adicionar:

```ts
interface PreviewItem {
  descricao: string
  categoria: Categoria
  unidade: string
  quantidade: number
  valor_unit: number
  valor_material: number
  // Ver valorFinalItem em lib/calc.ts — quando definido, é o valor
  // final da linha (ignora quantidade*valor_unit+valor_material).
  valor_customizado: number | null
  // Texto livre opcional, some da linha se vazio/null.
  observacoes: string | null
}
```

- [ ] **Step 2: Exibir a observação sob a descrição do serviço**

Na linha do item (linhas 170-181), dentro da célula da descrição, adicionar a observação como sub-linha e trocar o cálculo do total pra usar `valorFinalItem`:

```tsx
            {props.itens.map((it, i) => (
              <div key={i} className="grid grid-cols-[minmax(0,0.3fr)_minmax(0,2.2fr)_minmax(0,0.6fr)_minmax(0,0.5fr)_minmax(0,0.9fr)_minmax(0,0.9fr)] gap-x-2 border-b border-dotted border-line py-1.5">
                <span>{i + 1}</span>
                <span className="font-serif-body break-words">
                  {it.descricao || 'Item sem nome'}
                  {it.observacoes && <div className="mt-0.5 text-[10px] italic text-ink-soft break-words">{it.observacoes}</div>}
                </span>
                <span className="text-center">{it.quantidade}</span>
                <span className="text-center">{it.unidade}</span>
                <span className="text-right">
                  {it.categoria === 'mao_obra' && props.ocultarValorUnitario ? '—' : formatarMoeda(Number(it.valor_unit) || 0)}
                </span>
                <span className="text-right">{formatarMoeda(valorFinalItem(it))}</span>
              </div>
            ))}
```

- [ ] **Step 3: Verificação manual — proposta e PDF**

Abrir a proposta pública `/o/[id]` do orçamento de teste (Task 5). Confirmar: o total da linha com override mostra o valor customizado (não o calculado), o texto de observação aparece abaixo do nome do serviço, e o Total Geral da Proposta reflete a soma com o override. Gerar o PDF (`PrintButton`) e conferir que ambos aparecem corretamente no arquivo gerado (não só na tela — `PrintButton.tsx` captura o DOM de `#proposta-preview` via html2canvas, então basta a tela estar certa, mas confirme visualmente no PDF baixado).

- [ ] **Step 4: Commit**

```bash
git add components/OrcamentoPreview.tsx
git commit -m "feat: proposta/PDF usa valorFinalItem e exibe observações por item"
```

---

### Task 7: `app/o/[id]/page.tsx` — nenhuma mudança de código, só verificação

**Files:**
- (nenhum arquivo modificado — `select('*')` já traz as colunas novas e `ItemOrcamento[]` já as tipa desde a Task 2)

- [ ] **Step 1: Verificação manual**

Confirmar que `app/o/[id]/page.tsx` não precisa de alteração: `itens` vem de `.select('*').returns<ItemOrcamento[]>()` (já inclui `valor_customizado`/`observacoes` após a Task 2) e é passado direto como `itens={itens ?? []}` pra `OrcamentoPreview`, cujo `PreviewItem` agora exige esses campos (Task 6) — checar que `npm run build` não aponta erro de tipo nesse arquivo.

Run: `npm run build`
Expected: sem erros em `app/o/[id]/page.tsx`.

---

### Task 8: Tela `/servicos` — biblioteca de preços-base de serviços

**Files:**
- Create: `app/servicos/page.tsx`
- Create: `app/servicos/CadastroServicoForm.tsx`
- Modify: `app/configuracoes/actions.ts:82-93` (revalidatePath)
- Modify: `components/NavLinks.tsx:8-13`

**Interfaces:**
- Consumes: `adicionarItemBiblioteca`/`removerItemBiblioteca` já existentes em `app/configuracoes/actions.ts` (sem mudança de assinatura).
- Produces: rota `/servicos` navegável a partir do menu.

- [ ] **Step 1: Criar o formulário de cadastro de serviço**

`app/servicos/CadastroServicoForm.tsx` (mesma estrutura de `app/materiais/CadastroMaterialForm.tsx`, mas sem custo/margem — serviço só tem um valor direto, igual ao formulário já embutido em `app/configuracoes/page.tsx`):

```tsx
'use client'

import { formatarMoeda } from '@/lib/calc'
import { NumeroInput } from '@/components/NumeroInput'
import { useState } from 'react'

export function CadastroServicoForm({ adicionarServico }: { adicionarServico: (formData: FormData) => Promise<void> }) {
  const [unidade, setUnidade] = useState('un')
  const [valorUnitPadrao, setValorUnitPadrao] = useState(0)

  return (
    <details className="rounded-sm border border-brass bg-brass-soft/30">
      <summary className="cursor-pointer list-none px-4 py-3 font-sans text-sm font-bold text-blueprint-deep">
        + Cadastrar serviço
      </summary>
      <form action={adicionarServico} className="flex flex-col gap-3 border-t border-brass px-4 py-4 text-sm">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <label className="flex min-w-0 flex-col gap-1">
            <span className="text-[10px] font-bold uppercase tracking-wide text-ink-soft">Descrição</span>
            <input name="descricao" required className="w-full border-b border-line bg-transparent py-1 outline-none focus:border-brass" />
          </label>
          <label className="flex min-w-0 flex-col gap-1">
            <span className="text-[10px] font-bold uppercase tracking-wide text-ink-soft">Unidade</span>
            <select name="unidade" value={unidade} onChange={(e) => setUnidade(e.target.value)} className="w-full border-b border-line bg-white py-1 outline-none focus:border-brass">
              <option value="m²">m² (metro quadrado)</option>
              <option value="m">m (metro linear)</option>
              <option value="un">un (unidade)</option>
              <option value="h">h (hora)</option>
              <option value="m³">m³ (metro cúbico)</option>
              <option value="vb">vb (verba/fixo)</option>
            </select>
          </label>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
          <label className="flex min-w-0 flex-col gap-1">
            <span className="text-[10px] font-bold uppercase tracking-wide text-ink-soft">Valor (R$)</span>
            <NumeroInput
              step="0.01"
              min="0"
              name="valorUnitPadrao"
              value={valorUnitPadrao}
              onChange={setValorUnitPadrao}
              className="font-mono-num w-full border-b border-line bg-transparent py-1 outline-none focus:border-brass"
            />
          </label>
          <button type="submit" className="btn-primary w-full px-4 py-2 text-sm sm:w-auto">Salvar serviço</button>
        </div>
        <div className="font-mono-num text-xs text-ink-soft">
          {formatarMoeda(valorUnitPadrao)}/{unidade}
        </div>
      </form>
    </details>
  )
}
```

- [ ] **Step 2: Criar a página `/servicos`**

`app/servicos/page.tsx` (espelha `app/materiais/page.tsx`, trocando `categoria` pra `'mao_obra'` e removendo custo/margem):

```tsx
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { adicionarItemBiblioteca, removerItemBiblioteca } from '../configuracoes/actions'
import { CadastroServicoForm } from './CadastroServicoForm'
import { formatarMoeda } from '@/lib/calc'
import type { ItemBiblioteca } from '@/lib/types'

export default async function ServicosPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: usuario } = await supabase.from('usuarios').select('empresa_id').eq('id', user!.id).single()
  if (!usuario) redirect('/login')

  const { data: servicos } = await supabase
    .from('itens_biblioteca_empresa')
    .select('*')
    .eq('empresa_id', usuario.empresa_id)
    .eq('categoria', 'mao_obra')
    .order('descricao')
    .returns<ItemBiblioteca[]>()

  async function adicionarServico(formData: FormData) {
    'use server'
    await adicionarItemBiblioteca(usuario!.empresa_id, {
      descricao: String(formData.get('descricao') ?? ''),
      categoria: 'mao_obra',
      unidade: String(formData.get('unidade') ?? 'un'),
      valorUnitPadrao: Number(formData.get('valorUnitPadrao') ?? 0),
    })
  }

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <h1 className="text-2xl font-bold text-blueprint-deep">Serviços</h1>
      <p className="mt-2 text-sm text-ink-soft">
        Serviços cadastrados aqui ficam disponíveis pra adicionar a qualquer ambiente de um orçamento. Editar o valor
        aqui muda o preço-base pra orçamentos futuros — não altera valores já sobrescritos manualmente em orçamentos existentes.
      </p>

      <div className="mt-8 border border-line bg-white p-4 sm:p-5">
        <CadastroServicoForm adicionarServico={adicionarServico} />

        <ul className="mt-4 flex flex-col gap-2">
          {(servicos ?? []).length === 0 && (
            <li className="text-sm italic text-ink-soft">Nenhum serviço cadastrado ainda.</li>
          )}
          {(servicos ?? []).map((item) => (
            <li key={item.id} className="flex items-center justify-between rounded-sm bg-paper px-3 py-2.5 text-sm">
              <span>
                {item.descricao}{' '}
                <span className="font-mono-num text-ink-soft">· {formatarMoeda(item.valor_unit_padrao)}/{item.unidade}</span>
              </span>
              <form action={async () => { 'use server'; await removerItemBiblioteca(item.id) }}>
                <button type="submit" className="text-danger">×</button>
              </form>
            </li>
          ))}
        </ul>
      </div>
    </main>
  )
}
```

- [ ] **Step 3: Invalidar cache de `/servicos` ao adicionar/remover item da biblioteca**

Em `app/configuracoes/actions.ts`, tanto `adicionarItemBiblioteca` (linha 82-84) quanto `removerItemBiblioteca` (linha 91-93) já chamam `revalidatePath('/configuracoes')` e `revalidatePath('/materiais')` — adicionar `revalidatePath('/servicos')` nas duas:

```ts
  if (error) return { error: error.message }
  revalidatePath('/configuracoes')
  revalidatePath('/materiais')
  revalidatePath('/servicos')
  return {}
```

(aplicar a mesma linha extra nas duas funções).

- [ ] **Step 4: Adicionar link de navegação**

Em `components/NavLinks.tsx`, no array `links` (linhas 8-13), adicionar a entrada depois de Materiais:

```ts
const links = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/orcamentos/novo', label: 'Novo orçamento' },
  { href: '/materiais', label: 'Materiais' },
  { href: '/servicos', label: 'Serviços' },
  { href: '/configuracoes', label: 'Configurações' },
]
```

- [ ] **Step 5: Verificação manual**

Rodar `npm run dev`, abrir `/servicos`: cadastrar um serviço novo, confirmar que aparece na lista e no picker de "Serviço (mão de obra)" dentro de um ambiente em `/orcamentos/novo`. Editar (via `/servicos`, cadastrando de novo com mesma descrição não é edição real — o app não tem edição in-place, só add/remove, igual `/materiais`; confirmar que esse é o comportamento esperado e igual ao de Materiais) o valor-base de um serviço já usado num orçamento existente com override ativo, e confirmar que o valor do item no orçamento **não muda** (nem o calculado, porque `valor_unit` já foi copiado no momento em que o serviço foi adicionado ao ambiente, nem o customizado).

- [ ] **Step 6: Commit**

```bash
git add app/servicos components/NavLinks.tsx "app/configuracoes/actions.ts"
git commit -m "feat: tela /servicos pra editar preço-base de serviços da biblioteca"
```

---

### Task 9: Build final e QA de regressão

- [ ] **Step 1: Rodar a suíte inteira**

Run: `npm run test`
Expected: PASS (todos os arquivos `.test.ts`, incluindo os novos casos de `valorFinalItem`/override em `calc.test.ts`).

- [ ] **Step 2: Build de produção**

Run: `npm run build`
Expected: build conclui sem erros de tipo ou lint.

- [ ] **Step 3: QA manual dos 3 cenários pedidos**

1. Criar serviço → deixar calculado → editar valor manualmente → mudar medida do ambiente → confirmar que o valor editado NÃO volta a ser sobrescrito (Task 4/Step 7).
2. Editar preço-base de um serviço na biblioteca (`/servicos`) depois de ele já estar em orçamentos existentes (com e sem override) → confirmar que nenhum dos dois muda (Task 8/Step 5).
3. Preencher "Descrição adicional" num item → salvar → abrir a proposta pública e gerar o PDF → confirmar que o texto aparece em ambos (Task 6/Step 3).

- [ ] **Step 4: Commit final (se sobrar algo solto) e push**

```bash
git status
git push origin main
```
