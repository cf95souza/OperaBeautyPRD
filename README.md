# OperaBeauty — SaaS Multi-Tenant para Salões de Beleza & Clínicas de Estética

[![Node.js Version](https://img.shields.io/badge/Node.js-v20%2B-green.svg)](https://nodejs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-blue.svg)](https://www.postgresql.org/)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED.svg)](https://www.docker.com/)
[![React](https://img.shields.io/badge/React-19-61DAFB.svg)](https://react.dev/)
[![License](https://img.shields.io/badge/License-Proprietary-red.svg)]()

> **Plataforma SaaS White-Label Multi-Tenant completa para gestão, agendamento online e fidelização de salões de beleza, clínicas de estética, estúdios de manicure e profissionais autônomos.**

---

## 1. Visão Geral da Arquitetura

O OperaBeauty é projetado para alta concorrência, tolerância a falhas e segurança com isolamento multi-tenant rigoroso em profundidade:

```mermaid
graph TD
    Client["Navegador / PWA (Cliente / Gestor / Super Admin)"] -->|HTTPS / WSS| Caddy["Caddy Reverse Proxy (Porta 80/443)"]
    Caddy -->|Arquivos Estáticos SPA| Frontend["Frontend (Vite / React 19)"]
    Caddy -->|/api/*| API["Backend API (Node.js 20 / Express)"]
    API -->|Pool Seguro (opera_app)| PostgreSQL["PostgreSQL 16 (RLS / Multi-Tenant)"]
    API -->|Filas e Cache| Redis["Redis 7 (BullMQ / Sessões)"]
    API -->|M2M Auth| WAGateway["Gateway WhatsApp (Baileys)"]
```

### Principais Pilares Técnicos
- **Frontend**: React 19, Vite, TailwindCSS (Design System "Rosé Editorial"), Lucide Icons, Recharts, PWA nativo.
- **Backend**: Node.js 20 ESM, Express, Zod (validação estrita de contratos), Pino Logger com rotação de logs.
- **Banco de Dados**: PostgreSQL 16 com **Row Level Security (RLS)** em todas as tabelas e princípio do menor privilégio (`opera_app`).
- **Cache & Filas**: Redis 7 com BullMQ para lembretes de agendamento e notificações push/WhatsApp.
- **Infraestrutura**: Docker Compose em VPS Linux, Caddy com auto-HTTPS e compressão Zstandard/Gzip.
- **CI/CD & Observabilidade**: GitHub Actions com Quality Gate, publicação no GHCR, rollback em 1 comando e monitoramento de saúde do sistema (`/health/system`).

---

## 2. Estrutura do Repositório

```text
OperaBeauty/
├── backend/                   # API Express, rotas, regras de negócio e serviços
│   ├── config/                # Conexões de banco (pg pool), redis e configurações
│   ├── middlewares/           # Autenticação JWT, isolamento de tenant, validação Zod
│   ├── routes/                # Controladores REST desacoplados
│   ├── services/              # Camada de lógica de negócio pura (transacional)
│   ├── tests/                 # Suíte completa de testes automatizados Jest
│   └── Dockerfile             # Imagem conteinerizada desprivilegiada (nodeuser)
├── gateway-whatsapp/          # Microsserviço de mensageria WhatsApp via Baileys
├── migrations/                # Migrações versionadas SQL com suporte a UP e DOWN
├── scripts/                   # Ferramenta de migrações (migrate.js), rollback e monitoramento
├── docs/                      # Manuais operacionais, arquitetura e changelog
│   ├── arquitetura.md         # Documento arquitetural detalhado do sistema
│   ├── deploy.md              # Guia operacional de CI/CD, GHCR e Rollback
│   ├── monitoramento.md       # Guia de telemetria, observabilidade e alertas
│   ├── migracoes.md           # Guia de migrações transacionais e baseline
│   └── changelog.md           # Histórico cronológico de entregas e releases
├── src/                       # Frontend Single Page Application (React)
│   ├── components/            # Componentes visuais atômicos do Design System
│   ├── pages/                 # Telas do Cliente, Painel Gestor e Super Admin
│   ├── lib/                   # Cliente HTTP (api.js), formatação e utilitários
│   └── hooks/                 # Custom React Hooks (autenticação, tenant, tema)
├── docker-compose.yml         # Orquestração principal de produção
├── docker-compose.staging.yml # Ambiente isolado de homologação / staging
└── init.sql                   # Baseline canônico e estrutura DDL do PostgreSQL
```

---

## 3. Inicialização Rápida

### 3.1 Pré-requisitos
- [Node.js](https://nodejs.org/) v20 ou superior
- [Docker](https://www.docker.com/) e Docker Compose
- [Git](https://git-scm.com/)

### 3.2 Configuração de Ambiente
Copie os modelos de variáveis de ambiente:
```bash
cp .env.example .env
cp backend/.env.example backend/.env
```
Edite o arquivo `.env` preenchendo as chaves criptográficas (`JWT_SECRET`, `ENCRYPTION_KEY`, `INTERNAL_SECRET`, etc.).

### 3.3 Executando com Docker Compose (Recomendado)
Para subir todo o ecossistema completo (PostgreSQL, Redis, API, Gateway WhatsApp e Caddy):
```bash
docker compose up -d
```
Acesse:
- **Frontend SPA**: [http://localhost:8080/](http://localhost:8080/)
- **API Healthcheck**: [http://localhost:5001/health](http://localhost:5001/health)
- **Telemetria de Sistema**: [http://localhost:5001/health/system](http://localhost:5001/health/system)

### 3.4 Executando em Modo de Desenvolvimento Local
Para desenvolvimento com Hot-Reload:

1. **Suba apenas os serviços de infraestrutura:**
   ```bash
   docker compose up -d db redis
   ```

2. **Inicie o Backend:**
   ```bash
   cd backend
   npm install
   npm run dev
   ```

3. **Inicie o Frontend:**
   ```bash
   npm install
   npm run dev
   ```
   Acesse: [http://localhost:5173/](http://localhost:5173/)

---

## 4. Testes Automatizados

O sistema conta com suítes de testes automatizados (Jest) cobrindo regras de negócio, contratos de API, isolamento de tenant, integridade monetária e observabilidade:

```bash
# Rodar todos os testes do backend
cd backend
npm test

# Rodar testes específicos dos fluxos de dinheiro (G5)
npm test -- tests/fluxosDinheiroG5.test.js

# Rodar testes da ferramenta de migrações (G4)
npm test -- tests/ferramentaMigracoesG4.test.js

# Rodar testes de monitoramento e telemetria (G3)
npm test -- tests/monitoramentoG3.test.js
```

---

## 5. Gerenciamento de Banco de Dados e Migrações

O OperaBeauty possui motor próprio de migrações transacionais (`scripts/migrate.js`) com suporte nativo a rollback em lote e cálculo de integridade SHA-256:

```bash
# Verificar status das migrações
npm run migrate:status

# Aplicar migrações pendentes
npm run migrate:up

# Reverter último lote aplicado (Rollback)
npm run migrate:down

# Criar nova migração com timestamp
npm run migrate:create nome_da_migracao

# Registrar baseline em instâncias legadas
npm run migrate:baseline
```
Para mais detalhes, consulte o [Guia de Migrações](docs/migracoes.md).

---

## 6. Documentação Detalhada

- [Arquitetura do Sistema](docs/arquitetura.md) — Visão técnica aprofundada, contratos e RLS.
- [Manual de Deploy e Rollback](docs/deploy.md) — Fluxo de CI/CD, GHCR, staging e recuperação de desastres.
- [Manual de Monitoramento](docs/monitoramento.md) — Métricas de telemetria, UptimeRobot e alertas da VPS.
- [Changelog Oficial](docs/changelog.md) — Histórico cronológico de versões e entregas.

---

## 7. Licença

Este software é proprietário e confidencial. Todos os direitos reservados à OperaBeauty Tecnologia.
