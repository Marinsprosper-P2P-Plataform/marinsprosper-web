---
tags: [roadmap, sprints]
---

← [[08 - Roadmap de Documentação Futura]] | [[Início]]

# Parte 9 — Roadmap de sprints e estrutura de repositório

Sequência definida para o desenvolvimento com Claude Code, respeitando a ordem de dependência técnica: protótipo antes de backend, fundação antes de lógica de negócio, lógica antes de infraestrutura de tempo real.

Acompanhe o progresso em [[Kanban]].

| Sprint | Entrega | Depende de |
|---|---|---|
| Sprint -1 (Fase 1) | Protótipo navegável em Next.js com dados fakes (Tailwind CSS + shadcn/ui) — design system em [[10 - Design System]] | — |
| Sprint 0 | Setup de infra local (Docker Compose com Postgres e Redis) e repositórios | Sprint -1 aprovado |
| Sprint 1 | Banco de dados (Prisma/TypeORM), autenticação JWT, motor do ledger de dupla entrada | Sprint 0 |
| Sprint 2 | Interface CustodyAdapter, máquina de estados com lock pessimista, idempotência, trava anti-triangulação | Sprint 1 |
| Sprint 3 | Filas no BullMQ para timeouts, gateways de WebSocket (chat e status via Redis Pub/Sub) | Sprint 2 |
| Sprint 4 | Conexão do frontend Next.js com a API real, upload de mídia via Presigned URLs | Sprint 3 |
| Sprint 5 | Testes de carga/concorrência (K6), hardening de segurança, integração de KYC real, deploy | Sprint 4 |

O Sprint 2 é o ponto de maior atenção: é onde os itens não-negociáveis de [[04 - Documentação de Segurança]] (ledger, aceite atômico, idempotência, trava anti-triangulação) deixam de ser especificação e viram código. Vale rodar o checklist de prontidão para auditoria ([[04 - Documentação de Segurança]] seção 6) contra o que foi entregue no Sprint 2 antes de avançar para o Sprint 3, em vez de deixar essa checagem só para o Sprint 5.

## Estrutura do monorepo

```
marinsprosper-api/   (NestJS, modular)
  src/modules/
    auth/
    users/
    ledger/
    custody/
    orders/
    queues/
    chat/
    storage/

marinsprosper-web/   (Next.js, App Router)
  src/app/
    (auth)/
    (dashboard)/
      offers/
      orders/[id]/
      wallet/
      admin/
```

Esta estrutura mapeia diretamente para a máquina de estados e o modelo de dados de [[02 - Arquitetura Técnica]] e [[03 - Modelo de Dados]] — cada módulo do backend corresponde a um grupo de tabelas e a um grupo de endpoints já definido em [[05 - Especificação de API]].
