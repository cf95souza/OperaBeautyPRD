# Plano de Execução do System Quality Gate

**Projeto:** OperaBeauty SaaS Multi-Tenant  
**Data:** 03/11/2026  
**Ambiente Alvo:** Local (Docker Desktop)  
**Ambiente de Produção (Referência):** VPS Ubuntu Linux (PostgreSQL, Docker Containers, Caddy TLS)  
**Status de Produção:** 1 salão cliente em operação real  
**Classificação de Risco:** **CRÍTICO** (Multi-tenant, pagamentos, agendamentos concorrentes e cliente real em produção)

---

## 1. Objetivos da Avaliação

1. Inspecionar o repositório e validar a integridade estrutural da stack.
2. Executar a pirâmide de testes completa (análise estática, testes unitários, testes de arquitetura e segurança).
3. Avaliar a integridade do banco de dados PostgreSQL e migrações.
4. Auditar a camada de cache (Redis) e comportamento de resiliência.
5. Mensurar a capacidade e latência sob concorrência através de testes de carga controlados.
6. Gerar evidências auditáveis e plano de remediação para resguardar a operação do cliente de produção.

---

## 2. Escopo dos Testes

| Camada | Ferramenta / Método | Alvo |
|---|---|---|
| **Análise Estática & Lint** | ESLint 9 | Repositório completo (`eslint .`) |
| **Compilação de Produção** | Vite 8 + PostCSS + Tailwind v4 | Frontend (`npm run build`) |
| **Suíte Automatizada** | Jest 30 | Backend (`backend/tests/`) com 80 suítes e 833 testes |
| **Banco de Dados** | PostgreSQL 16 Alpine | Pool de conexões, fuso horário, migrations |
| **Cache & Mensageria** | Redis 7 + BullMQ | Isolamento por tenant, fallback em caso de indisponibilidade |
| **Desempenho & Carga** | Autocannon + k6 scripts | Endpoints `/health`, `/health/complete` e rotas públicas |
| **Segurança & Governança** | Verificação de segredos e isolamento | `.gitignore`, `.env.example`, desindexação de bundles |

---

## 3. Thresholds de Aprovação (SLOs)

- `http_req_failed`: < 1%
- `p95 latência`: < 2.000 ms
- `p99 latência`: < 5.000 ms
- `Checks funcionais`: >= 99%
- `Conexões sem vazamento`: Pool do Postgres com liberação imediata
- `Segurança de Produção`: Nenhuma operação destrutiva ou carga descontrolada na VPS.

