---
tags: [moc]
---

# Marinsprosper — Plataforma P2P

Vault de documentação e gestão do projeto. Este documento é o ponto de entrada.

## Gestão

- [[Kanban]] — quadro de tarefas por sprint

## Documentação técnica

1. [[01 - PRD]]
2. [[02 - Arquitetura Técnica]]
3. [[03 - Modelo de Dados]]
4. [[04 - Documentação de Segurança]]
5. [[05 - Especificação de API]]
6. [[06 - Estratégia de Testes]]
7. [[07 - Plano de Resposta a Incidentes]]
8. [[08 - Roadmap de Documentação Futura]]
9. [[09 - Roadmap de Sprints]]
10. [[10 - Design System]] — registro de implementação (frontend), atualizado conforme os cards do Kanban avançam
11. [[11 - Auditorias e Validações]] — log de verificações de segurança/estrutura/qualidade sobre o repositório
12. [[12 - Deploy (Vercel)]] — preparação do deploy e passo a passo do que falta autorizar manualmente
13. [[13 - Autenticação e Onboarding]] — telas de login, MFA, registro, KYC, solicitação de caixeiro
14. [[14 - Ofertas e Ordens]] — ofertas, criação de ordem, ciclo completo, cancelamento, disputa, avaliação
15. [[15 - Chat e Comprovantes]] — chat por ordem, edição imutável, anexos privados, e a refatoração pro papel dual cliente+caixeiro
16. [[16 - Perfil e Configurações]] — página de identidade (`@username`, país, cidade, reputação) e cadastro de chaves PIX com trava de titularidade
17. [[17 - Carteira e Caução]] — visão do caixeiro: sete saldos separados, limite derivado, depósito com espera de confirmação on-chain, disponibilidade
18. [[18 - Administração e Mediação]] — painel admin, usuários, ordens consolidadas, log de auditoria, blacklist, disputas, máscara de dados, MFA
19. [[19 - Checklist de Validação Sprint -1]] — validação formal item a item, com os gaps encontrados (`FROZEN_FOR_AUDIT`, anti-triangulação na transação) e como foram corrigidos
20. [[20 - Relatórios e Ganhos]] — dashboards de cliente/caixeiro/admin, filtro de período reaproveitável, gráficos com Recharts, e a arquitetura proposta pro backend real (tabela derivada, BullMQ, cache)

## Como usar este vault

Este vault espelha o [README.md](../README.md) do repositório `marinsprosper-web`, quebrado em notas menores para facilitar navegação, links cruzados e o quadro Kanban. O README na raiz do repositório continua sendo a fonte "oficial" lida por quem abre o projeto no GitHub — mantenha os dois em sincronia quando algo mudar aqui.

Nada aqui está fechado. É um espaço vivo, para editar e crescer — não para ser aceito como está.

## Plugin Kanban

O board em [[Kanban]] usa o formato do plugin comunitário **Kanban** (Obsidian). Para visualizá-lo como quadro (colunas/cards) em vez de markdown puro:

1. `Configurações` → `Plugins da comunidade` → `Navegar`
2. Buscar por "Kanban" (autor: mgmeyers)
3. Instalar e ativar

O plugin já está pré-habilitado na configuração do vault (`community-plugins.json`) — só falta instalá-lo pela interface do Obsidian na primeira vez que abrir.
