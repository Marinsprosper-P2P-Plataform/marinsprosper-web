---
tags: [validação, sprint--1, checklist]
---

← [[18 - Administração e Mediação]] | [[Início]]

# Checklist de validação da Sprint -1

Registro da passada de validação formal do protótipo (2026-08-08), item a item, contra o checklist recebido. Verificação feita por inspeção de código + teste manual no navegador, não por suposição.

## 1. Fluxos principais navegáveis com dados fake

✅ **Confirmado.** Criação de ordem, aceite pelo caixeiro, upload de comprovante, chat, disputa e timeout/expiração — todos testados no navegador em passadas anteriores, com evidência ponta a ponta (inclusive o countdown de 30 min expirando de verdade e movendo a ordem pra `EXPIRED`, ver [[14 - Ofertas e Ordens]]).

## 2. Máquina de estados sem gaps (11 estados + EXPIRED/CANCELLED/DISPUTE/FROZEN_FOR_AUDIT)

🔴 **Gap real encontrado e corrigido.** Os 11 estados do fluxo principal e os ramos `CANCEL_*`/`DISPUTE_*`/`EXPIRED`/`SUSPENDED→CLOSED` já existiam e são representados visualmente (`OrderTimeline` congela e mostra o branch via banner, automático pra qualquer status fora de `ORDER_HAPPY_PATH`). `FROZEN_FOR_AUDIT` não existia em nenhum lugar — nem no código, nem em [[02 - Arquitetura Técnica]] (seção 4, a especificação original da máquina de estados). Não era uma regressão: nunca tinha sido especificado antes deste checklist.

Adicionado com semântica decidida pelo frontend (decisão registrada, pendente de validar com o time antes do backend implementar de verdade): admin congela qualquer ordem intermediária pra investigação (fraude, AML, valor atípico), motivo obrigatório, libera de volta pro status exato de onde saiu. Ver [[18 - Administração e Mediação]] (implementação) e [[02 - Arquitetura Técnica]] (especificação atualizada).

## 3. UX de anti-triangulação — bloqueio visível numa transação

🔴 **Gap real encontrado e corrigido.** A trava existia só no cadastro da chave PIX (`/profile`) — `/orders/new` nunca referenciava nenhuma chave, então não tinha como mostrar "esta transação seria bloqueada" durante uma transação de verdade.

Corrigido: `/orders/new` agora exige selecionar uma chave PIX cadastrada, com re-checagem da trava no ponto de uso (defesa em profundidade, já que uma chave incompatível não deveria conseguir ter sido salva). Ver [[14 - Ofertas e Ordens]].

## 4. Feedback de pessoas reais (idealmente alguém fora do time)

❓ **Não verificável por código.** Isso é um passo de processo que aconteceu (ou não) fora deste repositório — não há como confirmar por inspeção de código ou teste no navegador. Precisa ser respondido diretamente pelo time, não por uma auditoria técnica.

## 5. Nenhuma decisão de UX pendente que travaria o schema

⚠️ **Parcial.** Os dois exemplos citados no checklist já estavam decididos e implementados:
- Fila de ordens do caixeiro → `/offers` (abas Comprar/Vender).
- Mediação de disputa do admin → `/admin/disputes` + `/admin/disputes/[id]`.

Mas a auditoria encontrou duas pendências não citadas, ligadas ao item 3:
- **Vínculo ordem↔chave PIX** — não existia (é o que o item 3 corrigiu). Agora modelado via `Order.clientPixKeySnapshot`.
- **Saque de caução** — `CollateralAccount.pendingWithdrawal` existia no modelo ([[17 - Carteira e Caução]]) mas nenhum fluxo o alimentava; só depósito estava implementado. **Resolvido**: fluxo completo de saque (`WithdrawDialog`, `PendingWithdrawal`, estado de espera "em processamento") implementado em `/wallet` — ver [[17 - Carteira e Caução]], seção "Fluxo de saque de caução".

## Resumo

| # | Item | Status |
|---|---|---|
| 1 | Fluxos principais navegáveis | ✅ Confirmado |
| 2 | Máquina de estados sem gaps | 🔴→✅ Gap encontrado e corrigido (`FROZEN_FOR_AUDIT`) |
| 3 | UX de anti-triangulação numa transação | 🔴→✅ Gap encontrado e corrigido (seleção de chave PIX na ordem) |
| 4 | Feedback de pessoas reais | ❓ Não verificável por código — responder fora desta auditoria |
| 5 | Decisões de UX pendentes que travam schema | 🔴→✅ Exemplos citados OK; achada pendência de saque de caução, implementada em seguida |
