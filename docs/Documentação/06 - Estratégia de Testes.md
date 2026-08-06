---
tags: [testes, qualidade]
---

← [[05 - Especificação de API]] | → [[07 - Plano de Resposta a Incidentes]]

# Parte 6 — Estratégia de testes (nível básico)

Sem casos de teste escritos ainda — isso entra junto com o código na Fase 2. O que importa fixar agora é onde o esforço de teste deve se concentrar, priorizado pelo que quebra mais caro se falhar:

1. **Máquina de estados** — cada transição não permitida precisa de um teste explícito rejeitando-a, não só o caminho feliz sendo testado. Testar especificamente: tentar pular etapa, tentar voltar de COMPLETED, tentar agir fora do papel (cliente tentando confirmar recebimento do caixeiro, por exemplo).
2. **Concorrência** — dois caixeiros tentando aceitar a mesma ordem ao mesmo tempo; teste de carga simulando a corrida, não só teste sequencial.
3. **Idempotência** — reenviar a mesma requisição com a mesma Idempotency-Key não pode duplicar efeito em saldo, caução ou estado da ordem.
4. **Autorização (IDOR)** — tentar acessar ou modificar ordem, chat ou disputa da qual o usuário não é participante.
5. **Ledger** — soma de débitos e créditos sempre bate; nenhuma operação deixa o ledger inconsistente, mesmo sob falha simulada no meio da transação.
6. **Upload** — arquivo com MIME divergente da extensão, tamanho excessivo, tipo bloqueado (SVG, executável).

Esses seis pontos devem ter cobertura antes de qualquer outra parte do sistema — são os que aparecem no checklist de auditoria ([[04 - Documentação de Segurança]] seção 6) e os mais caros de descobrir quebrados em produção.
