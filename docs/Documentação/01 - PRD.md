---
tags: [prd, produto]
---

← [[Início]] | → [[02 - Arquitetura Técnica]]

# Parte 1 — PRD

## 1. Resumo executivo

A Marinsprosper é uma plataforma P2P para compra e venda de USDT (TRC20 no MVP) sem intermediação bancária direta — o valor em moeda fiduciária é sempre transferido diretamente entre as contas pessoais das partes (ex. via PIX), e a plataforma custodia apenas o ativo digital durante a transação.

O projeto nasceu de duas fontes que precisam ser lidas como uma coisa só:

- Um levantamento comparativo de três plataformas de referência (STM, Eldorado, AirTM), que mapeou modelos de descoberta de contraparte, precificação e custódia já validados no mercado.
- Um documento-base mais completo (Marinsprosper), que define um modelo próprio: contraparte com caução (não um vendedor comum), regra de "cliente transfere primeiro", máquina de estados detalhada, ledger de dupla entrada e um conjunto extenso de controles de segurança e auditoria.

Este PRD adota o documento-base como especificação vigente e trata o levantamento comparativo como pesquisa de mercado que embasou as escolhas de design.

## 2. Papéis

**Cliente** — compra ou vende USDT usando PIX ou outro método local. Transfere sua parte primeiro, acompanha a ordem, envia comprovante, conversa com o caixeiro, pode cancelar ou abrir disputa, avalia o caixeiro ao final.

**Caixeiro** — parceiro operacional que mantém uma caução como garantia. Recebe acesso a ordens compatíveis com seu limite disponível, aceita, confirma recebimento, envia a contraparte do valor, informa TXID quando aplicável, participa de disputas, avalia o cliente.

**Administrador** — aprova cadastros, gerencia risco, media disputas, controla parâmetros de taxa e caução, administra blacklist, acessa logs e relatórios. Ações críticas exigem MFA, justificativa e trilha de auditoria.

**Mediador** — papel separado do admin, mesmo que operado pela mesma pessoa no início. Acesso restrito apenas às ordens em disputa atribuídas a ele.

## 3. Princípios fundamentais

Herdados do documento-base e adotados sem alteração:

- Segurança acima de velocidade — nenhuma funcionalidade é implementada sacrificando autenticação, controle de acesso, integridade de dados ou auditabilidade.
- Toda regra financeira existe no backend. O frontend solicita; o servidor valida e executa.
- Nenhum saldo é alterado diretamente por tela administrativa comum — toda movimentação passa por função transacional com log imutável.
- Toda ordem tem uma máquina de estados; transições fora do fluxo autorizado não são permitidas.

## 4. Decisões de modelo já adotadas

Para eliminar a ambiguidade entre os dois documentos de origem:

| Ponto | Decisão adotada | Origem |
|---|---|---|
| Papel da contraparte | Caixeiro com caução (não vendedor comum com saldo próprio travado) | Documento-base |
| Ordem de transferência | Cliente transfere primeiro | Documento-base |
| Ativo do MVP | USDT TRC20 | Documento-base |
| Fluxo de descoberta | Aceite direto de ordem pelo caixeiro (não book público nem auto-match) | Documento-base |
| Estrutura de taxa | 3% total, configurável (2,5% caixeiro / 0,5% plataforma como referência inicial) | Documento-base |

Multi-asset (USDC, USD) e outros modelos de descoberta (book público, auto-match) ficam como evolução possível, não como requisito do MVP.

## 5. Escopo por fase

| Fase | Entrega | Observação |
|---|---|---|
| Fase 0 | Decisões de produto fechadas | Em andamento — este documento faz parte dela |
| Fase 1 | Protótipo navegável, dados simulados | Sem backend real |
| Fase 2 | Backend funcional, sem dinheiro real | Estado atual do projeto (sandbox) |
| Fase 3 | Beta fechado, caução e KYC reais, limites baixos | Depende de definição de custódia final e de jurisdição (externa a esta equipe) |
| Fase 4 | Produção | Compliance, antifraude, alta disponibilidade |

Estimativa ajustada: 3 a 4 semanas para o MVP completo (protótipo + backend), com uma regra de ordem que não deve ser invertida: o protótipo navegável (Fase 1) é construído e validado antes de qualquer código de backend. Isso permite testar as 11 transições da máquina de estados e a UX do chat com a equipe sem custo de reescrita. O detalhamento sprint a sprint está em [[09 - Roadmap de Sprints]].

## 6. Critérios de aceite do MVP (Fase 2 → Fase 3)

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

## 7. Decisões em aberto

Fora do escopo desta equipe, mas que bloqueiam a arquitetura de custódia final:

- Jurisdição de operação e enquadramento regulatório — tratado externamente. A camada de custódia (ver [[02 - Arquitetura Técnica]]) foi desenhada para não depender dessa resposta até que ela exista, mas produção com dinheiro real não deve começar sem ela.

Dentro do escopo técnico, a decidir com o Rene:

- Custódia final: saldo centralizado (Postgres, controlado pela entidade operadora) vs. contrato inteligente com multisig. Ver [[04 - Documentação de Segurança]] para os trade-offs de cada opção.
- Provedor de KYC a contratar em produção (idwall, Unico, Serpro, CAF são candidatos já mapeados).
- Política de retirada de caução (prazo de segurança, autenticação reforçada).
- Estrutura definitiva de taxa por método/país, se o produto expandir além do MVP inicial.
- Provedor exato de nuvem: AWS ECS Fargate vs. GCP Cloud Run vs. Render (backend); AWS RDS vs. Supabase vs. Neon (banco); AWS ElastiCache vs. Upstash (Redis).
- Validação de comprovantes via OCR/IA (pré-análise automatizada para detectar adulteração antes do mediador humano) — ideia nova, ainda não especificada. Ver nota em [[04 - Documentação de Segurança]].

## 8. Fora de escopo nesta fase

- Aplicativo mobile nativo (Next.js web primeiro).
- Multi-moeda fiduciária e multi-rede blockchain.
- Book de ofertas público ou auto-matching (modelos Eldorado/AirTM ficam como research, não como requisito).
- Documentos legais (Termos de Uso, Política de Privacidade etc.) — tratados fora desta equipe.

## 9. Propriedade intelectual e repositório

- Repositório GitHub: privado.
- Licença: nenhuma licença selecionada — isso aplica copyright proprietário por padrão (all rights reserved), o que já impede legalmente cópia, modificação ou comercialização do código por terceiros sem autorização. Não depende de decisão jurídica adicional para valer.

Ponto a revisitar quando houver mais colaboradores externos ou investidores: ausência de licença explícita também dificulta qualquer cessão de direitos futura — se isso vier a ser necessário, formalizar via contrato entre os sócios, não via licença de código aberto.
