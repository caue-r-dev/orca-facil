# Orça Fácil MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Orça Fácil MVP — a multi-tenant Next.js/Supabase SaaS where construction service providers sign up, build a professional budget (orçamento) from segment item libraries, and share it via a public link/PDF.

**Architecture:** Next.js 14 App Router + TypeScript, Supabase (Postgres + Auth + Storage) accessed via the official `@supabase/ssr` client (no ORM), Tailwind CSS with a custom palette matching the validated prototype. Server Components + Server Actions do all data access; RLS enforces per-`empresa_id` isolation for every authenticated table. The one anonymous-read path (`/o/[id]`) bypasses RLS via a server-only service-role client scoped to a single-row lookup by id — no table is opened to the `anon` role.

**Tech Stack:** Next.js 14, TypeScript, Tailwind CSS, Supabase (`@supabase/supabase-js`, `@supabase/ssr`), Vitest (unit tests), Vercel (deploy target, not part of this plan).

## Global Constraints

- Schema changes are additive only — never destructive (spec: no saved orçamento may ever be lost).
- Every table except the public single-row lookup path is isolated by `empresa_id` via RLS — verified per spec section "RLS".
- `itens_biblioteca_empresa` is per-empresa (not a shared global table) — segment defaults live in code (`lib/segmentos-seed.ts`) and only seed the library at signup/segment change.
- User → empresa link is the bridge table `usuarios(id, empresa_id)`, not JWT metadata (decision recorded in spec).
- Visual direction: paper/blueprint/brass palette, serif body text + monospace numbers — do not replace with a generic SaaS look.
- Public `/o/[id]` route never uses the anon Supabase key for orçamento data — always the server-only service-role client, restricted to `.eq('id', id).single()`.

---

## File Structure

```
orca-facil/
  package.json, tsconfig.json, next.config.mjs, tailwind.config.ts, postcss.config.js
  vitest.config.ts
  .env.local.example
  supabase/
    migrations/0001_init.sql
  lib/
    types.ts                 -- shared TS types (Empresa, Orcamento, ItemOrcamento, ItemBiblioteca, Segmento)
    segmentos-seed.ts         -- static segment defaults (ported from orca-facil.jsx SEGMENTS)
    segmentos-seed.test.ts
    calc.ts                   -- pure BDI/subtotal calculation
    calc.test.ts
    supabase/
      client.ts               -- browser client (anon key)
      server.ts                -- server client (cookies-bound, anon key, respects RLS)
      admin.ts                 -- service-role client (server-only, bypasses RLS)
  middleware.ts               -- refreshes Supabase session cookie, guards protected routes
  app/
    layout.tsx
    globals.css
    login/page.tsx
    login/actions.ts
    cadastro/page.tsx
    cadastro/actions.ts
    dashboard/page.tsx
    orcamentos/novo/page.tsx
    orcamentos/novo/actions.ts
    orcamentos/[id]/page.tsx
    orcamentos/[id]/actions.ts
    o/[id]/page.tsx
    configuracoes/page.tsx
    configuracoes/actions.ts
  components/
    OrcamentoBuilder.tsx      -- shared builder UI (segment picker, biblioteca, items, BDI) used by novo + editar
    OrcamentoPreview.tsx      -- shared live/public preview (used by builder's right pane and /o/[id])
```

Rationale: `calc.ts` and `segmentos-seed.ts` are pure, framework-free, and independently testable — split out from any component so builder and public preview both import the same logic without duplication. `OrcamentoBuilder` and `OrcamentoPreview` are split because the builder is interactive/authenticated while the preview is also reused read-only on the public page — one clear responsibility each.

---

## Task 1: Project scaffold (Next.js + TS + Tailwind)

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.mjs`, `tailwind.config.ts`, `postcss.config.js`, `.gitignore`, `app/layout.tsx`, `app/globals.css`, `app/page.tsx`
- Create: `vitest.config.ts`

**Interfaces:**
- Produces: a runnable Next.js dev server (`npm run dev`) and a working `npm run build`; a working `npm test` (Vitest) runner for later tasks.

- [ ] **Step 1: Scaffold the app**

```bash
cd "/c/Users/cauer/Desktop/Orça Fácil"
npx create-next-app@14 . --typescript --tailwind --app --no-src-dir --import-alias "@/*" --eslint
```

When prompted about the non-empty directory (it contains `orca-facil.jsx`, the `.md` prompt file, and `docs/`), confirm proceeding — it will not overwrite those files.

- [ ] **Step 2: Add Vitest**

```bash
npm install -D vitest @vitejs/plugin-react
```

Create `vitest.config.ts`:

```typescript
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['**/*.test.ts'],
  },
})
```

Add to `package.json` scripts: `"test": "vitest run"`.

- [ ] **Step 3: Verify build and test runner work**

Run: `npm run build`
Expected: build completes with the default Next.js starter page, no errors.

Run: `npm test`
Expected: `No test files found` (not a failure — no tests written yet).

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore: scaffold Next.js + TypeScript + Tailwind + Vitest"
```

---

## Task 2: Tailwind palette matching the prototype

**Files:**
- Modify: `tailwind.config.ts`
- Modify: `app/globals.css`

**Interfaces:**
- Produces: Tailwind color tokens `paper`, `ink`, `ink-soft`, `blueprint`, `blueprint-deep`, `brass`, `brass-soft`, `line`, `danger` (from `orca-facil.jsx` `PALETTE`), plus `font-serif-body` (Georgia) and `font-mono-num` (Courier New) font families, usable by every later component.

- [ ] **Step 1: Extend the Tailwind theme**

Edit `tailwind.config.ts` `theme.extend`:

```typescript
import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        paper: '#F5F2EB',
        ink: '#1E2521',
        'ink-soft': '#4A534D',
        blueprint: '#2F4A5C',
        'blueprint-deep': '#1F3540',
        brass: '#B4813C',
        'brass-soft': '#E4C892',
        line: '#D8D2C2',
        danger: '#A3462F',
      },
      fontFamily: {
        'serif-body': ['Georgia', 'serif'],
        'mono-num': ['"Courier New"', 'ui-monospace', 'monospace'],
      },
    },
  },
  plugins: [],
}
export default config
```

- [ ] **Step 2: Set base page styles**

Edit `app/globals.css`, keep the Tailwind directives at top and add below them:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

body {
  background-color: theme('colors.paper');
  color: theme('colors.ink');
  font-family: theme('fontFamily.serif-body');
}
```

- [ ] **Step 3: Verify Tailwind picks up the tokens**

Temporarily add `<div className="bg-blueprint-deep text-paper p-4">test</div>` to `app/page.tsx`, run `npm run dev`, load `http://localhost:3000`, confirm the dark blueprint-blue box renders, then remove the test div.

- [ ] **Step 4: Commit**

```bash
git add tailwind.config.ts app/globals.css
git commit -m "feat: add Orça Fácil custom Tailwind palette"
```

---

## Task 3: Shared TypeScript types

**Files:**
- Create: `lib/types.ts`

**Interfaces:**
- Produces: `SegmentoKey`, `Categoria`, `Empresa`, `Usuario`, `Orcamento`, `ItemOrcamento`, `ItemBiblioteca` — imported by every later task (seed data, calc, Supabase clients, Server Actions, components).

- [ ] **Step 1: Write the types**

```typescript
// lib/types.ts
export type SegmentoKey = 'eletrica' | 'hidraulica' | 'construcao' | 'drywall' | 'geral'
export type Categoria = 'material' | 'mao_obra'
export type OrcamentoStatus = 'rascunho' | 'enviado'

export interface Empresa {
  id: string
  nome: string
  segmento_padrao: SegmentoKey
  telefone: string | null
  logo_url: string | null
  bdi_padrao: number
  created_at: string
}

export interface Usuario {
  id: string
  empresa_id: string
  nome: string
  created_at: string
}

export interface Orcamento {
  id: string
  empresa_id: string
  cliente_nome: string
  cliente_contato: string | null
  obra_endereco: string | null
  prazo_execucao: string | null
  validade_dias: number
  forma_pagamento: string | null
  bdi: number
  status: OrcamentoStatus
  created_at: string
  updated_at: string
}

export interface ItemOrcamento {
  id: string
  orcamento_id: string
  descricao: string
  categoria: Categoria
  unidade: string
  quantidade: number
  valor_unit: number
}

export interface ItemBiblioteca {
  id: string
  empresa_id: string
  descricao: string
  categoria: Categoria
  unidade: string
  valor_unit_padrao: number
  created_at: string
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add lib/types.ts
git commit -m "feat: add shared domain types"
```

---

## Task 4: BDI/subtotal calculation logic (TDD)

**Files:**
- Create: `lib/calc.ts`
- Test: `lib/calc.test.ts`

**Interfaces:**
- Consumes: `ItemOrcamento` (subset: `categoria`, `quantidade`, `valor_unit`) from `lib/types.ts` (Task 3).
- Produces: `calcularOrcamento(itens, bdi): { subtotalMaterial: number, subtotalMaoObra: number, subtotal: number, valorBdi: number, total: number }` and `formatarMoeda(n: number): string` — used by `OrcamentoBuilder`, `OrcamentoPreview`, and the public `/o/[id]` page.

- [ ] **Step 1: Write the failing test**

```typescript
// lib/calc.test.ts
import { describe, it, expect } from 'vitest'
import { calcularOrcamento, formatarMoeda } from './calc'
import type { ItemOrcamento } from './types'

const item = (categoria: 'material' | 'mao_obra', quantidade: number, valor_unit: number): ItemOrcamento => ({
  id: 'x', orcamento_id: 'o', descricao: 'd', categoria, unidade: 'un', quantidade, valor_unit,
})

describe('calcularOrcamento', () => {
  it('splits material and mao_obra subtotals and applies BDI on top of the sum', () => {
    const itens = [item('material', 2, 100), item('mao_obra', 3, 50)]
    const result = calcularOrcamento(itens, 25)
    expect(result.subtotalMaterial).toBe(200)
    expect(result.subtotalMaoObra).toBe(150)
    expect(result.subtotal).toBe(350)
    expect(result.valorBdi).toBe(87.5)
    expect(result.total).toBe(437.5)
  })

  it('returns zeros for an empty item list', () => {
    const result = calcularOrcamento([], 25)
    expect(result).toEqual({ subtotalMaterial: 0, subtotalMaoObra: 0, subtotal: 0, valorBdi: 0, total: 0 })
  })

  it('treats missing/NaN quantidade or valor_unit as zero', () => {
    const itens = [item('material', NaN, 100)]
    const result = calcularOrcamento(itens, 10)
    expect(result.subtotalMaterial).toBe(0)
  })
})

describe('formatarMoeda', () => {
  it('formats as BRL currency', () => {
    expect(formatarMoeda(1234.5)).toBe('R$ 1.234,50')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- calc.test.ts`
Expected: FAIL — `Cannot find module './calc'`.

- [ ] **Step 3: Write the implementation**

```typescript
// lib/calc.ts
import type { ItemOrcamento } from './types'

export interface ResultadoCalculo {
  subtotalMaterial: number
  subtotalMaoObra: number
  subtotal: number
  valorBdi: number
  total: number
}

export function calcularOrcamento(
  itens: Pick<ItemOrcamento, 'categoria' | 'quantidade' | 'valor_unit'>[],
  bdi: number
): ResultadoCalculo {
  let subtotalMaterial = 0
  let subtotalMaoObra = 0
  for (const item of itens) {
    const valor = (Number(item.quantidade) || 0) * (Number(item.valor_unit) || 0)
    if (item.categoria === 'material') subtotalMaterial += valor
    else subtotalMaoObra += valor
  }
  const subtotal = subtotalMaterial + subtotalMaoObra
  const valorBdi = subtotal * ((Number(bdi) || 0) / 100)
  return { subtotalMaterial, subtotalMaoObra, subtotal, valorBdi, total: subtotal + valorBdi }
}

export function formatarMoeda(n: number): string {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- calc.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/calc.ts lib/calc.test.ts
git commit -m "feat: add BDI/subtotal calculation with tests"
```

---

## Task 5: Segment seed data (TDD)

**Files:**
- Create: `lib/segmentos-seed.ts`
- Test: `lib/segmentos-seed.test.ts`

**Interfaces:**
- Consumes: `SegmentoKey`, `Categoria` from `lib/types.ts` (Task 3).
- Produces: `SEGMENTOS: Record<SegmentoKey, SegmentoSeed>` where `SegmentoSeed = { label: string, bdiPadrao: number, itens: ItemSeed[] }` and `ItemSeed = { descricao: string, unidade: string, valorUnitPadrao: number, categoria: Categoria }` — consumed by the cadastro Server Action (Task 8, to seed `itens_biblioteca_empresa`) and the builder's segment picker (Task 13).

- [ ] **Step 1: Write the failing test**

```typescript
// lib/segmentos-seed.test.ts
import { describe, it, expect } from 'vitest'
import { SEGMENTOS } from './segmentos-seed'

describe('SEGMENTOS', () => {
  it('has an entry for every SegmentoKey used by the app', () => {
    expect(Object.keys(SEGMENTOS).sort()).toEqual(
      ['construcao', 'drywall', 'eletrica', 'geral', 'hidraulica'].sort()
    )
  })

  it('geral has no default items (custom/other segment)', () => {
    expect(SEGMENTOS.geral.itens).toEqual([])
  })

  it('every non-geral segment has at least one item with a positive valorUnitPadrao', () => {
    for (const key of ['eletrica', 'hidraulica', 'construcao', 'drywall'] as const) {
      expect(SEGMENTOS[key].itens.length).toBeGreaterThan(0)
      for (const item of SEGMENTOS[key].itens) {
        expect(item.valorUnitPadrao).toBeGreaterThan(0)
        expect(['material', 'mao_obra']).toContain(item.categoria)
      }
    }
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- segmentos-seed.test.ts`
Expected: FAIL — `Cannot find module './segmentos-seed'`.

- [ ] **Step 3: Write the implementation** (values ported from `orca-facil.jsx` `SEGMENTS`)

```typescript
// lib/segmentos-seed.ts
import type { SegmentoKey, Categoria } from './types'

export interface ItemSeed {
  descricao: string
  unidade: string
  valorUnitPadrao: number
  categoria: Categoria
}

export interface SegmentoSeed {
  label: string
  bdiPadrao: number
  itens: ItemSeed[]
}

export const SEGMENTOS: Record<SegmentoKey, SegmentoSeed> = {
  eletrica: {
    label: 'Elétrica',
    bdiPadrao: 25,
    itens: [
      { descricao: 'Ponto de tomada', unidade: 'un', valorUnitPadrao: 85, categoria: 'mao_obra' },
      { descricao: 'Ponto de luz', unidade: 'un', valorUnitPadrao: 90, categoria: 'mao_obra' },
      { descricao: 'Troca de disjuntor', unidade: 'un', valorUnitPadrao: 60, categoria: 'mao_obra' },
      { descricao: 'Fiação elétrica 2,5mm', unidade: 'm', valorUnitPadrao: 6.5, categoria: 'material' },
      { descricao: 'Quadro de distribuição', unidade: 'un', valorUnitPadrao: 320, categoria: 'material' },
      { descricao: 'Hora técnica eletricista', unidade: 'h', valorUnitPadrao: 75, categoria: 'mao_obra' },
    ],
  },
  hidraulica: {
    label: 'Hidráulica',
    bdiPadrao: 25,
    itens: [
      { descricao: 'Ponto de água', unidade: 'un', valorUnitPadrao: 95, categoria: 'mao_obra' },
      { descricao: 'Ponto de esgoto', unidade: 'un', valorUnitPadrao: 110, categoria: 'mao_obra' },
      { descricao: 'Troca de registro', unidade: 'un', valorUnitPadrao: 70, categoria: 'mao_obra' },
      { descricao: 'Instalação de vaso sanitário', unidade: 'un', valorUnitPadrao: 180, categoria: 'mao_obra' },
      { descricao: 'Tubulação PVC 25mm', unidade: 'm', valorUnitPadrao: 14, categoria: 'material' },
      { descricao: 'Hora técnica encanador', unidade: 'h', valorUnitPadrao: 75, categoria: 'mao_obra' },
    ],
  },
  construcao: {
    label: 'Pedreiro / Construção',
    bdiPadrao: 22,
    itens: [
      { descricao: 'Levantamento de parede', unidade: 'm²', valorUnitPadrao: 65, categoria: 'mao_obra' },
      { descricao: 'Reboco', unidade: 'm²', valorUnitPadrao: 38, categoria: 'mao_obra' },
      { descricao: 'Contrapiso', unidade: 'm²', valorUnitPadrao: 42, categoria: 'mao_obra' },
      { descricao: 'Concretagem', unidade: 'm³', valorUnitPadrao: 480, categoria: 'material' },
      { descricao: 'Hora pedreiro', unidade: 'h', valorUnitPadrao: 55, categoria: 'mao_obra' },
      { descricao: 'Hora ajudante', unidade: 'h', valorUnitPadrao: 35, categoria: 'mao_obra' },
    ],
  },
  drywall: {
    label: 'Drywall',
    bdiPadrao: 24,
    itens: [
      { descricao: 'Placa de drywall', unidade: 'm²', valorUnitPadrao: 48, categoria: 'material' },
      { descricao: 'Estrutura metálica', unidade: 'm²', valorUnitPadrao: 32, categoria: 'material' },
      { descricao: 'Isolamento acústico', unidade: 'm²', valorUnitPadrao: 18, categoria: 'material' },
      { descricao: 'Acabamento / massa corrida', unidade: 'm²', valorUnitPadrao: 22, categoria: 'mao_obra' },
      { descricao: 'Hora técnica drywall', unidade: 'h', valorUnitPadrao: 65, categoria: 'mao_obra' },
    ],
  },
  geral: {
    label: 'Outro serviço',
    bdiPadrao: 25,
    itens: [],
  },
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- segmentos-seed.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/segmentos-seed.ts lib/segmentos-seed.test.ts
git commit -m "feat: add per-segment seed data ported from prototype"
```

---

## Task 6: Supabase schema + RLS migration

**Files:**
- Create: `supabase/migrations/0001_init.sql`
- Create: `.env.local.example`

**Interfaces:**
- Produces: tables `empresas`, `usuarios`, `orcamentos`, `itens_orcamento`, `itens_biblioteca_empresa`, function `auth_empresa_id()`, and RLS policies consumed by every Server Action task (8, 9, 11, 13, 14, 16). No anonymous-role policy exists on any table — the public route (Task 15) reads via the service-role client instead.

- [ ] **Step 1: Write the migration**

```sql
-- supabase/migrations/0001_init.sql

create table empresas (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  segmento_padrao text not null,
  telefone text,
  logo_url text,
  bdi_padrao numeric not null default 25,
  created_at timestamptz not null default now()
);

create table usuarios (
  id uuid primary key references auth.users(id) on delete cascade,
  empresa_id uuid not null references empresas(id) on delete cascade,
  nome text not null,
  created_at timestamptz not null default now()
);

create table orcamentos (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresas(id) on delete cascade,
  cliente_nome text not null,
  cliente_contato text,
  obra_endereco text,
  prazo_execucao text,
  validade_dias integer not null default 7,
  forma_pagamento text,
  bdi numeric not null,
  status text not null default 'rascunho' check (status in ('rascunho', 'enviado')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table itens_orcamento (
  id uuid primary key default gen_random_uuid(),
  orcamento_id uuid not null references orcamentos(id) on delete cascade,
  descricao text not null,
  categoria text not null check (categoria in ('material', 'mao_obra')),
  unidade text not null,
  quantidade numeric not null default 1,
  valor_unit numeric not null default 0
);

create table itens_biblioteca_empresa (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresas(id) on delete cascade,
  descricao text not null,
  categoria text not null check (categoria in ('material', 'mao_obra')),
  unidade text not null,
  valor_unit_padrao numeric not null default 0,
  created_at timestamptz not null default now()
);

alter table empresas enable row level security;
alter table usuarios enable row level security;
alter table orcamentos enable row level security;
alter table itens_orcamento enable row level security;
alter table itens_biblioteca_empresa enable row level security;

-- Resolves the empresa_id of the currently authenticated user via the bridge table.
create or replace function auth_empresa_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select empresa_id from usuarios where id = auth.uid()
$$;

create policy "empresas_insert_authenticated" on empresas
  for insert to authenticated with check (true);
create policy "empresas_select_own" on empresas
  for select to authenticated using (id = auth_empresa_id());
create policy "empresas_update_own" on empresas
  for update to authenticated using (id = auth_empresa_id());

create policy "usuarios_insert_self" on usuarios
  for insert to authenticated with check (id = auth.uid());
create policy "usuarios_select_own" on usuarios
  for select to authenticated using (empresa_id = auth_empresa_id());

create policy "orcamentos_all_own" on orcamentos
  for all to authenticated
  using (empresa_id = auth_empresa_id())
  with check (empresa_id = auth_empresa_id());

create policy "itens_orcamento_all_own" on itens_orcamento
  for all to authenticated
  using (orcamento_id in (select id from orcamentos where empresa_id = auth_empresa_id()))
  with check (orcamento_id in (select id from orcamentos where empresa_id = auth_empresa_id()));

create policy "biblioteca_all_own" on itens_biblioteca_empresa
  for all to authenticated
  using (empresa_id = auth_empresa_id())
  with check (empresa_id = auth_empresa_id());
```

- [ ] **Step 2: Write the env template**

```bash
# .env.local.example
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

Add `.env.local` (not the `.example`) to `.gitignore` if not already present.

- [ ] **Step 3: Apply the migration to the real project and verify**

Requires the Supabase project already created (URL + keys from the user) and the Supabase CLI linked:

```bash
npx supabase login
npx supabase link --project-ref <project-ref-from-dashboard>
npx supabase db push
```

Verify: in the Supabase dashboard, Table Editor shows all 5 tables, and Authentication > Policies shows the listed policies on each.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/0001_init.sql .env.local.example .gitignore
git commit -m "feat: add initial schema and RLS migration"
```

---

## Task 7: Supabase client helpers

**Files:**
- Create: `lib/supabase/client.ts`
- Create: `lib/supabase/server.ts`
- Create: `lib/supabase/admin.ts`
- Create: `middleware.ts`

**Interfaces:**
- Consumes: env vars from `.env.local` (Task 6): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.
- Produces: `createBrowserClient()`, `createServerClient()` (async, cookie-bound, respects RLS), `createAdminClient()` (service-role, RLS-bypassing, server-only) — consumed by every Server Action and Server Component task from here on.

- [ ] **Step 1: Install the Supabase packages**

```bash
npm install @supabase/supabase-js @supabase/ssr
```

- [ ] **Step 2: Browser client**

```typescript
// lib/supabase/client.ts
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

- [ ] **Step 3: Server client (Server Components / Server Actions, respects RLS)**

```typescript
// lib/supabase/server.ts
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
          } catch {
            // called from a Server Component during render; middleware refreshes the session instead.
          }
        },
      },
    }
  )
}
```

- [ ] **Step 4: Admin client (service-role, server-only, bypasses RLS)**

```typescript
// lib/supabase/admin.ts
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

// Server-only: never import this file from a Client Component.
// Used exclusively by the public /o/[id] route to fetch a single orçamento by id.
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}
```

- [ ] **Step 5: Middleware to refresh the session cookie and guard protected routes**

```typescript
// middleware.ts
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const PROTECTED_PREFIXES = ['/dashboard', '/orcamentos', '/configuracoes']

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  const isProtected = PROTECTED_PREFIXES.some((p) => request.nextUrl.pathname.startsWith(p))
  if (isProtected && !user) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|o/).*)'],
}
```

- [ ] **Step 6: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: no errors (env vars are asserted with `!`, real values come from `.env.local` at runtime, created in Task 6 Step 3).

- [ ] **Step 7: Commit**

```bash
git add lib/supabase middleware.ts package.json package-lock.json
git commit -m "feat: add Supabase browser/server/admin clients and auth middleware"
```

---

## Task 8: Cadastro (signup) flow

**Files:**
- Create: `app/cadastro/page.tsx`
- Create: `app/cadastro/actions.ts`

**Interfaces:**
- Consumes: `createClient()` from `lib/supabase/server.ts` (Task 7), `SEGMENTOS` from `lib/segmentos-seed.ts` (Task 5), `SegmentoKey` from `lib/types.ts` (Task 3).
- Produces: Server Action `cadastrar(formData: FormData): Promise<{ error?: string }>` — on success, creates `auth.users` + `empresas` + `usuarios` + seeds `itens_biblioteca_empresa`, then redirects to `/dashboard`.

- [ ] **Step 1: Write the Server Action**

```typescript
// app/cadastro/actions.ts
'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { SEGMENTOS } from '@/lib/segmentos-seed'
import type { SegmentoKey } from '@/lib/types'

export async function cadastrar(formData: FormData): Promise<{ error?: string }> {
  const email = String(formData.get('email') ?? '')
  const senha = String(formData.get('senha') ?? '')
  const nomeUsuario = String(formData.get('nomeUsuario') ?? '')
  const nomeEmpresa = String(formData.get('nomeEmpresa') ?? '')
  const segmento = String(formData.get('segmento') ?? 'geral') as SegmentoKey

  if (!email || !senha || !nomeUsuario || !nomeEmpresa) {
    return { error: 'Preencha todos os campos.' }
  }

  const supabase = await createClient()

  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({ email, password: senha })
  if (signUpError || !signUpData.user) {
    return { error: signUpError?.message ?? 'Não foi possível criar a conta.' }
  }

  const seed = SEGMENTOS[segmento]

  const { data: empresa, error: empresaError } = await supabase
    .from('empresas')
    .insert({ nome: nomeEmpresa, segmento_padrao: segmento, bdi_padrao: seed.bdiPadrao })
    .select('id')
    .single()
  if (empresaError || !empresa) {
    return { error: empresaError?.message ?? 'Não foi possível criar a empresa.' }
  }

  const { error: usuarioError } = await supabase
    .from('usuarios')
    .insert({ id: signUpData.user.id, empresa_id: empresa.id, nome: nomeUsuario })
  if (usuarioError) {
    return { error: usuarioError.message }
  }

  if (seed.itens.length > 0) {
    const { error: bibliotecaError } = await supabase.from('itens_biblioteca_empresa').insert(
      seed.itens.map((item) => ({
        empresa_id: empresa.id,
        descricao: item.descricao,
        categoria: item.categoria,
        unidade: item.unidade,
        valor_unit_padrao: item.valorUnitPadrao,
      }))
    )
    if (bibliotecaError) {
      return { error: bibliotecaError.message }
    }
  }

  redirect('/dashboard')
}
```

- [ ] **Step 2: Write the page**

```tsx
// app/cadastro/page.tsx
import { cadastrar } from './actions'
import { SEGMENTOS } from '@/lib/segmentos-seed'

export default function CadastroPage() {
  return (
    <main className="mx-auto max-w-md px-6 py-16">
      <h1 className="text-2xl font-bold text-blueprint-deep">Criar conta — Orça Fácil</h1>
      <form action={cadastrar} className="mt-8 flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-sm">
          Seu nome
          <input name="nomeUsuario" required className="border-b border-line bg-transparent py-1 outline-none focus:border-brass" />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Nome da empresa
          <input name="nomeEmpresa" required className="border-b border-line bg-transparent py-1 outline-none focus:border-brass" />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Segmento principal
          <select name="segmento" required className="border-b border-line bg-transparent py-1 outline-none focus:border-brass">
            {Object.entries(SEGMENTOS).map(([key, seg]) => (
              <option key={key} value={key}>{seg.label}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          E-mail
          <input type="email" name="email" required className="border-b border-line bg-transparent py-1 outline-none focus:border-brass" />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Senha
          <input type="password" name="senha" required minLength={6} className="border-b border-line bg-transparent py-1 outline-none focus:border-brass" />
        </label>
        <button type="submit" className="mt-4 rounded-sm bg-blueprint-deep px-5 py-3 font-sans font-bold text-paper">
          Criar conta
        </button>
      </form>
    </main>
  )
}
```

- [ ] **Step 3: Manual verification against the real Supabase project**

Prerequisite: Task 6 Step 3 done (migration pushed, `.env.local` filled with the real project's URL/anon key/service role key).

Run: `npm run dev`, open `http://localhost:3000/cadastro`, submit the form with a segment that has seed items (e.g. Elétrica).

Verify in the Supabase dashboard Table Editor:
- `auth.users` has the new user
- `empresas` has one row with the submitted `nome` and `segmento_padrao`
- `usuarios` has one row with matching `id` and `empresa_id`
- `itens_biblioteca_empresa` has 6 rows for that `empresa_id` (the Elétrica seed items)

- [ ] **Step 4: Commit**

```bash
git add app/cadastro
git commit -m "feat: add signup flow (empresa + usuario + biblioteca seed)"
```

---

## Task 9: Login flow

**Files:**
- Create: `app/login/page.tsx`
- Create: `app/login/actions.ts`

**Interfaces:**
- Consumes: `createClient()` from `lib/supabase/server.ts` (Task 7).
- Produces: Server Action `entrar(formData: FormData): Promise<{ error?: string }>` — on success redirects to `/dashboard`.

- [ ] **Step 1: Write the Server Action**

```typescript
// app/login/actions.ts
'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function entrar(formData: FormData): Promise<{ error?: string }> {
  const email = String(formData.get('email') ?? '')
  const senha = String(formData.get('senha') ?? '')

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password: senha })
  if (error) {
    return { error: 'E-mail ou senha inválidos.' }
  }
  redirect('/dashboard')
}
```

- [ ] **Step 2: Write the page**

```tsx
// app/login/page.tsx
import { entrar } from './actions'

export default function LoginPage() {
  return (
    <main className="mx-auto max-w-md px-6 py-16">
      <h1 className="text-2xl font-bold text-blueprint-deep">Entrar — Orça Fácil</h1>
      <form action={entrar} className="mt-8 flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-sm">
          E-mail
          <input type="email" name="email" required className="border-b border-line bg-transparent py-1 outline-none focus:border-brass" />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Senha
          <input type="password" name="senha" required className="border-b border-line bg-transparent py-1 outline-none focus:border-brass" />
        </label>
        <button type="submit" className="mt-4 rounded-sm bg-blueprint-deep px-5 py-3 font-sans font-bold text-paper">
          Entrar
        </button>
      </form>
      <p className="mt-6 text-sm text-ink-soft">
        Não tem conta? <a href="/cadastro" className="text-brass underline">Cadastre-se</a>
      </p>
    </main>
  )
}
```

- [ ] **Step 3: Manual verification**

With the user created in Task 8, open `http://localhost:3000/login`, sign in, confirm redirect to `/dashboard` (page not built yet — a 404/blank page confirming the redirect happened is sufficient at this step).

Also verify the middleware guard: open `http://localhost:3000/dashboard` in an incognito window (no session) and confirm it redirects to `/login`.

- [ ] **Step 4: Commit**

```bash
git add app/login
git commit -m "feat: add login flow"
```

---

## Task 10: Dashboard (list orçamentos)

**Files:**
- Create: `app/dashboard/page.tsx`

**Interfaces:**
- Consumes: `createClient()` from `lib/supabase/server.ts` (Task 7), `Orcamento` from `lib/types.ts` (Task 3), `formatarMoeda` from `lib/calc.ts` (Task 4).
- Produces: renders the authenticated empresa's `orcamentos` list; nothing later depends on this file's internals.

- [ ] **Step 1: Write the page**

```tsx
// app/dashboard/page.tsx
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import type { Orcamento } from '@/lib/types'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: orcamentos } = await supabase
    .from('orcamentos')
    .select('*')
    .order('created_at', { ascending: false })
    .returns<Orcamento[]>()

  return (
    <main className="mx-auto max-w-4xl px-6 py-12">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-blueprint-deep">Meus orçamentos</h1>
        <Link href="/orcamentos/novo" className="rounded-sm bg-blueprint-deep px-4 py-2 font-sans text-sm font-bold text-paper">
          + Novo orçamento
        </Link>
      </div>

      {(!orcamentos || orcamentos.length === 0) ? (
        <p className="mt-8 text-ink-soft italic">Nenhum orçamento ainda. Crie o primeiro.</p>
      ) : (
        <ul className="mt-8 flex flex-col gap-3">
          {orcamentos.map((o) => (
            <li key={o.id}>
              <Link
                href={`/orcamentos/${o.id}`}
                className="flex items-center justify-between rounded-sm border border-line bg-white px-4 py-3"
              >
                <span>{o.cliente_nome}</span>
                <span className="font-mono-num text-sm text-ink-soft">{o.status}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}
```

- [ ] **Step 2: Manual verification**

Logged in as the Task 8 user, open `/dashboard`, confirm the empty state renders (no orçamentos yet) and the "Novo orçamento" link is visible.

- [ ] **Step 3: Commit**

```bash
git add app/dashboard
git commit -m "feat: add dashboard listing empresa's orcamentos"
```

---

## Task 11: Shared builder + preview components

**Files:**
- Create: `components/OrcamentoPreview.tsx`
- Create: `components/OrcamentoBuilder.tsx`

**Interfaces:**
- Consumes: `calcularOrcamento`, `formatarMoeda` from `lib/calc.ts` (Task 4); `SEGMENTOS` from `lib/segmentos-seed.ts` (Task 5); `ItemOrcamento`, `ItemBiblioteca`, `SegmentoKey`, `Categoria` from `lib/types.ts` (Task 3).
- Produces:
  - `OrcamentoPreview(props: { empresaNome: string, segmentoLabel: string, clienteNome: string, obraEndereco: string, prazoExecucao: string, validadeDias: number, formaPagamento: string, itens: Pick<ItemOrcamento,'descricao'|'categoria'|'unidade'|'quantidade'|'valor_unit'>[], bdi: number })` — read-only render, reused by Task 15's public page.
  - `OrcamentoBuilder(props: { biblioteca: ItemBiblioteca[], segmentoPadrao: SegmentoKey, empresaNome: string, valoresIniciais?: { clienteNome, clienteContato, obraEndereco, prazoExecucao, validadeDias, formaPagamento, bdi, itens: ItemOrcamento[] }, onSalvar: (payload) => Promise<{ error?: string }> })` — interactive form, used by Tasks 13 and 14.

- [ ] **Step 1: Write the preview component**

```tsx
// components/OrcamentoPreview.tsx
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
}

export function OrcamentoPreview(props: OrcamentoPreviewProps) {
  const { subtotalMaterial, subtotalMaoObra, valorBdi, total } = calcularOrcamento(props.itens, props.bdi)

  return (
    <div className="border border-line bg-white px-8 py-9 print:border-none print:shadow-none">
      <div className="mb-5 flex items-start justify-between">
        <div>
          <div className="text-lg font-bold">{props.empresaNome || 'Sua Empresa'}</div>
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
        <div className="flex justify-between"><span className="font-sans">Materiais</span><span>{formatarMoeda(subtotalMaterial)}</span></div>
        <div className="flex justify-between"><span className="font-sans">Mão de obra</span><span>{formatarMoeda(subtotalMaoObra)}</span></div>
        <div className="flex justify-between"><span className="font-sans">BDI ({props.bdi || 0}%)</span><span>{formatarMoeda(valorBdi)}</span></div>
        <div className="mt-1 flex justify-between border-t border-ink pt-2 text-lg font-bold">
          <span className="font-sans">Total</span><span className="text-blueprint-deep">{formatarMoeda(total)}</span>
        </div>
      </div>

      <div className="mt-5 text-xs leading-6 text-ink-soft">
        <strong className="font-sans">Forma de pagamento:</strong> {props.formaPagamento}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Write the builder component**

```tsx
// components/OrcamentoBuilder.tsx
'use client'

import { useState } from 'react'
import { SEGMENTOS } from '@/lib/segmentos-seed'
import { OrcamentoPreview } from './OrcamentoPreview'
import type { Categoria, ItemBiblioteca, ItemOrcamento, SegmentoKey } from '@/lib/types'

interface ItemForm {
  descricao: string
  categoria: Categoria
  unidade: string
  quantidade: number
  valor_unit: number
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
    setItens((prev) => [
      ...prev,
      { localId: nextLocalId++, descricao: item.descricao, unidade: item.unidade, categoria: item.categoria, quantidade: 1, valor_unit: item.valor_unit_padrao },
    ])
  }

  function adicionarItemVazio() {
    setItens((prev) => [...prev, { localId: nextLocalId++, descricao: '', unidade: 'un', categoria: 'mao_obra', quantidade: 1, valor_unit: 0 }])
  }

  function atualizarItem<K extends keyof ItemForm>(localId: number, campo: K, valor: ItemForm[K]) {
    setItens((prev) => prev.map((it) => (it.localId === localId ? { ...it, [campo]: valor } : it)))
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
      itens: itens.map(({ localId, ...rest }) => rest),
    })
    setSalvando(false)
    if (resultado.error) setErro(resultado.error)
  }

  return (
    <div className="mx-auto grid max-w-6xl grid-cols-[1.05fr_1fr] gap-7 px-5 py-8">
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
              <div key={it.localId} className="grid grid-cols-[2.2fr_0.7fr_0.7fr_0.9fr_0.9fr_auto] items-center gap-2 text-sm">
                <input value={it.descricao} onChange={(e) => atualizarItem(it.localId, 'descricao', e.target.value)} placeholder="Descrição" className="border-b border-line bg-transparent py-1 outline-none focus:border-brass" />
                <select value={it.categoria} onChange={(e) => atualizarItem(it.localId, 'categoria', e.target.value as Categoria)} className="border-b border-line bg-transparent py-1 outline-none focus:border-brass">
                  <option value="material">Material</option>
                  <option value="mao_obra">Mão de obra</option>
                </select>
                <input value={it.unidade} onChange={(e) => atualizarItem(it.localId, 'unidade', e.target.value)} className="border-b border-line bg-transparent py-1 outline-none focus:border-brass" />
                <input type="number" value={it.quantidade} onChange={(e) => atualizarItem(it.localId, 'quantidade', Number(e.target.value))} className="font-mono-num border-b border-line bg-transparent py-1 outline-none focus:border-brass" />
                <input type="number" value={it.valor_unit} onChange={(e) => atualizarItem(it.localId, 'valor_unit', Number(e.target.value))} className="font-mono-num border-b border-line bg-transparent py-1 outline-none focus:border-brass" />
                <button onClick={() => removerItem(it.localId)} className="text-danger">×</button>
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

      <div className="sticky top-5 self-start">
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
```

- [ ] **Step 3: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: no errors. (Full interactive behavior is verified in Tasks 12 and 13, once a page wires this component to real data and a Server Action.)

- [ ] **Step 4: Commit**

```bash
git add components
git commit -m "feat: add shared OrcamentoBuilder and OrcamentoPreview components"
```

---

## Task 12: Novo orçamento — Server Action

**Files:**
- Create: `app/orcamentos/novo/actions.ts`

**Interfaces:**
- Consumes: `createClient()` from `lib/supabase/server.ts` (Task 7), `OrcamentoBuilderPayload` shape from `components/OrcamentoBuilder.tsx` (Task 11).
- Produces: `criarOrcamento(empresaId: string, payload: OrcamentoBuilderPayload): Promise<{ error?: string }>` — inserts into `orcamentos` then `itens_orcamento`, redirects to `/orcamentos/[id]` on success.

- [ ] **Step 1: Write the Server Action**

```typescript
// app/orcamentos/novo/actions.ts
'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { OrcamentoBuilderPayload } from '@/components/OrcamentoBuilder'

export async function criarOrcamento(empresaId: string, payload: OrcamentoBuilderPayload): Promise<{ error?: string }> {
  const supabase = await createClient()

  const { data: orcamento, error: orcamentoError } = await supabase
    .from('orcamentos')
    .insert({
      empresa_id: empresaId,
      cliente_nome: payload.clienteNome,
      cliente_contato: payload.clienteContato || null,
      obra_endereco: payload.obraEndereco || null,
      prazo_execucao: payload.prazoExecucao || null,
      validade_dias: payload.validadeDias,
      forma_pagamento: payload.formaPagamento || null,
      bdi: payload.bdi,
      status: 'rascunho',
    })
    .select('id')
    .single()

  if (orcamentoError || !orcamento) {
    return { error: orcamentoError?.message ?? 'Não foi possível salvar o orçamento.' }
  }

  const { error: itensError } = await supabase.from('itens_orcamento').insert(
    payload.itens.map((it) => ({
      orcamento_id: orcamento.id,
      descricao: it.descricao,
      categoria: it.categoria,
      unidade: it.unidade,
      quantidade: it.quantidade,
      valor_unit: it.valor_unit,
    }))
  )

  if (itensError) {
    return { error: itensError.message }
  }

  redirect(`/orcamentos/${orcamento.id}`)
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add app/orcamentos/novo/actions.ts
git commit -m "feat: add criarOrcamento server action"
```

---

## Task 13: Novo orçamento — page

**Files:**
- Create: `app/orcamentos/novo/page.tsx`

**Interfaces:**
- Consumes: `createClient()` from `lib/supabase/server.ts` (Task 7); `OrcamentoBuilder` from `components/OrcamentoBuilder.tsx` (Task 11); `criarOrcamento` from `app/orcamentos/novo/actions.ts` (Task 12).

- [ ] **Step 1: Write the page**

```tsx
// app/orcamentos/novo/page.tsx
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { OrcamentoBuilder } from '@/components/OrcamentoBuilder'
import { criarOrcamento } from './actions'
import type { Empresa, ItemBiblioteca } from '@/lib/types'

export default async function NovoOrcamentoPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: usuario } = await supabase.from('usuarios').select('empresa_id').eq('id', user!.id).single()
  if (!usuario) redirect('/login')

  const { data: empresa } = await supabase.from('empresas').select('*').eq('id', usuario.empresa_id).single<Empresa>()
  const { data: biblioteca } = await supabase
    .from('itens_biblioteca_empresa')
    .select('*')
    .eq('empresa_id', usuario.empresa_id)
    .returns<ItemBiblioteca[]>()

  return (
    <OrcamentoBuilder
      biblioteca={biblioteca ?? []}
      segmentoPadrao={empresa?.segmento_padrao ?? 'geral'}
      empresaNome={empresa?.nome ?? ''}
      onSalvar={(payload) => criarOrcamento(usuario.empresa_id, payload)}
    />
  )
}
```

- [ ] **Step 2: Manual verification**

Logged in, open `/orcamentos/novo`. Confirm: segment picker pre-selects the empresa's `segmento_padrao`; biblioteca buttons (seeded in Task 8) add items; adding a manual item works; BDI recalculates the preview total live; clicking "Salvar orçamento" with a client name and at least one item redirects to `/orcamentos/[id]` (a 404 there is expected until Task 14 exists); clicking save with an empty client name shows the inline error instead of submitting.

Then verify in Supabase Table Editor: `orcamentos` has the new row, `itens_orcamento` has the matching rows.

- [ ] **Step 3: Commit**

```bash
git add app/orcamentos/novo/page.tsx
git commit -m "feat: wire up /orcamentos/novo page"
```

---

## Task 14: Editar orçamento — page + Server Action

**Files:**
- Create: `app/orcamentos/[id]/page.tsx`
- Create: `app/orcamentos/[id]/actions.ts`

**Interfaces:**
- Consumes: `createClient()` (Task 7), `OrcamentoBuilder` (Task 11), `Empresa`, `Orcamento`, `ItemOrcamento`, `ItemBiblioteca` (Task 3).
- Produces: `atualizarOrcamento(orcamentoId: string, payload: OrcamentoBuilderPayload): Promise<{ error?: string }>` — replaces `itens_orcamento` for that orçamento and updates the `orcamentos` row's `updated_at`; RLS (`orcamentos_all_own`, `itens_orcamento_all_own`, Task 6) guarantees this only ever touches rows belonging to the caller's empresa, so no saved orçamento from another empresa can be reached even if an id is guessed.

- [ ] **Step 1: Write the Server Action**

```typescript
// app/orcamentos/[id]/actions.ts
'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { OrcamentoBuilderPayload } from '@/components/OrcamentoBuilder'

export async function atualizarOrcamento(orcamentoId: string, payload: OrcamentoBuilderPayload): Promise<{ error?: string }> {
  const supabase = await createClient()

  const { error: orcamentoError } = await supabase
    .from('orcamentos')
    .update({
      cliente_nome: payload.clienteNome,
      cliente_contato: payload.clienteContato || null,
      obra_endereco: payload.obraEndereco || null,
      prazo_execucao: payload.prazoExecucao || null,
      validade_dias: payload.validadeDias,
      forma_pagamento: payload.formaPagamento || null,
      bdi: payload.bdi,
      updated_at: new Date().toISOString(),
    })
    .eq('id', orcamentoId)

  if (orcamentoError) {
    return { error: orcamentoError.message }
  }

  const { error: deleteError } = await supabase.from('itens_orcamento').delete().eq('orcamento_id', orcamentoId)
  if (deleteError) {
    return { error: deleteError.message }
  }

  const { error: insertError } = await supabase.from('itens_orcamento').insert(
    payload.itens.map((it) => ({
      orcamento_id: orcamentoId,
      descricao: it.descricao,
      categoria: it.categoria,
      unidade: it.unidade,
      quantidade: it.quantidade,
      valor_unit: it.valor_unit,
    }))
  )
  if (insertError) {
    return { error: insertError.message }
  }

  revalidatePath(`/orcamentos/${orcamentoId}`)
  return {}
}
```

- [ ] **Step 2: Write the page**

```tsx
// app/orcamentos/[id]/page.tsx
import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { OrcamentoBuilder } from '@/components/OrcamentoBuilder'
import { atualizarOrcamento } from './actions'
import type { Empresa, ItemBiblioteca, ItemOrcamento, Orcamento } from '@/lib/types'

export default async function EditarOrcamentoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: usuario } = await supabase.from('usuarios').select('empresa_id').eq('id', user!.id).single()
  if (!usuario) redirect('/login')

  const { data: orcamento } = await supabase.from('orcamentos').select('*').eq('id', id).single<Orcamento>()
  if (!orcamento) notFound()

  const { data: itens } = await supabase.from('itens_orcamento').select('*').eq('orcamento_id', id).returns<ItemOrcamento[]>()
  const { data: empresa } = await supabase.from('empresas').select('*').eq('id', usuario.empresa_id).single<Empresa>()
  const { data: biblioteca } = await supabase
    .from('itens_biblioteca_empresa')
    .select('*')
    .eq('empresa_id', usuario.empresa_id)
    .returns<ItemBiblioteca[]>()

  return (
    <OrcamentoBuilder
      biblioteca={biblioteca ?? []}
      segmentoPadrao={empresa?.segmento_padrao ?? 'geral'}
      empresaNome={empresa?.nome ?? ''}
      valoresIniciais={{
        clienteNome: orcamento.cliente_nome,
        clienteContato: orcamento.cliente_contato ?? '',
        obraEndereco: orcamento.obra_endereco ?? '',
        prazoExecucao: orcamento.prazo_execucao ?? '',
        validadeDias: orcamento.validade_dias,
        formaPagamento: orcamento.forma_pagamento ?? '',
        bdi: orcamento.bdi,
        itens: itens ?? [],
      }}
      onSalvar={(payload) => atualizarOrcamento(id, payload)}
    />
  )
}
```

- [ ] **Step 3: Manual verification**

Open `/orcamentos/[id]` for the orçamento created in Task 13. Confirm existing client name, address, items, and BDI are pre-filled. Change the client name and add an item, save, reload the page, confirm changes persisted.

RLS isolation check: create a second empresa (sign up with a different email in Task 8's flow), log in as it, try opening the first empresa's `/orcamentos/[id]` URL directly — confirm `notFound()` (404), not the other empresa's data.

- [ ] **Step 4: Commit**

```bash
git add app/orcamentos/[id]
git commit -m "feat: add orcamento edit page and update action"
```

---

## Task 15: Public orçamento page (`/o/[id]`)

**Files:**
- Create: `app/o/[id]/page.tsx`

**Interfaces:**
- Consumes: `createAdminClient()` from `lib/supabase/admin.ts` (Task 7), `OrcamentoPreview` from `components/OrcamentoPreview.tsx` (Task 11), `Orcamento`, `ItemOrcamento`, `Empresa` (Task 3).
- Produces: an unauthenticated, print-friendly page reachable without login; the only place in the app that uses the service-role client, and only for a `.eq('id', id).single()` lookup — no listing endpoint is ever created from it.

- [ ] **Step 1: Write the page**

```tsx
// app/o/[id]/page.tsx
import { notFound } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import { OrcamentoPreview } from '@/components/OrcamentoPreview'
import type { Empresa, ItemOrcamento, Orcamento } from '@/lib/types'
import { SEGMENTOS } from '@/lib/segmentos-seed'

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
        segmentoLabel={empresa ? SEGMENTOS[empresa.segmento_padrao].label : ''}
        clienteNome={orcamento.cliente_nome}
        obraEndereco={orcamento.obra_endereco ?? ''}
        prazoExecucao={orcamento.prazo_execucao ?? ''}
        validadeDias={orcamento.validade_dias}
        formaPagamento={orcamento.forma_pagamento ?? ''}
        itens={itens ?? []}
        bdi={orcamento.bdi}
      />
      <button
        onClick={() => window.print()}
        className="no-print mt-5 rounded-sm bg-blueprint-deep px-5 py-3 font-sans font-bold text-paper"
      >
        Gerar PDF
      </button>
    </main>
  )
}
```

Note: `onClick` requires a Client Component boundary — since this page is a Server Component (it awaits data), extract the print button:

- [ ] **Step 2: Extract the print button as a small Client Component**

```tsx
// app/o/[id]/PrintButton.tsx
'use client'

export function PrintButton() {
  return (
    <button onClick={() => window.print()} className="no-print mt-5 rounded-sm bg-blueprint-deep px-5 py-3 font-sans font-bold text-paper">
      Gerar PDF
    </button>
  )
}
```

Replace the inline `<button>` in `app/o/[id]/page.tsx` with `<PrintButton />` and import it.

- [ ] **Step 3: Add print styles**

Append to `app/globals.css`:

```css
@media print {
  .no-print {
    display: none !important;
  }
}
```

- [ ] **Step 4: Manual verification**

Open `/o/[id]` for the Task 13 orçamento **in an incognito window** (no session) — confirm it renders without redirecting to `/login` (this route is excluded from the middleware matcher, Task 7 Step 5). Confirm "Gerar PDF" opens the browser print dialog with the builder-only chrome hidden. Try a random UUID — confirm 404.

- [ ] **Step 5: Commit**

```bash
git add app/o app/globals.css
git commit -m "feat: add public orcamento page with service-role lookup"
```

---

## Task 16: Configurações page

**Files:**
- Create: `app/configuracoes/page.tsx`
- Create: `app/configuracoes/actions.ts`

**Interfaces:**
- Consumes: `createClient()` (Task 7), `Empresa`, `ItemBiblioteca` (Task 3).
- Produces: `atualizarEmpresa(empresaId: string, dados: { nome: string, telefone: string, bdiPadrao: number }): Promise<{ error?: string }>`, `adicionarItemBiblioteca(empresaId: string, item: { descricao: string, categoria: Categoria, unidade: string, valorUnitPadrao: number }): Promise<{ error?: string }>`, `removerItemBiblioteca(itemId: string): Promise<{ error?: string }>`.

- [ ] **Step 1: Write the Server Actions**

```typescript
// app/configuracoes/actions.ts
'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { Categoria } from '@/lib/types'

export async function atualizarEmpresa(
  empresaId: string,
  dados: { nome: string; telefone: string; bdiPadrao: number }
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('empresas')
    .update({ nome: dados.nome, telefone: dados.telefone || null, bdi_padrao: dados.bdiPadrao })
    .eq('id', empresaId)
  if (error) return { error: error.message }
  revalidatePath('/configuracoes')
  return {}
}

export async function adicionarItemBiblioteca(
  empresaId: string,
  item: { descricao: string; categoria: Categoria; unidade: string; valorUnitPadrao: number }
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { error } = await supabase.from('itens_biblioteca_empresa').insert({
    empresa_id: empresaId,
    descricao: item.descricao,
    categoria: item.categoria,
    unidade: item.unidade,
    valor_unit_padrao: item.valorUnitPadrao,
  })
  if (error) return { error: error.message }
  revalidatePath('/configuracoes')
  return {}
}

export async function removerItemBiblioteca(itemId: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { error } = await supabase.from('itens_biblioteca_empresa').delete().eq('id', itemId)
  if (error) return { error: error.message }
  revalidatePath('/configuracoes')
  return {}
}
```

- [ ] **Step 2: Write the page**

```tsx
// app/configuracoes/page.tsx
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { atualizarEmpresa, adicionarItemBiblioteca, removerItemBiblioteca } from './actions'
import type { Empresa, ItemBiblioteca } from '@/lib/types'

export default async function ConfiguracoesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: usuario } = await supabase.from('usuarios').select('empresa_id').eq('id', user!.id).single()
  if (!usuario) redirect('/login')

  const { data: empresa } = await supabase.from('empresas').select('*').eq('id', usuario.empresa_id).single<Empresa>()
  const { data: biblioteca } = await supabase
    .from('itens_biblioteca_empresa')
    .select('*')
    .eq('empresa_id', usuario.empresa_id)
    .order('descricao')
    .returns<ItemBiblioteca[]>()

  async function salvarEmpresa(formData: FormData) {
    'use server'
    await atualizarEmpresa(usuario!.empresa_id, {
      nome: String(formData.get('nome') ?? ''),
      telefone: String(formData.get('telefone') ?? ''),
      bdiPadrao: Number(formData.get('bdiPadrao') ?? 0),
    })
  }

  async function adicionarItem(formData: FormData) {
    'use server'
    await adicionarItemBiblioteca(usuario!.empresa_id, {
      descricao: String(formData.get('descricao') ?? ''),
      categoria: String(formData.get('categoria') ?? 'mao_obra') as 'material' | 'mao_obra',
      unidade: String(formData.get('unidade') ?? 'un'),
      valorUnitPadrao: Number(formData.get('valorUnitPadrao') ?? 0),
    })
  }

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <h1 className="text-2xl font-bold text-blueprint-deep">Configurações</h1>

      <form action={salvarEmpresa} className="mt-8 flex flex-col gap-4 border-b border-line pb-8">
        <h2 className="text-xs font-bold uppercase tracking-wide text-brass">Dados da empresa</h2>
        <label className="flex flex-col gap-1 text-sm">Nome
          <input name="nome" defaultValue={empresa?.nome} className="border-b border-line bg-transparent py-1 outline-none focus:border-brass" />
        </label>
        <label className="flex flex-col gap-1 text-sm">Telefone
          <input name="telefone" defaultValue={empresa?.telefone ?? ''} className="border-b border-line bg-transparent py-1 outline-none focus:border-brass" />
        </label>
        <label className="flex flex-col gap-1 text-sm">BDI padrão (%)
          <input type="number" name="bdiPadrao" defaultValue={empresa?.bdi_padrao} className="font-mono-num border-b border-line bg-transparent py-1 outline-none focus:border-brass" />
        </label>
        <button type="submit" className="mt-2 self-start rounded-sm bg-blueprint-deep px-4 py-2 text-sm font-bold text-paper">Salvar</button>
      </form>

      <div className="mt-8">
        <h2 className="text-xs font-bold uppercase tracking-wide text-brass">Biblioteca de itens</h2>
        <ul className="mt-4 flex flex-col gap-2">
          {(biblioteca ?? []).map((item) => (
            <li key={item.id} className="flex items-center justify-between border border-line bg-white px-3 py-2 text-sm">
              <span>{item.descricao} <span className="text-ink-soft">· R$ {item.valor_unit_padrao}/{item.unidade}</span></span>
              <form action={async () => { 'use server'; await removerItemBiblioteca(item.id) }}>
                <button type="submit" className="text-danger">×</button>
              </form>
            </li>
          ))}
        </ul>

        <form action={adicionarItem} className="mt-4 grid grid-cols-[2fr_1fr_1fr_1fr_auto] items-center gap-2 text-sm">
          <input name="descricao" placeholder="Descrição" required className="border-b border-line bg-transparent py-1 outline-none focus:border-brass" />
          <select name="categoria" className="border-b border-line bg-transparent py-1 outline-none focus:border-brass">
            <option value="material">Material</option>
            <option value="mao_obra">Mão de obra</option>
          </select>
          <input name="unidade" placeholder="un" defaultValue="un" className="border-b border-line bg-transparent py-1 outline-none focus:border-brass" />
          <input type="number" name="valorUnitPadrao" placeholder="0" className="font-mono-num border-b border-line bg-transparent py-1 outline-none focus:border-brass" />
          <button type="submit" className="rounded-sm border border-dashed border-line px-3 py-1.5 text-ink-soft">+</button>
        </form>
      </div>
    </main>
  )
}
```

- [ ] **Step 3: Manual verification**

Open `/configuracoes`, change the empresa name and BDI padrão, save, reload, confirm persisted. Add a custom biblioteca item, confirm it appears and is selectable in `/orcamentos/novo`. Remove it, confirm it disappears.

- [ ] **Step 4: Commit**

```bash
git add app/configuracoes
git commit -m "feat: add configuracoes page (empresa data + biblioteca management)"
```

---

## Task 17: Root layout, navigation, and home redirect

**Files:**
- Modify: `app/layout.tsx`
- Modify: `app/page.tsx`

**Interfaces:**
- Consumes: `createClient()` (Task 7).
- Produces: authenticated top nav (Dashboard / Novo orçamento / Configurações / Sair) shown on protected pages; `/` redirects to `/dashboard` if logged in, `/login` otherwise.

- [ ] **Step 1: Add a sign-out Server Action and nav to the layout**

```tsx
// app/layout.tsx
import './globals.css'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export const metadata = { title: 'Orça Fácil', description: 'Orçamentos profissionais para prestadores de serviço' }

async function sair() {
  'use server'
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <html lang="pt-BR">
      <body>
        {user && (
          <nav className="no-print bg-blueprint-deep px-6 py-3 text-paper">
            <div className="mx-auto flex max-w-6xl items-center justify-between text-sm">
              <div className="flex gap-5">
                <Link href="/dashboard">Dashboard</Link>
                <Link href="/orcamentos/novo">Novo orçamento</Link>
                <Link href="/configuracoes">Configurações</Link>
              </div>
              <form action={sair}>
                <button type="submit" className="opacity-80">Sair</button>
              </form>
            </div>
          </nav>
        )}
        {children}
      </body>
    </html>
  )
}
```

- [ ] **Step 2: Home page redirect**

```tsx
// app/page.tsx
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function HomePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  redirect(user ? '/dashboard' : '/login')
}
```

- [ ] **Step 3: Manual verification**

Logged out, open `/` — redirects to `/login`. Log in, open `/` — redirects to `/dashboard` and the nav bar with all 3 links + "Sair" appears. Click "Sair", confirm redirect to `/login` and that `/dashboard` now redirects back to `/login`.

- [ ] **Step 4: Commit**

```bash
git add app/layout.tsx app/page.tsx
git commit -m "feat: add authenticated nav, sign-out, and home redirect"
```

---

## Task 18: Push to GitHub

**Files:** none (repo-level operation)

**Interfaces:** none.

- [ ] **Step 1: Verify the full test suite and build pass**

```bash
npm test
npm run build
```

Expected: all Vitest tests pass, build completes with no errors.

- [ ] **Step 2: Create the GitHub repository and push**

```bash
cd "/c/Users/cauer/Desktop/Orça Fácil"
gh repo create orca-facil --private --source=. --remote=origin
git push -u origin master
```

- [ ] **Step 3: Verify**

Run: `gh repo view orca-facil --web` (or check the URL `gh repo create` printed) — confirm the repo exists, private, and the latest commit matches `git log -1`.

- [ ] **Step 4: No commit needed — this task is the push itself.**

---

## Self-Review Notes

- **Spec coverage:** every spec section is covered — visão/schema (Tasks 3, 6), RLS isolation (Task 6, verified cross-empresa in Task 14), biblioteca-per-empresa decision (Tasks 5, 8), all 6 MVP pages (Tasks 8–10, 13–17), Tailwind/prototype visual direction (Tasks 2, 11), aditive-only + client-side validation (Task 14's replace-not-drop-table approach preserves the orçamento row itself; builder validation in Task 11), handshake protocol (Task 6 Step 3 + Task 8 Step 3 confirm auth/insert/select work before the remaining UI is built), GitHub/Vercel target (Task 18; Vercel deploy itself is a one-time dashboard action after this plan, not a coding task).
- **Placeholder scan:** no TBD/TODO; every step shows complete code or an exact command with expected output.
- **Type consistency:** `ItemOrcamento`/`ItemBiblioteca`/`Empresa`/`Orcamento` (Task 3) are the single source of types used unchanged through Tasks 4, 5, 8–17. `OrcamentoBuilderPayload` (defined in Task 11) is imported by name, unchanged, in Tasks 12 and 14. `calcularOrcamento`/`formatarMoeda` (Task 4) are the only calculation functions and are used identically in `OrcamentoPreview` (Task 11) and nowhere reimplemented.
