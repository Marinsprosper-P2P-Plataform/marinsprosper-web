---
tags: [incidentes, segurança]
---

← [[06 - Estratégia de Testes]] | → [[08 - Roadmap de Documentação Futura]]

# Parte 7 — Plano de resposta a incidentes

## 1. Classificação de severidade

| Nível | Critério | Exemplo |
|---|---|---|
| Crítico | Perda ou risco de perda de fundos custodiados; dado sensível de KYC exposto | Hot wallet comprometida; vazamento de documentos |
| Alto | Sistema financeiro operando de forma inconsistente, sem perda confirmada ainda | Ledger não fecha; saldo negativo detectado |
| Médio | Funcionalidade crítica indisponível, sem exposição de dado ou fundo | Chat fora do ar; upload de comprovante falhando |
| Baixo | Degradação sem impacto financeiro ou de dado | Lentidão pontual, erro cosmético |

## 2. Papéis e acionamento

Nesta fase (equipe pequena), os papéis de resposta provavelmente recaem sobre você e o Rene diretamente. Definir isso explicitamente evita que, num incidente real, as duas primeiras horas sejam gastas decidindo quem faz o quê:

- **Contenção técnica** — quem pausa o sistema, revoga chave/sessão, isola o componente afetado.
- **Comunicação** — quem fala com o cliente/stakeholder e, se aplicável, com os usuários afetados.
- **Decisão financeira** — quem autoriza qualquer ação sobre a caução ou reserva durante o incidente (deve exigir o mesmo quorum multisig usado em operação normal — um incidente não é justificativa para pular a segunda assinatura).

## 3. Cenários prioritários e playbooks

### Comprometimento (ou suspeita) da hot wallet

1. Revogar/pausar a chave operacional imediatamente; parar a aceitação de novas ordens que dependam dela.
2. Confirmar o saldo real na cold wallet e o quanto estava exposto na hot wallet.
3. Não mover fundos da cold wallet sem o quorum multisig completo, mesmo sob pressão de tempo.
4. Rotacionar credenciais relacionadas; investigar o vetor de entrada antes de religar o componente.

### Inconsistência de saldo / ledger não fecha

1. Pausar novas transações que dependam do saldo afetado.
2. Reconstruir o saldo a partir do ledger de dupla entrada (nunca corrigir a mão um valor direto — sempre lançamento reverso).
3. Identificar se a causa foi concorrência (aceite não atômico), falha de idempotência, ou erro de integração externa.

### Vazamento ou acesso indevido a dados de KYC

1. Conter o vetor de acesso (revogar sessão/chave comprometida).
2. Levantar o escopo real: quais registros, de quantos usuários, quais campos.
3. Avaliar necessidade de notificação aos titulares e às autoridades competentes — este ponto cruza com a frente jurídica externa e deve ser escalado a ela imediatamente, não decidido só pela equipe técnica.

### Disputa em massa / manipulação coordenada de reputação

1. Suspender temporariamente a capacidade de avaliação ou de abertura de disputa para as contas envolvidas, sem bloquear a operação legítima de terceiros.
2. Levantar padrão comum (mesmo dispositivo, mesma janela de tempo, contas relacionadas).
3. Aplicar blacklist/registro conforme o resultado da análise, com trilha de auditoria completa da decisão.

### TXID inválido ou reutilizado / falha de validação on-chain

1. Nunca liberar o lado fiduciário da ordem com base só no texto do TXID informado.
2. Reprocessar a validação on-chain (rede, contrato, valor, destinatário, confirmações) antes de qualquer liberação.
3. Se a rede estiver instável (reorg), manter a ordem em estado de espera até confirmação suficiente, não forçar conclusão.

## 4. Comunicação

Durante um incidente crítico ou alto, evitar prometer prazo de resolução antes de entender o escopo real. Comunicação para o cliente/stakeholder deve separar claramente "o que sabemos", "o que estamos fazendo agora" e "o que ainda não sabemos" — não misturar as três coisas numa única mensagem tranquilizadora genérica.

## 5. Pós-incidente

Todo incidente de nível crítico ou alto gera um post-mortem curto: o que aconteceu, janela de tempo, causa raiz, o que teria detectado mais cedo, e qual mudança concreta de controle entra no checklist de segurança ([[04 - Documentação de Segurança]] seção 6) como resultado.
