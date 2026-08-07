---
tags: [frontend, ofertas, ordens]
---

← [[13 - Autenticação e Onboarding]] | [[Início]]

# Ofertas & Ordens — implementação (Sprint -1)

Cobre o card "Ofertas & Ordens" do [[Kanban]]: listagem de ofertas, criação de ordem, "minhas ordens", detalhe com todo o ciclo de ações, cancelamento, disputa e avaliação. Diferente das telas de [[13 - Autenticação e Onboarding]], aqui os dados fake não são só um formulário estático — existe um "backend fake" em memória que aplica a máquina de estados de verdade.

## O "backend fake" (`src/lib/mock`)

Três peças, todas client-side (Context/Provider), montadas em `(dashboard)/layout.tsx`:

- **`session.tsx`** — simula "quem está logado". Como não existe autenticação real (Sprint 4), um `RoleSwitcher` na Sidebar/MobileHeader alterna entre dois usuários fixos (Ana Cliente / Beto Caixeiro), deixando explícito que isso é uma muleta de prototipagem.
- **`orders.tsx`** — o núcleo. Um `useReducer` com uma ação por endpoint da [[05 - Especificação de API]] (`ACCEPT`, `CLIENT_TRANSFER`, `CASHIER_CONFIRM_RECEIPT`, `CASHIER_TRANSFER`, `CLIENT_CONFIRM`, `REQUEST_CANCEL`, `RESPOND_CANCEL`, `OPEN_DISPUTE`, `RATE`). Cada ação só aplica a mudança se o status atual da ordem for um dos esperados — o mesmo princípio de "nunca assumir o estado atual sem checar" da [[02 - Arquitetura Técnica]], só que sem persistência (reseta a cada recarregamento de página, F5 inclusive).
- **`pricing.ts`** — `quoteOrder(grossAmount)` simula around-trip a um backend que calcula a taxa. Nenhum componente multiplica `valor * 3%` diretamente; todos esperam essa função "responder" (com latência simulada), mantendo a fronteira arquitetural do "frontend nunca calcula regra financeira" mesmo num protótipo sem servidor de verdade.

## Máquina de estados — como as 5 ações do ciclo mapeiam pros 11 estados

A Parte 2 define 11 estados no fluxo principal, mas só 5 ações do usuário (aceitar, marcar transferência, confirmar recebimento, informar TXID, confirmar recebimento final) — cada ação avança dois estados de uma vez (o estado "explícito" da ação + o "aguardando a outra parte" seguinte), porque a API só expõe um endpoint por ação:

```
aceitar               -> AWAITING_CLIENT_TRANSFER      (pula RESERVED/ACCEPTED juntos)
marcar transferência  -> AWAITING_CASHIER_CONFIRMATION
confirmar recebimento -> AWAITING_CASHIER_TRANSFER
informar TXID         -> AWAITING_CLIENT_CONFIRMATION
confirmar final        -> COMPLETED
```

Isso está documentado aqui porque não é óbvio olhando só o diagrama da Parte 2 — quem for mexer em `orders.tsx` precisa saber que cada `case` do reducer intencionalmente pula um estado "de espera".

## Cancelamento e disputa

Cobrem qualquer estado entre `ACCEPTED` e `AWAITING_CLIENT_CONFIRMATION` (`CANCELLABLE_STATUSES`, exportado de `orders.tsx` — única fonte de verdade tanto pro reducer quanto pra UI decidir se mostra os botões).

Regra implementada exatamente como no PRD (Parte 1, seção 6, itens 7-8): **quem solicita o cancelamento não responde ao próprio pedido** (só a contraparte vê os botões aceitar/recusar), e **recusar cancelamento abre disputa automaticamente** (`RESPOND_CANCEL` com `accept: false` transiciona pra `DISPUTE_OPEN`, não de volta pro fluxo normal).

Simplificação assumida conscientemente: como ordens canceladas nunca chegam a `COMPLETED` no modelo atual, a regra "quem cancela não avalia depois" acaba sendo satisfeita de graça (o painel de avaliação só aparece em `COMPLETED`) — não precisou de lógica extra, mas vale saber que é assim que a regra está sendo cumprida, não por uma checagem explícita.

`previousMainlineStatus` (campo novo em `Order`, `src/types/order.ts`) guarda onde a ordem estava no fluxo principal antes de desviar pra cancelamento/disputa — é o que permite o `OrderTimeline` "congelar" no lugar certo em vez de zerar o progresso quando a ordem está em `DISPUTE_OPEN`, por exemplo.

## Checagem de participante (IDOR)

`OrderDetail` (`src/components/shared/order-detail.tsx`) nega acesso ao conteúdo da ordem se quem está vendo não for participante — cliente só vê as próprias ordens, caixeiro só vê as que aceitou (ou ordens `OPEN`, pra poder decidir se aceita). Implementado porque a [[04 - Documentação de Segurança]] lista exatamente esse cenário ("cliente acessa ordem de terceiro trocando ID na URL") como ameaça na tabela STRIDE — vale o protótipo já refletir isso, mesmo sem backend real aplicando a regra de verdade ainda.

## Achado durante a verificação: bug de hidratação do ambiente, não do código

Ao testar a interatividade no navegador, apareceu um erro de hidratação do React (`#418`) e um aviso "Encountered a script tag" logo na primeira carga. Investigado a fundo (isolando componente por componente, testando até a própria página 404 padrão do Next.js sem nenhum código nosso) — **reproduz até em uma página 100% do framework, sem nenhuma linha nossa**. Não é um bug desta implementação; é uma incompatibilidade do ambiente atual (Next.js 16.3.0 + Turbopack + React 19.2.8 nesta configuração de dev/build local). O React se recupera sozinho (re-renderiza no cliente), então a página funciona — só suja o console.

Efeito colateral real: automações que leem a árvore de acessibilidade e clicam imediatamente após navegar podem "errar o alvo" (o React descarta e reconstrói o DOM daquela região durante a recuperação). Esperar ~1s após navegar antes de interagir resolve para fins de teste.

De qualquer forma, isso motivou a troca de `next-themes` (biblioteca sem atualização desde março de 2025, com um problema documentado publicamente e sem solução relacionado a essa mesma classe de erro) por uma implementação própria e pequena em `src/lib/theme.tsx` — não elimina o problema do ambiente, mas remove uma dependência não mantida do projeto, o que é uma melhoria válida por si só.

## Testado manualmente, de ponta a ponta

Usando o `RoleSwitcher` pra alternar entre os dois usuários fake, em build de produção local (`npm run build && npm start`):

1. Ofertas → aceitar como caixeiro (idempotência: botão trava no primeiro clique)
2. Marcar transferência como cliente (upload simulado)
3. Confirmar recebimento do PIX como caixeiro
4. Informar TXID como caixeiro
5. Confirmar recebimento final como cliente → ordem conclui
6. Avaliar a contraparte (5 estrelas)
7. Criar uma nova ordem do zero (`/orders/new`) — cotação calculada corretamente (R$ 1.000 → taxa R$ 30 → 178,96679 USDT), confirmação cria a ordem e redireciona pro detalhe

Cancelamento e disputa foram revisados no código (mesmo padrão de idempotência do resto do reducer) mas não clicados manualmente nesta passada — ficou coberto pela revisão de código, não pelo teste no navegador.
