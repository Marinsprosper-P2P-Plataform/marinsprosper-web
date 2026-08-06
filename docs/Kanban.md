---
kanban-plugin: board
---

## Backlog

- [ ] Definir custódia final: saldo centralizado vs. smart contract multisig #decisão
- [ ] Escolher provedor de KYC (idwall, Unico, Serpro, CAF) #decisão
- [ ] Definir política de retirada de caução #decisão
- [ ] Escolher provedor de nuvem (AWS/GCP/Render, RDS/Supabase/Neon, ElastiCache/Upstash) #decisão
- [ ] Especificar validação de comprovantes via OCR/IA #ideia
- [ ] Design system (Fase 1) #frontend
- [ ] Documentação completa da API (request/response, erros) #docs
- [ ] Plano de backup #docs
- [ ] Plano de monitoramento #docs
- [ ] Manual administrativo #docs
- [ ] Manual de suporte #docs


## Sprint -1 — Protótipo navegável (Fase 1)

- [ ] Telas de autenticação (login, registro) #frontend
- [ ] Tela de listagem de ofertas #frontend
- [ ] Tela de detalhe de ordem com as 11 transições de estado #frontend
- [ ] Chat da ordem (UI, dados fake) #frontend
- [ ] Painel administrativo (UI, dados fake) #frontend
- [ ] Validar UX com a equipe antes de iniciar o backend #processo


## Sprint 0 — Infra local

- [ ] Docker Compose com Postgres e Redis
- [ ] Repositório do backend (marinsprosper-api) criado
- [ ] CI/CD básico no GitHub Actions


## Sprint 1 — Fundação backend

- [ ] Banco de dados (Prisma/TypeORM) a partir do modelo de dados
- [ ] Autenticação JWT
- [ ] Motor do ledger de dupla entrada


## Sprint 2 — Domínio crítico (não-negociáveis)

- [ ] Interface CustodyAdapter (lock/release/refund/get_balance)
- [ ] Máquina de estados com lock pessimista
- [ ] Idempotência em endpoints financeiros
- [ ] Trava anti-triangulação (CPF/CNPJ da chave PIX vs. KYC)
- [ ] Rodar checklist de prontidão para auditoria contra o entregue


## Sprint 3 — Tempo real

- [ ] Filas no BullMQ para timeouts de ordem
- [ ] Gateway WebSocket (chat e status via Redis Pub/Sub)


## Sprint 4 — Integração frontend

- [ ] Conectar frontend Next.js à API real
- [ ] Upload de mídia via Presigned URLs


## Sprint 5 — Hardening e deploy

- [ ] Testes de carga/concorrência (K6)
- [ ] Hardening de segurança
- [ ] Integração de KYC real
- [ ] Deploy


## Concluído

- [ ] Repositório conectado ao GitHub
- [ ] Scaffold Next.js (App Router, TypeScript, Tailwind, shadcn/ui)
- [ ] Documentação inicial (PRD, arquitetura, modelo de dados, segurança, API, testes, incidentes)
- [ ] Estrutura de pastas do frontend (rotas e diretórios de suporte)


%% kanban:settings
```
{"kanban-plugin":"board"}
```
%%
