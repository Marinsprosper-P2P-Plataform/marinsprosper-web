---
tags: [segurança, qualidade, auditoria]
---

← [[10 - Design System]] | [[Início]]

# Auditorias e validações

Registro cronológico de passadas de verificação sobre o repositório — segurança, estrutura, qualidade. Não substitui o checklist formal de auditoria de [[04 - Documentação de Segurança]] (esse é para quando houver dinheiro real em jogo); é o equivalente leve para o dia a dia do frontend.

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
