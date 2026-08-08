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

- [ ] Fluxo de saque de caução — `CollateralAccount.pendingWithdrawal` existe no modelo (`src/lib/mock/collateral.tsx`) mas nenhuma tela o alimenta ainda; só depósito foi implementado. Achado no checklist de validação da Sprint -1, ver [[19 - Checklist de Validação Sprint -1]] #jose


## Administração & Mediação (Sprint -1, dados fake)


## Integração com API real (Sprint 4)

- [ ] Cliente HTTP em `src/lib/api` — base URL via `NEXT_PUBLIC_API_URL`, tratamento padronizado de erro #jose
- [ ] Header `Idempotency-Key` automático em toda chamada de escrita a endpoint financeiro (aceite de ordem, confirmações, criação de ordem) #julia
- [ ] Autenticação real (JWT) — armazenamento de sessão, renovação via `/auth/refresh`, logout via `/auth/logout` #jose
- [ ] Substituir todos os dados fake das telas acima por chamadas reais à API do backend (`marinsprosper-api`) #julia
- [ ] Upload de mídia (comprovantes, documentos KYC) via Presigned URLs — upload direto do navegador para o storage #jose
- [ ] WebSocket real para chat e atualização de status da ordem em tempo real (substitui o polling/fake do protótipo) #julia
- [ ] Exibir saldo de caução sempre a partir da leitura real do backend (`/cashier/collateral`, espelho do smart contract) — nunca cachear como fonte de verdade #jose
- [ ] Tratamento de estados de loading, erro e retry alinhado com a idempotência dos endpoints financeiros (retry seguro, sem duplicar ação) #julia


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




%% kanban:settings
```
{"kanban-plugin":"board"}
```
%%