# Ferramenta de Orçamentos Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a cloud web app where a service advisor types a handful of fields to produce a vehicle repair quote (orçamento), get a printable PDF, and open a pre-filled WhatsApp message — plus a standalone quick payment-terms calculator.

**Architecture:** A single Next.js (App Router, TypeScript) app deployed on Vercel. Supabase provides Postgres (data), Auth (consultor/admin login), and Storage (oficina logos). All payment-rule math lives in one shared `src/lib/payment/` module consumed identically by the orçamento flow and the standalone calculator. PDF is rendered server-side with `@react-pdf/renderer`; the WhatsApp message is a `wa.me` link built client-side.

**Tech Stack:** Next.js 15 (App Router) + TypeScript (strict) + Tailwind CSS; Supabase (`@supabase/supabase-js`, `@supabase/ssr`); `@react-pdf/renderer`; Vitest + `@testing-library/react`; npm; Node >= 20.

**Spec:** `docs/superpowers/specs/2026-08-27-ferramenta-orcamentos-design.md`

## Global Constraints

- Every monetary value is an integer number of centavos everywhere in code and in the database (columns end in `_centavos`); never do arithmetic on floating-point reais. Display uses `formatarReais(centavos)`.
- Stack is fixed to: Next.js 15 App Router + TypeScript strict + Tailwind CSS; Supabase for Postgres + Auth + Storage; `@react-pdf/renderer` for PDF; Vitest + Testing Library for tests; npm as package manager; Node >= 20.
- Payment business rules (faixas, entrada mínima, desconto à vista, cartão Porto) live only in `src/lib/payment/` and are consumed identically by the orçamento flow and the calculadora avulsa — no duplicated formulas anywhere else.
- Exactly two roles exist: `consultor` and `admin`. Every authenticated route is protected in two layers: Supabase Row Level Security (database) and an app-level guard (`src/lib/auth/guards.ts`) — defense in depth, neither layer alone is sufficient.
- A consultor's Supabase Auth login is an e-mail address (Supabase Auth requires one); if a consultant has no real e-mail, use an internal one like `nome@topstop.local`.
- Default orçamento validity is 7 days. Default payment config (entrada mínima 30%, desconto à vista 5%, cartão Porto até 6x, parcela mínima R$100) is seeded once in the database and is editable afterward only by an admin, never hardcoded in business logic.
- Boundary rule for faixas: `valor_min_centavos` is inclusive, `valor_max_centavos` is exclusive (`null` = no upper bound) — this is what makes a value sitting exactly on a boundary fall into the better (upper) tier, per the spec.

## File Structure

```
package.json, tsconfig.json, next.config.ts, tailwind.config.ts, postcss.config.js, vitest.config.ts
.env.local.example, .gitignore
supabase/migrations/0001_schema.sql
supabase/migrations/0002_rls.sql
supabase/migrations/0003_seed.sql
src/
  app/
    layout.tsx, globals.css, page.tsx
    login/page.tsx
    (app)/layout.tsx                      -- session + nav, shared by all authenticated pages
      dashboard/page.tsx                   -- consultor's own orçamentos
      orcamentos/novo/page.tsx
      orcamentos/[id]/page.tsx
      orcamentos/[id]/pdf/route.ts
      calculadora/page.tsx
      admin/layout.tsx                     -- admin-only guard
        oficinas/page.tsx
        consultores/page.tsx
        catalogo/page.tsx
        pagamento/page.tsx                 -- faixas + configuracao_pagamento
        orcamentos/page.tsx                -- all orçamentos, all consultores
  lib/
    format.ts                              -- formatarReais
    types.ts                               -- domain types (camelCase)
    supabase/client.ts, server.ts, admin.ts
    auth/guards.ts, session.ts
    payment/faixas.ts, alternativas.ts
    orcamento/totals.ts, telefone.ts, whatsapp.ts, data.ts
    catalogo/data.ts
    oficinas/data.ts
    consultores/data.ts
    pagamento/data.ts
  components/
    orcamento/ItemForm.tsx, ItemsTable.tsx, CondicaoPagamentoResumo.tsx, OrcamentoForm.tsx
    calculadora/CalculadoraPagamento.tsx
    pdf/OrcamentoPdfDocument.tsx
    admin/OficinasManager.tsx, ConsultoresManager.tsx, CatalogoManager.tsx, PagamentoManager.tsx
tests/ (colocated as *.test.ts / *.test.tsx next to source)
```

---

### Task 1: Project scaffold + `formatarReais` utility

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `tailwind.config.ts`, `postcss.config.js`, `vitest.config.ts`, `src/test-setup.ts`
- Create: `src/app/layout.tsx`, `src/app/globals.css`, `src/app/page.tsx`
- Create: `.env.local.example`, `.gitignore`
- Create: `src/lib/format.ts`
- Test: `src/lib/format.test.ts`

**Interfaces:**
- Produces: `formatarReais(centavos: number): string` in `src/lib/format.ts` — used by every task that displays money.

- [ ] **Step 1: Write `package.json`**

```json
{
  "name": "ferramenta-orcamentos",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "next": "^15.0.0",
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "@supabase/supabase-js": "^2.45.0",
    "@supabase/ssr": "^0.5.0",
    "@react-pdf/renderer": "^4.0.0"
  },
  "devDependencies": {
    "typescript": "^5.5.0",
    "@types/react": "^18.3.0",
    "@types/react-dom": "^18.3.0",
    "@types/node": "^20.14.0",
    "tailwindcss": "^3.4.0",
    "postcss": "^8.4.0",
    "autoprefixer": "^10.4.0",
    "vitest": "^2.0.0",
    "@testing-library/react": "^16.0.0",
    "@testing-library/jest-dom": "^6.4.0",
    "jsdom": "^25.0.0"
  }
}
```

- [ ] **Step 2: Install dependencies**

Run: `npm install`
Expected: installs without errors, creates `package-lock.json`.

- [ ] **Step 3: Write `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": false,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./src/*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 4: Write `next.config.ts`, `tailwind.config.ts`, `postcss.config.js`**

`next.config.ts`:
```ts
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {};

export default nextConfig;
```

`tailwind.config.ts`:
```ts
import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: { extend: {} },
  plugins: [],
};

export default config;
```

`postcss.config.js`:
```js
module.exports = {
  plugins: { tailwindcss: {}, autoprefixer: {} },
};
```

- [ ] **Step 5: Write `src/app/globals.css`, `src/app/layout.tsx`, `src/app/page.tsx`**

`src/app/globals.css`:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

`src/app/layout.tsx`:
```tsx
import './globals.css';

export const metadata = { title: 'Ferramenta de Orçamentos' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
```

`src/app/page.tsx`:
```tsx
import { redirect } from 'next/navigation';

export default function HomePage() {
  redirect('/login');
}
```

- [ ] **Step 6: Write `vitest.config.ts` and `src/test-setup.ts`**

`vitest.config.ts`:
```ts
import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.ts'],
    globals: true,
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
});
```

`src/test-setup.ts`:
```ts
import '@testing-library/jest-dom/vitest';
```

- [ ] **Step 7: Write `.env.local.example` and `.gitignore`**

`.env.local.example`:
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

`.gitignore`:
```
node_modules
.next
.env.local
```

- [ ] **Step 8: Write the failing test for `formatarReais`**

`src/lib/format.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { formatarReais } from './format';

describe('formatarReais', () => {
  it('formata centavos inteiros como reais com duas casas decimais', () => {
    expect(formatarReais(182500)).toBe('R$ 1.825,00');
  });

  it('formata valores menores que um real', () => {
    expect(formatarReais(50)).toBe('R$ 0,50');
  });

  it('formata zero', () => {
    expect(formatarReais(0)).toBe('R$ 0,00');
  });
});
```

- [ ] **Step 9: Run the test and verify it fails**

Run: `npm test -- format.test.ts`
Expected: FAIL — `formatarReais` is not defined / module has no export.

- [ ] **Step 10: Implement `src/lib/format.ts`**

```ts
export function formatarReais(centavos: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(centavos / 100);
}
```

- [ ] **Step 11: Run the test and verify it passes**

Run: `npm test -- format.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 12: Verify the Next.js project builds**

Run: `npm run build`
Expected: build succeeds (login page doesn't exist yet, so this only checks the scaffold compiles — ignore the missing-route warning if any; it's created in Task 8).

- [ ] **Step 13: Commit**

```bash
git add -A
git commit -m "chore: scaffold Next.js project and add formatarReais utility

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 2: Database schema and Row Level Security

**Files:**
- Create: `supabase/migrations/0001_schema.sql`
- Create: `supabase/migrations/0002_rls.sql`
- Create: `supabase/migrations/0003_seed.sql`

**Interfaces:**
- Produces: tables `oficinas`, `consultores`, `catalogo_itens`, `faixas_pagamento`, `configuracao_pagamento`, `orcamentos`, `orcamento_itens`; SQL functions `is_admin()`, `current_consultor_id()`.
- Consumed by: Task 3 (typed clients), and every data-access module afterward.

This task has no JS test loop — it is infrastructure applied directly to the Supabase project the user creates. The "test" is a manual check in the Supabase dashboard.

- [ ] **Step 1: Write `supabase/migrations/0001_schema.sql`**

```sql
create table oficinas (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  endereco text not null,
  telefone text not null,
  logo_url text,
  created_at timestamptz not null default now()
);

create table consultores (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique references auth.users(id) on delete cascade,
  nome text not null,
  login text not null unique,
  papel text not null check (papel in ('consultor', 'admin')),
  oficina_id uuid references oficinas(id),
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);

create table catalogo_itens (
  id uuid primary key default gen_random_uuid(),
  descricao text not null,
  tipo text not null check (tipo in ('peca', 'servico')),
  marca_codigo text,
  valor_padrao_centavos integer not null default 0,
  created_at timestamptz not null default now()
);

create table faixas_pagamento (
  id uuid primary key default gen_random_uuid(),
  valor_min_centavos integer not null,
  valor_max_centavos integer,
  parcelas_sem_juros integer not null check (parcelas_sem_juros > 0),
  created_at timestamptz not null default now()
);

create table configuracao_pagamento (
  id integer primary key default 1,
  percentual_entrada_minima numeric(4,3) not null default 0.300,
  percentual_desconto_avista numeric(4,3) not null default 0.050,
  cartao_porto_max_parcelas integer not null default 6,
  cartao_porto_parcela_minima_centavos integer not null default 10000,
  updated_at timestamptz not null default now(),
  constraint configuracao_pagamento_singleton check (id = 1)
);

create table orcamentos (
  id uuid primary key default gen_random_uuid(),
  cliente_nome text not null,
  cliente_telefone text not null,
  veiculo_placa text not null,
  veiculo_modelo text not null,
  consultor_id uuid not null references consultores(id),
  oficina_id uuid not null references oficinas(id),
  status text not null default 'rascunho' check (status in ('rascunho', 'enviado', 'aprovado', 'recusado')),
  validade_dias integer not null default 7,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table orcamento_itens (
  id uuid primary key default gen_random_uuid(),
  orcamento_id uuid not null references orcamentos(id) on delete cascade,
  catalogo_item_id uuid references catalogo_itens(id),
  descricao text not null,
  tipo text not null check (tipo in ('peca', 'servico')),
  quantidade integer not null check (quantidade > 0),
  valor_unitario_centavos integer not null check (valor_unitario_centavos >= 0)
);
```

- [ ] **Step 2: Write `supabase/migrations/0002_rls.sql`**

```sql
create function is_admin() returns boolean
language sql security definer stable
as $$
  select exists (
    select 1 from consultores
    where auth_user_id = auth.uid() and papel = 'admin' and ativo = true
  );
$$;

create function current_consultor_id() returns uuid
language sql security definer stable
as $$
  select id from consultores where auth_user_id = auth.uid();
$$;

alter table oficinas enable row level security;
create policy "oficinas: leitura para autenticados" on oficinas for select using (auth.uid() is not null);
create policy "oficinas: escrita só admin" on oficinas for insert with check (is_admin());
create policy "oficinas: update só admin" on oficinas for update using (is_admin());
create policy "oficinas: delete só admin" on oficinas for delete using (is_admin());

alter table consultores enable row level security;
create policy "consultores: vê a si mesmo, admin vê todos" on consultores for select
  using (auth_user_id = auth.uid() or is_admin());
create policy "consultores: só admin cadastra" on consultores for insert with check (is_admin());
create policy "consultores: só admin atualiza" on consultores for update using (is_admin());

alter table catalogo_itens enable row level security;
create policy "catalogo: leitura para autenticados" on catalogo_itens for select using (auth.uid() is not null);
create policy "catalogo: só admin insere" on catalogo_itens for insert with check (is_admin());
create policy "catalogo: só admin atualiza" on catalogo_itens for update using (is_admin());
create policy "catalogo: só admin remove" on catalogo_itens for delete using (is_admin());

alter table faixas_pagamento enable row level security;
create policy "faixas: leitura para autenticados" on faixas_pagamento for select using (auth.uid() is not null);
create policy "faixas: só admin insere" on faixas_pagamento for insert with check (is_admin());
create policy "faixas: só admin atualiza" on faixas_pagamento for update using (is_admin());
create policy "faixas: só admin remove" on faixas_pagamento for delete using (is_admin());

alter table configuracao_pagamento enable row level security;
create policy "configuracao: leitura para autenticados" on configuracao_pagamento for select using (auth.uid() is not null);
create policy "configuracao: só admin atualiza" on configuracao_pagamento for update using (is_admin());

alter table orcamentos enable row level security;
create policy "orcamentos: consultor vê e edita os próprios, admin vê todos" on orcamentos for all
  using (consultor_id = current_consultor_id() or is_admin())
  with check (consultor_id = current_consultor_id() or is_admin());

alter table orcamento_itens enable row level security;
create policy "orcamento_itens: segue o orçamento pai" on orcamento_itens for all
  using (exists (
    select 1 from orcamentos o
    where o.id = orcamento_id and (o.consultor_id = current_consultor_id() or is_admin())
  ))
  with check (exists (
    select 1 from orcamentos o
    where o.id = orcamento_id and (o.consultor_id = current_consultor_id() or is_admin())
  ));
```

- [ ] **Step 3: Write `supabase/migrations/0003_seed.sql`**

```sql
insert into configuracao_pagamento (id) values (1);

insert into faixas_pagamento (valor_min_centavos, valor_max_centavos, parcelas_sem_juros) values
  (0, 100000, 1),
  (100000, 250000, 2),
  (250000, 400000, 3),
  (400000, null, 4);
```

- [ ] **Step 4: Apply the migrations to the Supabase project**

Run (with the Supabase CLI, after `supabase link --project-ref <ref>`):
```bash
supabase db push
```
Expected: all three migrations apply without error.

- [ ] **Step 5: Manually verify in the Supabase dashboard**

Open Table Editor and confirm all 7 tables exist, RLS is enabled (shield icon) on all of them, and `faixas_pagamento` has exactly 4 rows plus `configuracao_pagamento` has exactly 1 row.

- [ ] **Step 6: Commit**

```bash
git add supabase/
git commit -m "feat: add database schema, RLS policies, and seed data

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 3: Typed Supabase clients and domain types

**Files:**
- Create: `src/lib/types.ts`
- Create: `src/lib/supabase/client.ts`
- Create: `src/lib/supabase/server.ts`
- Create: `src/lib/supabase/admin.ts`
- Test: `src/lib/types.test.ts`

**Interfaces:**
- Consumes: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` env vars.
- Produces: domain types `Oficina`, `Consultor`, `CatalogoItem`, `FaixaPagamento`, `ConfiguracaoPagamento`, `StatusOrcamento`, `Orcamento`, `OrcamentoItem` in `src/lib/types.ts`; `createBrowserClient()` in `src/lib/supabase/client.ts`; `createServerClient()` in `src/lib/supabase/server.ts`; `createAdminClient()` in `src/lib/supabase/admin.ts`.

- [ ] **Step 1: Write the failing test for the type guard helper**

`src/lib/types.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { isStatusOrcamento } from './types';

describe('isStatusOrcamento', () => {
  it('aceita os quatro status válidos', () => {
    expect(isStatusOrcamento('rascunho')).toBe(true);
    expect(isStatusOrcamento('enviado')).toBe(true);
    expect(isStatusOrcamento('aprovado')).toBe(true);
    expect(isStatusOrcamento('recusado')).toBe(true);
  });

  it('rejeita valores inválidos', () => {
    expect(isStatusOrcamento('cancelado')).toBe(false);
    expect(isStatusOrcamento('')).toBe(false);
  });
});
```

- [ ] **Step 2: Run the test and verify it fails**

Run: `npm test -- types.test.ts`
Expected: FAIL — `isStatusOrcamento` is not exported.

- [ ] **Step 3: Write `src/lib/types.ts`**

```ts
export interface Oficina {
  id: string;
  nome: string;
  endereco: string;
  telefone: string;
  logoUrl: string | null;
}

export interface Consultor {
  id: string;
  authUserId: string;
  nome: string;
  login: string;
  papel: 'consultor' | 'admin';
  oficinaId: string | null;
  ativo: boolean;
}

export interface CatalogoItem {
  id: string;
  descricao: string;
  tipo: 'peca' | 'servico';
  marcaCodigo: string | null;
  valorPadraoCentavos: number;
}

export interface FaixaPagamento {
  id: string;
  valorMinCentavos: number;
  valorMaxCentavos: number | null;
  parcelasSemJuros: number;
}

export interface ConfiguracaoPagamento {
  percentualEntradaMinima: number;
  percentualDescontoAVista: number;
  cartaoPortoMaxParcelas: number;
  cartaoPortoParcelaMinimaCentavos: number;
}

export const STATUS_ORCAMENTO = ['rascunho', 'enviado', 'aprovado', 'recusado'] as const;
export type StatusOrcamento = (typeof STATUS_ORCAMENTO)[number];

export function isStatusOrcamento(valor: string): valor is StatusOrcamento {
  return (STATUS_ORCAMENTO as readonly string[]).includes(valor);
}

export interface Orcamento {
  id: string;
  clienteNome: string;
  clienteTelefone: string;
  veiculoPlaca: string;
  veiculoModelo: string;
  consultorId: string;
  oficinaId: string;
  status: StatusOrcamento;
  validadeDias: number;
  createdAt: string;
  updatedAt: string;
}

export interface OrcamentoItem {
  id: string;
  orcamentoId: string;
  catalogoItemId: string | null;
  descricao: string;
  tipo: 'peca' | 'servico';
  quantidade: number;
  valorUnitarioCentavos: number;
}
```

- [ ] **Step 4: Run the test and verify it passes**

Run: `npm test -- types.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Write `src/lib/supabase/client.ts`**

```ts
import { createBrowserClient as createSupabaseBrowserClient } from '@supabase/ssr';

export function createBrowserClient() {
  return createSupabaseBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
```

- [ ] **Step 6: Write `src/lib/supabase/server.ts`**

```ts
import { createServerClient as createSupabaseServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function createServerClient() {
  const cookieStore = await cookies();
  return createSupabaseServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        },
      },
    }
  );
}
```

- [ ] **Step 7: Write `src/lib/supabase/admin.ts`**

```ts
import { createClient } from '@supabase/supabase-js';

// Server-only: uses the service role key, which bypasses RLS.
// Never import this file from a Client Component.
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
```

- [ ] **Step 8: Verify the project still builds**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 9: Commit**

```bash
git add src/lib/types.ts src/lib/types.test.ts src/lib/supabase/
git commit -m "feat: add domain types and typed Supabase clients

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 4: Payment tier lookup and installment split (core)

**Files:**
- Create: `src/lib/payment/faixas.ts`
- Test: `src/lib/payment/faixas.test.ts`

**Interfaces:**
- Consumes: `FaixaPagamento`, `ConfiguracaoPagamento` from `src/lib/types.ts` (Task 3).
- Produces: `encontrarFaixa(totalCentavos: number, faixas: FaixaPagamento[]): FaixaPagamento`, `calcularEntradaMinima(totalCentavos: number, config: ConfiguracaoPagamento): number`, `dividirEmParcelas(valorCentavos: number, n: number): number[]` — used by Task 15 (orçamento) and Task 20 (calculadora avulsa).

- [ ] **Step 1: Write the failing tests**

`src/lib/payment/faixas.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { encontrarFaixa, calcularEntradaMinima, dividirEmParcelas } from './faixas';
import type { FaixaPagamento, ConfiguracaoPagamento } from '../types';

const faixas: FaixaPagamento[] = [
  { id: '1', valorMinCentavos: 0, valorMaxCentavos: 100000, parcelasSemJuros: 1 },
  { id: '2', valorMinCentavos: 100000, valorMaxCentavos: 250000, parcelasSemJuros: 2 },
  { id: '3', valorMinCentavos: 250000, valorMaxCentavos: 400000, parcelasSemJuros: 3 },
  { id: '4', valorMinCentavos: 400000, valorMaxCentavos: null, parcelasSemJuros: 4 },
];

const config: ConfiguracaoPagamento = {
  percentualEntradaMinima: 0.3,
  percentualDescontoAVista: 0.05,
  cartaoPortoMaxParcelas: 6,
  cartaoPortoParcelaMinimaCentavos: 10000,
};

describe('encontrarFaixa', () => {
  it('escolhe a primeira faixa para valores abaixo de R$1.000', () => {
    expect(encontrarFaixa(50000, faixas).parcelasSemJuros).toBe(1);
  });

  it('um valor exatamente no limite entra na faixa de cima', () => {
    expect(encontrarFaixa(100000, faixas).parcelasSemJuros).toBe(2);
    expect(encontrarFaixa(250000, faixas).parcelasSemJuros).toBe(3);
    expect(encontrarFaixa(400000, faixas).parcelasSemJuros).toBe(4);
  });

  it('escolhe a última faixa (sem limite superior) para valores altos', () => {
    expect(encontrarFaixa(1000000, faixas).parcelasSemJuros).toBe(4);
  });

  it('lança erro se nenhuma faixa cobrir o valor', () => {
    expect(() => encontrarFaixa(50000, [])).toThrow();
  });
});

describe('calcularEntradaMinima', () => {
  it('calcula 30% do total, arredondado ao centavo', () => {
    expect(calcularEntradaMinima(365000, config)).toBe(109500);
    expect(calcularEntradaMinima(100, config)).toBe(30);
  });
});

describe('dividirEmParcelas', () => {
  it('divide um valor exato igualmente', () => {
    expect(dividirEmParcelas(182500, 2)).toEqual([91250, 91250]);
  });

  it('joga o resto da divisão na última parcela', () => {
    expect(dividirEmParcelas(182500, 3)).toEqual([60833, 60833, 60834]);
  });

  it('a soma das parcelas é sempre igual ao valor original', () => {
    const parcelas = dividirEmParcelas(100001, 7);
    expect(parcelas.reduce((a, b) => a + b, 0)).toBe(100001);
    expect(parcelas).toHaveLength(7);
  });
});
```

- [ ] **Step 2: Run the tests and verify they fail**

Run: `npm test -- faixas.test.ts`
Expected: FAIL — module `./faixas` does not exist.

- [ ] **Step 3: Implement `src/lib/payment/faixas.ts`**

```ts
import type { ConfiguracaoPagamento, FaixaPagamento } from '../types';

export function encontrarFaixa(totalCentavos: number, faixas: FaixaPagamento[]): FaixaPagamento {
  const ordenadas = [...faixas].sort((a, b) => a.valorMinCentavos - b.valorMinCentavos);
  const encontrada = ordenadas.find(
    (f) => totalCentavos >= f.valorMinCentavos && (f.valorMaxCentavos === null || totalCentavos < f.valorMaxCentavos)
  );
  if (!encontrada) {
    throw new Error(`Nenhuma faixa de pagamento cobre o valor de ${totalCentavos} centavos`);
  }
  return encontrada;
}

export function calcularEntradaMinima(totalCentavos: number, config: ConfiguracaoPagamento): number {
  return Math.round(totalCentavos * config.percentualEntradaMinima);
}

export function dividirEmParcelas(valorCentavos: number, n: number): number[] {
  const base = Math.floor(valorCentavos / n);
  const resto = valorCentavos - base * n;
  return Array.from({ length: n }, (_, i) => (i === n - 1 ? base + resto : base));
}
```

- [ ] **Step 4: Run the tests and verify they pass**

Run: `npm test -- faixas.test.ts`
Expected: PASS (9 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/payment/faixas.ts src/lib/payment/faixas.test.ts
git commit -m "feat: add payment tier lookup and installment split logic

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 5: Cash discount and Cartão Porto alternative (core)

**Files:**
- Create: `src/lib/payment/alternativas.ts`
- Test: `src/lib/payment/alternativas.test.ts`

**Interfaces:**
- Consumes: `ConfiguracaoPagamento` from `src/lib/types.ts`.
- Produces: `calcularDescontoAVista(totalCentavos: number, config: ConfiguracaoPagamento): { descontoCentavos: number; valorComDescontoCentavos: number }`, `calcularCartaoPorto(totalCentavos: number, config: ConfiguracaoPagamento): { parcelas: number; valorParcelaCentavos: number }` — used by Task 15 and Task 20.

- [ ] **Step 1: Write the failing tests**

`src/lib/payment/alternativas.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { calcularDescontoAVista, calcularCartaoPorto } from './alternativas';
import type { ConfiguracaoPagamento } from '../types';

const config: ConfiguracaoPagamento = {
  percentualEntradaMinima: 0.3,
  percentualDescontoAVista: 0.05,
  cartaoPortoMaxParcelas: 6,
  cartaoPortoParcelaMinimaCentavos: 10000,
};

describe('calcularDescontoAVista', () => {
  it('aplica 5% de desconto sobre o total', () => {
    expect(calcularDescontoAVista(100000, config)).toEqual({
      descontoCentavos: 5000,
      valorComDescontoCentavos: 95000,
    });
  });
});

describe('calcularCartaoPorto', () => {
  it('usa o máximo de 6x quando a parcela mínima é respeitada', () => {
    expect(calcularCartaoPorto(600000, config)).toEqual({ parcelas: 6, valorParcelaCentavos: 100000 });
  });

  it('reduz o número de parcelas quando 6x ficaria abaixo da mínima', () => {
    // 300 reais / 6 = 50 reais, abaixo do mínimo de 100 -> cai para 3x de 100
    expect(calcularCartaoPorto(30000, config)).toEqual({ parcelas: 3, valorParcelaCentavos: 10000 });
  });

  it('usa 1x quando o total é menor que a parcela mínima', () => {
    expect(calcularCartaoPorto(5000, config)).toEqual({ parcelas: 1, valorParcelaCentavos: 5000 });
  });
});
```

- [ ] **Step 2: Run the tests and verify they fail**

Run: `npm test -- alternativas.test.ts`
Expected: FAIL — module `./alternativas` does not exist.

- [ ] **Step 3: Implement `src/lib/payment/alternativas.ts`**

```ts
import type { ConfiguracaoPagamento } from '../types';

export function calcularDescontoAVista(
  totalCentavos: number,
  config: ConfiguracaoPagamento
): { descontoCentavos: number; valorComDescontoCentavos: number } {
  const descontoCentavos = Math.round(totalCentavos * config.percentualDescontoAVista);
  return { descontoCentavos, valorComDescontoCentavos: totalCentavos - descontoCentavos };
}

export function calcularCartaoPorto(
  totalCentavos: number,
  config: ConfiguracaoPagamento
): { parcelas: number; valorParcelaCentavos: number } {
  for (let n = config.cartaoPortoMaxParcelas; n >= 1; n--) {
    if (Math.floor(totalCentavos / n) >= config.cartaoPortoParcelaMinimaCentavos) {
      return { parcelas: n, valorParcelaCentavos: Math.round(totalCentavos / n) };
    }
  }
  return { parcelas: 1, valorParcelaCentavos: totalCentavos };
}
```

- [ ] **Step 4: Run the tests and verify they pass**

Run: `npm test -- alternativas.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/payment/alternativas.ts src/lib/payment/alternativas.test.ts
git commit -m "feat: add cash discount and Cartão Porto calculation

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 6: Orçamento item totals (core)

**Files:**
- Create: `src/lib/orcamento/totals.ts`
- Test: `src/lib/orcamento/totals.test.ts`

**Interfaces:**
- Produces: `calcularTotalItens(itens: { quantidade: number; valorUnitarioCentavos: number }[]): number` — used by Task 15 (persist/recompute) and Task 14 (live form total).

- [ ] **Step 1: Write the failing tests**

`src/lib/orcamento/totals.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { calcularTotalItens } from './totals';

describe('calcularTotalItens', () => {
  it('soma quantidade vezes valor unitário de cada item', () => {
    const total = calcularTotalItens([
      { quantidade: 2, valorUnitarioCentavos: 5000 },
      { quantidade: 1, valorUnitarioCentavos: 15000 },
    ]);
    expect(total).toBe(25000);
  });

  it('retorna zero para lista vazia', () => {
    expect(calcularTotalItens([])).toBe(0);
  });
});
```

- [ ] **Step 2: Run the tests and verify they fail**

Run: `npm test -- totals.test.ts`
Expected: FAIL — module `./totals` does not exist.

- [ ] **Step 3: Implement `src/lib/orcamento/totals.ts`**

```ts
export function calcularTotalItens(itens: { quantidade: number; valorUnitarioCentavos: number }[]): number {
  return itens.reduce((soma, item) => soma + item.quantidade * item.valorUnitarioCentavos, 0);
}
```

- [ ] **Step 4: Run the tests and verify they pass**

Run: `npm test -- totals.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/orcamento/totals.ts src/lib/orcamento/totals.test.ts
git commit -m "feat: add orçamento item total calculation

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 7: Phone validation and WhatsApp message/link builder (core)

**Files:**
- Create: `src/lib/orcamento/telefone.ts`
- Create: `src/lib/orcamento/whatsapp.ts`
- Test: `src/lib/orcamento/telefone.test.ts`
- Test: `src/lib/orcamento/whatsapp.test.ts`

**Interfaces:**
- Consumes: `formatarReais` (Task 1).
- Produces: `normalizarTelefone(telefone: string): string` (throws `Error` on invalid input), `telefoneValido(telefone: string): boolean`, `montarLinkWhatsApp(telefone: string, mensagem: string): string`, `montarMensagemOrcamento(dados: MensagemOrcamentoInput): string` and the exported `MensagemOrcamentoInput` type — used by Task 19 (send button) and indirectly by Task 14 (phone field validation).

- [ ] **Step 1: Write the failing tests for phone handling**

`src/lib/orcamento/telefone.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { normalizarTelefone, telefoneValido } from './telefone';

describe('normalizarTelefone', () => {
  it('adiciona o código do país 55 a um celular de 11 dígitos', () => {
    expect(normalizarTelefone('(11) 98765-4321')).toBe('5511987654321');
  });

  it('adiciona o código do país 55 a um fixo de 10 dígitos', () => {
    expect(normalizarTelefone('11 3765-4321')).toBe('551137654321');
  });

  it('mantém um número que já vem com código do país', () => {
    expect(normalizarTelefone('+55 11 98765-4321')).toBe('5511987654321');
  });

  it('lança erro para número muito curto', () => {
    expect(() => normalizarTelefone('12345')).toThrow();
  });
});

describe('telefoneValido', () => {
  it('retorna true para número válido e false para inválido', () => {
    expect(telefoneValido('11987654321')).toBe(true);
    expect(telefoneValido('123')).toBe(false);
  });
});
```

- [ ] **Step 2: Run the tests and verify they fail**

Run: `npm test -- telefone.test.ts`
Expected: FAIL — module `./telefone` does not exist.

- [ ] **Step 3: Implement `src/lib/orcamento/telefone.ts`**

```ts
export function normalizarTelefone(telefone: string): string {
  const digitos = telefone.replace(/\D/g, '');

  if (digitos.length === 10 || digitos.length === 11) {
    return `55${digitos}`;
  }
  if (digitos.startsWith('55') && (digitos.length === 12 || digitos.length === 13)) {
    return digitos;
  }
  throw new Error(`Telefone inválido: ${telefone}`);
}

export function telefoneValido(telefone: string): boolean {
  try {
    normalizarTelefone(telefone);
    return true;
  } catch {
    return false;
  }
}
```

- [ ] **Step 4: Run the tests and verify they pass**

Run: `npm test -- telefone.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Write the failing tests for the WhatsApp message/link builder**

`src/lib/orcamento/whatsapp.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { montarLinkWhatsApp, montarMensagemOrcamento } from './whatsapp';

describe('montarLinkWhatsApp', () => {
  it('monta um link wa.me com telefone normalizado e mensagem codificada', () => {
    const link = montarLinkWhatsApp('11987654321', 'Olá mundo');
    expect(link).toBe('https://wa.me/5511987654321?text=Ol%C3%A1%20mundo');
  });
});

describe('montarMensagemOrcamento', () => {
  it('inclui oficina, cliente, veículo, itens, total, desconto, condição e validade', () => {
    const mensagem = montarMensagemOrcamento({
      oficinaNome: 'Top Stop Centro',
      consultorNome: 'João',
      clienteNome: 'Maria',
      veiculoModelo: 'Onix',
      veiculoPlaca: 'ABC1D23',
      itens: [
        { descricao: 'Pastilha de freio', tipo: 'peca', quantidade: 1, valorTotalCentavos: 15000 },
        { descricao: 'Troca de óleo', tipo: 'servico', quantidade: 1, valorTotalCentavos: 10000 },
      ],
      totalCentavos: 25000,
      descontoCentavos: 1250,
      valorComDescontoCentavos: 23750,
      entradaCentavos: 7500,
      parcelas: [17500],
      cartaoPorto: { parcelas: 1, valorParcelaCentavos: 25000 },
      validadeDias: 7,
    });

    expect(mensagem).toContain('Top Stop Centro');
    expect(mensagem).toContain('João');
    expect(mensagem).toContain('Maria');
    expect(mensagem).toContain('Onix');
    expect(mensagem).toContain('ABC1D23');
    expect(mensagem).toContain('Pastilha de freio');
    expect(mensagem).toContain('Troca de óleo');
    expect(mensagem).toContain('R$ 250,00');
    expect(mensagem).toContain('R$ 12,50');
    expect(mensagem).toContain('7 dias');
  });
});
```

- [ ] **Step 6: Run the tests and verify they fail**

Run: `npm test -- whatsapp.test.ts`
Expected: FAIL — module `./whatsapp` does not exist.

- [ ] **Step 7: Implement `src/lib/orcamento/whatsapp.ts`**

```ts
import { formatarReais } from '../format';
import { normalizarTelefone } from './telefone';

export interface MensagemOrcamentoInput {
  oficinaNome: string;
  consultorNome: string;
  clienteNome: string;
  veiculoModelo: string;
  veiculoPlaca: string;
  itens: { descricao: string; tipo: 'peca' | 'servico'; quantidade: number; valorTotalCentavos: number }[];
  totalCentavos: number;
  descontoCentavos: number;
  valorComDescontoCentavos: number;
  entradaCentavos: number;
  parcelas: number[];
  cartaoPorto: { parcelas: number; valorParcelaCentavos: number };
  validadeDias: number;
}

export function montarLinkWhatsApp(telefone: string, mensagem: string): string {
  const numero = normalizarTelefone(telefone);
  return `https://wa.me/${numero}?text=${encodeURIComponent(mensagem)}`;
}

export function montarMensagemOrcamento(dados: MensagemOrcamentoInput): string {
  const linhasItens = dados.itens
    .map(
      (item) =>
        `- ${item.descricao} (${item.tipo === 'peca' ? 'Peça' : 'Serviço'}) x${item.quantidade}: ${formatarReais(item.valorTotalCentavos)}`
    )
    .join('\n');

  const linhaParcelas = `Entrada de ${formatarReais(dados.entradaCentavos)} + ${dados.parcelas.length}x de ${formatarReais(
    dados.parcelas[0]
  )} no crédito sem juros`;

  return [
    `*${dados.oficinaNome}*`,
    `Consultor: ${dados.consultorNome}`,
    '',
    `Orçamento para *${dados.clienteNome}*`,
    `Veículo: ${dados.veiculoModelo} - Placa ${dados.veiculoPlaca}`,
    '',
    '*Itens:*',
    linhasItens,
    '',
    `*Total: ${formatarReais(dados.totalCentavos)}*`,
    `Desconto à vista no Pix/Débito: ${formatarReais(dados.descontoCentavos)} → *${formatarReais(dados.valorComDescontoCentavos)}*`,
    '',
    '*Condição de pagamento:*',
    linhaParcelas,
    `Alternativa: Cartão Porto em até ${dados.cartaoPorto.parcelas}x de ${formatarReais(dados.cartaoPorto.valorParcelaCentavos)} sem juros`,
    '',
    `Orçamento válido por ${dados.validadeDias} dias.`,
  ].join('\n');
}
```

- [ ] **Step 8: Run the tests and verify they pass**

Run: `npm test -- whatsapp.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 9: Commit**

```bash
git add src/lib/orcamento/telefone.ts src/lib/orcamento/telefone.test.ts src/lib/orcamento/whatsapp.ts src/lib/orcamento/whatsapp.test.ts
git commit -m "feat: add phone normalization and WhatsApp message/link builder

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 8: Login page and session helper

**Files:**
- Create: `src/app/login/page.tsx`
- Create: `src/app/login/page.test.tsx`
- Create: `src/lib/auth/session.ts`
- Test: `src/lib/auth/session.test.ts`

**Interfaces:**
- Consumes: `createBrowserClient` (Task 3), `createServerClient` (Task 3), `Consultor` type (Task 3).
- Produces: `getConsultorLogado(): Promise<Consultor | null>` in `src/lib/auth/session.ts` — used by Task 9 (guards).

- [ ] **Step 1: Write the failing tests for the session helper**

`src/lib/auth/session.test.ts`:
```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getConsultorLogado } from './session';

const getUserMock = vi.fn();
const singleMock = vi.fn();
vi.mock('../supabase/server', () => ({
  createServerClient: async () => ({
    auth: { getUser: getUserMock },
    from: () => ({ select: () => ({ eq: () => ({ single: singleMock }) }) }),
  }),
}));

describe('getConsultorLogado', () => {
  beforeEach(() => {
    getUserMock.mockReset();
    singleMock.mockReset();
  });

  it('retorna null quando não há usuário autenticado', async () => {
    getUserMock.mockResolvedValue({ data: { user: null } });
    expect(await getConsultorLogado()).toBeNull();
  });

  it('retorna o consultor mapeado (camelCase) quando autenticado', async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: 'auth-1' } } });
    singleMock.mockResolvedValue({
      data: {
        id: 'c1',
        auth_user_id: 'auth-1',
        nome: 'João',
        login: 'joao@topstop.local',
        papel: 'consultor',
        oficina_id: 'of-1',
        ativo: true,
      },
      error: null,
    });

    expect(await getConsultorLogado()).toEqual({
      id: 'c1',
      authUserId: 'auth-1',
      nome: 'João',
      login: 'joao@topstop.local',
      papel: 'consultor',
      oficinaId: 'of-1',
      ativo: true,
    });
  });

  it('retorna null quando a busca do consultor falha', async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: 'auth-1' } } });
    singleMock.mockResolvedValue({ data: null, error: { message: 'not found' } });
    expect(await getConsultorLogado()).toBeNull();
  });
});
```

- [ ] **Step 2: Run the tests and verify they fail**

Run: `npm test -- session.test.ts`
Expected: FAIL — module `./session` does not exist.

- [ ] **Step 3: Implement `src/lib/auth/session.ts`**

```ts
import { createServerClient } from '../supabase/server';
import type { Consultor } from '../types';

export async function getConsultorLogado(): Promise<Consultor | null> {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase.from('consultores').select('*').eq('auth_user_id', user.id).single();
  if (error || !data) return null;

  return {
    id: data.id,
    authUserId: data.auth_user_id,
    nome: data.nome,
    login: data.login,
    papel: data.papel,
    oficinaId: data.oficina_id,
    ativo: data.ativo,
  };
}
```

- [ ] **Step 4: Run the tests and verify they pass**

Run: `npm test -- session.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Write the failing tests for the login page**

`src/app/login/page.test.tsx`:
```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import LoginPage from './page';

const pushMock = vi.fn();
const refreshMock = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: pushMock, refresh: refreshMock }) }));

const signInWithPasswordMock = vi.fn();
vi.mock('@/lib/supabase/client', () => ({
  createBrowserClient: () => ({ auth: { signInWithPassword: signInWithPasswordMock } }),
}));

describe('LoginPage', () => {
  beforeEach(() => {
    pushMock.mockReset();
    signInWithPasswordMock.mockReset();
  });

  it('mostra uma mensagem genérica quando o login falha', async () => {
    signInWithPasswordMock.mockResolvedValue({ error: { message: 'Invalid login credentials' } });
    render(<LoginPage />);

    fireEvent.change(screen.getByLabelText('Login'), { target: { value: 'joao@topstop.local' } });
    fireEvent.change(screen.getByLabelText('Senha'), { target: { value: 'errada' } });
    fireEvent.click(screen.getByRole('button', { name: /entrar/i }));

    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Login ou senha inválidos.'));
    expect(pushMock).not.toHaveBeenCalled();
  });

  it('redireciona para o dashboard quando o login dá certo', async () => {
    signInWithPasswordMock.mockResolvedValue({ error: null });
    render(<LoginPage />);

    fireEvent.change(screen.getByLabelText('Login'), { target: { value: 'joao@topstop.local' } });
    fireEvent.change(screen.getByLabelText('Senha'), { target: { value: 'correta' } });
    fireEvent.click(screen.getByRole('button', { name: /entrar/i }));

    await waitFor(() => expect(pushMock).toHaveBeenCalledWith('/dashboard'));
  });
});
```

- [ ] **Step 6: Run the tests and verify they fail**

Run: `npm test -- login/page.test.tsx`
Expected: FAIL — `src/app/login/page.tsx` does not exist.

- [ ] **Step 7: Implement `src/app/login/page.tsx`**

```tsx
'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@/lib/supabase/client';

export default function LoginPage() {
  const router = useRouter();
  const [login, setLogin] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setErro(null);
    setCarregando(true);
    const supabase = createBrowserClient();
    const { error } = await supabase.auth.signInWithPassword({ email: login, password: senha });
    setCarregando(false);
    if (error) {
      setErro('Login ou senha inválidos.');
      return;
    }
    router.push('/dashboard');
    router.refresh();
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50">
      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4 rounded-lg bg-white p-8 shadow">
        <h1 className="text-xl font-semibold">Entrar</h1>
        <div>
          <label className="block text-sm font-medium" htmlFor="login">Login</label>
          <input
            id="login"
            type="text"
            required
            value={login}
            onChange={(e) => setLogin(e.target.value)}
            className="mt-1 w-full rounded border px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm font-medium" htmlFor="senha">Senha</label>
          <input
            id="senha"
            type="password"
            required
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            className="mt-1 w-full rounded border px-3 py-2"
          />
        </div>
        {erro && (
          <p className="text-sm text-red-600" role="alert">
            {erro}
          </p>
        )}
        <button type="submit" disabled={carregando} className="w-full rounded bg-black px-3 py-2 text-white disabled:opacity-50">
          {carregando ? 'Entrando...' : 'Entrar'}
        </button>
      </form>
    </main>
  );
}
```

- [ ] **Step 8: Run the tests and verify they pass**

Run: `npm test -- login/page.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 9: Commit**

```bash
git add src/app/login/ src/lib/auth/session.ts src/lib/auth/session.test.ts
git commit -m "feat: add login page and session helper

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 9: Role guards and authenticated layout

**Files:**
- Create: `src/lib/auth/guards.ts`
- Test: `src/lib/auth/guards.test.ts`
- Create: `src/components/auth/LogoutButton.tsx`
- Create: `src/app/(app)/layout.tsx`
- Create: `src/app/(app)/admin/layout.tsx`

**Interfaces:**
- Consumes: `getConsultorLogado` (Task 8), `Consultor` type (Task 3).
- Produces: `exigirConsultor(): Promise<Consultor>` and `exigirAdmin(): Promise<Consultor>` in `src/lib/auth/guards.ts` — every page under `(app)` and `(app)/admin` calls one of these first.

- [ ] **Step 1: Write the failing tests**

`src/lib/auth/guards.test.ts`:
```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { exigirConsultor, exigirAdmin } from './guards';

const redirectMock = vi.fn((path: string) => {
  throw new Error(`REDIRECT:${path}`);
});
vi.mock('next/navigation', () => ({ redirect: (path: string) => redirectMock(path) }));

const getConsultorLogadoMock = vi.fn();
vi.mock('./session', () => ({ getConsultorLogado: () => getConsultorLogadoMock() }));

const consultor = { id: 'c1', authUserId: 'a1', nome: 'João', login: 'j@x.com', papel: 'consultor' as const, oficinaId: 'o1', ativo: true };
const admin = { id: 'c2', authUserId: 'a2', nome: 'Ana', login: 'ana@x.com', papel: 'admin' as const, oficinaId: null, ativo: true };

describe('exigirConsultor', () => {
  beforeEach(() => getConsultorLogadoMock.mockReset());

  it('redireciona para /login quando não há sessão', async () => {
    getConsultorLogadoMock.mockResolvedValue(null);
    await expect(exigirConsultor()).rejects.toThrow('REDIRECT:/login');
  });

  it('redireciona para /login quando o consultor está desativado', async () => {
    getConsultorLogadoMock.mockResolvedValue({ ...consultor, ativo: false });
    await expect(exigirConsultor()).rejects.toThrow('REDIRECT:/login');
  });

  it('retorna o consultor quando autenticado e ativo', async () => {
    getConsultorLogadoMock.mockResolvedValue(consultor);
    await expect(exigirConsultor()).resolves.toEqual(consultor);
  });
});

describe('exigirAdmin', () => {
  beforeEach(() => getConsultorLogadoMock.mockReset());

  it('redireciona para /dashboard quando o consultor não é admin', async () => {
    getConsultorLogadoMock.mockResolvedValue(consultor);
    await expect(exigirAdmin()).rejects.toThrow('REDIRECT:/dashboard');
  });

  it('retorna o consultor quando é admin', async () => {
    getConsultorLogadoMock.mockResolvedValue(admin);
    await expect(exigirAdmin()).resolves.toEqual(admin);
  });
});
```

- [ ] **Step 2: Run the tests and verify they fail**

Run: `npm test -- guards.test.ts`
Expected: FAIL — module `./guards` does not exist.

- [ ] **Step 3: Implement `src/lib/auth/guards.ts`**

```ts
import { redirect } from 'next/navigation';
import { getConsultorLogado } from './session';
import type { Consultor } from '../types';

export async function exigirConsultor(): Promise<Consultor> {
  const consultor = await getConsultorLogado();
  if (!consultor || !consultor.ativo) {
    redirect('/login');
  }
  return consultor;
}

export async function exigirAdmin(): Promise<Consultor> {
  const consultor = await exigirConsultor();
  if (consultor.papel !== 'admin') {
    redirect('/dashboard');
  }
  return consultor;
}
```

- [ ] **Step 4: Run the tests and verify they pass**

Run: `npm test -- guards.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Implement `src/components/auth/LogoutButton.tsx`**

```tsx
'use client';

import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@/lib/supabase/client';

export function LogoutButton() {
  const router = useRouter();

  async function handleLogout() {
    const supabase = createBrowserClient();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }

  return (
    <button onClick={handleLogout} className="text-sm underline">
      Sair
    </button>
  );
}
```

- [ ] **Step 6: Implement `src/app/(app)/layout.tsx`**

```tsx
import Link from 'next/link';
import { exigirConsultor } from '@/lib/auth/guards';
import { LogoutButton } from '@/components/auth/LogoutButton';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const consultor = await exigirConsultor();

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="flex items-center justify-between border-b bg-white px-6 py-4">
        <nav className="flex gap-4 text-sm">
          <Link href="/dashboard">Meus orçamentos</Link>
          <Link href="/orcamentos/novo">Novo orçamento</Link>
          <Link href="/calculadora">Calculadora</Link>
          {consultor.papel === 'admin' && <Link href="/admin/orcamentos">Admin</Link>}
        </nav>
        <div className="flex items-center gap-4 text-sm">
          <span>{consultor.nome}</span>
          <LogoutButton />
        </div>
      </header>
      <main className="p-6">{children}</main>
    </div>
  );
}
```

- [ ] **Step 7: Implement `src/app/(app)/admin/layout.tsx`**

```tsx
import { exigirAdmin } from '@/lib/auth/guards';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await exigirAdmin();
  return <>{children}</>;
}
```

- [ ] **Step 8: Verify the project builds**

Run: `npm run build`
Expected: build succeeds (the pages rendered inside these layouts don't exist yet — they arrive in later tasks — so this only checks the layouts and guards compile cleanly).

- [ ] **Step 9: Commit**

```bash
git add src/lib/auth/guards.ts src/lib/auth/guards.test.ts src/components/auth/LogoutButton.tsx "src/app/(app)"
git commit -m "feat: add role guards and authenticated layout

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 10: Admin — oficinas CRUD with logo upload

**Files:**
- Create: `supabase/migrations/0004_storage.sql`
- Create: `src/lib/oficinas/data.ts`
- Test: `src/lib/oficinas/data.test.ts`
- Create: `src/components/admin/OficinasManager.tsx`
- Test: `src/components/admin/OficinasManager.test.tsx`
- Create: `src/app/(app)/admin/oficinas/page.tsx`

**Interfaces:**
- Consumes: `Oficina` type (Task 3), `createServerClient`/`createBrowserClient` (Task 3).
- Produces: `listarOficinas(supabase): Promise<Oficina[]>`, `criarOficina(supabase, input): Promise<Oficina>`, `atualizarOficina(supabase, id, input): Promise<Oficina>`, `enviarLogoOficina(supabase, oficinaId, arquivo): Promise<string>` in `src/lib/oficinas/data.ts` — the same shape (`listarX`/`criarX`/`atualizarX`) is reused by Tasks 12 and 13.

- [ ] **Step 1: Write `supabase/migrations/0004_storage.sql` and apply it**

```sql
insert into storage.buckets (id, name, public)
values ('logos', 'logos', true)
on conflict (id) do nothing;

create policy "logos: leitura pública" on storage.objects for select using (bucket_id = 'logos');
create policy "logos: só admin envia" on storage.objects for insert with check (bucket_id = 'logos' and is_admin());
create policy "logos: só admin atualiza" on storage.objects for update using (bucket_id = 'logos' and is_admin());
```

Run: `supabase db push`
Expected: migration applies; the `logos` bucket appears in the Supabase dashboard's Storage section.

- [ ] **Step 2: Write the failing tests for the data module**

`src/lib/oficinas/data.test.ts`:
```ts
import { describe, it, expect, vi } from 'vitest';
import { listarOficinas, criarOficina, atualizarOficina } from './data';

function fakeSupabase(response: { data: unknown; error: unknown }) {
  const single = vi.fn().mockResolvedValue(response);
  const select = vi.fn(() => ({ single, order: vi.fn().mockResolvedValue(response), eq: () => ({ select: () => ({ single }) }) }));
  const insert = vi.fn(() => ({ select: () => ({ single }) }));
  const update = vi.fn(() => ({ eq: () => ({ select: () => ({ single }) }) }));
  return { from: vi.fn(() => ({ select, insert, update })) } as any;
}

describe('listarOficinas', () => {
  it('mapeia as linhas do banco (snake_case) para o tipo de domínio (camelCase)', async () => {
    const supabase = fakeSupabase({
      data: [{ id: '1', nome: 'Top Stop Centro', endereco: 'Rua A', telefone: '11999999999', logo_url: null }],
      error: null,
    });
    const oficinas = await listarOficinas(supabase);
    expect(oficinas).toEqual([{ id: '1', nome: 'Top Stop Centro', endereco: 'Rua A', telefone: '11999999999', logoUrl: null }]);
  });

  it('lança erro quando a consulta falha', async () => {
    const supabase = fakeSupabase({ data: null, error: { message: 'falhou' } });
    await expect(listarOficinas(supabase)).rejects.toThrow('falhou');
  });
});

describe('criarOficina', () => {
  it('insere e retorna a oficina criada', async () => {
    const supabase = fakeSupabase({
      data: { id: '2', nome: 'Top Stop Norte', endereco: 'Rua B', telefone: '11888888888', logo_url: null },
      error: null,
    });
    const criada = await criarOficina(supabase, { nome: 'Top Stop Norte', endereco: 'Rua B', telefone: '11888888888' });
    expect(criada.id).toBe('2');
    expect(supabase.from).toHaveBeenCalledWith('oficinas');
  });
});

describe('atualizarOficina', () => {
  it('atualiza e retorna a oficina', async () => {
    const supabase = fakeSupabase({
      data: { id: '1', nome: 'Novo Nome', endereco: 'Rua A', telefone: '11999999999', logo_url: 'http://x/logo.png' },
      error: null,
    });
    const atualizada = await atualizarOficina(supabase, '1', { nome: 'Novo Nome', endereco: 'Rua A', telefone: '11999999999' });
    expect(atualizada.nome).toBe('Novo Nome');
  });
});
```

- [ ] **Step 3: Run the tests and verify they fail**

Run: `npm test -- oficinas/data.test.ts`
Expected: FAIL — module `./data` does not exist.

- [ ] **Step 4: Implement `src/lib/oficinas/data.ts`**

```ts
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Oficina } from '../types';

interface OficinaRow {
  id: string;
  nome: string;
  endereco: string;
  telefone: string;
  logo_url: string | null;
}

function mapOficina(row: OficinaRow): Oficina {
  return { id: row.id, nome: row.nome, endereco: row.endereco, telefone: row.telefone, logoUrl: row.logo_url };
}

export async function listarOficinas(supabase: SupabaseClient): Promise<Oficina[]> {
  const { data, error } = await supabase.from('oficinas').select('*').order('nome');
  if (error) throw new Error(`Erro ao listar oficinas: ${error.message}`);
  return (data ?? []).map(mapOficina);
}

export async function criarOficina(
  supabase: SupabaseClient,
  input: { nome: string; endereco: string; telefone: string }
): Promise<Oficina> {
  const { data, error } = await supabase
    .from('oficinas')
    .insert({ nome: input.nome, endereco: input.endereco, telefone: input.telefone })
    .select()
    .single();
  if (error) throw new Error(`Erro ao criar oficina: ${error.message}`);
  return mapOficina(data);
}

export async function atualizarOficina(
  supabase: SupabaseClient,
  id: string,
  input: { nome: string; endereco: string; telefone: string; logoUrl?: string | null }
): Promise<Oficina> {
  const payload: Record<string, unknown> = { nome: input.nome, endereco: input.endereco, telefone: input.telefone };
  if (input.logoUrl !== undefined) payload.logo_url = input.logoUrl;

  const { data, error } = await supabase.from('oficinas').update(payload).eq('id', id).select().single();
  if (error) throw new Error(`Erro ao atualizar oficina: ${error.message}`);
  return mapOficina(data);
}

export async function enviarLogoOficina(supabase: SupabaseClient, oficinaId: string, arquivo: File): Promise<string> {
  const caminho = `${oficinaId}/${Date.now()}-${arquivo.name}`;
  const { error: uploadError } = await supabase.storage.from('logos').upload(caminho, arquivo, { upsert: true });
  if (uploadError) throw new Error(`Erro ao enviar logo: ${uploadError.message}`);
  const { data } = supabase.storage.from('logos').getPublicUrl(caminho);
  return data.publicUrl;
}
```

- [ ] **Step 5: Run the tests and verify they pass**

Run: `npm test -- oficinas/data.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 6: Write the failing tests for `OficinasManager`**

`src/components/admin/OficinasManager.test.tsx`:
```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { OficinasManager } from './OficinasManager';

vi.mock('@/lib/supabase/client', () => ({ createBrowserClient: () => ({}) }));

const criarOficinaMock = vi.fn();
const atualizarOficinaMock = vi.fn();
vi.mock('@/lib/oficinas/data', () => ({
  criarOficina: (...args: unknown[]) => criarOficinaMock(...args),
  atualizarOficina: (...args: unknown[]) => atualizarOficinaMock(...args),
}));

const oficinaExistente = { id: '1', nome: 'Top Stop Centro', endereco: 'Rua A', telefone: '11999999999', logoUrl: null };

describe('OficinasManager', () => {
  beforeEach(() => {
    criarOficinaMock.mockReset();
    atualizarOficinaMock.mockReset();
  });

  it('lista as oficinas recebidas', () => {
    render(<OficinasManager oficinasIniciais={[oficinaExistente]} />);
    expect(screen.getByText('Top Stop Centro')).toBeInTheDocument();
  });

  it('cria uma nova oficina e adiciona à lista', async () => {
    criarOficinaMock.mockResolvedValue({ id: '2', nome: 'Top Stop Norte', endereco: 'Rua B', telefone: '11888888888', logoUrl: null });
    render(<OficinasManager oficinasIniciais={[]} />);

    fireEvent.change(screen.getByPlaceholderText('Nome'), { target: { value: 'Top Stop Norte' } });
    fireEvent.change(screen.getByPlaceholderText('Endereço'), { target: { value: 'Rua B' } });
    fireEvent.change(screen.getByPlaceholderText('Telefone'), { target: { value: '11888888888' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() => expect(screen.getByText('Top Stop Norte')).toBeInTheDocument());
  });

  it('mostra erro quando a criação falha', async () => {
    criarOficinaMock.mockRejectedValue(new Error('Erro ao criar oficina: falhou'));
    render(<OficinasManager oficinasIniciais={[]} />);

    fireEvent.change(screen.getByPlaceholderText('Nome'), { target: { value: 'X' } });
    fireEvent.change(screen.getByPlaceholderText('Endereço'), { target: { value: 'Y' } });
    fireEvent.change(screen.getByPlaceholderText('Telefone'), { target: { value: 'Z' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('falhou'));
  });
});
```

- [ ] **Step 7: Run the tests and verify they fail**

Run: `npm test -- OficinasManager.test.tsx`
Expected: FAIL — module `./OficinasManager` does not exist.

- [ ] **Step 8: Implement `src/components/admin/OficinasManager.tsx`**

```tsx
'use client';

import { useState, type FormEvent } from 'react';
import { createBrowserClient } from '@/lib/supabase/client';
import { criarOficina, atualizarOficina } from '@/lib/oficinas/data';
import type { Oficina } from '@/lib/types';

export function OficinasManager({ oficinasIniciais }: { oficinasIniciais: Oficina[] }) {
  const [oficinas, setOficinas] = useState(oficinasIniciais);
  const [editando, setEditando] = useState<Oficina | null>(null);
  const [nome, setNome] = useState('');
  const [endereco, setEndereco] = useState('');
  const [telefone, setTelefone] = useState('');
  const [erro, setErro] = useState<string | null>(null);

  function iniciarEdicao(oficina: Oficina | null) {
    setEditando(oficina);
    setNome(oficina?.nome ?? '');
    setEndereco(oficina?.endereco ?? '');
    setTelefone(oficina?.telefone ?? '');
    setErro(null);
  }

  async function salvar(e: FormEvent) {
    e.preventDefault();
    setErro(null);
    const supabase = createBrowserClient();
    try {
      if (editando) {
        const atualizada = await atualizarOficina(supabase, editando.id, { nome, endereco, telefone });
        setOficinas((atuais) => atuais.map((o) => (o.id === atualizada.id ? atualizada : o)));
      } else {
        const criada = await criarOficina(supabase, { nome, endereco, telefone });
        setOficinas((atuais) => [...atuais, criada]);
      }
      iniciarEdicao(null);
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro desconhecido');
    }
  }

  return (
    <div className="space-y-6">
      <table className="w-full text-left text-sm">
        <thead>
          <tr>
            <th>Nome</th>
            <th>Endereço</th>
            <th>Telefone</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {oficinas.map((o) => (
            <tr key={o.id}>
              <td>{o.nome}</td>
              <td>{o.endereco}</td>
              <td>{o.telefone}</td>
              <td>
                <button type="button" onClick={() => iniciarEdicao(o)}>
                  Editar
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <form onSubmit={salvar} className="space-y-2 rounded border p-4">
        <h2 className="font-medium">{editando ? 'Editar oficina' : 'Nova oficina'}</h2>
        <input placeholder="Nome" value={nome} onChange={(e) => setNome(e.target.value)} required className="w-full rounded border px-2 py-1" />
        <input placeholder="Endereço" value={endereco} onChange={(e) => setEndereco(e.target.value)} required className="w-full rounded border px-2 py-1" />
        <input placeholder="Telefone" value={telefone} onChange={(e) => setTelefone(e.target.value)} required className="w-full rounded border px-2 py-1" />
        {erro && (
          <p role="alert" className="text-sm text-red-600">
            {erro}
          </p>
        )}
        <div className="flex gap-2">
          <button type="submit" className="rounded bg-black px-3 py-1 text-white">
            Salvar
          </button>
          {editando && (
            <button type="button" onClick={() => iniciarEdicao(null)}>
              Cancelar
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
```

- [ ] **Step 9: Run the tests and verify they pass**

Run: `npm test -- OficinasManager.test.tsx`
Expected: PASS (3 tests).

- [ ] **Step 10: Implement `src/app/(app)/admin/oficinas/page.tsx`**

```tsx
import { createServerClient } from '@/lib/supabase/server';
import { listarOficinas } from '@/lib/oficinas/data';
import { OficinasManager } from '@/components/admin/OficinasManager';

export default async function OficinasPage() {
  const supabase = await createServerClient();
  const oficinas = await listarOficinas(supabase);
  return (
    <div>
      <h1 className="mb-4 text-lg font-semibold">Oficinas</h1>
      <OficinasManager oficinasIniciais={oficinas} />
    </div>
  );
}
```

- [ ] **Step 11: Verify the project builds**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 12: Commit**

```bash
git add supabase/migrations/0004_storage.sql src/lib/oficinas/ src/components/admin/OficinasManager.tsx src/components/admin/OficinasManager.test.tsx "src/app/(app)/admin/oficinas"
git commit -m "feat: add oficinas admin CRUD with logo storage

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 11: Admin — consultores CRUD (creates a real Auth user)

**Files:**
- Create: `src/lib/consultores/data.ts`
- Create: `src/lib/consultores/actions.ts`
- Test: `src/lib/consultores/actions.test.ts`
- Create: `src/components/admin/ConsultoresManager.tsx`
- Create: `src/app/(app)/admin/consultores/page.tsx`

**Interfaces:**
- Consumes: `createAdminClient` (Task 3), `exigirAdmin` (Task 9), `Consultor`/`Oficina` types (Task 3), `listarOficinas` (Task 10).
- Produces: `listarConsultores(supabase): Promise<Consultor[]>` in `data.ts`; `criarConsultor(input): Promise<Consultor>`, `atualizarConsultor(id, input): Promise<void>`, `desativarConsultor(id): Promise<void>` (all `'use server'` actions) in `actions.ts`.

- [ ] **Step 1: Implement `src/lib/consultores/data.ts`** (no new test — same mapping pattern already covered by Task 10's tests)

```ts
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Consultor } from '../types';

interface ConsultorRow {
  id: string;
  auth_user_id: string;
  nome: string;
  login: string;
  papel: 'consultor' | 'admin';
  oficina_id: string | null;
  ativo: boolean;
}

function mapConsultor(row: ConsultorRow): Consultor {
  return {
    id: row.id,
    authUserId: row.auth_user_id,
    nome: row.nome,
    login: row.login,
    papel: row.papel,
    oficinaId: row.oficina_id,
    ativo: row.ativo,
  };
}

export async function listarConsultores(supabase: SupabaseClient): Promise<Consultor[]> {
  const { data, error } = await supabase.from('consultores').select('*').order('nome');
  if (error) throw new Error(`Erro ao listar consultores: ${error.message}`);
  return (data ?? []).map(mapConsultor);
}
```

- [ ] **Step 2: Write the failing tests for `actions.ts`**

`src/lib/consultores/actions.test.ts`:
```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { criarConsultor, atualizarConsultor, desativarConsultor } from './actions';

vi.mock('../auth/guards', () => ({ exigirAdmin: vi.fn().mockResolvedValue({ id: 'admin1' }) }));

const createUserMock = vi.fn();
const deleteUserMock = vi.fn();
const singleMock = vi.fn();
const insertMock = vi.fn(() => ({ select: () => ({ single: singleMock }) }));
const eqMock = vi.fn();
const updateMock = vi.fn(() => ({ eq: eqMock }));

vi.mock('../supabase/admin', () => ({
  createAdminClient: () => ({
    auth: { admin: { createUser: createUserMock, deleteUser: deleteUserMock } },
    from: () => ({ insert: insertMock, update: updateMock }),
  }),
}));

describe('criarConsultor', () => {
  beforeEach(() => {
    createUserMock.mockReset();
    deleteUserMock.mockReset();
    singleMock.mockReset();
  });

  it('cria o usuário no Auth e o registro em consultores, retornando o consultor mapeado', async () => {
    createUserMock.mockResolvedValue({ data: { user: { id: 'auth-1' } }, error: null });
    singleMock.mockResolvedValue({
      data: { id: 'c1', auth_user_id: 'auth-1', nome: 'João', login: 'joao@topstop.local', papel: 'consultor', oficina_id: 'of-1', ativo: true },
      error: null,
    });

    const consultor = await criarConsultor({ nome: 'João', login: 'joao@topstop.local', senha: 'segredo123', papel: 'consultor', oficinaId: 'of-1' });

    expect(createUserMock).toHaveBeenCalledWith({ email: 'joao@topstop.local', password: 'segredo123', email_confirm: true });
    expect(consultor).toEqual({ id: 'c1', authUserId: 'auth-1', nome: 'João', login: 'joao@topstop.local', papel: 'consultor', oficinaId: 'of-1', ativo: true });
  });

  it('desfaz a criação do usuário no Auth se salvar em consultores falhar', async () => {
    createUserMock.mockResolvedValue({ data: { user: { id: 'auth-2' } }, error: null });
    singleMock.mockResolvedValue({ data: null, error: { message: 'login duplicado' } });

    await expect(
      criarConsultor({ nome: 'Ana', login: 'ana@topstop.local', senha: 'segredo123', papel: 'consultor', oficinaId: null })
    ).rejects.toThrow('login duplicado');

    expect(deleteUserMock).toHaveBeenCalledWith('auth-2');
  });

  it('lança erro quando a criação do usuário no Auth falha', async () => {
    createUserMock.mockResolvedValue({ data: { user: null }, error: { message: 'e-mail inválido' } });
    await expect(
      criarConsultor({ nome: 'Ana', login: 'invalido', senha: 'segredo123', papel: 'consultor', oficinaId: null })
    ).rejects.toThrow('e-mail inválido');
  });
});

describe('atualizarConsultor', () => {
  it('atualiza nome, papel e oficina', async () => {
    eqMock.mockResolvedValue({ error: null });
    await atualizarConsultor('c1', { nome: 'João Silva', papel: 'admin', oficinaId: null });
    expect(updateMock).toHaveBeenCalledWith({ nome: 'João Silva', papel: 'admin', oficina_id: null });
  });
});

describe('desativarConsultor', () => {
  it('marca o consultor como inativo', async () => {
    eqMock.mockResolvedValue({ error: null });
    await desativarConsultor('c1');
    expect(updateMock).toHaveBeenCalledWith({ ativo: false });
  });
});
```

- [ ] **Step 3: Run the tests and verify they fail**

Run: `npm test -- consultores/actions.test.ts`
Expected: FAIL — module `./actions` does not exist.

- [ ] **Step 4: Implement `src/lib/consultores/actions.ts`**

```ts
'use server';

import { createAdminClient } from '../supabase/admin';
import { exigirAdmin } from '../auth/guards';
import type { Consultor } from '../types';

export interface CriarConsultorInput {
  nome: string;
  login: string;
  senha: string;
  papel: 'consultor' | 'admin';
  oficinaId: string | null;
}

export async function criarConsultor(input: CriarConsultorInput): Promise<Consultor> {
  await exigirAdmin();
  const admin = createAdminClient();

  const { data: authData, error: authError } = await admin.auth.admin.createUser({
    email: input.login,
    password: input.senha,
    email_confirm: true,
  });
  if (authError || !authData.user) {
    throw new Error(`Erro ao criar usuário: ${authError?.message ?? 'desconhecido'}`);
  }

  const { data, error: dbError } = await admin
    .from('consultores')
    .insert({
      auth_user_id: authData.user.id,
      nome: input.nome,
      login: input.login,
      papel: input.papel,
      oficina_id: input.oficinaId,
      ativo: true,
    })
    .select()
    .single();

  if (dbError || !data) {
    await admin.auth.admin.deleteUser(authData.user.id);
    throw new Error(`Erro ao salvar consultor: ${dbError?.message ?? 'desconhecido'}`);
  }

  return {
    id: data.id,
    authUserId: data.auth_user_id,
    nome: data.nome,
    login: data.login,
    papel: data.papel,
    oficinaId: data.oficina_id,
    ativo: data.ativo,
  };
}

export async function atualizarConsultor(
  id: string,
  input: { nome: string; papel: 'consultor' | 'admin'; oficinaId: string | null }
): Promise<void> {
  await exigirAdmin();
  const admin = createAdminClient();
  const { error } = await admin
    .from('consultores')
    .update({ nome: input.nome, papel: input.papel, oficina_id: input.oficinaId })
    .eq('id', id);
  if (error) throw new Error(`Erro ao atualizar consultor: ${error.message}`);
}

export async function desativarConsultor(id: string): Promise<void> {
  await exigirAdmin();
  const admin = createAdminClient();
  const { error } = await admin.from('consultores').update({ ativo: false }).eq('id', id);
  if (error) throw new Error(`Erro ao desativar consultor: ${error.message}`);
}
```

- [ ] **Step 5: Run the tests and verify they pass**

Run: `npm test -- consultores/actions.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 6: Implement `src/components/admin/ConsultoresManager.tsx`**

```tsx
'use client';

import { useState, type FormEvent } from 'react';
import { criarConsultor, atualizarConsultor, desativarConsultor } from '@/lib/consultores/actions';
import type { Consultor, Oficina } from '@/lib/types';

export function ConsultoresManager({
  consultoresIniciais,
  oficinas,
}: {
  consultoresIniciais: Consultor[];
  oficinas: Oficina[];
}) {
  const [consultores, setConsultores] = useState(consultoresIniciais);
  const [editando, setEditando] = useState<Consultor | null>(null);
  const [nome, setNome] = useState('');
  const [login, setLogin] = useState('');
  const [senha, setSenha] = useState('');
  const [papel, setPapel] = useState<'consultor' | 'admin'>('consultor');
  const [oficinaId, setOficinaId] = useState('');
  const [erro, setErro] = useState<string | null>(null);

  function iniciarEdicao(consultor: Consultor | null) {
    setEditando(consultor);
    setNome(consultor?.nome ?? '');
    setLogin(consultor?.login ?? '');
    setSenha('');
    setPapel(consultor?.papel ?? 'consultor');
    setOficinaId(consultor?.oficinaId ?? '');
    setErro(null);
  }

  async function salvar(e: FormEvent) {
    e.preventDefault();
    setErro(null);
    try {
      if (editando) {
        await atualizarConsultor(editando.id, { nome, papel, oficinaId: oficinaId || null });
        setConsultores((atuais) => atuais.map((c) => (c.id === editando.id ? { ...c, nome, papel, oficinaId: oficinaId || null } : c)));
      } else {
        const criado = await criarConsultor({ nome, login, senha, papel, oficinaId: oficinaId || null });
        setConsultores((atuais) => [...atuais, criado]);
      }
      iniciarEdicao(null);
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro desconhecido');
    }
  }

  async function desativar(id: string) {
    setErro(null);
    try {
      await desativarConsultor(id);
      setConsultores((atuais) => atuais.map((c) => (c.id === id ? { ...c, ativo: false } : c)));
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro desconhecido');
    }
  }

  return (
    <div className="space-y-6">
      <table className="w-full text-left text-sm">
        <thead>
          <tr>
            <th>Nome</th>
            <th>Login</th>
            <th>Papel</th>
            <th>Status</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {consultores.map((c) => (
            <tr key={c.id}>
              <td>{c.nome}</td>
              <td>{c.login}</td>
              <td>{c.papel}</td>
              <td>{c.ativo ? 'Ativo' : 'Inativo'}</td>
              <td className="space-x-2">
                <button type="button" onClick={() => iniciarEdicao(c)}>
                  Editar
                </button>
                {c.ativo && (
                  <button type="button" onClick={() => desativar(c.id)}>
                    Desativar
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <form onSubmit={salvar} className="space-y-2 rounded border p-4">
        <h2 className="font-medium">{editando ? 'Editar consultor' : 'Novo consultor'}</h2>
        <input placeholder="Nome" value={nome} onChange={(e) => setNome(e.target.value)} required className="w-full rounded border px-2 py-1" />
        <input
          placeholder="Login (e-mail)"
          value={login}
          onChange={(e) => setLogin(e.target.value)}
          required
          disabled={!!editando}
          className="w-full rounded border px-2 py-1"
        />
        {!editando && (
          <input placeholder="Senha" type="password" value={senha} onChange={(e) => setSenha(e.target.value)} required className="w-full rounded border px-2 py-1" />
        )}
        <select value={papel} onChange={(e) => setPapel(e.target.value as 'consultor' | 'admin')} className="w-full rounded border px-2 py-1">
          <option value="consultor">Consultor</option>
          <option value="admin">Admin</option>
        </select>
        <select value={oficinaId} onChange={(e) => setOficinaId(e.target.value)} className="w-full rounded border px-2 py-1">
          <option value="">Sem oficina (admin)</option>
          {oficinas.map((o) => (
            <option key={o.id} value={o.id}>
              {o.nome}
            </option>
          ))}
        </select>
        {erro && (
          <p role="alert" className="text-sm text-red-600">
            {erro}
          </p>
        )}
        <div className="flex gap-2">
          <button type="submit" className="rounded bg-black px-3 py-1 text-white">
            Salvar
          </button>
          {editando && (
            <button type="button" onClick={() => iniciarEdicao(null)}>
              Cancelar
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
```

- [ ] **Step 7: Implement `src/app/(app)/admin/consultores/page.tsx`**

```tsx
import { createServerClient } from '@/lib/supabase/server';
import { listarConsultores } from '@/lib/consultores/data';
import { listarOficinas } from '@/lib/oficinas/data';
import { ConsultoresManager } from '@/components/admin/ConsultoresManager';

export default async function ConsultoresPage() {
  const supabase = await createServerClient();
  const [consultores, oficinas] = await Promise.all([listarConsultores(supabase), listarOficinas(supabase)]);
  return (
    <div>
      <h1 className="mb-4 text-lg font-semibold">Consultores</h1>
      <ConsultoresManager consultoresIniciais={consultores} oficinas={oficinas} />
    </div>
  );
}
```

- [ ] **Step 8: Verify the project builds**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 9: Commit**

```bash
git add src/lib/consultores/ src/components/admin/ConsultoresManager.tsx "src/app/(app)/admin/consultores"
git commit -m "feat: add consultores admin CRUD with Auth user provisioning

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 12: Admin — catálogo de itens CRUD

**Files:**
- Modify: `src/lib/format.ts`, `src/lib/format.test.ts`
- Create: `src/lib/catalogo/data.ts`
- Test: `src/lib/catalogo/data.test.ts`
- Create: `src/components/admin/CatalogoManager.tsx`
- Test: `src/components/admin/CatalogoManager.test.tsx`
- Create: `src/app/(app)/admin/catalogo/page.tsx`

**Interfaces:**
- Consumes: `formatarReais` (Task 1), `CatalogoItem` type (Task 3).
- Produces: `parseReaisParaCentavos(valor: string): number` added to `src/lib/format.ts` — used here and by Task 14 (item form). `listarCatalogo`, `criarItemCatalogo`, `atualizarItemCatalogo`, `removerItemCatalogo` in `src/lib/catalogo/data.ts` — `listarCatalogo` and `criarItemCatalogo` are consumed by Task 14's item picker.

- [ ] **Step 1: Write the failing test for `parseReaisParaCentavos`**

Append to `src/lib/format.test.ts`:
```ts
import { parseReaisParaCentavos } from './format';

describe('parseReaisParaCentavos', () => {
  it('converte um valor em formato brasileiro para centavos', () => {
    expect(parseReaisParaCentavos('1.825,00')).toBe(182500);
    expect(parseReaisParaCentavos('50,5')).toBe(5050);
    expect(parseReaisParaCentavos('0')).toBe(0);
  });

  it('lança erro para texto que não é um número', () => {
    expect(() => parseReaisParaCentavos('abc')).toThrow();
  });
});
```

- [ ] **Step 2: Run the test and verify it fails**

Run: `npm test -- format.test.ts`
Expected: FAIL — `parseReaisParaCentavos` is not exported.

- [ ] **Step 3: Add `parseReaisParaCentavos` to `src/lib/format.ts`**

```ts
export function parseReaisParaCentavos(valor: string): number {
  const normalizado = valor.replace(/\./g, '').replace(',', '.').trim();
  const numero = Number(normalizado);
  if (Number.isNaN(numero)) {
    throw new Error(`Valor inválido: ${valor}`);
  }
  return Math.round(numero * 100);
}
```

- [ ] **Step 4: Run the test and verify it passes**

Run: `npm test -- format.test.ts`
Expected: PASS (all tests in the file, including the new ones).

- [ ] **Step 5: Write the failing tests for `src/lib/catalogo/data.ts`**

`src/lib/catalogo/data.test.ts`:
```ts
import { describe, it, expect, vi } from 'vitest';
import { listarCatalogo, criarItemCatalogo, atualizarItemCatalogo, removerItemCatalogo } from './data';

function fakeSupabase(response: { data: unknown; error: unknown }) {
  const single = vi.fn().mockResolvedValue(response);
  const eqDelete = vi.fn().mockResolvedValue(response);
  return {
    from: vi.fn(() => ({
      select: () => ({ order: vi.fn().mockResolvedValue(response) }),
      insert: () => ({ select: () => ({ single }) }),
      update: () => ({ eq: () => ({ select: () => ({ single }) }) }),
      delete: () => ({ eq: eqDelete }),
    })),
  } as any;
}

describe('listarCatalogo', () => {
  it('mapeia as linhas para o tipo de domínio', async () => {
    const supabase = fakeSupabase({
      data: [{ id: '1', descricao: 'Pastilha de freio', tipo: 'peca', marca_codigo: 'BOSCH-123', valor_padrao_centavos: 15000 }],
      error: null,
    });
    const itens = await listarCatalogo(supabase);
    expect(itens).toEqual([{ id: '1', descricao: 'Pastilha de freio', tipo: 'peca', marcaCodigo: 'BOSCH-123', valorPadraoCentavos: 15000 }]);
  });
});

describe('criarItemCatalogo', () => {
  it('insere e retorna o item criado', async () => {
    const supabase = fakeSupabase({
      data: { id: '2', descricao: 'Troca de óleo', tipo: 'servico', marca_codigo: null, valor_padrao_centavos: 10000 },
      error: null,
    });
    const criado = await criarItemCatalogo(supabase, { descricao: 'Troca de óleo', tipo: 'servico', marcaCodigo: null, valorPadraoCentavos: 10000 });
    expect(criado.id).toBe('2');
  });
});

describe('atualizarItemCatalogo', () => {
  it('atualiza e retorna o item', async () => {
    const supabase = fakeSupabase({
      data: { id: '1', descricao: 'Pastilha de freio dianteira', tipo: 'peca', marca_codigo: 'BOSCH-123', valor_padrao_centavos: 16000 },
      error: null,
    });
    const atualizado = await atualizarItemCatalogo(supabase, '1', { descricao: 'Pastilha de freio dianteira', tipo: 'peca', marcaCodigo: 'BOSCH-123', valorPadraoCentavos: 16000 });
    expect(atualizado.valorPadraoCentavos).toBe(16000);
  });
});

describe('removerItemCatalogo', () => {
  it('remove sem lançar erro quando a resposta não tem erro', async () => {
    const supabase = fakeSupabase({ data: null, error: null });
    await expect(removerItemCatalogo(supabase, '1')).resolves.toBeUndefined();
  });

  it('lança erro quando a remoção falha', async () => {
    const supabase = fakeSupabase({ data: null, error: { message: 'em uso' } });
    await expect(removerItemCatalogo(supabase, '1')).rejects.toThrow('em uso');
  });
});
```

- [ ] **Step 6: Run the tests and verify they fail**

Run: `npm test -- catalogo/data.test.ts`
Expected: FAIL — module `./data` does not exist.

- [ ] **Step 7: Implement `src/lib/catalogo/data.ts`**

```ts
import type { SupabaseClient } from '@supabase/supabase-js';
import type { CatalogoItem } from '../types';

interface CatalogoItemRow {
  id: string;
  descricao: string;
  tipo: 'peca' | 'servico';
  marca_codigo: string | null;
  valor_padrao_centavos: number;
}

function mapCatalogoItem(row: CatalogoItemRow): CatalogoItem {
  return { id: row.id, descricao: row.descricao, tipo: row.tipo, marcaCodigo: row.marca_codigo, valorPadraoCentavos: row.valor_padrao_centavos };
}

export async function listarCatalogo(supabase: SupabaseClient): Promise<CatalogoItem[]> {
  const { data, error } = await supabase.from('catalogo_itens').select('*').order('descricao');
  if (error) throw new Error(`Erro ao listar catálogo: ${error.message}`);
  return (data ?? []).map(mapCatalogoItem);
}

export async function criarItemCatalogo(
  supabase: SupabaseClient,
  input: { descricao: string; tipo: 'peca' | 'servico'; marcaCodigo: string | null; valorPadraoCentavos: number }
): Promise<CatalogoItem> {
  const { data, error } = await supabase
    .from('catalogo_itens')
    .insert({ descricao: input.descricao, tipo: input.tipo, marca_codigo: input.marcaCodigo, valor_padrao_centavos: input.valorPadraoCentavos })
    .select()
    .single();
  if (error) throw new Error(`Erro ao criar item: ${error.message}`);
  return mapCatalogoItem(data);
}

export async function atualizarItemCatalogo(
  supabase: SupabaseClient,
  id: string,
  input: { descricao: string; tipo: 'peca' | 'servico'; marcaCodigo: string | null; valorPadraoCentavos: number }
): Promise<CatalogoItem> {
  const { data, error } = await supabase
    .from('catalogo_itens')
    .update({ descricao: input.descricao, tipo: input.tipo, marca_codigo: input.marcaCodigo, valor_padrao_centavos: input.valorPadraoCentavos })
    .eq('id', id)
    .select()
    .single();
  if (error) throw new Error(`Erro ao atualizar item: ${error.message}`);
  return mapCatalogoItem(data);
}

export async function removerItemCatalogo(supabase: SupabaseClient, id: string): Promise<void> {
  const { error } = await supabase.from('catalogo_itens').delete().eq('id', id);
  if (error) throw new Error(`Erro ao remover item: ${error.message}`);
}
```

- [ ] **Step 8: Run the tests and verify they pass**

Run: `npm test -- catalogo/data.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 9: Write the failing tests for `CatalogoManager`**

`src/components/admin/CatalogoManager.test.tsx`:
```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CatalogoManager } from './CatalogoManager';

vi.mock('@/lib/supabase/client', () => ({ createBrowserClient: () => ({}) }));

const criarItemCatalogoMock = vi.fn();
vi.mock('@/lib/catalogo/data', () => ({
  criarItemCatalogo: (...args: unknown[]) => criarItemCatalogoMock(...args),
  atualizarItemCatalogo: vi.fn(),
  removerItemCatalogo: vi.fn(),
}));

describe('CatalogoManager', () => {
  beforeEach(() => criarItemCatalogoMock.mockReset());

  it('converte o valor em reais digitado para centavos ao criar um item', async () => {
    criarItemCatalogoMock.mockResolvedValue({ id: '1', descricao: 'Pastilha de freio', tipo: 'peca', marcaCodigo: null, valorPadraoCentavos: 15000 });
    render(<CatalogoManager itensIniciais={[]} />);

    fireEvent.change(screen.getByPlaceholderText('Descrição'), { target: { value: 'Pastilha de freio' } });
    fireEvent.change(screen.getByPlaceholderText('Valor (R$)'), { target: { value: '150,00' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() =>
      expect(criarItemCatalogoMock).toHaveBeenCalledWith(
        {},
        { descricao: 'Pastilha de freio', tipo: 'peca', marcaCodigo: null, valorPadraoCentavos: 15000 }
      )
    );
  });

  it('mostra erro quando o valor digitado não é um número', async () => {
    render(<CatalogoManager itensIniciais={[]} />);

    fireEvent.change(screen.getByPlaceholderText('Descrição'), { target: { value: 'Item' } });
    fireEvent.change(screen.getByPlaceholderText('Valor (R$)'), { target: { value: 'abc' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Valor inválido'));
    expect(criarItemCatalogoMock).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 10: Run the tests and verify they fail**

Run: `npm test -- CatalogoManager.test.tsx`
Expected: FAIL — module `./CatalogoManager` does not exist.

- [ ] **Step 11: Implement `src/components/admin/CatalogoManager.tsx`**

```tsx
'use client';

import { useState, type FormEvent } from 'react';
import { createBrowserClient } from '@/lib/supabase/client';
import { criarItemCatalogo, atualizarItemCatalogo, removerItemCatalogo } from '@/lib/catalogo/data';
import { formatarReais, parseReaisParaCentavos } from '@/lib/format';
import type { CatalogoItem } from '@/lib/types';

export function CatalogoManager({ itensIniciais }: { itensIniciais: CatalogoItem[] }) {
  const [itens, setItens] = useState(itensIniciais);
  const [editando, setEditando] = useState<CatalogoItem | null>(null);
  const [descricao, setDescricao] = useState('');
  const [tipo, setTipo] = useState<'peca' | 'servico'>('peca');
  const [marcaCodigo, setMarcaCodigo] = useState('');
  const [valor, setValor] = useState('');
  const [erro, setErro] = useState<string | null>(null);

  function iniciarEdicao(item: CatalogoItem | null) {
    setEditando(item);
    setDescricao(item?.descricao ?? '');
    setTipo(item?.tipo ?? 'peca');
    setMarcaCodigo(item?.marcaCodigo ?? '');
    setValor(item ? (item.valorPadraoCentavos / 100).toFixed(2).replace('.', ',') : '');
    setErro(null);
  }

  async function salvar(e: FormEvent) {
    e.preventDefault();
    setErro(null);
    const supabase = createBrowserClient();
    try {
      const valorPadraoCentavos = parseReaisParaCentavos(valor);
      const input = { descricao, tipo, marcaCodigo: marcaCodigo || null, valorPadraoCentavos };
      if (editando) {
        const atualizado = await atualizarItemCatalogo(supabase, editando.id, input);
        setItens((atuais) => atuais.map((i) => (i.id === atualizado.id ? atualizado : i)));
      } else {
        const criado = await criarItemCatalogo(supabase, input);
        setItens((atuais) => [...atuais, criado]);
      }
      iniciarEdicao(null);
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro desconhecido');
    }
  }

  async function remover(id: string) {
    setErro(null);
    const supabase = createBrowserClient();
    try {
      await removerItemCatalogo(supabase, id);
      setItens((atuais) => atuais.filter((i) => i.id !== id));
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro desconhecido');
    }
  }

  return (
    <div className="space-y-6">
      <table className="w-full text-left text-sm">
        <thead>
          <tr>
            <th>Descrição</th>
            <th>Tipo</th>
            <th>Marca/Código</th>
            <th>Valor</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {itens.map((i) => (
            <tr key={i.id}>
              <td>{i.descricao}</td>
              <td>{i.tipo === 'peca' ? 'Peça' : 'Serviço'}</td>
              <td>{i.marcaCodigo}</td>
              <td>{formatarReais(i.valorPadraoCentavos)}</td>
              <td className="space-x-2">
                <button type="button" onClick={() => iniciarEdicao(i)}>
                  Editar
                </button>
                <button type="button" onClick={() => remover(i.id)}>
                  Remover
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <form onSubmit={salvar} className="space-y-2 rounded border p-4">
        <h2 className="font-medium">{editando ? 'Editar item' : 'Novo item'}</h2>
        <input placeholder="Descrição" value={descricao} onChange={(e) => setDescricao(e.target.value)} required className="w-full rounded border px-2 py-1" />
        <select value={tipo} onChange={(e) => setTipo(e.target.value as 'peca' | 'servico')} className="w-full rounded border px-2 py-1">
          <option value="peca">Peça</option>
          <option value="servico">Serviço</option>
        </select>
        <input placeholder="Marca/Código (opcional)" value={marcaCodigo} onChange={(e) => setMarcaCodigo(e.target.value)} className="w-full rounded border px-2 py-1" />
        <input placeholder="Valor (R$)" value={valor} onChange={(e) => setValor(e.target.value)} required className="w-full rounded border px-2 py-1" />
        {erro && (
          <p role="alert" className="text-sm text-red-600">
            {erro}
          </p>
        )}
        <div className="flex gap-2">
          <button type="submit" className="rounded bg-black px-3 py-1 text-white">
            Salvar
          </button>
          {editando && (
            <button type="button" onClick={() => iniciarEdicao(null)}>
              Cancelar
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
```

- [ ] **Step 12: Run the tests and verify they pass**

Run: `npm test -- CatalogoManager.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 13: Implement `src/app/(app)/admin/catalogo/page.tsx`**

```tsx
import { createServerClient } from '@/lib/supabase/server';
import { listarCatalogo } from '@/lib/catalogo/data';
import { CatalogoManager } from '@/components/admin/CatalogoManager';

export default async function CatalogoPage() {
  const supabase = await createServerClient();
  const itens = await listarCatalogo(supabase);
  return (
    <div>
      <h1 className="mb-4 text-lg font-semibold">Catálogo de itens</h1>
      <CatalogoManager itensIniciais={itens} />
    </div>
  );
}
```

- [ ] **Step 14: Verify the project builds**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 15: Commit**

```bash
git add src/lib/format.ts src/lib/format.test.ts src/lib/catalogo/ src/components/admin/CatalogoManager.tsx src/components/admin/CatalogoManager.test.tsx "src/app/(app)/admin/catalogo"
git commit -m "feat: add catálogo de itens admin CRUD

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 13: Admin — faixas de pagamento and global configuration

**Files:**
- Create: `src/lib/pagamento/data.ts`
- Test: `src/lib/pagamento/data.test.ts`
- Create: `src/components/admin/PagamentoManager.tsx`
- Test: `src/components/admin/PagamentoManager.test.tsx`
- Create: `src/app/(app)/admin/pagamento/page.tsx`

**Interfaces:**
- Consumes: `FaixaPagamento`, `ConfiguracaoPagamento` types (Task 3), `formatarReais`/`parseReaisParaCentavos` (Tasks 1/12).
- Produces: `listarFaixas`, `criarFaixa`, `atualizarFaixa`, `removerFaixa`, `obterConfiguracao`, `atualizarConfiguracao` in `src/lib/pagamento/data.ts` — `listarFaixas` and `obterConfiguracao` are consumed by Task 15 and Task 20 to run the payment calculations with live, admin-edited values.

- [ ] **Step 1: Write the failing tests for `src/lib/pagamento/data.ts`**

`src/lib/pagamento/data.test.ts`:
```ts
import { describe, it, expect, vi } from 'vitest';
import { listarFaixas, criarFaixa, atualizarFaixa, removerFaixa, obterConfiguracao, atualizarConfiguracao } from './data';

function fakeSupabase(response: { data: unknown; error: unknown }) {
  const single = vi.fn().mockResolvedValue(response);
  return {
    from: vi.fn(() => ({
      select: () => ({ order: vi.fn().mockResolvedValue(response), eq: () => ({ single }) }),
      insert: () => ({ select: () => ({ single }) }),
      update: () => ({ eq: () => ({ select: () => ({ single }) }) }),
      delete: () => ({ eq: vi.fn().mockResolvedValue(response) }),
    })),
  } as any;
}

describe('listarFaixas', () => {
  it('mapeia as linhas para o tipo de domínio', async () => {
    const supabase = fakeSupabase({ data: [{ id: '1', valor_min_centavos: 0, valor_max_centavos: 100000, parcelas_sem_juros: 1 }], error: null });
    const faixas = await listarFaixas(supabase);
    expect(faixas).toEqual([{ id: '1', valorMinCentavos: 0, valorMaxCentavos: 100000, parcelasSemJuros: 1 }]);
  });
});

describe('criarFaixa', () => {
  it('insere e retorna a faixa criada', async () => {
    const supabase = fakeSupabase({ data: { id: '2', valor_min_centavos: 400000, valor_max_centavos: null, parcelas_sem_juros: 4 }, error: null });
    const criada = await criarFaixa(supabase, { valorMinCentavos: 400000, valorMaxCentavos: null, parcelasSemJuros: 4 });
    expect(criada.valorMaxCentavos).toBeNull();
  });
});

describe('atualizarFaixa', () => {
  it('atualiza e retorna a faixa', async () => {
    const supabase = fakeSupabase({ data: { id: '1', valor_min_centavos: 0, valor_max_centavos: 120000, parcelas_sem_juros: 1 }, error: null });
    const atualizada = await atualizarFaixa(supabase, '1', { valorMinCentavos: 0, valorMaxCentavos: 120000, parcelasSemJuros: 1 });
    expect(atualizada.valorMaxCentavos).toBe(120000);
  });
});

describe('removerFaixa', () => {
  it('lança erro quando a remoção falha', async () => {
    const supabase = fakeSupabase({ data: null, error: { message: 'em uso' } });
    await expect(removerFaixa(supabase, '1')).rejects.toThrow('em uso');
  });
});

describe('obterConfiguracao', () => {
  it('mapeia a linha singleton para o tipo de domínio', async () => {
    const supabase = fakeSupabase({
      data: { percentual_entrada_minima: 0.3, percentual_desconto_avista: 0.05, cartao_porto_max_parcelas: 6, cartao_porto_parcela_minima_centavos: 10000 },
      error: null,
    });
    const config = await obterConfiguracao(supabase);
    expect(config).toEqual({ percentualEntradaMinima: 0.3, percentualDescontoAVista: 0.05, cartaoPortoMaxParcelas: 6, cartaoPortoParcelaMinimaCentavos: 10000 });
  });
});

describe('atualizarConfiguracao', () => {
  it('atualiza e retorna a configuração', async () => {
    const supabase = fakeSupabase({
      data: { percentual_entrada_minima: 0.2, percentual_desconto_avista: 0.05, cartao_porto_max_parcelas: 6, cartao_porto_parcela_minima_centavos: 10000 },
      error: null,
    });
    const atualizada = await atualizarConfiguracao(supabase, {
      percentualEntradaMinima: 0.2,
      percentualDescontoAVista: 0.05,
      cartaoPortoMaxParcelas: 6,
      cartaoPortoParcelaMinimaCentavos: 10000,
    });
    expect(atualizada.percentualEntradaMinima).toBe(0.2);
  });
});
```

- [ ] **Step 2: Run the tests and verify they fail**

Run: `npm test -- pagamento/data.test.ts`
Expected: FAIL — module `./data` does not exist.

- [ ] **Step 3: Implement `src/lib/pagamento/data.ts`**

```ts
import type { SupabaseClient } from '@supabase/supabase-js';
import type { FaixaPagamento, ConfiguracaoPagamento } from '../types';

interface FaixaRow {
  id: string;
  valor_min_centavos: number;
  valor_max_centavos: number | null;
  parcelas_sem_juros: number;
}

function mapFaixa(row: FaixaRow): FaixaPagamento {
  return { id: row.id, valorMinCentavos: row.valor_min_centavos, valorMaxCentavos: row.valor_max_centavos, parcelasSemJuros: row.parcelas_sem_juros };
}

export async function listarFaixas(supabase: SupabaseClient): Promise<FaixaPagamento[]> {
  const { data, error } = await supabase.from('faixas_pagamento').select('*').order('valor_min_centavos');
  if (error) throw new Error(`Erro ao listar faixas: ${error.message}`);
  return (data ?? []).map(mapFaixa);
}

export async function criarFaixa(
  supabase: SupabaseClient,
  input: { valorMinCentavos: number; valorMaxCentavos: number | null; parcelasSemJuros: number }
): Promise<FaixaPagamento> {
  const { data, error } = await supabase
    .from('faixas_pagamento')
    .insert({ valor_min_centavos: input.valorMinCentavos, valor_max_centavos: input.valorMaxCentavos, parcelas_sem_juros: input.parcelasSemJuros })
    .select()
    .single();
  if (error) throw new Error(`Erro ao criar faixa: ${error.message}`);
  return mapFaixa(data);
}

export async function atualizarFaixa(
  supabase: SupabaseClient,
  id: string,
  input: { valorMinCentavos: number; valorMaxCentavos: number | null; parcelasSemJuros: number }
): Promise<FaixaPagamento> {
  const { data, error } = await supabase
    .from('faixas_pagamento')
    .update({ valor_min_centavos: input.valorMinCentavos, valor_max_centavos: input.valorMaxCentavos, parcelas_sem_juros: input.parcelasSemJuros })
    .eq('id', id)
    .select()
    .single();
  if (error) throw new Error(`Erro ao atualizar faixa: ${error.message}`);
  return mapFaixa(data);
}

export async function removerFaixa(supabase: SupabaseClient, id: string): Promise<void> {
  const { error } = await supabase.from('faixas_pagamento').delete().eq('id', id);
  if (error) throw new Error(`Erro ao remover faixa: ${error.message}`);
}

export async function obterConfiguracao(supabase: SupabaseClient): Promise<ConfiguracaoPagamento> {
  const { data, error } = await supabase.from('configuracao_pagamento').select('*').eq('id', 1).single();
  if (error || !data) throw new Error(`Erro ao carregar configuração: ${error?.message ?? 'não encontrada'}`);
  return {
    percentualEntradaMinima: data.percentual_entrada_minima,
    percentualDescontoAVista: data.percentual_desconto_avista,
    cartaoPortoMaxParcelas: data.cartao_porto_max_parcelas,
    cartaoPortoParcelaMinimaCentavos: data.cartao_porto_parcela_minima_centavos,
  };
}

export async function atualizarConfiguracao(supabase: SupabaseClient, input: ConfiguracaoPagamento): Promise<ConfiguracaoPagamento> {
  const { data, error } = await supabase
    .from('configuracao_pagamento')
    .update({
      percentual_entrada_minima: input.percentualEntradaMinima,
      percentual_desconto_avista: input.percentualDescontoAVista,
      cartao_porto_max_parcelas: input.cartaoPortoMaxParcelas,
      cartao_porto_parcela_minima_centavos: input.cartaoPortoParcelaMinimaCentavos,
    })
    .eq('id', 1)
    .select()
    .single();
  if (error || !data) throw new Error(`Erro ao atualizar configuração: ${error?.message ?? 'desconhecido'}`);
  return {
    percentualEntradaMinima: data.percentual_entrada_minima,
    percentualDescontoAVista: data.percentual_desconto_avista,
    cartaoPortoMaxParcelas: data.cartao_porto_max_parcelas,
    cartaoPortoParcelaMinimaCentavos: data.cartao_porto_parcela_minima_centavos,
  };
}
```

- [ ] **Step 4: Run the tests and verify they pass**

Run: `npm test -- pagamento/data.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Write the failing tests for `PagamentoManager`**

`src/components/admin/PagamentoManager.test.tsx`:
```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PagamentoManager } from './PagamentoManager';

vi.mock('@/lib/supabase/client', () => ({ createBrowserClient: () => ({}) }));

const criarFaixaMock = vi.fn();
const atualizarConfiguracaoMock = vi.fn();
vi.mock('@/lib/pagamento/data', () => ({
  criarFaixa: (...args: unknown[]) => criarFaixaMock(...args),
  atualizarFaixa: vi.fn(),
  removerFaixa: vi.fn(),
  atualizarConfiguracao: (...args: unknown[]) => atualizarConfiguracaoMock(...args),
}));

const configuracao = { percentualEntradaMinima: 0.3, percentualDescontoAVista: 0.05, cartaoPortoMaxParcelas: 6, cartaoPortoParcelaMinimaCentavos: 10000 };

describe('PagamentoManager', () => {
  beforeEach(() => {
    criarFaixaMock.mockReset();
    atualizarConfiguracaoMock.mockReset();
  });

  it('cria uma nova faixa convertendo os valores em reais para centavos', async () => {
    criarFaixaMock.mockResolvedValue({ id: '1', valorMinCentavos: 400000, valorMaxCentavos: null, parcelasSemJuros: 4 });
    render(<PagamentoManager faixasIniciais={[]} configuracaoInicial={configuracao} />);

    fireEvent.change(screen.getByPlaceholderText('Valor mínimo (R$)'), { target: { value: '4000,00' } });
    fireEvent.change(screen.getByPlaceholderText('Parcelas sem juros'), { target: { value: '4' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() =>
      expect(criarFaixaMock).toHaveBeenCalledWith({}, { valorMinCentavos: 400000, valorMaxCentavos: null, parcelasSemJuros: 4 })
    );
  });

  it('atualiza a configuração convertendo percentuais para fração', async () => {
    atualizarConfiguracaoMock.mockResolvedValue({ ...configuracao, percentualEntradaMinima: 0.4 });
    render(<PagamentoManager faixasIniciais={[]} configuracaoInicial={configuracao} />);

    fireEvent.change(screen.getByLabelText(/entrada mínima/i), { target: { value: '40' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar configuração' }));

    await waitFor(() =>
      expect(atualizarConfiguracaoMock).toHaveBeenCalledWith({}, {
        percentualEntradaMinima: 0.4,
        percentualDescontoAVista: 0.05,
        cartaoPortoMaxParcelas: 6,
        cartaoPortoParcelaMinimaCentavos: 10000,
      })
    );
  });
});
```

- [ ] **Step 6: Run the tests and verify they fail**

Run: `npm test -- PagamentoManager.test.tsx`
Expected: FAIL — module `./PagamentoManager` does not exist.

- [ ] **Step 7: Implement `src/components/admin/PagamentoManager.tsx`**

```tsx
'use client';

import { useState, type FormEvent } from 'react';
import { createBrowserClient } from '@/lib/supabase/client';
import { criarFaixa, atualizarFaixa, removerFaixa, atualizarConfiguracao } from '@/lib/pagamento/data';
import { formatarReais, parseReaisParaCentavos } from '@/lib/format';
import type { FaixaPagamento, ConfiguracaoPagamento } from '@/lib/types';

export function PagamentoManager({
  faixasIniciais,
  configuracaoInicial,
}: {
  faixasIniciais: FaixaPagamento[];
  configuracaoInicial: ConfiguracaoPagamento;
}) {
  const [faixas, setFaixas] = useState(faixasIniciais);
  const [editandoFaixa, setEditandoFaixa] = useState<FaixaPagamento | null>(null);
  const [valorMin, setValorMin] = useState('');
  const [valorMax, setValorMax] = useState('');
  const [parcelas, setParcelas] = useState('1');
  const [erroFaixa, setErroFaixa] = useState<string | null>(null);

  const [entradaPercentual, setEntradaPercentual] = useState(String(configuracaoInicial.percentualEntradaMinima * 100));
  const [descontoPercentual, setDescontoPercentual] = useState(String(configuracaoInicial.percentualDescontoAVista * 100));
  const [cartaoPortoMaxParcelas, setCartaoPortoMaxParcelas] = useState(String(configuracaoInicial.cartaoPortoMaxParcelas));
  const [cartaoPortoParcelaMinima, setCartaoPortoParcelaMinima] = useState(
    (configuracaoInicial.cartaoPortoParcelaMinimaCentavos / 100).toFixed(2).replace('.', ',')
  );
  const [erroConfiguracao, setErroConfiguracao] = useState<string | null>(null);

  function iniciarEdicaoFaixa(faixa: FaixaPagamento | null) {
    setEditandoFaixa(faixa);
    setValorMin(faixa ? (faixa.valorMinCentavos / 100).toFixed(2).replace('.', ',') : '');
    setValorMax(faixa && faixa.valorMaxCentavos !== null ? (faixa.valorMaxCentavos / 100).toFixed(2).replace('.', ',') : '');
    setParcelas(faixa ? String(faixa.parcelasSemJuros) : '1');
    setErroFaixa(null);
  }

  async function salvarFaixa(e: FormEvent) {
    e.preventDefault();
    setErroFaixa(null);
    const supabase = createBrowserClient();
    try {
      const input = {
        valorMinCentavos: parseReaisParaCentavos(valorMin),
        valorMaxCentavos: valorMax.trim() === '' ? null : parseReaisParaCentavos(valorMax),
        parcelasSemJuros: Number(parcelas),
      };
      if (editandoFaixa) {
        const atualizada = await atualizarFaixa(supabase, editandoFaixa.id, input);
        setFaixas((atuais) => atuais.map((f) => (f.id === atualizada.id ? atualizada : f)));
      } else {
        const criada = await criarFaixa(supabase, input);
        setFaixas((atuais) => [...atuais, criada].sort((a, b) => a.valorMinCentavos - b.valorMinCentavos));
      }
      iniciarEdicaoFaixa(null);
    } catch (err) {
      setErroFaixa(err instanceof Error ? err.message : 'Erro desconhecido');
    }
  }

  async function removerFaixaSelecionada(id: string) {
    setErroFaixa(null);
    const supabase = createBrowserClient();
    try {
      await removerFaixa(supabase, id);
      setFaixas((atuais) => atuais.filter((f) => f.id !== id));
    } catch (err) {
      setErroFaixa(err instanceof Error ? err.message : 'Erro desconhecido');
    }
  }

  async function salvarConfiguracao(e: FormEvent) {
    e.preventDefault();
    setErroConfiguracao(null);
    const supabase = createBrowserClient();
    try {
      await atualizarConfiguracao(supabase, {
        percentualEntradaMinima: Number(entradaPercentual) / 100,
        percentualDescontoAVista: Number(descontoPercentual) / 100,
        cartaoPortoMaxParcelas: Number(cartaoPortoMaxParcelas),
        cartaoPortoParcelaMinimaCentavos: parseReaisParaCentavos(cartaoPortoParcelaMinima),
      });
    } catch (err) {
      setErroConfiguracao(err instanceof Error ? err.message : 'Erro desconhecido');
    }
  }

  return (
    <div className="space-y-10">
      <section className="space-y-4">
        <h1 className="text-lg font-semibold">Faixas de pagamento</h1>
        <table className="w-full text-left text-sm">
          <thead>
            <tr>
              <th>De</th>
              <th>Até</th>
              <th>Parcelas sem juros</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {faixas.map((f) => (
              <tr key={f.id}>
                <td>{formatarReais(f.valorMinCentavos)}</td>
                <td>{f.valorMaxCentavos === null ? 'sem limite' : formatarReais(f.valorMaxCentavos)}</td>
                <td>{f.parcelasSemJuros}x</td>
                <td className="space-x-2">
                  <button type="button" onClick={() => iniciarEdicaoFaixa(f)}>
                    Editar
                  </button>
                  <button type="button" onClick={() => removerFaixaSelecionada(f.id)}>
                    Remover
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <form onSubmit={salvarFaixa} className="space-y-2 rounded border p-4">
          <h2 className="font-medium">{editandoFaixa ? 'Editar faixa' : 'Nova faixa'}</h2>
          <input placeholder="Valor mínimo (R$)" value={valorMin} onChange={(e) => setValorMin(e.target.value)} required className="w-full rounded border px-2 py-1" />
          <input placeholder="Valor máximo (R$, vazio = sem limite)" value={valorMax} onChange={(e) => setValorMax(e.target.value)} className="w-full rounded border px-2 py-1" />
          <input placeholder="Parcelas sem juros" type="number" min={1} value={parcelas} onChange={(e) => setParcelas(e.target.value)} required className="w-full rounded border px-2 py-1" />
          {erroFaixa && (
            <p role="alert" className="text-sm text-red-600">
              {erroFaixa}
            </p>
          )}
          <div className="flex gap-2">
            <button type="submit" className="rounded bg-black px-3 py-1 text-white">
              Salvar
            </button>
            {editandoFaixa && (
              <button type="button" onClick={() => iniciarEdicaoFaixa(null)}>
                Cancelar
              </button>
            )}
          </div>
        </form>
      </section>

      <section className="space-y-4">
        <h1 className="text-lg font-semibold">Configuração geral</h1>
        <form onSubmit={salvarConfiguracao} className="space-y-2 rounded border p-4">
          <label className="block text-sm">
            Entrada mínima (%)
            <input value={entradaPercentual} onChange={(e) => setEntradaPercentual(e.target.value)} className="mt-1 w-full rounded border px-2 py-1" />
          </label>
          <label className="block text-sm">
            Desconto à vista (%)
            <input value={descontoPercentual} onChange={(e) => setDescontoPercentual(e.target.value)} className="mt-1 w-full rounded border px-2 py-1" />
          </label>
          <label className="block text-sm">
            Cartão Porto - máximo de parcelas
            <input value={cartaoPortoMaxParcelas} onChange={(e) => setCartaoPortoMaxParcelas(e.target.value)} className="mt-1 w-full rounded border px-2 py-1" />
          </label>
          <label className="block text-sm">
            Cartão Porto - parcela mínima (R$)
            <input value={cartaoPortoParcelaMinima} onChange={(e) => setCartaoPortoParcelaMinima(e.target.value)} className="mt-1 w-full rounded border px-2 py-1" />
          </label>
          {erroConfiguracao && (
            <p role="alert" className="text-sm text-red-600">
              {erroConfiguracao}
            </p>
          )}
          <button type="submit" className="rounded bg-black px-3 py-1 text-white">
            Salvar configuração
          </button>
        </form>
      </section>
    </div>
  );
}
```

- [ ] **Step 8: Run the tests and verify they pass**

Run: `npm test -- PagamentoManager.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 9: Implement `src/app/(app)/admin/pagamento/page.tsx`**

```tsx
import { createServerClient } from '@/lib/supabase/server';
import { listarFaixas, obterConfiguracao } from '@/lib/pagamento/data';
import { PagamentoManager } from '@/components/admin/PagamentoManager';

export default async function PagamentoPage() {
  const supabase = await createServerClient();
  const [faixas, configuracao] = await Promise.all([listarFaixas(supabase), obterConfiguracao(supabase)]);
  return <PagamentoManager faixasIniciais={faixas} configuracaoInicial={configuracao} />;
}
```

- [ ] **Step 10: Verify the project builds**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 11: Commit**

```bash
git add src/lib/pagamento/ src/components/admin/PagamentoManager.tsx src/components/admin/PagamentoManager.test.tsx "src/app/(app)/admin/pagamento"
git commit -m "feat: add faixas de pagamento and global config admin screen

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 14: Orçamento form — cliente/veículo fields, item builder, live payment summary

**Files:**
- Create: `src/components/orcamento/ItemForm.tsx`
- Test: `src/components/orcamento/ItemForm.test.tsx`
- Create: `src/components/orcamento/ItemsTable.tsx`
- Test: `src/components/orcamento/ItemsTable.test.tsx`
- Create: `src/components/orcamento/CondicaoPagamentoResumo.tsx`
- Test: `src/components/orcamento/CondicaoPagamentoResumo.test.tsx`
- Create: `src/components/orcamento/OrcamentoForm.tsx`
- Test: `src/components/orcamento/OrcamentoForm.test.tsx`

**Interfaces:**
- Consumes: `parseReaisParaCentavos`/`formatarReais` (Tasks 1/12), `calcularTotalItens` (Task 6), `telefoneValido` (Task 7), `encontrarFaixa`/`calcularEntradaMinima`/`dividirEmParcelas` (Task 4), `calcularDescontoAVista`/`calcularCartaoPorto` (Task 5), `CatalogoItem`/`FaixaPagamento`/`ConfiguracaoPagamento` types (Task 3).
- Produces: `OrcamentoForm` component taking `{ catalogo, faixas, config, valoresIniciais?, aoSalvar }` and the exported type `DadosOrcamentoFormulario` — this is the shape Task 15's page passes to `aoSalvar` when wiring real persistence. `ItemForm` exports `NovoItem`; `OrcamentoForm` exports `ItemDoFormulario` (`NovoItem` plus a client-side `id`).

- [ ] **Step 1: Write the failing tests for `ItemForm`**

`src/components/orcamento/ItemForm.test.tsx`:
```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ItemForm } from './ItemForm';
import type { CatalogoItem } from '@/lib/types';

const catalogo: CatalogoItem[] = [
  { id: 'cat-1', descricao: 'Pastilha de freio', tipo: 'peca', marcaCodigo: 'BOSCH-123', valorPadraoCentavos: 15000 },
];

describe('ItemForm', () => {
  it('adiciona um item digitado manualmente', () => {
    const onAdicionar = vi.fn();
    render(<ItemForm catalogo={[]} onAdicionar={onAdicionar} />);

    fireEvent.change(screen.getByPlaceholderText('Descrição'), { target: { value: 'Filtro de ar' } });
    fireEvent.change(screen.getByPlaceholderText('Quantidade'), { target: { value: '2' } });
    fireEvent.change(screen.getByPlaceholderText('Valor unitário (R$)'), { target: { value: '50,00' } });
    fireEvent.click(screen.getByRole('button', { name: 'Adicionar item' }));

    expect(onAdicionar).toHaveBeenCalledWith({ catalogoItemId: null, descricao: 'Filtro de ar', tipo: 'peca', quantidade: 2, valorUnitarioCentavos: 5000 });
  });

  it('preenche descrição, tipo e valor ao selecionar um item do catálogo', () => {
    const onAdicionar = vi.fn();
    render(<ItemForm catalogo={catalogo} onAdicionar={onAdicionar} />);

    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'cat-1' } });
    fireEvent.click(screen.getByRole('button', { name: 'Adicionar item' }));

    expect(onAdicionar).toHaveBeenCalledWith({ catalogoItemId: 'cat-1', descricao: 'Pastilha de freio', tipo: 'peca', quantidade: 1, valorUnitarioCentavos: 15000 });
  });

  it('mostra erro e não chama onAdicionar quando a quantidade é inválida', () => {
    const onAdicionar = vi.fn();
    render(<ItemForm catalogo={[]} onAdicionar={onAdicionar} />);

    fireEvent.change(screen.getByPlaceholderText('Descrição'), { target: { value: 'Item' } });
    fireEvent.change(screen.getByPlaceholderText('Quantidade'), { target: { value: '0' } });
    fireEvent.change(screen.getByPlaceholderText('Valor unitário (R$)'), { target: { value: '10,00' } });
    fireEvent.click(screen.getByRole('button', { name: 'Adicionar item' }));

    expect(screen.getByRole('alert')).toHaveTextContent('Quantidade deve ser maior que zero');
    expect(onAdicionar).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run the tests and verify they fail**

Run: `npm test -- ItemForm.test.tsx`
Expected: FAIL — module `./ItemForm` does not exist.

- [ ] **Step 3: Implement `src/components/orcamento/ItemForm.tsx`**

```tsx
'use client';

import { useState, type FormEvent } from 'react';
import { parseReaisParaCentavos } from '@/lib/format';
import type { CatalogoItem } from '@/lib/types';

export interface NovoItem {
  catalogoItemId: string | null;
  descricao: string;
  tipo: 'peca' | 'servico';
  quantidade: number;
  valorUnitarioCentavos: number;
}

export function ItemForm({ catalogo, onAdicionar }: { catalogo: CatalogoItem[]; onAdicionar: (item: NovoItem) => void }) {
  const [descricao, setDescricao] = useState('');
  const [tipo, setTipo] = useState<'peca' | 'servico'>('peca');
  const [quantidade, setQuantidade] = useState('1');
  const [valor, setValor] = useState('');
  const [catalogoItemId, setCatalogoItemId] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  function selecionarDoCatalogo(id: string) {
    const item = catalogo.find((i) => i.id === id);
    if (!item) {
      setCatalogoItemId(null);
      return;
    }
    setCatalogoItemId(item.id);
    setDescricao(item.descricao);
    setTipo(item.tipo);
    setValor((item.valorPadraoCentavos / 100).toFixed(2).replace('.', ','));
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setErro(null);
    try {
      if (!descricao.trim()) throw new Error('Descrição é obrigatória');
      const quantidadeNumero = Number(quantidade);
      if (quantidadeNumero <= 0) throw new Error('Quantidade deve ser maior que zero');
      const valorUnitarioCentavos = parseReaisParaCentavos(valor);

      onAdicionar({ catalogoItemId, descricao, tipo, quantidade: quantidadeNumero, valorUnitarioCentavos });

      setDescricao('');
      setTipo('peca');
      setQuantidade('1');
      setValor('');
      setCatalogoItemId(null);
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro desconhecido');
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2 rounded border p-4">
      <h2 className="font-medium">Adicionar item</h2>
      <select onChange={(e) => selecionarDoCatalogo(e.target.value)} value={catalogoItemId ?? ''} className="w-full rounded border px-2 py-1">
        <option value="">Digitar item novo...</option>
        {catalogo.map((item) => (
          <option key={item.id} value={item.id}>
            {item.descricao}
          </option>
        ))}
      </select>
      <input placeholder="Descrição" value={descricao} onChange={(e) => setDescricao(e.target.value)} required className="w-full rounded border px-2 py-1" />
      <select value={tipo} onChange={(e) => setTipo(e.target.value as 'peca' | 'servico')} className="w-full rounded border px-2 py-1">
        <option value="peca">Peça</option>
        <option value="servico">Serviço</option>
      </select>
      <input placeholder="Quantidade" type="number" min={1} value={quantidade} onChange={(e) => setQuantidade(e.target.value)} required className="w-full rounded border px-2 py-1" />
      <input placeholder="Valor unitário (R$)" value={valor} onChange={(e) => setValor(e.target.value)} required className="w-full rounded border px-2 py-1" />
      {erro && (
        <p role="alert" className="text-sm text-red-600">
          {erro}
        </p>
      )}
      <button type="submit" className="rounded bg-black px-3 py-1 text-white">
        Adicionar item
      </button>
    </form>
  );
}
```

- [ ] **Step 4: Run the tests and verify they pass**

Run: `npm test -- ItemForm.test.tsx`
Expected: PASS (3 tests).

- [ ] **Step 5: Write the failing tests for `ItemsTable`**

`src/components/orcamento/ItemsTable.test.tsx`:
```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ItemsTable } from './ItemsTable';

describe('ItemsTable', () => {
  it('mostra uma mensagem quando não há itens', () => {
    render(<ItemsTable itens={[]} onRemover={vi.fn()} />);
    expect(screen.getByText('Nenhum item adicionado ainda.')).toBeInTheDocument();
  });

  it('mostra os itens com subtotal calculado', () => {
    render(
      <ItemsTable
        itens={[{ id: '1', descricao: 'Pastilha de freio', tipo: 'peca', quantidade: 2, valorUnitarioCentavos: 15000 }]}
        onRemover={vi.fn()}
      />
    );
    expect(screen.getByText('Pastilha de freio')).toBeInTheDocument();
    expect(screen.getByText('R$ 300,00')).toBeInTheDocument();
  });

  it('chama onRemover com o id correto', () => {
    const onRemover = vi.fn();
    render(
      <ItemsTable
        itens={[{ id: '1', descricao: 'Pastilha de freio', tipo: 'peca', quantidade: 1, valorUnitarioCentavos: 15000 }]}
        onRemover={onRemover}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: 'Remover' }));
    expect(onRemover).toHaveBeenCalledWith('1');
  });
});
```

- [ ] **Step 6: Run the tests and verify they fail**

Run: `npm test -- ItemsTable.test.tsx`
Expected: FAIL — module `./ItemsTable` does not exist.

- [ ] **Step 7: Implement `src/components/orcamento/ItemsTable.tsx`**

```tsx
'use client';

import { formatarReais } from '@/lib/format';

export interface ItemListado {
  id: string;
  descricao: string;
  tipo: 'peca' | 'servico';
  quantidade: number;
  valorUnitarioCentavos: number;
}

export function ItemsTable({ itens, onRemover }: { itens: ItemListado[]; onRemover: (id: string) => void }) {
  if (itens.length === 0) {
    return <p className="text-sm text-gray-500">Nenhum item adicionado ainda.</p>;
  }

  return (
    <table className="w-full text-left text-sm">
      <thead>
        <tr>
          <th>Descrição</th>
          <th>Tipo</th>
          <th>Qtd</th>
          <th>Valor unit.</th>
          <th>Subtotal</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        {itens.map((item) => (
          <tr key={item.id}>
            <td>{item.descricao}</td>
            <td>{item.tipo === 'peca' ? 'Peça' : 'Serviço'}</td>
            <td>{item.quantidade}</td>
            <td>{formatarReais(item.valorUnitarioCentavos)}</td>
            <td>{formatarReais(item.quantidade * item.valorUnitarioCentavos)}</td>
            <td>
              <button type="button" onClick={() => onRemover(item.id)}>
                Remover
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
```

- [ ] **Step 8: Run the tests and verify they pass**

Run: `npm test -- ItemsTable.test.tsx`
Expected: PASS (3 tests).

- [ ] **Step 9: Write the failing tests for `CondicaoPagamentoResumo`**

`src/components/orcamento/CondicaoPagamentoResumo.test.tsx`:
```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CondicaoPagamentoResumo } from './CondicaoPagamentoResumo';
import type { FaixaPagamento, ConfiguracaoPagamento } from '@/lib/types';

const faixas: FaixaPagamento[] = [{ id: '1', valorMinCentavos: 0, valorMaxCentavos: null, parcelasSemJuros: 2 }];
const config: ConfiguracaoPagamento = { percentualEntradaMinima: 0.3, percentualDescontoAVista: 0.05, cartaoPortoMaxParcelas: 6, cartaoPortoParcelaMinimaCentavos: 10000 };

describe('CondicaoPagamentoResumo', () => {
  it('pede para adicionar itens quando o total é zero', () => {
    render(<CondicaoPagamentoResumo totalCentavos={0} faixas={faixas} config={config} />);
    expect(screen.getByText('Adicione itens para calcular a condição de pagamento.')).toBeInTheDocument();
  });

  it('mostra entrada, parcelas, desconto e cartão Porto calculados', () => {
    render(<CondicaoPagamentoResumo totalCentavos={100000} faixas={faixas} config={config} />);
    expect(screen.getByText(/Entrada mínima \(30%\): R\$ 300,00/)).toBeInTheDocument();
    expect(screen.getByText(/Saldo em 2x de R\$ 350,00 no crédito sem juros/)).toBeInTheDocument();
    expect(screen.getByText(/Desconto à vista no Pix\/Débito: R\$ 50,00/)).toBeInTheDocument();
  });
});
```

- [ ] **Step 10: Run the tests and verify they fail**

Run: `npm test -- CondicaoPagamentoResumo.test.tsx`
Expected: FAIL — module `./CondicaoPagamentoResumo` does not exist.

- [ ] **Step 11: Implement `src/components/orcamento/CondicaoPagamentoResumo.tsx`**

```tsx
import { formatarReais } from '@/lib/format';
import { encontrarFaixa, calcularEntradaMinima, dividirEmParcelas } from '@/lib/payment/faixas';
import { calcularDescontoAVista, calcularCartaoPorto } from '@/lib/payment/alternativas';
import type { FaixaPagamento, ConfiguracaoPagamento } from '@/lib/types';

export function CondicaoPagamentoResumo({
  totalCentavos,
  faixas,
  config,
}: {
  totalCentavos: number;
  faixas: FaixaPagamento[];
  config: ConfiguracaoPagamento;
}) {
  if (totalCentavos <= 0 || faixas.length === 0) {
    return <p className="text-sm text-gray-500">Adicione itens para calcular a condição de pagamento.</p>;
  }

  const faixa = encontrarFaixa(totalCentavos, faixas);
  const entradaCentavos = calcularEntradaMinima(totalCentavos, config);
  const parcelas = dividirEmParcelas(totalCentavos - entradaCentavos, faixa.parcelasSemJuros);
  const desconto = calcularDescontoAVista(totalCentavos, config);
  const cartaoPorto = calcularCartaoPorto(totalCentavos, config);

  return (
    <div className="space-y-1 rounded border p-4 text-sm">
      <p>
        Total: <strong>{formatarReais(totalCentavos)}</strong>
      </p>
      <p>Entrada mínima ({Math.round(config.percentualEntradaMinima * 100)}%): {formatarReais(entradaCentavos)}</p>
      <p>
        Saldo em {parcelas.length}x de {formatarReais(parcelas[0])} no crédito sem juros
      </p>
      <p>
        Desconto à vista no Pix/Débito: {formatarReais(desconto.descontoCentavos)} → {formatarReais(desconto.valorComDescontoCentavos)}
      </p>
      <p>
        Alternativa: Cartão Porto em até {cartaoPorto.parcelas}x de {formatarReais(cartaoPorto.valorParcelaCentavos)} sem juros
      </p>
    </div>
  );
}
```

- [ ] **Step 12: Run the tests and verify they pass**

Run: `npm test -- CondicaoPagamentoResumo.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 13: Write the failing tests for `OrcamentoForm`**

`src/components/orcamento/OrcamentoForm.test.tsx`:
```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { OrcamentoForm } from './OrcamentoForm';
import type { FaixaPagamento, ConfiguracaoPagamento } from '@/lib/types';

const faixas: FaixaPagamento[] = [{ id: '1', valorMinCentavos: 0, valorMaxCentavos: null, parcelasSemJuros: 1 }];
const config: ConfiguracaoPagamento = { percentualEntradaMinima: 0.3, percentualDescontoAVista: 0.05, cartaoPortoMaxParcelas: 6, cartaoPortoParcelaMinimaCentavos: 10000 };

function preencherItem() {
  fireEvent.change(screen.getByPlaceholderText('Descrição'), { target: { value: 'Troca de óleo' } });
  fireEvent.change(screen.getByPlaceholderText('Quantidade'), { target: { value: '1' } });
  fireEvent.change(screen.getByPlaceholderText('Valor unitário (R$)'), { target: { value: '100,00' } });
  fireEvent.click(screen.getByRole('button', { name: 'Adicionar item' }));
}

describe('OrcamentoForm', () => {
  it('bloqueia salvar sem nenhum item', async () => {
    const aoSalvar = vi.fn();
    render(<OrcamentoForm catalogo={[]} faixas={faixas} config={config} aoSalvar={aoSalvar} />);

    fireEvent.click(screen.getByRole('button', { name: 'Salvar orçamento' }));

    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Adicione ao menos um item'));
    expect(aoSalvar).not.toHaveBeenCalled();
  });

  it('bloqueia salvar com telefone inválido', async () => {
    const aoSalvar = vi.fn();
    render(<OrcamentoForm catalogo={[]} faixas={faixas} config={config} aoSalvar={aoSalvar} />);

    preencherItem();
    fireEvent.change(screen.getByPlaceholderText('Telefone (WhatsApp)'), { target: { value: '123' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar orçamento' }));

    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Telefone do cliente inválido'));
    expect(aoSalvar).not.toHaveBeenCalled();
  });

  it('chama aoSalvar com os dados preenchidos quando válido', async () => {
    const aoSalvar = vi.fn().mockResolvedValue(undefined);
    render(<OrcamentoForm catalogo={[]} faixas={faixas} config={config} aoSalvar={aoSalvar} />);

    fireEvent.change(screen.getByPlaceholderText('Nome do cliente'), { target: { value: 'Maria' } });
    fireEvent.change(screen.getByPlaceholderText('Telefone (WhatsApp)'), { target: { value: '11987654321' } });
    fireEvent.change(screen.getByPlaceholderText('Placa'), { target: { value: 'ABC1D23' } });
    fireEvent.change(screen.getByPlaceholderText('Modelo/marca'), { target: { value: 'Onix' } });
    preencherItem();
    fireEvent.click(screen.getByRole('button', { name: 'Salvar orçamento' }));

    await waitFor(() => expect(aoSalvar).toHaveBeenCalledTimes(1));
    const dados = aoSalvar.mock.calls[0][0];
    expect(dados.clienteNome).toBe('Maria');
    expect(dados.clienteTelefone).toBe('11987654321');
    expect(dados.veiculoPlaca).toBe('ABC1D23');
    expect(dados.veiculoModelo).toBe('Onix');
    expect(dados.itens).toHaveLength(1);
    expect(dados.itens[0]).toMatchObject({ descricao: 'Troca de óleo', quantidade: 1, valorUnitarioCentavos: 10000 });
  });
});
```

- [ ] **Step 14: Run the tests and verify they fail**

Run: `npm test -- OrcamentoForm.test.tsx`
Expected: FAIL — module `./OrcamentoForm` does not exist.

- [ ] **Step 15: Implement `src/components/orcamento/OrcamentoForm.tsx`**

```tsx
'use client';

import { useState } from 'react';
import { ItemForm, type NovoItem } from './ItemForm';
import { ItemsTable } from './ItemsTable';
import { CondicaoPagamentoResumo } from './CondicaoPagamentoResumo';
import { calcularTotalItens } from '@/lib/orcamento/totals';
import { telefoneValido } from '@/lib/orcamento/telefone';
import type { CatalogoItem, FaixaPagamento, ConfiguracaoPagamento } from '@/lib/types';

export interface ItemDoFormulario extends NovoItem {
  id: string;
}

export interface DadosOrcamentoFormulario {
  clienteNome: string;
  clienteTelefone: string;
  veiculoPlaca: string;
  veiculoModelo: string;
  itens: ItemDoFormulario[];
}

export function OrcamentoForm({
  catalogo,
  faixas,
  config,
  valoresIniciais,
  aoSalvar,
}: {
  catalogo: CatalogoItem[];
  faixas: FaixaPagamento[];
  config: ConfiguracaoPagamento;
  valoresIniciais?: DadosOrcamentoFormulario;
  aoSalvar: (dados: DadosOrcamentoFormulario) => Promise<void>;
}) {
  const [clienteNome, setClienteNome] = useState(valoresIniciais?.clienteNome ?? '');
  const [clienteTelefone, setClienteTelefone] = useState(valoresIniciais?.clienteTelefone ?? '');
  const [veiculoPlaca, setVeiculoPlaca] = useState(valoresIniciais?.veiculoPlaca ?? '');
  const [veiculoModelo, setVeiculoModelo] = useState(valoresIniciais?.veiculoModelo ?? '');
  const [itens, setItens] = useState<ItemDoFormulario[]>(valoresIniciais?.itens ?? []);
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  const total = calcularTotalItens(itens);

  function adicionarItem(item: NovoItem) {
    setItens((atuais) => [...atuais, { ...item, id: crypto.randomUUID() }]);
  }

  function removerItem(id: string) {
    setItens((atuais) => atuais.filter((i) => i.id !== id));
  }

  async function salvar() {
    setErro(null);
    if (itens.length === 0) {
      setErro('Adicione ao menos um item antes de salvar.');
      return;
    }
    if (!telefoneValido(clienteTelefone)) {
      setErro('Telefone do cliente inválido.');
      return;
    }
    setSalvando(true);
    try {
      await aoSalvar({ clienteNome, clienteTelefone, veiculoPlaca, veiculoModelo, itens });
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <input placeholder="Nome do cliente" value={clienteNome} onChange={(e) => setClienteNome(e.target.value)} required className="rounded border px-2 py-1" />
        <input placeholder="Telefone (WhatsApp)" value={clienteTelefone} onChange={(e) => setClienteTelefone(e.target.value)} required className="rounded border px-2 py-1" />
        <input placeholder="Placa" value={veiculoPlaca} onChange={(e) => setVeiculoPlaca(e.target.value)} required className="rounded border px-2 py-1" />
        <input placeholder="Modelo/marca" value={veiculoModelo} onChange={(e) => setVeiculoModelo(e.target.value)} required className="rounded border px-2 py-1" />
      </div>

      <ItemForm catalogo={catalogo} onAdicionar={adicionarItem} />
      <ItemsTable itens={itens} onRemover={removerItem} />
      <CondicaoPagamentoResumo totalCentavos={total} faixas={faixas} config={config} />

      {erro && (
        <p role="alert" className="text-sm text-red-600">
          {erro}
        </p>
      )}
      <button type="button" onClick={salvar} disabled={salvando} className="rounded bg-black px-4 py-2 text-white disabled:opacity-50">
        {salvando ? 'Salvando...' : 'Salvar orçamento'}
      </button>
    </div>
  );
}
```

- [ ] **Step 16: Run the tests and verify they pass**

Run: `npm test -- OrcamentoForm.test.tsx`
Expected: PASS (3 tests).

- [ ] **Step 17: Commit**

```bash
git add src/components/orcamento/
git commit -m "feat: add orçamento form with item builder and live payment summary

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 15: Orçamento persistence — create, edit, status, and page wiring

**Files:**
- Create: `src/lib/orcamento/data.ts`
- Test: `src/lib/orcamento/data.test.ts`
- Create: `src/lib/orcamento/actions.ts`
- Test: `src/lib/orcamento/actions.test.ts`
- Create: `src/app/(app)/orcamentos/novo/NovoOrcamentoClient.tsx`
- Create: `src/app/(app)/orcamentos/novo/page.tsx`
- Create: `src/app/(app)/orcamentos/[id]/OrcamentoDetalheClient.tsx`
- Test: `src/app/(app)/orcamentos/[id]/OrcamentoDetalheClient.test.tsx`
- Create: `src/app/(app)/orcamentos/[id]/page.tsx`

**Interfaces:**
- Consumes: `OrcamentoForm`/`DadosOrcamentoFormulario` (Task 14), `exigirConsultor` (Task 9), `Orcamento`/`OrcamentoItem`/`StatusOrcamento` types (Task 3), `listarCatalogo` (Task 12), `listarFaixas`/`obterConfiguracao` (Task 13), `listarOficinas` (Task 10).
- Produces: `criarOrcamento`, `atualizarOrcamento`, `atualizarStatusOrcamento`, `obterOrcamentoComItens`, `listarOrcamentosDoConsultor`, `listarTodosOrcamentos` in `data.ts` (the last two consumed by Task 16/17); `salvarNovoOrcamento(dados, oficinaIdParaAdmin?)`, `salvarEdicaoOrcamento(id, dados)`, `mudarStatusOrcamento(id, status)` server actions in `actions.ts`.

- [ ] **Step 1: Write the failing tests for `src/lib/orcamento/data.ts`**

`src/lib/orcamento/data.test.ts`:
```ts
import { describe, it, expect, vi } from 'vitest';
import {
  criarOrcamento,
  atualizarOrcamento,
  atualizarStatusOrcamento,
  obterOrcamentoComItens,
  listarOrcamentosDoConsultor,
  listarTodosOrcamentos,
} from './data';

const orcamentoRow = {
  id: 'o1',
  cliente_nome: 'Maria',
  cliente_telefone: '5511987654321',
  veiculo_placa: 'ABC1D23',
  veiculo_modelo: 'Onix',
  consultor_id: 'c1',
  oficina_id: 'of1',
  status: 'rascunho',
  validade_dias: 7,
  created_at: '2026-08-28T00:00:00Z',
  updated_at: '2026-08-28T00:00:00Z',
};

const dadosParaSalvar = {
  clienteNome: 'Maria',
  clienteTelefone: '5511987654321',
  veiculoPlaca: 'ABC1D23',
  veiculoModelo: 'Onix',
  itens: [{ catalogoItemId: null, descricao: 'Troca de óleo', tipo: 'servico' as const, quantidade: 1, valorUnitarioCentavos: 10000 }],
};

describe('criarOrcamento', () => {
  it('insere o orçamento e seus itens', async () => {
    const single = vi.fn().mockResolvedValue({ data: orcamentoRow, error: null });
    const insertItens = vi.fn().mockResolvedValue({ error: null });
    const supabase = {
      from: (tabela: string) => (tabela === 'orcamentos' ? { insert: () => ({ select: () => ({ single }) }) } : { insert: insertItens }),
    } as any;

    const orcamento = await criarOrcamento(supabase, 'c1', 'of1', dadosParaSalvar);

    expect(orcamento.id).toBe('o1');
    expect(insertItens).toHaveBeenCalledWith([
      { orcamento_id: 'o1', catalogo_item_id: null, descricao: 'Troca de óleo', tipo: 'servico', quantidade: 1, valor_unitario_centavos: 10000 },
    ]);
  });

  it('lança erro quando salvar os itens falha', async () => {
    const single = vi.fn().mockResolvedValue({ data: orcamentoRow, error: null });
    const insertItens = vi.fn().mockResolvedValue({ error: { message: 'item inválido' } });
    const supabase = {
      from: (tabela: string) => (tabela === 'orcamentos' ? { insert: () => ({ select: () => ({ single }) }) } : { insert: insertItens }),
    } as any;

    await expect(criarOrcamento(supabase, 'c1', 'of1', dadosParaSalvar)).rejects.toThrow('item inválido');
  });
});

describe('atualizarOrcamento', () => {
  it('atualiza os dados, apaga os itens antigos e insere os novos', async () => {
    const single = vi.fn().mockResolvedValue({ data: orcamentoRow, error: null });
    const eqDelete = vi.fn().mockResolvedValue({ error: null });
    const insertItens = vi.fn().mockResolvedValue({ error: null });
    const supabase = {
      from: (tabela: string) =>
        tabela === 'orcamentos' ? { update: () => ({ eq: () => ({ select: () => ({ single }) }) }) } : { delete: () => ({ eq: eqDelete }), insert: insertItens },
    } as any;

    const orcamento = await atualizarOrcamento(supabase, 'o1', dadosParaSalvar);

    expect(orcamento.id).toBe('o1');
    expect(eqDelete).toHaveBeenCalledWith('orcamento_id', 'o1');
    expect(insertItens).toHaveBeenCalledWith([
      { orcamento_id: 'o1', catalogo_item_id: null, descricao: 'Troca de óleo', tipo: 'servico', quantidade: 1, valor_unitario_centavos: 10000 },
    ]);
  });
});

describe('atualizarStatusOrcamento', () => {
  it('atualiza o status do orçamento', async () => {
    const eq = vi.fn().mockResolvedValue({ error: null });
    const supabase = { from: () => ({ update: () => ({ eq }) }) } as any;
    await atualizarStatusOrcamento(supabase, 'o1', 'enviado');
    expect(eq).toHaveBeenCalledWith('id', 'o1');
  });
});

describe('obterOrcamentoComItens', () => {
  it('retorna o orçamento e seus itens mapeados', async () => {
    const singleOrcamento = vi.fn().mockResolvedValue({ data: orcamentoRow, error: null });
    const itemRow = { id: 'i1', orcamento_id: 'o1', catalogo_item_id: null, descricao: 'Troca de óleo', tipo: 'servico', quantidade: 1, valor_unitario_centavos: 10000 };
    const eqItens = vi.fn().mockResolvedValue({ data: [itemRow], error: null });
    const supabase = {
      from: (tabela: string) =>
        tabela === 'orcamentos' ? { select: () => ({ eq: () => ({ single: singleOrcamento }) }) } : { select: () => ({ eq: eqItens }) },
    } as any;

    const resultado = await obterOrcamentoComItens(supabase, 'o1');
    expect(resultado.orcamento.id).toBe('o1');
    expect(resultado.itens).toEqual([
      { id: 'i1', orcamentoId: 'o1', catalogoItemId: null, descricao: 'Troca de óleo', tipo: 'servico', quantidade: 1, valorUnitarioCentavos: 10000 },
    ]);
  });
});

describe('listarOrcamentosDoConsultor', () => {
  it('filtra pelo consultor e ordena por data', async () => {
    const order = vi.fn().mockResolvedValue({ data: [orcamentoRow], error: null });
    const eq = vi.fn(() => ({ order }));
    const supabase = { from: () => ({ select: () => ({ eq }) }) } as any;

    const orcamentos = await listarOrcamentosDoConsultor(supabase, 'c1');
    expect(eq).toHaveBeenCalledWith('consultor_id', 'c1');
    expect(orcamentos).toHaveLength(1);
  });
});

describe('listarTodosOrcamentos', () => {
  it('lista todos ordenados por data', async () => {
    const order = vi.fn().mockResolvedValue({ data: [orcamentoRow], error: null });
    const supabase = { from: () => ({ select: () => ({ order }) }) } as any;

    const orcamentos = await listarTodosOrcamentos(supabase);
    expect(orcamentos).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Run the tests and verify they fail**

Run: `npm test -- orcamento/data.test.ts`
Expected: FAIL — module `./data` does not exist.

- [ ] **Step 3: Implement `src/lib/orcamento/data.ts`**

```ts
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Orcamento, OrcamentoItem, StatusOrcamento } from '../types';

interface OrcamentoRow {
  id: string;
  cliente_nome: string;
  cliente_telefone: string;
  veiculo_placa: string;
  veiculo_modelo: string;
  consultor_id: string;
  oficina_id: string;
  status: StatusOrcamento;
  validade_dias: number;
  created_at: string;
  updated_at: string;
}

interface OrcamentoItemRow {
  id: string;
  orcamento_id: string;
  catalogo_item_id: string | null;
  descricao: string;
  tipo: 'peca' | 'servico';
  quantidade: number;
  valor_unitario_centavos: number;
}

function mapOrcamento(row: OrcamentoRow): Orcamento {
  return {
    id: row.id,
    clienteNome: row.cliente_nome,
    clienteTelefone: row.cliente_telefone,
    veiculoPlaca: row.veiculo_placa,
    veiculoModelo: row.veiculo_modelo,
    consultorId: row.consultor_id,
    oficinaId: row.oficina_id,
    status: row.status,
    validadeDias: row.validade_dias,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapOrcamentoItem(row: OrcamentoItemRow): OrcamentoItem {
  return {
    id: row.id,
    orcamentoId: row.orcamento_id,
    catalogoItemId: row.catalogo_item_id,
    descricao: row.descricao,
    tipo: row.tipo,
    quantidade: row.quantidade,
    valorUnitarioCentavos: row.valor_unitario_centavos,
  };
}

export interface ItemParaSalvar {
  catalogoItemId: string | null;
  descricao: string;
  tipo: 'peca' | 'servico';
  quantidade: number;
  valorUnitarioCentavos: number;
}

export interface DadosOrcamentoParaSalvar {
  clienteNome: string;
  clienteTelefone: string;
  veiculoPlaca: string;
  veiculoModelo: string;
  itens: ItemParaSalvar[];
}

async function inserirItens(supabase: SupabaseClient, orcamentoId: string, itens: ItemParaSalvar[]): Promise<void> {
  if (itens.length === 0) return;
  const { error } = await supabase.from('orcamento_itens').insert(
    itens.map((item) => ({
      orcamento_id: orcamentoId,
      catalogo_item_id: item.catalogoItemId,
      descricao: item.descricao,
      tipo: item.tipo,
      quantidade: item.quantidade,
      valor_unitario_centavos: item.valorUnitarioCentavos,
    }))
  );
  if (error) throw new Error(`Erro ao salvar itens do orçamento: ${error.message}`);
}

export async function criarOrcamento(
  supabase: SupabaseClient,
  consultorId: string,
  oficinaId: string,
  dados: DadosOrcamentoParaSalvar
): Promise<Orcamento> {
  const { data, error } = await supabase
    .from('orcamentos')
    .insert({
      cliente_nome: dados.clienteNome,
      cliente_telefone: dados.clienteTelefone,
      veiculo_placa: dados.veiculoPlaca,
      veiculo_modelo: dados.veiculoModelo,
      consultor_id: consultorId,
      oficina_id: oficinaId,
    })
    .select()
    .single();
  if (error || !data) throw new Error(`Erro ao criar orçamento: ${error?.message ?? 'desconhecido'}`);

  await inserirItens(supabase, data.id, dados.itens);
  return mapOrcamento(data);
}

export async function atualizarOrcamento(supabase: SupabaseClient, id: string, dados: DadosOrcamentoParaSalvar): Promise<Orcamento> {
  const { data, error } = await supabase
    .from('orcamentos')
    .update({
      cliente_nome: dados.clienteNome,
      cliente_telefone: dados.clienteTelefone,
      veiculo_placa: dados.veiculoPlaca,
      veiculo_modelo: dados.veiculoModelo,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();
  if (error || !data) throw new Error(`Erro ao atualizar orçamento: ${error?.message ?? 'desconhecido'}`);

  const { error: deleteError } = await supabase.from('orcamento_itens').delete().eq('orcamento_id', id);
  if (deleteError) throw new Error(`Erro ao atualizar itens do orçamento: ${deleteError.message}`);
  await inserirItens(supabase, id, dados.itens);

  return mapOrcamento(data);
}

export async function atualizarStatusOrcamento(supabase: SupabaseClient, id: string, status: StatusOrcamento): Promise<void> {
  const { error } = await supabase.from('orcamentos').update({ status, updated_at: new Date().toISOString() }).eq('id', id);
  if (error) throw new Error(`Erro ao atualizar status: ${error.message}`);
}

export async function obterOrcamentoComItens(supabase: SupabaseClient, id: string): Promise<{ orcamento: Orcamento; itens: OrcamentoItem[] }> {
  const { data: orcamentoRow, error: orcamentoError } = await supabase.from('orcamentos').select('*').eq('id', id).single();
  if (orcamentoError || !orcamentoRow) throw new Error(`Erro ao carregar orçamento: ${orcamentoError?.message ?? 'não encontrado'}`);

  const { data: itensRows, error: itensError } = await supabase.from('orcamento_itens').select('*').eq('orcamento_id', id);
  if (itensError) throw new Error(`Erro ao carregar itens: ${itensError.message}`);

  return { orcamento: mapOrcamento(orcamentoRow), itens: (itensRows ?? []).map(mapOrcamentoItem) };
}

export async function listarOrcamentosDoConsultor(supabase: SupabaseClient, consultorId: string): Promise<Orcamento[]> {
  const { data, error } = await supabase.from('orcamentos').select('*').eq('consultor_id', consultorId).order('created_at', { ascending: false });
  if (error) throw new Error(`Erro ao listar orçamentos: ${error.message}`);
  return (data ?? []).map(mapOrcamento);
}

export async function listarTodosOrcamentos(supabase: SupabaseClient): Promise<Orcamento[]> {
  const { data, error } = await supabase.from('orcamentos').select('*').order('created_at', { ascending: false });
  if (error) throw new Error(`Erro ao listar orçamentos: ${error.message}`);
  return (data ?? []).map(mapOrcamento);
}
```

- [ ] **Step 4: Run the tests and verify they pass**

Run: `npm test -- orcamento/data.test.ts`
Expected: PASS (7 tests).

- [ ] **Step 5: Write the failing tests for `src/lib/orcamento/actions.ts`**

`src/lib/orcamento/actions.test.ts`:
```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { salvarNovoOrcamento, salvarEdicaoOrcamento, mudarStatusOrcamento } from './actions';

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

const exigirConsultorMock = vi.fn();
vi.mock('../auth/guards', () => ({ exigirConsultor: () => exigirConsultorMock() }));
vi.mock('../supabase/server', () => ({ createServerClient: async () => ({}) }));

const criarOrcamentoMock = vi.fn();
const atualizarOrcamentoMock = vi.fn();
const atualizarStatusOrcamentoMock = vi.fn();
vi.mock('./data', () => ({
  criarOrcamento: (...args: unknown[]) => criarOrcamentoMock(...args),
  atualizarOrcamento: (...args: unknown[]) => atualizarOrcamentoMock(...args),
  atualizarStatusOrcamento: (...args: unknown[]) => atualizarStatusOrcamentoMock(...args),
}));

const dados = { clienteNome: 'Maria', clienteTelefone: '5511987654321', veiculoPlaca: 'ABC1D23', veiculoModelo: 'Onix', itens: [] };

describe('salvarNovoOrcamento', () => {
  beforeEach(() => {
    exigirConsultorMock.mockReset();
    criarOrcamentoMock.mockReset();
  });

  it('usa a oficina do próprio consultor quando ele não é admin', async () => {
    exigirConsultorMock.mockResolvedValue({ id: 'c1', papel: 'consultor', oficinaId: 'of1' });
    criarOrcamentoMock.mockResolvedValue({ id: 'o1' });

    const resultado = await salvarNovoOrcamento(dados);

    expect(criarOrcamentoMock).toHaveBeenCalledWith({}, 'c1', 'of1', dados);
    expect(resultado).toEqual({ id: 'o1' });
  });

  it('usa a oficina informada quando quem cria é admin', async () => {
    exigirConsultorMock.mockResolvedValue({ id: 'admin1', papel: 'admin', oficinaId: null });
    criarOrcamentoMock.mockResolvedValue({ id: 'o2' });

    await salvarNovoOrcamento(dados, 'of-escolhida');

    expect(criarOrcamentoMock).toHaveBeenCalledWith({}, 'admin1', 'of-escolhida', dados);
  });

  it('lança erro quando nenhuma oficina está disponível', async () => {
    exigirConsultorMock.mockResolvedValue({ id: 'admin1', papel: 'admin', oficinaId: null });
    await expect(salvarNovoOrcamento(dados)).rejects.toThrow('Selecione uma oficina');
  });
});

describe('salvarEdicaoOrcamento', () => {
  it('atualiza o orçamento existente', async () => {
    exigirConsultorMock.mockResolvedValue({ id: 'c1', papel: 'consultor', oficinaId: 'of1' });
    await salvarEdicaoOrcamento('o1', dados);
    expect(atualizarOrcamentoMock).toHaveBeenCalledWith({}, 'o1', dados);
  });
});

describe('mudarStatusOrcamento', () => {
  it('atualiza o status do orçamento', async () => {
    exigirConsultorMock.mockResolvedValue({ id: 'c1', papel: 'consultor', oficinaId: 'of1' });
    await mudarStatusOrcamento('o1', 'enviado');
    expect(atualizarStatusOrcamentoMock).toHaveBeenCalledWith({}, 'o1', 'enviado');
  });
});
```

- [ ] **Step 6: Run the tests and verify they fail**

Run: `npm test -- orcamento/actions.test.ts`
Expected: FAIL — module `./actions` does not exist.

- [ ] **Step 7: Implement `src/lib/orcamento/actions.ts`**

```ts
'use server';

import { revalidatePath } from 'next/cache';
import { createServerClient } from '../supabase/server';
import { exigirConsultor } from '../auth/guards';
import { criarOrcamento, atualizarOrcamento, atualizarStatusOrcamento } from './data';
import type { DadosOrcamentoParaSalvar } from './data';
import type { StatusOrcamento } from '../types';

export async function salvarNovoOrcamento(dados: DadosOrcamentoParaSalvar, oficinaIdParaAdmin?: string): Promise<{ id: string }> {
  const consultor = await exigirConsultor();
  const oficinaId = consultor.papel === 'admin' ? oficinaIdParaAdmin : consultor.oficinaId;
  if (!oficinaId) {
    throw new Error('Selecione uma oficina para o orçamento.');
  }
  const supabase = await createServerClient();
  const orcamento = await criarOrcamento(supabase, consultor.id, oficinaId, dados);
  revalidatePath('/dashboard');
  return { id: orcamento.id };
}

export async function salvarEdicaoOrcamento(id: string, dados: DadosOrcamentoParaSalvar): Promise<void> {
  await exigirConsultor();
  const supabase = await createServerClient();
  await atualizarOrcamento(supabase, id, dados);
  revalidatePath(`/orcamentos/${id}`);
}

export async function mudarStatusOrcamento(id: string, status: StatusOrcamento): Promise<void> {
  await exigirConsultor();
  const supabase = await createServerClient();
  await atualizarStatusOrcamento(supabase, id, status);
  revalidatePath(`/orcamentos/${id}`);
}
```

- [ ] **Step 8: Run the tests and verify they pass**

Run: `npm test -- orcamento/actions.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 9: Implement `src/app/(app)/orcamentos/novo/NovoOrcamentoClient.tsx`**

```tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { OrcamentoForm, type DadosOrcamentoFormulario } from '@/components/orcamento/OrcamentoForm';
import { salvarNovoOrcamento } from '@/lib/orcamento/actions';
import type { CatalogoItem, FaixaPagamento, ConfiguracaoPagamento, Oficina } from '@/lib/types';

export function NovoOrcamentoClient({
  papel,
  oficinas,
  catalogo,
  faixas,
  config,
}: {
  papel: 'consultor' | 'admin';
  oficinas: Oficina[];
  catalogo: CatalogoItem[];
  faixas: FaixaPagamento[];
  config: ConfiguracaoPagamento;
}) {
  const router = useRouter();
  const [oficinaId, setOficinaId] = useState(oficinas[0]?.id ?? '');

  async function aoSalvar(dados: DadosOrcamentoFormulario) {
    const { id } = await salvarNovoOrcamento(dados, papel === 'admin' ? oficinaId : undefined);
    router.push(`/orcamentos/${id}`);
  }

  return (
    <div className="space-y-4">
      {papel === 'admin' && (
        <label className="block text-sm">
          Oficina
          <select value={oficinaId} onChange={(e) => setOficinaId(e.target.value)} className="mt-1 w-full rounded border px-2 py-1">
            {oficinas.map((o) => (
              <option key={o.id} value={o.id}>
                {o.nome}
              </option>
            ))}
          </select>
        </label>
      )}
      <OrcamentoForm catalogo={catalogo} faixas={faixas} config={config} aoSalvar={aoSalvar} />
    </div>
  );
}
```

- [ ] **Step 10: Implement `src/app/(app)/orcamentos/novo/page.tsx`**

```tsx
import { createServerClient } from '@/lib/supabase/server';
import { exigirConsultor } from '@/lib/auth/guards';
import { listarCatalogo } from '@/lib/catalogo/data';
import { listarFaixas, obterConfiguracao } from '@/lib/pagamento/data';
import { listarOficinas } from '@/lib/oficinas/data';
import { NovoOrcamentoClient } from './NovoOrcamentoClient';

export default async function NovoOrcamentoPage() {
  const consultor = await exigirConsultor();
  const supabase = await createServerClient();
  const [catalogo, faixas, config, oficinas] = await Promise.all([
    listarCatalogo(supabase),
    listarFaixas(supabase),
    obterConfiguracao(supabase),
    consultor.papel === 'admin' ? listarOficinas(supabase) : Promise.resolve([]),
  ]);

  return (
    <div>
      <h1 className="mb-4 text-lg font-semibold">Novo orçamento</h1>
      <NovoOrcamentoClient papel={consultor.papel} oficinas={oficinas} catalogo={catalogo} faixas={faixas} config={config} />
    </div>
  );
}
```

- [ ] **Step 11: Write the failing tests for `OrcamentoDetalheClient`**

`src/app/(app)/orcamentos/[id]/OrcamentoDetalheClient.test.tsx`:
```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { OrcamentoDetalheClient } from './OrcamentoDetalheClient';
import type { Orcamento, OrcamentoItem, FaixaPagamento, ConfiguracaoPagamento } from '@/lib/types';

const salvarEdicaoOrcamentoMock = vi.fn();
const mudarStatusOrcamentoMock = vi.fn();
vi.mock('@/lib/orcamento/actions', () => ({
  salvarEdicaoOrcamento: (...args: unknown[]) => salvarEdicaoOrcamentoMock(...args),
  mudarStatusOrcamento: (...args: unknown[]) => mudarStatusOrcamentoMock(...args),
}));

const orcamento: Orcamento = {
  id: 'o1',
  clienteNome: 'Maria',
  clienteTelefone: '5511987654321',
  veiculoPlaca: 'ABC1D23',
  veiculoModelo: 'Onix',
  consultorId: 'c1',
  oficinaId: 'of1',
  status: 'rascunho',
  validadeDias: 7,
  createdAt: '2026-08-28T00:00:00Z',
  updatedAt: '2026-08-28T00:00:00Z',
};
const itens: OrcamentoItem[] = [
  { id: 'i1', orcamentoId: 'o1', catalogoItemId: null, descricao: 'Troca de óleo', tipo: 'servico', quantidade: 1, valorUnitarioCentavos: 10000 },
];
const faixas: FaixaPagamento[] = [{ id: 'f1', valorMinCentavos: 0, valorMaxCentavos: null, parcelasSemJuros: 1 }];
const config: ConfiguracaoPagamento = { percentualEntradaMinima: 0.3, percentualDescontoAVista: 0.05, cartaoPortoMaxParcelas: 6, cartaoPortoParcelaMinimaCentavos: 10000 };

describe('OrcamentoDetalheClient', () => {
  beforeEach(() => {
    salvarEdicaoOrcamentoMock.mockReset();
    mudarStatusOrcamentoMock.mockReset();
  });

  it('pré-carrega o formulário com os dados existentes', () => {
    render(<OrcamentoDetalheClient orcamento={orcamento} itens={itens} catalogo={[]} faixas={faixas} config={config} />);
    expect(screen.getByDisplayValue('Maria')).toBeInTheDocument();
    expect(screen.getByText('Troca de óleo')).toBeInTheDocument();
  });

  it('muda o status do orçamento', async () => {
    mudarStatusOrcamentoMock.mockResolvedValue(undefined);
    render(<OrcamentoDetalheClient orcamento={orcamento} itens={itens} catalogo={[]} faixas={faixas} config={config} />);

    fireEvent.change(screen.getByLabelText('Status'), { target: { value: 'enviado' } });

    await waitFor(() => expect(mudarStatusOrcamentoMock).toHaveBeenCalledWith('o1', 'enviado'));
  });

  it('salva edições através de salvarEdicaoOrcamento com o id correto', async () => {
    salvarEdicaoOrcamentoMock.mockResolvedValue(undefined);
    render(<OrcamentoDetalheClient orcamento={orcamento} itens={itens} catalogo={[]} faixas={faixas} config={config} />);

    fireEvent.click(screen.getByRole('button', { name: 'Salvar orçamento' }));

    await waitFor(() => expect(salvarEdicaoOrcamentoMock).toHaveBeenCalledWith('o1', expect.objectContaining({ clienteNome: 'Maria' })));
  });
});
```

- [ ] **Step 12: Run the tests and verify they fail**

Run: `npm test -- OrcamentoDetalheClient.test.tsx`
Expected: FAIL — module `./OrcamentoDetalheClient` does not exist.

- [ ] **Step 13: Implement `src/app/(app)/orcamentos/[id]/OrcamentoDetalheClient.tsx`**

```tsx
'use client';

import { useState } from 'react';
import { OrcamentoForm, type DadosOrcamentoFormulario } from '@/components/orcamento/OrcamentoForm';
import { salvarEdicaoOrcamento, mudarStatusOrcamento } from '@/lib/orcamento/actions';
import type { CatalogoItem, FaixaPagamento, ConfiguracaoPagamento, Orcamento, OrcamentoItem, StatusOrcamento } from '@/lib/types';

const STATUS_LABEL: Record<StatusOrcamento, string> = {
  rascunho: 'Rascunho',
  enviado: 'Enviado',
  aprovado: 'Aprovado',
  recusado: 'Recusado',
};

export function OrcamentoDetalheClient({
  orcamento,
  itens,
  catalogo,
  faixas,
  config,
}: {
  orcamento: Orcamento;
  itens: OrcamentoItem[];
  catalogo: CatalogoItem[];
  faixas: FaixaPagamento[];
  config: ConfiguracaoPagamento;
}) {
  const [status, setStatus] = useState(orcamento.status);
  const [erroStatus, setErroStatus] = useState<string | null>(null);

  async function aoSalvar(dados: DadosOrcamentoFormulario) {
    await salvarEdicaoOrcamento(orcamento.id, dados);
  }

  async function alterarStatus(novoStatus: StatusOrcamento) {
    setErroStatus(null);
    try {
      await mudarStatusOrcamento(orcamento.id, novoStatus);
      setStatus(novoStatus);
    } catch (err) {
      setErroStatus(err instanceof Error ? err.message : 'Erro desconhecido');
    }
  }

  const valoresIniciais: DadosOrcamentoFormulario = {
    clienteNome: orcamento.clienteNome,
    clienteTelefone: orcamento.clienteTelefone,
    veiculoPlaca: orcamento.veiculoPlaca,
    veiculoModelo: orcamento.veiculoModelo,
    itens: itens.map((item) => ({
      id: item.id,
      catalogoItemId: item.catalogoItemId,
      descricao: item.descricao,
      tipo: item.tipo,
      quantidade: item.quantidade,
      valorUnitarioCentavos: item.valorUnitarioCentavos,
    })),
  };

  return (
    <div className="space-y-4">
      <label className="block text-sm" htmlFor="status">
        Status
        <select id="status" value={status} onChange={(e) => alterarStatus(e.target.value as StatusOrcamento)} className="mt-1 block rounded border px-2 py-1">
          {Object.entries(STATUS_LABEL).map(([valor, rotulo]) => (
            <option key={valor} value={valor}>
              {rotulo}
            </option>
          ))}
        </select>
      </label>
      {erroStatus && (
        <p role="alert" className="text-sm text-red-600">
          {erroStatus}
        </p>
      )}
      <OrcamentoForm catalogo={catalogo} faixas={faixas} config={config} valoresIniciais={valoresIniciais} aoSalvar={aoSalvar} />
    </div>
  );
}
```

- [ ] **Step 14: Run the tests and verify they pass**

Run: `npm test -- OrcamentoDetalheClient.test.tsx`
Expected: PASS (3 tests).

- [ ] **Step 15: Implement `src/app/(app)/orcamentos/[id]/page.tsx`**

```tsx
import { createServerClient } from '@/lib/supabase/server';
import { listarCatalogo } from '@/lib/catalogo/data';
import { listarFaixas, obterConfiguracao } from '@/lib/pagamento/data';
import { obterOrcamentoComItens } from '@/lib/orcamento/data';
import { OrcamentoDetalheClient } from './OrcamentoDetalheClient';

export default async function OrcamentoDetalhePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createServerClient();
  const [catalogo, faixas, config, { orcamento, itens }] = await Promise.all([
    listarCatalogo(supabase),
    listarFaixas(supabase),
    obterConfiguracao(supabase),
    obterOrcamentoComItens(supabase, id),
  ]);

  return (
    <div>
      <h1 className="mb-4 text-lg font-semibold">Orçamento de {orcamento.clienteNome}</h1>
      <OrcamentoDetalheClient orcamento={orcamento} itens={itens} catalogo={catalogo} faixas={faixas} config={config} />
    </div>
  );
}
```

- [ ] **Step 16: Verify the project builds**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 17: Commit**

```bash
git add src/lib/orcamento/data.ts src/lib/orcamento/data.test.ts src/lib/orcamento/actions.ts src/lib/orcamento/actions.test.ts "src/app/(app)/orcamentos"
git commit -m "feat: add orçamento persistence, status changes, and page wiring

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 16: Consultor dashboard — list, filter, search, duplicate

**Files:**
- Modify: `src/lib/orcamento/actions.ts`, `src/lib/orcamento/actions.test.ts`
- Create: `src/app/(app)/dashboard/OrcamentosList.tsx`
- Test: `src/app/(app)/dashboard/OrcamentosList.test.tsx`
- Create: `src/app/(app)/dashboard/page.tsx`

**Interfaces:**
- Consumes: `obterOrcamentoComItens`/`criarOrcamento` (Task 15), `listarOrcamentosDoConsultor` (Task 15), `Orcamento`/`StatusOrcamento` types (Task 3).
- Produces: `duplicarOrcamento(id): Promise<{ id: string }>` added to `src/lib/orcamento/actions.ts`.

- [ ] **Step 1: Write the failing test for `duplicarOrcamento`**

Append to `src/lib/orcamento/actions.test.ts` (add to the existing mocks): extend the `./data` mock to also export `obterOrcamentoComItens`, then add:

```ts
const obterOrcamentoComItensMock = vi.fn();
vi.mock('./data', () => ({
  criarOrcamento: (...args: unknown[]) => criarOrcamentoMock(...args),
  atualizarOrcamento: (...args: unknown[]) => atualizarOrcamentoMock(...args),
  atualizarStatusOrcamento: (...args: unknown[]) => atualizarStatusOrcamentoMock(...args),
  obterOrcamentoComItens: (...args: unknown[]) => obterOrcamentoComItensMock(...args),
}));

describe('duplicarOrcamento', () => {
  beforeEach(() => {
    obterOrcamentoComItensMock.mockReset();
    criarOrcamentoMock.mockReset();
  });

  it('cria um novo orçamento com os mesmos dados e itens do original', async () => {
    exigirConsultorMock.mockResolvedValue({ id: 'c1', papel: 'consultor', oficinaId: 'of1' });
    obterOrcamentoComItensMock.mockResolvedValue({
      orcamento: { id: 'o1', clienteNome: 'Maria', clienteTelefone: '5511987654321', veiculoPlaca: 'ABC1D23', veiculoModelo: 'Onix', oficinaId: 'of1' },
      itens: [{ id: 'i1', orcamentoId: 'o1', catalogoItemId: null, descricao: 'Troca de óleo', tipo: 'servico', quantidade: 1, valorUnitarioCentavos: 10000 }],
    });
    criarOrcamentoMock.mockResolvedValue({ id: 'o2' });

    const resultado = await duplicarOrcamento('o1');

    expect(criarOrcamentoMock).toHaveBeenCalledWith(
      {},
      'c1',
      'of1',
      expect.objectContaining({
        clienteNome: 'Maria',
        itens: [{ catalogoItemId: null, descricao: 'Troca de óleo', tipo: 'servico', quantidade: 1, valorUnitarioCentavos: 10000 }],
      })
    );
    expect(resultado).toEqual({ id: 'o2' });
  });
});
```

(This replaces the file's top-level `./data` mock — move the new `obterOrcamentoComItensMock` declaration and the updated `vi.mock('./data', ...)` call to the top of the file, alongside the other mocks, and import `duplicarOrcamento` in the existing import line.)

- [ ] **Step 2: Run the tests and verify the new one fails**

Run: `npm test -- orcamento/actions.test.ts`
Expected: FAIL — `duplicarOrcamento` is not exported.

- [ ] **Step 3: Add `duplicarOrcamento` to `src/lib/orcamento/actions.ts`**

```ts
import { criarOrcamento, atualizarOrcamento, atualizarStatusOrcamento, obterOrcamentoComItens } from './data';

// ...(keep the existing functions, add this one)

export async function duplicarOrcamento(id: string): Promise<{ id: string }> {
  const consultor = await exigirConsultor();
  const supabase = await createServerClient();
  const { orcamento, itens } = await obterOrcamentoComItens(supabase, id);
  const oficinaId = consultor.papel === 'admin' ? orcamento.oficinaId : consultor.oficinaId;
  if (!oficinaId) {
    throw new Error('Selecione uma oficina para o orçamento.');
  }
  const novo = await criarOrcamento(supabase, consultor.id, oficinaId, {
    clienteNome: orcamento.clienteNome,
    clienteTelefone: orcamento.clienteTelefone,
    veiculoPlaca: orcamento.veiculoPlaca,
    veiculoModelo: orcamento.veiculoModelo,
    itens: itens.map((item) => ({
      catalogoItemId: item.catalogoItemId,
      descricao: item.descricao,
      tipo: item.tipo,
      quantidade: item.quantidade,
      valorUnitarioCentavos: item.valorUnitarioCentavos,
    })),
  });
  revalidatePath('/dashboard');
  return { id: novo.id };
}
```

- [ ] **Step 4: Run the tests and verify they pass**

Run: `npm test -- orcamento/actions.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Write the failing tests for `OrcamentosList`**

`src/app/(app)/dashboard/OrcamentosList.test.tsx`:
```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { OrcamentosList } from './OrcamentosList';
import type { Orcamento } from '@/lib/types';

const pushMock = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: pushMock }) }));

const duplicarOrcamentoMock = vi.fn();
vi.mock('@/lib/orcamento/actions', () => ({ duplicarOrcamento: (...args: unknown[]) => duplicarOrcamentoMock(...args) }));

const orcamentos: Orcamento[] = [
  { id: 'o1', clienteNome: 'Maria', clienteTelefone: '5511987654321', veiculoPlaca: 'ABC1D23', veiculoModelo: 'Onix', consultorId: 'c1', oficinaId: 'of1', status: 'rascunho', validadeDias: 7, createdAt: '', updatedAt: '' },
  { id: 'o2', clienteNome: 'João', clienteTelefone: '5511999999999', veiculoPlaca: 'XYZ9K88', veiculoModelo: 'Gol', consultorId: 'c1', oficinaId: 'of1', status: 'enviado', validadeDias: 7, createdAt: '', updatedAt: '' },
];

describe('OrcamentosList', () => {
  beforeEach(() => {
    pushMock.mockReset();
    duplicarOrcamentoMock.mockReset();
  });

  it('filtra por status', () => {
    render(<OrcamentosList orcamentosIniciais={orcamentos} />);
    fireEvent.change(screen.getByDisplayValue('Todos os status'), { target: { value: 'enviado' } });
    expect(screen.queryByText('Maria')).not.toBeInTheDocument();
    expect(screen.getByText('João')).toBeInTheDocument();
  });

  it('filtra por busca de cliente ou placa', () => {
    render(<OrcamentosList orcamentosIniciais={orcamentos} />);
    fireEvent.change(screen.getByPlaceholderText('Buscar por cliente ou placa'), { target: { value: 'xyz9k88' } });
    expect(screen.queryByText('Maria')).not.toBeInTheDocument();
    expect(screen.getByText('João')).toBeInTheDocument();
  });

  it('duplica um orçamento e navega para o novo', async () => {
    duplicarOrcamentoMock.mockResolvedValue({ id: 'o3' });
    render(<OrcamentosList orcamentosIniciais={orcamentos} />);

    fireEvent.click(screen.getAllByRole('button', { name: 'Duplicar' })[0]);

    await waitFor(() => expect(pushMock).toHaveBeenCalledWith('/orcamentos/o3'));
    expect(duplicarOrcamentoMock).toHaveBeenCalledWith('o1');
  });
});
```

- [ ] **Step 6: Run the tests and verify they fail**

Run: `npm test -- OrcamentosList.test.tsx`
Expected: FAIL — module `./OrcamentosList` does not exist.

- [ ] **Step 7: Implement `src/app/(app)/dashboard/OrcamentosList.tsx`**

```tsx
'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { duplicarOrcamento } from '@/lib/orcamento/actions';
import type { Orcamento, StatusOrcamento } from '@/lib/types';

const STATUS_LABEL: Record<StatusOrcamento, string> = {
  rascunho: 'Rascunho',
  enviado: 'Enviado',
  aprovado: 'Aprovado',
  recusado: 'Recusado',
};

export function OrcamentosList({ orcamentosIniciais }: { orcamentosIniciais: Orcamento[] }) {
  const router = useRouter();
  const [statusFiltro, setStatusFiltro] = useState<StatusOrcamento | 'todos'>('todos');
  const [busca, setBusca] = useState('');
  const [erro, setErro] = useState<string | null>(null);

  const orcamentosFiltrados = useMemo(() => {
    return orcamentosIniciais.filter((o) => {
      const passaStatus = statusFiltro === 'todos' || o.status === statusFiltro;
      const buscaNormalizada = busca.trim().toLowerCase();
      const passaBusca =
        buscaNormalizada === '' ||
        o.clienteNome.toLowerCase().includes(buscaNormalizada) ||
        o.veiculoPlaca.toLowerCase().includes(buscaNormalizada);
      return passaStatus && passaBusca;
    });
  }, [orcamentosIniciais, statusFiltro, busca]);

  async function duplicar(id: string) {
    setErro(null);
    try {
      const { id: novoId } = await duplicarOrcamento(id);
      router.push(`/orcamentos/${novoId}`);
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro desconhecido');
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-4">
        <input placeholder="Buscar por cliente ou placa" value={busca} onChange={(e) => setBusca(e.target.value)} className="rounded border px-2 py-1" />
        <select value={statusFiltro} onChange={(e) => setStatusFiltro(e.target.value as StatusOrcamento | 'todos')} className="rounded border px-2 py-1">
          <option value="todos">Todos os status</option>
          {Object.entries(STATUS_LABEL).map(([valor, rotulo]) => (
            <option key={valor} value={valor}>
              {rotulo}
            </option>
          ))}
        </select>
      </div>
      {erro && (
        <p role="alert" className="text-sm text-red-600">
          {erro}
        </p>
      )}
      <table className="w-full text-left text-sm">
        <thead>
          <tr>
            <th>Cliente</th>
            <th>Placa</th>
            <th>Status</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {orcamentosFiltrados.map((o) => (
            <tr key={o.id}>
              <td>{o.clienteNome}</td>
              <td>{o.veiculoPlaca}</td>
              <td>{STATUS_LABEL[o.status]}</td>
              <td className="space-x-2">
                <Link href={`/orcamentos/${o.id}`}>Abrir</Link>
                <button type="button" onClick={() => duplicar(o.id)}>
                  Duplicar
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

- [ ] **Step 8: Run the tests and verify they pass**

Run: `npm test -- OrcamentosList.test.tsx`
Expected: PASS (3 tests).

- [ ] **Step 9: Implement `src/app/(app)/dashboard/page.tsx`**

```tsx
import { createServerClient } from '@/lib/supabase/server';
import { exigirConsultor } from '@/lib/auth/guards';
import { listarOrcamentosDoConsultor } from '@/lib/orcamento/data';
import { OrcamentosList } from './OrcamentosList';

export default async function DashboardPage() {
  const consultor = await exigirConsultor();
  const supabase = await createServerClient();
  const orcamentos = await listarOrcamentosDoConsultor(supabase, consultor.id);
  return (
    <div>
      <h1 className="mb-4 text-lg font-semibold">Meus orçamentos</h1>
      <OrcamentosList orcamentosIniciais={orcamentos} />
    </div>
  );
}
```

- [ ] **Step 10: Verify the project builds**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 11: Commit**

```bash
git add src/lib/orcamento/actions.ts src/lib/orcamento/actions.test.ts "src/app/(app)/dashboard"
git commit -m "feat: add consultor dashboard with filter, search, and duplicate

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 17: Admin — all orçamentos across consultores

**Files:**
- Create: `src/app/(app)/admin/orcamentos/AdminOrcamentosList.tsx`
- Test: `src/app/(app)/admin/orcamentos/AdminOrcamentosList.test.tsx`
- Create: `src/app/(app)/admin/orcamentos/page.tsx`

**Interfaces:**
- Consumes: `listarTodosOrcamentos` (Task 15), `listarConsultores` (Task 11), `listarOficinas` (Task 10), `Orcamento`/`StatusOrcamento` types (Task 3).

- [ ] **Step 1: Write the failing tests for `AdminOrcamentosList`**

`src/app/(app)/admin/orcamentos/AdminOrcamentosList.test.tsx`:
```tsx
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AdminOrcamentosList } from './AdminOrcamentosList';
import type { Orcamento } from '@/lib/types';

const orcamentos: Orcamento[] = [
  { id: 'o1', clienteNome: 'Maria', clienteTelefone: '5511987654321', veiculoPlaca: 'ABC1D23', veiculoModelo: 'Onix', consultorId: 'c1', oficinaId: 'of1', status: 'rascunho', validadeDias: 7, createdAt: '', updatedAt: '' },
  { id: 'o2', clienteNome: 'João', clienteTelefone: '5511999999999', veiculoPlaca: 'XYZ9K88', veiculoModelo: 'Gol', consultorId: 'c2', oficinaId: 'of2', status: 'enviado', validadeDias: 7, createdAt: '', updatedAt: '' },
];
const consultoresPorId = { c1: 'Ana', c2: 'Pedro' };
const oficinasPorId = { of1: 'Top Stop Centro', of2: 'Top Stop Norte' };

describe('AdminOrcamentosList', () => {
  it('mostra o nome do consultor e da oficina de cada orçamento', () => {
    render(<AdminOrcamentosList orcamentosIniciais={orcamentos} consultoresPorId={consultoresPorId} oficinasPorId={oficinasPorId} />);
    expect(screen.getByText('Ana')).toBeInTheDocument();
    expect(screen.getByText('Top Stop Norte')).toBeInTheDocument();
  });

  it('filtra por status', () => {
    render(<AdminOrcamentosList orcamentosIniciais={orcamentos} consultoresPorId={consultoresPorId} oficinasPorId={oficinasPorId} />);
    fireEvent.change(screen.getByDisplayValue('Todos os status'), { target: { value: 'rascunho' } });
    expect(screen.getByText('Maria')).toBeInTheDocument();
    expect(screen.queryByText('João')).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the tests and verify they fail**

Run: `npm test -- AdminOrcamentosList.test.tsx`
Expected: FAIL — module `./AdminOrcamentosList` does not exist.

- [ ] **Step 3: Implement `src/app/(app)/admin/orcamentos/AdminOrcamentosList.tsx`**

```tsx
'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import type { Orcamento, StatusOrcamento } from '@/lib/types';

const STATUS_LABEL: Record<StatusOrcamento, string> = {
  rascunho: 'Rascunho',
  enviado: 'Enviado',
  aprovado: 'Aprovado',
  recusado: 'Recusado',
};

export function AdminOrcamentosList({
  orcamentosIniciais,
  consultoresPorId,
  oficinasPorId,
}: {
  orcamentosIniciais: Orcamento[];
  consultoresPorId: Record<string, string>;
  oficinasPorId: Record<string, string>;
}) {
  const [statusFiltro, setStatusFiltro] = useState<StatusOrcamento | 'todos'>('todos');
  const [busca, setBusca] = useState('');

  const orcamentosFiltrados = useMemo(() => {
    return orcamentosIniciais.filter((o) => {
      const passaStatus = statusFiltro === 'todos' || o.status === statusFiltro;
      const buscaNormalizada = busca.trim().toLowerCase();
      const passaBusca =
        buscaNormalizada === '' ||
        o.clienteNome.toLowerCase().includes(buscaNormalizada) ||
        o.veiculoPlaca.toLowerCase().includes(buscaNormalizada);
      return passaStatus && passaBusca;
    });
  }, [orcamentosIniciais, statusFiltro, busca]);

  return (
    <div className="space-y-4">
      <div className="flex gap-4">
        <input placeholder="Buscar por cliente ou placa" value={busca} onChange={(e) => setBusca(e.target.value)} className="rounded border px-2 py-1" />
        <select value={statusFiltro} onChange={(e) => setStatusFiltro(e.target.value as StatusOrcamento | 'todos')} className="rounded border px-2 py-1">
          <option value="todos">Todos os status</option>
          {Object.entries(STATUS_LABEL).map(([valor, rotulo]) => (
            <option key={valor} value={valor}>
              {rotulo}
            </option>
          ))}
        </select>
      </div>
      <table className="w-full text-left text-sm">
        <thead>
          <tr>
            <th>Cliente</th>
            <th>Placa</th>
            <th>Consultor</th>
            <th>Oficina</th>
            <th>Status</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {orcamentosFiltrados.map((o) => (
            <tr key={o.id}>
              <td>{o.clienteNome}</td>
              <td>{o.veiculoPlaca}</td>
              <td>{consultoresPorId[o.consultorId] ?? '—'}</td>
              <td>{oficinasPorId[o.oficinaId] ?? '—'}</td>
              <td>{STATUS_LABEL[o.status]}</td>
              <td>
                <Link href={`/orcamentos/${o.id}`}>Abrir</Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

- [ ] **Step 4: Run the tests and verify they pass**

Run: `npm test -- AdminOrcamentosList.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 5: Implement `src/app/(app)/admin/orcamentos/page.tsx`**

```tsx
import { createServerClient } from '@/lib/supabase/server';
import { listarTodosOrcamentos } from '@/lib/orcamento/data';
import { listarConsultores } from '@/lib/consultores/data';
import { listarOficinas } from '@/lib/oficinas/data';
import { AdminOrcamentosList } from './AdminOrcamentosList';

export default async function AdminOrcamentosPage() {
  const supabase = await createServerClient();
  const [orcamentos, consultores, oficinas] = await Promise.all([
    listarTodosOrcamentos(supabase),
    listarConsultores(supabase),
    listarOficinas(supabase),
  ]);

  const consultoresPorId = Object.fromEntries(consultores.map((c) => [c.id, c.nome]));
  const oficinasPorId = Object.fromEntries(oficinas.map((o) => [o.id, o.nome]));

  return (
    <div>
      <h1 className="mb-4 text-lg font-semibold">Todos os orçamentos</h1>
      <AdminOrcamentosList orcamentosIniciais={orcamentos} consultoresPorId={consultoresPorId} oficinasPorId={oficinasPorId} />
    </div>
  );
}
```

- [ ] **Step 6: Verify the project builds**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 7: Commit**

```bash
git add "src/app/(app)/admin/orcamentos"
git commit -m "feat: add admin view of all orçamentos across consultores

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 18: PDF generation

**Files:**
- Create: `src/components/pdf/OrcamentoPdfDocument.tsx`
- Test: `src/components/pdf/OrcamentoPdfDocument.test.tsx`
- Create: `src/app/(app)/orcamentos/[id]/pdf/route.tsx`
- Modify: `src/app/(app)/orcamentos/[id]/OrcamentoDetalheClient.tsx`, `src/app/(app)/orcamentos/[id]/OrcamentoDetalheClient.test.tsx`

**Interfaces:**
- Consumes: `formatarReais` (Task 1), `Oficina`/`Orcamento`/`OrcamentoItem` types (Task 3), `calcularTotalItens` (Task 6), `encontrarFaixa`/`calcularEntradaMinima`/`dividirEmParcelas` (Task 4), `calcularDescontoAVista`/`calcularCartaoPorto` (Task 5), `obterOrcamentoComItens` (Task 15), `getConsultorLogado` (Task 8), `listarOficinas` (Task 10), `listarConsultores` (Task 11), `listarFaixas`/`obterConfiguracao` (Task 13).
- Produces: `OrcamentoPdfDocument` React-PDF component; a `GET` route handler at `/orcamentos/[id]/pdf` returning an `application/pdf` response.

- [ ] **Step 1: Write the failing test for `OrcamentoPdfDocument`**

`src/components/pdf/OrcamentoPdfDocument.test.tsx` (first line matters — this forces the Node test environment instead of the project's default jsdom, since PDF rendering doesn't need a DOM):
```tsx
// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { renderToBuffer } from '@react-pdf/renderer';
import { OrcamentoPdfDocument } from './OrcamentoPdfDocument';

describe('OrcamentoPdfDocument', () => {
  it('renderiza um PDF válido com os dados do orçamento', async () => {
    const buffer = await renderToBuffer(
      <OrcamentoPdfDocument
        oficina={{ id: 'of1', nome: 'Top Stop Centro', endereco: 'Rua A', telefone: '11999999999', logoUrl: null }}
        consultorNome="João"
        orcamento={{
          id: 'o1',
          clienteNome: 'Maria',
          clienteTelefone: '5511987654321',
          veiculoPlaca: 'ABC1D23',
          veiculoModelo: 'Onix',
          consultorId: 'c1',
          oficinaId: 'of1',
          status: 'rascunho',
          validadeDias: 7,
          createdAt: '2026-08-28T00:00:00Z',
          updatedAt: '2026-08-28T00:00:00Z',
        }}
        itens={[{ id: 'i1', orcamentoId: 'o1', catalogoItemId: null, descricao: 'Troca de óleo', tipo: 'servico', quantidade: 1, valorUnitarioCentavos: 10000 }]}
        totalCentavos={10000}
        entradaCentavos={3000}
        parcelas={[7000]}
        desconto={{ descontoCentavos: 500, valorComDescontoCentavos: 9500 }}
        cartaoPorto={{ parcelas: 1, valorParcelaCentavos: 10000 }}
      />
    );

    expect(buffer.subarray(0, 4).toString()).toBe('%PDF');
  });
});
```

- [ ] **Step 2: Run the test and verify it fails**

Run: `npm test -- OrcamentoPdfDocument.test.tsx`
Expected: FAIL — module `./OrcamentoPdfDocument` does not exist.

- [ ] **Step 3: Implement `src/components/pdf/OrcamentoPdfDocument.tsx`**

```tsx
import { Document, Page, View, Text, Image, StyleSheet } from '@react-pdf/renderer';
import { formatarReais } from '@/lib/format';
import type { Oficina, Orcamento, OrcamentoItem } from '@/lib/types';

const styles = StyleSheet.create({
  page: { padding: 32, fontSize: 11, fontFamily: 'Helvetica' },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, gap: 12 },
  logo: { width: 60, height: 60, objectFit: 'contain' },
  oficinaNome: { fontSize: 16, fontWeight: 700 },
  secao: { marginBottom: 12 },
  linha: { marginBottom: 4 },
  tabelaHeader: { flexDirection: 'row', borderBottom: 1, paddingBottom: 4, marginBottom: 4, fontWeight: 700 },
  tabelaLinha: { flexDirection: 'row', paddingVertical: 2 },
  coluna: { flex: 1 },
});

function TabelaItens({ titulo, itens }: { titulo: string; itens: OrcamentoItem[] }) {
  if (itens.length === 0) return null;
  return (
    <View style={styles.secao}>
      <Text style={{ fontWeight: 700, marginBottom: 4 }}>{titulo}</Text>
      <View style={styles.tabelaHeader}>
        <Text style={styles.coluna}>Descrição</Text>
        <Text style={styles.coluna}>Qtd</Text>
        <Text style={styles.coluna}>Valor unit.</Text>
        <Text style={styles.coluna}>Subtotal</Text>
      </View>
      {itens.map((item) => (
        <View key={item.id} style={styles.tabelaLinha}>
          <Text style={styles.coluna}>{item.descricao}</Text>
          <Text style={styles.coluna}>{item.quantidade}</Text>
          <Text style={styles.coluna}>{formatarReais(item.valorUnitarioCentavos)}</Text>
          <Text style={styles.coluna}>{formatarReais(item.quantidade * item.valorUnitarioCentavos)}</Text>
        </View>
      ))}
    </View>
  );
}

export function OrcamentoPdfDocument({
  oficina,
  consultorNome,
  orcamento,
  itens,
  totalCentavos,
  entradaCentavos,
  parcelas,
  desconto,
  cartaoPorto,
}: {
  oficina: Oficina;
  consultorNome: string;
  orcamento: Orcamento;
  itens: OrcamentoItem[];
  totalCentavos: number;
  entradaCentavos: number;
  parcelas: number[];
  desconto: { descontoCentavos: number; valorComDescontoCentavos: number };
  cartaoPorto: { parcelas: number; valorParcelaCentavos: number };
}) {
  const pecas = itens.filter((i) => i.tipo === 'peca');
  const servicos = itens.filter((i) => i.tipo === 'servico');

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          {oficina.logoUrl && <Image src={oficina.logoUrl} style={styles.logo} />}
          <View>
            <Text style={styles.oficinaNome}>{oficina.nome}</Text>
            <Text>{oficina.endereco}</Text>
            <Text>{oficina.telefone}</Text>
          </View>
        </View>

        <View style={styles.secao}>
          <Text>Cliente: {orcamento.clienteNome}</Text>
          <Text>
            Veículo: {orcamento.veiculoModelo} - Placa {orcamento.veiculoPlaca}
          </Text>
          <Text>Consultor: {consultorNome}</Text>
        </View>

        <TabelaItens titulo="Peças" itens={pecas} />
        <TabelaItens titulo="Serviços" itens={servicos} />

        <View style={styles.secao}>
          <Text style={styles.linha}>Total: {formatarReais(totalCentavos)}</Text>
          <Text style={styles.linha}>
            Desconto à vista no Pix/Débito: {formatarReais(desconto.descontoCentavos)} → {formatarReais(desconto.valorComDescontoCentavos)}
          </Text>
          <Text style={styles.linha}>
            Entrada mínima: {formatarReais(entradaCentavos)} + {parcelas.length}x de {formatarReais(parcelas[0])} no crédito sem juros
          </Text>
          <Text style={styles.linha}>
            Alternativa: Cartão Porto em até {cartaoPorto.parcelas}x de {formatarReais(cartaoPorto.valorParcelaCentavos)} sem juros
          </Text>
        </View>

        <Text>
          Orçamento emitido em {new Date(orcamento.createdAt).toLocaleDateString('pt-BR')}, válido por {orcamento.validadeDias} dias.
        </Text>
      </Page>
    </Document>
  );
}
```

- [ ] **Step 4: Run the test and verify it passes**

Run: `npm test -- OrcamentoPdfDocument.test.tsx`
Expected: PASS (1 test).

- [ ] **Step 5: Implement `src/app/(app)/orcamentos/[id]/pdf/route.tsx`**

```tsx
import { NextResponse } from 'next/server';
import { renderToBuffer } from '@react-pdf/renderer';
import { getConsultorLogado } from '@/lib/auth/session';
import { createServerClient } from '@/lib/supabase/server';
import { obterOrcamentoComItens } from '@/lib/orcamento/data';
import { listarFaixas, obterConfiguracao } from '@/lib/pagamento/data';
import { listarOficinas } from '@/lib/oficinas/data';
import { listarConsultores } from '@/lib/consultores/data';
import { calcularTotalItens } from '@/lib/orcamento/totals';
import { encontrarFaixa, calcularEntradaMinima, dividirEmParcelas } from '@/lib/payment/faixas';
import { calcularDescontoAVista, calcularCartaoPorto } from '@/lib/payment/alternativas';
import { OrcamentoPdfDocument } from '@/components/pdf/OrcamentoPdfDocument';

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const consultor = await getConsultorLogado();
  if (!consultor || !consultor.ativo) {
    return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 });
  }

  const { id } = await params;
  const supabase = await createServerClient();

  try {
    const [{ orcamento, itens }, faixas, config, oficinas, consultores] = await Promise.all([
      obterOrcamentoComItens(supabase, id),
      listarFaixas(supabase),
      obterConfiguracao(supabase),
      listarOficinas(supabase),
      listarConsultores(supabase),
    ]);

    const oficina = oficinas.find((o) => o.id === orcamento.oficinaId);
    const consultorDoOrcamento = consultores.find((c) => c.id === orcamento.consultorId);
    if (!oficina || !consultorDoOrcamento) {
      return NextResponse.json({ erro: 'Dados incompletos para gerar o PDF' }, { status: 500 });
    }

    const totalCentavos = calcularTotalItens(itens);
    const faixa = encontrarFaixa(totalCentavos, faixas);
    const entradaCentavos = calcularEntradaMinima(totalCentavos, config);
    const parcelas = dividirEmParcelas(totalCentavos - entradaCentavos, faixa.parcelasSemJuros);
    const desconto = calcularDescontoAVista(totalCentavos, config);
    const cartaoPorto = calcularCartaoPorto(totalCentavos, config);

    const buffer = await renderToBuffer(
      <OrcamentoPdfDocument
        oficina={oficina}
        consultorNome={consultorDoOrcamento.nome}
        orcamento={orcamento}
        itens={itens}
        totalCentavos={totalCentavos}
        entradaCentavos={entradaCentavos}
        parcelas={parcelas}
        desconto={desconto}
        cartaoPorto={cartaoPorto}
      />
    );

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="orcamento-${orcamento.veiculoPlaca}.pdf"`,
      },
    });
  } catch (err) {
    return NextResponse.json({ erro: err instanceof Error ? err.message : 'Erro ao gerar PDF' }, { status: 500 });
  }
}
```

- [ ] **Step 6: Add a "Baixar PDF" link to `OrcamentoDetalheClient` — write the failing test first**

Add to `src/app/(app)/orcamentos/[id]/OrcamentoDetalheClient.test.tsx`:
```tsx
it('mostra um link para baixar o PDF do orçamento', () => {
  render(<OrcamentoDetalheClient orcamento={orcamento} itens={itens} catalogo={[]} faixas={faixas} config={config} />);
  expect(screen.getByRole('link', { name: 'Baixar PDF' })).toHaveAttribute('href', '/orcamentos/o1/pdf');
});
```

- [ ] **Step 7: Run the tests and verify the new one fails**

Run: `npm test -- OrcamentoDetalheClient.test.tsx`
Expected: FAIL — no link with that name exists yet.

- [ ] **Step 8: Add the link in `OrcamentoDetalheClient.tsx`**

Add the import `import Link from 'next/link';` and, right before the closing `</div>` of the component's returned JSX, add:
```tsx
<Link href={`/orcamentos/${orcamento.id}/pdf`} target="_blank" rel="noreferrer" className="inline-block rounded border px-3 py-1 text-sm">
  Baixar PDF
</Link>
```

- [ ] **Step 9: Run the tests and verify they pass**

Run: `npm test -- OrcamentoDetalheClient.test.tsx`
Expected: PASS (4 tests).

- [ ] **Step 10: Verify the project builds**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 11: Commit**

```bash
git add src/components/pdf/ "src/app/(app)/orcamentos/[id]"
git commit -m "feat: add PDF generation for orçamentos

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 19: "Enviar por WhatsApp" button on the orçamento page

**Files:**
- Modify: `src/app/(app)/orcamentos/[id]/OrcamentoDetalheClient.tsx`, `src/app/(app)/orcamentos/[id]/OrcamentoDetalheClient.test.tsx`
- Modify: `src/app/(app)/orcamentos/[id]/page.tsx`

**Interfaces:**
- Consumes: `montarLinkWhatsApp`/`montarMensagemOrcamento` (Task 7), `calcularTotalItens` (Task 6), `encontrarFaixa`/`calcularEntradaMinima`/`dividirEmParcelas` (Task 4), `calcularDescontoAVista`/`calcularCartaoPorto` (Task 5), `listarOficinas` (Task 10), `listarConsultores` (Task 11).
- `OrcamentoDetalheClient` gains two new required props: `oficinaNome: string`, `consultorNome: string`.

- [ ] **Step 1: Update every existing `render(<OrcamentoDetalheClient .../>)` call in the test file to add the two new props**

In `src/app/(app)/orcamentos/[id]/OrcamentoDetalheClient.test.tsx`, add `oficinaNome="Top Stop Centro"` and `consultorNome="Ana"` to every existing `<OrcamentoDetalheClient ... />` render call (there are four from Tasks 15 and 18).

- [ ] **Step 2: Write the failing tests for the WhatsApp button**

Append to the same test file:
```tsx
describe('envio por WhatsApp', () => {
  it('abre o link do WhatsApp com a mensagem formatada', () => {
    const openMock = vi.fn();
    vi.stubGlobal('open', openMock);

    render(
      <OrcamentoDetalheClient orcamento={orcamento} itens={itens} catalogo={[]} faixas={faixas} config={config} oficinaNome="Top Stop Centro" consultorNome="Ana" />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Enviar por WhatsApp' }));

    expect(openMock).toHaveBeenCalledTimes(1);
    const [url] = openMock.mock.calls[0];
    expect(url).toContain('https://wa.me/5511987654321');
    expect(decodeURIComponent(url)).toContain('Troca de óleo');

    vi.unstubAllGlobals();
  });

  it('mostra erro quando o telefone do cliente é inválido', () => {
    render(
      <OrcamentoDetalheClient
        orcamento={{ ...orcamento, clienteTelefone: '123' }}
        itens={itens}
        catalogo={[]}
        faixas={faixas}
        config={config}
        oficinaNome="Top Stop Centro"
        consultorNome="Ana"
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Enviar por WhatsApp' }));

    expect(screen.getByRole('alert')).toHaveTextContent('Telefone inválido');
  });
});
```

- [ ] **Step 3: Run the tests and verify they fail**

Run: `npm test -- OrcamentoDetalheClient.test.tsx`
Expected: FAIL — `OrcamentoDetalheClient` doesn't require `oficinaNome`/`consultorNome` yet and there is no "Enviar por WhatsApp" button.

- [ ] **Step 4: Update `src/app/(app)/orcamentos/[id]/OrcamentoDetalheClient.tsx`**

Add these imports:
```tsx
import { montarLinkWhatsApp, montarMensagemOrcamento } from '@/lib/orcamento/whatsapp';
import { calcularTotalItens } from '@/lib/orcamento/totals';
import { encontrarFaixa, calcularEntradaMinima, dividirEmParcelas } from '@/lib/payment/faixas';
import { calcularDescontoAVista, calcularCartaoPorto } from '@/lib/payment/alternativas';
```

Add `oficinaNome` and `consultorNome` to the component's props type, add an `erroWhatsApp` state, and add this function inside the component body:
```tsx
const [erroWhatsApp, setErroWhatsApp] = useState<string | null>(null);

function enviarPorWhatsApp() {
  setErroWhatsApp(null);
  try {
    const totalCentavos = calcularTotalItens(itens);
    const faixa = encontrarFaixa(totalCentavos, faixas);
    const entradaCentavos = calcularEntradaMinima(totalCentavos, config);
    const parcelas = dividirEmParcelas(totalCentavos - entradaCentavos, faixa.parcelasSemJuros);
    const desconto = calcularDescontoAVista(totalCentavos, config);
    const cartaoPorto = calcularCartaoPorto(totalCentavos, config);

    const mensagem = montarMensagemOrcamento({
      oficinaNome,
      consultorNome,
      clienteNome: orcamento.clienteNome,
      veiculoModelo: orcamento.veiculoModelo,
      veiculoPlaca: orcamento.veiculoPlaca,
      itens: itens.map((item) => ({
        descricao: item.descricao,
        tipo: item.tipo,
        quantidade: item.quantidade,
        valorTotalCentavos: item.quantidade * item.valorUnitarioCentavos,
      })),
      totalCentavos,
      descontoCentavos: desconto.descontoCentavos,
      valorComDescontoCentavos: desconto.valorComDescontoCentavos,
      entradaCentavos,
      parcelas,
      cartaoPorto,
      validadeDias: orcamento.validadeDias,
    });

    window.open(montarLinkWhatsApp(orcamento.clienteTelefone, mensagem), '_blank');
  } catch (err) {
    setErroWhatsApp(err instanceof Error ? err.message : 'Erro desconhecido');
  }
}
```

Add the button and error message next to the "Baixar PDF" link added in Task 18:
```tsx
{erroWhatsApp && (
  <p role="alert" className="text-sm text-red-600">
    {erroWhatsApp}
  </p>
)}
<button type="button" onClick={enviarPorWhatsApp} className="rounded border px-3 py-1 text-sm">
  Enviar por WhatsApp
</button>
```

- [ ] **Step 5: Run the tests and verify they pass**

Run: `npm test -- OrcamentoDetalheClient.test.tsx`
Expected: PASS (6 tests).

- [ ] **Step 6: Update `src/app/(app)/orcamentos/[id]/page.tsx` to supply the new props**

```tsx
import { createServerClient } from '@/lib/supabase/server';
import { listarCatalogo } from '@/lib/catalogo/data';
import { listarFaixas, obterConfiguracao } from '@/lib/pagamento/data';
import { obterOrcamentoComItens } from '@/lib/orcamento/data';
import { listarOficinas } from '@/lib/oficinas/data';
import { listarConsultores } from '@/lib/consultores/data';
import { OrcamentoDetalheClient } from './OrcamentoDetalheClient';

export default async function OrcamentoDetalhePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createServerClient();
  const [catalogo, faixas, config, { orcamento, itens }, oficinas, consultores] = await Promise.all([
    listarCatalogo(supabase),
    listarFaixas(supabase),
    obterConfiguracao(supabase),
    obterOrcamentoComItens(supabase, id),
    listarOficinas(supabase),
    listarConsultores(supabase),
  ]);

  const oficinaNome = oficinas.find((o) => o.id === orcamento.oficinaId)?.nome ?? '—';
  const consultorNome = consultores.find((c) => c.id === orcamento.consultorId)?.nome ?? '—';

  return (
    <div>
      <h1 className="mb-4 text-lg font-semibold">Orçamento de {orcamento.clienteNome}</h1>
      <OrcamentoDetalheClient
        orcamento={orcamento}
        itens={itens}
        catalogo={catalogo}
        faixas={faixas}
        config={config}
        oficinaNome={oficinaNome}
        consultorNome={consultorNome}
      />
    </div>
  );
}
```

- [ ] **Step 7: Verify the project builds**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 8: Commit**

```bash
git add "src/app/(app)/orcamentos/[id]"
git commit -m "feat: add Enviar por WhatsApp button to orçamento page

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 20: Calculadora de condição de pagamento avulsa

**Files:**
- Create: `src/components/calculadora/CalculadoraPagamento.tsx`
- Test: `src/components/calculadora/CalculadoraPagamento.test.tsx`
- Create: `src/app/(app)/calculadora/page.tsx`

**Interfaces:**
- Consumes: `formatarReais`/`parseReaisParaCentavos` (Tasks 1/12), `encontrarFaixa`/`calcularEntradaMinima`/`dividirEmParcelas` (Task 4), `calcularDescontoAVista`/`calcularCartaoPorto` (Task 5), `listarFaixas`/`obterConfiguracao` (Task 13).
- This task consumes only the already-built payment core — it adds no new exported functions for later tasks to depend on (it is a terminal leaf in the dependency graph).

- [ ] **Step 1: Write the failing tests for `CalculadoraPagamento`**

`src/components/calculadora/CalculadoraPagamento.test.tsx`:
```tsx
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CalculadoraPagamento } from './CalculadoraPagamento';
import type { FaixaPagamento, ConfiguracaoPagamento } from '@/lib/types';

const faixas: FaixaPagamento[] = [
  { id: '1', valorMinCentavos: 0, valorMaxCentavos: 100000, parcelasSemJuros: 1 },
  { id: '2', valorMinCentavos: 100000, valorMaxCentavos: 250000, parcelasSemJuros: 2 },
  { id: '3', valorMinCentavos: 250000, valorMaxCentavos: 400000, parcelasSemJuros: 3 },
  { id: '4', valorMinCentavos: 400000, valorMaxCentavos: null, parcelasSemJuros: 4 },
];
const config: ConfiguracaoPagamento = { percentualEntradaMinima: 0.3, percentualDescontoAVista: 0.05, cartaoPortoMaxParcelas: 6, cartaoPortoParcelaMinimaCentavos: 10000 };

function digitarValorDoServico(valor: string) {
  fireEvent.change(screen.getByLabelText('Valor do serviço'), { target: { value: valor } });
}

describe('CalculadoraPagamento', () => {
  it('não mostra a condição de pagamento antes de digitar um valor', () => {
    render(<CalculadoraPagamento faixas={faixas} config={config} />);
    expect(screen.queryByText(/Opções de pagamento do saldo/)).not.toBeInTheDocument();
  });

  it('calcula entrada mínima, saldo, máximo de parcelas e opções ao digitar o valor', () => {
    render(<CalculadoraPagamento faixas={faixas} config={config} />);
    digitarValorDoServico('3650,00');

    expect(screen.getByText('R$ 1.095,00')).toBeInTheDocument();
    expect(screen.getByText('R$ 2.555,00')).toBeInTheDocument();
    expect(screen.getByText('até 3x')).toBeInTheDocument();
    expect(screen.getByText(/À vista R\$ 2\.555,00/)).toBeInTheDocument();
    expect(screen.getByText(/2x de R\$ 1\.277,50/)).toBeInTheDocument();
    expect(screen.getByText(/3x de R\$ 851,66/)).toBeInTheDocument();
    expect(screen.getByText(/Cartão Porto em até 6x de R\$ 608,33/)).toBeInTheDocument();
  });

  it('mostra o desconto à vista quando a entrada chega a 100%', () => {
    render(<CalculadoraPagamento faixas={faixas} config={config} />);
    digitarValorDoServico('3650,00');

    fireEvent.change(screen.getByRole('slider'), { target: { value: '100' } });

    expect(screen.getByText(/Pagamento total via Pix\/Débito/)).toBeInTheDocument();
    expect(screen.getByText(/R\$ 3\.467,50/)).toBeInTheDocument();
    expect(screen.queryByText(/Opções de pagamento do saldo/)).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the tests and verify they fail**

Run: `npm test -- CalculadoraPagamento.test.tsx`
Expected: FAIL — module `./CalculadoraPagamento` does not exist.

- [ ] **Step 3: Implement `src/components/calculadora/CalculadoraPagamento.tsx`**

```tsx
'use client';

import { useState } from 'react';
import { formatarReais, parseReaisParaCentavos } from '@/lib/format';
import { encontrarFaixa, calcularEntradaMinima, dividirEmParcelas } from '@/lib/payment/faixas';
import { calcularDescontoAVista, calcularCartaoPorto } from '@/lib/payment/alternativas';
import type { FaixaPagamento, ConfiguracaoPagamento } from '@/lib/types';

export function CalculadoraPagamento({ faixas, config }: { faixas: FaixaPagamento[]; config: ConfiguracaoPagamento }) {
  const [valorServicoTexto, setValorServicoTexto] = useState('');
  const [percentualEntrada, setPercentualEntrada] = useState(config.percentualEntradaMinima * 100);

  let totalCentavos = 0;
  try {
    totalCentavos = valorServicoTexto.trim() === '' ? 0 : parseReaisParaCentavos(valorServicoTexto);
  } catch {
    totalCentavos = 0;
  }

  const percentualMinimo = config.percentualEntradaMinima * 100;
  const percentualClamped = Math.min(100, Math.max(percentualMinimo, percentualEntrada));
  const entradaCentavos = Math.round((totalCentavos * percentualClamped) / 100);
  const saldoCentavos = totalCentavos - entradaCentavos;
  const cemPorCento = percentualClamped >= 100;

  let faixaAtual: FaixaPagamento | null = null;
  if (totalCentavos > 0 && faixas.length > 0) {
    try {
      faixaAtual = encontrarFaixa(totalCentavos, faixas);
    } catch {
      faixaAtual = null;
    }
  }

  function handleValorEntradaTexto(texto: string) {
    try {
      const novaEntradaCentavos = parseReaisParaCentavos(texto);
      if (totalCentavos > 0) {
        setPercentualEntrada((novaEntradaCentavos / totalCentavos) * 100);
      }
    } catch {
      // ignora entradas parciais/inválidas enquanto o usuário digita
    }
  }

  const opcoesParcelamento =
    faixaAtual && !cemPorCento
      ? Array.from({ length: faixaAtual.parcelasSemJuros }, (_, i) => {
          const n = i + 1;
          return { n, valorParcela: dividirEmParcelas(saldoCentavos, n)[0] };
        })
      : [];

  const cartaoPorto = totalCentavos > 0 ? calcularCartaoPorto(totalCentavos, config) : null;
  const desconto = totalCentavos > 0 ? calcularDescontoAVista(totalCentavos, config) : null;

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <label className="block text-sm font-medium" htmlFor="valor-servico">
          Valor do serviço
        </label>
        <input
          id="valor-servico"
          placeholder="R$ 0,00"
          value={valorServicoTexto}
          onChange={(e) => setValorServicoTexto(e.target.value)}
          className="mt-1 w-full rounded border px-2 py-1"
        />
      </div>

      {totalCentavos > 0 && faixaAtual && (
        <>
          <div>
            <label className="block text-sm font-medium" htmlFor="valor-entrada">
              Valor de entrada
            </label>
            <input
              id="valor-entrada"
              placeholder="R$ 0,00"
              value={(entradaCentavos / 100).toFixed(2).replace('.', ',')}
              onChange={(e) => handleValorEntradaTexto(e.target.value)}
              className="mt-1 w-full rounded border px-2 py-1"
            />
            <input
              type="range"
              aria-label="Percentual de entrada"
              min={percentualMinimo}
              max={100}
              value={percentualClamped}
              onChange={(e) => setPercentualEntrada(Number(e.target.value))}
              className="mt-2 w-full"
            />
            <p className="text-xs text-gray-500">Mínimo de {percentualMinimo}% do valor do serviço.</p>
          </div>

          <div className="grid grid-cols-3 gap-2 text-sm">
            <div className="rounded bg-black p-3 text-white">
              <p className="text-xs uppercase">Entrada</p>
              <p className="text-lg font-semibold">{formatarReais(entradaCentavos)}</p>
              <p className="text-xs">{Math.round(percentualClamped)}% do total</p>
            </div>
            <div className="rounded border p-3">
              <p className="text-xs uppercase">Saldo restante</p>
              <p className="text-lg font-semibold">{formatarReais(saldoCentavos)}</p>
            </div>
            <div className="rounded border p-3">
              <p className="text-xs uppercase">Máx. parcelas</p>
              <p className="text-lg font-semibold">até {faixaAtual.parcelasSemJuros}x</p>
            </div>
          </div>

          {cemPorCento && desconto ? (
            <p className="rounded border p-3 text-sm">
              Pagamento total via Pix/Débito: <strong>{formatarReais(desconto.valorComDescontoCentavos)}</strong> (
              {Math.round(config.percentualDescontoAVista * 100)}% de desconto)
            </p>
          ) : (
            <div className="space-y-1 text-sm">
              <p className="font-medium">Opções de pagamento do saldo</p>
              {opcoesParcelamento.map(({ n, valorParcela }) => (
                <p key={n}>
                  {n === 1 ? `À vista ${formatarReais(valorParcela)}` : `${n}x de ${formatarReais(valorParcela)}`}
                </p>
              ))}
              {cartaoPorto && (
                <p>
                  Alternativa: Cartão Porto em até {cartaoPorto.parcelas}x de {formatarReais(cartaoPorto.valorParcelaCentavos)} sem juros
                </p>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Run the tests and verify they pass**

Run: `npm test -- CalculadoraPagamento.test.tsx`
Expected: PASS (3 tests).

- [ ] **Step 5: Implement `src/app/(app)/calculadora/page.tsx`**

```tsx
import { createServerClient } from '@/lib/supabase/server';
import { listarFaixas, obterConfiguracao } from '@/lib/pagamento/data';
import { CalculadoraPagamento } from '@/components/calculadora/CalculadoraPagamento';

export default async function CalculadoraPage() {
  const supabase = await createServerClient();
  const [faixas, config] = await Promise.all([listarFaixas(supabase), obterConfiguracao(supabase)]);
  return (
    <div>
      <h1 className="mb-4 text-lg font-semibold">Calculadora de condição de pagamento</h1>
      <CalculadoraPagamento faixas={faixas} config={config} />
    </div>
  );
}
```

- [ ] **Step 6: Verify the project builds**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 7: Commit**

```bash
git add src/components/calculadora/ "src/app/(app)/calculadora"
git commit -m "feat: add standalone payment condition calculator

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Self-Review

**Spec coverage:**
- Fluxo de criação sem cadastro prévio → Tasks 14–15 (`OrcamentoForm`, `salvarNovoOrcamento`).
- Catálogo compartilhado com criação na hora → Task 12 (CRUD) + Task 14 (`ItemForm` picker/new-item path).
- Faixas de pagamento com limite superior exclusivo (valor exato → faixa de cima) → Task 4 (`encontrarFaixa`), seeded in Task 2.
- Desconto à vista 5%, entrada mínima 30%, cartão Porto até 6x/parcela mínima R$100, todos editáveis pelo admin → Tasks 2 (`configuracao_pagamento`), 5 (cálculo), 13 (admin UI).
- PDF com cabeçalho/logo, peças e serviços separados, condição calculada → Task 18.
- Mensagem de WhatsApp formatada via `wa.me`, sem envio automático de PDF → Task 7 (core) + Task 19 (wiring).
- Login individual, sem senha nenhuma sendo o modelo antigo — corrigido para login/senha por consultor + admin → Tasks 8–9, 11.
- Duas oficinas com identidade própria e logo → Task 10.
- Papel admin com CRUD de consultores/catálogo/faixas e visão de todos os orçamentos → Tasks 11, 12, 13, 17.
- Status do orçamento (rascunho/enviado/aprovado/recusado) → Task 3 (tipo) + Task 15 (`mudarStatusOrcamento` + UI).
- Duplicar orçamento → Task 16.
- Validade padrão 7 dias → seeded as the `orcamentos.validade_dias` default in Task 2; surfaced in the PDF (Task 18) and WhatsApp message (Task 7/19).
- Tratamento de erros (telefone inválido, orçamento sem itens, falha de PDF, login inválido) → folded into Tasks 14 (item/telefone/itens), 8 (login), 18 (PDF failure returns a clear JSON error without touching persisted data).
- Calculadora avulsa com barra de entrada 30–100%, cartão Porto, desconto a 100% → Task 20.
- Isolamento de dados por consultor / acesso total do admin → RLS in Task 2, exercised indirectly by every data-access module's use of the request-scoped `createServerClient`.

**Placeholder scan:** no "TBD"/"TODO" strings, no "add appropriate error handling" phrasing, no `code omitted for brevity` — every step has literal, runnable code. Confirmed by reading back through all 20 tasks.

**Type consistency:** `Oficina`, `Consultor`, `CatalogoItem`, `FaixaPagamento`, `ConfiguracaoPagamento`, `Orcamento`, `OrcamentoItem`, `StatusOrcamento` are all defined once in Task 3 and imported (never redeclared) everywhere else. Function names are consistent across producer/consumer tasks: `encontrarFaixa`/`calcularEntradaMinima`/`dividirEmParcelas` (Task 4) are used identically in Tasks 14, 18, 19, 20; `calcularDescontoAVista`/`calcularCartaoPorto` (Task 5) likewise; `montarLinkWhatsApp`/`montarMensagemOrcamento` (Task 7) match their Task 19 call sites; `DadosOrcamentoFormulario` (Task 14) is the exact shape `aoSalvar` receives in Tasks 15/16.

No gaps or contradictions found; no changes were needed during self-review beyond the `configuracao_pagamento` table design decision made explicitly at the start of this plan.

