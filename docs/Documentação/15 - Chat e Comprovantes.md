---
tags: [frontend, chat]
---

← [[14 - Ofertas e Ordens]] | [[Início]]

# Chat & Comprovantes — implementação (Sprint -1)

Cobre o card "Chat & Comprovantes" do [[Kanban]]. Motivou uma refatoração maior no modelo de sessão fake — ver seção "Refatoração" abaixo, é a parte mais importante desta nota.

## O chat (`src/lib/mock/chat.tsx` + `src/components/shared/order-chat.tsx`)

Mesmo padrão dos outros mocks: um Context com todas as mensagens de todas as ordens, filtradas por `orderId` na leitura. Sem persistência, sem WebSocket real (isso é Sprint 3/4).

- **Histórico imutável**: mensagens nunca são editadas in-place. "Editar" cria uma nova mensagem com `supersedes` apontando pra versão anterior — a original continua no array, só ganha o rótulo "(editada)" quando exibida na versão nova, com o texto antigo riscado acima. Testado manualmente: editar uma mensagem gera exatamente essa segunda entrada, sem apagar nada.
- **Anexos com preview**: imagem usa `URL.createObjectURL(file)` pra gerar uma prévia real no navegador (funciona porque o `File` do input é um objeto real, mesmo sem upload de verdade acontecendo). PDF mostra ícone genérico. Todo anexo exibe "Anexo privado — link expira" com ícone de cadeado — nunca um link clicável pra um caminho público, reforçando visualmente a regra de storage privado com URL assinada temporária (Documentação de Segurança).
- **Indicador de "digitando"**: `notifyTyping(orderId, user)` marca a conta como digitando por ~2,5s (reseta a cada tecla), e expira sozinho via `setTimeout`. Funciona de verdade pro cenário de revisão porque o `AccountSwitcher` reaproveita o mesmo estado do Context — trocar de conta é literalmente "virar a outra pessoa" na mesma sessão do navegador, então dá pra ver o indicador do outro lado ao alternar.

## Refatoração: uma conta pode ser cliente E caixeiro ao mesmo tempo

Durante a implementação do chat, o pedido foi corrigir uma limitação do modelo anterior: `MockUser` tinha um `role: "cliente" | "caixeiro"` fixo e exclusivo, com um switcher pra alternar entre duas contas fake inteiramente separadas. Isso não reflete como plataformas P2P de referência funcionam — ser aprovado como caixeiro não impede ninguém de continuar comprando/vendendo como qualquer cliente (é a mesma pessoa, só com uma capacidade a mais).

### O que mudou

- `MockUser.role` → `MockUser.isCashier: boolean`. Toda conta pode criar ordens como cliente por padrão; `isCashier` só indica se ela TAMBÉM tem status de caixeiro aprovado (habilita aceitar ofertas).
- `RoleSwitcher` → renomeado para `AccountSwitcher` (`src/components/shared/account-switcher.tsx`) — não é mais "escolher um papel", é "escolher qual conta fake" (cada uma com suas próprias capacidades).
- **Beto Caixeiro agora é dual**: tem `isCashier: true` mas continua podendo criar/comprar/vender ordens como qualquer cliente. Ana Cliente continua só cliente (representa quem não solicitou virar caixeiro ainda).
- Em todo componente que checava `user.role === "cliente"` / `"caixeiro"`, a checagem virou direta contra os IDs da ordem (`order.clientId === user.id`, `order.cashierId === user.id`) — o papel agora é uma propriedade de CADA ordem, não da conta em geral. Isso simplificou o código em vários lugares (removeu uma condição redundante) além de corrigir o bug de fundo.
- **`/orders` (Minhas ordens)** deixou de ser uma lista exclusiva por papel — agora mostra toda ordem onde a conta é participante em qualquer capacidade, com uma badge "Como cliente" / "Como caixeiro" por linha. O botão "Nova ordem" ficou sempre visível (qualquer conta pode criar).
- **Chat**: `authorRole` da mensagem passou a ser derivado por ordem (`order.clientId === user.id ? "cliente" : "caixeiro"`) em vez de vir de um `user.role` que não existe mais. `OrderChat` agora recebe a `order` inteira, não só o `orderId`.

### Achado durante o refactor: prevenção de autonegociação

Permitir dupla capacidade abre uma possibilidade nova que não existia antes: um caixeiro tentar aceitar a própria ordem (ele mesmo como cliente e como caixeiro na mesma transação — uma forma de wash trading). Isso não estava explicitamente escrito no PRD, mas é uma regra implícita de qualquer marketplace P2P — adicionado como guarda explícita:

- `/offers`: o botão "Aceitar" some quando `order.clientId === user.id`, mostrando "Sua ordem" no lugar.
- `OrderActions`: `canAcceptAsCashier = user.isCashier && order.clientId !== user.id`.

Testado manualmente: Beto criou uma ordem como cliente, e nem em `/offers` nem no detalhe da própria ordem aparece um jeito de ele mesmo aceitá-la — só o texto normal de espera por um caixeiro.

## Testado manualmente, em build de produção

1. Ana (só cliente) vê "Nova ordem" e suas próprias ordens marcadas "Como cliente"
2. Troca pra Beto (caixeiro) → vê as 3 ordens onde é caixeiro, badge "Como caixeiro"
3. Beto cria uma nova ordem (`/orders/new`) — vira cliente NESSA ordem
4. Em `/offers`, a ordem do próprio Beto aparece com "Sua ordem", sem botão de aceitar; as ordens de outras contas mostram "Aceitar" normalmente
5. No detalhe de uma ordem com histórico de chat prévio (seed), envio de mensagem de texto funciona, aparece com nome + `(caixeiro)` + horário
6. Edição de uma mensagem própria: nova entrada "(editada)" com o texto antigo riscado acima do novo — mensagem original preservada, não sobrescrita
