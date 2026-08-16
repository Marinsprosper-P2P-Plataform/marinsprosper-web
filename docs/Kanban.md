---

kanban-plugin: board

---

## Backlog — decisões e bloqueios (fora do controle direto do front)

Lista consolidada e categorizada (infraestrutura vs. endpoint faltando vs. decisão de produto), reauditada em 2026-08-16 direto no código do backend: [[21 - Integração com API Real]] §4.

- [ ] Auditoria externa do smart contract Tron concluída — bloqueia liberar telas de depósito de caução em mainnet #bloqueio #jose
- [ ] Definição de jurisdição/enquadramento regulatório — bloqueia Fase 3 (dinheiro real) #bloqueio #julia
- [ ] Provedor de KYC contratado (idwall, Unico, Serpro, CAF) — define qual SDK/widget o front vai integrar #decisão #jose
- [ ] Provedor de Auth definido (Auth0, Cognito, Supabase Auth ou JWT próprio) — define camada de autenticação do front #decisão #julia
- [ ] Validação de comprovante via OCR/IA — ainda não especificada; se entrar, é só triagem (não decide sozinha), então a UI precisa deixar claro que segue em análise humana #ideia #jose
- [ ] Autorizar o GitHub App do Vercel na organização Marinsprosper-P2P-Plataform (precisa de admin/owner logado) — bloqueia o card de deploy em [[09 - Roadmap de Sprints|Sprint 5]]; passo a passo em [[12 - Deploy (Vercel)]] #bloqueio #jose
- [ ] Login/registro falhando em produção (`https://marinsprosper-web.vercel.app`) — "Não foi possível contatar o servidor" (2026-08-15). Dois bloqueios confirmados, nenhum resolvível pelo código do front: (1) `NEXT_PUBLIC_API_URL`/`NEXT_PUBLIC_WS_URL` provavelmente ausentes nas Environment Variables do painel da Vercel (`.env.local` nunca é enviado no deploy, é gitignored) — precisa ser configurado manualmente em Settings → Environment Variables + redeploy; (2) `CORS_ORIGINS` do backend ainda não inclui `https://marinsprosper-web.vercel.app` (confirmado por `curl` direto: sem header `Access-Control-Allow-Origin` pra essa origem, enquanto `http://localhost:3000` já responde certo) — pedir pro time de backend acrescentar. Ver [[12 - Deploy (Vercel)]] #bloqueio #jose
- [ ] **Ambiente de teste (`https://api.163-176-220-125.sslip.io`) desatualizado em relação ao `main` do `marinsprosper-api`** — descoberto 2026-08-15 ao testar o painel de disputas: `GET /disputes` devolve 404 "Cannot GET /disputes" (rota inexistente, não é 401 de auth). Conferido contra o Swagger ao vivo da própria VM (`/docs-json`): só existem `auth` (sem `/auth/mfa` de enrollment), `cashier/collateral`, `cashier/limit`, `health`, `orders` completo (incluindo `/orders/:id/messages`, chat). **Não existem no servidor ao vivo**: `ratings`, `disputes`, `admin/*`, `kyc/*`, `uploads` (bloqueia `/auth/mfa/setup`/`activate` de enrollment também, além do KYC em si) — todos implementados no front contra o código-fonte real do repo (não suposição), mas não testáveis nem utilizáveis até a VM ser redeployada com a versão atual do backend. Pedir ao time de backend pra redeployar a VM de teste. Ver [[14 - Ofertas e Ordens]] e [[13 - Autenticação e Onboarding]] #bloqueio #jose
- [ ] **`CORS_ORIGINS` parou de incluir `http://localhost:3000`** — descoberto 2026-08-16 ao testar o chat: o backend liberou `https://marinsprosper-web.vercel.app` (resolvendo o bloqueio de produção), mas `http://localhost:3000` não responde mais com `Access-Control-Allow-Origin` (confirmado por `curl` direto — parece substituição, não adição, da lista). Sem isso, dev local não consegue mais chamar a API real pra testar nada deste bucket em diante. Pedir pro backend acrescentar `http://localhost:3000` de volta, ao lado do domínio da Vercel, não no lugar dele #bloqueio #jose


## Integração com API real (Sprint 4)

Backend (`marinsprosper-api`, repositório separado: <https://github.com/Marinsprosper-P2P-Plataform/marinsprosper-api>) reauditado em 2026-08-16 (auditorias anteriores 08-10, 08-13) — auth/ordens/custódia/chat/idempotência, KYC completo, MFA com enrollment, avaliações, disputas/mediação e todo o painel de admin (usuários, ordens, audit-logs, blacklist, fila de KYC) já existem no código do backend. Só o ledger continua sem rota HTTP. Mapeamento completo endpoint↔tela, remapeamento da máquina de estados e lista consolidada do que ainda fica bloqueado (categorizada: infraestrutura / endpoint faltando / decisão de produto) em [[21 - Integração com API Real]].

**Front e backend são repositórios e máquinas separados, de propósito** — não existe backend em `localhost`. O backend roda numa VM própria desde o primeiro dia; o ambiente de teste atual (não é produção) fica em `https://api.163-176-220-125.sslip.io` (Swagger em `/docs`), com contas de teste prontas (`cliente@teste.local`, `cashier@teste.local`, `mediador@teste.local` etc., senha `teste-marinsprosper-2026` em todas — ver [[21 - Integração com API Real]] §0). `.env.example` já aponta pra lá.

### Fundação (bloqueia todo o resto)

Nenhum card pendente — bucket concluído (ver "Concluído" abaixo). O item de `CORS_ORIGINS` que esteve aqui foi **falso alarme**: o "não foi possível contatar o servidor" de 2026-08-14 era `.env.local` ausente na sessão de teste (arquivo não versionado, cada ambiente precisa copiar de `.env.example`), não CORS — corrigido e revalidado em 2026-08-14 (ver nota em "Concluído").

### Ordens & Ofertas

Nenhum card pendente — bucket concluído do lado do código (ver "Concluído" abaixo). O painel de mediação de disputas (`/disputes`, `/disputes/[id]`) foi implementado, mas fica **funcionalmente bloqueado** pelo item de infraestrutura abaixo até o redeploy do backend.

### Carteira & Caução

Nenhum card pendente — bucket concluído (ver "Concluído" abaixo), exceto saque de caução, que continua bloqueado por falta de endpoint (ver seção "Bloqueado" abaixo).

### KYC & MFA

Nenhum card pendente — bucket concluído do lado do código (ver "Concluído" abaixo). A segunda etapa do login com MFA já estava concluída de uma rodada anterior ("Autenticação real"). KYC e o enrollment de MFA ficam **funcionalmente bloqueados** pelo item de infraestrutura no Backlog até o redeploy do backend.

### Chat

Nenhum card pendente — bucket concluído (ver "Concluído" abaixo). Único bucket deste sprint cujo backend já está disponível no ambiente de teste — só não foi possível testar de ponta a ponta nesta rodada por causa do item de `CORS_ORIGINS`/`localhost` no Backlog.

### Admin

Nenhum card pendente — bucket concluído do lado do código (ver "Concluído" abaixo). `admin.controller.ts` só existe no `main` do backend desde a atualização de 2026-08-16 da VM local de referência (repositório clonado à parte, não a VM de teste); mesmo bloqueio de infraestrutura do resto do sprint (VM de teste desatualizada, ver Backlog) impede testar contra o ambiente ao vivo.

### Bloqueado — sem endpoint no backend ainda (não mover pra cá até existir)

Reconferido em 2026-08-16 direto no código-fonte do backend (`marinsprosper-api` atualizado — ver achado no card "Painel de admin real" abaixo): nenhum dos 4 itens abaixo ganhou rota nova.

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
- [ ] Cliente HTTP em `src/lib/api` — base URL via `NEXT_PUBLIC_API_URL` (ambiente de teste na VM, nunca `localhost`), dinheiro tratado como string decimal ponta a ponta (`Decimal` em `types.ts`, cliente nunca converte number↔string), tratamento padronizado de erro (`ApiError.isNotFound`/`isConflict`, 404 = "não é sua" nunca 403; `ApiNetworkError` separado pra falha de rede/config antes de qualquer resposta) #jose
- [ ] Header `Idempotency-Key` automático — `generateIdempotencyKey`/`createIdempotencyKeyManager` em `src/lib/api/idempotency.ts` (UUID v4 validado contra `[A-Za-z0-9._~-]{16,128}`, reuso em retry via `getKey()`, `reset()` só ao concluir a ação); só as rotas ⚡ mandam o header, `apiFetch` expõe `replayed` a partir do header `Idempotent-Replayed` #julia
- [ ] Remapeamento da máquina de estados — `mapBackendOrderStatus` (`src/lib/order-status-map.ts`) traduz os 11 estados reais do backend pro `OrderStatus` do front, dependente de quem olha (`AWAITING_*` não é estado próprio no backend, é a mesma etapa vista por um papel que ainda precisa agir/está esperando); `ORDER_HAPPY_PATH_STEPS` (`src/types/order.ts`) agrupa os pares num só step visual e derruba `RESERVED` do stepper (nunca existiu no backend nem no reducer mock); `OrderTimeline` reescrito pra iterar os grupos em vez do array plano — confirmado visualmente contra os pedidos seed (`/orders/order-1` a `order-3`): 6 steps em vez de 11, ativo/concluído corretos. Função ainda sem chamador real (`Ordens & Ofertas` é quem vai consumi-la, ao trocar o mock pelo `GET /orders/:id` de verdade) #julia
- [ ] Autenticação real — `src/lib/auth/` (login/register/refresh/logout/mfa verify+recovery contra o backend real, JWT decodificado só pra claims de UI, sessão persistida em `localStorage`, interceptor de 401 que tenta refresh e só então chama `notifySessionExpired()`); checkbox "entrando como caixeiro/admin" removido de `/login` (papel vem do JWT); `/mfa` ganhou alternância pro fluxo de código de recuperação; `/register` ganhou campo de documento (CPF/CNPJ, obrigatório pro `POST /auth/register` real — confirmado direto no Swagger, que também revelou senha mínima de 12 caracteres, não 8); botão de logout real na Sidebar/MobileHeader. `MockSessionProvider`/`AccountSwitcher` continuam intactos (fora de escopo deste card, seguem sendo a identidade "vista como" pro resto do app ainda mockado) #jose
- [ ] **Correção**: o item "pedir pro backend liberar `CORS_ORIGINS`" não era um bloqueio real — era `.env.local` ausente na sessão de teste (arquivo gitignored, cada ambiente precisa copiar de `.env.example`; sem ele `NEXT_PUBLIC_API_URL` fica vazia e todo request falha antes de sair, com o mesmo toast genérico de erro de rede que uma falha de CORS daria). Descoberto em 2026-08-14 ao configurar `.env.local` pra testar os cards abaixo: login, registro, criação e aceite de ordem funcionam de ponta a ponta contra `https://api.163-176-220-125.sslip.io` sem qualquer mudança no `CORS_ORIGINS` do backend. Card removido da Fundação — não há pendência de coordenação com o time de backend #jose
- [ ] Criação de ordem — `POST /orders` (`src/lib/orders/api.ts`) numa chamada só (`publish: true` sempre, não existe endpoint `/publish` separado); `Order.type` vira `side` (`CLIENT_BUYS_ASSET`/`CLIENT_SELLS_ASSET`); `clientTronAddress` obrigatório em compra, com validação de formato na UI (`TRON_ADDRESS_PATTERN`) — checksum de verdade só o backend confere (testado: endereço de exemplo do Swagger falha checksum, endereço real passa). **Testado contra a API real em 2026-08-14**: 201 confirmado, `fiatAmount` retornado bate com `assetAmount * rate` calculado pelo backend — mapeamento `asset: "USDT"` / `assetAmount = netAmount do quote` / `rate = quote.quote` confirmado certo. `orders/new` chama **só** o endpoint real — sem fallback em mock (`createOrder` removido de `src/lib/mock/orders.tsx`, ver princípio "backend nunca localhost, tudo via API"); redireciona pro id real (`/orders/:id` ainda mostra "não encontrada" até `GET /orders/:id` ser ligado — esperado, não é bug) #jose
- [ ] Aceite de ordem — `POST /orders/:id/accept` (`src/lib/orders/api.ts`), sem corpo, só `Idempotency-Key`. **Testado contra a API real em 2026-08-14**: 422 específico confirmado ("saldo de colateral desatualizado; sincronize com o contrato antes de aceitar") — exatamente o tipo de erro que o card pedia pra não tratar como genérico. Ligado nos **dois** pontos que aceitavam ordem (`offer-list.tsx`, usado em `/offers` e na aba "Disponível" de `/orders`, e `AcceptControl` em `order-actions.tsx`, o botão "Aceitar ordem" do detalhe) — sem fallback em mock (`acceptOrder` removido de `src/lib/mock/orders.tsx`); ids de `orders` no mock não existem no backend real, batem 404 lá até `GET /orders` também ficar real, o que já é mostrado como erro específico pro usuário #julia
- [ ] Wizard de ofertas (`Listing`) de 9 etapas (`/offers/new`, `/offers/[id]/edit`) — `/offers` deixou de listar ordens `OPEN` avulsas e passou a listar anúncios persistentes negociáveis (`Listing`/`PaymentMethod`, 100% mock/local — sem endpoint de ofertas no backend ainda); negociar uma oferta cria uma ORDEM real via o mesmo `POST /orders` de `orders/new`, pré-preenchida a partir da oferta; ações do dono (pausar/reativar/cancelar/encerrar); detalhes completos em [[14 - Ofertas e Ordens]] #jose
- [ ] Leitura real de ordens — `GET /orders` (`/orders`) e `GET /orders/:id` (`OrderDetail`) substituem o mock; `presentOrderForFrontend` (`src/lib/orders/adapt.ts`) traduz pro formato rico do protótipo reaproveitando `mapBackendOrderStatus`; sem nome de contraparte (API real não expõe perfil público — decisão confirmada com o usuário: id curto no lugar); IDOR passa a ser só a checagem do backend (404 uniforme) #jose
- [ ] PIX pós-aceite (`POST /orders/:id/pix`, registrado por quem recebe em BRL, conferido contra o KYC), ciclo de transferência/confirmação (`client-transfer`, `cashier-confirm-receipt`, `cashier-transfer`, `client-confirm`, sem upload/TXID manual — endpoints reais não recebem corpo), cancelamento direto (`cancel`) e mútuo (`cancel-request`/`cancel-response`), abertura de disputa (`POST /orders/:id/dispute`) e avaliação (`POST /orders/:id/rating`, cobrindo `COMPLETED` e `CANCELLED` como o backend realmente permite) — `OrderActions`/`OrderResolutionPanel` reescritos, mock equivalente removido de `src/lib/mock/orders.tsx` no mesmo commit; ver [[14 - Ofertas e Ordens]] #jose
- [ ] Identidade real (JWT, `useAuth`) nas checagens de papel da ordem — `OrderDetail`, `/orders` e `OfferList` trocaram `useMockSession().user.id` pelo id real na comparação `clientId`/`cashierId`, corrigindo o bloqueio achado na rodada anterior (conta real via os controles do papel errado). Limite disponível pra aceitar (`cashierAvailableLimit`) continua vindo do mock — sem `GET /cashier/limit` real ligado ainda, fora de escopo #jose
- [ ] Reputação real (`GET /users/:id/ratings`) em `OfferList` e `OrderDetail` — aposenta `getUserReputation`/`counterpartyStats`/`riskAssessment` locais nesses dois pontos (um fetch por cliente distinto na lista, não por linha). `counterparty-reputation-panel.tsx` (tempo de resposta/status online sintéticos via hash, sem equivalente real) ficou órfão depois da leitura real de ordens da rodada anterior — deletado. `getUserReputation` continua em `src/lib/mock/reputation.ts`, ainda usado por `/profile` (bucket "Perfil & Configurações", não migrado) #julia
- [ ] Painel de mediação de disputas real (`/disputes`, `/disputes/[id]`) — substitui `/admin/disputes` (papel `MEDIATOR`, não `ADMIN`; rota nova em `nav-items.ts`). Fila (`GET /disputes`), detalhe com evidências/mensagens/decisões (`GET /disputes/:id`), evidência via multipart (`POST /disputes/:id/evidence` — primeiro uso de `FormData` no cliente HTTP, suporte novo em `src/lib/api/client.ts`), mensagens com público restrito pro mediador escolher (`POST /disputes/:id/messages`) e decisão em dois mediadores — recomendação + aprovação de outra conta confirmando o mesmo desfecho (`POST /disputes/:id/decision`). Sem "assumir revisão": o backend já designa mediador na abertura, e a primeira recomendação assume se ainda não tinha dono. `src/lib/mock/disputes.tsx` deletado, `REVIEW_DISPUTE`/`RESOLVE_DISPUTE` removidos de `src/lib/mock/orders.tsx` #jose
- [ ] **Achado crítico ao testar**: o ambiente de teste (`https://api.163-176-220-125.sslip.io`) está desatualizado em relação ao `main` do `marinsprosper-api` — `ratings` e `disputes` (este card e o de avaliação acima) estão implementados certos contra o código-fonte, mas não existem no servidor ao vivo ainda (`GET /disputes` devolve 404 "Cannot GET", não 401). Ver item de bloqueio correspondente no Backlog #jose
- [ ] `/wallet` real — `GET /cashier/collateral`, `POST /cashier/collateral/deposit-address`, `POST /cashier/collateral/sync`, `GET /cashier/limit` (`src/lib/cashier/`) substituem `src/lib/mock/collateral.tsx` nesta tela (o mock continua existindo pra `/reports`/`/admin/reports`, não migrados). Modelo real bem mais simples que os 7 baldes do protótipo: só `free`/`locked`, mais `mirrorAgeSeconds` (aviso quando >5min, mesmo limite que o aceite de ordem usa) e `pendingMovements` (LOCK/RELEASE/REFUND ainda sem confirmação on-chain). Depósito inverte de direção — cashier registra a própria origem, backend devolve o destino (contrato, mesmo pra todo mundo); botão "Atualizar saldo" chama o `sync`. Sem saque: `WithdrawDialog` removido de `/wallet` — não existe endpoint de saque no backend, nenhuma rota `cashier/*` de saque; o fluxo mock de saque documentado antes fica só como especificação até existir endpoint real. **Testado contra a API real** (`cashier@teste.local`): saldo, endereço já registrado, aviso de espelho vencido, limites e movimento pendente reais carregando; "Atualizar saldo" confirmado (idade do espelho zerou, saldo recalculou pro valor real do contrato de teste). Ver [[17 - Carteira e Caução]] #jose
- [ ] KYC real (`/kyc`, `/kyc/status`) — `POST /kyc` (abre/retoma, idempotente), `POST /kyc/documents`, `POST /kyc/submit`; upload em duas fases via `POST /uploads` novo (`src/lib/uploads/`, compartilhado com evidência de disputa e chat) — URL assinada de escrita, bytes direto pro bucket, só o `uploadId` viaja pra API. `ID_FRONT`+`SELFIE` obrigatórios pra submeter. Não testável contra o ambiente de teste (nem `/kyc` nem `/uploads` existem no servidor ao vivo) — ver item de bloqueio no Backlog. Ver [[13 - Autenticação e Onboarding]] #julia
- [ ] Enrollment de MFA real (`MfaSettings`, em `/profile`) — `GET /auth/mfa` (status), `POST /auth/mfa/setup` (segredo, nasce inativo), `POST /auth/mfa/activate` (confirma com TOTP, devolve os códigos de recuperação uma única vez), `DELETE /auth/mfa` (exige TOTP ou código de recuperação). Sem QR renderizado (sem lib de QR no projeto) — mostra a chave em texto pra digitar manualmente, funcionalmente completo. Segunda etapa do login com MFA já estava pronta de antes (`/mfa`). Não testável contra o ambiente de teste (só `/auth/mfa/verify` existe no servidor ao vivo, sem as rotas de enrollment) — ver item de bloqueio no Backlog. Ver [[13 - Autenticação e Onboarding]] #jose
- [ ] Chat real (`OrderChat`) — `GET`/`POST /orders/:id/messages` substituem `src/lib/mock/chat.tsx` (deletado) + entrega em tempo real via Socket.IO (`socket.io-client` novo, namespace `/chat`, sala `order:<id>`). Sem edição (mensagem imutável no backend, diferente do protótipo) e sem indicador de "digitando" (sem evento correspondente no gateway real); sem nome de autor (mesma limitação de perfil público do resto da API), rotulado por papel + id curto. Mensagem própria deduplicada por `id` entre a resposta do `POST` e o eco do próprio socket; mensagem de sistema (mudança de estado da ordem) não viaja pelo evento `mensagem`, só `status` — `OrderChat` recarrega o histórico quando chega. Único bucket deste sprint já disponível no ambiente de teste (`/orders/{id}/messages` está no Swagger ao vivo), mas não foi possível testar de ponta a ponta nesta rodada — ver item de `CORS_ORIGINS`/`localhost` no Backlog. Ver [[15 - Chat e Comprovantes]] #jose
- [ ] Limpeza de código órfão da rodada: `proof-link.tsx`, `types/chat.ts` e o `ChatProvider` de `src/lib/mock/chat.tsx` (sem importador restante depois do chat real) deletados #julia
- [ ] Painel de admin real (`/admin/users`, `/admin/orders`, `/admin/audit-logs`, `/admin/blacklist`, `/admin/kyc` + `/admin/kyc/:id` novo) — `src/lib/admin/` (usuários, ordens, audit-logs, blacklist) e `src/lib/kyc/admin-api.ts` (fila de KYC, módulo separado no backend mas mesmo `AdminGuard`). `GET /admin/users?status=PENDING_KYC` + `POST /admin/users/:id/approve` com `reason` opcional (campo novo na tela — antes o mock aprovava sem motivo); `GET /admin/orders` sem recorte de participante, sem congelar/liberar (`FROZEN_FOR_AUDIT` não existe no backend, decisão de produto pendente — ação removida, não implementada contra nada); `GET /admin/audit-logs` com os filtros reais (`action`/`entityType`/`entityId`/`actorId`/`from`/`to`, sem as categorias on-chain/admin que o mock tinha — o backend não separa por categoria); `GET`/`POST /admin/blacklist` com os 5 tipos de alvo reais e motivo obrigatório (10-1000 caracteres), sem campo de "evidências" separado (só `reason`); fila de KYC nova (`/admin/kyc`, sem tela no protótipo antes desta rodada) — assumir caso (`POST /admin/kyc/:id/claim`, 409 se outro analista já assumiu) e decidir (`POST /admin/kyc/:id/review`, aprovar move a conta pra `ACTIVE`, recusar exige motivo). Documento de usuário não vem mascarado em `/admin/users` porque a API não devolve o número, só `documentType` — `MaskedValue` ficou sem uso real aqui, removido dessa tela. `MockAdminUsersProvider`/`MockAuditLogProvider`/`MockBlacklistProvider` e os 3 arquivos mock correspondentes deletados (sem importador restante). **Achado**: o `marinsprosper-api` clonado localmente estava 10 commits atrás do `main` remoto (sem os módulos `admin`, `blacklist`, `kyc`, `disputes`, `ratings` — nenhum existia no checkout local antes de um `git pull`); o levantamento de contrato desta rodada foi feito direto contra o código-fonte atualizado, não contra suposição. Mesmo bloqueio de VM de teste desatualizada do resto do sprint impede testar contra o ambiente ao vivo — ver Backlog. Ver [[18 - Administração e Mediação]] #jose
- [ ] Moderação de avaliação (`/admin/ratings`) — `POST /ratings/:id/moderation`, checagem de `ADMIN` dentro do service (não guard de classe, é a única rota restrita do `RatingsController`). Sem tela no protótipo antes. Sem `GET /admin/ratings`: o backend não tem listagem alguma de avaliações, só `GET /users/:id/ratings` (público, só as visíveis) — a tela busca por `userId` pra esconder uma visível, e tem um formulário separado "moderar por ID" pra reexibir uma já escondida (o id some da leitura pública depois de escondida; quem for reexibir precisa achá-lo em `/admin/audit-logs`, `entityType: "rating"`). Fecha o último card do bucket Admin #jose




%% kanban:settings
```
{"kanban-plugin":"board"}
```
%%