---
tags: [frontend, relatórios, dashboard]
---

← [[19 - Checklist de Validação Sprint -1]] | [[Início]]

# Relatórios & Ganhos — implementação completa (Sprint -1)

Cobre os 6 cards do bucket "Relatórios & Ganhos" do [[Kanban]]: especificação de arquitetura do dashboard real, telas de relatório do cliente e do caixeiro (rota única, papel por aba), painel do admin, filtro de período reaproveitável e isolamento de dados por RBAC. Dados fake, sem backend — mesmo espírito do resto do Sprint -1.

## Rotas

| Rota | Arquivo | Corresponde a |
|---|---|---|
| `/reports` | `(dashboard)/reports/page.tsx` | `GET /dashboard/client/:userId` + `GET /dashboard/cashier/:userId` |
| `/admin/reports` | `(dashboard)/admin/reports/page.tsx` | `GET /dashboard/admin/platform` |

Rota única para cliente e caixeiro — mesmo princípio de `/orders` (papel derivado por conta, não por rota, já que qualquer conta pode ser as duas coisas). As duas visões convivem em abas ("Como cliente"/"Como caixeiro") em vez de `/reports/client` e `/reports/cashier` separadas.

## Especificação de arquitetura pro dashboard real (não implementada aqui)

Card do Kanban que é puramente decisão de arquitetura, sem UI própria — registrado aqui pra não se perder até o Sprint 1+:

- **Tabela derivada `dashboard_metrics_daily`**, alimentada por um job assíncrono (BullMQ), em vez de agregar direto sobre `financial_ledger` a cada request. O ledger real é **INSERT-only** (Documentação de Segurança) — agregações no request ficam mais lentas conforme o ledger cresce, e cálculo derivado (soma, ROI, funil) não precisa ser exato em tempo real.
- **Cache Redis com TTL curto** na frente dos endpoints de dashboard — métricas agregadas toleram alguns segundos/minutos de defasagem, diferente de saldo de caução (que nunca pode ser cacheado como fonte de verdade, ver [[17 - Carteira e Caução]]).
- **Rate limiting** nos endpoints de dashboard — consultas agregadas custam mais que um `GET` simples; sem limite, viram vetor de negação de serviço barato.
- **Endpoints propostos**: `GET /dashboard/client/:userId`, `GET /dashboard/cashier/:userId`, `GET /dashboard/admin/platform`, `GET /dashboard/export`.

No protótipo, `src/lib/mock/dashboard.ts` calcula tudo isso na hora, direto de `orders`/`collateral` em memória — aceitável sem volume real, mas é exatamente o cálculo que a tabela derivada existiria pra evitar.

## Massa de dados histórica (`src/lib/mock/orders.tsx`)

As 5 ordens originais do seed (`order-1`..`order-5`) sempre nascem com `createdAt` no instante do carregamento da página — sem isso, nenhum filtro de período além de "Hoje" teria o que mostrar. Adicionadas 13 ordens históricas (`order-h1`..`order-h13`, função `seedHistoricalOrders`) com `createdAt` espalhado nos últimos ~90 dias, a maioria `COMPLETED` (envolvendo o único caixeiro logável, `user-cashier-1`/Beto), mais uma cancelada e uma expirada pro funil de conversão do admin não ficar sempre 100%.

## Mock de métricas (`src/lib/mock/dashboard.ts`)

Funções puras de derivação, sem Context/Provider — mesmo princípio de `reputation.ts` (nada persistido, tudo recalculado a partir de `orders`/`collateral` a cada chamada). Reaproveita `PLATFORM_FEE_SHARE`/`CASHIER_FEE_SHARE` (2,5%/0,5% da taxa de 3% já documentada em `pricing.ts`) pra separar o que é ganho do caixeiro do que é receita da plataforma.

- **`resolvePeriodRange(preset, custom?)`** — traduz um preset (`today`/`7d`/`30d`/`90d`/`ytd`/`custom`) num `{ from, to }` de verdade.
- **`getClientReportMetrics`** — total de ordens, concluídas, volume negociado e ticket médio, filtrado por `order.clientId === userId` dentro do período. Isolamento: mesma checagem de participante de `order-detail.tsx`.
- **`getCashierReportMetrics`** — ganhos brutos (soma de `feeAmount × 2,5/3` nas ordens concluídas como caixeiro), ganhos líquidos (bruto menos uma taxa de saque fake de 1%, valor de referência não fechado — mesmo espírito do `EXPOSURE_FACTOR`), ROI sobre caução confirmada, taxa de conclusão. **Limitação assumida**: utilização da caução usa sempre o saldo *atual* da conta (`reserved + blocked`) — o protótipo não guarda histórico diário de caução, então essa métrica não varia com o período escolhido, diferente das outras.
- **`getAdminReportMetrics`** — GMV (soma de `grossAmount` das concluídas), receita da plataforma (`feeAmount × 0,5/3`), lucro líquido, liquidez em custódia (soma de `confirmedCollateral` de todas as contas) e funil de conversão (criadas → aceitas → concluídas → canceladas/disputadas). **Lucro líquido = receita da plataforma** até existir modelo de custos operacionais (infra, KYC, suporte) — não é regressão, nunca existiu esse dado no protótipo. **Liquidez em custódia**, como a utilização de caução do caixeiro, é sempre o saldo atual — não filtra por período.

## Filtro de período (`src/components/shared/period-filter.tsx`)

Componente único reaproveitado nas 3 telas — card "Filtros de período padrão" do Kanban. Presets Hoje/7d/30d/90d/Ano até hoje/Personalizado via `Select`; `custom` abre dois `Input[type=date]`, com `min`/`max` cruzados pra impedir escolher um intervalo invertido.

## Gráficos (`src/components/shared/report-charts.tsx`)

Primeira dependência de gráfico do projeto — `recharts@3` instalada, compatível com React 19. Não existia nenhum gráfico antes deste bucket (todo o resto do app usa cards/tabelas de números, ver [[18 - Administração e Mediação]]). `ReportLineChart` (volume/ganhos por dia) e `ReportBarChart` (funil de conversão) usam os tokens `--chart-*` que já existiam em `globals.css` desde o Design System — nenhuma cor nova, só o primeiro consumidor real desses tokens.

## Isolamento de dados / RBAC

`/reports` isola por `clientId`/`cashierId === user.id`, igual ao resto do app (`/orders`, `order-detail.tsx`). `/admin/reports` é visão consolidada, sem isolamento por usuário — mesmo princípio de `/admin/orders`, e a mesma ressalva de segurança já registrada em [[18 - Administração e Mediação]] se aplica aqui: nenhuma tela `/admin/*` tem controle de acesso por papel ainda; qualquer conta que navegue até `/admin/reports` vê a plataforma inteira. Não é um gap novo deste bucket — é a mesma simplificação conhecida, agora com mais uma tela sujeita a ela.

## Testado manualmente, em build de desenvolvimento

1. `/reports` como Ana (cliente) — 8 ordens no período de 30 dias, 4 concluídas, volume e ticket médio corretos, gráfico de linha com pontos nos dias certos
2. Trocado pra Beto via `AccountSwitcher` — aba "Como cliente" some zerada (Beto nunca é cliente no seed), aba "Como caixeiro" mostra ganhos brutos/líquidos, ROI, utilização de caução e taxa de conclusão calculados a partir das ordens históricas
3. Filtro de período — Select abre com os 6 presets; trocar preset recalcula todos os cards e o gráfico sem reload
4. `/admin/reports` — GMV, receita, lucro líquido e liquidez em custódia batendo com a soma manual das ordens/contas do seed; funil de conversão em barras mostrando a queda de criadas → aceitas → concluídas
5. Atalho "Relatórios" adicionado à home do admin (`/admin`) e ao nav principal (`Sidebar`/`BottomNav`) — visível em ambas as superfícies, mesma lista única (`nav-items.ts`)

## Redesign: expansão de métricas, seções Financeiro/Fiscal e Operacional, contrapartes

Mesma rodada de design do artifact ("Obsidian project prototype request"), adaptada pra `src/lib/mock/dashboard.ts` e as duas telas de `/reports`:

- **Preset "Ontem"** — `PeriodPreset` ganhou `"yesterday"` (`resolvePeriodRange`), ao lado dos presets existentes; `PersonalizadoPeriodFilter` já suportava período custom com dois `Input[type=date]`, sem mudança aí.
- **Métricas novas nas 3 abas (cliente/caixeiro/admin)** — ordens canceladas, taxa de cancelamento, taxa de conclusão (cliente e admin não tinham), caixeiros/clientes distintos, clientes recorrentes (`repeatRate`, fração de contrapartes com mais de 1 ordem), ticket médio (caixeiro e admin não tinham), disputas abertas, total de solicitações (admin).
- **Seção Financeiro/Fiscal (só cliente, `getClientFiscalMetrics`)** — cotação média de compra/venda ponderada por volume (`weightedAvg`, não é média simples), volume total em USDT, custo médio de aquisição (contabilidade de custo médio, não FIFO/LIFO — só compras), lucro/prejuízo realizado (vendido − custo médio × volume vendido), saldo atual em USDT (reaproveita `useMockCollateral`, que já tinha conta pra `user-client-1` mesmo sem UI própria de carteira do cliente ainda). Botão "Exportar" gera um CSV client-side (`Blob` + `URL.createObjectURL`) — não existe endpoint de export real, é só o resumo da tela virando arquivo.
- **Seção Operacional (cliente e caixeiro, `getClientOperationalMetrics`/`getCashierOperationalMetrics`)** — tempo médio de conclusão (`updatedAt − createdAt` das concluídas, `fmtMinutes` formata como "Xh Ymin"), maior/menor ordem, distribuição compra × venda.
- **Seção Contrapartes (cliente e caixeiro, `counterpartyTable`)** — tabela com nome da contraparte, total de ordens e taxa de sucesso; mais uma taxa de disputa em texto (`getDisputeRate`, cliente/caixeiro/plataforma).
- **Admin: comparativo mensal e alertas de anomalia** — `monthlyComparison` agrupa GMV/ordens por `createdAt.slice(0, 7)` (histórico inteiro, não recortado pelo filtro de período — um comparativo mês a mês não faz sentido dentro de uma janela de 30 dias). `anomalyAlerts` sinaliza clientes com 3+ ordens abaixo de R$200 no histórico inteiro — sinal simples, não detecção de fraude de verdade, mesmo espírito da sinalização AML citada em `FROZEN_FOR_AUDIT` ([[14 - Ofertas e Ordens]]).
- **Filtros na tabela de histórico do cliente** — status (por categoria), tipo (compra/venda), caixeiro (lista de nomes distintos nas ordens do período) e busca por ID público. Passou a listar o período inteiro (antes limitava a 10 mais recentes) já que agora tem filtro pra reduzir; o histórico do caixeiro continua simples/sem filtro, igual antes.
- **Grids responsivos** — `sm:grid-cols-4` (2 col mobile) aplicado de forma consistente nos cards de métrica; mesmo padrão levado pro grid de contadores da home do admin (`/admin`, 6 cards) e pros 7 saldos da Carteira (`/wallet`), que antes usavam `sm:grid-cols-3`.

`npm run lint` e `npx tsc --noEmit` sem erros; testado manualmente em dev — `/reports` (cliente e caixeiro, preset "Ontem", "Personalizado" com os dois date inputs, filtros da tabela de histórico) e `/admin/reports` (comparativo mensal com 4 meses do seed histórico, sem alertas de anomalia no seed atual).
