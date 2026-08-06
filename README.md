Documentação inicial — plataforma P2P (Marinsprosper)

Versão: inicial, deliberadamente enxuta — feita para crescer com o tempo, não para ser reescrita.

Pacote de documentação técnica inicial, estruturado a partir da lista de entregáveis do documento-base (seção 38 — "Entregáveis exigidos da equipe"). Cobre o que já pode ser definido nesta etapa (produto, arquitetura, modelo de dados, segurança, API, testes, resposta a incidentes) e mapeia o que depende de decisões ou trabalho ainda não realizado.

## Sumário

- Status frente aos 20 entregáveis do documento-base
- O que anda rápido e o que não anda
- Como usar
- Parte 1 — PRD
- Parte 2 — Arquitetura técnica
- Parte 3 — Modelo de dados
- Parte 4 — Documentação de segurança
- Parte 5 — Especificação de API (contrato inicial)
- Parte 6 — Estratégia de testes (nível básico)
- Parte 7 — Plano de resposta a incidentes
- Parte 8 — Roadmap de documentação futura
- Parte 9 — Roadmap de sprints e estrutura de repositório

## Status frente aos 20 entregáveis do documento-base

| Entregável | Status |
|---|---|
| PRD aprovado | Rascunho pronto para revisão — Parte 1 |
| Arquitetura | Rascunho pronto para revisão — Parte 2 |
| Modelo de dados | Rascunho pronto para revisão — Parte 3 |
| Diagramas | Incluídos como diagramas em texto dentro das partes acima |
| Design system | Depende da Fase 1 (protótipo navegável) |
| Protótipo | Fase 1 |
| Código frontend | Fase 1/2 |
| Código backend | Fase 2 |
| Migrações | Fase 2, geradas a partir da Parte 3 |
| Documentação da API | Contrato inicial definido — Parte 5; request/response completos evoluem com a implementação |
| Documentação de segurança | Rascunho pronto para revisão — Parte 4 |
| Documentação de deploy | Infraestrutura de referência definida — Parte 2, seção 3; guia passo-a-passo entra no Sprint 5 |
| Testes | Estratégia inicial definida — Parte 6; casos de teste completos entram com o código (Sprint 5, ver Parte 9) |
| CI/CD | Sprint 0 (setup) e Sprint 5 (hardening) — Parte 9 |
| Ambientes | Sprint 0 — Docker Compose local definido (Parte 9) |
| Backup | Fase 2/3 |
| Monitoramento | Fase 3 |
| Manual administrativo | Fase 3, quando o painel admin existir |
| Manual de suporte | Fase 3 |
| Plano de resposta a incidentes | Rascunho pronto para revisão — Parte 7 |

## O que anda rápido e o que não anda

Dado que o ritmo importa aqui, vale deixar explícito o que pode ser preenchido/ajustado rapidamente e o que não deve ser comprimido, porque errar nesses pontos custa muito mais para corrigir depois do que custa para fazer certo agora:

**Pode ir rápido e básico, refinando depois:** telas, textos, fluxo de UI, protótipo navegável, contrato de API (Parte 5), estrutura exata de taxa, provedor de KYC.

**Não deve ser comprimido, mesmo sob prazo curto:** ledger de dupla entrada, aceite de ordem atômico, idempotência em endpoint financeiro, separação de chaves (nenhuma credencial única move fundos), logs de auditoria imutáveis.

Esses cinco itens estão detalhados na Parte 4 e são a base técnica de qualquer conversa futura sobre auditoria — construir errado aqui não é algo que um sprint de correção resolve depois, é reescrita.

## Como usar

Este documento é a base de decisão antes de escrever código de produção. Antes de avançar para a Fase 2 (backend funcional), vale revisar com o Rene principalmente:

- Seções 4 e 7 da Parte 1 (decisões adotadas e decisões em aberto)
- Seção 2 da Parte 2 (fronteira domínio/custódia)
- A Parte 4 inteira — é a base para a conversa de auditoria com o cliente

Nada aqui está fechado. É um documento vivo, para editar e crescer — não para ser aceito como está.

## Parte 1 — PRD

### 1. Resumo executivo

A Marinsprosper é uma plataforma P2P para compra e venda de USDT (TRC20 no MVP) sem intermediação bancária direta — o valor em moeda fiduciária é sempre transferido diretamente entre as contas pessoais das partes (ex. via PIX), e a plataforma custodia apenas o ativo digital durante a transação.

O projeto nasceu de duas fontes que precisam ser lidas como uma coisa só:

- Um levantamento comparativo de três plataformas de referência (STM, Eldorado, AirTM), que mapeou modelos de descoberta de contraparte, precificação e custódia já validados no mercado.
- Um documento-base mais completo (Marinsprosper), que define um modelo próprio: contraparte com caução (não um vendedor comum), regra de "cliente transfere primeiro", máquina de estados detalhada, ledger de dupla entrada e um conjunto extenso de controles de segurança e auditoria.

Este PRD adota o documento-base como especificação vigente e trata o levantamento comparativo como pesquisa de mercado que embasou as escolhas de design.

### 2. Papéis

**Cliente** — compra ou vende USDT usando PIX ou outro método local. Transfere sua parte primeiro, acompanha a ordem, envia comprovante, conversa com o caixeiro, pode cancelar ou abrir disputa, avalia o caixeiro ao final.

**Caixeiro** — parceiro operacional que mantém uma caução como garantia. Recebe acesso a ordens compatíveis com seu limite disponível, aceita, confirma recebimento, envia a contraparte do valor, informa TXID quando aplicável, participa de disputas, avalia o cliente.

**Administrador** — aprova cadastros, gerencia risco, media disputas, controla parâmetros de taxa e caução, administra blacklist, acessa logs e relatórios. Ações críticas exigem MFA, justificativa e trilha de auditoria.

**Mediador** — papel separado do admin, mesmo que operado pela mesma pessoa no início. Acesso restrito apenas às ordens em disputa atribuídas a ele.

### 3. Princípios fundamentais

Herdados do documento-base e adotados sem alteração:

- Segurança acima de velocidade — nenhuma funcionalidade é implementada sacrificando autenticação, controle de acesso, integridade de dados ou auditabilidade.
- Toda regra financeira existe no backend. O frontend solicita; o servidor valida e executa.
- Nenhum saldo é alterado diretamente por tela administrativa comum — toda movimentação passa por função transacional com log imutável.
- Toda ordem tem uma máquina de estados; transições fora do fluxo autorizado não são permitidas.

### 4. Decisões de modelo já adotadas

Para eliminar a ambiguidade entre os dois documentos de origem:

| Ponto | Decisão adotada | Origem |
|---|---|---|
| Papel da contraparte | Caixeiro com caução (não vendedor comum com saldo próprio travado) | Documento-base |
| Ordem de transferência | Cliente transfere primeiro | Documento-base |
| Ativo do MVP | USDT TRC20 | Documento-base |
| Fluxo de descoberta | Aceite direto de ordem pelo caixeiro (não book público nem auto-match) | Documento-base |
| Estrutura de taxa | 3% total, configurável (2,5% caixeiro / 0,5% plataforma como referência inicial) | Documento-base |

Multi-asset (USDC, USD) e outros modelos de descoberta (book público, auto-match) ficam como evolução possível, não como requisito do MVP.

### 5. Escopo por fase

| Fase | Entrega | Observação |
|---|---|---|
| Fase 0 | Decisões de produto fechadas | Em andamento — este documento faz parte dela |
| Fase 1 | Protótipo navegável, dados simulados | Sem backend real |
| Fase 2 | Backend funcional, sem dinheiro real | Estado atual do projeto (sandbox) |
| Fase 3 | Beta fechado, caução e KYC reais, limites baixos | Depende de definição de custódia final e de jurisdição (externa a esta equipe) |
| Fase 4 | Produção | Compliance, antifraude, alta disponibilidade |

Estimativa ajustada: 3 a 4 semanas para o MVP completo (protótipo + backend), com uma regra de ordem que não deve ser invertida: o protótipo navegável (Fase 1) é construído e validado antes de qualquer código de backend. Isso permite testar as 11 transições da máquina de estados e a UX do chat com a equipe sem custo de reescrita. O detalhamento sprint a sprint está na Parte 9.

### 6. Critérios de aceite do MVP (Fase 2 → Fase 3)

O MVP é considerado pronto para virar beta quando:

1. Cliente e caixeiro conseguem se cadastrar e ser aprovados pelo admin.
2. Caixeiro possui caução registrada e limite calculado corretamente.
3. Cliente cria ordem; caixeiro só consegue aceitar se tiver limite disponível.
4. Dois caixeiros não conseguem aceitar a mesma ordem (aceite atômico).
5. Requisição repetida não duplica pagamento, saldo ou reserva de caução (idempotência).
6. Chat, comprovantes e TXID ficam registrados e vinculados à ordem.
7. Cancelamento exige concordância da contraparte; parte que solicitou não avalia a outra.
8. Recusa de cancelamento abre disputa; admin visualiza o caso completo e resolve.
9. Toda ação relevante aparece em log de auditoria imutável.
10. Usuário bloqueado não consegue operar.
11. Taxas são sempre calculadas e aplicadas pelo backend, nunca pelo frontend.
12. Anexos ficam privados; permissões impedem acesso a ordens de terceiros.

### 7. Decisões em aberto

Fora do escopo desta equipe, mas que bloqueiam a arquitetura de custódia final:

- Jurisdição de operação e enquadramento regulatório — tratado externamente. A camada de custódia (ver Parte 2) foi desenhada para não depender dessa resposta até que ela exista, mas produção com dinheiro real não deve começar sem ela.

Dentro do escopo técnico, a decidir com o Rene:

- Custódia final: saldo centralizado (Postgres, controlado pela entidade operadora) vs. contrato inteligente com multisig. Ver Parte 4 para os trade-offs de cada opção.
- Provedor de KYC a contratar em produção (idwall, Unico, Serpro, CAF são candidatos já mapeados).
- Política de retirada de caução (prazo de segurança, autenticação reforçada).
- Estrutura definitiva de taxa por método/país, se o produto expandir além do MVP inicial.
- Provedor exato de nuvem: AWS ECS Fargate vs. GCP Cloud Run vs. Render (backend); AWS RDS vs. Supabase vs. Neon (banco); AWS ElastiCache vs. Upstash (Redis). Ver Parte 2, seção 3 — a arquitetura já está definida, falta só o provedor específico.
- Validação de comprovantes via OCR/IA (pré-análise automatizada para detectar adulteração antes do mediador humano) — ideia nova, ainda não especificada. Ver nota na Parte 4, seção 8.

### 8. Fora de escopo nesta fase

- Aplicativo mobile nativo (Next.js web primeiro).
- Multi-moeda fiduciária e multi-rede blockchain.
- Book de ofertas público ou auto-matching (modelos Eldorado/AirTM ficam como research, não como requisito).
- Documentos legais (Termos de Uso, Política de Privacidade etc.) — tratados fora desta equipe.

### 9. Propriedade intelectual e repositório

- Repositório GitHub: privado.
- Licença: nenhuma licença selecionada — isso aplica copyright proprietário por padrão (all rights reserved), o que já impede legalmente cópia, modificação ou comercialização do código por terceiros sem autorização. Não depende de decisão jurídica adicional para valer.

Ponto a revisitar quando houver mais colaboradores externos ou investidores: ausência de licença explícita também dificulta qualquer cessão de direitos futura — se isso vier a ser necessário, formalizar via contrato entre os sócios, não via licença de código aberto.

## Parte 2 — Arquitetura técnica

### 1. Visão em camadas

```
Apresentação — Next.js (TypeScript)
web primeiro; mobile (Flutter/React Native) depois
----------------------------------------------------
API — NestJS (TypeScript)
Auth · Orders · Chat · Disputes · Admin
----------------------------------------------------
Domínio (puro, testável, sem I/O direto)
  - Máquina de estados da ordem
  - Motor de taxas (com snapshot)
  - Ledger de dupla entrada / caução
  - Motor de risco (scoring)
----------------------------------------------------
Custódia — camada plugável
  Opção A: saldo em Postgres (centralizado)
  Opção B: smart contract (multisig on-chain)
----------------------------------------------------
Infraestrutura
  Postgres · Redis/BullMQ · S3 · WebSocket
```

### 2. Princípio de fronteira: domínio não depende de custódia

Esta é a decisão arquitetural mais importante do projeto. A máquina de estados, o motor de taxas e o ledger não devem ter nenhum conhecimento de como o ativo é fisicamente guardado — eles só enxergam a interface de custódia (lock, release, refund), sem saber se por trás existe uma linha de banco de dados ou um contrato on-chain.

Por quê isso importa: a decisão entre custódia centralizada e smart contract está travada numa definição externa a esta equipe (jurisdição/regulatório). Se essa fronteira não for respeitada desde o início — por exemplo, se a lógica de aceite de ordem chamar diretamente uma função de banco de dados em vez de passar pela interface de custódia — trocar de modelo depois de meses de desenvolvimento significa reescrever a aplicação inteira, não só uma camada.

Interface mínima que qualquer implementação de custódia precisa cumprir:

```
lock(order_id, wallet_id, amount)      -> reservation_id
release(reservation_id, destination)   -> tx_reference
refund(reservation_id)                 -> tx_reference
get_balance(wallet_id)                 -> { available, reserved }
```

### 3. Stack recomendada

| Camada | Escolha | Observação |
|---|---|---|
| Borda / WAF | Cloudflare | DNS, SSL/TLS e mitigação de DDoS — obrigatório, não opcional |
| Frontend web | Next.js + TypeScript, App Router, Tailwind + shadcn/ui | CDN global (Vercel ou Cloudflare Pages), CI/CD integrado |
| App mobile | Flutter ou React Native | Fase futura; lógica crítica continua no backend |
| Backend | NestJS + TypeScript, em containers | AWS ECS Fargate / GCP Cloud Run / Render — mínimo 2 instâncias atrás de load balancer (HA) |
| Banco | PostgreSQL gerenciado | AWS RDS / Supabase / Neon, com PgBouncer ou RDS Proxy (connection pooling) |
| Cache/filas | Redis Cluster + BullMQ | AWS ElastiCache ou Upstash; expiração de ordem, Pub/Sub de WebSocket |
| Storage | S3 (ou Cloudflare R2), buckets privados | Upload direto do navegador via Presigned URLs |
| Chat | WebSocket + persistência em Postgres | Gateway desacoplado via Redis Pub/Sub |
| Auth | A decidir — Auth0, Cognito, Supabase Auth, ou JWT próprio auditado | MFA obrigatório para caixeiro e admin |
| Monitoramento | Sentry + OpenTelemetry, Grafana/Datadog | Fase 3 |
| CI/CD | GitHub Actions | Sprint 0 (setup) e Sprint 5 (hardening) — ver Parte 9 |
| Segredos | AWS Secrets Manager ou HashiCorp Vault | Proibido usar arquivo .env em produção, inclusive para a hot wallet |

Supabase pode acelerar o protótipo (Fase 1/2), mas nenhuma regra financeira ou de autorização deve viver só em RLS do Supabase sem passar pelo backend — alinhado com o princípio da seção 3 da Parte 1.

O provedor exato dentro de cada categoria (AWS vs. GCP vs. Render, RDS vs. Supabase vs. Neon, ElastiCache vs. Upstash) ainda é uma decisão em aberto — ver Parte 1, seção 7. A arquitetura foi desenhada para não depender de qual provedor específico for escolhido dentro de cada categoria.

### 4. Máquina de estados da ordem (consolidada)

```
DRAFT -> OPEN -> RESERVED -> ACCEPTED
     -> AWAITING_CLIENT_TRANSFER
     -> CLIENT_MARKED_TRANSFERRED
     -> AWAITING_CASHIER_CONFIRMATION
     -> CASHIER_CONFIRMED_RECEIPT
     -> AWAITING_CASHIER_TRANSFER
     -> CASHIER_MARKED_TRANSFERRED
     -> AWAITING_CLIENT_CONFIRMATION
     -> COMPLETED

Ramos paralelos, a partir de qualquer estado intermediário:
     -> CANCEL_REQUESTED -> CANCEL_ACCEPTED | CANCEL_REJECTED
     -> DISPUTE_OPEN -> DISPUTE_UNDER_REVIEW -> DISPUTE_RESOLVED
     -> EXPIRED
     -> SUSPENDED -> CLOSED
```

Regras que valem para toda transição, sem exceção:

- Apenas transições explicitamente permitidas pela tabela de transição (não por convenção de código).
- Toda transição grava autor, timestamp, IP e motivo.
- Transições que mexem em saldo ou caução usam transação de banco (all-or-nothing).
- O estado anterior é validado antes de qualquer escrita — nunca assumir o estado atual sem checar.

### 5. Requisitos não funcionais (não negociáveis)

- Idempotência: todo endpoint que afeta saldo/caução aceita `idempotency_key`. Retry de rede não pode duplicar efeito.
- Atomicidade no aceite de ordem: usar `SELECT ... FOR UPDATE` ou constraint de unicidade — nunca "verificar e depois atualizar" em passos separados.
- Auditabilidade desde o dia 1: mesmo em sandbox (Fase 2), o ledger já deve ser de dupla entrada e os logs já devem ser imutáveis. Corrigir isso depois de ir para produção é reescrita, não ajuste.
- Precisão financeira: nunca usar float para valores monetários; usar tipo decimal exato no banco.

### 6. Ambientes

- **Local (Sprint 0):** Docker Compose com Postgres e Redis, para desenvolvimento sem dependência de nuvem.
- **Sandbox atual (Fase 2):** saldo simulado, sem custódia real, PIX mockado ou em sandbox de gateway (Mercado Pago/Asaas), testes restritos à equipe.
- **Produção futura (Fase 3/4):** depende da definição externa de custódia e jurisdição antes de receber dinheiro real de terceiros.

## Parte 3 — Modelo de dados

Schema consolidado a partir do documento-base, organizado por domínio. Tipos e constraints exatos ficam para a etapa de migração (Fase 2) — aqui o objetivo é fechar entidades, relacionamentos e os campos que têm implicação de segurança.

### Convenções gerais

- Toda tabela tem `id` (UUID) como chave interna. Identificadores públicos (ex. `MP-20260806-000123` para ordens) são gerados à parte e não devem permitir inferir volume total de forma previsível.
- Nenhuma tabela financeira tem um campo `saldo` solto — todo saldo é derivado do ledger de dupla entrada (seção 9).
- Campos sensíveis (documento, dados bancários, endereço de carteira) são criptografados em repouso e mascarados por padrão nas telas administrativas.

### 1. Usuários e identidade

- `users` — dados de conta, e-mail, telefone, país, papel.
- `user_profiles` — dados complementares (nome comercial do caixeiro, idioma etc.).
- `user_roles` — cliente, caixeiro, admin, mediador, analista de risco, suporte, auditor.
- `user_status_history` — histórico de mudança de status (pendente, aprovado, suspenso, bloqueado).
- `kyc_cases` — casos de verificação de identidade, por nível (0 a 3).
- `user_documents` — documentos enviados, com hash e localização criptografada.
- `user_devices`, `user_sessions` — para detecção de login anômalo e revogação de sessão.

### 2. Caixeiro e caução

- `cashier_profiles` — dados operacionais do caixeiro (métodos, países, moedas).
- `cashier_collateral_accounts` — saldos separados: disponível, reservado, bloqueado, em análise, usado em ressarcimento, pendente de retirada, retirado. Nunca um campo único de saldo.
- `cashier_collateral_ledger` — movimentações da caução, dupla entrada.
- `cashier_limits` — limite_bruto = caução_confirmada × fator_de_exposição; limite disponível descontando exposição ativa.
- `cashier_availability` — modo online/offline, horários.

### 3. Ordens

- `orders` — campos principais: tipo (compra/venda), ativo, rede, moeda fiduciária, método, valor bruto, cotação, taxa, valor líquido, cliente, caixeiro, país, prazos, status atual, snapshot de taxas, snapshot de regras, motivo de cancelamento/disputa.
- `order_status_history` — cada transição da máquina de estados (ver Parte 2, seção 4), com autor, IP, motivo.
- `order_fee_snapshots` — taxa aplicada no momento da criação, imutável mesmo se a configuração global mudar depois.
- `order_participants` — vínculo cliente/caixeiro/mediador com a ordem.
- `order_payment_instructions` — dados de pagamento, visíveis só após aceite e para as partes corretas.
- `order_proofs` — comprovantes anexados (JPEG/PNG/PDF), armazenamento privado, URL assinada temporária.
- `order_crypto_transfers` — TXID, endereço, rede, confirmações.
- `order_fiat_transfers` — referência da transferência fiat (fora da plataforma).

### 4. Chat

- `chat_threads` — um por ordem.
- `chat_messages` — mensagens não editáveis; correção gera nova versão, não sobrescreve.
- `chat_attachments` — vinculados às mesmas regras de `order_proofs`.

### 5. Cancelamento e disputas

- `cancel_requests` — quem solicitou, motivo, quem aceitou/rejeitou. Campo explícito indicando que quem solicitou não pode avaliar a contraparte depois.
- `disputes`, `dispute_evidence`, `dispute_messages` — caso, evidências, comunicação restrita ao mediador designado.
- `dispute_decisions` — separação de poderes: `recommended_by` e `approved_by` como colunas distintas para decisões de alto valor (ver Parte 4, seção 2).

### 6. Reputação

- `ratings` — 1 a 5, uma por usuário por ordem, só após conclusão/resolução permitida.
- `rating_moderation` — avaliações sinalizadas para revisão (manipulação, contas relacionadas).

### 7. Configuração e risco

- `platform_settings`, `fee_rules`, `risk_rules` — parâmetros configuráveis pelo admin.
- `blacklist_entries` — usuário, documento, conta bancária, carteira, dispositivo, IP (quando permitido), motivo, evidências.
- `risk_alerts`, `fraud_cases` — pontuação de risco por operação (baixo/médio/alto/crítico) e ação decorrente.

### 8. Notificações

- `notifications`, `notification_preferences`.

### 9. Auditoria e ledger financeiro

- `audit_logs` — log de negócio: quem fez, o que fez, entidade, estado anterior, estado novo, motivo, IP, dispositivo, timestamp, correlação. Não editável por administrador comum.
- `admin_actions` — ações administrativas com o mesmo padrão de trilha.
- `financial_ledger` — ledger de dupla entrada para todo valor financeiro interno (incluindo caução). Nunca atualizar saldo diretamente; toda saída tem entrada correspondente.

Estrutura mínima de uma linha de ledger:

```
transaction_id
account_id
entry_type      (debit | credit)
amount
currency
reference_type  (order | collateral | adjustment | reimbursement)
reference_id
created_at
```

Correção de erro é sempre lançamento reverso, nunca edição do lançamento original.

### Notas de segurança específicas do schema

- `user_documents`, `wallet_addresses`, dados bancários: criptografados em repouso, nunca em texto plano, acesso registrado em log próprio.
- `audit_logs` e `financial_ledger`: sem UPDATE ou DELETE liberado para nenhum papel de aplicação — só INSERT. Se o banco permitir, reforçar com trigger ou permissão de nível de banco, não só regra de aplicação.
- Nenhuma tabela deve ter um relacionamento que permita a um cliente ler linha de outro cliente sem passar pela checagem de participante da ordem (`order_participants`).

## Parte 4 — Documentação de segurança

### 1. Princípio central

Em qualquer sistema de custódia de ativos digitais, o ativo real não é o saldo mostrado na tela — é a chave privada (ou o conjunto de credenciais equivalente) que controla o movimento do dinheiro. Todo o resto — banco de dados, backend, frontend — é metadado sobre quem tem direito a quê. Isso define onde o esforço de segurança deve se concentrar: a gestão de chaves pesa mais do que autenticação e autorização de aplicação, não menos.

### 2. Modelo de ameaças por componente (STRIDE)

| Componente | Ameaça principal | Exemplo concreto | Mitigação |
|---|---|---|---|
| Carteira mestra / custódia | Elevation of privilege | Uma pessoa sozinha consegue mover fundos sem segunda aprovação | Nenhuma chave única move fundos — multisig obrigatório (seção 3) |
| Carteira mestra / custódia | Tampering | Saldo interno alterado sem lastro real correspondente | Ledger de dupla entrada, sem UPDATE direto (ver Parte 3) |
| Backend / API | Concorrência | Dois caixeiros aceitam a mesma ordem | Aceite atômico com lock de banco |
| Backend / API | Elevation of privilege (IDOR) | Cliente acessa ordem de terceiro trocando ID na URL | Checagem de participante em toda leitura de ordem |
| Backend / API | Repudiation | Requisição repetida duplica pagamento ou saldo | Idempotency key obrigatória em endpoints financeiros |
| Contrato inteligente (se aplicável) | Tampering | Reentrancy, falha de controle de acesso em função crítica | Padrão checks-effects-interactions, testes automatizados, auditoria manual |
| Contrato inteligente (se aplicável) | Elevation of privilege | Chave de upgrade do contrato com poder equivalente a dono único | Upgrade também sob multisig, nunca chave única |
| Operacional / humano | Spoofing | Phishing contra quem detém uma das chaves do multisig | Hardware wallet/HSM por signatário, nunca chave em servidor |
| Uploads e anexos | Tampering / execução | Upload de arquivo malicioso disfarçado de comprovante | Verificação de MIME real, bloqueio de SVG/formatos executáveis, antivírus, storage privado |

### 3. Arquitetura de custódia de chaves

Independente da decisão final entre custódia centralizada ou smart contract, o desenho de chaves segue os mesmos princípios:

**Separação hot/cold.** A carteira conectada ao backend (hot) mantém só o necessário para liquidez operacional do dia. A maior parte do valor fica em uma carteira fria, sem conexão de rede direta com a aplicação. Se a hot wallet for comprometida, o dano é limitado por desenho, não por sorte.

**Multisig (m-de-n) na cold wallet.** Nenhuma pessoa sozinha move fundos da reserva. Um esquema inicial razoável é 2-de-3: você, o Rene, e um terceiro neutro (ou um custodiante licenciado, dependendo de como a questão regulatória externa for resolvida). Isso protege tanto contra ataque externo quanto contra erro humano, coação, ou indisponibilidade de um dos dois sócios.

```
Camada de aprovação (humana)
  Signatário A (HSM/hardware wallet)
  Signatário B (HSM/hardware wallet)
  Signatário C (terceiro neutro)
        |
        |  2 de 3 assinam
        v
  Cold wallet multisig  --  guarda a maior parte das reservas
        |
        |  reabastecimento periódico, sob demanda
        v
  Hot wallet operacional  --  só o necessário para liquidez do dia,
                               com limite de saque automático
```

**HSM ou hardware wallet dedicado por signatário.** A chave privada nunca deve existir em texto plano em memória de servidor, variável de ambiente ou arquivo de configuração versionado. Esse é o erro mais comum encontrado por auditores em projetos early-stage — vale tratar como bloqueador, não como item de backlog.

**Limite de saque automático na hot wallet**, aplicado em nível de sistema, não só como regra de negócio na tela — mesmo que a hot wallet seja comprometida, existe um teto técnico contra esvaziamento total.

Se o caminho escolhido for smart contract, o "signatário" é o multisig on-chain chamando a função de liberação/upgrade — a lógica é a mesma, muda só onde a assinatura é verificada.

### 4. Controles por fase

**Fase 2 — sandbox (estado atual)**

- Ledger de dupla entrada já implementado, mesmo com saldo simulado.
- Aceite de ordem atômico.
- Idempotência em todo endpoint financeiro.
- Logs de auditoria imutáveis desde o primeiro commit.
- Análise estática automatizada em CI (Slither/Mythril, se e quando houver contrato).

**Fase 3 — beta com dinheiro real limitado**

- Key management real implementado (multisig, hot/cold), mesmo em escala pequena — não faz sentido adiar isso para "quando o volume justificar", porque nesse momento já haverá dinheiro real de terceiros.
- KYC real via provedor contratado.
- Pentest de aplicação (autorização, concorrência, upload, sessão).
- Auditoria de contrato inteligente, se aplicável.

**Fase 4 — produção**

- Prova de reservas periódica.
- Monitoramento antifraude ativo (scoring de risco em produção, não só desenhado).
- Revisão de segurança recorrente, não pontual.

### 5. Padrões e caminhos de auditoria

Não existe um selo único de "aprovado" para esse tipo de sistema — existem padrões e processos específicos, cada um cobrindo uma parte diferente:

- **CCSS (CryptoCurrency Security Standard)** — o mais próximo de um framework abrangente para custódia de cripto. Audita geração de chave, armazenamento, política de backup, autorização de transação, auditoria interna. Vale desenhar a arquitetura já mirando CCSS nível 2/3, mesmo antes de contratar auditoria formal.
- **Análise estática de contrato (Slither, Mythril)** — automatizada, roda em CI desde o primeiro commit do contrato, gratuita.
- **Auditoria manual de contrato (firma especializada)** — camada seguinte, perto do fim do desenvolvimento do contrato, não no início. Tem custo e prazo de espera relevantes (semanas), então precisa entrar no cronograma com antecedência.
- **Pentest de aplicação tradicional** — cobre API/backend/frontend, não a lógica de custódia em si.
- **Prova de reservas** — mecanismo pelo qual a plataforma demonstra que o total custodiado bate com o total devido aos usuários. É o que dá credibilidade concreta à ideia de "custódia segura", além da auditoria de código.

A auditabilidade é uma propriedade que se constrói desde a primeira decisão de arquitetura — ledger de dupla entrada, separação de chaves, logs imutáveis — não algo que se adiciona depois pedindo para uma empresa carimbar. Desenhado certo desde a Fase 2, a auditoria formal na Fase 3/4 tende a ser rápida. Desenhado errado e corrigido depois, vira reescrita cara.

### 6. Checklist de prontidão para auditoria

- [ ] Nenhuma chave privada em texto plano em servidor, .env versionado ou repositório.
- [ ] Nenhuma função de movimentação de fundos acessível por uma única credencial.
- [ ] Todo saldo é derivado de ledger de dupla entrada, sem UPDATE direto.
- [ ] Todo endpoint financeiro aceita idempotency key.
- [ ] Aceite de ordem é atômico (testado sob concorrência real, não só em teoria).
- [ ] Logs de auditoria sem permissão de UPDATE/DELETE para nenhum papel de aplicação.
- [ ] Segredos geridos por secrets manager, com rotação definida.
- [ ] MFA obrigatório para caixeiro e admin; hardware key para superadmin.
- [ ] Análise estática automatizada rodando em CI, se houver contrato.
- [ ] Separação de poderes registrada no schema para decisões de disputa de alto valor (`dispute_decisions.recommended_by != approved_by`).
- [ ] Trava anti-triangulação: CPF/CNPJ da chave PIX validado contra o KYC no backend, bloqueando (não só sinalizando) divergência.

### 7. Gestão de segredos e práticas de desenvolvimento

Nunca no frontend: service role, chaves privadas, segredos de API, credenciais bancárias, chaves de assinatura. Nunca em repositório versionado, mesmo privado. Rotação de chaves definida por política, não ad-hoc.

### 8. Superfícies de ataque específicas do domínio

- **Reutilização de TXID** — nunca considerar um texto de TXID como confirmação suficiente sem validação on-chain (rede, contrato, valor, destinatário, confirmações).
- **Triangulação bancária (trava anti-triangulação)** — regra dura, não apenas sinalização: o CPF/CNPJ da chave PIX de origem/destino deve ser obrigatoriamente idêntico ao cadastrado no KYC do usuário, validado no backend antes de permitir a transação. A operação é bloqueada, não só sinalizada.
- **Manipulação de reputação** — não contar autoavaliação, detectar contas relacionadas, ponderar avaliação por histórico.
- **Abuso de cancelamento** — quem solicita cancelamento não avalia a contraparte; cancelamento não é automático se já houver evidência de pagamento.
- **Validação de comprovante via OCR/IA** (ideia em avaliação, não decidida) — pré-análise automatizada do comprovante enviado no chat para detectar sinais de adulteração antes de chegar a um mediador humano. Tratar como camada de triagem, não como decisão final: falso negativo não deve liberar fundos sozinho, e falso positivo não deve bloquear automaticamente sem revisão humana. Ainda sem fornecedor nem critério de acerto definido — ver Parte 1, seção 7.

## Parte 5 — Especificação de API (contrato inicial)

Nível de detalhe deliberadamente básico: método, rota e propósito. Corpo de requisição/resposta, códigos de erro e paginação entram quando o backend começar a ser implementado (Fase 2) — o valor deste contrato agora é alinhar a superfície da API com a máquina de estados da Parte 2 antes de escrever qualquer linha de código.

Regra transversal: todo endpoint marcado com (idempotente) exige header `Idempotency-Key`, conforme requisito não funcional da Parte 2, seção 5.

### Autenticação

| Método | Rota | Propósito |
|---|---|---|
| POST | /auth/register | Cadastro inicial (cliente ou caixeiro) |
| POST | /auth/login | Login com e-mail/senha |
| POST | /auth/mfa/verify | Segunda etapa de MFA (caixeiro/admin) |
| POST | /auth/refresh | Renovação de sessão |
| POST | /auth/logout | Revogação de sessão atual |

### Usuários e KYC

| Método | Rota | Propósito |
|---|---|---|
| GET | /users/me | Dados do usuário autenticado |
| PATCH | /users/me | Atualização de dados próprios |
| POST | /kyc/documents | Envio de documento para verificação |
| GET | /kyc/status | Nível e status atual de verificação |

### Caixeiro e caução

| Método | Rota | Propósito |
|---|---|---|
| POST | /cashier/apply | Solicitação para virar caixeiro |
| GET | /cashier/collateral | Saldos da caução (disponível/reservado/bloqueado) |
| GET | /cashier/limit | Limite bruto e disponível atual |
| PATCH | /cashier/availability | Modo online/offline, horários, métodos aceitos |

### Ordens

| Método | Rota | Propósito |
|---|---|---|
| POST | /orders | Cliente cria ordem de compra ou venda (idempotente) |
| GET | /orders | Lista ordens do usuário autenticado |
| GET | /orders/:id | Detalhe da ordem (checagem de participante) |
| POST | /orders/:id/accept | Caixeiro aceita — dispara reserva de caução (idempotente) |
| POST | /orders/:id/client-transfer | Cliente marca que transferiu e anexa comprovante |
| POST | /orders/:id/cashier-confirm-receipt | Caixeiro confirma recebimento do fiat (idempotente) |
| POST | /orders/:id/cashier-transfer | Caixeiro marca envio do ativo e informa TXID |
| POST | /orders/:id/client-confirm | Cliente confirma recebimento — conclui a ordem (idempotente) |
| POST | /orders/:id/cancel-request | Uma das partes solicita cancelamento |
| POST | /orders/:id/cancel-response | Contraparte aceita ou rejeita o cancelamento |

### Chat

| Método | Rota | Propósito |
|---|---|---|
| GET | /orders/:id/messages | Histórico do chat da ordem |
| POST | /orders/:id/messages | Nova mensagem (texto, comprovante, imagem) |

### Disputas

| Método | Rota | Propósito |
|---|---|---|
| POST | /orders/:id/dispute | Abertura de disputa com motivo |
| GET | /disputes/:id | Detalhe do caso (restrito a mediador designado) |
| POST | /disputes/:id/evidence | Anexo de evidência |
| POST | /disputes/:id/decision | Decisão do mediador — grava recommended_by/approved_by |

### Avaliações

| Método | Rota | Propósito |
|---|---|---|
| POST | /orders/:id/rating | Avaliação de 1 a 5 pela contraparte |

### Administração

| Método | Rota | Propósito |
|---|---|---|
| GET | /admin/users | Busca e filtro de usuários |
| POST | /admin/users/:id/approve | Aprovação de cadastro |
| GET | /admin/orders | Visão consolidada de ordens |
| GET | /admin/audit-logs | Consulta de trilha de auditoria |
| POST | /admin/blacklist | Inclusão em blacklist, com evidências e motivo |

## Parte 6 — Estratégia de testes (nível básico)

Sem casos de teste escritos ainda — isso entra junto com o código na Fase 2. O que importa fixar agora é onde o esforço de teste deve se concentrar, priorizado pelo que quebra mais caro se falhar:

1. **Máquina de estados** — cada transição não permitida precisa de um teste explícito rejeitando-a, não só o caminho feliz sendo testado. Testar especificamente: tentar pular etapa, tentar voltar de COMPLETED, tentar agir fora do papel (cliente tentando confirmar recebimento do caixeiro, por exemplo).
2. **Concorrência** — dois caixeiros tentando aceitar a mesma ordem ao mesmo tempo; teste de carga simulando a corrida, não só teste sequencial.
3. **Idempotência** — reenviar a mesma requisição com a mesma Idempotency-Key não pode duplicar efeito em saldo, caução ou estado da ordem.
4. **Autorização (IDOR)** — tentar acessar ou modificar ordem, chat ou disputa da qual o usuário não é participante.
5. **Ledger** — soma de débitos e créditos sempre bate; nenhuma operação deixa o ledger inconsistente, mesmo sob falha simulada no meio da transação.
6. **Upload** — arquivo com MIME divergente da extensão, tamanho excessivo, tipo bloqueado (SVG, executável).

Esses seis pontos devem ter cobertura antes de qualquer outra parte do sistema — são os que aparecem no checklist de auditoria (Parte 4, seção 6) e os mais caros de descobrir quebrados em produção.

## Parte 7 — Plano de resposta a incidentes

### 1. Classificação de severidade

| Nível | Critério | Exemplo |
|---|---|---|
| Crítico | Perda ou risco de perda de fundos custodiados; dado sensível de KYC exposto | Hot wallet comprometida; vazamento de documentos |
| Alto | Sistema financeiro operando de forma inconsistente, sem perda confirmada ainda | Ledger não fecha; saldo negativo detectado |
| Médio | Funcionalidade crítica indisponível, sem exposição de dado ou fundo | Chat fora do ar; upload de comprovante falhando |
| Baixo | Degradação sem impacto financeiro ou de dado | Lentidão pontual, erro cosmético |

### 2. Papéis e acionamento

Nesta fase (equipe pequena), os papéis de resposta provavelmente recaem sobre você e o Rene diretamente. Definir isso explicitamente evita que, num incidente real, as duas primeiras horas sejam gastas decidindo quem faz o quê:

- **Contenção técnica** — quem pausa o sistema, revoga chave/sessão, isola o componente afetado.
- **Comunicação** — quem fala com o cliente/stakeholder e, se aplicável, com os usuários afetados.
- **Decisão financeira** — quem autoriza qualquer ação sobre a caução ou reserva durante o incidente (deve exigir o mesmo quorum multisig usado em operação normal — um incidente não é justificativa para pular a segunda assinatura).

### 3. Cenários prioritários e playbooks

**Comprometimento (ou suspeita) da hot wallet**

1. Revogar/pausar a chave operacional imediatamente; parar a aceitação de novas ordens que dependam dela.
2. Confirmar o saldo real na cold wallet e o quanto estava exposto na hot wallet.
3. Não mover fundos da cold wallet sem o quorum multisig completo, mesmo sob pressão de tempo.
4. Rotacionar credenciais relacionadas; investigar o vetor de entrada antes de religar o componente.

**Inconsistência de saldo / ledger não fecha**

1. Pausar novas transações que dependam do saldo afetado.
2. Reconstruir o saldo a partir do ledger de dupla entrada (nunca corrigir a mão um valor direto — sempre lançamento reverso).
3. Identificar se a causa foi concorrência (aceite não atômico), falha de idempotência, ou erro de integração externa.

**Vazamento ou acesso indevido a dados de KYC**

1. Conter o vetor de acesso (revogar sessão/chave comprometida).
2. Levantar o escopo real: quais registros, de quantos usuários, quais campos.
3. Avaliar necessidade de notificação aos titulares e às autoridades competentes — este ponto cruza com a frente jurídica externa e deve ser escalado a ela imediatamente, não decidido só pela equipe técnica.

**Disputa em massa / manipulação coordenada de reputação**

1. Suspender temporariamente a capacidade de avaliação ou de abertura de disputa para as contas envolvidas, sem bloquear a operação legítima de terceiros.
2. Levantar padrão comum (mesmo dispositivo, mesma janela de tempo, contas relacionadas).
3. Aplicar blacklist/registro conforme o resultado da análise, com trilha de auditoria completa da decisão.

**TXID inválido ou reutilizado / falha de validação on-chain**

1. Nunca liberar o lado fiduciário da ordem com base só no texto do TXID informado.
2. Reprocessar a validação on-chain (rede, contrato, valor, destinatário, confirmações) antes de qualquer liberação.
3. Se a rede estiver instável (reorg), manter a ordem em estado de espera até confirmação suficiente, não forçar conclusão.

### 4. Comunicação

Durante um incidente crítico ou alto, evitar prometer prazo de resolução antes de entender o escopo real. Comunicação para o cliente/stakeholder deve separar claramente "o que sabemos", "o que estamos fazendo agora" e "o que ainda não sabemos" — não misturar as três coisas numa única mensagem tranquilizadora genérica.

### 5. Pós-incidente

Todo incidente de nível crítico ou alto gera um post-mortem curto: o que aconteceu, janela de tempo, causa raiz, o que teria detectado mais cedo, e qual mudança concreta de controle entra no checklist de segurança (Parte 4, seção 6) como resultado. O checklist de auditabilidade deve ser atualizado quando um incidente revelar uma lacuna que ele não cobria.

## Parte 8 — Roadmap de documentação futura

O que fica de fora deste pacote inicial, por que fica de fora agora, e quando entra:

| Documento | Por que ainda não | Quando entra |
|---|---|---|
| Design system | Depende de decisões visuais que só fazem sentido no protótipo navegável | Fase 1 |
| Documentação completa da API (request/response, erros) | Depende dos contratos exatos definidos durante a implementação | Fase 2, incrementalmente por endpoint |
| Casos de teste escritos | Dependem do código existir | Fase 2, junto com cada módulo |
| Documentação de deploy | Infraestrutura de referência já definida (Parte 2); falta o guia passo-a-passo e o provedor exato dentro de cada categoria | Sprint 5 |
| Configuração de CI/CD | Depende do repositório estar montado | Sprint 0 (setup básico) e Sprint 5 (hardening) |
| Plano de backup | Depende do banco e storage estarem em produção | Fase 2/3 |
| Plano de monitoramento | Depende de volume real para calibrar alertas | Fase 3 |
| Manual administrativo | Depende do painel admin existir | Fase 3 |
| Manual de suporte | Depende do fluxo de atendimento estar definido | Fase 3 |

Este documento (Partes 1 a 7) é o que sustenta as decisões de arquitetura e segurança independente de quando os itens acima forem preenchidos — por isso foi o primeiro a ser fechado. A Parte 9 detalha a sequência de sprints que preenche a maior parte desta tabela.

## Parte 9 — Roadmap de sprints e estrutura de repositório

Sequência definida para o desenvolvimento com Claude Code, respeitando a ordem de dependência técnica: protótipo antes de backend, fundação antes de lógica de negócio, lógica antes de infraestrutura de tempo real.

| Sprint | Entrega | Depende de |
|---|---|---|
| Sprint -1 (Fase 1) | Protótipo navegável em Next.js com dados fakes (Tailwind CSS + shadcn/ui) | — |
| Sprint 0 | Setup de infra local (Docker Compose com Postgres e Redis) e repositórios | Sprint -1 aprovado |
| Sprint 1 | Banco de dados (Prisma/TypeORM), autenticação JWT, motor do ledger de dupla entrada | Sprint 0 |
| Sprint 2 | Interface CustodyAdapter, máquina de estados com lock pessimista, idempotência, trava anti-triangulação | Sprint 1 |
| Sprint 3 | Filas no BullMQ para timeouts, gateways de WebSocket (chat e status via Redis Pub/Sub) | Sprint 2 |
| Sprint 4 | Conexão do frontend Next.js com a API real, upload de mídia via Presigned URLs | Sprint 3 |
| Sprint 5 | Testes de carga/concorrência (K6), hardening de segurança, integração de KYC real, deploy | Sprint 4 |

O Sprint 2 é o ponto de maior atenção: é onde os itens não-negociáveis da Parte 4 (ledger, aceite atômico, idempotência, trava anti-triangulação) deixam de ser especificação e viram código. Vale rodar o checklist de prontidão para auditoria (Parte 4, seção 6) contra o que foi entregue no Sprint 2 antes de avançar para o Sprint 3, em vez de deixar essa checagem só para o Sprint 5.

### Estrutura do monorepo

```
marinsprosper-api/   (NestJS, modular)
  src/modules/
    auth/
    users/
    ledger/
    custody/
    orders/
    queues/
    chat/
    storage/

marinsprosper-web/   (Next.js, App Router)
  src/app/
    (auth)/
    (dashboard)/
      offers/
      orders/[id]/
      wallet/
      admin/
```

Esta estrutura mapeia diretamente para a máquina de estados e o modelo de dados das Partes 2 e 3 — cada módulo do backend corresponde a um grupo de tabelas e a um grupo de endpoints já definido na Parte 5.
