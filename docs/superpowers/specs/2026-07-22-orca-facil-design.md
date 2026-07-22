# Orça Fácil — Design

## Visão

SaaS multi-tenant de geração de orçamentos para prestadores de serviço de construção civil (elétrica, hidráulica, pedreiro/construção, drywall, outros). Prestador se cadastra, monta orçamento profissional em minutos usando itens pré-carregados do próprio segmento, envia link público/PDF pro cliente final. Isolamento total de dados por empresa.

Cliente: Nexvix (projeto separado do Poliform e do Belini — repositório, banco Supabase e credenciais próprios, sem overlap).

## Stack

- Next.js 14 (App Router) + TypeScript
- Supabase (Postgres + Auth + RLS + Storage para logo) — client direto, sem ORM
- Tailwind CSS — paleta custom migrada do protótipo (`paper`, `ink`, `blueprint`, `brass`, `line`, `danger`)
- Deploy: Vercel
- Repo: GitHub privado, conta pessoal do usuário

## Schema de dados

```sql
empresas
  id, nome, segmento_padrao, telefone, logo_url, bdi_padrao, created_at

usuarios
  id (FK -> auth.users.id), empresa_id (FK -> empresas.id), nome, created_at

orcamentos
  id, empresa_id (FK), cliente_nome, cliente_contato,
  obra_endereco, prazo_execucao, validade_dias,
  forma_pagamento, bdi, status (rascunho | enviado),
  created_at, updated_at

itens_orcamento
  id, orcamento_id (FK), descricao, categoria (material | mao_obra),
  unidade, quantidade, valor_unit

itens_biblioteca_empresa
  id, empresa_id (FK), descricao, categoria (material | mao_obra),
  unidade, valor_unit_padrao, created_at
```

Decisão-chave: `itens_biblioteca_empresa` substitui a ideia original de tabela global `templates_itens`. Cada empresa tem sua própria biblioteca de itens, editável. As listas de itens por segmento do protótipo (`orca-facil.jsx`, objeto `SEGMENTS`) viram uma constante estática no código (`lib/segmentos-seed.ts`), usada só para pré-popular `itens_biblioteca_empresa` no cadastro ou troca de segmento — não é lida em runtime como tabela compartilhada.

Vínculo usuário → empresa: tabela ponte `usuarios` (não JWT metadata). Escolhido por simplicidade de RLS via join e por evitar dessincronia entre metadata do Auth e dado real.

### RLS

- Todas as tabelas (`empresas`, `usuarios`, `orcamentos`, `itens_orcamento`, `itens_biblioteca_empresa`) filtram por `empresa_id` pertencente ao usuário autenticado (via join com `usuarios`).
- Exceção: leitura anônima de um único `orcamento` (e seus `itens_orcamento`) pela rota pública `/o/[id]` — sem listagem, sem outros dados da empresa expostos além do necessário para exibir a proposta.

## Páginas (MVP)

1. `/login`, `/cadastro` — autenticação do prestador. Cadastro cria `empresas` + `usuarios` + popula `itens_biblioteca_empresa` a partir do seed do segmento escolhido.
2. `/dashboard` — lista de orçamentos da empresa logada.
3. `/orcamentos/novo` — builder: seletor de segmento, itens da biblioteca da empresa, itens manuais, cálculo de BDI em tempo real. Baseado no protótipo `orca-facil.jsx`.
4. `/orcamentos/[id]` — editar orçamento salvo.
5. `/o/[id]` — página pública do orçamento, sem login, visualização + impressão/PDF via navegador.
6. `/configuracoes` — dados da empresa, logo (Supabase Storage), BDI padrão, gerenciar biblioteca de itens.

## Estilo

Migrar do inline-style do protótipo para Tailwind, mantendo a direção visual (paleta blueprint/papel técnico, tipografia serifada para texto + monoespaçada para números). Paleta customizada no `tailwind.config`. Não usar template genérico de SaaS.

Responsivo básico: layout builder/preview (grid 2 colunas) empilha em telas pequenas (builder em cima, preview embaixo) — só pra evitar conteúdo espremido/ilegível no celular, sem redesenhar o fluxo. Mobile de verdade (wizard por etapas, PWA) fica fora de escopo do MVP — ver seção abaixo.

## Erros e integridade de dados

- Alteração de schema é sempre aditiva, nunca destrutiva — nenhum orçamento salvo pode ser perdido.
- Validação client-side mínima antes de salvar orçamento (cliente preenchido, ao menos 1 item).
- RLS é a última linha de defesa, não a única — validar também na camada de aplicação.

## Fora de escopo (MVP)

- Gateway de pagamento
- Integração WhatsApp
- Banco legado (não há migração)
- Domínio/subdomínio de produção — decidir antes do deploy final, não bloqueia desenvolvimento
- Mobile de verdade: wizard por etapas, PWA — fase seguinte, depois de validar o MVP

## Protocolo de handshake antes de construir telas completas

Confirmar que auth, insert e select com RLS funcionam (Supabase configurado, `.env` válido) antes de implementar UI completa.
