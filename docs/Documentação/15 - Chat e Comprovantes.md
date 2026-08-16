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

### O que mudou (primeira rodada)

- `MockUser.role` → `MockUser.isCashier: boolean`. Toda conta pode criar ordens como cliente por padrão; `isCashier` só indica se ela TAMBÉM tem status de caixeiro aprovado (habilita aceitar ofertas).
- `RoleSwitcher` → renomeado para `AccountSwitcher` (`src/components/shared/account-switcher.tsx`) — não é mais "escolher um papel", é "escolher qual conta fake" (cada uma com suas próprias capacidades).
- Em todo componente que checava `user.role === "cliente"` / `"caixeiro"`, a checagem virou direta contra os IDs da ordem (`order.clientId === user.id`, `order.cashierId === user.id`) — o papel agora é uma propriedade de CADA ordem, não da conta em geral.
- **`/orders` (Minhas ordens)** deixou de ser uma lista exclusiva por papel — agora mostra toda ordem onde a conta é participante em qualquer capacidade, com uma badge "Como cliente" / "Como caixeiro" por linha. O botão "Nova ordem" ficou sempre visível (qualquer conta pode criar).
- **Chat**: `authorRole` da mensagem passou a ser derivado por ordem (`order.clientId === user.id ? "cliente" : "caixeiro"`) em vez de vir de um `user.role` que não existe mais. `OrderChat` agora recebe a `order` inteira, não só o `orderId`.

### Segunda rodada: sem gate nenhum — automático pra qualquer conta

Depois de revisar, o pedido foi mais direto do que a primeira rodada implementou: não deveria existir NENHUMA distinção entre contas — "quem tiver acesso ao sistema poderá ser caixeiro ou cliente, poderá vender ou comprar", sem toggle, sem uma conta fixa marcada como "a que tem status de caixeiro".

Confirmei antes de mexer se isso mudava a regra de negócio documentada (PRD/Arquitetura, que exige caução registrada e aprovação pra virar caixeiro de verdade) — a resposta foi que **não**: a documentação continua valendo como está, essa mudança é só uma simplificação do protótipo (Sprint -1). O fluxo `/cashier-apply` já construído continua existindo e vai importar de verdade a partir do Sprint 2, quando houver backend checando caução real.

O que mudou:

- `MockUser.isCashier: boolean` foi removido inteiramente. `cashierAvailableLimit` deixou de ser opcional — toda conta tem um valor (Ana Ferreira: R$ 3.000, Beto Lima: R$ 5.000, só pra manter alguma variação entre as duas).
- Renomeei as contas fake pra nomes neutros (**Ana Ferreira**, **Beto Lima**) — os nomes antigos ("Ana Cliente", "Beto Caixeiro") sugeriam um papel fixo que não existe mais.
- Removida toda checagem `user.isCashier` — `/offers`, `OrderActions` e a checagem de participante em `OrderDetail` não gateiam mais por isso. A única condição que resta pra mostrar o botão "Aceitar" é não ser a própria ordem (`order.clientId !== user.id`).
- O alerta em `/offers` que dizia "sua conta ainda não tem status de caixeiro, solicite em Virar caixeiro" foi removido — não existe mais essa situação no protótipo.

### Prevenção de autonegociação (continua valendo)

Independente de qualquer conta poder ser as duas coisas, ninguém pode aceitar a própria ordem — isso não estava explicitamente escrito no PRD, mas é uma regra implícita de qualquer marketplace P2P (uma forma de wash trading). `/offers` esconde o botão "Aceitar" e mostra "Sua ordem" quando `order.clientId === user.id`; o mesmo vale em `OrderActions`.

## Testado manualmente, em build de produção

1. Ana Ferreira (conta padrão ao entrar) já vê "Limite disponível: R$ 3.000,00" e o botão "Aceitar" na oferta de outra pessoa, sem precisar de nenhuma ação prévia
2. A própria ordem de Ana aparece marcada "Sua ordem" em `/offers`, sem botão de aceitar
3. Troca pra Beto Lima → vê as ordens onde é caixeiro, mais o botão "Nova ordem" também disponível
4. Beto cria uma ordem nova (`/orders/new`) — vira cliente NESSA ordem específica; nem em `/offers` nem no próprio detalhe aparece um jeito de ele mesmo aceitá-la
5. No detalhe de uma ordem com histórico de chat prévio (seed), envio de mensagem de texto funciona, aparece com nome + `(caixeiro)` + horário
6. Edição de uma mensagem própria: nova entrada "(editada)" com o texto antigo riscado acima do novo — mensagem original preservada, não sobrescrita

## Correção: anexo tinha que dar pra abrir, não só ver o nome

Feedback direto: "quem receber os comprovantes de transferências devem ter a capacidade de abri-los e vê-los". Duas falhas reais encontradas:

1. **`AttachmentPreview` não era clicável.** A miniatura de imagem aparecia, mas não tinha `<a>`/`onClick` nenhum — não dava pra abrir a imagem em tamanho real nem o PDF em lugar nenhum.
2. **PDFs recebiam uma URL fake.** `buildFakeAttachment` só gerava um `blob:` de verdade pra imagens; PDFs ganhavam um caminho `https://storage.marinsprosper.example/...` que nunca existiu — clicar (se desse pra clicar) resultaria em erro de DNS/404.

Corrigido: `AttachmentPreview` agora é um `<a target="_blank" rel="noopener noreferrer">` inteiro (miniatura + texto), e `buildFakeAttachment` sempre usa `URL.createObjectURL(file)`, imagem ou PDF — o navegador abre os dois nativamente numa aba nova. A mensagem seedada de exemplo (`msg-2`, `att-1`, o "comprovante-pix" da Ana pro Beto em `order-3`) também foi corrigida: trocada de uma URL fake não-funcional pra um `data:` URI de imagem real, porque não existe um `File` de verdade por trás de um seed estático pra gerar um `blob:` — mas o objetivo (mostrar um comprovante que de fato abre) precisa valer aqui também, não só nos anexos enviados ao vivo pela UI.

O mesmo problema existia, ainda mais grave, no passo dedicado de comprovante da ordem (fora do chat) — ver [[14 - Ofertas e Ordens]].

## Chat real (Sprint 4)

`GET`/`POST /orders/:id/messages` reais substituem `src/lib/mock/chat.tsx` (deletado — sem importador restante) + entrega em tempo real por Socket.IO (`namespace: /chat`, sala `order:<id>`) via `socket.io-client` novo (`src/lib/chat/socket.ts`). Esse era o único bucket do Sprint 4 sem nenhum backend pra revisão anterior de "ambiente de teste desatualizado" (ver [[14 - Ofertas e Ordens]]) — `/orders/{id}/messages` já aparece no Swagger ao vivo.

### O que mudou em relação ao protótipo mock

- **Sem edição** — mensagem é imutável no backend real (era o oposto do protótipo, que simulava "editar" criando uma versão `supersedes`). Corrigir é mandar outra mensagem.
- **Sem indicador de "digitando"** — o gateway real só tem `entrar`/`sair`; não existe evento de digitação. Removido.
- **Sem nome de autor** — mesma limitação de nome de contraparte do resto da API real (sem perfil público). Mensagens rotuladas por papel + id curto (`Cliente 8F3A21`, `Caixeiro 21C0F3`, `Mediador ...`, `Sistema` pras mensagens que a própria máquina de estados da ordem gera).
- **Anexo por dois caminhos** — `multipart` direto (`file` no `FormData`) ou `uploadId` de um upload já confirmado via `POST /uploads` (`src/lib/uploads/`, mesma infra usada por KYC e evidência de disputa). `OrderChat` usa multipart direto, mais simples pro caso comum.

### Tempo real: mensagem própria e mensagem de sistema tratadas diferente

`chat.enviar()` (envio de usuário) publica no Redis (`publicarMensagem`) e todo mundo na sala recebe o evento `mensagem`, **inclusive quem enviou** — por isso `OrderChat` deduplica por `id` ao inserir (a mensagem já foi adicionada localmente pela resposta do `POST`, e o eco do socket seria uma segunda cópia sem a checagem). Já a mensagem de sistema (`registrarEvento`, criada dentro de cada transição de estado da ordem) **não** passa por `publicarMensagem` — só o evento `status` é publicado separadamente. `OrderChat` escuta `status` e recarrega o histórico (`GET` de novo) quando ele chega, porque é o único jeito de pegar essa linha nova sem esperar o usuário recarregar a página.

### Testado

`npx tsc --noEmit`, `npx eslint src` e `npx next build` sem erros. Verificação funcional completa (enviar/receber em tempo real entre duas contas, anexo) ficou pendente — o CORS do ambiente de teste passou a liberar só o domínio de produção da Vercel durante esta rodada (não mais `http://localhost:3000`), então o dev local parou de conseguir chamar a API real pra testar; registrado como pendência no [[Kanban]].
