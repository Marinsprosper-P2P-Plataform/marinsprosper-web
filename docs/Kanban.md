---
kanban-plugin: board
---

## Backlog — decisões e bloqueios (fora do controle direto do front)

- [ ] Auditoria externa do smart contract Tron concluída — bloqueia liberar telas de depósito de caução em mainnet #bloqueio
- [ ] Definição de jurisdição/enquadramento regulatório — bloqueia Fase 3 (dinheiro real) #bloqueio
- [ ] Provedor de KYC contratado (idwall, Unico, Serpro, CAF) — define qual SDK/widget o front vai integrar #decisão
- [ ] Provedor de Auth definido (Auth0, Cognito, Supabase Auth ou JWT próprio) — define camada de autenticação do front #decisão
- [ ] Validação de comprovante via OCR/IA — ainda não especificada; se entrar, é só triagem (não decide sozinha), então a UI precisa deixar claro que segue em análise humana #ideia


## Design System (Fase 1) — antes de qualquer tela final

- [ ] Tokens de tema mobile-first no Tailwind (breakpoints, espaçamento, tipografia, cores) — base para tudo que vem depois
- [ ] Paleta e variantes de cor por estado de ordem (aberta, em andamento, concluída, cancelada, em disputa, expirada) — usada em badges/timeline em toda a plataforma
- [ ] Componentes base via shadcn/ui: Button, Input, Select, Textarea, Dialog, Tabs, Table, Badge, Avatar, Toast
- [ ] Componente de Badge de status da ordem (mapeando os 11+ estados da máquina de estados para rótulo + cor)
- [ ] Componente de Timeline/Stepper de progresso da ordem (visualiza em qual das etapas — reserva, transferência do cliente, confirmação do caixeiro, liberação — a ordem está)
- [ ] Layout responsivo mobile-first: navegação inferior (bottom nav) em mobile, sidebar em desktop
- [ ] Dark mode (se decidido pelo design) — usando os mesmos tokens
- [ ] Validar o design system com a equipe antes de aplicar nas telas finais


## Autenticação & Onboarding (Sprint -1, dados fake)

- [ ] Tela de login (`(auth)/login`) — e-mail/senha, com placeholder para MFA de caixeiro/admin
- [ ] Tela de segunda etapa de MFA (`/auth/mfa/verify`) — código, exibida só para caixeiro/admin após senha correta
- [ ] Tela de registro (`(auth)/register`) — formulário de cadastro, com seleção de papel (cliente ou solicitação de caixeiro)
- [ ] Fluxo de envio de documento para KYC (`/kyc/documents`) — upload de documento + selfie, com indicação visual do nível de verificação (0 a 3)
- [ ] Tela de status de KYC (`/kyc/status`) — pendente, aprovado, rejeitado, com motivo quando rejeitado
- [ ] Fluxo de solicitação para virar caixeiro (`/cashier/apply`) — formulário com métodos aceitos, países, moedas
- [ ] Estado de sessão expirada / renovação de sessão (`/auth/refresh`) tratado de forma transparente pela UI
- [ ] Tela de usuário bloqueado — mensagem clara ao tentar operar, sem detalhar motivo interno de risco


## Ofertas & Ordens (Sprint -1, dados fake)

- [ ] Listagem de ofertas/ordens disponíveis (`(dashboard)/offers`) — visão do caixeiro, filtrando por limite de caução disponível
- [ ] Formulário de criação de ordem (compra/venda) pelo cliente — tipo, valor, cotação exibida, taxa de 3% mostrada antes da confirmação (nunca calculada no front, só exibida a partir da resposta do backend)
- [ ] Listagem "Minhas ordens" (`(dashboard)/orders`) — separada por papel (cliente vê as que criou, caixeiro vê as que aceitou)
- [ ] Tela de detalhe da ordem (`(dashboard)/orders/[id]`) — usa o componente de Timeline com as 11 transições da máquina de estados
- [ ] Ação "Aceitar ordem" (caixeiro) — reflete que a caução foi reservada no smart contract; UI trata idempotência (clique duplo não duplica aceite)
- [ ] Ação "Marquei que transferi" (cliente) — com upload de comprovante anexado à ordem
- [ ] Ação "Confirmar recebimento do PIX" (caixeiro)
- [ ] Ação "Enviei o ativo" (caixeiro) — campo de TXID, com aviso de que a liberação só confirma após validação on-chain, não pelo texto do TXID
- [ ] Ação "Confirmar recebimento" (cliente) — conclui a ordem, dispara liberação no contrato
- [ ] Fluxo de solicitação de cancelamento — pedido, aceite/recusa pela contraparte, com regra visível de que quem solicita não avalia depois
- [ ] Fluxo de abertura de disputa a partir da ordem — formulário de motivo + evidências
- [ ] Tela de avaliação (1 a 5) pós-conclusão — some do fluxo sem passar a avaliar antes do estado permitido


## Chat & Comprovantes (Sprint -1, dados fake)

- [ ] Componente de chat da ordem — histórico de mensagens não editáveis (edição gera nova versão, não sobrescreve)
- [ ] Envio de mensagem de texto no chat
- [ ] Envio de anexo (imagem/PDF) no chat, com preview
- [ ] Indicação visual de que anexos são privados (URL assinada temporária) — nunca linkar storage público
- [ ] Estado de "digitando..." / indicador de atividade (preparar UI para quando o WebSocket real entrar no Sprint 4)


## Carteira & Caução — visão do Caixeiro (Sprint -1, dados fake)

- [ ] Tela de carteira (`(dashboard)/wallet`) — saldos separados: disponível, reservado, bloqueado, em análise, pendente de retirada, retirado (nunca um saldo único)
- [ ] Exibição do limite bruto e disponível do caixeiro (derivado da caução confirmada × fator de exposição)
- [ ] Fluxo de exibição do endereço/instrução de depósito de USDT no smart contract (dado vindo de `/cashier/collateral/deposit-address`)
- [ ] Tela de disponibilidade do caixeiro (`/cashier/availability`) — online/offline, horários, métodos aceitos
- [ ] Estado de espera "aguardando confirmação on-chain do depósito" antes do saldo refletir no limite


## Administração & Mediação (Sprint -1, dados fake)

- [ ] Painel administrativo — home (`(dashboard)/admin`)
- [ ] Listagem e busca de usuários (`(dashboard)/admin/users`) com ação de aprovar cadastro
- [ ] Visão consolidada de ordens para o admin (`(dashboard)/admin/orders`)
- [ ] Consulta de logs de auditoria (`(dashboard)/admin/audit-logs`) — incluindo eventos on-chain (depósito, liberação, reembolso), somente leitura, sem opção de editar/apagar na UI
- [ ] Gestão de blacklist (`(dashboard)/admin/blacklist`) — inclusão com campo obrigatório de evidências e motivo
- [ ] Listagem de disputas para o mediador (`(dashboard)/admin/disputes`) — restrita aos casos atribuídos
- [ ] Tela de detalhe/decisão de disputa (`(dashboard)/admin/disputes/[id]`) — evidências, chat restrito, decisão com campos separados de "recomendado por" e "aprovado por"
- [ ] Máscara de dados sensíveis por padrão nas telas administrativas (documento, dados bancários, endereço de carteira) — visível só sob ação explícita e logada
- [ ] Indicação de MFA obrigatório e reforço de autenticação para ações administrativas críticas


## Integração com API real (Sprint 4)

- [ ] Cliente HTTP em `src/lib/api` — base URL via `NEXT_PUBLIC_API_URL`, tratamento padronizado de erro
- [ ] Header `Idempotency-Key` automático em toda chamada de escrita a endpoint financeiro (aceite de ordem, confirmações, criação de ordem)
- [ ] Autenticação real (JWT) — armazenamento de sessão, renovação via `/auth/refresh`, logout via `/auth/logout`
- [ ] Substituir todos os dados fake das telas acima por chamadas reais à API do backend (`marinsprosper-api`)
- [ ] Upload de mídia (comprovantes, documentos KYC) via Presigned URLs — upload direto do navegador para o storage
- [ ] WebSocket real para chat e atualização de status da ordem em tempo real (substitui o polling/fake do protótipo)
- [ ] Exibir saldo de caução sempre a partir da leitura real do backend (`/cashier/collateral`, espelho do smart contract) — nunca cachear como fonte de verdade
- [ ] Tratamento de estados de loading, erro e retry alinhado com a idempotência dos endpoints financeiros (retry seguro, sem duplicar ação)


## Testes, Performance & Deploy (Sprint 5)

- [ ] Testes E2E dos fluxos críticos: criação → aceite → transferência → confirmação → conclusão
- [ ] Teste E2E de cancelamento e de abertura/decisão de disputa
- [ ] Revisão de responsividade mobile-first em todas as telas (breakpoints reais, não só desktop redimensionado)
- [ ] Revisão de acessibilidade (contraste, foco de teclado, labels em formulários financeiros)
- [ ] Otimização de performance (Core Web Vitals) nas telas de maior tráfego (ofertas, detalhe de ordem)
- [ ] Deploy em produção (Vercel ou Cloudflare Pages) com CI/CD via GitHub Actions


## Concluído

- [ ] Repositório conectado ao GitHub
- [ ] Scaffold Next.js (App Router, TypeScript, Tailwind, shadcn/ui)
- [ ] Documentação inicial (PRD, arquitetura, modelo de dados, segurança, API, testes, incidentes)
- [ ] Estrutura de pastas do frontend (rotas e diretórios de suporte)
- [ ] Vault Obsidian com documentação e Kanban


%% kanban:settings
```
{"kanban-plugin":"board"}
```
%%
