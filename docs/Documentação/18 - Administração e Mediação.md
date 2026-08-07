---
tags: [frontend, administração, auditoria]
---

← [[17 - Carteira e Caução]] | [[Início]]

# Administração & Mediação — implementação parcial (Sprint -1)

Cobre os 4 primeiros cards do bucket "Administração & Mediação" do [[Kanban]]: painel administrativo, listagem/aprovação de usuários, visão consolidada de ordens e logs de auditoria. Os outros 5 cards (blacklist, disputas, máscara de dados sensíveis, indicação de MFA) continuam como placeholder — ver `(dashboard)/admin/blacklist` e `(dashboard)/admin/disputes`, ainda não implementados nesta passada.

## Rotas

| Rota | Arquivo | Corresponde a |
|---|---|---|
| `/admin` | `(dashboard)/admin/page.tsx` | Resumo + atalhos |
| `/admin/users` | `(dashboard)/admin/users/page.tsx` | `GET /admin/users` (implícito — não estava na Parte 5, adicionado por analogia) |
| `/admin/orders` | `(dashboard)/admin/orders/page.tsx` | Visão consolidada de ordens |
| `/admin/audit-logs` | `(dashboard)/admin/audit-logs/page.tsx` | Log de auditoria, somente leitura |

## Diretório de usuários (`src/lib/mock/admin-users.tsx`)

Mais amplo que as duas contas "logáveis" de `session.tsx` — um admin de verdade lista todo mundo, não só quem dá pra virar via `AccountSwitcher`. Seis pessoas fake, cobrindo os 4 status possíveis (`pendente`, `aprovado`, `suspenso`, `bloqueado`) e níveis de KYC variados. `user-client-2` (Carla Souza) reaproveita o id que já existia como cliente de `order-2` em `orders.tsx` — não criei uma segunda pessoa fake com o mesmo papel.

Ação `APPROVE` (botão "Aprovar", só visível pra status `pendente`) também registra um evento no log de auditoria — é a única ação administrativa deste lote que já está com efeito colateral de verdade, não só um botão que muda uma tabela.

## Log de auditoria (`src/lib/mock/audit-log.tsx`)

Somente leitura por design: `logEvent` é a única forma de escrever, chamada de fora (não existe UI de editar/apagar em lugar nenhum). Categorias `on-chain` e `admin`, com abas de filtro em `/admin/audit-logs`.

Dois eventos já nascem com wiring real:
- **Aprovação de cadastro** (`/admin/users`, ação `APPROVE`).
- **Confirmação de depósito de caução** (`/wallet`, quando `confirmDeposit` dispara depois dos 8s simulados de "aguardando confirmação on-chain" — ver [[17 - Carteira e Caução]]).

Os outros eventos do seed (liberação de custódia, reembolso, blacklist, decisão de disputa) são só dados estáticos ilustrando o formato — passam a ser gerados de verdade conforme as telas correspondentes (blacklist, disputas) forem implementadas nos próximos cards deste mesmo bucket.

## Visão consolidada de ordens (`/admin/orders`)

Mostra **todas** as ordens, ignorando a checagem de participante que `OrderDetail` aplica em `/orders/[id]`. De propósito não linka pro detalhe de cada ordem — `OrderDetail` bloquearia o acesso (IDOR, já auditado em [[14 - Ofertas e Ordens]]), e este protótipo ainda não tem uma identidade de admin separada que justifique abrir uma exceção nessa checagem. Fica como tabela de leitura, sem drill-down, até existir esse conceito.

## Achado de segurança registrado, não corrigido nesta passada

Nenhuma das quatro telas novas tem controle de acesso — qualquer conta que navegue até `/admin/*` vê a listagem completa de usuários (inclusive e-mail e telefone de gente com quem não tem nenhuma relação) e pode aprovar cadastros. Isso **não é novo**: o item "Admin" já existia na navegação principal desde o Design System, acessível a qualquer conta, e a ausência de RBAC no protótipo é uma simplificação conhecida e documentada em vários lugares (`session.tsx`, [[15 - Chat e Comprovantes]]). Mas antes disso era só um placeholder de texto — agora existe conteúdo real (PII de terceiros, ação de aprovação) atrás dessa rota sem controle nenhum. Fica registrado explicitamente aqui e na auditoria ([[11 - Auditorias e Validações]]) porque **isso não pode chegar a produção assim**: controle de acesso por papel (`user_roles`: admin/mediador) é trabalho de backend (Sprint 1-2), não uma tela nova — só é aceitável continuar sem ele enquanto o protótipo inteiro roda sem autenticação real.

## Testado manualmente, em build de produção

1. `/admin` — contadores batendo com os dados reais (6 usuários, 1 pendente, contagem de ordens por categoria)
2. `/admin/users` — busca filtrando por nome/username/e-mail; aprovar Diego Martins muda o badge pra "Aprovado" e o evento aparece em `/admin/audit-logs` na mesma sessão, no topo da lista, com timestamp real
3. `/admin/orders` — lista todas as 5 ordens do seed, de contas diferentes, sem filtrar por participante
4. `/admin/audit-logs` — abas Todos/On-chain/Administrativo filtrando corretamente, sem nenhum controle de editar/apagar em nenhuma linha
