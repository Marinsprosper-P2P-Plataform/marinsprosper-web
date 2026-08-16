---
tags: [frontend, administração, auditoria]
---

← [[17 - Carteira e Caução]] | [[Início]]

# Administração & Mediação — implementação completa (Sprint -1)

Cobre os 9 cards do bucket "Administração & Mediação" do [[Kanban]], em duas rodadas: painel administrativo, usuários, ordens consolidadas e log de auditoria primeiro; blacklist, disputas (listagem + decisão), máscara de dados sensíveis e indicação de MFA depois.

## Rotas

| Rota | Arquivo | Corresponde a |
|---|---|---|
| `/admin` | `(dashboard)/admin/page.tsx` | Resumo + atalhos |
| `/admin/users` | `(dashboard)/admin/users/page.tsx` | `GET /admin/users` (implícito — não estava na Parte 5, adicionado por analogia) |
| `/admin/orders` | `(dashboard)/admin/orders/page.tsx` | Visão consolidada de ordens |
| `/admin/audit-logs` | `(dashboard)/admin/audit-logs/page.tsx` | Log de auditoria, somente leitura |
| `/admin/blacklist` | `(dashboard)/admin/blacklist/page.tsx` | Gestão de blacklist |
| `/admin/disputes` | `(dashboard)/admin/disputes/page.tsx` | Listagem de disputas restrita ao mediador |
| `/admin/disputes/[id]` | `(dashboard)/admin/disputes/[id]/dispute-detail-client.tsx` | Detalhe/decisão de disputa |

## Diretório de usuários (`src/lib/mock/admin-users.tsx`)

Mais amplo que as duas contas "logáveis" de `session.tsx` — um admin de verdade lista todo mundo, não só quem dá pra virar via `AccountSwitcher`. Seis pessoas fake, cobrindo os 4 status possíveis (`pendente`, `aprovado`, `suspenso`, `bloqueado`) e níveis de KYC variados. `user-client-2` (Carla Souza) reaproveita o id que já existia como cliente de `order-2` em `orders.tsx` — não criei uma segunda pessoa fake com o mesmo papel.

Ação `APPROVE` (botão "Aprovar", só visível pra status `pendente`) também registra um evento no log de auditoria — é a única ação administrativa deste lote que já está com efeito colateral de verdade, não só um botão que muda uma tabela.

## Log de auditoria (`src/lib/mock/audit-log.tsx`)

Somente leitura por design: `logEvent` é a única forma de escrever, chamada de fora (não existe UI de editar/apagar em lugar nenhum). Categorias `on-chain` e `admin`, com abas de filtro em `/admin/audit-logs`.

Dois eventos já nascem com wiring real:
- **Aprovação de cadastro** (`/admin/users`, ação `APPROVE`).
- **Confirmação de depósito de caução** (`/wallet`, quando `confirmDeposit` dispara depois dos 8s simulados de "aguardando confirmação on-chain" — ver [[17 - Carteira e Caução]]).

Depois desta rodada, mais dois eventos ganharam wiring real: **inclusão na blacklist** (`/admin/blacklist`) e **decisão de disputa** (`/admin/disputes/[id]`). Só "liberação de custódia" e "reembolso" continuam como dado estático no seed — não existe ainda uma tela que dispare esses dois eventos de verdade (dependem da camada de custódia real, Sprint 2+).

## Visão consolidada de ordens (`/admin/orders`)

Mostra **todas** as ordens, ignorando a checagem de participante que `OrderDetail` aplica em `/orders/[id]`. De propósito não linka pro detalhe de cada ordem — `OrderDetail` bloquearia o acesso (IDOR, já auditado em [[14 - Ofertas e Ordens]]), e este protótipo ainda não tem uma identidade de admin separada que justifique abrir uma exceção nessa checagem. Fica como tabela de leitura, sem drill-down, até existir esse conceito.

### Congelar/liberar ordem (`FROZEN_FOR_AUDIT`)

Adicionado durante a validação da Sprint -1, que pediu esse estado de exceção sem ele existir em nenhuma documentação anterior — semântica adotada e justificada em [[02 - Arquitetura Técnica]], seção 4. Botão "Congelar" aparece por linha pra qualquer ordem em `CANCELLABLE_STATUSES` (mesmo conjunto usado por cancelamento/disputa); abre um `Dialog` pedindo motivo obrigatório (com `MfaNotice` ao lado, mesma convenção do resto do bucket), despacha `freezeOrder` e registra no log de auditoria. "Liberar" volta a ordem pro status exato de antes (`previousMainlineStatus`), sem precisar de motivo (é reversão, não uma nova decisão).

Do lado de quem participa da ordem: `OrderActions` mostra um card "Ordem congelada" com o motivo, sem nenhum botão — cliente e caixeiro ficam bloqueados até a liberação. `OrderTimeline` já lida com isso de graça (qualquer status fora de `ORDER_HAPPY_PATH` vira banner automaticamente, sem precisar de código novo lá).

## Achado de segurança registrado, não corrigido nesta passada

Nenhuma das telas administrativas tem controle de acesso por papel — qualquer conta que navegue até `/admin/*` vê PII de terceiros e pode executar ações críticas (aprovar cadastro, incluir na blacklist, resolver disputa). Isso **não é novo**: o item "Admin" já existia na navegação principal desde o Design System, acessível a qualquer conta, e a ausência de RBAC no protótipo é uma simplificação conhecida e documentada em vários lugares (`session.tsx`, [[15 - Chat e Comprovantes]]). Fica registrado explicitamente aqui e na auditoria ([[11 - Auditorias e Validações]]) porque **isso não pode chegar a produção assim**: controle de acesso por papel (`user_roles`: admin/mediador) é trabalho de backend (Sprint 1-2), não uma tela nova — só é aceitável continuar sem ele enquanto o protótipo inteiro roda sem autenticação real. A restrição "casos atribuídos" das disputas (ver abaixo) é aplicada mesmo assim — não porque resolve o problema de fundo, mas porque não custa nada aplicar o filtro correto agora que existe um campo (`assignedMediatorId`) pra isso.

## Blacklist (`src/lib/mock/blacklist.tsx`)

Motivo e evidências são campos obrigatórios — o botão "Incluir na blacklist" fica desabilitado até os três campos (alvo, motivo, evidências) estarem preenchidos. Toda inclusão dispara `logEvent` (categoria `admin`) e mostra `MfaNotice` ao lado do botão.

## Disputas — listagem restrita e decisão (`src/lib/mock/disputes.tsx`)

A disputa em si já existe como estado da ordem (`DISPUTE_OPEN`/`DISPUTE_UNDER_REVIEW`/`DISPUTE_RESOLVED`, já modelados em `orders.tsx` desde [[14 - Ofertas e Ordens]]). Este módulo novo guarda só o que é específico da mediação:

- **`assignedMediatorId`** — a quem o caso está atribuído. `/admin/disputes` filtra por `assignedMediatorId === user.id`; `/admin/disputes/[id]` aplica a mesma checagem de novo (mesmo princípio de IDOR do `OrderDetail`, ver [[14 - Ofertas e Ordens]]) — acessar o ID direto pela URL sem estar atribuído mostra "Este caso não está atribuído a você", testado manualmente. Seed: `order-5` atribuída ao Beto (`user-cashier-1`) — só pra demonstrar o filtro com as duas únicas contas alternáveis do protótipo; num backend real o mediador nunca seria parte na própria ordem.
- **Chat restrito** — `notes` por `orderId`, thread separada do `OrderChat` que cliente/caixeiro veem. Sem indicador de digitando, sem edição — só um log de notas internas, mais simples que o chat da ordem de propósito (não precisa da mesma fidelidade).
- **Decisão com campos separados** — `recommendedBy`/`recommendation` e `approvedBy`/`outcome`, dois `Input` de nome distintos. Validação de UI: `approvedBy` não pode ser igual a `recommendedBy` (comparação case-insensitive) — o botão "Registrar decisão" fica desabilitado e um `Alert` explica o motivo. Não impede duas pessoas de digitarem nomes diferentes na mesma sessão fingindo ser duas pessoas (proteção real de dupla checagem é backend, autenticação por sessão separada), mas deixa o campo estruturalmente separado, que é o que o Kanban pediu.
- **`REVIEW_DISPUTE`/`RESOLVE_DISPUTE`** — duas ações novas no reducer de `orders.tsx`. "Assumir revisão" move `DISPUTE_OPEN → DISPUTE_UNDER_REVIEW`; registrar a decisão move pra `DISPUTE_RESOLVED` e dispara `logEvent`.

## Máscara de dados sensíveis (`src/components/shared/masked-value.tsx`)

`AdminUser` ganhou `document` (CPF/CNPJ fake). `/admin/users` mostra esse campo através de `MaskedValue` — mascarado por padrão (só os últimos 4 caracteres visíveis), com um ícone de olho pra revelar. `onReveal` é uma prop obrigatória: não dá pra usar o componente sem passar um callback, e o único uso hoje (`/admin/users`) chama `logEvent` nele — "Documento sensível revelado", com o admin e o alvo. Revelar sem logar não é uma opção que o componente permite.

Aplicado só ao campo `document` de `/admin/users` nesta rodada — é o exemplo mais direto do texto do Kanban ("documento"). O mesmo componente já está pronto pra reaproveitar quando dados bancários/endereço de carteira aparecerem em outras telas administrativas.

## Indicação de MFA (`src/components/shared/mfa-notice.tsx`)

Só a indicação visual — sem fluxo de MFA de verdade (isso é Sprint 4, autenticação real). `<MfaNotice />` aparece ao lado de cada botão de ação crítica: aprovar cadastro (`/admin/users`), incluir na blacklist (`/admin/blacklist`), registrar decisão de disputa (`/admin/disputes/[id]`).

## Testado manualmente, em build de produção

1. `/admin` — contadores batendo com os dados reais
2. `/admin/users` — busca, aprovação com evento no log, documento mascarado por padrão e revelado com um clique (evento "Documento sensível revelado" confirmado em `/admin/audit-logs` com timestamp real)
3. `/admin/orders` — lista todas as ordens do seed, sem filtrar por participante
4. `/admin/audit-logs` — abas Todos/On-chain/Administrativo, sem nenhum controle de editar/apagar
5. `/admin/blacklist` — inclusão bloqueada até preencher os três campos; entrada nova aparece no topo da lista e no log de auditoria
6. `/admin/disputes` como Ana Ferreira — lista vazia ("Nenhuma disputa atribuída a você"); trocando pra Beto Lima, `order-5` aparece
7. `/admin/disputes/order-5` — "Assumir revisão" muda o status pra "Disputa em análise"; nota interna enviada aparece no chat restrito; decisão bloqueada com nomes iguais em "recomendado por"/"aprovado por", liberada com nomes diferentes; ao registrar, status vira "Disputa resolvida", decisão fica visível permanentemente na tela, e o evento aparece em `/admin/audit-logs`
8. `/admin/disputes/order-5` acessado direto pela URL como Ana (não atribuída) — bloqueado com "Este caso não está atribuído a você"

## `/admin` — API real (Sprint 4)

`/admin/disputes` já tinha saído (papel errado — mediação é `MEDIATOR`, não `ADMIN`, ver [[14 - Ofertas e Ordens]]). Esta rodada troca os 4 cards restantes (usuários, ordens, audit-logs, blacklist) pela API real e acrescenta a fila de KYC, que nunca teve tela no protótipo.

Código: `src/lib/admin/` (usuários, ordens, audit-logs, blacklist) e `src/lib/kyc/admin-api.ts` + `admin-types.ts` (fila de KYC — módulo próprio no backend, `src/modules/kyc/kyc.controller.ts` → `AdminKycController`, mas atrás do mesmo `AdminGuard` do resto do painel). Contrato conferido direto no código-fonte do `marinsprosper-api` (`src/modules/admin/`, `src/modules/blacklist/`, `docs/ADMINISTRACAO.md`), não por suposição — ver "Achado" abaixo.

### `/admin/users` — fila de aprovação real

`GET /admin/users?status=PENDING_KYC` + `POST /admin/users/:id/approve`. Motivo passou de obrigatório-de-fato (só existia no protótipo) pra opcional-mas-registrado: o backend grava `reason ?? "aprovação manual da administração"` no histórico de status, que é append-only. Documento **não vem** nesta listagem — `admin.service.ts` só devolve `documentType` (CPF/CNPJ), nunca o número — então `MaskedValue` ficou sem campo real pra mascarar aqui e saiu da tela; o componente continua disponível pra quando dados sensíveis de verdade aparecerem em outra tela administrativa.

### `/admin/orders` — sem congelar/liberar

`GET /admin/orders`, sem recorte de participante (mesmo princípio do protótipo). `FROZEN_FOR_AUDIT` — a ação "Congelar"/"Liberar" documentada acima — **não existe no backend nem está planejado**; decisão de produto ainda pendente (ver Kanban, seção Bloqueado). A ação não foi portada pra API real porque não há endpoint nenhum que a implemente; a tela virou leitura pura.

### `/admin/audit-logs` — filtros reais, sem categoria

`GET /admin/audit-logs` com os filtros que o backend de fato aceita: `action`, `entityType`, `entityId`, `actorId`, `from`/`to`. As abas "Todos/On-chain/Administrativo" do protótipo saíram — o backend não separa por categoria, só por `action`/`entityType` livres (é quem escreve o evento que decide o texto de `action`, ex. `"order.accepted"`, `"user.approved"`). Sem eventos carregados por padrão: a tela pede pra ajustar os filtros e consultar, porque `take` tem teto de 100 e trazer tudo sem filtro na abertura seria a mesma "despejo de banco" que o backend documenta evitar em `admin.service.ts`.

### `/admin/blacklist` — 5 tipos de alvo, sem "evidências"

`GET`/`POST /admin/blacklist`. Os 5 tipos reais (`DOCUMENT`/`EMAIL`/`TRON_ADDRESS`/`PIX_KEY`/`USER`) substituem o campo de texto livre "usuário, conta ou dispositivo" do protótipo — agora é um `Select` porque o backend precisa saber o que está bloqueando pra normalizar certo (documento sem pontuação, e-mail em caixa baixa; endereço TRON fica como veio, o checksum depende da caixa). Motivo (10-1000 caracteres) continua obrigatório; o campo "evidências" separado saiu — o backend só grava `reason`. `action` sempre `BLOCK` nesta tela (desbloqueio existe na API mas não tem UI ainda, fora do escopo desta rodada).

### `/admin/kyc` + `/admin/kyc/[id]` — fila nova

Sem tela equivalente no protótipo. Fila (`GET /admin/kyc`, sem filtro traz `SUBMITTED`+`IN_REVIEW`, mais antigo primeiro) e detalhe (`GET /admin/kyc/:id`, com URL assinada de leitura — curta, gerada na hora — de cada documento). "Assumir caso" é `POST /admin/kyc/:id/claim`, UPDATE condicional em `SUBMITTED` (409 se outro analista já assumiu, mesmo princípio do aceite de ordem). Decisão é `POST /admin/kyc/:id/review`: aprovar move a conta de `PENDING_KYC` pra `ACTIVE`; recusar exige motivo (a tela bloqueia o botão sem ele) e não fecha a porta — o usuário abre um caso novo com outros documentos, o caso recusado permanece com o motivo.

### Achado de segurança — RBAC, agora aplicado do lado do backend

O card "Achado de segurança registrado, não corrigido nesta passada" (acima) apontava que nenhuma tela administrativa tinha controle de acesso por papel. Do lado do backend isso mudou nesta rodada: toda rota `/admin/*` (incluindo `/admin/kyc`) está atrás de `AdminGuard`, que devolve 403 pra quem não tem `ADMIN` no JWT. O front continua **sem** gate próprio — mesma simplificação documentada no resto do app (`/disputes` idem) — mas agora o conteúdo real é sempre o que o backend autoriza, não mais "qualquer conta vê PII de terceiros". Concessão do papel `ADMIN` continua manual (SQL direto, sem rota) e só vale no próximo login, porque o papel vem do JWT assinado.

### Achado: repositório local do backend estava 10 commits atrás

O `marinsprosper-api` clonado localmente (`C:\Users\joser\OneDrive\Desktop\marinsprosper-api`) não tinha nenhum dos módulos `admin`, `blacklist`, `kyc`, `disputes` ou `ratings` — só apareceram depois de um `git pull` (`0e59da8..4006aec`, 125 arquivos). O levantamento de contrato desta rodada (DTOs, guards, shape de resposta) foi feito contra o código atualizado, não contra suposição nem contra a documentação antiga do `main`. Isso é independente do bloqueio da **VM de teste** (`api.163-176-220-125.sslip.io`), que continua desatualizada e sem `admin/*`/`kyc/*` — ver Backlog no [[Kanban]].

### Não testável contra o ambiente de teste

Mesmo bloqueio de infraestrutura do resto do Sprint 4: a VM de teste não tem `admin/*` nem `kyc/*` no Swagger ao vivo. Implementado certo contra o código-fonte real do backend, mas sem como confirmar ponta a ponta até o redeploy — ver item de bloqueio no [[Kanban]].
