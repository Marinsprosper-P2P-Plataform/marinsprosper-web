---
tags: [deploy, infra, frontend]
---

← [[11 - Auditorias e Validações]] | [[Início]]

# Deploy — Vercel

Registro do que foi preparado no lado do repositório para o deploy no Vercel, e do que ainda depende de uma ação manual sua/do Rene fora daqui.

## O que já está pronto no código

- **Headers de segurança básicos** (`next.config.ts`, função `headers()`): `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` bloqueando câmera/microfone/geolocalização por padrão. Aplicados a toda rota (`/:path*`).
  - Não incluí uma `Content-Security-Policy` ainda — uma CSP mal configurada quebra silenciosamente scripts/estilos do Next.js, e ajustar isso direito exige testar contra as telas reais. Fica para o hardening do Sprint 5 ([[09 - Roadmap de Sprints]]).
- **`engines.node` fixado** em `package.json` (`>=20.9.0`) — evita que o Vercel (ou qualquer CI futuro) tente buildar numa versão de Node incompatível com o Next 16.
- **Build e lint validados** localmente antes de cada commit (ver [[11 - Auditorias e Validações]] para o histórico de checagens).
- `.gitignore` já cobre `.vercel` (pasta de configuração local que o CLI do Vercel cria ao linkar um projeto).

## O que depende de ação manual (fora do meu alcance)

O Vercel se conecta ao GitHub via um **GitHub App**, que precisa ser autorizado por um admin/owner da organização `Marinsprosper-P2P-Plataform` — isso é uma concessão de permissão OAuth que só acontece com uma pessoa de verdade logada, clicando o botão. Passo a passo:

1. Login em [vercel.com](https://vercel.com) com "Continue with GitHub"
2. `Add New` → `Project` → autorizar o GitHub App na organização (redireciona pro GitHub, ou direto em `github.com/organizations/Marinsprosper-P2P-Plataform/settings/installations`)
3. Escopo recomendado: `Only select repositories` → adicionar só `marinsprosper-web`
4. Importar o repositório, confirmar Framework Preset = Next.js, Root Directory = `.`
5. Configurar `NEXT_PUBLIC_API_URL` e `NEXT_PUBLIC_WS_URL` (ver [.env.example](../../.env.example)) — apontam pro ambiente de teste do backend numa VM própria (`https://api.163-176-220-125.sslip.io`, não é produção); pedir pro time de backend acrescentar o domínio do Vercel em `CORS_ORIGINS` antes do primeiro deploy, ver [[21 - Integração com API Real]] §0
6. Deploy

## Depois que o deploy existir

Atualizar este documento com:
- URL de produção (`*.vercel.app` ou domínio próprio)
- Se o domínio próprio (`marinsprosper.com` ou o que for escolhido) foi configurado
- Confirmação de que `NEXT_PUBLIC_API_URL`/`NEXT_PUBLIC_WS_URL` foram atualizadas quando o backend for implantado

## Pendências de segurança do repositório GitHub (não é sobre o Vercel, mas relacionado)

Já levantadas antes e ainda em aberto — ver conversa/checklist: 2FA obrigatório na org, secret scanning + push protection, Dependabot, proteção da branch `main`. Nenhuma delas bloqueia o deploy no Vercel, mas valem ser resolvidas antes da Fase 2.
