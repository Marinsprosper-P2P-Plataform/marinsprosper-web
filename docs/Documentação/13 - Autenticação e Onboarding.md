---
tags: [frontend, autenticação, onboarding]
---

← [[12 - Deploy (Vercel)]] | [[Início]]

# Autenticação & Onboarding — implementação (Sprint -1)

Telas do grupo `(auth)` com dados fake, construídas sobre o [[10 - Design System]]. Cobre o card "Autenticação & Onboarding" do [[Kanban]].

## Rotas

| Rota | Arquivo | Corresponde a |
|---|---|---|
| `/login` | `(auth)/login/page.tsx` | `POST /auth/login` |
| `/mfa` | `(auth)/mfa/page.tsx` | `POST /auth/mfa/verify` |
| `/register` | `(auth)/register/page.tsx` | `POST /auth/register` |
| `/verify-email` | `(auth)/verify-email/page.tsx` | `POST /auth/verify-email` |
| `/verify-phone` | `(auth)/verify-phone/page.tsx` | `POST /auth/verify-phone` |
| `/kyc` | `(auth)/kyc/page.tsx` | `POST /kyc/documents` |
| `/kyc/status` | `(auth)/kyc/status/page.tsx` | `GET /kyc/status` |
| `/cashier-apply` | `(auth)/cashier-apply/page.tsx` | `POST /cashier/apply` |
| `/blocked` | `(auth)/blocked/page.tsx` | — (sem endpoint próprio) |

Ver [[05 - Especificação de API]] pro contrato completo de cada endpoint.

## Decisões de implementação

**Formulários sem o componente `Form` do shadcn.** Tentei instalar via `npx shadcn add form`, mas esse registro específico não trouxe o componente (possivelmente não existe nessa base/versão configurada). Em vez de forçar, os formulários usam `react-hook-form` + `zod` diretamente — `useForm` + `register`/`Controller`, erros renderizados manualmente abaixo de cada campo. Funciona igual, só sem a camada de conveniência do shadcn.

**Schemas centralizados** em `src/lib/validations/auth.ts` — um schema por formulário (`loginSchema`, `mfaSchema`, `registerSchema`, `cashierApplySchema`). Validação aqui é só de UI (formato de e-mail, tamanho de senha etc.); a validação que decide de verdade continua no backend, conforme o princípio da Parte 1.

**`AuthCard`** (`src/components/shared/auth-card.tsx`) — wrapper visual comum a todas essas telas (título, descrição, conteúdo, rodapé). Evita repetir a mesma estrutura de card em cada página.

### Login → MFA

O card de login pedia "placeholder para MFA de caixeiro/admin". Como ainda não existe papel de usuário real (sem backend), simulei com um checkbox explícito **"Estou entrando como caixeiro ou administrador"** — marcado, o submit leva pra `/mfa`; desmarcado, vai direto pra `/offers`. Isso demonstra os dois caminhos sem fingir uma autenticação que não existe. Quando o Sprint 4 conectar a API de verdade, essa branch sai e o backend decide se MFA é necessário.

### KYC — preview de estados via query string

`/kyc/status` sem backend só teria um estado possível (o que acabou de ser enviado = pendente). Pra dar pra Julia/Rene revisar os três estados visuais (pendente/aprovado/rejeitado) sem esperar o Sprint 4, a página aceita `?status=aprovado` ou `?status=rejeitado&motivo=...`. Documentando aqui pra não vir como surpresa depois — isso é especificamente uma muleta de prototipagem, não algo que deveria sobreviver à integração real.

### Cadastro: `@username`, país/cidade e verificação dupla

`/register` ganhou três coisas novas, todas cobrindo o bucket "Autenticação & Onboarding" do [[Kanban]]:

- **`@username`** — campo com prefixo `@` fixo visualmente, validado por formato (minúsculas, números, `_`, 3-20 caracteres) via `usernameSchema` em `src/lib/validations/auth.ts`. Unicidade é checada à parte, num round-trip simulado (`checkUsernameAvailability`, `src/lib/mock/username.ts`, mesmo padrão de `quoteOrder`), disparado no `onBlur` do campo — mostra "Verificando disponibilidade…", depois "Disponível" ou "já está em uso". O submit é bloqueado se a última checagem não deu "disponível". Lista de usernames reservados (`RESERVED_USERNAMES`) inclui os das contas fake de `session.tsx`, só pra ter um caminho de erro pra testar. Imutável depois de criado — não existe tela de edição de username neste bucket (fica pra quando existir Perfil & Configurações).
- **País e cidade** — país agora é `Select` (`COUNTRIES` em `validations/auth.ts`, os 4 mercados já citados no produto: Brasil, Paraguai, Argentina, Estados Unidos) e cidade é texto livre. Antes nenhum dos dois era pedido na tela, embora o modelo de dados já prevendo país (Parte 3).
- **Verificação dupla por OTP** — depois do submit de `/register`, em vez de ir direto pro KYC/cashier-apply, o fluxo passa por `/verify-email` e depois `/verify-phone` (código de 6 dígitos cada, componente `OtpForm` reaproveitado entre as duas telas). E-mail e telefone digitados no cadastro trafegam via query string entre as etapas — mesma muleta de prototipagem do `/kyc/status`, sem sessão real ainda. Nenhuma das duas telas simula "código certo": como em `/mfa`, qualquer código no formato certo passa — validar de verdade é responsabilidade do backend (Sprint 4). Ao final de `/verify-phone`, o branch cliente/caixeiro que antes vivia em `/register` foi movido pra lá (decide entre `/kyc` e `/cashier-apply`).

### Sessão expirada — só o hook, ainda sem uso

`src/lib/session.ts` exporta `notifySessionExpired()` (toast + retorna a rota de login). Não está conectado a nada ainda porque não existe cliente HTTP real (isso é Sprint 4, `src/lib/api`). Deixei pronto como o ponto único que o interceptor de 401 vai chamar depois — assim nenhuma tela individual precisa saber tratar sessão expirada por conta própria.

### Tela de bloqueado

Segue a regra da [[04 - Documentação de Segurança]]: **não** expõe o motivo interno do bloqueio (score de risco, sinalização de fraude etc.) — só orienta a procurar o suporte.

## Página raiz

`src/app/page.tsx` deixou de ser o template padrão do `create-next-app` (que ainda estava lá, com links pro site do Next.js/Vercel) e agora só faz `redirect("/login")`. Isso resolve o problema relatado no deploy do Vercel — a URL raiz não tinha nenhum link pro produto de verdade.

## Pendências conhecidas

- Nenhuma dessas telas está conectada a uma API real — tudo fake, com `setTimeout` simulando latência.
- O checkbox de "entrar como caixeiro/admin" no login é uma muleta temporária, não o modelo final de autenticação.
- Falta decidir o provedor de Auth (ver [[01 - PRD]], seção 7) antes de integrar de verdade no Sprint 4.

**Nota (Sprint 4)**: login/registro/refresh/logout e o desafio de MFA no login (`/mfa`, `POST /auth/mfa/verify`/`recovery`) já foram migrados pra API real numa rodada anterior — este documento descreve o estado original do protótipo (Sprint -1), não foi reescrito quando isso mudou. Ver "Concluído" no [[Kanban]] ("Autenticação real"). KYC e o enrollment de MFA (`/auth/mfa/setup`/`activate`/`DELETE`) foram migrados na rodada abaixo.

## KYC — API real (Sprint 4)

`/kyc` e `/kyc/status` trocaram o preview por query string (`?status=aprovado`) por dados reais: `POST /kyc` (abre/retoma o caso, idempotente), `POST /kyc/documents` e `POST /kyc/submit`. Upload em duas fases (`src/lib/uploads/`, compartilhado com evidência de disputa e chat): `POST /uploads` pede uma URL assinada de escrita, o arquivo vai direto pro bucket via `PUT`, e só o `uploadId` é informado no endpoint que usa o arquivo — os bytes nunca passam pela nossa API. `ID_FRONT` mapeia o antigo campo genérico "documento" do protótipo (o backend também aceita `ID_BACK`/`PROOF_OF_ADDRESS`, mas só `ID_FRONT`+`SELFIE` são obrigatórios pra submeter).

**Não testável contra o ambiente de teste ainda**: nem `/kyc`, `/kyc/me`, `/kyc/documents`, `/kyc/submit`, nem `/uploads` aparecem no Swagger ao vivo (`/docs-json`) de `https://api.163-176-220-125.sslip.io` — mesmo gap de infraestrutura já registrado pra `ratings`/`disputes` ([[14 - Ofertas e Ordens]]): implementado certo contra o código-fonte do `marinsprosper-api` (branch `main`), mas o servidor de teste ainda roda uma versão mais antiga. Ver [[Kanban]].

## Enrollment de MFA — API real (Sprint 4)

Sem tela no protótipo mock — implementado direto contra a API real em `/profile` (`MfaSettings`, `src/components/shared/mfa-settings.tsx`), distinto do desafio de login que já existia. `GET /auth/mfa` (status), `POST /auth/mfa/setup` (gera o segredo — nasce inativo), `POST /auth/mfa/activate` (confirma com um TOTP de 6 dígitos, devolve os códigos de recuperação **uma única vez**) e `DELETE /auth/mfa` (exige um código válido — TOTP ou recuperação — pra desativar).

Sem QR code renderizado: o projeto não tem nenhuma lib de geração de QR ainda, e gerar um client-side só pra isso seria uma dependência nova pra uma tela só. Mostra a chave (`secret`, base32) como texto pra digitar manualmente no app autenticador — funcionalmente completo, só menos cômodo que escanear. Se cadastro fica pendente (setup feito, não confirmado) e a página recarrega, o segredo não pode ser reexibido (mesma regra do backend) — a UI oferece só "gerar novo código", que decorre um `setup` novo.

Mesmo gap de ambiente de teste do KYC acima: `/auth/mfa` (GET/POST/DELETE de enrollment) não aparece no Swagger ao vivo, só `/auth/mfa/verify` (desafio de login, já existia). Não testável contra o ambiente de teste ainda.
