---
tags: [api, contrato]
---

← [[04 - Documentação de Segurança]] | → [[06 - Estratégia de Testes]]

# Parte 5 — Especificação de API (contrato inicial)

Nível de detalhe deliberadamente básico: método, rota e propósito. Corpo de requisição/resposta, códigos de erro e paginação entram quando o backend começar a ser implementado (Fase 2).

Regra transversal: todo endpoint marcado com (idempotente) exige header `Idempotency-Key`, conforme requisito não funcional de [[02 - Arquitetura Técnica]] seção 5.

## Autenticação

| Método | Rota | Propósito |
|---|---|---|
| POST | /auth/register | Cadastro inicial (cliente ou caixeiro) |
| POST | /auth/login | Login com e-mail/senha |
| POST | /auth/mfa/verify | Segunda etapa de MFA (caixeiro/admin) |
| POST | /auth/refresh | Renovação de sessão |
| POST | /auth/logout | Revogação de sessão atual |

## Usuários e KYC

| Método | Rota | Propósito |
|---|---|---|
| GET | /users/me | Dados do usuário autenticado |
| PATCH | /users/me | Atualização de dados próprios |
| POST | /kyc/documents | Envio de documento para verificação |
| GET | /kyc/status | Nível e status atual de verificação |

## Caixeiro e caução

| Método | Rota | Propósito |
|---|---|---|
| POST | /cashier/apply | Solicitação para virar caixeiro |
| GET | /cashier/collateral | Saldos da caução (disponível/reservado/bloqueado) |
| GET | /cashier/limit | Limite bruto e disponível atual |
| PATCH | /cashier/availability | Modo online/offline, horários, métodos aceitos |

## Ordens

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

## Chat

| Método | Rota | Propósito |
|---|---|---|
| GET | /orders/:id/messages | Histórico do chat da ordem |
| POST | /orders/:id/messages | Nova mensagem (texto, comprovante, imagem) |

## Disputas

| Método | Rota | Propósito |
|---|---|---|
| POST | /orders/:id/dispute | Abertura de disputa com motivo |
| GET | /disputes/:id | Detalhe do caso (restrito a mediador designado) |
| POST | /disputes/:id/evidence | Anexo de evidência |
| POST | /disputes/:id/decision | Decisão do mediador — grava recommended_by/approved_by |

## Avaliações

| Método | Rota | Propósito |
|---|---|---|
| POST | /orders/:id/rating | Avaliação de 1 a 5 pela contraparte |

## Administração

| Método | Rota | Propósito |
|---|---|---|
| GET | /admin/users | Busca e filtro de usuários |
| POST | /admin/users/:id/approve | Aprovação de cadastro |
| GET | /admin/orders | Visão consolidada de ordens |
| GET | /admin/audit-logs | Consulta de trilha de auditoria |
| POST | /admin/blacklist | Inclusão em blacklist, com evidências e motivo |
