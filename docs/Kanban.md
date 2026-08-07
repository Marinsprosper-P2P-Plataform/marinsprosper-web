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

- [ ] Página de Perfil & Configurações (`(dashboard)/profile`) — exibe `@username`, país, cidade e reputação/avaliações da conta #jose
- [ ] Cadastro e listagem de chaves PIX (tipo de chave, chave, instituição, descrição) — validação de UI da trava de titularidade (CPF/CNPJ da chave igual ao do KYC fake); aplicação real da trava fica pro backend (Sprint 2, já especificada em [[04 - Documentação de Segurança]]) #julia


## Ofertas & Ordens (Sprint -1, dados fake)

- [ ] Filtro/abas "Comprar" e "Vender" em `/offers` — hoje a listagem mistura os dois tipos de ordem sem separação #jose
- [ ] Exibição de reputação/estrelas da contraparte (histórico de ordens concluídas) em `/offers` e no detalhe da ordem #julia
- [ ] Modal de regras de uso, caução/custódia e penalidades, exibido antes de confirmar a criação da ordem em `/orders/new` #jose
- [ ] Reconfirmação de senha de acesso ao autorizar a abertura da ordem em `/orders/new` #julia
- [ ] Countdown de 30 minutos no detalhe da ordem, entre aceite e pagamento — simulado no cliente (`setTimeout`, mesmo padrão de `pricing.ts`); cancelamento automático de verdade por timeout é Sprint 3 (filas BullMQ, já previsto em [[09 - Roadmap de Sprints]]) #jose


## Chat & Comprovantes (Sprint -1, dados fake)


## Carteira & Caução — visão do Caixeiro (Sprint -1, dados fake)

- [ ] Tela de carteira (`(dashboard)/wallet`) — saldos separados: disponível, reservado, bloqueado, em análise, pendente de retirada, retirado (nunca um saldo único) #jose
- [ ] Exibição do limite bruto e disponível do caixeiro (derivado da caução confirmada × fator de exposição) #julia
- [ ] Fluxo de exibição do endereço/instrução de depósito de USDT no smart contract (dado vindo de `/cashier/collateral/deposit-address`) #jose
- [ ] Tela de disponibilidade do caixeiro (`/cashier/availability`) — online/offline, horários, métodos aceitos #julia
- [ ] Estado de espera "aguardando confirmação on-chain do depósito" antes do saldo refletir no limite #jose


## Administração & Mediação (Sprint -1, dados fake)

- [ ] Painel administrativo — home (`(dashboard)/admin`) #julia
- [ ] Listagem e busca de usuários (`(dashboard)/admin/users`) com ação de aprovar cadastro #jose
- [ ] Visão consolidada de ordens para o admin (`(dashboard)/admin/orders`) #julia
- [ ] Consulta de logs de auditoria (`(dashboard)/admin/audit-logs`) — incluindo eventos on-chain (depósito, liberação, reembolso), somente leitura, sem opção de editar/apagar na UI #jose
- [ ] Gestão de blacklist (`(dashboard)/admin/blacklist`) — inclusão com campo obrigatório de evidências e motivo #julia
- [ ] Listagem de disputas para o mediador (`(dashboard)/admin/disputes`) — restrita aos casos atribuídos #jose
- [ ] Tela de detalhe/decisão de disputa (`(dashboard)/admin/disputes/[id]`) — evidências, chat restrito, decisão com campos separados de "recomendado por" e "aprovado por" #julia
- [ ] Máscara de dados sensíveis por padrão nas telas administrativas (documento, dados bancários, endereço de carteira) — visível só sob ação explícita e logada #jose
- [ ] Indicação de MFA obrigatório e reforço de autenticação para ações administrativas críticas #julia


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




%% kanban:settings
```
{"kanban-plugin":"board"}
```
%%