---
tags: [segurança, auditoria]
---

← [[03 - Modelo de Dados]] | → [[05 - Especificação de API]]

# Parte 4 — Documentação de segurança

## 1. Princípio central

Em qualquer sistema de custódia de ativos digitais, o ativo real não é o saldo mostrado na tela — é a chave privada (ou o conjunto de credenciais equivalente) que controla o movimento do dinheiro. Todo o resto — banco de dados, backend, frontend — é metadado sobre quem tem direito a quê. Isso define onde o esforço de segurança deve se concentrar: a gestão de chaves pesa mais do que autenticação e autorização de aplicação, não menos.

## 2. Modelo de ameaças por componente (STRIDE)

| Componente | Ameaça principal | Exemplo concreto | Mitigação |
|---|---|---|---|
| Carteira mestra / custódia | Elevation of privilege | Uma pessoa sozinha consegue mover fundos sem segunda aprovação | Nenhuma chave única move fundos — multisig obrigatório (seção 3) |
| Carteira mestra / custódia | Tampering | Saldo interno alterado sem lastro real correspondente | Ledger de dupla entrada, sem UPDATE direto (ver [[03 - Modelo de Dados]]) |
| Backend / API | Concorrência | Dois caixeiros aceitam a mesma ordem | Aceite atômico com lock de banco |
| Backend / API | Elevation of privilege (IDOR) | Cliente acessa ordem de terceiro trocando ID na URL | Checagem de participante em toda leitura de ordem |
| Backend / API | Repudiation | Requisição repetida duplica pagamento ou saldo | Idempotency key obrigatória em endpoints financeiros |
| Contrato inteligente (se aplicável) | Tampering | Reentrancy, falha de controle de acesso em função crítica | Padrão checks-effects-interactions, testes automatizados, auditoria manual |
| Contrato inteligente (se aplicável) | Elevation of privilege | Chave de upgrade do contrato com poder equivalente a dono único | Upgrade também sob multisig, nunca chave única |
| Operacional / humano | Spoofing | Phishing contra quem detém uma das chaves do multisig | Hardware wallet/HSM por signatário, nunca chave em servidor |
| Uploads e anexos | Tampering / execução | Upload de arquivo malicioso disfarçado de comprovante | Verificação de MIME real, bloqueio de SVG/formatos executáveis, antivírus, storage privado |

## 3. Arquitetura de custódia de chaves

Independente da decisão final entre custódia centralizada ou smart contract, o desenho de chaves segue os mesmos princípios:

**Separação hot/cold.** A carteira conectada ao backend (hot) mantém só o necessário para liquidez operacional do dia. A maior parte do valor fica em uma carteira fria, sem conexão de rede direta com a aplicação. Se a hot wallet for comprometida, o dano é limitado por desenho, não por sorte.

**Multisig (m-de-n) na cold wallet.** Nenhuma pessoa sozinha move fundos da reserva. Um esquema inicial razoável é 2-de-3: você, o Rene, e um terceiro neutro (ou um custodiante licenciado, dependendo de como a questão regulatória externa for resolvida).

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

**Limite de saque automático na hot wallet**, aplicado em nível de sistema, não só como regra de negócio na tela.

Se o caminho escolhido for smart contract, o "signatário" é o multisig on-chain chamando a função de liberação/upgrade — a lógica é a mesma, muda só onde a assinatura é verificada.

## 4. Controles por fase

**Fase 2 — sandbox (estado atual)**

- Ledger de dupla entrada já implementado, mesmo com saldo simulado.
- Aceite de ordem atômico.
- Idempotência em todo endpoint financeiro.
- Logs de auditoria imutáveis desde o primeiro commit.
- Análise estática automatizada em CI (Slither/Mythril, se e quando houver contrato).

**Fase 3 — beta com dinheiro real limitado**

- Key management real implementado (multisig, hot/cold), mesmo em escala pequena.
- KYC real via provedor contratado.
- Pentest de aplicação (autorização, concorrência, upload, sessão).
- Auditoria de contrato inteligente, se aplicável.

**Fase 4 — produção**

- Prova de reservas periódica.
- Monitoramento antifraude ativo (scoring de risco em produção, não só desenhado).
- Revisão de segurança recorrente, não pontual.

## 5. Padrões e caminhos de auditoria

- **CCSS (CryptoCurrency Security Standard)** — o mais próximo de um framework abrangente para custódia de cripto. Vale desenhar a arquitetura já mirando CCSS nível 2/3.
- **Análise estática de contrato (Slither, Mythril)** — automatizada, roda em CI desde o primeiro commit do contrato, gratuita.
- **Auditoria manual de contrato (firma especializada)** — perto do fim do desenvolvimento do contrato, não no início. Custo e prazo relevantes (semanas).
- **Pentest de aplicação tradicional** — cobre API/backend/frontend, não a lógica de custódia em si.
- **Prova de reservas** — demonstra que o total custodiado bate com o total devido aos usuários.

A auditabilidade é uma propriedade que se constrói desde a primeira decisão de arquitetura — ledger de dupla entrada, separação de chaves, logs imutáveis — não algo que se adiciona depois pedindo para uma empresa carimbar.

## 6. Checklist de prontidão para auditoria

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

## 7. Gestão de segredos e práticas de desenvolvimento

Nunca no frontend: service role, chaves privadas, segredos de API, credenciais bancárias, chaves de assinatura. Nunca em repositório versionado, mesmo privado. Rotação de chaves definida por política, não ad-hoc.

## 8. Superfícies de ataque específicas do domínio

- **Reutilização de TXID** — nunca considerar um texto de TXID como confirmação suficiente sem validação on-chain (rede, contrato, valor, destinatário, confirmações).
- **Triangulação bancária (trava anti-triangulação)** — regra dura, não apenas sinalização: o CPF/CNPJ da chave PIX de origem/destino deve ser obrigatoriamente idêntico ao cadastrado no KYC do usuário, validado no backend antes de permitir a transação.
- **Manipulação de reputação** — não contar autoavaliação, detectar contas relacionadas, ponderar avaliação por histórico.
- **Abuso de cancelamento** — quem solicita cancelamento não avalia a contraparte; cancelamento não é automático se já houver evidência de pagamento.
- **Validação de comprovante via OCR/IA** (ideia em avaliação, não decidida) — pré-análise automatizada do comprovante enviado no chat para detectar sinais de adulteração antes de chegar a um mediador humano. Falso negativo não deve liberar fundos sozinho; falso positivo não deve bloquear automaticamente sem revisão humana.
