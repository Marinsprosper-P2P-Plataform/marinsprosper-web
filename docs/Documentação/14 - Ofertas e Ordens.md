---
tags: [frontend, ofertas, ordens]
---

← [[13 - Autenticação e Onboarding]] | [[Início]]

# Ofertas & Ordens — implementação (Sprint -1)

Cobre o card "Ofertas & Ordens" do [[Kanban]]: listagem de ofertas, criação de ordem, "minhas ordens", detalhe com todo o ciclo de ações, cancelamento, disputa e avaliação. Diferente das telas de [[13 - Autenticação e Onboarding]], aqui os dados fake não são só um formulário estático — existe um "backend fake" em memória que aplica a máquina de estados de verdade.

## O "backend fake" (`src/lib/mock`)

Três peças, todas client-side (Context/Provider), montadas em `(dashboard)/layout.tsx`:

- **`session.tsx`** — simula "quem está logado". Como não existe autenticação real (Sprint 4), um `RoleSwitcher` na Sidebar/MobileHeader alterna entre dois usuários fixos (Ana Cliente / Beto Caixeiro), deixando explícito que isso é uma muleta de prototipagem.
- **`orders.tsx`** — o núcleo. Um `useReducer` com uma ação por endpoint da [[05 - Especificação de API]] (`ACCEPT`, `CLIENT_TRANSFER`, `CASHIER_CONFIRM_RECEIPT`, `CASHIER_TRANSFER`, `CLIENT_CONFIRM`, `REQUEST_CANCEL`, `RESPOND_CANCEL`, `OPEN_DISPUTE`, `RATE`). Cada ação só aplica a mudança se o status atual da ordem for um dos esperados — o mesmo princípio de "nunca assumir o estado atual sem checar" da [[02 - Arquitetura Técnica]], só que sem persistência (reseta a cada recarregamento de página, F5 inclusive).
- **`pricing.ts`** — `quoteOrder(grossAmount)` simula around-trip a um backend que calcula a taxa. Nenhum componente multiplica `valor * 3%` diretamente; todos esperam essa função "responder" (com latência simulada), mantendo a fronteira arquitetural do "frontend nunca calcula regra financeira" mesmo num protótipo sem servidor de verdade.

## Máquina de estados — como as 5 ações do ciclo mapeiam pros 11 estados

A Parte 2 define 11 estados no fluxo principal, mas só 5 ações do usuário (aceitar, marcar transferência, confirmar recebimento, informar TXID, confirmar recebimento final) — cada ação avança dois estados de uma vez (o estado "explícito" da ação + o "aguardando a outra parte" seguinte), porque a API só expõe um endpoint por ação:

```
aceitar               -> AWAITING_CLIENT_TRANSFER      (pula RESERVED/ACCEPTED juntos)
marcar transferência  -> AWAITING_CASHIER_CONFIRMATION
confirmar recebimento -> AWAITING_CASHIER_TRANSFER
informar TXID         -> AWAITING_CLIENT_CONFIRMATION
confirmar final        -> COMPLETED
```

Isso está documentado aqui porque não é óbvio olhando só o diagrama da Parte 2 — quem for mexer em `orders.tsx` precisa saber que cada `case` do reducer intencionalmente pula um estado "de espera".

## Cancelamento e disputa

Cobrem qualquer estado entre `ACCEPTED` e `AWAITING_CLIENT_CONFIRMATION` (`CANCELLABLE_STATUSES`, exportado de `orders.tsx` — única fonte de verdade tanto pro reducer quanto pra UI decidir se mostra os botões).

Regra implementada exatamente como no PRD (Parte 1, seção 6, itens 7-8): **quem solicita o cancelamento não responde ao próprio pedido** (só a contraparte vê os botões aceitar/recusar), e **recusar cancelamento abre disputa automaticamente** (`RESPOND_CANCEL` com `accept: false` transiciona pra `DISPUTE_OPEN`, não de volta pro fluxo normal).

Simplificação assumida conscientemente: como ordens canceladas nunca chegam a `COMPLETED` no modelo atual, a regra "quem cancela não avalia depois" acaba sendo satisfeita de graça (o painel de avaliação só aparece em `COMPLETED`) — não precisou de lógica extra, mas vale saber que é assim que a regra está sendo cumprida, não por uma checagem explícita.

`previousMainlineStatus` (campo novo em `Order`, `src/types/order.ts`) guarda onde a ordem estava no fluxo principal antes de desviar pra cancelamento/disputa — é o que permite o `OrderTimeline` "congelar" no lugar certo em vez de zerar o progresso quando a ordem está em `DISPUTE_OPEN`, por exemplo.

## Checagem de participante (IDOR)

`OrderDetail` (`src/components/shared/order-detail.tsx`) nega acesso ao conteúdo da ordem se quem está vendo não for participante — cliente só vê as próprias ordens, caixeiro só vê as que aceitou (ou ordens `OPEN`, pra poder decidir se aceita). Implementado porque a [[04 - Documentação de Segurança]] lista exatamente esse cenário ("cliente acessa ordem de terceiro trocando ID na URL") como ameaça na tabela STRIDE — vale o protótipo já refletir isso, mesmo sem backend real aplicando a regra de verdade ainda.

## Achado durante a verificação: bug de hidratação do ambiente, não do código

Ao testar a interatividade no navegador, apareceu um erro de hidratação do React (`#418`) e um aviso "Encountered a script tag" logo na primeira carga. Investigado a fundo (isolando componente por componente, testando até a própria página 404 padrão do Next.js sem nenhum código nosso) — **reproduz até em uma página 100% do framework, sem nenhuma linha nossa**. Não é um bug desta implementação; é uma incompatibilidade do ambiente atual (Next.js 16.3.0 + Turbopack + React 19.2.8 nesta configuração de dev/build local). O React se recupera sozinho (re-renderiza no cliente), então a página funciona — só suja o console.

Efeito colateral real: automações que leem a árvore de acessibilidade e clicam imediatamente após navegar podem "errar o alvo" (o React descarta e reconstrói o DOM daquela região durante a recuperação). Esperar ~1s após navegar antes de interagir resolve para fins de teste.

De qualquer forma, isso motivou a troca de `next-themes` (biblioteca sem atualização desde março de 2025, com um problema documentado publicamente e sem solução relacionado a essa mesma classe de erro) por uma implementação própria e pequena em `src/lib/theme.tsx` — não elimina o problema do ambiente, mas remove uma dependência não mantida do projeto, o que é uma melhoria válida por si só.

## Testado manualmente, de ponta a ponta

Usando o `RoleSwitcher` pra alternar entre os dois usuários fake, em build de produção local (`npm run build && npm start`):

1. Ofertas → aceitar como caixeiro (idempotência: botão trava no primeiro clique)
2. Marcar transferência como cliente (upload simulado)
3. Confirmar recebimento do PIX como caixeiro
4. Informar TXID como caixeiro
5. Confirmar recebimento final como cliente → ordem conclui
6. Avaliar a contraparte (5 estrelas)
7. Criar uma nova ordem do zero (`/orders/new`) — cotação calculada corretamente (R$ 1.000 → taxa R$ 30 → 178,96679 USDT), confirmação cria a ordem e redireciona pro detalhe

Cancelamento e disputa foram revisados no código (mesmo padrão de idempotência do resto do reducer) mas não clicados manualmente nesta passada — ficou coberto pela revisão de código, não pelo teste no navegador.

## Abas Comprar/Vender, reputação, regras + senha e SLA de 30 min

Rodada seguinte do mesmo bucket, todas ainda Sprint -1/dados fake:

- **Abas em `/offers`** — `Tabs` do shadcn filtrando `openOrders` por `order.type`. Só duas abas (Comprar/Vender), sem "todas", igual ao pedido original — o padrão de descoberta continua sendo "aceite direto de ordem pelo caixeiro" (PRD §4), as abas só organizam a mesma listagem, não viram um book público por vendedor.
- **Reputação (`src/lib/mock/reputation.ts` + `ReputationStars`)** — a lógica que já existia inline em `/profile` (Sprint anterior) foi extraída pra `getUserReputation(orders, userId)`, reaproveitada em três lugares: `/profile`, cada card de `/offers` (reputação do cliente que abriu a ordem) e no cabeçalho do detalhe da ordem (reputação da contraparte — cliente vê a do caixeiro quando já aceitou, caixeiro vê a do cliente). Mesma limitação já registrada em [[16 - Perfil e Configurações]]: `Order.rating` não é direcionado.
- **Modal de regras + senha (`orders/new/order-rules-dialog.tsx`)** — `/orders/new` não cria mais a ordem direto no submit do formulário; abre `OrderRulesDialog` com o resumo de caução/custódia, ordem de transferência e penalidades, um checkbox de concordância e reconfirmação de senha. Só depois de marcar o checkbox e preencher a senha (validação de formato só — não existe conta real pra checar contra) é que `createOrder` roda de verdade.
- **Countdown de 30 minutos (`src/components/shared/payment-countdown.tsx`)** — `Order` ganhou `paymentDeadline?: string`, setado pela ação `ACCEPT` do reducer (`now + 30min`). `PaymentCountdown` conta regressivamente no cliente (`setInterval`, mesmo espírito de round-trip simulado de `pricing.ts`) e, ao zerar, dispara a nova ação `EXPIRE` do reducer (`AWAITING_CLIENT_TRANSFER → EXPIRED`, com `previousMainlineStatus` setado igual a cancelamento/disputa, pro `OrderTimeline` congelar certo). Renderizado dentro de `OrderActions`, visível tanto pro cliente quanto pro caixeiro enquanto aguardam o pagamento. A idempotência do reducer garante que, se o cliente já marcou transferência antes do timer zerar, o `EXPIRE` que ainda estava agendado vira no-op (status já não é mais `AWAITING_CLIENT_TRANSFER`). O cancelamento automático real por timeout continua sendo trabalho de Sprint 3 (fila BullMQ) — isto é só a UX simulada.

Testado manualmente em build de produção (`npm run build && npm start`): aba Vender mostrando só ordens de venda, aceite de uma ordem de venda como caixeiro exibindo "29:45 restantes" no detalhe, e criação de ordem nova passando pelo modal de regras (bloqueado até marcar o checkbox e preencher senha) até redirecionar pro detalhe. `npm run lint` e `npm run build` (typecheck completo) sem erros.

## Correção: caixeiro não conseguia abrir o comprovante do cliente

Achado reportado direto pelo usuário: "quem receber os comprovantes de transferências devem ter a capacidade de abri-los e vê-los". Conferindo `ClientTransferControl` (`order-actions.tsx`): o `File` escolhido no input nunca saía do componente — só `file.name` chegava em `markClientTransferred`, guardado em `Order.clientProofName`. O caixeiro via literalmente só o nome como texto (`"Comprovante anexado: comprovante-pix.pdf"`), sem link, sem imagem, sem jeito nenhum de abrir o arquivo de verdade.

Corrigido:

- `Order` ganhou `clientProofUrl` (e `clientProofMimeType`) além de `clientProofName`.
- `ClientTransferControl` agora cria `URL.createObjectURL(file)` no submit e manda os três campos pra `markClientTransferred` (`orders.tsx` — ação `CLIENT_TRANSFER` e a função do Context tiveram a assinatura ampliada do mesmo jeito).
- Novo componente compartilhado `src/components/shared/proof-link.tsx` (`ProofLink`) — um `<a target="_blank">` com nome do arquivo + indicação "Anexo privado — abrir". Usado em dois lugares: dentro de `OrderActions` (na etapa "Confirmação do caixeiro", contextual) **e** de forma persistente em `OrderDetail`, logo abaixo do cabeçalho, sempre que `order.clientProofUrl` existir — assim o comprovante continua acessível depois que a ordem sai daquele passo específico (útil pra conferir depois, inclusive numa disputa).

Mesmo princípio de `ChatAttachment.signedUrl`: `blob:` local à aba, nunca um caminho de storage público. O mesmo problema (e a mesma correção) valia também pros anexos do chat — ver [[15 - Chat e Comprovantes]].

## Correção: anti-triangulação só bloqueava no cadastro, não na transação

Achado do checklist de validação da Sprint -1: a trava de titularidade da chave PIX ([[16 - Perfil e Configurações]]) só existia no momento de cadastrar a chave em `/profile` — `/orders/new` nunca referenciava chave nenhuma, `paymentMethod` era um `z.literal("PIX")` fixo. Não dava pra mostrar "esta transação seria bloqueada" porque a transação não sabia nada sobre chaves.

Corrigido: `/orders/new` agora exige selecionar uma chave PIX já cadastrada (`createOrderSchema` ganhou `pixKeyId` obrigatório). Sem nenhuma chave cadastrada, a tela nem mostra o formulário — só um aviso com link pra `/profile`. A chave escolhida é congelada em `Order.clientPixKeySnapshot` (`{ type, key, bank }`, mesmo princípio de snapshot de `feePercent`/`quote` — a chave pode mudar ou ser apagada depois em `/profile`, a ordem preserva o que foi usado).

Reconfirmação da trava no ponto de uso: como uma chave `cpf` incompatível já não pode ser salva em `/profile`, tecnicamente nenhuma chave inválida deveria aparecer pra selecionar — mas `/orders/new` recalcula a checagem (`selectedPixKey.type === "cpf" && selectedPixKey.key !== user.document`) de novo mesmo assim, e bloqueia calcular taxa/confirmar ordem se desse caso acontecer. É defesa em profundidade, não uma segunda chance de errar — mesmo princípio de "validado no backend antes de permitir a transação" da Documentação de Segurança, replicado no ponto de uso.

A chave declarada aparece de novo em `OrderActions`, na etapa "Transferência do cliente", visível tanto pro cliente quanto pro caixeiro.

## Redesign: Ofertas unificada, "Minhas ordens" com 3 tiles, PIX do caixeiro

Ajustes vindos de uma rodada de design no Claude ("Obsidian project prototype request"), adaptados pra arquitetura real do app (React funcional + Context, não o protótipo single-class do artifact):

- **`/offers` sem abas Comprar/Vender** — a separação por `Tabs` (registrada na rodada anterior deste doc) foi removida. `offersList` agora é só `orders.filter(status === "OPEN")`, sem filtro de tipo. Cada linha ganhou `OrderTypeBadge` (`order-status-badge.tsx`) — vermelho (`--status-dispute`) pra compra, verde (`--status-completed`) pra venda — pra continuar distinguindo compra/venda visualmente sem precisar de abas. A lista de aceite virou o componente compartilhado `src/components/shared/offer-list.tsx` (`OfferList`), reaproveitado em `/offers` e na nova sub-aba "Disponível" de `/orders`.
- **`/orders` com 3 tiles no topo** — Disponível / Em execução / Finalizadas, cada um com contagem e controlando uma sub-aba (`useState`, sem rota nova). "Disponível" renderiza `OfferList` com todas as ordens `OPEN` da plataforma (não só as do usuário) inline, sem navegar pra `/offers`. "Em execução"/"Finalizadas" continuam restritas às ordens onde a conta é participante, categorizadas via `ORDER_STATUS_META[status].category` (execução = `open`/`progress`/`dispute`, finalizadas = `completed`/`cancelled`/`expired`).
- **Chave PIX do caixeiro (`Order.cashierPixKeySnapshot`)** — gap real encontrado ao adaptar o design: numa ordem de `compra`, o cliente nunca via pra qual conta transferir o PIX (só existia `clientPixKeySnapshot`, usado pra verificação de titularidade, não como destino). Agora, ao aceitar (`acceptOrder`), a primeira chave PIX cadastrada do caixeiro é congelada em `cashierPixKeySnapshot` — mesmo princípio de snapshot de `clientPixKeySnapshot`. `OrderDetail` ganhou uma seção persistente "Dados PIX para transferência": em `compra` mostra os dados do caixeiro (pra onde o cliente paga), em `venda` mostra os dados do cliente (pra onde o caixeiro paga) — com estados de fallback pra ordem ainda sem caixeiro (`OPEN`) ou contraparte sem nenhuma chave cadastrada. Seed atualizado: Beto (caixeiro) ganhou chaves PIX (antes vazio), Ana ganhou uma segunda chave, e as ordens seed com caixeiro já aceito ganharam os snapshots retroativos pra demonstração imediata.
- **Toggle Comprar/Vender colorido em `/orders/new`** — o campo "Operação" trocou de `Select` (dropdown) por dois botões lado a lado, usando as mesmas cores de `OrderTypeBadge` quando ativo.

`npm run lint` e `npx tsc --noEmit` sem erros; testado manualmente em dev (`/offers`, `/orders` com as 3 sub-abas, `/orders/new`, detalhe de uma ordem `AWAITING_CASHIER_CONFIRMATION` mostrando o bloco de PIX correto).

## Painel de reputação da contraparte, selo de risco e validação de identidade do PIX

Rodada seguinte, ainda Sprint -1/dados fake, focada em dar mais sinal de confiança antes de uma transferência acontecer.

- **`counterpartyStats()` (`src/lib/mock/reputation.ts`)** — nova função ao lado de `getUserReputation` (que continua existindo, reaproveitada por `/profile` e `/offers`). Calcula nota, ordens concluídas, taxa de conclusão (`COMPLETED` sobre o total de status "concluídos": `COMPLETED`/`CANCEL_ACCEPTED`/`CANCEL_REJECTED`/`DISPUTE_RESOLVED`/`EXPIRED`/`CLOSED`), tempo médio de resposta e status online/offline — os dois últimos são **derivados por hash determinístico do `userId`** (não existe campo de verdade pra isso no protótipo), então o mesmo usuário sempre mostra o mesmo tempo/status, sem piscar a cada render. Todo campo tem fallback ("Sem dados"/"Não informado") quando não há histórico.
- **`riskAssessment()`** — selo de risco heurístico a partir de `counterpartyStats`: "Risco baixo" (≥5 ordens concluídas e nota ≥4,5), "Risco elevado" (<3 ordens ou nota <4), "Histórico insuficiente" (zero ordens e sem nota) ou "Risco médio" (resto), cada um com uma frase de orientação exibida abaixo do painel. Renderizado em `CounterpartyReputationPanel` (`src/components/shared/counterparty-reputation-panel.tsx`) reaproveitando os tokens `--status-*` já existentes (completed=verde/progress=âmbar/dispute=vermelho/expired=neutro) — **decisão consciente de não criar paleta nova**: esses tokens já têm variante dark corrigida desde a criação do design system, então o selo já nasce com contraste correto nos dois temas sem trabalho extra.
- **Validação de identidade do PIX (`PixTransferPanel`, `src/components/shared/pix-transfer-panel.tsx`)** — `PixKey` (`pix-keys.tsx`) e os snapshots `Order.clientPixKeySnapshot`/`cashierPixKeySnapshot` (`types/order.ts`) ganharam `holderName?: string`, propagado tanto na criação da ordem (`orders/new/page.tsx`) quanto no aceite (`AcceptControl`, `order-actions.tsx`), com fallback pro nome da conta quando a chave não tem titular divergente cadastrado. `OrderDetail` agora compara `holderName` da chave com o nome cadastrado da contraparte: divergência mostra alerta vermelho pedindo confirmação pelo chat ou abertura de disputa; nomes batendo mostra confirmação discreta "✓ Titular confere". Seed de demonstração: nova chave `pix-5` (Beto Lima, CPF/CNPJ) com `holderName: "Lima Consultoria e Serviços ME"` — propositalmente divergente — usada na nova ordem `order-6` (`MP-20260801-001006`, compra, `AWAITING_CLIENT_TRANSFER`) especificamente pra exercitar o alerta sem precisar mexer manualmente em nenhuma chave existente.
- **Botões de copiar** — `CopyFieldButton` (`src/components/shared/copy-field-button.tsx`), componente genérico com feedback textual temporário ("Copiado" etc., resetado por `setTimeout`). Usado em `PixTransferPanel` pra nome do titular, chave PIX, valor (BRL) e documento (quando a chave é do tipo `cpf`), e em `order.txid` quando já existe.
- **Card "Você paga"/"Você recebe" (`DealSummaryCard`, `src/components/shared/deal-summary-card.tsx`)** — valores em destaque calculados por papel (cliente/caixeiro) e sentido da ordem (compra/venda): quem compra paga BRL e recebe USDT, quem vende é o espelho disso; o caixeiro é sempre o espelho do cliente na mesma ordem. Inclui a nota de transparência de taxa (já descontada do valor mostrado). Só aparece a partir do aceite (`status !== OPEN/DRAFT`), quando já existe um valor de fato acordado entre as partes.
- **Nota de confirmação manual** — texto fixo em `PixTransferPanel` deixando claro que a confirmação do PIX depende do caixeiro conferir manualmente, não é automática mesmo depois do cliente marcar que transferiu.
- **Modal "Já paguei — confirmar transferência" (`ClientTransferControl`, `order-actions.tsx`)** — o botão que antes marcava a transferência direto agora abre um `Dialog` com checklist (valor exato transferido, titular conferido, ciência de que informar transferência falsa pode levar a bloqueio da conta) — só habilita "Confirmar transferência" com os três itens marcados. `PaymentCountdown` teve o texto atualizado pra citar o novo rótulo do botão.
- **Aviso ao cancelar com pagamento já informado** — `CancelDialog` (`order-resolution-panel.tsx`) ganhou um `alreadyPaid` calculado a partir de uma nova lista `ALREADY_PAID_STATUSES` (de `CLIENT_MARKED_TRANSFERRED` até `AWAITING_CLIENT_CONFIRMATION`) — a partir daí, abrir o modal de cancelamento mostra um alerta vermelho antes do campo de motivo, avisando que cancelar não desfaz uma transferência que já aconteceu e que o caminho certo nesse ponto é disputa.

Testado manualmente em dev: `order-6` (Ana como cliente) mostra o alerta de divergência de titular, o painel de reputação de Beto Lima com selo de risco e o card BRL/USDT; `order-3` (mesma chave, nomes batendo) mostra "Titular confere"; `CancelDialog` em `order-3` (status `AWAITING_CASHIER_CONFIRMATION`, já com comprovante anexado) mostra o alerta de "pagamento já informado". Isolado via `git stash -u` que o erro de hidratação do console (já registrado na seção acima) é do ambiente, não desta mudança — reproduz igual em `order-1` na branch `main` sem nenhuma linha nova. `npx tsc --noEmit` e `npx eslint` (nos arquivos tocados) sem erros.

## Ofertas (`Listing`) — anúncio persistente, separado de ordem avulsa

Feature nova, pedida diretamente pelo usuário como um wizard de 9 etapas: `/offers` deixou de listar ordens `OPEN` avulsas (ver seção "Redesign" acima) e passou a listar `Listing` — um anúncio que o dono publica e mantém, com limites/termos/mensagem de boas-vindas próprios, que outras contas negociam. A antiga listagem de ordens `OPEN` continua existindo (`OfferList`), só que restrita à sub-aba "Disponível" de `/orders` — quem quer aceitar uma ordem solta, sem passar por um anúncio publicado, ainda consegue.

**Decisão de arquitetura, confirmada com o usuário antes de implementar**: não existe endpoint de ofertas no backend (só `/orders`, auth). Como os últimos commits deste repositório foram justamente sobre *remover* mock de ordens em favor da API real (ver "Concluído" no [[Kanban]], cards de criação/aceite), criar mais um mock parecia ir na direção contrária — mas como não há endpoint nenhum pra migrar, a alternativa (não construir a feature) também não servia. Resolvido assim:

- **`Listing` e `PaymentMethod` são 100% mock/local** (`src/lib/mock/listings.tsx`, `src/lib/mock/payment-methods.tsx`), mesmo padrão Context+`useReducer` idempotente de `orders.tsx`/`pix-keys.tsx` — sem persistência entre recarregamentos, sem chamada de rede nenhuma. `PaymentMethod` é separado de `PixKey` (`pix-keys.tsx`, usado no perfil) porque cobre também transferência bancária (banco/agência/conta/chave), e é um cadastro específico do wizard de ofertas.
- **Negociar uma oferta cria uma ORDEM real** (`ListingNegotiateDialog`, `src/components/shared/listing-negotiate-dialog.tsx`) — chama exatamente o mesmo `createOrderRequest` (`POST /orders`) de `orders/new/page.tsx`, só pré-preenchido a partir da oferta (cotação/quantidade). O backend não modela "ordem já combinada com contraparte fixa e taxa zero" (o que o dono da oferta cobrou já foi embutido na comissão da própria oferta, não pode ser repassado pra ordem); a ordem resultante segue as regras normais — fica aberta pra qualquer caixeiro aceitar, com a cotação/taxa reais de `quoteOrder`. A oferta funciona só como atalho de preenchimento, não como um contrato à parte.

### `ListingWizard` (`src/components/shared/listing-wizard.tsx`) — 9 etapas

Um componente só, reaproveitado pra criar (`/offers/new`) e editar (`/offers/[id]/edit`) — estado local (`useState<WizardState>`), sem `react-hook-form` (multi-step com validação por etapa ficou mais simples com estado bruto + `wizardStepValid(step, state)` checando cada etapa antes de liberar "Avançar"):

1. **Operação** — compra ou venda (dois botões, mesmo padrão de cor de `OrderTypeBadge`)
2. **Moeda + método de pagamento** — moeda fixa (`USDT`, único ativo negociado na plataforma); método de pagamento escolhido entre os já cadastrados ou cadastro inline (PIX ou transferência com banco/agência/conta/chave), salvo em `payment-methods.tsx` e auto-selecionado
3. **Cotação** — BRL por USDT, decimal; toggle "Não aceito negociação com terceiros" (`noThirdParty`, só informativo — o protótipo não tem como verificar terceiros de verdade)
4. **Limites** — quantidade total, mínimo e máximo por solicitação, validados por `listingLimitsSchema` (`src/lib/validations/listing.ts`): mínimo ≤ máximo ≤ total
5. **Termos** — texto livre
6. **Boas-vindas** — mensagem opcional, mostrada automaticamente no `ListingNegotiateDialog` de quem negociar
7. **Visibilidade** — pública (aparece na listagem) ou privada (só quem tem o link/id direto)
8. **Resumo** — moeda, mínimo/máximo em USDT e BRL, comissão da plataforma (`platformFeePercent`, padrão 0,25%) sobre `totalQuantity × quote`, segurança (terceiros), visibilidade
9. **Confirmação por senha** — demo fixa `1234` (mesmo espírito de `OrderRulesDialog`, sem conta real pra checar contra ainda), só então publica (`addListing`) ou salva (`updateListing`) e redireciona pra `/offers`

Editar reconstrói o wizard a partir do `Listing` existente (`wizardFromListing`), só permitido enquanto a oferta está `ATIVA`/`PAUSADA` — `CANCELADA`/`ENCERRADA` são terminais. Qualquer conta atual pode publicar (sem gate de papel), mesma simplificação já registrada pra ordens — `useMockSession` já dá as duas capacidades pra toda conta.

### Ações do dono (`/offers`)

Pausar/Reativar/Cancelar/Encerrar como ações do reducer de `listings.tsx`, cada uma checando o status anterior antes de escrever (mesmo princípio de idempotência de `orders.tsx`). Não-donos só veem "Negociar" em ofertas `ATIVA` e públicas (ou a própria oferta, se privada mas dona).

Testado manualmente em dev: wizard completo (9 etapas, incluindo cadastro inline de método PIX e transferência), validação bloqueando avanço com dados inválidos, resumo calculando taxa corretamente (`1000 × 5,5 × 0,25% = R$ 13,75`), senha errada rejeitada/`1234` aceita, oferta publicada aparecendo em `/offers` com as ações certas, edição pré-preenchendo o wizard a partir de uma oferta existente, diálogo de negociação abrindo com a direção certa (dono vende → quem negocia compra) e mensagem de boas-vindas visível. `npx tsc --noEmit` (projeto inteiro) e `npx eslint` (arquivos tocados) sem erros.
