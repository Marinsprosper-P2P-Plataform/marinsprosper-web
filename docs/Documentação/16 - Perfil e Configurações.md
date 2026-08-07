---
tags: [frontend, perfil, pix]
---

← [[15 - Chat e Comprovantes]] | [[Início]]

# Perfil & Configurações — implementação (Sprint -1)

Cobre o card "Perfil & Configurações" do [[Kanban]]: página de identidade da conta (`@username`, país, cidade, reputação) e cadastro/listagem de chaves PIX. Dados fake, sem backend — mesmo espírito do resto do Sprint -1.

## Rota

| Rota | Arquivo | Corresponde a |
|---|---|---|
| `/profile` | `(dashboard)/profile/page.tsx` | `GET /users/me` + `GET/POST/DELETE /users/me/payment-methods` |

Adicionada ao `DASHBOARD_NAV_ITEMS` (`src/components/layout/nav-items.ts`), entre Carteira e Admin — aparece tanto na Sidebar quanto na BottomNav.

## `MockUser` ganhou identidade

`src/lib/mock/session.tsx` — `MockUser` tinha só `id`, `name` e `cashierAvailableLimit`. Agora inclui:

- `username` — o `@username` definido no cadastro (ver [[13 - Autenticação e Onboarding]]). Sem tela de edição em lugar nenhum, de propósito: é imutável.
- `document` — CPF/CNPJ fake "do KYC" da conta. Único propósito: dar à Página de Perfil algo pra comparar na trava de titularidade das chaves PIX tipo `cpf`.
- `country` / `city`.

Ana Ferreira e Beto Lima (as duas contas fake) ganharam esses campos preenchidos — `@anaferreira` / `@betolima`, mesmos usernames já reservados em `RESERVED_USERNAMES` (`src/lib/mock/username.ts`), pra manter as duas fontes consistentes.

## Reputação — de onde vem o número

Não existe um campo de "nota média" persistido em lugar nenhum — a Página de Perfil calcula na hora, olhando `orders` (`useMockOrders`) e filtrando por `status === "COMPLETED"` e `order.rating` definido, onde a conta é `clientId` OU `cashierId`. A média das notas encontradas vira a reputação exibida.

Limitação conhecida, herdada do modelo de `Order.rating` (ver [[14 - Ofertas e Ordens]]): o campo é único por ordem, não direcionado ("cliente avaliou o caixeiro" vs. "caixeiro avaliou o cliente") — então tecnicamente a reputação aqui mistura os dois sentidos. Aceitável pro protótipo; um modelo de dados real precisaria de uma nota por direção (ver `order_ratings` em [[03 - Modelo de Dados]] se existir granularidade assim, ou registrar como pendência pro Sprint 1).

## Chaves PIX (`src/lib/mock/pix-keys.tsx`)

Mesmo padrão de "backend fake" de `orders.tsx`/`chat.tsx`: um Context com reducer (`ADD`/`REMOVE`), montado em `(dashboard)/layout.tsx` como `MockPixKeysProvider`, sem persistência entre recarregamentos. Seed: uma chave CPF pra Ana Ferreira, nenhuma pra Beto Lima (testado manualmente — trocar de conta no `AccountSwitcher` filtra a lista corretamente por `userId`).

Campos: `type` (`cpf` agrupando CPF/CNPJ, `email`, `telefone`, `aleatoria` — os 4 tipos pedidos), `key`, `bank` (instituição), `description` (opcional).

### Trava de titularidade — o que dá pra validar só no frontend

[[04 - Documentação de Segurança]] já especifica a regra dura: a chave PIX tem que pertencer ao mesmo CPF/CNPJ do KYC do titular, validado no **backend**, bloqueando (não sinalizando) divergência — isso é Sprint 2, não existe ainda.

No protótipo, a única coisa que o frontend pode honestamente verificar sozinho é o caso `type === "cpf"`: a chave em si É o documento, então dá pra comparar caractere a caractere com `user.document` e mostrar erro imediato ("Precisa ser o mesmo CPF/CNPJ do seu cadastro — trava anti-triangulação"), testado manualmente com um CPF divergente. Pros outros três tipos (`email`, `telefone`, `aleatoria`), o frontend não tem como saber a quem a chave pertence de verdade — a tela só avisa que a validação de titularidade acontece no backend antes da chave poder ser usada numa ordem. Isso não é uma simplificação escondida: é o limite real do que uma checagem client-side consegue fazer sem consultar um provedor PIX de verdade.

Formato da chave (`src/lib/validations/pix.ts`, `pixKeySchema` com `superRefine` por tipo) é validado à parte da titularidade — CPF/CNPJ por contagem de dígitos, e-mail via `z.email()`, telefone por tamanho mínimo, aleatória por tamanho mínimo (aproximação de UUID). Validação de formato, não de posse.

## Testado manualmente, em build de produção

1. `/profile` como Ana Ferreira — mostra `@anaferreira`, São Paulo/Brasil, "Ainda sem avaliações" (nenhuma ordem completa com rating no seed), e a chave PIX CPF seedada
2. Cadastrar nova chave com CPF diferente do `user.document` → erro de trava de titularidade, botão de submit desabilitado
3. Corrigir pro CPF certo → erro some, chave é criada e aparece na lista
4. Trocar pra Beto Lima via `AccountSwitcher` → perfil atualiza pra `@betolima`/Curitiba, lista de chaves PIX vazia (a chave da Ana não vaza pra cá)
