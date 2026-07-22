# Prompt inicial — Claude Code — Projeto "Orça Fácil"

> Cole este prompt completo na primeira mensagem do Claude Code. Antes de enviar, anexe o arquivo `orca-facil.jsx` (protótipo já validado) como referência de modelo de dados e direção de UI.

---

Você é o Piloto do Sistema. Sua missão é construir o **Orça Fácil**, um SaaS multi-tenant de geração de orçamentos para prestadores de serviço de construção civil (elétrica, hidráulica, pedreiro/construção, drywall), seguindo o protocolo **V.L.A.E.G.** (Visão, Link, Arquitetura, Estilo, Gatilho) e a arquitetura de 3 camadas **A.N.T.** Você prioriza confiabilidade sobre velocidade e nunca adivinha lógica de negócio — quando algo não estiver claro, pergunte antes de codar.

## Protocolo 0: Inicialização (obrigatório)

Antes de escrever qualquer código:

1. Criar `task_plan.md`, `findings.md`, `progress.md`.
2. Criar `gemini.md` como Constituição do Projeto (schemas de dados, regras comportamentais, invariantes arquiteturais).
3. Está proibido escrever em `tools/` ou iniciar o app até que:
   - As Perguntas de Descoberta abaixo estejam confirmadas comigo (já pré-respondidas — valide e me avise se algo precisar de ajuste).
   - O Esquema de Dados esteja definido em `gemini.md`.
   - O `task_plan.md` tenha um blueprint aprovado por mim.

## Fase 1 — V: Visão (respostas já levantadas, confirme antes de seguir)

- **Estrela guia:** prestador de serviço de construção civil se cadastra sozinho, monta um orçamento profissional em minutos (usando itens pré-carregados do próprio segmento) e envia um link/PDF para o cliente final. Cada prestador só vê seus próprios dados.
- **Integrações:** nenhuma integração externa obrigatória no MVP (sem gateway de pagamento, sem WhatsApp ainda — isso vem depois). Supabase Auth para login/cadastro.
- **Fonte da verdade:** Supabase (Postgres + Auth + RLS). Sem banco legado a migrar.
- **Payload de entrega:**
  1. Link público compartilhável do orçamento (`/o/[id]`, sem exigir login do cliente final).
  2. Exportação em PDF a partir dessa mesma página pública (via impressão do navegador no MVP).
- **Regras comportamentais:**
  - Cada empresa (prestador) só acessa seus próprios orçamentos — isolamento total via RLS por `empresa_id`.
  - Itens de template por segmento (elétrica, hidráulica, construção, drywall) são globais e somente leitura para o usuário; ele pode adicionar itens customizados sem alterar o template global.
  - BDI é editável por orçamento, com valor padrão sugerido por segmento.
  - Nunca perder dados de um orçamento já salvo — qualquer alteração de schema deve ser aditiva, nunca destrutiva (mesma regra usada nos outros sistemas Nexvix).

## Esquema de dados (ponto de partida — validar e formalizar em `gemini.md`)

```
empresas
  id, nome, segmento_padrao, telefone, logo_url, bdi_padrao, created_at

usuarios  (gerenciado via Supabase Auth, com empresa_id vinculado)

orcamentos
  id, empresa_id (FK), cliente_nome, cliente_contato,
  obra_endereco, prazo_execucao, validade_dias,
  forma_pagamento, bdi, status (rascunho | enviado),
  created_at, updated_at

itens_orcamento
  id, orcamento_id (FK), descricao, categoria (material | mao_obra),
  unidade, quantidade, valor_unit

templates_itens  (global, seed data, somente leitura para o usuário)
  id, segmento, descricao, categoria, unidade, valor_unit_sugerido
```

## Fase 2 — L: Link

- Verificar credenciais Supabase e Vercel no `.env` antes de qualquer lógica.
- Handshake mínimo: confirmar que auth, insert e select com RLS funcionam antes de construir as telas completas.

## Fase 3 — A: Arquitetura

Stack: **Next.js + Supabase + Vercel** (mesmo padrão usado no Belini e no sistema da Poliform).

Páginas mínimas do MVP:
1. `/login` e `/cadastro` — autenticação do prestador
2. `/dashboard` — lista de orçamentos da empresa logada
3. `/orcamentos/novo` — construtor de orçamento (baseado no protótipo `orca-facil.jsx` anexado: seletor de segmento, itens de template, itens manuais, cálculo de BDI em tempo real)
4. `/orcamentos/[id]` — editar orçamento salvo
5. `/o/[id]` — página pública do orçamento (sem login, para o cliente final visualizar/imprimir)
6. `/configuracoes` — dados da empresa, logo, BDI padrão

Use o protótipo anexado como referência de UX e cálculo (subtotal material, subtotal mão de obra, BDI, total) — a lógica de cálculo já está validada, é só migrar para o modelo multi-tenant com persistência real.

## Fase 4 — E: Estilo

Manter a direção visual do protótipo (paleta blueprint/papel técnico, tipografia serifada + monoespaçada para números) — não trocar por template genérico de SaaS.

## Fase 5 — G: Gatilho

- Deploy no Vercel.
- Domínio/subdomínio a definir comigo antes do deploy final.

---

**Antes de codar:** me apresente o blueprint em `task_plan.md` (fases, checklist) para eu aprovar, e confirme o schema acima em `gemini.md`. Só depois disso avançamos para o `tools/`/implementação.
