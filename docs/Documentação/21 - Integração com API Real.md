---
tags: [api, integração, backend]
---

← [[20 - Relatórios e Ganhos]] | [[Início]]

# Parte 21 — Integração com a API real (`marinsprosper-api`)

O backend (`marinsprosper-api`, NestJS + Postgres + Redis + TRON, repositório separado) chegou até o **Sprint 3**: auth, ordens com máquina de estados real, custódia/caução on-chain (testnet TRON), chat, idempotência e o motor do ledger de dupla entrada (sem rota HTTP ainda). Esta doc substitui o contrato provisório de [[05 - Especificação de API]] pelo contrato real, e mapeia o que dá pra conectar agora vs. o que continua mockado até o **Sprint 4** do backend sair.

Levantamento feito por inspeção direta do código do backend (`src/modules/`, `prisma/schema.prisma`, `.env.example`, `bruno/`), não por suposição — mesmo princípio das outras auditorias deste vault (ver [[19 - Checklist de Validação Sprint -1]]).

## 1. O que muda na forma de integrar (decisões do backend que o front precisa respeitar)

- **Dinheiro trafega como string decimal**, nunca `number` — ex. `"250.75"`, não `250.75`. O tipo `Order.grossAmount: number` (`src/types/order.ts`) precisa virar `string` na integração real; nunca usar `parseFloat` antes da exibição final.
- **`Idempotency-Key` obrigatório em toda escrita financeira** — header novo por *ação do usuário* (ex. `crypto.randomUUID()` no momento do clique), não por sessão nem por página. Faltando → 400; mesma key com corpo diferente → 422; key em corrida → 409. Resposta repetida vem com header `Idempotent-Replayed: true`.
- **404, não 403, pra quem não é parte da ordem** — tanto HTTP quanto WebSocket devolvem "não encontrado" pra ordem alheia, nunca "sem permissão" (evita vazar que a ordem existe). O front não deve distinguir os dois casos na UI.
- **DTOs estritos** — campo desconhecido no corpo é 400, não ignorado silenciosamente. Formulários não podem mandar campos "extra" que a tela usa só internamente.
- **CORS com allowlist obrigatória em produção** — `NEXT_PUBLIC_API_URL` do front precisa estar cadastrado em `CORS_ORIGINS` do backend; wildcard é rejeitado quando há credenciais.
- **Sem guard de RBAC genérico** — os papéis (`CLIENT`/`CASHIER`/`MEDIATOR`/`ADMIN`) vêm dentro do JWT de acesso (claim `roles`), concedidos manualmente hoje (sem `POST /cashier/apply` ainda) e checados por service, não por decorator central. Um papel novo só aparece pro front depois de um novo login (token antigo não é revalidado contra mudança de papel).

## 2. Máquina de estados — remapeamento obrigatório

A máquina de estados do backend é mais enxuta que a do protótipo (`src/types/order.ts`, [[02 - Arquitetura Técnica]] seção 4). Os estados "aguardando a contraparte" do front **não existem como estado separado** no backend — são a mesma tela interpretando, a partir do status atual + papel do usuário, "de quem é a vez".

| Backend (`OrderStatus` real) | Front hoje (`ORDER_HAPPY_PATH`) | Nota |
|---|---|---|
| `DRAFT` | `DRAFT` | igual |
| `OPEN` | `OPEN` | igual |
| — | `RESERVED` | não existe no backend; aceite vai direto `OPEN → ACCEPTED` |
| `ACCEPTED` | `ACCEPTED` | igual, mas já dispara `LOCK` de custódia on-chain |
| — | `AWAITING_CLIENT_TRANSFER` | é a mesma UI de `ACCEPTED` vista pelo cliente ("sua vez de pagar") |
| `CLIENT_TRANSFERRED` | `CLIENT_MARKED_TRANSFERRED` | equivalente direto |
| — | `AWAITING_CASHIER_CONFIRMATION` | mesma UI de `CLIENT_TRANSFERRED` vista pelo caixeiro |
| `RECEIPT_CONFIRMED` | `CASHIER_CONFIRMED_RECEIPT` | equivalente direto — **ponto de não retorno**: cancelamento mútuo deixa de ser possível a partir daqui |
| — | `AWAITING_CASHIER_TRANSFER` | mesma UI de `RECEIPT_CONFIRMED` vista pelo cliente |
| `CASHIER_TRANSFERRED` | `CASHIER_MARKED_TRANSFERRED` | equivalente direto |
| — | `AWAITING_CLIENT_CONFIRMATION` | mesma UI de `CASHIER_TRANSFERRED` vista pelo cliente |
| `COMPLETED` | `COMPLETED` | igual, dispara `RELEASE` de custódia |
| `CANCEL_REQUESTED` | `CANCEL_REQUESTED` | igual |
| `CANCELLED` | `CANCEL_ACCEPTED` | nome diferente, mesmo sentido |
| — | `CANCEL_REJECTED` | não existe estado próprio — recusar volta pro estado de origem (`cancelRequestedFrom`), sem passar por um status intermediário |
| `DISPUTED` | `DISPUTE_OPEN` / `DISPUTE_UNDER_REVIEW` / `DISPUTE_RESOLVED` | backend tem **um único estado** `DISPUTED`; as 3 fases do front (aberta/em análise/resolvida) não existem no schema ainda — ver §4 |
| `EXPIRED` | `EXPIRED` | igual, mas disparado por sweep de banco (`order-deadline.sweeper.ts`), não por timer no cliente |
| — | `SUSPENDED` / `CLOSED` | não existem no backend |
| — | `FROZEN_FOR_AUDIT` | **não existe no backend, não está em nenhum plano do Sprint 4.** Foi uma decisão só do front (ver [[19 - Checklist de Validação Sprint -1]]) — fica bloqueado até validar com o time antes de virar trabalho de backend. Não remover a tela, só não conectar. |

O `OrderTimeline` (`src/components/shared/order-timeline.tsx`) precisa aprender a colapsar os pares `AWAITING_*`/estado-base numa única etapa visual, em vez de esperar 11 estados distintos do backend.

## 3. Endpoints reais × telas do front

Auth requer `Authorization: Bearer <accessToken>`; ⚡ marca rota que também exige `Idempotency-Key`.

### Auth

| Endpoint | Tela atual | Status |
|---|---|---|
| `POST /auth/register` | `/register` | ✅ pronto — `RegisterDto` já cobre email/senha/nome/documento/telefone; falta `@username`, país e cidade no schema do backend (front pede, backend ainda não aceita) |
| `POST /auth/login` | `/login` | ✅ pronto — retorna `{ accessToken, refreshToken, expiresAt }`; checkbox "entrar como caixeiro/admin" (muleta do front, ver [[13 - Autenticação e Onboarding]]) sai — o papel vem do JWT |
| `POST /auth/refresh` | `src/lib/session.ts` (hook pronto, sem uso) | ✅ pronto — rotação com detecção de reuso (token já usado revoga todas as sessões) |
| `POST /auth/logout` | — (sem tela própria hoje) | ✅ pronto |
| `POST /auth/mfa/verify` | `/mfa` | ⚠️ parcial — verificação existe, **mas não existe endpoint de enrollment** (cadastrar o segredo TOTP é só via banco). Tela de MFA não tem como ativar TOTP de verdade ainda |
| — | `/verify-email`, `/verify-phone` | ❌ sem endpoint — OTP duplo de e-mail/telefone não existe no backend; continuam mockados |
| — | `/kyc`, `/kyc/status` | ❌ sem endpoint — `KycCase` existe no schema, mas não há rota de upload nem consulta; continuam mockados |
| — | `/cashier-apply` | ❌ sem endpoint — virar caixeiro hoje é só SQL manual; tela mostra "solicitação enviada" mas não tem o que chamar |
| — | `/blocked` | — nunca teve endpoint próprio, sem mudança |

### Ordens

| Endpoint | Ação atual no front | Status |
|---|---|---|
| `POST /orders` ⚡ | `orders/new` → `createOrder` | ✅ pronto — `CreateOrderDto` não inclui chave PIX na criação (ver §5) |
| `GET /orders`, `GET /orders/:id` | `/orders`, `/offers`, `/orders/[id]` | ✅ pronto |
| `POST /orders/:id/publish` ⚡ | implícito na criação hoje | ⚠️ front cria ordem já `OPEN`; backend separa `DRAFT`→`publish`→`OPEN`. Fluxo de criação precisa de uma chamada a mais |
| `POST /orders/:id/accept` ⚡ | `/offers` → `acceptOrder` | ✅ pronto — dispara `LOCK` on-chain de verdade; pode responder 422 (caução insuficiente/limite excedido), tela precisa tratar esse erro específico |
| `POST /orders/:id/pix` ⚡ | seleção de chave PIX em `orders/new` | ⚠️ **muda o fluxo** — PIX é registrado *depois* do aceite, por quem vai *receber* o BRL (não é mais escolhido na criação da ordem pelo cliente). Ver §5 |
| `POST /orders/:id/client-transfer` ⚡ | `OrderActions` → transferência do cliente | ✅ pronto — 422 se PIX ainda não registrado |
| `POST /orders/:id/cashier-confirm-receipt` ⚡ | `OrderActions` → confirmação do caixeiro | ✅ pronto |
| `POST /orders/:id/cashier-transfer` ⚡ | `OrderActions` → envio do caixeiro + TXID | ✅ pronto |
| `POST /orders/:id/client-confirm` ⚡ | `OrderActions` → confirmação final do cliente | ✅ pronto — dispara `RELEASE` on-chain |
| `POST /orders/:id/cancel-request` ⚡, `POST /orders/:id/cancel-response` ⚡ | fluxo de cancelamento | ✅ pronto — quem solicitou não pode responder ao próprio pedido (checado no backend) |
| `POST /orders/:id/cancel` ⚡ | — | ✅ pronto — cancelamento direto antes do aceite (`DRAFT`/`OPEN`), sem passar por solicitação/resposta |
| — | Avaliação por estrelas pós-conclusão | ❌ sem endpoint — `POST /orders/:id/rating` era só especificação; não implementado |
| — | Congelar/liberar (`FROZEN_FOR_AUDIT`) | ❌ sem endpoint, ver §2 |
| — | Abrir disputa (`/orders/[id]` → disputa) | ⚠️ estado `DISPUTED` existe na máquina, mas **sem endpoint HTTP** pra entrar nele nem pra o mediador resolver (`RESOLVE_RELEASE`/`RESOLVE_REFUND` só existem no domínio, não expostos) |

### Caixeiro & caução

| Endpoint | Tela atual | Status |
|---|---|---|
| `GET /cashier/collateral` | `/wallet` | ⚠️ backend só devolve **espelho** do saldo on-chain (`mirroredFree`/`mirroredLocked` + idade do espelho) — não são "sete saldos" como o front modela hoje (`available/reserved/blocked/underReview/usedForReimbursement/pendingWithdrawal/withdrawn`); precisa remapear pra 2 saldos (livre/travado) mais o estado do espelho |
| `POST /cashier/collateral/deposit-address` ⚡ | `/wallet` → endereço de depósito | ⚠️ **inverte a direção** — no protótipo o backend "gera" o endereço; na API real é o **caixeiro quem registra** seu próprio endereço TRON. Tela de depósito precisa virar um formulário, não uma exibição |
| `POST /cashier/collateral/sync` ⚡ | — | 🆕 sem equivalente no front ainda — botão "atualizar saldo" a adicionar |
| `GET /cashier/limit` | `/wallet` (limite bruto/disponível) | ✅ pronto — `computeCashierLimit` do front vira só leitura direta da resposta |
| — | Confirmação de depósito (8s simulados) | ⚠️ **muda de mecanismo** — confirmação real vem de um **webhook on-chain** (`POST /webhooks/tron/deposit-confirmed`, servidor-a-servidor, o front nunca chama isso). Front deve *pollar* `GET /cashier/collateral` (ou futuramente escutar um evento) em vez de simular um timer fixo |
| — | Saque de caução (`pendingWithdrawal`) | ❌ sem endpoint — pendência já registrada em [[19 - Checklist de Validação Sprint -1]], continua sem solução dos dois lados |
| — | Disponibilidade do caixeiro (`/wallet/availability`) | ❌ sem endpoint — `cashier_availability` nunca saiu do papel |

### Chat

| Endpoint | Tela atual | Status |
|---|---|---|
| `GET /orders/:id/messages` | `OrderChat` | ✅ pronto — inclui timeline de eventos de sistema junto com as mensagens |
| `POST /orders/:id/messages` ⚡ (multipart) | `OrderChat` → envio | ✅ pronto — anexo detectado por assinatura de bytes (não pelo `Content-Type` declarado), 10MB, JPEG/PNG/WebP/PDF |
| `ws /chat` (Socket.IO, namespace `/chat`) | indicador de "digitando" | ⚠️ WebSocket é **só entrega** — envio de mensagem continua sempre por `POST`. Handshake leva o JWT em `auth.token`; entrar na sala é um `emitWithAck('entrar', { orderId })`. Indicador de "digitando" não tem evento dedicado ainda — a implementar no backend se for pro Sprint 4 |
| — | URL de anexo | ⚠️ URLs assinadas expiram em **5 minutos** — o front nunca deve cachear/persistir a URL entre navegações, sempre pedir de novo em `GET /orders/:id/messages` |

### Admin & Relatórios

| Endpoint | Tela atual | Status |
|---|---|---|
| — | `/admin/*` inteiro (usuários, ordens consolidadas, audit-logs, blacklist, disputas) | ❌ **nenhum endpoint de admin existe** — bucket [[18 - Administração e Mediação]] inteiro continua mockado |
| — | `/reports`, `/admin/reports` | ❌ **ledger sem rota HTTP** — bucket [[20 - Relatórios e Ganhos]] inteiro continua mockado; nem GMV nem ganhos do caixeiro têm de onde vir ainda |

## 4. O que precisa ser decidido/construído no backend antes do front conseguir avançar

Não é trabalho do front, mas bloqueia integração — registrar aqui pra rastrear:

- Endpoint de rota HTTP pro ledger (mesmo que só leitura) — sem isso, [[20 - Relatórios e Ganhos]] não sai do mock.
- Endpoints de admin (usuários, ordens consolidadas, audit-log, blacklist) — sem isso, [[18 - Administração e Mediação]] não sai do mock.
- Endpoint(s) de disputa (abrir, evidência, decisão do mediador) — hoje só o estado `DISPUTED` existe.
- Endpoint de avaliação (`rating`).
- Endpoint de enrollment de MFA (hoje só verificação).
- Endpoint de upload de KYC.
- `POST /cashier/apply` (hoje só SQL manual).
- Endpoint de saque de caução (`pendingWithdrawal`).
- Decisão sobre `FROZEN_FOR_AUDIT` — existe só no front, precisa virar decisão de produto antes de virar trabalho de backend.

## 5. Mudanças de modelagem que a integração real força no front

- **Chave PIX sai da criação da ordem** e vira uma etapa pós-aceite (`POST /orders/:id/pix`), registrada por quem *recebe* o BRL — o front precisa mover a UI de seleção de chave de `orders/new` pra uma tela/etapa depois do aceite, e a checagem de titularidade (anti-triangulação) muda de "checar contra chave salva no perfil" pra "checar contra o documento do KYC de quem está registrando ali".
- **`Order.grossAmount` e afins viram string** — qualquer lugar do front que soma/formata esses campos (`formatBRL`, cálculos de relatório) precisa converter primeiro, nunca operar direto em cima da string.
- **Caução vira 2 saldos + espelho**, não 7 — telas e componentes que assumem `available/reserved/blocked/underReview/usedForReimbursement/pendingWithdrawal/withdrawn` (`src/lib/mock/collateral.tsx`) precisam de um novo modelo.
- **Cliente HTTP com `Idempotency-Key` automático** — card já previsto no Kanban (`src/lib/api`), agora com requisito concreto: gerar UUID v4 novo a cada ação do usuário (não por request de retry — retry deve **reusar** a mesma key).

## Ver também

- [[05 - Especificação de API]] — contrato provisório (Fase 1), mantido como registro histórico; esta doc é quem vale a partir de agora.
- [[09 - Roadmap de Sprints]] — Sprint 4 é "conexão do frontend com a API real".
- [[Kanban]] — bucket "Integração com API real (Sprint 4)" tem os cards operacionais derivados desta doc.
