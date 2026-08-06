---
tags: [roadmap, docs]
---

← [[07 - Plano de Resposta a Incidentes]] | → [[09 - Roadmap de Sprints]]

# Parte 8 — Roadmap de documentação futura

O que fica de fora deste pacote inicial, por que fica de fora agora, e quando entra:

| Documento | Por que ainda não | Quando entra |
|---|---|---|
| Design system | Depende de decisões visuais que só fazem sentido no protótipo navegável | Fase 1 |
| Documentação completa da API (request/response, erros) | Depende dos contratos exatos definidos durante a implementação | Fase 2, incrementalmente por endpoint |
| Casos de teste escritos | Dependem do código existir | Fase 2, junto com cada módulo |
| Documentação de deploy | Infraestrutura de referência já definida ([[02 - Arquitetura Técnica]]); falta o guia passo-a-passo e o provedor exato dentro de cada categoria | Sprint 5 |
| Configuração de CI/CD | Depende do repositório estar montado | Sprint 0 (setup básico) e Sprint 5 (hardening) |
| Plano de backup | Depende do banco e storage estarem em produção | Fase 2/3 |
| Plano de monitoramento | Depende de volume real para calibrar alertas | Fase 3 |
| Manual administrativo | Depende do painel admin existir | Fase 3 |
| Manual de suporte | Depende do fluxo de atendimento estar definido | Fase 3 |

As partes [[01 - PRD|1]] a [[07 - Plano de Resposta a Incidentes|7]] sustentam as decisões de arquitetura e segurança independente de quando os itens acima forem preenchidos — por isso foram as primeiras a serem fechadas. [[09 - Roadmap de Sprints]] detalha a sequência que preenche a maior parte desta tabela.
