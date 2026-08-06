---
tags: [dados, schema]
---

← [[02 - Arquitetura Técnica]] | → [[04 - Documentação de Segurança]]

# Parte 3 — Modelo de dados

Schema consolidado a partir do documento-base, organizado por domínio. Tipos e constraints exatos ficam para a etapa de migração (Fase 2) — aqui o objetivo é fechar entidades, relacionamentos e os campos que têm implicação de segurança.

## Convenções gerais

- Toda tabela tem `id` (UUID) como chave interna. Identificadores públicos (ex. `MP-20260806-000123` para ordens) são gerados à parte e não devem permitir inferir volume total de forma previsível.
- Nenhuma tabela financeira tem um campo `saldo` solto — todo saldo é derivado do ledger de dupla entrada (seção 9).
- Campos sensíveis (documento, dados bancários, endereço de carteira) são criptografados em repouso e mascarados por padrão nas telas administrativas.

## 1. Usuários e identidade

- `users` — dados de conta, e-mail, telefone, país, papel.
- `user_profiles` — dados complementares (nome comercial do caixeiro, idioma etc.).
- `user_roles` — cliente, caixeiro, admin, mediador, analista de risco, suporte, auditor.
- `user_status_history` — histórico de mudança de status (pendente, aprovado, suspenso, bloqueado).
- `kyc_cases` — casos de verificação de identidade, por nível (0 a 3).
- `user_documents` — documentos enviados, com hash e localização criptografada.
- `user_devices`, `user_sessions` — para detecção de login anômalo e revogação de sessão.

## 2. Caixeiro e caução

- `cashier_profiles` — dados operacionais do caixeiro (métodos, países, moedas).
- `cashier_collateral_accounts` — saldos separados: disponível, reservado, bloqueado, em análise, usado em ressarcimento, pendente de retirada, retirado. Nunca um campo único de saldo.
- `cashier_collateral_ledger` — movimentações da caução, dupla entrada.
- `cashier_limits` — limite_bruto = caução_confirmada × fator_de_exposição; limite disponível descontando exposição ativa.
- `cashier_availability` — modo online/offline, horários.

## 3. Ordens

- `orders` — campos principais: tipo (compra/venda), ativo, rede, moeda fiduciária, método, valor bruto, cotação, taxa, valor líquido, cliente, caixeiro, país, prazos, status atual, snapshot de taxas, snapshot de regras, motivo de cancelamento/disputa.
- `order_status_history` — cada transição da máquina de estados (ver [[02 - Arquitetura Técnica]]), com autor, IP, motivo.
- `order_fee_snapshots` — taxa aplicada no momento da criação, imutável mesmo se a configuração global mudar depois.
- `order_participants` — vínculo cliente/caixeiro/mediador com a ordem.
- `order_payment_instructions` — dados de pagamento, visíveis só após aceite e para as partes corretas.
- `order_proofs` — comprovantes anexados (JPEG/PNG/PDF), armazenamento privado, URL assinada temporária.
- `order_crypto_transfers` — TXID, endereço, rede, confirmações.
- `order_fiat_transfers` — referência da transferência fiat (fora da plataforma).

## 4. Chat

- `chat_threads` — um por ordem.
- `chat_messages` — mensagens não editáveis; correção gera nova versão, não sobrescreve.
- `chat_attachments` — vinculados às mesmas regras de `order_proofs`.

## 5. Cancelamento e disputas

- `cancel_requests` — quem solicitou, motivo, quem aceitou/rejeitou. Campo explícito indicando que quem solicitou não pode avaliar a contraparte depois.
- `disputes`, `dispute_evidence`, `dispute_messages` — caso, evidências, comunicação restrita ao mediador designado.
- `dispute_decisions` — separação de poderes: `recommended_by` e `approved_by` como colunas distintas para decisões de alto valor (ver [[04 - Documentação de Segurança]]).

## 6. Reputação

- `ratings` — 1 a 5, uma por usuário por ordem, só após conclusão/resolução permitida.
- `rating_moderation` — avaliações sinalizadas para revisão (manipulação, contas relacionadas).

## 7. Configuração e risco

- `platform_settings`, `fee_rules`, `risk_rules` — parâmetros configuráveis pelo admin.
- `blacklist_entries` — usuário, documento, conta bancária, carteira, dispositivo, IP (quando permitido), motivo, evidências.
- `risk_alerts`, `fraud_cases` — pontuação de risco por operação (baixo/médio/alto/crítico) e ação decorrente.

## 8. Notificações

- `notifications`, `notification_preferences`.

## 9. Auditoria e ledger financeiro

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

## Notas de segurança específicas do schema

- `user_documents`, `wallet_addresses`, dados bancários: criptografados em repouso, nunca em texto plano, acesso registrado em log próprio.
- `audit_logs` e `financial_ledger`: sem UPDATE ou DELETE liberado para nenhum papel de aplicação — só INSERT. Se o banco permitir, reforçar com trigger ou permissão de nível de banco, não só regra de aplicação.
- Nenhuma tabela deve ter um relacionamento que permita a um cliente ler linha de outro cliente sem passar pela checagem de participante da ordem (`order_participants`).
