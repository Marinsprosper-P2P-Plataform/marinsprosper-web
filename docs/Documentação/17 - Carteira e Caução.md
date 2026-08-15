---
tags: [frontend, carteira, caução]
---

← [[16 - Perfil e Configurações]] | [[Início]]

# Carteira & Caução — visão do Caixeiro — implementação (Sprint -1)

Cobre o card "Carteira & Caução — visão do Caixeiro" do [[Kanban]]: tela de carteira com os sete saldos separados, limite derivado, fluxo de depósito com endereço TRC20 fake e espera de confirmação on-chain simulada, e tela de disponibilidade do caixeiro. Dados fake, sem backend — mesmo espírito do resto do Sprint -1.

## Rotas

| Rota | Arquivo | Corresponde a |
|---|---|---|
| `/wallet` | `(dashboard)/wallet/page.tsx` | `GET /cashier/collateral` + `GET /cashier/limit` |
| `/wallet/availability` | `(dashboard)/wallet/availability/page.tsx` | `PATCH /cashier/availability` |

`/wallet` continua sendo o único item de navegação principal ("Carteira") — a tela de disponibilidade é uma sub-rota linkada de dentro da carteira, não um item novo na Sidebar/BottomNav, pra não lotar a navegação principal.

## `src/lib/mock/collateral.tsx` — os sete saldos, nunca um único campo

Espelha `cashier_collateral_accounts` de [[03 - Modelo de Dados]] (seção 2) literalmente: `available`, `reserved`, `blocked`, `underReview`, `usedForReimbursement`, `pendingWithdrawal`, `withdrawn`. Nenhuma tela soma isso num "saldo" único — a regra "nunca um campo de saldo solto" do modelo de dados é reforçada de propósito, mesmo em mock.

`computeCashierLimit(account)` é a única função que deriva o limite — mesma fronteira arquitetural de `quoteOrder` (`pricing.ts`): nenhuma tela multiplica `caução × fator` inline.

```
confirmedCollateral = available + reserved + blocked   // já entrou de verdade
grossLimit           = confirmedCollateral × EXPOSURE_FACTOR
availableLimit        = available × EXPOSURE_FACTOR      // só o que ainda não está comprometido
```

`EXPOSURE_FACTOR = 0.5` — valor de referência do protótipo (mesma ressalva do `FEE_PERCENT` em `pricing.ts`), não uma decisão de produto fechada.

**Nota importante sobre `user.cashierAvailableLimit`**: o campo plano em `session.tsx`, usado por `/offers` e `OrderActions` pra decidir se uma conta pode aceitar uma ordem, continua existindo e **não foi unificado** com este novo módulo de caução. São dois mocks paralelos de propósito — mexer no primeiro arriscava quebrar um fluxo já testado e auditado (Ofertas & Ordens); a unificação de verdade só faz sentido quando existir `cashier_limits` real vindo do backend (Sprint 2), com uma única fonte de verdade. Os valores iniciais (Ana: 3.000, Beto: 5.000) foram escolhidos pra baterem com a caução seedada aqui só na carga inicial — depois que qualquer depósito ou ordem mexe nos dois mocks, eles divergem, e isso é esperado.

## Depósito — endereço fake + espera de confirmação on-chain

`deposit-dialog.tsx` mostra um endereço TRC20 determinístico (derivado do `userId`, só pra parecer um endereço de verdade — não é criptografia nem endereço real) com botão de copiar (`navigator.clipboard`). O campo de valor simula "eu já enviei X" — não existe upload de comprovante on-chain aqui, é só o valor que o usuário diz ter mandado.

Ao confirmar, `initiateDeposit` joga o valor pra `underReview` e cria um `PendingDeposit` com `confirmAt` 8 segundos no futuro. `/wallet` agenda um `setTimeout` por depósito pendente (guardado num `Set` em `useRef` pra nunca agendar duas vezes o mesmo, mesmo cuidado do `PaymentCountdown` em [[14 - Ofertas e Ordens]]) — ao vencer, `confirmDeposit` move o valor de `underReview` pra `available`, e o limite recalcula na hora. Esse é literalmente o item do Kanban "estado de espera aguardando confirmação on-chain antes do saldo refletir no limite".

## Disponibilidade do caixeiro

`cashier-availability.tsx` guarda `online`, `days`, `startTime`/`endTime`, `methods` por conta. Sem botão "salvar" — cada mudança (toggle online/offline, dia da semana, horário, método) já aplica direto no mock, mesma UX de uma tela de configurações simples. O toggle online/offline usa um `Switch` novo (`src/components/ui/switch.tsx`, wrapper em cima do primitivo Radix — não existia no design system ainda, os outros componentes shadcn instalados não incluíam Switch).

## Testado manualmente, em build de produção

1. `/wallet` como Ana Ferreira — sete saldos exibidos, limite bruto e disponível em 3.000 USDT (bate com o valor inicial de `cashierAvailableLimit`, só na carga inicial)
2. "Depositar caução" → endereço fake exibido, valor de 500 → "Em análise" sobe pra 500 USDT, card "Depósitos em análise" aparece com o badge "Aguardando confirmação on-chain"
3. Esperando ~8s: depósito confirmado sozinho (toast), "Em análise" volta a zero, "Disponível" sobe pra 6.500, limite bruto/disponível recalculam pra 3.250 USDT
4. `/wallet/availability` — toggle online/offline funciona (badge e texto de status mudam junto), dias/horário/métodos editáveis

## Fluxo de saque de caução

Item pendente do Kanban: `CollateralAccount.pendingWithdrawal` já existia no modelo desde a implementação original deste bucket, mas nenhuma tela o alimentava — só depósito estava implementado. Achado no checklist de validação da Sprint -1, ver [[19 - Checklist de Validação Sprint -1]].

Espelha o fluxo de depósito, na direção contrária:

- **Modelo (`src/lib/mock/collateral.tsx`)** — nova interface `PendingWithdrawal` (`id`, `amount`, `destinationAddress`, `confirmAt`), e `CollateralAccount` ganhou `pendingWithdrawals: PendingWithdrawal[]` (lista dos saques em processamento, ao lado do campo agregado `pendingWithdrawal: number` que já existia). Duas ações novas no reducer: `REQUEST_WITHDRAWAL` (move o valor de `available` pra `pendingWithdrawal` na hora, com guarda contra saque maior que o disponível — defesa em profundidade, a mesma checagem já roda na UI) e `CONFIRM_WITHDRAWAL` (move de `pendingWithdrawal` pra `withdrawn`, idempotente se o id já não estiver mais na lista).
- **`wallet/withdraw-dialog.tsx` (`WithdrawDialog`)** — pede valor e endereço de destino TRC20 (texto livre, mesma simplificação do endereço de depósito fake); valida saldo disponível antes de habilitar o botão. Mesmo aviso do depósito sobre endereço/rede errada = perda de fundos, sem reversão.
- **`/wallet`** — botão "Solicitar saque" ao lado de "Depositar caução". Segundo `useEffect` com seu próprio `useRef<Set>` (mesmo cuidado do `PaymentCountdown`/dos depósitos, pra nunca agendar duas vezes o mesmo saque) agenda o processamento simulado; ao vencer, `confirmWithdrawal` move o saldo e um evento `on-chain` é registrado no log de auditoria ("Saque de caução confirmado"), igual ao padrão já usado pra depósito. Nova seção "Saques em processamento" (mesmo visual de "Depósitos em análise") lista cada saque pendente com valor, endereço de destino e badge.
- **Seed** — Beto (`user-cashier-1`) já nasce com um saque de 300 USDT em processamento, pra `/wallet` ter algo pra mostrar sem precisar solicitar um novo primeiro.

## Testado manualmente, em dev

1. `/wallet` como Beto (via `AccountSwitcher`) — saque seed de 300 USDT aparece em "Saques em processamento"; após ~8s confirma sozinho (toast "Saque de 300 USDT confirmado"), `Pendente de retirada` volta a 0, `Retirado` sobe pra 300
2. Como Ana — "Solicitar saque" de 50.000 USDT (acima do disponível de 6.000) bloqueia o botão com "Esse valor excede seu saldo disponível"; 500 USDT com endereço de destino preenchido: `Disponível` cai pra 5.500, `Pendente de retirada` sobe pra 500, limite bruto/disponível recalculam pra 2.750 USDT na hora
3. Após ~8s, confirmação automática: `Pendente de retirada` volta a 0, `Retirado` sobe pra 1.700 USDT (1.200 do seed + 500 do saque)

`npm run lint` e `npx tsc --noEmit` sem erros.

## `/wallet` — API real (Sprint 4)

Rodada de integração: `GET /cashier/collateral`, `POST /cashier/collateral/deposit-address`, `POST /cashier/collateral/sync` e `GET /cashier/limit` substituem `src/lib/mock/collateral.tsx` só em `/wallet` (o mock continua existindo — `/reports`, `/admin/reports` e `dashboard.ts` ainda o usam, bucket "Relatórios & Ganhos" não migrado).

### O modelo real é mais simples que os 7 baldes do protótipo

Sem "reservado/bloqueado/em análise/usado em ressarcimento/pendente de retirada/retirado" — só **`free`** e **`locked`** (`CashierCollateral`, `src/lib/cashier/types.ts`), mais metadados que o mock não tinha: `mirrorAgeSeconds` (idade da leitura em segundos — o backend recusa aceite de ordem com espelho vencido, >5 min, e a tela agora mostra esse aviso na cor certa) e `pendingMovements` (intenções de custódia — `LOCK`/`RELEASE`/`REFUND` — já registradas no banco mas ainda sem confirmação on-chain, cada uma com `onChainTxHash` quando existir).

### Depósito inverte de direção

`deposit-dialog.tsx` reescrito: não existe mais um endereço gerado exibido pra "enviar". Quem registra o endereço é o cashier — o próprio, de onde ele vai mandar o colateral — e o backend devolve pra onde enviar (`contractAddress`, o mesmo endereço de custódia pra todo mundo, porque na TRON quem separa um depósito do outro é o remetente, não um endereço por conta). Reenviar o mesmo endereço já registrado é idempotente (mostra o destino de novo); trocar de endereço depois de registrado dá 409 ("exige reconciliação manual").

### "Atualizar saldo" (`sync`)

Item do Kanban resolvido: botão que chama `POST /cashier/collateral/sync`, relê o saldo no contrato e atualiza o espelho — existe justamente pra quando o aceite de ordem começa a recusar por leitura vencida (`mirrorAgeSeconds` alto).

### Sem saque

`POST /cashier/collateral/withdraw` **não existe no backend** — confirmado (nenhuma rota de saque no módulo `cashier`, nem em nenhum outro). O botão "Solicitar saque"/`WithdrawDialog` da versão mock foi removido de `/wallet`; o fluxo de saque simulado (seção acima) documenta uma funcionalidade que só existirá quando o backend expuser o endpoint — segue registrado como bloqueado no [[Kanban]], não implementado contra a API real.

### Testado contra o ambiente de teste (`cashier@teste.local`)

`GET /cashier/collateral` carregando saldo real (`Livre: 10.000 USDT`, endereço já registrado), aviso de espelho vencido correto (idade em segundos alta, texto em vermelho), seção de limite (`GET /cashier/limit`: min/max por ordem, ordens abertas/máximo, volume diário restante), movimento pendente real (`30 USDT · Estornado`, aguardando confirmação on-chain). "Atualizar saldo" chamado de verdade: `mirrorAgeSeconds` voltou a 0 e o saldo `Livre` recalculou pra 0 (reflexo real do contrato de teste, sem colateral de fato depositado nele). `npx tsc --noEmit` (projeto inteiro), `npx eslint src` e `npx next build` sem erros.
