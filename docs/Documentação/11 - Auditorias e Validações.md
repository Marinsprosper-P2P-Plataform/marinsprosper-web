---
tags: [segurança, qualidade, auditoria]
---

← [[10 - Design System]] | [[Início]]

# Auditorias e validações

Registro cronológico de passadas de verificação sobre o repositório — segurança, estrutura, qualidade. Não substitui o checklist formal de auditoria de [[04 - Documentação de Segurança]] (esse é para quando houver dinheiro real em jogo); é o equivalente leve para o dia a dia do frontend.

## 2026-08-07 (3) — Validação pós Carteira & Caução

Escopo: implementação completa do bucket "Carteira & Caução — visão do Caixeiro" (`src/lib/mock/collateral.tsx`, `src/lib/mock/cashier-availability.tsx`, `/wallet`, `/wallet/availability`, `components/ui/switch.tsx`).

| Checagem | Resultado |
|---|---|
| `npm audit` | ✅ 0 vulnerabilidades (nenhuma dependência nova — `Switch` usa o `radix-ui` já instalado) |
| `dangerouslySetInnerHTML` / `innerHTML=` / `eval(` / `new Function(` / `: any` / `as any` nos arquivos novos | ✅ Nenhuma ocorrência |
| Vazamento de dados entre contas na carteira/disponibilidade | ✅ `getAccount`/`getAvailability` sempre filtram por `user.id` da sessão atual; trocar de conta no `AccountSwitcher` mostra os saldos/config certos, testado manualmente |
| Endereço de depósito | ✅ Fake, determinístico só por conveniência de teste — não é chave nem segredo real, alerta explícito na UI de que não deve receber fundos de verdade |
| `npm run build` / `npm run lint` | ✅ Limpos, 25 rotas geradas |
| Teste manual: depósito → espera → confirmação → limite atualizado | ✅ Ver [[17 - Carteira e Caução]] pro passo a passo |

Nenhum achado de segurança nesta passada — ao contrário da rodada anterior (regressão de PII em `/offers`), este bucket não toca em nenhuma tela pública nem em dado de terceiro, só a visão da própria conta.

## 2026-08-07 (2) — Validação pós @username/OTP, Perfil/PIX e 2ª rodada de Ofertas & Ordens

Escopo: commits `a9a9484`..`7606c70` — conclusão do bucket Autenticação & Onboarding (`@username`, país/cidade, verificação dupla por OTP), bucket Perfil & Configurações completo (identidade, chaves PIX), e a 2ª rodada de Ofertas & Ordens (abas, reputação, modal de regras + senha, countdown de SLA).

### Segurança

| Checagem | Resultado |
|---|---|
| Segredos no histórico do Git (range desta passada) | ✅ Limpo — `git log a9a9484^..7606c70 -p` contra chaves privadas, API keys, `password=`, tokens AWS |
| `npm audit` | ✅ 0 vulnerabilidades |
| `dangerouslySetInnerHTML` / `innerHTML=` / `eval(` / `new Function(` | ✅ Única ocorrência continua sendo o bootstrap de tema em `layout.tsx` (já auditado, string estática) — nada novo |
| `target="_blank"` sem `rel="noopener noreferrer"` | ✅ Nenhuma ocorrência |
| Tipagem solta (`: any`, `as any`) nos arquivos novos/alterados | ✅ Nenhuma ocorrência |
| Geração de ID (ordens, chaves PIX, mensagens) | ✅ `crypto.randomUUID()` em todo lugar, nunca `Math.random()` |
| **Vazamento de PII na listagem pública de ofertas — REGRESSÃO ENCONTRADA E CORRIGIDA** | ⚠️→✅ A 2ª rodada de Ofertas & Ordens (reputação em `/offers`) tinha adicionado `order.clientName` visível na listagem pública, antes mesmo de um caixeiro aceitar a ordem — contradizendo o achado da auditoria de 2026-08-07 (1), que confirmava que `/offers` nunca mostrava o nome do cliente. Corrigido nesta mesma passada: o rótulo virou "Reputação do cliente" (mantém a funcionalidade de reputação sem reexpor o nome antes do vínculo entre as partes existir). Recompilado e testado no navegador após a correção. |
| Senha reconfirmada em `orders/new/order-rules-dialog.tsx` | ✅ Fica só em `useState` local, nunca logada (`console.*`), nunca enviada a lugar nenhum, nunca persistida — consistente com "validação de UI só" (não existe conta real pra checar contra ainda) |
| E-mail/telefone trafegando via query string entre `/register` → `/verify-email` → `/verify-phone` | ⚠️ Risco aceito e já documentado em [[13 - Autenticação e Onboarding]] — mesma muleta de prototipagem do `/kyc/status`, sem sessão real ainda. Fica registrado aqui de novo porque é PII (não só um enum de status): histórico do navegador e logs de servidor podem reter esses valores. Precisa sair assim que existir sessão real (Sprint 4) — não é aceitável em produção. |
| Trava de titularidade das chaves PIX (`type === "cpf"`) | ✅ Comparação client-side é só UX (feedback imediato) — documentado em [[16 - Perfil e Configurações]] que a regra dura é backend (Sprint 2); não há ilusão de que a checagem do frontend é a proteção real |
| IDOR — acesso a ordem de terceiro trocando o ID na URL | ✅ Continua bloqueado em `OrderDetail`, lógica não alterada por esta rodada (só leitura adicional de reputação da contraparte, que segue a mesma checagem de participante) |
| Headers de segurança (`next.config.ts`) | ✅ Intactos — `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy` |

### Estrutura e qualidade

| Checagem | Resultado |
|---|---|
| `npm run build` (produção) | ✅ Passa, 24 rotas geradas — inclui a correção de um erro real de build encontrado nesta janela (`otp-form.tsx` tipando `ZodType` sem o parâmetro `Input`, que derrubava os dois projetos Vercel conectados a este repositório; `next dev` não pega porque não roda o `tsc` completo) |
| `npm run lint` | ✅ 0 problemas |
| Idempotência da nova ação `EXPIRE` no reducer | ✅ Só aplica de `AWAITING_CLIENT_TRANSFER`; se o cliente já tiver marcado transferência antes do timer zerar, o disparo tardio de `EXPIRE` vira no-op — mesmo princípio do resto de `orders.tsx` |
| Teste manual de ponta a ponta | ✅ Cadastro → OTP e-mail → OTP celular → KYC; perfil com trava de titularidade de PIX (caso de erro e caso de sucesso) e troca de conta; abas Comprar/Vender, aceite com countdown visível, criação de ordem com modal de regras bloqueado até concordar + senha |

### Achado desta passada: regressão de PII, não um bug de ambiente

Diferente das duas passadas anteriores (que não encontraram problema de segurança novo), esta encontrou uma regressão real: a funcionalidade de reputação em `/offers`, ao ser implementada, reintroduziu a exposição do nome do cliente numa tela pública que uma auditoria anterior já tinha verificado como protegida. Fica registrado como lembrete de processo: **toda vez que uma tela pública ganha um campo novo, vale reconferir contra os achados de auditorias anteriores daquela mesma tela**, não só contra a lista de checagens genéricas.

### Não verificado (fora do alcance deste ambiente)

Mesma lista das passadas anteriores — seguem pendentes de ação no GitHub.com por um admin da organização: 2FA obrigatório, secret scanning, Dependabot, proteção da branch `main`.

### Conclusão

Um achado real (PII em `/offers`), corrigido na mesma sessão antes do commit. Fora isso, nenhuma vulnerabilidade nova, nenhum segredo no histórico, `npm audit` limpo, e o erro de build que já tinha derrubado dois deploys na Vercel (commit `a26fa58`) confirmado corrigido por este `npm run build` limpo.

## 2026-08-07 — Validação pós Autenticação & Onboarding + Ofertas & Ordens

Escopo: commits `8d79586`..`4ee8118` (telas de auth, backend fake de ordens, remoção do `next-themes`).

### Segurança

| Checagem | Resultado |
|---|---|
| Segredos no histórico do Git | ✅ Limpo — `git log --all -p` contra chaves privadas, API keys, certificados, `password=` |
| `npm audit` | ✅ 0 vulnerabilidades |
| `dangerouslySetInnerHTML` / `innerHTML=` / `eval(` / `new Function(` | ✅ Única ocorrência é o script de bootstrap de tema em `layout.tsx` — string estática, sem interpolação de dado de usuário |
| `target="_blank"` sem `rel="noopener noreferrer"` | ✅ Nenhuma ocorrência nova |
| Tipagem solta (`: any`, `as any`) | ✅ Nenhuma ocorrência em todo `src/` |
| Geração de ID de ordem | ✅ `crypto.randomUUID()` (Web Crypto API), não `Math.random()` |
| Cálculo de taxa financeira feito fora do "backend" simulado | ✅ Único lugar que multiplica `grossAmount` pela taxa é `src/lib/mock/pricing.ts` (a fronteira arquitetural); nenhuma tela calcula inline |
| `localStorage` com dado sensível | ✅ Só guarda preferência de tema (`light`/`dark`) |
| IDOR — acesso a ordem de terceiro trocando o ID na URL | ✅ `OrderDetail` bloqueia: cliente só vê as próprias ordens; caixeiro só vê as que aceitou ou ordens ainda `OPEN` (pra poder decidir se aceita) |
| Vazamento de PII na listagem pública de ofertas | ✅ `/offers` mostra só tipo, valor, método, cotação — nunca o nome do cliente que criou a ordem |
| Headers de segurança (`next.config.ts`) | ✅ Intactos desde a preparação do deploy — `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy` |

### Estrutura e qualidade

| Checagem | Resultado |
|---|---|
| `npm run build` (produção) | ✅ Passa, 21 rotas geradas |
| `npm run lint` | ✅ 0 problemas |
| Máquina de estados do "backend fake" | ✅ Cada ação do reducer valida o status atual antes de escrever (idempotência real), mesmo princípio do backend de verdade — ver [[14 - Ofertas e Ordens]] |
| Teste manual de ponta a ponta | ✅ Ciclo completo (aceitar → transferir → confirmar → TXID → confirmar final → avaliar) e criação de ordem testados clicando na UI, em build de produção |

### Achado nesta passada: bug de ambiente, não de código

Durante o teste manual, um erro de hidratação do React apareceu logo na primeira carga de qualquer página — inclusive a página 404 padrão do Next.js, sem nenhum código nosso envolvido. Isolado por bisecção (removendo tema, providers, scripts, um de cada vez) até confirmar que reproduz num Next.js 16.3.0 + Turbopack + React 19.2.8 "de fábrica". Não é uma falha desta aplicação. Como efeito colateral positivo da investigação, a dependência `next-themes` (sem atualização desde março de 2025, com uma issue pública documentada da mesma classe de erro) foi removida e substituída por uma implementação própria e pequena — reduz superfície de dependências não mantidas, mesmo não sendo a causa raiz do problema de ambiente.

### Não verificado (fora do alcance deste ambiente)

Mesma lista da passada anterior — seguem pendentes de ação no GitHub.com por um admin da organização: 2FA obrigatório, secret scanning, Dependabot, proteção da branch `main`.

### Conclusão

Nenhum problema de segurança encontrado no código ou no histórico desta passada. Regras de negócio críticas documentadas na Parte 1/Parte 4 (fronteira de cálculo financeiro, IDOR, idempotência, não expor motivo de bloqueio/risco) verificadas e presentes no protótipo, mesmo sem persistência real ainda.

## 2026-08-06 — Validação pós Design System (Sprint -1)

Escopo: todas as mudanças desde o setup inicial até a implementação completa do Design System (commits `62cd38d`..`04c36a1`).

### Segurança

| Checagem | Resultado |
|---|---|
| Segredos no histórico completo do Git (chaves privadas, API keys, certificados) | ✅ Limpo — vasculhado com `git log --all -p` contra padrões conhecidos |
| `data.json` dos plugins do Obsidian (API key + chave privada TLS) versionado por engano | ✅ Confirmado fora do Git (`git ls-files` não lista nenhum `data.json`) |
| Vulnerabilidades de dependência (`npm audit`) | ✅ 0 vulnerabilidades |
| `dangerouslySetInnerHTML`, `eval`, `target="_blank"` sem `rel="noopener noreferrer"` | ✅ Nenhuma ocorrência no código próprio |
| Links de navegação interna usam `next/link` (não `<a>` cru) | ✅ Sidebar e BottomNav corretos |
| Servidor MCP/REST API do Obsidian exposto na rede local | ✅ Vinculado só a `127.0.0.1`, testado via IP da LAN (recusa conexão) |
| `next.config.ts` com configuração insegura (`ignoreBuildErrors`, domínios de imagem abertos, etc.) | ✅ Config padrão, nada flexibilizado |

### Estrutura e qualidade

| Checagem | Resultado |
|---|---|
| `npm run build` | ✅ Passa, todas as 15 rotas geradas |
| `npm run lint` | ✅ 0 problemas |
| Estrutura de pastas segue o documentado em [[10 - Design System]] / [[09 - Roadmap de Sprints]] (`components/ui`, `components/layout`, `components/shared`, `types/`) | ✅ Consistente |
| `tsconfig.json` incluindo `docs/**` na checagem de tipos | ⚠️ Encontrado e corrigido — mesma classe de problema que já tinha acontecido no ESLint (ver abaixo), o `exclude` só tinha `node_modules`. Adicionado `docs/**`. |

### Achados corrigidos nesta e nas passadas anteriores

1. **`--font-sans` autorreferenciado** em `globals.css` (apontava pra si mesmo em vez de `var(--font-geist-sans)`) — tipografia caía no fallback do navegador silenciosamente. Corrigido no card de tokens de tema.
2. **ESLint escaneando os plugins do Obsidian** (`docs/.obsidian/plugins/**`, 4.7MB de código minificado de terceiros) — gerava milhares de erros irrelevantes. Excluído via `eslint.config.mjs`.
3. **`react-hooks/set-state-in-effect`** no `ThemeToggle` — `useEffect` chamando `setState` diretamente. Substituído por `useSyncExternalStore` (padrão recomendado pra detectar client-mount).
4. **`tsconfig.json` com o mesmo problema do item 2**, não pego antes porque os arquivos dos plugins são `.js`, não `.ts` — mas ficava vulnerável ao mesmo tipo de falha se algo `.ts`/`.tsx` aparecesse em `docs/`. Corrigido nesta passada.

### Não verificado (fora do alcance deste ambiente)

Os itens abaixo dependem de configuração direta no GitHub.com e não podem ser confirmados por aqui — ver conversa anterior sobre auditoria do repositório:

- 2FA obrigatório na organização
- Secret scanning + push protection habilitados
- Dependabot alerts ativo
- Proteção de branch `main` (hoje sem exigência de PR/review)

### Conclusão

Nenhum problema de segurança pendente no código ou no histórico. Dois achados de estrutura/qualidade corrigidos na hora. O item de processo "validar design system com a equipe" continua em aberto no [[Kanban]] — auditoria técnica não substitui esse aval.
