---

kanban-plugin: board

---

## Backlog — decisões e bloqueios (fora do controle direto do front)

- [ ] Auditoria externa do smart contract Tron concluída — bloqueia liberar telas de depósito de caução em mainnet #bloqueio #jose
- [ ] Definição de jurisdição/enquadramento regulatório — bloqueia Fase 3 (dinheiro real) #bloqueio #julia
- [ ] Provedor de KYC contratado (idwall, Unico, Serpro, CAF) — define qual SDK/widget o front vai integrar #decisão #jose
- [ ] Provedor de Auth definido (Auth0, Cognito, Supabase Auth ou JWT próprio) — define camada de autenticação do front #decisão #julia
- [ ] Validação de comprovante via OCR/IA — ainda não especificada; se entrar, é só triagem (não decide sozinha), então a UI precisa deixar claro que segue em análise humana #ideia #jose
- [ ] Autorizar o GitHub App do Vercel na organização Marinsprosper-P2P-Plataform (precisa de admin/owner logado) — bloqueia o card de deploy em [[09 - Roadmap de Sprints|Sprint 5]]; passo a passo em [[12 - Deploy (Vercel)]] #bloqueio #jose


## Design System (Fase 1) — antes de qualquer tela final



## Autenticação & Onboarding (Sprint -1, dados fake)


## Perfil & Configurações (Sprint -1, dados fake)


## Ofertas & Ordens (Sprint -1, dados fake)


## Chat & Comprovantes (Sprint -1, dados fake)


## Carteira & Caução — visão do Caixeiro (Sprint -1, dados fake)


## Administração & Mediação (Sprint -1, dados fake)


## Relatórios & Ganhos (Sprint -1, dados fake)



## Integração com API real (Sprint 4)

Backend (`marinsprosper-api`, repositório separado: <https://github.com/Marinsprosper-P2P-Plataform/marinsprosper-api>) reauditado em 2026-08-13 (auditoria anterior 08-10) — avançou bastante: além de auth/ordens/custódia/chat/idempotência do levantamento anterior, agora também KYC completo, MFA com enrollment, avaliações, disputas/mediação e todo o painel de admin (usuários, ordens, audit-logs, blacklist). Só o ledger continua sem rota HTTP. Mapeamento completo endpoint↔tela, remapeamento da máquina de estados e lista do que ainda fica bloqueado em [[21 - Integração com API Real]].

**Front e backend são repositórios e máquinas separados, de propósito** — não existe backend em `localhost`. O backend roda numa VM própria desde o primeiro dia; o ambiente de teste atual (não é produção) fica em `https://api.163-176-220-125.sslip.io` (Swagger em `/docs`), com contas de teste prontas (`cliente@teste.local`, `cashier@teste.local`, `mediador@teste.local` etc., senha `teste-marinsprosper-2026` em todas — ver [[21 - Integração com API Real]] §0). `.env.example` já aponta pra lá.

### Fundação (bloqueia todo o resto)

- [ ] Pedir ao time de backend pra acrescentar a origem do front (`localhost:3000` em dev, domínio do Vercel depois) em `CORS_ORIGINS` — sem isso o navegador bloqueia toda chamada antes de sair, sem erro de rede útil no console; **precisa de ação humana fora do front, não dá pra resolver em código**; confirmado em teste manual de `/login` em 2026-08-14 (toast "Não foi possível contatar o servidor", exatamente o sintoma sem detalhe de rede descrito na doc) — é o único item que resta neste bucket, e o único bloqueio real pra testar qualquer coisa ponta a ponta contra a API #jose

### Ordens & Ofertas

- [ ] Criação de ordem — `POST /orders` numa chamada só (`publish: true/false` é campo do corpo, **não** um endpoint `/publish` separado — correção da auditoria anterior); `Order.type` (compra/venda) vira `side` (`CLIENT_BUYS_ASSET`/`CLIENT_SELLS_ASSET`); `clientTronAddress` passa a ser campo obrigatório quando o cliente compra #jose
- [ ] Aceite de ordem (`/offers`) — `POST /orders/:id/accept`, tratar 422 de caução insuficiente/limite excedido como erro específico, não genérico #julia
- [ ] Mover seleção de chave PIX de `orders/new` pra uma etapa pós-aceite — `POST /orders/:id/pix`, registrada por quem *recebe* o BRL (mudança de fluxo, não só de endpoint); trava anti-triangulação passa a checar contra o documento do KYC de quem registra, não contra chave salva no perfil; `Order.cashierPixKeySnapshot` (ver [[14 - Ofertas e Ordens]]) passa a nascer nesse passo, não no aceite #jose
- [ ] Ciclo de transferência/confirmação (`OrderActions`) — `client-transfer`, `cashier-confirm-receipt` (ponto de não retorno pro cancelamento mútuo), `cashier-transfer`, `client-confirm` #julia
- [ ] Cancelamento — `cancel-request`/`cancel-response` (mútuo, bloqueado a partir de `RECEIPT_CONFIRMED`) e `cancel` (direto, antes do aceite) #jose
- [ ] Avaliação por estrelas — `POST /orders/:id/rating` + `GET /users/:id/ratings` (aposenta `getUserReputation` local); quem pediu cancelamento não avalia, `EXPIRED` não avalia #julia
- [ ] Disputas — sai de `/admin/disputes` (papel errado: mediação exige `MEDIATOR`, não `ADMIN`) e passa a chamar `POST /orders/:id/dispute`, `GET /disputes`, `GET /disputes/:id`, `POST /disputes/:id/evidence`/`messages`/`decision`; decisão passa a exigir **dois mediadores diferentes** (recomendação + aprovação), fluxo assíncrono, não uma tela só #jose

### Carteira & Caução

- [ ] Remodelar `/wallet` pra 2 saldos (livre/travado) + `mirrorAgeSeconds` (idade do espelho on-chain) + `pendingMovements`, em vez dos 7 baldes atuais (`available/reserved/blocked/underReview/usedForReimbursement/pendingWithdrawal/withdrawn`) #julia
- [ ] Fluxo de depósito inverte de direção — caixeiro registra o próprio endereço TRON (`POST /cashier/collateral/deposit-address`), backend não gera nada; confirmação vem de webhook on-chain, front precisa *pollar* `GET /cashier/collateral` em vez do timer de 8s simulado #jose
- [ ] Limite do caixeiro — `GET /cashier/limit`, substitui `computeCashierLimit` local por leitura direta #julia
- [ ] Botão "atualizar saldo" (`POST /cashier/collateral/sync`) — pra quando o espelho estiver velho e o aceite de ordem começar a recusar por leitura vencida #jose

### KYC & MFA

- [ ] Fluxo de KYC — `POST /kyc`, `GET /kyc/me`, `POST /kyc/documents` (via `POST /uploads` primeiro), `POST /kyc/submit` (exige ID_FRONT + SELFIE); `/kyc` e `/kyc/status` do protótipo saem do mock #julia
- [ ] Enrollment de MFA — `GET /auth/mfa`, `POST /auth/mfa/setup` (QR do `otpauthUri`), `POST /auth/mfa/activate` (mostrar os códigos de recuperação uma única vez — não há rota que os reexiba), `DELETE /auth/mfa`; sem tela no protótipo ainda, provável destino é `/profile` #jose
- [ ] Segunda etapa do login com MFA — `POST /auth/mfa/verify` e `/auth/mfa/recovery`, tratando as duas respostas possíveis de `POST /auth/login` (`{ accessToken, ... }` vs. `{ mfaRequired: true, mfaToken }`) #julia

### Chat

- [ ] Envio/histórico — `GET`/`POST /orders/:id/messages` (multipart pra anexo, sniff de bytes no backend) #jose
- [ ] WebSocket (`Socket.IO`, namespace `/chat`) — só entrega em tempo real; envio continua sempre por POST; handshake leva JWT em `auth.token`, entrar na sala é `emitWithAck('entrar', orderId)` #julia
- [ ] URLs de anexo assinadas expiram em 5 min — nunca cachear entre navegações, sempre pedir de novo em `GET /orders/:id/messages` #jose

### Admin

- [ ] Usuários — `GET /admin/users?status=PENDING_KYC` + `POST /admin/users/:id/approve`; aprovação passa a exigir `reason` (campo novo na tela, front hoje aprova sem motivo) #julia
- [ ] Ordens consolidadas — `GET /admin/orders` #jose
- [ ] Audit logs — `GET /admin/audit-logs`, filtrável por ação/entidade/ator/período #julia
- [ ] Blacklist — `GET`/`POST /admin/blacklist`, 5 tipos de alvo (`DOCUMENT`/`EMAIL`/`USER`/`TRON_ADDRESS`/`PIX_KEY`); erro de bloqueio é sempre genérico, front não deve tentar adivinhar qual alvo casou #jose
- [ ] Fila de KYC — `GET /admin/kyc`, `GET /admin/kyc/:id`, `POST /admin/kyc/:id/claim`, `POST /admin/kyc/:id/review` — sem tela no protótipo ainda #julia
- [ ] Moderação de avaliação — `POST /ratings/:id/moderation` — sem tela no protótipo ainda #jose

### Bloqueado — sem endpoint no backend ainda (não mover pra cá até existir)

- [ ] `/reports`, `/admin/reports` — ledger sem rota HTTP, sem de onde vir GMV/ganhos. Único bloqueio "grande" que restou depois da reauditoria de 08-13 #julia
- [ ] `/verify-email`, `/verify-phone`, `/cashier-apply` — sem endpoint #jose
- [ ] `FROZEN_FOR_AUDIT` — não existe no backend nem está planejado; decisão de produto pendente antes de virar trabalho de backend #julia
- [ ] Saque de caução (`pendingWithdrawal`) e disponibilidade do caixeiro (`/wallet/availability`) — sem endpoint #jose


## Testes, Performance & Deploy (Sprint 5)

- [ ] Testes E2E dos fluxos críticos: criação → aceite → transferência → confirmação → conclusão #jose
- [ ] Teste E2E de cancelamento e de abertura/decisão de disputa #julia
- [ ] Revisão de responsividade mobile-first em todas as telas (breakpoints reais, não só desktop redimensionado) #jose
- [ ] Revisão de acessibilidade (contraste, foco de teclado, labels em formulários financeiros) #julia
- [ ] Otimização de performance (Core Web Vitals) nas telas de maior tráfego (ofertas, detalhe de ordem) #jose
- [ ] Deploy em produção (Vercel ou Cloudflare Pages) com CI/CD via GitHub Actions #julia


## Concluído

- [ ] Validar o design system com a equipe antes de aplicar nas telas finais #jose
- [ ] Repositório conectado ao GitHub
- [ ] Scaffold Next.js (App Router, TypeScript, Tailwind, shadcn/ui)
- [ ] Documentação inicial (PRD, arquitetura, modelo de dados, segurança, API, testes, incidentes)
- [ ] Estrutura de pastas do frontend (rotas e diretórios de suporte)
- [ ] Vault Obsidian com documentação e Kanban
- [ ] Tokens de tema mobile-first no Tailwind (breakpoints, espaçamento, tipografia, cores) — `globals.css`, incluindo correção do token `--font-sans` que estava auto-referenciado
- [ ] Paleta de cor por estado de ordem — 6 categorias (aberta/andamento/concluída/cancelada/disputa/expirada), tokens `--status-*` em `globals.css`
- [ ] Componentes base shadcn/ui (Button, Input, Select, Textarea, Dialog, Tabs, Table, Badge, Avatar, Sonner)
- [ ] Componente `OrderStatusBadge` — mapeia os 21 estados da máquina de estados pra rótulo + cor
- [ ] Componente `OrderTimeline` — stepper do fluxo principal, com tratamento de ramos (cancelamento/disputa/expiração)
- [ ] Layout responsivo mobile-first — `Sidebar` (desktop) + `BottomNav` (mobile), aplicado em `(dashboard)/layout.tsx`
- [ ] Dark mode — implementação própria em `src/lib/theme.tsx` (`next-themes` foi removida depois — sem manutenção desde mar/2025, incompatível com React 19; ver [[14 - Ofertas e Ordens]])
- [ ] Documentação do design system no Obsidian — [[10 - Design System]]
- [ ] Página raiz (`/`) — antes era o template padrão do Next.js, agora redireciona para `/login`
- [ ] Tela de login (`/login`) — e-mail/senha + placeholder de MFA pra caixeiro/admin
- [ ] Tela de MFA (`/mfa`) — código de 6 dígitos, segunda etapa do login
- [ ] Tela de registro (`/register`) — cadastro com seleção de papel (cliente ou caixeiro)
- [ ] Fluxo de KYC — upload (`/kyc`) e status (`/kyc/status`, com preview de aprovado/rejeitado via query param)
- [ ] Fluxo de solicitação para virar caixeiro (`/cashier-apply`)
- [ ] Helper de sessão expirada (`src/lib/session.ts`) — pronto pro cliente HTTP real chamar no Sprint 4
- [ ] Tela de usuário bloqueado (`/blocked`) — sem detalhar motivo interno de risco
- [ ] "Backend fake" em memória (`src/lib/mock`) — máquina de estados de verdade, não só telas estáticas; ver [[14 - Ofertas e Ordens]]
- [ ] Listagem de ofertas (`/offers`) — visão do caixeiro, respeita limite de caução disponível
- [ ] Formulário de criação de ordem (`/orders/new`) — cotação só aparece depois de "round-trip" simulado ao backend
- [ ] Listagem "Minhas ordens" (`/orders`) — unificada, mostra badge "Como cliente"/"Como caixeiro" por ordem
- [ ] Detalhe da ordem (`/orders/[id]`) com Timeline + todas as ações do ciclo (aceitar, transferir, confirmar, TXID, confirmar final), checagem de participante contra IDOR
- [ ] Cancelamento (solicitar/responder) e disputa, a partir da ordem
- [ ] Avaliação por estrelas pós-conclusão
- [ ] Testado manualmente de ponta a ponta em build de produção (aceitar → transferir → confirmar → TXID → confirmar final → avaliar → criar nova ordem)
- [ ] Removida a dependência `next-themes` (sem manutenção, incompatível com React 19) — dark mode reimplementado sem lib externa
- [ ] Chat da ordem (`src/lib/mock/chat.tsx` + `OrderChat`) — histórico imutável, edição gera nova versão "(editada)" sem apagar a original
- [ ] Envio de texto e anexo (imagem com preview real via blob:, PDF com ícone) no chat
- [ ] Indicação visual de anexo privado — nunca link público
- [ ] Indicador de "digitando" (expira sozinho, pronto pro WebSocket do Sprint 4)
- [ ] **Refatoração (1ª rodada)**: conta pode ser cliente e caixeiro ao mesmo tempo — `AccountSwitcher` substitui o antigo `RoleSwitcher`; papel agora é derivado por ordem, não fixo na conta
- [ ] **Refatoração (2ª rodada)**: removido todo gate — qualquer conta já pode ser cliente e caixeiro automaticamente, sem toggle nem aprovação simulada no protótipo (regra real de caução/aprovação continua documentada pro Sprint 2+); ver [[15 - Chat e Comprovantes]]
- [ ] Prevenção de autonegociação — ninguém pode aceitar a própria ordem
- [ ] Campo `@username` no cadastro (`/register`) — único e imutável, validação de formato na UI e checagem de disponibilidade simulada (`checkUsernameAvailability`, round-trip fake); ver [[13 - Autenticação e Onboarding]]
- [ ] Campo de país (`Select`) e cidade no onboarding (`/register`)
- [ ] Verificação dupla por OTP após o cadastro — `/verify-email` e `/verify-phone`, código de 6 dígitos cada, componente `OtpForm` reaproveitado entre as duas; formato validado na UI, correção fica pro backend (mesmo princípio do `/mfa`)
- [ ] Página de Perfil & Configurações (`/profile`) — `@username`, país, cidade e reputação calculada a partir das ordens concluídas com avaliação; ver [[16 - Perfil e Configurações]]
- [ ] Cadastro e listagem de chaves PIX (`src/lib/mock/pix-keys.tsx`) — tipo de chave, chave, instituição, descrição; trava de titularidade validada na UI pro tipo CPF/CNPJ (compara com o documento fake do KYC), demais tipos só avisam que a validação real é no backend
- [ ] Filtro/abas "Comprar" e "Vender" em `/offers`, filtrando por `order.type` #jose
- [ ] Reputação/estrelas da contraparte (`getUserReputation`, `ReputationStars`) reaproveitada em `/offers` e no detalhe da ordem #julia
- [ ] Modal de regras de uso, caução/custódia e penalidades + reconfirmação de senha antes de criar a ordem (`orders/new/order-rules-dialog.tsx`) — só depois chama `createOrder` #jose
- [ ] Countdown de 30 minutos entre aceite e pagamento (`PaymentCountdown`, `Order.paymentDeadline`, ação `EXPIRE` no reducer) — simulado no cliente, idempotente com o resto do fluxo; ver [[14 - Ofertas e Ordens]] #julia
- [ ] Tela de carteira (`/wallet`) — sete saldos separados (`src/lib/mock/collateral.tsx`), nunca um saldo único; limite bruto/disponível derivado via `computeCashierLimit`, nunca calculado na tela; ver [[17 - Carteira e Caução]] #jose
- [ ] Fluxo de depósito — endereço TRC20 fake + estado de espera "aguardando confirmação on-chain" (8s simulados) antes do saldo sair de `underReview` pra `available` #jose
- [ ] Tela de disponibilidade do caixeiro (`/wallet/availability`) — online/offline (`Switch` novo em `components/ui`), dias, horário, métodos aceitos #julia
- [ ] Fluxo de saque de caução — `PendingWithdrawal` (`src/lib/mock/collateral.tsx`), botão "Solicitar saque" em `/wallet`, estado de espera "em processamento" (8s simulados) antes do saldo sair de `pendingWithdrawal` pra `withdrawn`, evento registrado no log de auditoria; achado no checklist de validação da Sprint -1, ver [[17 - Carteira e Caução]] #jose
- [ ] Painel administrativo — home (`/admin`) com contadores reais (usuários, ordens por categoria) e atalhos pras outras telas #julia
- [ ] Listagem e busca de usuários (`/admin/users`, `src/lib/mock/admin-users.tsx`) com ação de aprovar cadastro — aprovação já registra evento no log de auditoria #jose
- [ ] Visão consolidada de ordens (`/admin/orders`) — todas as ordens da plataforma, sem a checagem de participante de `/orders/[id]` #julia
- [ ] Log de auditoria (`/admin/audit-logs`, `src/lib/mock/audit-log.tsx`) — somente leitura, categorias on-chain/admin, sem nenhuma ação de editar/apagar; ver [[18 - Administração e Mediação]]. **Achado de segurança registrado**: as telas deste bucket ainda não têm controle de acesso por papel — qualquer conta navega até elas; aceitável só enquanto o protótipo inteiro roda sem autenticação real #jose
- [ ] Gestão de blacklist (`/admin/blacklist`, `src/lib/mock/blacklist.tsx`) — motivo e evidências obrigatórios, inclusão registra evento no log de auditoria #julia
- [ ] Listagem de disputas restrita aos casos atribuídos (`/admin/disputes`, `src/lib/mock/disputes.tsx`) — filtra por `assignedMediatorId === user.id`, testado trocando de conta #jose
- [ ] Detalhe/decisão de disputa (`/admin/disputes/[id]`) — evidências (comprovante/TXID reaproveitados da ordem), chat restrito (notas só entre mediadores, separado do `OrderChat`), decisão com "recomendado por"/"aprovado por" validados como distintos; mesma checagem de atribuição da listagem aplicada de novo no acesso direto pela URL #julia
- [ ] Máscara de dados sensíveis por padrão (`MaskedValue`) — aplicada ao documento em `/admin/users`, revelar sempre registra evento no log de auditoria #jose
- [ ] Indicação de MFA obrigatório (`MfaNotice`) — ao lado de cada ação crítica: aprovar cadastro, incluir na blacklist, resolver disputa #julia
- [ ] Checklist de validação da Sprint -1 — dois gaps encontrados e corrigidos: estado `FROZEN_FOR_AUDIT` (congelar/liberar ordem em `/admin/orders`, semântica documentada em [[02 - Arquitetura Técnica]]) e trava anti-triangulação reforçada no momento da transação (seleção obrigatória de chave PIX em `/orders/new`, `Order.clientPixKeySnapshot`); registro completo em [[19 - Checklist de Validação Sprint -1]] #jose
- [ ] Especificação completa do Dashboard de Relatórios e Ganhos — 3 perfis (cliente, caixeiro, admin), decisões de arquitetura: tabela derivada `dashboard_metrics_daily` (não agregar direto no `financial_ledger`, que é INSERT-only), job assíncrono BullMQ, cache Redis (TTL curto) e rate limiting nos endpoints; endpoints propostos `GET /dashboard/client/:userId`, `/dashboard/cashier/:userId`, `/dashboard/admin/platform`, `/dashboard/export`; registrado em [[20 - Relatórios e Ganhos]] #jose
- [ ] Tela de relatórios do Cliente e do Caixeiro (`/reports`, rota única com abas por papel) — histórico de ordens, volume negociado, ticket médio; ganhos brutos/líquidos, ROI sobre caução, taxa de utilização da caução, taxa de conclusão #jose #julia
- [ ] Painel de relatórios do Admin (`/admin/reports`) — GMV, receita da plataforma, lucro líquido, liquidez em custódia, funil de conversão #julia
- [ ] Filtro de período padrão (`PeriodFilter`: hoje, 7d, 30d, 90d, YTD, custom) reaproveitado nas 3 telas #jose
- [ ] Isolamento de dados nas 3 telas de relatório — cliente/caixeiro só veem as próprias ordens (`clientId`/`cashierId === user.id`, mesma checagem de `order-detail.tsx`), admin vê a plataforma inteira sem RBAC ainda (mesma ressalva já registrada em [[18 - Administração e Mediação]]) #jose
- [ ] Painel de reputação da contraparte (`counterpartyStats`) e selo de risco (`riskAssessment`) no detalhe da ordem, reaproveitando os tokens `--status-*` já corrigidos pro tema escuro #julia
- [ ] Validação de identidade do PIX no detalhe da ordem — compara `holderName` da chave com o nome cadastrado da contraparte, alerta de divergência ou confirmação discreta quando bate; `PixKey`/snapshots ganharam `holderName` #jose
- [ ] Botões de copiar (titular, chave PIX, valor, documento, TXID) com feedback textual, card "Você paga"/"Você recebe" por papel/sentido da ordem, modal de checklist antes de "Já paguei — confirmar transferência" e aviso ao cancelar com pagamento já informado #julia
- [ ] Cliente HTTP em `src/lib/api` — base URL via `NEXT_PUBLIC_API_URL` (ambiente de teste na VM, nunca `localhost`), dinheiro tratado como string decimal ponta a ponta (`Decimal` em `types.ts`, cliente nunca converte number↔string), tratamento padronizado de erro (`ApiError.isNotFound`/`isConflict`, 404 = "não é sua" nunca 403; `ApiNetworkError` separado pra falha de CORS antes de qualquer resposta) #jose
- [ ] Header `Idempotency-Key` automático — `generateIdempotencyKey`/`createIdempotencyKeyManager` em `src/lib/api/idempotency.ts` (UUID v4 validado contra `[A-Za-z0-9._~-]{16,128}`, reuso em retry via `getKey()`, `reset()` só ao concluir a ação); só as rotas ⚡ mandam o header, `apiFetch` expõe `replayed` a partir do header `Idempotent-Replayed` #julia
- [ ] Remapeamento da máquina de estados — `mapBackendOrderStatus` (`src/lib/order-status-map.ts`) traduz os 11 estados reais do backend pro `OrderStatus` do front, dependente de quem olha (`AWAITING_*` não é estado próprio no backend, é a mesma etapa vista por um papel que ainda precisa agir/está esperando); `ORDER_HAPPY_PATH_STEPS` (`src/types/order.ts`) agrupa os pares num só step visual e derruba `RESERVED` do stepper (nunca existiu no backend nem no reducer mock); `OrderTimeline` reescrito pra iterar os grupos em vez do array plano — confirmado visualmente contra os pedidos seed (`/orders/order-1` a `order-3`): 6 steps em vez de 11, ativo/concluído corretos. Função ainda sem chamador real (`Ordens & Ofertas` é quem vai consumi-la, ao trocar o mock pelo `GET /orders/:id` de verdade) #julia
- [ ] Autenticação real — `src/lib/auth/` (login/register/refresh/logout/mfa verify+recovery contra o backend real, JWT decodificado só pra claims de UI, sessão persistida em `localStorage`, interceptor de 401 que tenta refresh e só então chama `notifySessionExpired()`); checkbox "entrando como caixeiro/admin" removido de `/login` (papel vem do JWT); `/mfa` ganhou alternância pro fluxo de código de recuperação; `/register` ganhou campo de documento (CPF/CNPJ, obrigatório pro `POST /auth/register` real — confirmado direto no Swagger, que também revelou senha mínima de 12 caracteres, não 8); botão de logout real na Sidebar/MobileHeader. `MockSessionProvider`/`AccountSwitcher` continuam intactos (fora de escopo deste card, seguem sendo a identidade "vista como" pro resto do app ainda mockado) #jose




%% kanban:settings
```
{"kanban-plugin":"board"}
```
%%