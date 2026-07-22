# 🗺️ PLANO DE IMPLEMENTAÇÃO E DEPLOY — OperaBeauty SaaS v2

Este documento estabelece o cronograma passo a passo de desenvolvimento, segurança e infraestrutura para corrigir as 27 vulnerabilidades encontradas na auditoria de pré-produção e realizar o deploy seguro do sistema na VPS na segunda-feira.

---

## 📅 CRONOGRAMA GERAL

```mermaid
gantt
    title Cronograma de Deploy - OperaBeauty
    dateFormat  YYYY-MM-DD
    section Segurança Lógica
    Fase 1: Correções de Código & RLS (P0)      :active, a1, 2026-07-11, 1d
    section Docker & HTTPS
    Fase 2: Hardening de Containers & Proxy (P1) :a2, 2026-07-11, 1d
    section Proteções Operacionais
    Fase 3: Rate Limiting & Validações (P2)      :a3, 2026-07-12, 1d
    section Deploy & VPS
    Fase 4: Backup, Firewall, Monitoramento & LGPD :a4, 2026-07-13, 1d
    section Testes & CI/CD
    Fase 5: Pipeline & Testes Automatizados     :a5, 2026-07-13, 1d
```

---

## 🛠️ FASE 1: Correções Críticas de Segurança Lógica (Sábado)
**Meta:** Mitigar os riscos de invasão imediata, vazamento de dados entre inquilinos (IDOR) e vazamento de hashes de senhas.

- [x] **1.1. Rotação e Eliminação de Secrets Expostos (FINDING-01 & FINDING-02)**
  - > [!IMPORTANT]
  - > **Instrução:** Ler os itens [FINDING-01](file:///d:/Repositorios/OperaBeauty/relatorio_auditoria_producao_v2.md#FINDING-01) (Secrets no repositório) e [FINDING-02](file:///d:/Repositorios/OperaBeauty/relatorio_auditoria_producao_v2.md#FINDING-02) (Credenciais do PostgreSQL hardcoded) no [relatorio_auditoria_producao_v2.md](file:///d:/Repositorios/OperaBeauty/relatorio_auditoria_producao_v2.md) antes de iniciar.
  - [x] Remover fallbacks estáticos de `JWT_SECRET` e `POSTGRES_PASSWORD` do [docker-compose.yml](file:///d:/Repositorios/OperaBeauty/docker-compose.yml).
  - [x] Certificar que o servidor backend pare (`process.exit(1)`) se o `JWT_SECRET` não estiver presente na inicialização.
  - [x] Gerar um `JWT_SECRET` de 64 caracteres criptográficos no ambiente de produção.
- [x] **1.2. Correção de Isolamento Multi-Tenant e IDOR (FINDING-06)**
  - > [!IMPORTANT]
  - > **Instrução:** Ler o item [FINDING-06](file:///d:/Repositorios/OperaBeauty/relatorio_auditoria_producao_v2.md#FINDING-06) (Isolamento Multi-Tenant Insuficiente - IDOR) no [relatorio_auditoria_producao_v2.md](file:///d:/Repositorios/OperaBeauty/relatorio_auditoria_producao_v2.md) antes de iniciar.
  - [x] Adicionar `authMiddleware` às rotas de cupons (`routes/coupons.js`): listagem, busca por ID e resgate.
  - [x] Modificar `GET /staff` em `routes/staff.js` para exigir token do usuário autenticado e verificar se o `tenant_id` consultado é idêntico ao do JWT.
  - [x] Na rota `POST /appointments`, verificar explicitamente no backend se o `client_id` enviado no body realmente pertence ao `tenant_id` do JWT antes de salvar.
  - [x] Adicionar validação de permissão (`requireRole(['manager', 'professional'])`) no endpoint `GET /clients/:id` para evitar acesso de clientes comuns a perfis alheios.
- [x] **1.3. Cifragem e Proteção de Chaves de API de Gateways (FINDING-05 & FINDING-04)**
  - > [!IMPORTANT]
  - > **Instrução:** Ler os itens [FINDING-04](file:///d:/Repositorios/OperaBeauty/relatorio_auditoria_producao_v2.md#FINDING-04) (Endpoint payment-gateway sem autenticação) e [FINDING-05](file:///d:/Repositorios/OperaBeauty/relatorio_auditoria_producao_v2.md#FINDING-05) (API Keys retornadas via API) no [relatorio_auditoria_producao_v2.md](file:///d:/Repositorios/OperaBeauty/relatorio_auditoria_producao_v2.md) antes de iniciar.
  - [x] Criar serviço ou utilitário de criptografia (AES-256-GCM) no backend para cifrar `gateway_api_key` antes de inserir no banco.
  - [x] Mascarar o retorno da chave de API nas rotas de superadmin (`superadmin.js`), exibindo apenas `****...XXXX` no painel.
  - [x] Adicionar `authMiddleware` na rota `GET /settings/payment-gateway` em `routes/settings.js`.
- [x] **1.4. Correção do Fluxo e RPC de Login de Staff (FINDING-08 & FINDING-22)**
  - > [!IMPORTANT]
  - > **Instrução:** Ler os itens [FINDING-08](file:///d:/Repositorios/OperaBeauty/relatorio_auditoria_producao_v2.md#FINDING-08) (Login de staff inconsistente email vs phone) e [FINDING-22](file:///d:/Repositorios/OperaBeauty/relatorio_auditoria_producao_v2.md#FINDING-22) (Função SQL cap_register_staff com excesso de parâmetros) no [relatorio_auditoria_producao_v2.md](file:///d:/Repositorios/OperaBeauty/relatorio_auditoria_producao_v2.md) antes de iniciar.
  - [x] Corrigir a função SQL `cap_login_staff` no PostgreSQL para buscar funcionários pelo campo `email` e não por `phone`.
  - [x] Atualizar a documentação no [database.md](file:///d:/Repositorios/OperaBeauty/database.md).
  - [x] Corrigir os parâmetros enviados no JavaScript em `services/staffService.js` (L37) para coincidir exatamente com a assinatura da RPC `cap_register_staff` (remover o parâmetro extra/órfão `email` se a function não o suportar diretamente na mesma ordem).
- [x] **1.5. Proteção de Dados Sensíveis e Remoção de `RETURNING *` (FINDING-26)**
  - > [!IMPORTANT]
  - > **Instrução:** Ler o item [FINDING-26](file:///d:/Repositorios/OperaBeauty/relatorio_auditoria_producao_v2.md#FINDING-26) (RETURNING * retorna password_hash) no [relatorio_auditoria_producao_v2.md](file:///d:/Repositorios/OperaBeauty/relatorio_auditoria_producao_v2.md) antes de iniciar.
  - [x] Refatorar queries SQL substituindo o `SELECT *` e `RETURNING *` por projeções explícitas de colunas, garantindo que o `password_hash` nunca trafegue na memória ou em logs.

---

## 🐳 FASE 2: Hardening de Containers, Proxy Reverso e HTTPS (Sábado/Domingo)
**Meta:** Configurar a infraestrutura Docker de forma profissional para hospedar a aplicação na VPS e forçar tráfego TLS/HTTPS.

- [x] **2.1. Criação do Dockerfile Multi-Stage Seguro (FINDING-10)**
  - > [!IMPORTANT]
  - > **Instrução:** Ler o item [FINDING-10](file:///d:/Repositorios/OperaBeauty/relatorio_auditoria_producao_v2.md#FINDING-10) (Dockerfile sem multi-stage e rodando como root) no [relatorio_auditoria_producao_v2.md](file:///d:/Repositorios/OperaBeauty/relatorio_auditoria_producao_v2.md) antes de iniciar.
  - [x] Refatorar o [Dockerfile](file:///d:/Repositorios/OperaBeauty/backend/Dockerfile) usando Multi-Stage Build (separar dependências de build de execução).
  - [x] Adicionar usuário do sistema não-root (`nodeuser`) no Alpine e forçar a execução sob esse contexto.
  - [x] Adicionar diretiva `HEALTHCHECK` no Dockerfile chamando a rota `/health` com wget/curl.
  - [x] Criar o arquivo `.dockerignore` contendo `.env`, `node_modules`, `tests` e documentações.
- [x] **2.2. Isolamento de Redes no Compose e Fechamento de Portas (FINDING-02 & FINDING-11)**
  - > [!IMPORTANT]
  - > **Instrução:** Ler os itens [FINDING-02](file:///d:/Repositorios/OperaBeauty/relatorio_auditoria_producao_v2.md#FINDING-02) (Porta 5432 exposta publicamente) e [FINDING-11](file:///d:/Repositorios/OperaBeauty/relatorio_auditoria_producao_v2.md#FINDING-11) (docker-compose sem redes customizadas ou healthchecks) no [relatorio_auditoria_producao_v2.md](file:///d:/Repositorios/OperaBeauty/relatorio_auditoria_producao_v2.md) antes de iniciar.
  - [x] Remover a exposição direta da porta `5432` no `docker-compose.yml` para o público. O banco de dados PostgreSQL deve ficar isolado na rede interna Docker.
  - [x] Configurar uma rede bridge personalizada (ex: `operabeauty-network`).
  - [x] Adicionar `healthcheck` ao serviço `db` para que o backend (`api`) espere até que o PostgreSQL esteja respondendo a queries antes de tentar inicializar.
- [x] **2.3. Reverse Proxy e Automação de TLS/HTTPS (FINDING-18)**
  - > [!IMPORTANT]
  - > **Instrução:** Ler o item [FINDING-18](file:///d:/Repositorios/OperaBeauty/relatorio_auditoria_producao_v2.md#FINDING-18) (Ausência de Reverse Proxy e TLS no setup) no [relatorio_auditoria_producao_v2.md](file:///d:/Repositorios/OperaBeauty/relatorio_auditoria_producao_v2.md) antes de iniciar.
  - [x] Adicionar serviço `caddy` ou `nginx-certbot` no `docker-compose.yml` para interceptar as portas `80` e `443`.
  - [x] Configurar a renovação automática de certificado Let's Encrypt.
  - [x] Mapear as requisições do domínio principal para o build estático do frontend, e subdomínios/caminho `/api/*` para o container do backend.
- [x] **2.4. Criação de Swap e Configuração de Limites de Log no Docker (FINDING-28 & FINDING-29)**
  - > [!IMPORTANT]
  - > **Instrução:** Ler os itens [FINDING-28](file:///d:/Repositorios/OperaBeauty/relatorio_auditoria_producao_v2.md#FINDING-28) (Out-Of-Memory na VPS / Swap) e [FINDING-29](file:///d:/Repositorios/OperaBeauty/relatorio_auditoria_producao_v2.md#FINDING-29) (Acúmulo infinito de logs do Docker) no [relatorio_auditoria_producao_v2.md](file:///d:/Repositorios/OperaBeauty/relatorio_auditoria_producao_v2.md) antes de iniciar.
  - [x] Configurar um arquivo Swap de 2GB ou mais no sistema operacional da VPS para prevenir crash do container PostgreSQL.
  - [x] Adicionar limites de tamanho e rotação de logs (`logging` driver `json-file` com no máximo 10m por arquivo) em cada serviço do `docker-compose.yml` ou no `daemon.json` global da VPS.

---

## 🔒 FASE 3: Proteções Operacionais, Validações e Sessões (Domingo)
**Meta:** Impedir abusos, ataques de força bruta, sequestro de sessões e inconsistências de dados na API.

- [x] **3.1. Rate Limiting Global e Cabeçalhos Helmet (FINDING-12 & FINDING-15)**
  - > [!IMPORTANT]
  - > **Instrução:** Ler os itens [FINDING-12](file:///d:/Repositorios/OperaBeauty/relatorio_auditoria_producao_v2.md#FINDING-12) (Rate Limiting restrito ao login) e [FINDING-15](file:///d:/Repositorios/OperaBeauty/relatorio_auditoria_producao_v2.md#FINDING-15) (Headers HTTP de segurança incompletos) no [relatorio_auditoria_producao_v2.md](file:///d:/Repositorios/OperaBeauty/relatorio_auditoria_producao_v2.md) antes de iniciar.
  - [x] Configurar o `express-rate-limit` globalmente no backend (`app.js`), limitando requisições genéricas (ex: 200 reqs por 15min) por IP.
  - [x] Customizar o `helmet` adicionando políticas estritas de `Referrer-Policy` e `Permissions-Policy`.
- [x] **3.2. Validação Completa Zod e Política de Senhas (FINDING-13 & FINDING-19)**
  - > [!IMPORTANT]
  - > **Instrução:** Ler os itens [FINDING-13](file:///d:/Repositorios/OperaBeauty/relatorio_auditoria_producao_v2.md#FINDING-13) (Política de senhas fraca) e [FINDING-19](file:///d:/Repositorios/OperaBeauty/relatorio_auditoria_producao_v2.md#FINDING-19) (Ausência de validação Zod nas rotas de agendamento) no [relatorio_auditoria_producao_v2.md](file:///d:/Repositorios/OperaBeauty/relatorio_auditoria_producao_v2.md) antes de iniciar.
  - [x] Adicionar schemas de validação Zod para as rotas de agendamento em `routes/appointments.js` (`POST /` e `PUT /:id`).
  - [x] Atualizar os schemas Zod de senha em todo o backend para exigir um mínimo de 8 caracteres, exigindo ao menos 1 letra maiúscula, 1 minúscula e 1 caractere especial.
- [x] **3.3. Proteção e Fortalecimento de Sessões (FINDING-07 & FINDING-16)**
  - > [!IMPORTANT]
  - > **Instrução:** Ler os itens [FINDING-07](file:///d:/Repositorios/OperaBeauty/relatorio_auditoria_producao_v2.md#FINDING-07) (Refresh token sem binding de dispositivo) e [FINDING-16](file:///d:/Repositorios/OperaBeauty/relatorio_auditoria_producao_v2.md#FINDING-16) (Cookie sameSite lax inadequado para domínios distintos) no [relatorio_auditoria_producao_v2.md](file:///d:/Repositorios/OperaBeauty/relatorio_auditoria_producao_v2.md) antes de iniciar.
  - [x] Alterar as configurações do cookie do refresh token para usar `sameSite: 'none'` e `secure: true` se o deploy de frontend for hospedado em provedores externos (como Vercel) e o backend na VPS.
  - [x] Adicionar colunas `ip_address` e `user_agent` na tabela `cap_refresh_tokens` e validar se correspondem a cada tentativa de refresh.
  - [x] Implementar rotação de refresh token (invalidação imediata de toda a árvore de tokens se um refresh token antigo/reutilizado for apresentado).
- [x] **3.4. Prevenção de Enumeração de Usuários (FINDING-14)**
  - > [!IMPORTANT]
  - > **Instrução:** Ler o item [FINDING-14](file:///d:/Repositorios/OperaBeauty/relatorio_auditoria_producao_v2.md#FINDING-14) (Endpoint check-phone permite enumeração de usuários) no [relatorio_auditoria_producao_v2.md](file:///d:/Repositorios/OperaBeauty/relatorio_auditoria_producao_v2.md) antes de iniciar.
  - [x] Remover o endpoint `/auth/check-phone` ou modificá-lo para não revelar explicitamente se um telefone já está cadastrado (responder de forma genérica).

---

## 🚀 FASE 4: Backup, Logs, Segurança do Host e LGPD (Segunda-feira - Manhã)
**Meta:** Executar o deploy no ambiente de VPS da empresa de maneira estruturada e em conformidade legal.

- [x] **4.1. Configuração do UFW (Firewall da VPS) (FINDING-18)**
  - > [!IMPORTANT]
  - > **Instrução:** Ler o item [FINDING-18](file:///d:/Repositorios/OperaBeauty/relatorio_auditoria_producao_v2.md#FINDING-18) (Ausência de Firewall e Hardening de VPS) no [relatorio_auditoria_producao_v2.md](file:///d:/Repositorios/OperaBeauty/relatorio_auditoria_producao_v2.md) antes de iniciar.
  - [x] Configurar firewall nativo do Linux Ubuntu Server da VPS.
  - [x] Permitir apenas conexões SSH na porta segura (customizada ou 22 restrita), HTTP (80) e HTTPS (443).
- [x] **4.2. Backup Automatizado do PostgreSQL (FINDING-23)**
  - > [!IMPORTANT]
  - > **Instrução:** Ler o item [FINDING-23](file:///d:/Repositorios/OperaBeauty/relatorio_auditoria_producao_v2.md#FINDING-23) (Ausência de rotina de Backup do Banco) no [relatorio_auditoria_producao_v2.md](file:///d:/Repositorios/OperaBeauty/relatorio_auditoria_producao_v2.md) antes de iniciar.
  - [x] Criar script shell na VPS para realizar o `pg_dump` do container `operabeauty-db`.
  - [x] Configurar o utilitário `cron` do Linux para disparar o backup diariamente às 03:00 da manhã.
  - [x] Cifrar os dumps e enviar de forma automática para um repositório de arquivos seguro/privado.
- [x] **4.3. Monitoramento de Logs e Limpeza de Lixo (FINDING-09 & FINDING-25)**
  - > [!IMPORTANT]
  - > **Instrução:** Ler os itens [FINDING-09](file:///d:/Repositorios/OperaBeauty/relatorio_auditoria_producao_v2.md#FINDING-09) (Falta de remoção de tokens expirados) e [FINDING-25](file:///d:/Repositorios/OperaBeauty/relatorio_auditoria_producao_v2.md#FINDING-25) (Ausência de monitoramento de logs e health checks robustos) no [relatorio_auditoria_producao_v2.md](file:///d:/Repositorios/OperaBeauty/relatorio_auditoria_producao_v2.md) antes de iniciar.
  - [x] Criar cron/job periódico no banco de dados para executar `DELETE FROM public.cap_refresh_tokens WHERE expires_at < NOW()` diariamente.
  - [x] Implementar configuração de rotatividade de logs do Pino (backend) para não estourar o disco.
  - [x] Criar um endpoint `/health/complete` no backend que efetue um `SELECT 1` no banco e verifique o pool de conexões (FINDING-25), além de disparar alertas básicos em webhooks (ex: Discord ou Telegram) quando o backend disparar exceções `500` não tratadas.
- [x] **4.4. LGPD Compliance (FINDING-27)**
  - > [!IMPORTANT]
  - > **Instrução:** Ler o item [FINDING-27](file:///d:/Repositorios/OperaBeauty/relatorio_auditoria_producao_v2.md#FINDING-27) (Falta de mecanismos de conformidade com a LGPD) no [relatorio_auditoria_producao_v2.md](file:///d:/Repositorios/OperaBeauty/relatorio_auditoria_producao_v2.md) antes de iniciar.
  - [x] Adicionar funcionalidade ou termo explícito de consentimento e aceite dos termos de privacidade antes do primeiro login/cadastro.
  - [x] Desenvolver no painel do Gestor/Cliente as rotas para exclusão lógica dos dados pessoais (anonimização) ou exportação sob demanda.
- [x] **4.5. Hardening de SSH e Fail2ban (FINDING-30)**
  - > [!IMPORTANT]
  - > **Instrução:** Ler o item [FINDING-30](file:///d:/Repositorios/OperaBeauty/relatorio_auditoria_producao_v2.md#FINDING-30) (Acesso SSH sem hardening e força bruta) no [relatorio_auditoria_producao_v2.md](file:///d:/Repositorios/OperaBeauty/relatorio_auditoria_producao_v2.md) antes de iniciar.
  - [x] Desabilitar o login SSH por senha pura e permitir estritamente login por chaves públicas e privadas.
  - [x] Configurar e ativar o Fail2ban no Linux para banir IPs automatizados que realizem varreduras e tentativas de conexão falhas na VPS.

---

## 🧪 FASE 5: Homologação, Testes e Pipeline CI/CD (Segunda-feira - Tarde)
**Meta:** Garantir que novas alterações não quebrem as regras de segurança e agilizar futuras atualizações de código.

- [x] **5.1. Escrita de Testes Focados em Segurança (FINDING-17)**
  - > [!IMPORTANT]
  - > **Instrução:** Ler o item [FINDING-17](file:///d:/Repositorios/OperaBeauty/relatorio_auditoria_producao_v2.md#FINDING-17) (Falta de cobertura de testes automatizados de API) no [relatorio_auditoria_producao_v2.md](file:///d:/Repositorios/OperaBeauty/relatorio_auditoria_producao_v2.md) antes de iniciar.
  - [x] Criar suíte de testes de integração (`tests/routes/security.test.js`) usando `supertest` e `jest`.
  - [x] Validar que uma requisição com token do Tenant A tentando ler/alterar dados do Tenant B receba `403 Forbidden`.
  - [x] Validar comportamento da validação de senhas fracas.
- [x] **5.2. Pipeline de Deploy Automatizado (FINDING-24)**
  - > [!IMPORTANT]
  - > **Instrução:** Ler o item [FINDING-24](file:///d:/Repositorios/OperaBeauty/relatorio_auditoria_producao_v2.md#FINDING-24) (Ausência de esteira CI/CD) no [relatorio_auditoria_producao_v2.md](file:///d:/Repositorios/OperaBeauty/relatorio_auditoria_producao_v2.md) antes de iniciar.
  - [x] Configurar GitHub Actions no repositório.
  - [x] Adicionar triggers que rodam o Linter e Testes a cada Pull Request.
  - [x] Automatizar o deploy via SSH na VPS, executando `docker compose pull && docker compose up -d` após aprovação do pipeline. *(Preparado e comentado aguardando VPS).*

---

## ⚠️ PROTOCOLO DE VALIDAÇÃO DE PRÉ-DEPLOY (CHECKLIST DE SEGUNDA)

Antes de abrir a aplicação para as primeiras clínicas clientes, a equipe técnica deverá confirmar:

1. [x] A conexão backend → banco está trafegando apenas na rede interna do Docker? (Baseado no [FINDING-02](file:///d:/Repositorios/OperaBeauty/relatorio_auditoria_producao_v2.md#FINDING-02))
2. [x] Tentativas de login usando força bruta são bloqueadas temporariamente por IP? (Baseado no [FINDING-12](file:///d:/Repositorios/OperaBeauty/relatorio_auditoria_producao_v2.md#FINDING-12))
3. [x] Todos os secrets estão declarados apenas nas variáveis de ambiente reais da VPS? (Baseado no [FINDING-01](file:///d:/Repositorios/OperaBeauty/relatorio_auditoria_producao_v2.md#FINDING-01))
4. [x] O certificado TLS/HTTPS está configurado como válido (A+ no SSL Labs)? (Baseado no [FINDING-18](file:///d:/Repositorios/OperaBeauty/relatorio_auditoria_producao_v2.md#FINDING-18))
5. [x] O banco está gerando dumps diários legíveis? (Baseado no [FINDING-23](file:///d:/Repositorios/OperaBeauty/relatorio_auditoria_producao_v2.md#FINDING-23))
6. [x] A VPS possui memória Swap ativa para evitar travamentos por estouro de RAM (OOM)? (Baseado no [FINDING-28](file:///d:/Repositorios/OperaBeauty/relatorio_auditoria_producao_v2.md#FINDING-28))
7. [x] A rotação de logs no Docker está ativa limitando o consumo de disco? (Baseado no [FINDING-29](file:///d:/Repositorios/OperaBeauty/relatorio_auditoria_producao_v2.md#FINDING-29))
8. [x] O acesso SSH está protegido por chaves públicas/privadas com o Fail2ban monitorando a máquina? (Baseado no [FINDING-30](file:///d:/Repositorios/OperaBeauty/relatorio_auditoria_producao_v2.md#FINDING-30))

---

## 🛑 FASE 6: Testes Locais e Ajustes (Próximos Passos VPS)
**Meta:** Executar testes do container Docker localmente para validar estabilidade antes de subir para a VPS.

- [x] **6.1. Correção do Caddyfile**
  - Remover a diretiva `handle_path /api/*` (que corta o `/api`) e substituir por `handle /api/* { reverse_proxy api:5000 }` para manter o prefixo intacto e evitar erro 404 generalizado no backend.
- [x] **6.2. Teste de Build e Execução Local**
  - Executar `docker-compose up -d --build` para validar se todos os containers (Caddy, API e Postgres) sobem com sucesso e conversam na mesma rede (`operabeauty-network`).
- [x] **6.3. Criação de Dados Iniciais Simulados**
  - Testar o `init.sql` no container PostgreSQL rodando a primeira migração com o docker.

---


## 💼 FASE 7: Módulos Definitivos (Business Product)
**Meta:** Elevar o nível do sistema para bater de frente com a concorrência antes do Go-Live.

- [x] **7.1. Banco de Dados: Estrutura de Comissões Segura**
  - Adicionar as colunas `commission_status` e `commission_paid_at` em `cap_appointments`.
  - **Segurança:** O status padrão deve ser seguro (`pending`).
- [x] **7.2. Backend: Correção do Bug de Cálculo de Comissão**
  - Corrigir a equação matemática para `(Valor * Taxa) / 100` no fechamento do agendamento.
- [x] **7.3. Backend: Rota de Pagamento (Fechamento)**
  - Criar rota para aprovar e pagar comissões pendentes.
  - **Segurança:** Garantir middleware de Autenticação (`requireRole(['manager', 'admin'])`).
- [x] **7.4. Frontend: Interface de Fechamento Financeiro**
  - Alterar a lista de comissões em `GestaoFinanceira.jsx` para mostrar os valores pendentes com botão de Pagar.
- [x] **7.5. Relatórios e Gráficos: Exportação em CSV**
  - Criar função utilitária global para baixar relatórios.
  - **Segurança:** Garantir que hashes de senhas e dados LGPD sensíveis de clientes não sejam exportados em planilhas não criptografadas.
- [x] **7.6. Estoque: Alerta de Reposição (UI)**
  - Construir sistema de aviso (vermelho) para produtos que baterem na `min_quantity`.
  - [x] Correção do redirecionamento fantasma da rota raiz de staff para a Home Global (redirecionar `/staff` para `staff/login` dentro do escopo do inquilino).
- [x] Correção e validação do envio de anotações na Timeline do CRM, garantindo que o frontend empacote como FormData e o backend processe a imagem e/ou o texto sem retornar erro 400.
- [x] **7.12. Refatoração Visual (Design Stitch)**
  - Aplicar os componentes visuais em todas as telas principais para garantir a identidade visual premium exportada do Figma.

---

## 🚀 FASE 8: Módulos Avançados do Super Admin (SaaS Mestre)
**Meta:** Expandir os controles globais do dono da plataforma para gerenciar finanças e estabilidade do SaaS de forma independente.

- [x] **8.1. Dashboard Financeiro Global (MRR)**
  - Implementar painel com Receita Mensal Recorrente, histórico de assinaturas, inadimplentes e opção de bloqueio/suspensão de tenant.
- [x] **8.2. Gestão da Equipe SaaS**
  - CRUD (Criar, Editar, Excluir) para usuários administradores (Super Admins) gerenciarem a plataforma sem acesso direto ao banco de dados.
- [x] **8.3. Mural de Avisos (Broadcast System)**
  - Sistema para disparar comunicados (manutenções, novidades) que aparecerão no painel de todas as clínicas ativas simultaneamente.
- [x] **8.4. Auditoria, Saúde e Logs**
  - Monitorar consumo de armazenamento de cada clínica (imagens do CRM) e logs de acessos/segurança ao painel mestre.
- [x] **8.5. Feature Flags (Gestão de Módulos Beta)**
  - Controle de chaves para habilitar ou desabilitar funcionalidades experimentais para tenants específicos (Ex: Clínicas beta testers).

---

## 💎 FASE 9: CRM Avançado, Vendas e Retenção (Fidelidade SaaS)
**Meta:** Fornecer ferramentas de "Gamificação" e venda direta para o Lojista, monetizadas por feature flags nos planos do Super Admin.

- [x] **9.1. Níveis VIP (Gamificação do Cliente)**
  - Classificação de clientes em Tiers (Prata, Ouro, VIP, Black) no painel do gerente, com insígnias visuais luxuosas no app do cliente.
- [x] **9.2. Clube do Salão (Assinaturas)**
  - Criação de planos recorrentes (Ex: Pacote Escova 4x) para gerar previsibilidade de caixa para o salão.
- [x] **9.3. PDV / Venda de Produtos Físicos**
  - Módulo de Caixa rápido para vendas de prateleira (Shampoos, Cremes, etc.) sem atrelar a um serviço.
- [x] **9.4. Feature Flagging de Módulos Premium**
  - Condicionar o acesso do Lojista às telas do "Clube" e "PDV" através da validação da sua assinatura na tabela `cap_plans`.
- [x] **9.5. Carteira Digital (Cashback Automático)**
  - Sistema de saldo virtual para a cliente final. Ao realizar serviços, uma % do valor volta como saldo na carteira para ser usado no próximo atendimento, com prazo de expiração para incentivar o retorno rápido ao salão.

---

## 🌟 FASE 10: Experiência Premium do Cliente Final (App)
**Meta:** Transformar o aplicativo do cliente em uma máquina de vendas por impulso e gerar extrema fidelização, atrelando as melhores funções aos Planos SaaS mais caros.

- [x] **10.1 Self Check-in com "Menu de Espera" (Mimos)**
  - O cliente avisa pelo app que chegou.
  - O salão recebe um Push/In-App: "Maria chegou e pediu um Café".
  - *Front Lojista:* Habilitar check-in e cadastrar itens (Água, Café, Espumante).
  - *Front Cliente:* Botão "Fazer Check-in" na aba Próximos no dia do agendamento.
- [x] **10.2. Lookbook / Inspirações (Venda por Impulso)**
  - Galeria de fotos do salão. Botão "Quero Fazer Igual" que pré-preenche o agendamento com o mesmo serviço e profissional da foto.
- [x] **10.3. Vales-Presente (Gift Cards Digitais)**
  - Cliente pode comprar serviços para presentear amigos via link de WhatsApp.
  - *Regra de Negócio:* Funcionalidade travada por **Feature Flag** do Super Admin (apenas planos Premium do SaaS).
- [x] **10.4. Indique e Ganhe (Máquina Viral)**
  - Links de afiliados para clientes do salão. Quem indica ganha Cashback, quem é indicado ganha desconto na 1ª visita.
  - *Regra de Negócio:* Funcionalidade travada por **Feature Flag** do Super Admin (`features.referral`).
---

## 📊 FASE 11: Inteligência, Comunicação e Diferenciais Competitivos
**Meta:** Fechar as lacunas com os concorrentes (Trinks, Booksy) e criar diferenciais únicos que justifiquem a adoção do OperaBeauty.

- [x] **11.1. Relatórios Inteligentes (BI Lite)**
  - Taxa de retorno de clientes (% que voltam em 30 dias vs clientes perdidas).
  - Ranking de profissionais (faturamento, cancelamentos, satisfação).
  - Mapa de calor de horários ociosos para criação de promoções estratégicas.
  - *Regra de Negócio:* Funcionalidade condicionada ao **Plano SaaS** (Feature Flag).
- [x] **11.2. Notificações Push / Lembretes Automáticos**
  - Lembrete de agendamento (24h e 2h antes) via notificação push in-app (sem custo de API externa).
  - Lembrete de retorno automático baseado no intervalo de manutenção do serviço (ex: progressiva a cada 90 dias).
  - Parabéns de aniversário automáticos (sem cupom para preservar margem, envia felicitações e sugere agendamento).
  - *Regra de Negócio:* Disponível em **todos os planos** (reduz no-show para todos os salões).
- [x] **11.3. Avaliações e Reputação (NPS do Salão)**
  - Tela de avaliação (1 a 5 estrelas) exibida ao cliente após finalização do atendimento pelo profissional.
  - Média de estrelas por profissional visível no painel do gestor.
  - Nota geral do salão exibida na home pública como prova social.
  - *Regra de Negócio:* Disponível em **todos os planos**.
- [x] **11.4. Lista de Espera (Fila de Agendamento)**
  - Cliente pode entrar na lista de espera caso não ache um horário disponível.
  - Gestor recebe notificação de que há clientes na fila caso um horário libere.
  - Disparo manual ou automático via Push para avisar os clientes da fila de espera que vagou.
  - *Regra de Negócio:* Disponível no **Plano SaaS**.
- [x] **11.5. Central de Notificações In-App (Feed / Sininho 🔔)**
  - Hub unificado para cliente: agendamento confirmado, cashback recebido, cupom expirando, lembrete de retorno, avaliação pendente.
  - Hub unificado para profissional: check-in de cliente, novo agendamento, comissão paga.
  - Em ambos: indicador (badge vermelho) de notificações não lidas.
  - Marcar como lida ao clicar.
  - *Regra de Negócio:* Disponível em **todos os planos** (infraestrutura base).
- [x] **11.6. Termos e Consentimento Digital (LGPD)**
  - Profissional envia termo de consentimento (químicas, injetáveis, laser) para assinatura digital da cliente no celular.
  - Registro salvo no CRM com data, hora e IP para proteção jurídica do salão.
  - *Regra de Negócio:* Funcionalidade condicionada ao **Plano SaaS** (Feature Flag).

---

## 🔐 FASE 12: Correções Bloqueantes Pré-Deploy (Auditoria v3)
**Meta:** Resolver os achados de severidade MEDIUM identificados na [auditoria final v3](file:///d:/Repositorios/OperaBeauty/relatorio_auditoria_final_v3.md) que **bloqueiam o deploy** na VPS de produção.

- [x] **12.1. Remoção do Fallback Inseguro da Chave de Criptografia AES (NEW-FINDING-01)**
  > [!IMPORTANT]
  > **Instrução:** Ler o item [NEW-FINDING-01](file:///d:/Repositorios/OperaBeauty/relatorio_auditoria_final_v3.md#new-finding-01-fallback-inseguro-na-chave-de-criptografia-aes) no [relatorio_auditoria_final_v3.md](file:///d:/Repositorios/OperaBeauty/relatorio_auditoria_final_v3.md) antes de iniciar.
  - [x] Remover o fallback estático `'default_secret_key_32_bytes_long'` da função `getEncryptionKey()` em [crypto.js](file:///d:/Repositorios/OperaBeauty/backend/utils/crypto.js).
  - [x] Adicionar `throw new Error('FATAL ERROR: ENCRYPTION_KEY is not defined.')` caso a variável de ambiente `ENCRYPTION_KEY` não esteja presente.
  - [x] Seguir o mesmo padrão defensivo já utilizado pelo `JWT_SECRET` em [server.js](file:///d:/Repositorios/OperaBeauty/backend/server.js).

- [x] **12.2. Remoção da Exposição de Stack Trace em Produção (NEW-FINDING-02)**
  > [!IMPORTANT]
  > **Instrução:** Ler o item [NEW-FINDING-02](file:///d:/Repositorios/OperaBeauty/relatorio_auditoria_final_v3.md#new-finding-02-stack-trace-exposta-no-error-handler-global) no [relatorio_auditoria_final_v3.md](file:///d:/Repositorios/OperaBeauty/relatorio_auditoria_final_v3.md) antes de iniciar.
  - [x] Condicionar a exposição de `err.message` e `err.stack` no middleware global de erros de [app.js L159](file:///d:/Repositorios/OperaBeauty/backend/app.js#L159) ao ambiente de desenvolvimento (`NODE_ENV !== 'production'`).
  - [x] Em produção, retornar apenas a mensagem genérica `"Ocorreu um erro interno de servidor."` sem detalhes internos, caminhos de arquivos ou versões de dependências.

- [x] **12.3. Configuração de Variáveis de Ambiente na VPS**
  > [!IMPORTANT]
  > **Instrução:** Esta etapa é manual e deve ser executada diretamente no servidor VPS antes do `docker compose up`.
  - [x] Gerar `JWT_SECRET` com 64 caracteres criptográficos: `openssl rand -hex 64`
  - [x] Gerar `DB_PASSWORD` com senha forte: `openssl rand -base64 32`
  - [x] Gerar `ENCRYPTION_KEY` para AES-256-GCM: `openssl rand -hex 32`
  - [x] Gerar par de chaves VAPID para Push Notifications: `npx web-push generate-vapid-keys`
  - [x] Criar o arquivo `.env` na raiz do projeto na VPS contendo todas as variáveis acima.
  - [x] Verificar que o arquivo `.env` **não está commitado** no repositório Git.

---

## 🛡️ FASE 13: Hardening Residual e Qualidade de Código (Auditoria v3)
**Meta:** Resolver os achados de severidade LOW identificados na [auditoria final v3](file:///d:/Repositorios/OperaBeauty/relatorio_auditoria_final_v3.md) e fortalecer a postura de segurança geral do sistema. Estas tarefas **não bloqueiam o deploy** mas devem ser executadas na primeira sprint pós-lançamento.

- [x] **13.1. Substituição de `RETURNING *` Residuais por Projeções Explícitas (NEW-FINDING-03)**
  > [!IMPORTANT]
  > **Instrução:** Ler o item [NEW-FINDING-03](file:///d:/Repositorios/OperaBeauty/relatorio_auditoria_final_v3.md#new-finding-03-returning--residual-em-services-secundários) no [relatorio_auditoria_final_v3.md](file:///d:/Repositorios/OperaBeauty/relatorio_auditoria_final_v3.md) antes de iniciar.
  - [x] Substituir `RETURNING *` por colunas explícitas em [featureFlagService.js](file:///d:/Repositorios/OperaBeauty/backend/services/featureFlagService.js) (linhas 12, 23, 36, 73).
  - [x] Substituir `RETURNING *` por colunas explícitas em [giftcardService.js](file:///d:/Repositorios/OperaBeauty/backend/services/giftcardService.js) (linha 61).
  - [x] Substituir `RETURNING *` por colunas explícitas em [lookbookService.js](file:///d:/Repositorios/OperaBeauty/backend/services/lookbookService.js) (linha 22).
  - [x] Substituir `RETURNING *` e `SELECT *` por colunas explícitas em [superadminService.js](file:///d:/Repositorios/OperaBeauty/backend/services/superadminService.js) (linhas 263, 270, 280, 304).

- [x] **13.2. Unificação da Resposta de Verificação de Cliente (NEW-FINDING-04)**
  > [!IMPORTANT]
  > **Instrução:** Ler o item [NEW-FINDING-04](file:///d:/Repositorios/OperaBeauty/relatorio_auditoria_final_v3.md#new-finding-04-endpoint-check-client-ainda-permite-enumeração-parcial) no [relatorio_auditoria_final_v3.md](file:///d:/Repositorios/OperaBeauty/relatorio_auditoria_final_v3.md) antes de iniciar.
  - [x] Refatorar o endpoint `POST /auth/check-client` em [auth.js](file:///d:/Repositorios/OperaBeauty/backend/routes/auth.js) para retornar sempre `200 OK` com `{ action: 'login' }` ou `{ action: 'register' }`, sem revelar diretamente `{ exists: true/false }`.
  - [x] Atualizar o frontend ([AcessoTelefone.jsx](file:///d:/Repositorios/OperaBeauty/src/pages/AcessoTelefone.jsx)) para consumir o novo formato de resposta (`action` ao invés de `exists`).

- [x] **13.3. Expansão da Cobertura de Testes Automatizados (Melhoria Contínua)**
  > [!IMPORTANT]
  > **Instrução:** Ler o item [FINDING-17 (Reclassificado)](file:///d:/Repositorios/OperaBeauty/relatorio_auditoria_final_v3.md#finding-17-ausência-de-testes-automatizados) no [relatorio_auditoria_final_v3.md](file:///d:/Repositorios/OperaBeauty/relatorio_auditoria_final_v3.md) para contexto. A cobertura atual é estimada em ~10-15%.
  - [x] Criar testes de integração para as rotas de agendamento (`appointments.test.js`): criação, atualização de status, cancelamento e verificação de isolamento por tenant.
  - [x] Criar testes de integração para as rotas de staff (`staff.test.js`): CRUD completo e verificação de que profissionais não podem alterar seu próprio cargo/comissão.
  - [x] Criar testes de integração para as rotas de cupons (`coupons.test.js`): validação de expiração, limite de usos e isolamento por tenant.
  - [x] Meta: atingir ≥30% de cobertura de código antes do próximo ciclo de auditoria.

---

## 🚀 FASE 14: Evolução e Otimização Pós-Lançamento
**Meta:** Implementar melhorias de escalabilidade, performance e resiliência recomendadas pela [auditoria final v3](file:///d:/Repositorios/OperaBeauty/relatorio_auditoria_final_v3.md) para preparar o sistema para crescimento de clientes.

- [x] **14.1. Cache com Redis para Queries Frequentes**
  - [x] Instalar e configurar container Redis no `docker-compose.yml` (rede `operabeauty-network`).
  - [x] Implementar cache de leitura para: listagem de serviços por tenant, horários de funcionamento, dados públicos de tenant (slug, cores, banners).
  - [x] Definir TTL (Time-To-Live) de 5 minutos para dados voláteis e 30 minutos para dados estáveis.
  - [x] Invalidar cache automaticamente ao salvar/editar registros.

- [x] **14.2. Queue para Tarefas Assíncronas**
  - [x] Migrar o envio de notificações push e webhooks para uma fila de processamento assíncrono (BullMQ + Redis).
  - [x] Garantir que falhas no envio de notificações não impactem a resposta da API principal.
  - [x] Adicionar retry automático (3 tentativas com backoff exponencial) para notificações que falharem.

- [x] **14.3. WAF ou Cloudflare na Frente da VPS**
  - [x] Avaliar a utilização do plano gratuito do Cloudflare como proxy reverso adicional (WAF + DDoS protection).
  - [x] Configurar DNS (Proxy On - Nuvem Laranja).
  - [x] Forçar regras básicas (Bloqueio de bots maliciosos): scanners conhecidos, rate abuse acima de 500 req/min, e acessos de IPs de data centers suspeitos.
  - [x] Manter o Caddy como proxy interno para terminação TLS local como fallback.

- [x] **14.4. Testes de Carga e Stress Testing (k6 / autocannon)**
  - [x] Criar script de teste de carga para simular X usuários simultâneos buscando catálogo de serviços.
  - [x] Registrar métricas (Latência P95 < 200ms) para aprovar a arquitetura atual (Node + Postgres + Redis).
  - [x] Documentar os resultados e limites de capacidade atual da VPS.

- [x] **14.5. Auditoria de Dependências Automatizada**
  - [x] Adicionar step de `npm audit --audit-level=high` no GitHub Actions CI ([ci.yml](file:///d:/Repositorios/OperaBeauty/.github/workflows/ci.yml)).
  - [x] Atualizar pacotes desatualizados ou vulneráveis.
  - [x] Estabelecer política de atualização: dependências com CVE HIGH/CRITICAL devem ser atualizadas em até 7 dias.

- [x] **14.6. Documentação de API com Swagger/OpenAPI**
  - [x] Adicionar `swagger-jsdoc` e `swagger-ui-express` ao backend.
  - [x] Documentar os principais endpoints do sistema (ex: listagem de catálogos, agendamentos).
  - [x] Rota `/api/docs` acessível para facilitar integração de terceiros ou manutenção futura, protegida por `authMiddleware` + `requireRole(['superadmin'])`.

---

## 🔎 FASE 15: Pente Fino Pré-Go-Live (Auditoria v4.1)
**Meta:** Resolver os últimos achados identificados na revisão final de código antes de configurar a VPS e realizar o Go-Live. Consultar o documento de referência: [pente_fino_pre_golive.md](file:///d:/Repositorios/OperaBeauty/pente_fino_pre_golive.md).

- [x] **15.1. Remoção da Porta Redis Exposta Externamente (PENTEFINO-01)**
  > [!CAUTION]
  > **Severidade: CRÍTICA.** Ler o item [PENTEFINO-01](file:///d:/Repositorios/OperaBeauty/pente_fino_pre_golive.md#-pentefino-01-porta-do-redis-exposta-externamente) no [pente_fino_pre_golive.md](file:///d:/Repositorios/OperaBeauty/pente_fino_pre_golive.md) antes de iniciar.
  - [x] Remover a seção `ports: - "6379:6379"` do serviço `redis` em [docker-compose.yml](file:///d:/Repositorios/OperaBeauty/docker-compose.yml).
  - [x] Confirmar que a API continua se comunicando com o Redis via rede interna `operabeauty-network` (hostname `redis`).

- [x] **15.2. Invalidação de Cache no `updateService` e `deleteService` (PENTEFINO-02)**
  > [!WARNING]
  > **Severidade: MODERADA.** Ler o item [PENTEFINO-02](file:///d:/Repositorios/OperaBeauty/pente_fino_pre_golive.md#-pentefino-02-invalidação-de-cache-ausente-no-updateservice-e-deleteservice) no [pente_fino_pre_golive.md](file:///d:/Repositorios/OperaBeauty/pente_fino_pre_golive.md) antes de iniciar.
  - [x] Adicionar `await redisClient.del(`tenant:${tenantId}:services`)` após o `COMMIT` na função `updateService` em [catalogService.js](file:///d:/Repositorios/OperaBeauty/backend/services/catalogService.js) (após L132).
  - [x] Adicionar `await redisClient.del(`tenant:${tenantId}:services`)` após o `UPDATE` na função `deleteService` em [catalogService.js](file:///d:/Repositorios/OperaBeauty/backend/services/catalogService.js) (antes do return, ~L155).

- [x] **15.3. Mapear `ENCRYPTION_KEY` no Docker Compose (PENTEFINO-03)**
  > [!WARNING]
  > **Severidade: MODERADA (causa crash do container).** Ler o item [PENTEFINO-03](file:///d:/Repositorios/OperaBeauty/pente_fino_pre_golive.md#-pentefino-03-variável-encryption_key-ausente-no-docker-composeyml) no [pente_fino_pre_golive.md](file:///d:/Repositorios/OperaBeauty/pente_fino_pre_golive.md) antes de iniciar.
  - [x] Adicionar a linha `ENCRYPTION_KEY: ${ENCRYPTION_KEY}` na seção `environment` do serviço `api` em [docker-compose.yml](file:///d:/Repositorios/OperaBeauty/docker-compose.yml).
  - [x] Adicionar a variável `ENCRYPTION_KEY` no arquivo `.env` da VPS (já documentado no roteiro de deploy).

---

## ⏳ FASE 16: Restauração Pós-Rate Limit Let's Encrypt (Amanhã)
**Meta:** Restaurar o acesso seguro via HTTPS (cadeado verde) assim que o bloqueio temporário de segurança da Let's Encrypt expirar (aproximadamente 24 horas após as sucessivas exclusões de volumes do Caddy).

- [ ] **16.1. Verificação do Status do Domínio**
  - Checar se o Caddy conseguiu obter o certificado de produção para `operabeauty.tech`.
  - Caso não tenha obtido automaticamente, reiniciar o container Caddy sem a tag `-v` (apenas `docker compose restart caddy`).
- [ ] **16.2. Confirmação do Caddyfile**
  - Certificar-se de que o `Caddyfile` não está forçando o ambiente de `staging` ou outras CAs (como ZeroSSL/BuyPass) caso elas tenham falhado anteriormente, mantendo a configuração padrão e definitiva de roteamento TLS automático.

*Documento mantido e atualizado conforme as diretrizes do Security Auditor do OperaBeauty.*
*Última atualização: 22/07/2026 — Adição da Fase 16 para gestão do Rate Limit SSL.*
