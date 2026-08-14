---
tags: [api, integração, backend]
---

← [[20 - Relatórios e Ganhos]] | [[Início]]

# Parte 21 — Integração com a API real (`marinsprosper-api`)

O backend (`marinsprosper-api`, NestJS + Postgres + Redis + TRON, repositório separado) chegou até o **Sprint 3**: auth (incl. MFA/enrollment), KYC completo, ordens com máquina de estados real, custódia/caução on-chain (testnet TRON), chat com WebSocket, disputas/mediação, avaliações, painel de admin (usuários/ordens/audit-logs/blacklist) e idempotência. O motor do ledger de dupla entrada existe e é testado, mas **ainda sem rota HTTP** — é o que continua bloqueando Relatórios & Ganhos. Esta doc substitui o contrato provisório de [[05 - Especificação de API]] pelo contrato real, e mapeia o que dá pra conectar agora vs. o que continua mockado.

Levantamento feito por inspeção direta do código do backend (`src/modules/`, `prisma/schema.prisma`, `README.md`, `.env.example`, `deploy/`), não por suposição — mesmo princípio das outras auditorias deste vault (ver [[19 - Checklist de Validação Sprint -1]]). Reauditado em 2026-08-13 (auditoria anterior: 2026-08-10) — o backend avançou bastante nesses 3 dias: KYC, MFA (enrollment), avaliações, disputas e todo o painel de admin saíram do zero pra prontos. As seções abaixo foram atualizadas por completo, não só emendadas.

## -1. Estado da implementação no front

Os 4 primeiros itens do bucket "Fundação" do Kanban já existem em código:

- **Cliente HTTP** (`src/lib/api/client.ts`, `config.ts`, `errors.ts`, `types.ts`) — `apiFetch`/`api.{get,post,patch,delete}`, base URL sempre via `NEXT_PUBLIC_API_URL` (nunca `localhost`), `Decimal = string` como lembrete de tipo pra nunca converter dinheiro, `ApiError` (`isNotFound`/`isConflict`/`isUnauthorized`) separado de `ApiNetworkError` (falha de CORS/rede antes de qualquer resposta chegar).
- **`Idempotency-Key`** (`src/lib/api/idempotency.ts`) — `generateIdempotencyKey()` valida contra `[A-Za-z0-9._~-]{16,128}`; `createIdempotencyKeyManager()` guarda a chave de uma ação em andamento pra retry reusar (`getKey()`) e reseta só quando a ação conclui (`reset()`). Opcional em `apiFetch` — só as rotas ⚡ da tabela em §3 devem passar a key; o cliente não força o header em toda escrita (auth, por exemplo, não usa). `ApiFetchResult.replayed` expõe o header `Idempotent-Replayed`.
- **Autenticação real** (`src/lib/auth/`) — login/register/refresh/logout/MFA (verify + recovery) contra o backend de teste, sessão em `localStorage` (`storage.ts`), claims do `accessToken` lidas só pra UI via `jwt.ts` (nunca decide autorização sozinho), interceptor de 401 (`client.ts` → `auth-token.ts` → `AuthProvider`) que tenta um refresh e só chama `notifySessionExpired()` se ele também falhar. `AuthProvider` entra no layout raiz (`src/app/layout.tsx`), ao lado do `ThemeProvider` — **não mexe** no `MockSessionProvider`/`AccountSwitcher` do bucket `(dashboard)`, que continuam sendo a identidade "vista como" pro resto do app ainda mockado (ordens, carteira etc.).
  - Campos reais confirmados direto no Swagger do ambiente de teste (`/docs-json`, 2026-08-14) — divergem do que a versão anterior desta doc descrevia: `POST /auth/register` usa `fullName`/`documentType` (`CPF`|`CNPJ`)/`documentNumber`/`phone` (opcional), senha com **mínimo de 12 caracteres** (não 8); `POST /auth/refresh` e `POST /auth/logout` exigem `refreshToken` no corpo (`RefreshDto`, 64 caracteres), não só o Bearer; `POST /auth/mfa/verify` exige Bearer com o `mfaToken` de vida curta devolvido pelo login (corpo só com `code`). `POST /auth/mfa/recovery` não aparece no Swagger ainda — implementado espelhando o mesmo contrato de `verify` por falta de opção melhor, mas sem confirmação; se a rota não existir de verdade, a tela trata como qualquer `ApiError` (404).
  - `/register` ganhou um campo de documento (tipo + número) que não existia no protótipo; `@username`, país e cidade continuam só na UI (backend ainda não aceita, ver §3).
  - Testado manualmente contra `https://api.163-176-220-125.sslip.io` em 2026-08-14: o front monta a chamada corretamente e falha exatamente como a doc previa — `ApiNetworkError` ("não foi possível contatar o servidor"), porque a origem local ainda não está em `CORS_ORIGINS`. Não deu pra validar o caminho feliz (200) até essa pendência ser resolvida pelo time de backend.

Pendência que ficou fora (não é código de front, ver §0 abaixo): pedir ao time de backend pra acrescentar a origem do front em `CORS_ORIGINS` — é o único bloqueio real que resta pra testar login/registro ponta a ponta.

## 0. Onde o backend roda — a separação front/backend é real, não só arquitetural

Front e backend rodam em **repositórios e máquinas diferentes**. Não existe (e não vai existir) um backend em `localhost` pro front apontar — desde o primeiro dia o backend sobe numa VM própria.

- **Ambiente de teste (não é produção)**: `https://api.163-176-220-125.sslip.io` — Swagger interativo em `/docs`, uma VM ARM da Oracle Cloud (São Paulo, Always Free), HTTPS via Caddy com certificado automático. `sslip.io` resolve pro IP embutido no próprio nome — é assim que dá pra ter HTTPS de verdade sem comprar domínio. Detalhes de como a VM foi montada em `deploy/README.md` no repositório do backend, só como referência — o front não precisa mexer nisso.
- **Contas de teste prontas**, senha `teste-marinsprosper-2026` em todas:

  | E-mail | Papel |
  | --- | --- |
  | `cliente@teste.local` | cliente |
  | `cliente2@teste.local` | outro cliente, pra exercitar as duas pontas de uma ordem |
  | `cashier@teste.local` | cashier, 10.000 USDT de colateral |
  | `cashier2@teste.local` | cashier, 5.000 USDT |
  | `mediador@teste.local` | mediador — papel separado de admin, ver §1 |

- **CORS precisa de allowlist manual** — hoje só os `localhost` habituais estão em `CORS_ORIGINS` no backend. Antes de qualquer chamada de verdade (local ou do deploy no Vercel), pedir ao time de backend pra acrescentar a origem específica; sem isso o navegador barra a chamada antes mesmo dela sair (nenhum erro de rede útil aparece, só falha de CORS no console).
- **`NEXT_PUBLIC_API_URL`/`NEXT_PUBLIC_WS_URL`** (`.env.example`, na raiz deste repo) já apontam pro ambiente de teste acima — não pra `localhost`. Precisam ser trocadas de novo quando o backend for pra produção de verdade (Cloud Run, ver README do backend).
- **Sem backup neste ambiente** — é deliberado, é ambiente de teste. Dados podem ser resetados a qualquer momento (`deploy.sh --seed` reescreve as contas de teste). Não guardar nenhum estado que "precisa sobreviver" nesse ambiente.

## 1. O que muda na forma de integrar (decisões do backend que o front precisa respeitar)

- **Dinheiro trafega como string decimal**, nunca `number` — ex. `"250.75"`, não `250.75`. O tipo `Order.grossAmount: number` (`src/types/order.ts`) precisa virar `string` na integração real; nunca usar `parseFloat` antes da exibição final.
- **`Idempotency-Key` obrigatório em toda escrita financeira** — header novo por *ação do usuário* (ex. `crypto.randomUUID()` no momento do clique), não por sessão nem por página. Faltando → 400; mesma key com corpo diferente → 422; key em corrida → 409. Resposta repetida vem com header `Idempotent-Replayed: true`.
- **404, não 403, pra quem não é parte da ordem** — tanto HTTP quanto WebSocket devolvem "não encontrado" pra ordem alheia, nunca "sem permissão" (evita vazar que a ordem existe). O front não deve distinguir os dois casos na UI.
- **DTOs estritos** — campo desconhecido no corpo é 400, não ignorado silenciosamente. Formulários não podem mandar campos "extra" que a tela usa só internamente.
- **CORS com allowlist obrigatória em produção** — `NEXT_PUBLIC_API_URL` do front precisa estar cadastrado em `CORS_ORIGINS` do backend; wildcard é rejeitado quando há credenciais.
- **`MEDIATOR` é um papel próprio, separado de `ADMIN`** — diferente do que o protótipo assume hoje (`/admin/disputes` tratando mediação como função do admin). No backend real, tudo sob `/admin/*` exige `ADMIN` (403 até pra mediador), e tudo sob `/disputes/*` exige ser parte da ordem ou o `MEDIATOR` designado pro caso — um admin comum não acessa `/disputes/:id` de outra pessoa. O papel viaja dentro do JWT: quem acaba de receber um papel novo precisa logar de novo.
- **Sem guard de RBAC genérico** — os papéis (`CLIENT`, `CASHIER`, `MEDIATOR`, `ADMIN` — não mutuamente exclusivos, uma conta pode acumular mais de um) vêm dentro do JWT de acesso, concedidos manualmente hoje (sem `POST /cashier/apply` ainda) e checados por service, não por decorator central.

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
| `EXPIRED` | `EXPIRED` | igual, mas disparado por sweep de banco, não por timer no cliente — e só se aplica ao prazo **antes** de qualquer pagamento declarado (mesmo caso que `PaymentCountdown` cobre hoje). Prazo estourado *depois* de pagamento declarado vai pra `DISPUTED`, não `EXPIRED` — expirar sozinho ali devolveria o colateral ao cashier e deixaria o cliente sem o dinheiro e sem a ordem |
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
| `POST /auth/mfa/verify` | `/mfa` | ✅ pronto — segunda etapa do login quando o fator está ativo (`{ mfaRequired: true, mfaToken }` na resposta do login) |
| `POST /auth/mfa/recovery` | `/mfa` (link "usar código de recuperação") | ✅ pronto — mesma tela, aceita um código de recuperação em vez do TOTP |
| `GET /auth/mfa`, `POST /auth/mfa/setup`, `POST /auth/mfa/activate`, `DELETE /auth/mfa` | — (nenhuma tela ainda) | 🆕 **novo desde a auditoria de 08/10** — enrollment completo existe agora. Falta tela: QR code do `otpauthUri`, exibir os códigos de recuperação **uma única vez** (não há rota que os reexiba depois), e um lugar em `/profile` pra ativar/desativar. Nenhuma tela do protótipo cobre isso hoje |
| — | `/verify-email`, `/verify-phone` | ❌ sem endpoint — OTP duplo de e-mail/telefone não existe no backend; continuam mockados |
| `POST /kyc`, `GET /kyc/me`, `POST /kyc/documents`, `POST /kyc/submit` | `/kyc`, `/kyc/status` | 🆕 **novo desde a auditoria de 08/10** — fluxo completo existe agora: abrir caso, anexar documento (via `POST /uploads` primeiro, depois `uploadId` aqui — mesmo padrão de upload direto do chat), enviar pra análise (exige `ID_FRONT` e `SELFIE`). Cadastro nasce em `PENDING_KYC`; sem KYC aprovado, o resto da API fica bloqueado por regra de negócio nas rotas que dependem de conta `ACTIVE` |
| — | `/cashier-apply` | ❌ sem endpoint — virar caixeiro hoje é só SQL manual; tela mostra "solicitação enviada" mas não tem o que chamar |
| — | `/blocked` | — nunca teve endpoint próprio, sem mudança |

### Ordens

| Endpoint | Ação atual no front | Status |
|---|---|---|
| `POST /orders` ⚡ | `orders/new` → `createOrder` | ⚠️ pronto, mas **modelo diferente do front**: corpo é `{ side: "CLIENT_BUYS_ASSET" \| "CLIENT_SELLS_ASSET", asset, assetAmount, rate, clientTronAddress?, publish }` — `assetAmount`/`rate` são string; `clientTronAddress` é **obrigatório quando o cliente compra** (vira o beneficiário fixado no contrato de custódia no aceite — não dá pra pedir depois); `publish: true` já deixa a ordem `OPEN` na mesma chamada (`false` deixa em `DRAFT`). Não existe seleção de chave PIX aqui (ver §5) |
| `GET /orders`, `GET /orders/:id` | `/orders`, `/offers`, `/orders/[id]` | ✅ pronto — cliente vê as próprias, cashier vê as dele + o livro `OPEN` |
| ~~`POST /orders/:id/publish`~~ | — | 🔴 **não existe como endpoint separado** — era suposição da auditoria anterior (08/10). Publicar é o campo `publish: true` no próprio `POST /orders` acima, uma chamada só, não duas |
| `POST /orders/:id/accept` ⚡ | `/offers` → `acceptOrder` | ✅ pronto — só `cashier`; dispara `LOCK` on-chain de verdade; 422 se colateral insuficiente/limite excedido, 409 se a ordem já não estiver `OPEN` |
| `POST /orders/:id/pix` ⚡ | seleção de chave PIX em `orders/new` | ⚠️ **muda o fluxo** — registrado *depois* do aceite, só por quem vai *receber* o BRL (cashier numa compra do cliente, cliente numa venda do cliente). `client-transfer` fica bloqueado (422) até isso ser feito. Ver §5 |
| `POST /orders/:id/client-transfer` ⚡ | `OrderActions` → transferência do cliente | ✅ pronto — 422 se PIX ainda não registrado |
| `POST /orders/:id/cashier-confirm-receipt` ⚡ | `OrderActions` → confirmação do caixeiro | ✅ pronto — **ponto de não retorno**: a partir daqui não existe mais cancelamento de comum acordo (só disputa) |
| `POST /orders/:id/cashier-transfer` ⚡ | `OrderActions` → envio do caixeiro + TXID | ✅ pronto |
| `POST /orders/:id/client-confirm` ⚡ | `OrderActions` → confirmação final do cliente | ✅ pronto — dispara `RELEASE` on-chain |
| `POST /orders/:id/cancel-request` ⚡, `POST /orders/:id/cancel-response` ⚡ | fluxo de cancelamento | ✅ pronto — quem solicitou não pode responder ao próprio pedido; bloqueado (409) a partir de `RECEIPT_CONFIRMED` |
| `POST /orders/:id/cancel` ⚡ | — | ✅ pronto — cancelamento direto antes do aceite (`DRAFT`/`OPEN`), sem passar por solicitação/resposta |
| `POST /orders/:id/rating` ⚡, `GET /users/:id/ratings` | Avaliação por estrelas pós-conclusão | 🆕 **novo desde 08/10** — 1 a 5 + comentário opcional, uma por ordem, só depois de `COMPLETED` (409 enquanto anda). Quem *pediu* o cancelamento não avalia (403, esconder o botão pro requerente); `EXPIRED` também não avalia. Nota é imutável. `GET /users/:id/ratings` traz média/distribuição/comentários públicos — dá pra aposentar `getUserReputation` local |
| `POST /ratings/:id/moderation` ⚡ | — (sem tela) | 🆕 admin esconde/reexibe uma avaliação, sempre com motivo — sem tela no protótipo ainda; candidato a `/admin/*` |
| — | Congelar/liberar (`FROZEN_FOR_AUDIT`) | ❌ sem endpoint, ver §2 |
| `POST /orders/:id/dispute` ⚡ | Abrir disputa (`/orders/[id]` → disputa) | 🆕 **novo desde 08/10** — só as partes, só a partir de `CLIENT_TRANSFERRED` (409 antes disso; o botão certo ali é cancelar). Disputa já nasce com mediador designado (menor fila). Prazo estourado *depois* de pagamento declarado também cai em `DISPUTED` (não em `EXPIRED`) — sem quem abrir, aparece direto em `GET /disputes` |
| `GET /disputes`, `GET /disputes/:id` | — (sem tela — hoje é `/admin/disputes`, papel errado, ver §1) | 🆕 fila do mediador (`GET /disputes`) e detalhe restrito às partes + mediador designado (`GET /disputes/:id`, 404 pra quem não é). Mensagens filtradas por público (`MEDIATOR_CLIENT`/`MEDIATOR_CASHIER` só pro lado escolhido; partes só mandam `ALL`) |
| `POST /disputes/:id/evidence` ⚡ | — | 🆕 multipart, exige arquivo (relato sem documento é mensagem, não prova) |
| `POST /disputes/:id/messages` ⚡ | `OrderChat` (chat restrito de mediador do protótipo) | 🆕 canal da apuração — só mediador escolhe o público |
| `POST /disputes/:id/decision` ⚡ | Decisão do mediador (`/admin/disputes/[id]`) | 🆕 **duas etapas, dois mediadores diferentes** — `RECOMMENDATION` (quem apura) e depois `APPROVAL` (quem confere, é isso que move o escrow). Aprovar a própria recomendação é 403; aprovar com desfecho diferente do recomendado é 422. `RELEASE` conclui a ordem, `REFUND` cancela. Diferente do protótipo hoje: dois nomes distintos + reconfirmação de senha numa tela só — o backend exige duas *contas* de mediador diferentes, uma decisão de UX que muda a tela inteira |

### Caixeiro & caução

| Endpoint | Tela atual | Status |
|---|---|---|
| `GET /cashier/collateral` | `/wallet` | ⚠️ backend devolve **espelho** do saldo on-chain com `mirrorAgeSeconds` (idade da leitura) + `pendingMovements` (o que ainda não tem transação em cadeia — `RELEASE`/`REFUND` ficam pendentes indefinidamente por desenho, quem os efetiva são os signatários do contrato, fora da API) — não são "sete saldos" como o front modela hoje (`available/reserved/blocked/underReview/usedForReimbursement/pendingWithdrawal/withdrawn`, `src/lib/mock/collateral.tsx`); precisa remapear pra 2 saldos (livre/travado) + idade do espelho + lista de movimentos pendentes. Mostrar a idade quando ela for alta — o aceite de ordem **recusa** leitura vencida (`COLLATERAL_MIRROR_MAX_AGE_MS`, 5min por padrão) |
| `POST /cashier/collateral/deposit-address` ⚡ | `/wallet` → endereço de depósito | ⚠️ **inverte a direção** — no protótipo o backend "gera" o endereço; na API real é o **caixeiro quem registra** seu próprio endereço TRON de origem, e a resposta diz pra onde depositar. Tela de depósito precisa virar um formulário, não uma exibição |
| `POST /cashier/collateral/sync` ⚡ | — | sem equivalente no front ainda — botão "atualizar saldo" a adicionar, pra quando `mirrorAgeSeconds` estiver alto e o aceite de ordem estiver recusando por leitura vencida |
| `GET /cashier/limit` | `/wallet` (limite bruto/disponível) | ✅ pronto — `computeCashierLimit` do front vira só leitura direta da resposta |
| — | Confirmação de depósito (8s simulados) | ⚠️ **muda de mecanismo** — confirmação real vem de um **webhook on-chain** (`POST /webhooks/tron/deposit-confirmed`, autenticado por HMAC, servidor-a-servidor, o front nunca chama isso e nem aparece no Swagger). Front deve *pollar* `GET /cashier/collateral` (ou futuramente escutar um evento) em vez de simular um timer fixo |
| — | Saque de caução (`pendingWithdrawal`) | ❌ **ainda sem endpoint** — continua a única pendência de caução dos dois lados (front já implementou o mock completo, ver [[17 - Carteira e Caução]]); nada mudou aqui desde 08/10 |
| — | Disponibilidade do caixeiro (`/wallet/availability`) | ❌ sem endpoint — `cashier_availability` nunca saiu do papel |

### Chat

| Endpoint | Tela atual | Status |
|---|---|---|
| `GET /orders/:id/messages` | `OrderChat` | ✅ pronto — inclui timeline de eventos de sistema (`kind: "SYSTEM"`) junto com as mensagens; a tela de chat já é a linha do tempo da ordem |
| `POST /orders/:id/messages` ⚡ (multipart, `body`/`file`/ambos) | `OrderChat` → envio | ✅ pronto — anexo detectado por assinatura de bytes (não pelo `Content-Type` declarado), 10MB, JPEG/PNG/WebP/PDF; SVG e executáveis são recusados mesmo renomeados |
| `POST /uploads` ⚡, depois `uploadId` no lugar do arquivo | — (front hoje só manda multipart) | alternativa ao multipart pra não passar o arquivo pela API: pede URL assinada, `PUT` direto no bucket, depois usa o `uploadId` em `messages`/`disputes/:id/evidence`. Vale considerar pra anexos grandes/conexão ruim; multipart continua mais simples pro caso comum |
| `ws /chat` (Socket.IO, namespace `/chat`) | indicador de "digitando" | ⚠️ WebSocket é **só entrega** — envio de mensagem continua sempre por `POST`. Handshake leva o JWT em `auth.token`; entrar na sala é `emitWithAck('entrar', orderId)` (retorna `{ ok: true }` ou `{ ok: false, motivo }`); evento `status` chega também quando o prazo expira sem ninguém agir. Indicador de "digitando" não tem evento dedicado ainda |
| — | URL de anexo | ⚠️ URLs assinadas expiram em **5 minutos** — o front nunca deve cachear/persistir a URL entre navegações, sempre pedir de novo em `GET /orders/:id/messages` |

### Admin & Relatórios

| Endpoint | Tela atual | Status |
|---|---|---|
| `GET /admin/users?status=PENDING_KYC`, `POST /admin/users/:id/approve` | `/admin/users` | 🆕 **novo desde 08/10** — fila de aprovação (por status) e liberação (`PENDING_KYC → ACTIVE`), aceita `reason` obrigatório pro histórico. Front hoje aprova sem exigir motivo — precisa de um campo a mais na tela |
| `GET /admin/orders` | `/admin/orders` | 🆕 ordens de qualquer usuário, única leitura sem recorte de parte — igual ao que a tela já assume |
| `GET /admin/audit-logs` | `/admin/audit-logs` | 🆕 filtrável por ação/entidade/ator/período, só leitura (é append-only no banco) — front já é só-leitura, encaixa direto |
| `GET /admin/blacklist`, `POST /admin/blacklist` | `/admin/blacklist` | 🆕 bloqueia/desbloqueia por `DOCUMENT`/`EMAIL`/`USER`/`TRON_ADDRESS`/`PIX_KEY` (documento e e-mail normalizados antes de gravar; endereço TRON não, o checksum depende da caixa). Quem esbarra recebe 403 genérico, sem dizer qual alvo casou — front não deve tentar ser mais específico que isso na mensagem de erro |
| `GET /admin/kyc`, `GET /admin/kyc/:id`, `POST /admin/kyc/:id/claim`, `POST /admin/kyc/:id/review` | — (sem tela) | 🆕 fila de análise de KYC com URL assinada por documento, "assumir caso" (dois analistas não pegam o mesmo), aprovar/recusar com motivo. Sem tela equivalente no protótipo ainda — candidato a `/admin/kyc`, ao lado dos outros atalhos de `/admin` |
| `POST /ratings/:id/moderation` | — (sem tela) | 🆕 ver linha em Ordens acima — esconder/reexibir avaliação, só ADMIN |
| — | `/admin/disputes` (mediação) | ⚠️ **papel errado** — mediação no backend é `GET/POST /disputes/*`, exige `MEDIATOR`, não `ADMIN` (ver §1). A tela precisa sair de dentro de `/admin/*` ou passar a checar um papel diferente — decisão de produto, não só de endpoint |
| — | `/reports`, `/admin/reports` | ❌ **ledger continua sem rota HTTP** — único bloqueio real que restou neste levantamento. Bucket [[20 - Relatórios e Ganhos]] inteiro continua mockado; nem GMV nem ganhos do caixeiro têm de onde vir ainda. Motor, persistência e estorno do ledger já existem e são testados — só falta o controller |

## 4. O que ainda falta ser decidido/construído no backend

Não é trabalho do front, mas bloqueia integração — registrar aqui pra rastrear. Lista bem menor que a da auditoria de 08/10 (a maioria foi resolvida):

- Rota HTTP pro ledger (mesmo que só leitura) — sem isso, [[20 - Relatórios e Ganhos]] não sai do mock. Único bloqueio "grande" que restou.
- Endpoint de saque de caução (`pendingWithdrawal`).
- `POST /cashier/apply` (hoje só SQL manual — papel de cashier e limite entram por seed).
- Disponibilidade do caixeiro (`cashier_availability`).
- OTP duplo de e-mail/telefone (`/verify-email`, `/verify-phone`) — não está nem no roadmap do backend; a decidir se continua fazendo sentido com MFA por TOTP já existindo.
- Decisão sobre `FROZEN_FOR_AUDIT` — existe só no front, precisa virar decisão de produto antes de virar trabalho de backend.
- Rate limiting nos endpoints de autenticação (pendência que o próprio backend já lista como conhecida).

## 5. Mudanças de modelagem que a integração real força no front

- **`Order.type` (`compra`/`venda`) vira `side` (`CLIENT_BUYS_ASSET`/`CLIENT_SELLS_ASSET`)** — mapeamento direto (`compra` = `CLIENT_BUYS_ASSET`), mas o nome do campo e os valores do enum mudam em todo lugar que hoje lê `order.type`.
- **`clientTronAddress` obrigatório na criação quando o cliente compra** — campo novo que `orders/new` não tem hoje; sem ele o backend rejeita a criação. Vale validar formato/checksum na UI antes de submeter, mesmo padrão do resto (validação de UI + backend confere de novo).
- **Chave PIX sai da criação da ordem** e vira uma etapa pós-aceite (`POST /orders/:id/pix`), registrada por quem *recebe* o BRL — o front precisa mover a UI de seleção de chave de `orders/new` pra uma tela/etapa depois do aceite, e a checagem de titularidade (anti-triangulação) muda de "checar contra chave salva no perfil" pra "checar contra o documento do KYC de quem está registrando ali". Isso também muda `Order.cashierPixKeySnapshot` (ver [[14 - Ofertas e Ordens]]) — no protótipo esse snapshot nasce no aceite; na API real nasce só quando `POST /orders/:id/pix` for chamado, um passo depois.
- **Criação de ordem é uma chamada só**, não duas — `publish: true`/`false` é campo do próprio `POST /orders`. A suposição de `POST /orders/:id/publish` como endpoint separado (auditoria anterior, ainda no Kanban) está errada e precisa ser corrigida lá também.
- **Valores monetários e de ativo trafegam como string** — qualquer lugar do front que soma/formata esses campos (`formatBRL`, `formatUSDT`, cálculos de relatório) precisa converter primeiro, nunca operar direto em cima da string.
- **Caução vira 2 saldos + espelho + movimentos pendentes**, não 7 — telas e componentes que assumem `available/reserved/blocked/underReview/usedForReimbursement/pendingWithdrawal/withdrawn` (`src/lib/mock/collateral.tsx`) precisam de um novo modelo.
- **Mediação sai de `/admin/*`** — precisa checar o papel `MEDIATOR`, não `ADMIN` (ver §1 e a linha de `/admin/disputes` em §3). Decisão de produto: fica em `/admin/disputes` só reinterpretando o papel, ou vira uma seção própria fora de admin?
- **Decisão de disputa exige dois mediadores diferentes** (recomendação + aprovação), não uma pessoa preenchendo dois campos numa tela só — muda a tela de decisão de `/admin/disputes/[id]` de fluxo síncrono pra assíncrono (a recomendação fica pendente até outro mediador aprovar).
- **Cliente HTTP com `Idempotency-Key` automático** — card já previsto no Kanban (`src/lib/api`), agora com requisito concreto: gerar UUID v4 novo a cada ação do usuário (não por request de retry — retry deve **reusar** a mesma key), formato `[A-Za-z0-9._~-]{16,128}`.
- **Base URL não é `localhost`** — `NEXT_PUBLIC_API_URL`/`NEXT_PUBLIC_WS_URL` (`.env.example`) já apontam pro ambiente de teste da VM (ver §0); qualquer código que assumisse desenvolvimento local do backend lado a lado com o front precisa ser revisto.

## Ver também

- [[05 - Especificação de API]] — contrato provisório (Fase 1), mantido como registro histórico; esta doc é quem vale a partir de agora.
- [[09 - Roadmap de Sprints]] — Sprint 4 é "conexão do frontend com a API real".
- [[Kanban]] — bucket "Integração com API real (Sprint 4)" tem os cards operacionais derivados desta doc.
