---
tags: [arquitetura]
---

← [[01 - PRD]] | → [[03 - Modelo de Dados]]

# Parte 2 — Arquitetura técnica

## 1. Visão em camadas

```
Apresentação — Next.js (TypeScript)
web primeiro; mobile (Flutter/React Native) depois
----------------------------------------------------
API — NestJS (TypeScript)
Auth · Orders · Chat · Disputes · Admin
----------------------------------------------------
Domínio (puro, testável, sem I/O direto)
  - Máquina de estados da ordem
  - Motor de taxas (com snapshot)
  - Ledger de dupla entrada / caução
  - Motor de risco (scoring)
----------------------------------------------------
Custódia — camada plugável
  Opção A: saldo em Postgres (centralizado)
  Opção B: smart contract (multisig on-chain)
----------------------------------------------------
Infraestrutura
  Postgres · Redis/BullMQ · S3 · WebSocket
```

## 2. Princípio de fronteira: domínio não depende de custódia

Esta é a decisão arquitetural mais importante do projeto. A máquina de estados, o motor de taxas e o ledger não devem ter nenhum conhecimento de como o ativo é fisicamente guardado — eles só enxergam a interface de custódia (lock, release, refund), sem saber se por trás existe uma linha de banco de dados ou um contrato on-chain.

Por quê isso importa: a decisão entre custódia centralizada e smart contract está travada numa definição externa a esta equipe (jurisdição/regulatório, ver [[01 - PRD]] seção 7). Se essa fronteira não for respeitada desde o início — por exemplo, se a lógica de aceite de ordem chamar diretamente uma função de banco de dados em vez de passar pela interface de custódia — trocar de modelo depois de meses de desenvolvimento significa reescrever a aplicação inteira, não só uma camada.

Interface mínima que qualquer implementação de custódia precisa cumprir:

```
lock(order_id, wallet_id, amount)      -> reservation_id
release(reservation_id, destination)   -> tx_reference
refund(reservation_id)                 -> tx_reference
get_balance(wallet_id)                 -> { available, reserved }
```

## 3. Stack recomendada

| Camada | Escolha | Observação |
|---|---|---|
| Borda / WAF | Cloudflare | DNS, SSL/TLS e mitigação de DDoS — obrigatório, não opcional |
| Frontend web | Next.js + TypeScript, App Router, Tailwind + shadcn/ui | CDN global (Vercel ou Cloudflare Pages), CI/CD integrado |
| App mobile | Flutter ou React Native | Fase futura; lógica crítica continua no backend |
| Backend | NestJS + TypeScript, em containers | AWS ECS Fargate / GCP Cloud Run / Render — mínimo 2 instâncias atrás de load balancer (HA) |
| Banco | PostgreSQL gerenciado | AWS RDS / Supabase / Neon, com PgBouncer ou RDS Proxy (connection pooling) |
| Cache/filas | Redis Cluster + BullMQ | AWS ElastiCache ou Upstash; expiração de ordem, Pub/Sub de WebSocket |
| Storage | S3 (ou Cloudflare R2), buckets privados | Upload direto do navegador via Presigned URLs |
| Chat | WebSocket + persistência em Postgres | Gateway desacoplado via Redis Pub/Sub |
| Auth | A decidir — Auth0, Cognito, Supabase Auth, ou JWT próprio auditado | MFA obrigatório para caixeiro e admin |
| Monitoramento | Sentry + OpenTelemetry, Grafana/Datadog | Fase 3 |
| CI/CD | GitHub Actions | Sprint 0 (setup) e Sprint 5 (hardening) — ver [[09 - Roadmap de Sprints]] |
| Segredos | AWS Secrets Manager ou HashiCorp Vault | Proibido usar arquivo .env em produção, inclusive para a hot wallet |

Supabase pode acelerar o protótipo (Fase 1/2), mas nenhuma regra financeira ou de autorização deve viver só em RLS do Supabase sem passar pelo backend.

O provedor exato dentro de cada categoria ainda é uma decisão em aberto — ver [[01 - PRD]] seção 7. A arquitetura foi desenhada para não depender de qual provedor específico for escolhido dentro de cada categoria.

## 4. Máquina de estados da ordem (consolidada)

```
DRAFT -> OPEN -> RESERVED -> ACCEPTED
     -> AWAITING_CLIENT_TRANSFER
     -> CLIENT_MARKED_TRANSFERRED
     -> AWAITING_CASHIER_CONFIRMATION
     -> CASHIER_CONFIRMED_RECEIPT
     -> AWAITING_CASHIER_TRANSFER
     -> CASHIER_MARKED_TRANSFERRED
     -> AWAITING_CLIENT_CONFIRMATION
     -> COMPLETED

Ramos paralelos, a partir de qualquer estado intermediário:
     -> CANCEL_REQUESTED -> CANCEL_ACCEPTED | CANCEL_REJECTED
     -> DISPUTE_OPEN -> DISPUTE_UNDER_REVIEW -> DISPUTE_RESOLVED
     -> EXPIRED
     -> SUSPENDED -> CLOSED
     -> FROZEN_FOR_AUDIT -> (volta pro estado onde estava)
```

**`FROZEN_FOR_AUDIT`** — adicionado durante a validação da Sprint -1 (não fazia parte da especificação original desta seção). Semântica adotada pelo frontend, pendente de validar com o time antes do backend implementar de verdade: um admin congela qualquer ordem num estado intermediário pra investigação (fraude, AML, valor atípico), bloqueando toda ação de cliente/caixeiro até liberar — e liberar volta a ordem pro status exato onde estava, não avança nem reseta o fluxo. Diferente de `DISPUTE_OPEN`, que é sempre escalada por uma das partes; congelar é sempre iniciativa do admin. Motivo é obrigatório, mesma regra de "toda transição grava... motivo" abaixo. Ver [[18 - Administração e Mediação]] pra implementação de referência no protótipo.

Regras que valem para toda transição, sem exceção:

- Apenas transições explicitamente permitidas pela tabela de transição (não por convenção de código).
- Toda transição grava autor, timestamp, IP e motivo.
- Transições que mexem em saldo ou caução usam transação de banco (all-or-nothing).
- O estado anterior é validado antes de qualquer escrita — nunca assumir o estado atual sem checar.

## 5. Requisitos não funcionais (não negociáveis)

- Idempotência: todo endpoint que afeta saldo/caução aceita `idempotency_key`. Retry de rede não pode duplicar efeito.
- Atomicidade no aceite de ordem: usar `SELECT ... FOR UPDATE` ou constraint de unicidade — nunca "verificar e depois atualizar" em passos separados.
- Auditabilidade desde o dia 1: mesmo em sandbox (Fase 2), o ledger já deve ser de dupla entrada e os logs já devem ser imutáveis. Corrigir isso depois de ir para produção é reescrita, não ajuste.
- Precisão financeira: nunca usar float para valores monetários; usar tipo decimal exato no banco.

## 6. Ambientes

- **Local (Sprint 0):** Docker Compose com Postgres e Redis, para desenvolvimento sem dependência de nuvem.
- **Sandbox atual (Fase 2):** saldo simulado, sem custódia real, PIX mockado ou em sandbox de gateway (Mercado Pago/Asaas), testes restritos à equipe.
- **Produção futura (Fase 3/4):** depende da definição externa de custódia e jurisdição antes de receber dinheiro real de terceiros.
