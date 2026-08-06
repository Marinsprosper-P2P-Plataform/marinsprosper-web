---
tags: [frontend, design-system]
---

← [[09 - Roadmap de Sprints]] | [[Início]]

# Design System — implementação (Sprint -1)

Registro das decisões técnicas por trás do design system do frontend, implementado em [globals.css](../../src/app/globals.css) e nos componentes de [`src/components`](../../src/components). Referência para quem for construir telas em cima disso — cobre o "porquê", o código é a fonte de verdade do "como".

## 1. Tokens de tema (`globals.css`)

Definidos num bloco `@theme` (não `@theme inline`) porque são valores estáticos, não derivados de outro token:

- **Breakpoints mobile-first**: `xs` (375px, adição fora do padrão do Tailwind — cobre telas pequenas tipo iPhone SE), `sm` (640px), `md` (768px, tablet — ponto onde a Sidebar assume da BottomNav), `lg` (1024px), `xl` (1280px), `2xl` (1536px)
- **Safe-area**: `--spacing-safe-top/bottom/left/right` mapeados para `env(safe-area-inset-*)`. Só funcionam porque `layout.tsx` define `viewport-fit: cover` — sem isso o `env()` sempre resolve pra `0px` no iOS
- **Tipografia**: escala `text-xs` (0.75rem) até `text-3xl` (1.875rem), cada um com `line-height` próprio definido junto (sintaxe `--text-xs--line-height` do Tailwind v4). Pensada pra leitura confortável em tela pequena primeiro — telas maiores aumentam via variante responsiva, não subindo a escala base
- **Pesos de fonte**: normal/medium/semibold/bold como tokens nomeados

Bug corrigido nessa etapa: `--font-sans` estava definido como `var(--font-sans)` (autorreferência) em vez de `var(--font-geist-sans)` — a tipografia inteira caía silenciosamente no fallback do navegador. Corrigido em `@theme inline`.

## 2. Paleta de status da ordem

A máquina de estados (ver [[02 - Arquitetura Técnica]], seção 4) tem 21 estados nomeados, mas visualmente só faz sentido agrupar em **6 categorias**:

| Categoria | Cor (light) | Estados |
|---|---|---|
| `open` (aberta) | Azul | `DRAFT`, `OPEN` |
| `progress` (em andamento) | Âmbar | `RESERVED`, `ACCEPTED`, todos os `AWAITING_*`/`*_MARKED_*`, `CASHIER_CONFIRMED_RECEIPT`, `CANCEL_REQUESTED`, `CANCEL_REJECTED` |
| `completed` (concluída) | Verde | `COMPLETED` |
| `cancelled` (cancelada) | Cinza | `CANCEL_ACCEPTED`, `CLOSED` |
| `dispute` (em disputa) | Vermelho | `DISPUTE_OPEN`, `DISPUTE_UNDER_REVIEW`, `DISPUTE_RESOLVED` |
| `expired` (expirada) | Cinza-areia | `EXPIRED`, `SUSPENDED` |

Regra importante: **`--status-dispute` é um token separado de `--destructive`**. `--destructive` continua reservado para erro/validação de formulário — usar a mesma cor para "ordem em disputa" e "campo inválido" confundiria os dois contextos.

Tokens em `:root`/`.dark` (`--status-*` e `--status-*-foreground`), expostos como utilities via `@theme inline` (`--color-status-*`), então funcionam como qualquer classe Tailwind: `bg-status-dispute`, `text-status-completed-foreground` etc.

## 3. Componentes base (shadcn/ui)

Instalados via `npx shadcn add`: `Button`, `Input`, `Select`, `Textarea`, `Dialog`, `Tabs`, `Table`, `Badge`, `Avatar`, `Sonner` (substituiu o antigo `Toast` — é o padrão atual do shadcn). Ficam em `src/components/ui/`, não devem ser editados diretamente — são geridos pela CLI do shadcn.

`sonner` trouxe `next-themes` como dependência de quebra — isso adiantou a base do dark mode (seção 6).

## 4. `OrderStatusBadge`

`src/components/shared/order-status-badge.tsx` — mapeia qualquer `OrderStatus` (tipo em `src/types/order.ts`, espelhando a máquina de estados) pro rótulo em pt-BR e pra cor da categoria certa.

Detalhe técnico: as classes de cor são um `Record` estático (`bg-status-open text-status-open-foreground`, etc.), **não** uma string interpolada tipo `` `bg-status-${category}` ``. O Tailwind escaneia o código-fonte por classes literais — uma classe montada em runtime não é detectada e desaparece no build de produção.

## 5. `OrderTimeline`

`src/components/shared/order-timeline.tsx` — stepper vertical com os 11 estados do fluxo principal (`ORDER_HAPPY_PATH` em `src/types/order.ts`). Se a ordem estiver num estado de ramo (cancelamento, disputa, expiração), o stepper "congela" no último ponto do fluxo principal alcançado (via prop `lastMainlineStatus`) e um aviso com o `OrderStatusBadge` do ramo aparece acima.

## 6. Layout responsivo

Mobile-first de verdade: `BottomNav` (`src/components/layout/bottom-nav.tsx`) é o padrão, visível até `md`; `Sidebar` (`src/components/layout/sidebar.tsx`) assume a partir de `md`. Os dois consomem a mesma lista de itens (`src/components/layout/nav-items.ts`) pra nunca divergir.

Aplicado em `src/app/(dashboard)/layout.tsx`. O `<main>` ganha `padding-bottom` calculado (`4rem` + safe-area) pra conteúdo nunca ficar escondido atrás da bottom nav fixa em mobile.

## 7. Dark mode

`next-themes` (via `ThemeProvider` em `src/components/theme-provider.tsx`) envolve o app em `layout.tsx`, com `attribute="class"` (mesmo mecanismo que já ativava `.dark` no `globals.css` desde o setup do shadcn) e `defaultTheme="system"`. `<html>` precisa de `suppressHydrationWarning` porque o tema real só é conhecido no cliente.

Toggle em `src/components/shared/theme-toggle.tsx`, hoje colocado na Sidebar. Cuidado ao reusar: `useTheme()` do `next-themes` não sabe o tema real até montar no cliente — por isso o componente tem um estado `mounted` e mostra um botão desabilitado até lá (evita mismatch de hidratação).

## Pendente

- [ ] **Validar o design system com a equipe (Julia/Rene) antes de aplicar nas telas finais** — item de processo, não de código. Nenhuma tela definitiva deveria ser construída em cima disso sem esse aval.
