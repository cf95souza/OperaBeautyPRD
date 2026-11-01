# Projeto OperaBeauty - Fases de Desenvolvimento

Este arquivo rastreia o progresso do desenvolvimento do sistema de gestÃ£o, desde a base inicial (Capelli) atÃ© a atual **NOVA ERA: OperaBeauty SaaS**.

*(As fases de 1 a 20 focaram no desenvolvimento inicial do produto Single-Tenant e PWA, cujos mÃ³dulos bÃ¡sicos estÃ£o prontos e em operaÃ§Ã£o. Detalhamentos mantidos em histÃ³rico anterior.)*

---

# NOVA ERA: OperaBeauty (SaaS White Label Multi Tenant & Novo Design System)

Com a chegada de 27 novas telas exportadas do Figma/Stitch, iniciamos um refatoramento total de interface atrelado Ã  evoluÃ§Ã£o da arquitetura do banco de dados para o modelo SaaS.

## Fase 21: Setup do Novo Design System (Stitch)
- [ ] ConfiguraÃ§Ã£o do Tailwind v4 para aceitar as classes customizadas das telas exportadas (ex: `on-surface`, `primary`, fontes, etc).
- [ ] CriaÃ§Ã£o dos componentes de layout e UI bÃ¡sicos baseados nos HTMLs (BotÃµes, Inputs, Cards, Menus laterais, Headers).
- [ ] Estabelecimento da estrutura global de roteamento (Super Admin, Admin/Gestor, Profissional, Cliente).

## Fase 22: FundaÃ§Ã£o Multi Tenant no Banco de Dados
- [ ] CriaÃ§Ã£o da tabela `cap_tenants` (SalÃµes/Estabelecimentos).
- [ ] RefatoraÃ§Ã£o das tabelas existentes (`cap_clients`, `cap_appointments`, `cap_services`, etc) para incluir `tenant_id`.
- [ ] Reescrita completa do RLS (Row Level Security) para garantir isolamento de dados por salÃ£o.
- [ ] AtualizaÃ§Ã£o do `AuthContext` e Contextos Globais no frontend para identificar o SalÃ£o atual (Tenant).

## Fase 23: MÃ³dulo de Acesso e AutenticaÃ§Ã£o (ConversÃ£o de UI)
- [ ] Construir tela: `acesso_senha` e `acesso_telefone`.
- [ ] Construir tela: `cadastro` e `cadastro_com_senha`.
- [ ] Construir tela: `acesso_profissional_staff`.
- [ ] Integrar novas telas de acesso com o fluxo de autenticaÃ§Ã£o real do Supabase.

## Fase 24: Portal do Cliente e Fluxo de Agendamento
- [x] Construir tela: `agendamento_selecionar_servi_o`.
- [x] Construir tela: `gest_o_financeira`.
- [x] Construir tela: `controle_de_estoque`.
- [x] Construir tela: `configura_es_operacionais`.
- [x] Construir tela: `ficha_da_cliente_crm`.

## Fase 27: MÃ³dulo Super Admin (Gestor SaaS)
- [x] Construir tela: `super_admin_gest_o_de_sal_es_e_planos` e Login Exclusivo do Mestre.
- [x] Construir tela: `branding_customiza_o` (Ajuste global de cores e logo do salÃ£o).

## Fase 28: IntegraÃ§Ã£o de Banco de Dados Multi-Tenant e CRUDs
- [x] UnificaÃ§Ã£o dos scripts de banco (`database.sql`) e atualizaÃ§Ã£o da documentaÃ§Ã£o (`estrutura_db.md`).
- [x] IntegraÃ§Ã£o da tela Acesso Profissional e Cliente com RPCs de Login Seguro (`pgcrypto`).
- [x] IntegraÃ§Ã£o da tela Branding & CustomizaÃ§Ã£o para persistir cores no `TenantContext` e injetar CSS Variables via BD.
- [x] IntegraÃ§Ã£o da tela GestÃ£o de Equipe com listagem e criaÃ§Ã£o de staff via RPC `cap_register_staff`.
- [x] CriaÃ§Ã£o e integraÃ§Ã£o da tela GestÃ£o de ServiÃ§os com CRUD na tabela `cap_services`.
- [x] CriaÃ§Ã£o e integraÃ§Ã£o da tela Controle de Estoque com filtros, CRUD, tipo de venda e botÃ£o de reabastecimento rÃ¡pido.
- [x] ImplementaÃ§Ã£o de dados reais no Dashboard Gerencial (Faturamento, OcupaÃ§Ã£o, AniversÃ¡rios e Alertas de Estoque).
- [x] RefatoraÃ§Ã£o da GestÃ£o Financeira com mÃ©tricas reais (Ticket MÃ©dio, ServiÃ§o mais RentÃ¡vel e Faturamento Mensal).

## Fase 29: HomologaÃ§Ã£o SaaS, Funcionalidades DinÃ¢micas e Agenda
- [x] ConexÃ£o do Fluxo de Agendamento do Cliente com Banco de Dados.
- [x] Listagem real de ServiÃ§os (`cap_services`) e Profissionais (`cap_staff`) na jornada do cliente.
- [x] CriaÃ§Ã£o da lÃ³gica de bloqueio de horÃ¡rios baseada em agendamentos existentes (`cap_appointments`).
- [x] InserÃ§Ã£o final do agendamento validado (`cap_appointments`) via tela de RevisÃ£o.
- [x] IntegraÃ§Ã£o da Tela de Agenda Profissional/SalÃ£o com visualizaÃ§Ã£o e permissÃ£o baseada no cargo (Gestor vs Profissional).
- [x] RefatoraÃ§Ã£o da tabela cap_blocked_dates para cap_date_exceptions e cap_business_hours para suportar todos os dias da semana.
- [x] AtualizaÃ§Ã£o da tela de ConfiguraÃ§Ãµes Operacionais para gerar grade dinÃ¢mica de exceÃ§Ãµes e bloqueios por data.
- [x] AtualizaÃ§Ã£o da tela de GestÃ£o de ServiÃ§os integrando consumo de estoque, tempo de manutenÃ§Ã£o e retornos automÃ¡ticos no Dashboard.
- [x] Motor de Cupons de Desconto (CriaÃ§Ã£o pelo Gestor e AplicaÃ§Ã£o e ValidaÃ§Ã£o real no fluxo de Checkout do Cliente).
- [x] MÃ³dulo AvanÃ§ado de Identidade e Branding (EdiÃ§Ã£o do nome do salÃ£o e do link Ãºnico/slug de acesso com recarregamento dinÃ¢mico).
- [x] Melhorias no CRM (Ficha de Cliente e GestÃ£o de Clientes) integrando contato rÃ¡pido via WhatsApp.
- [x] IntegraÃ§Ã£o MÃ³dulo de Faturas (Assinatura SaaS) e Baixa Manual.
- [x] ProteÃ§Ã£o ReforÃ§ada de Rotas Administrativas (StaffProtectedRoute).

## Fase 30: Arquitetura de VPS Dedicada (SeparaÃ§Ã£o Frontend/Backend & PostgreSQL Local)
- [x] InicializaÃ§Ã£o da estrutura de backend dedicada (`backend/` com Node.js/Express).
- [x] ConfiguraÃ§Ã£o de banco de dados PostgreSQL local e aplicaÃ§Ã£o dos scripts de DDL de `estrutura_db.md`.
- [x] ImplementaÃ§Ã£o de middlewares de seguranÃ§a (AutenticaÃ§Ã£o JWT, RLS lÃ³gico por tenant no Express).
- [x] ImplementaÃ§Ã£o dos endpoints de negÃ³cio do backend (AutenticaÃ§Ã£o, CRM, ServiÃ§os, Estoque, Agendamento, Faturamento).
- [x] CriaÃ§Ã£o de cliente REST unificado no frontend (`src/lib/api.js`) substituindo o SDK do Supabase.
- [x] RefatoraÃ§Ã£o das telas e componentes do frontend para consumir a nova API.
- [x] HomologaÃ§Ã£o de seguranÃ§a local e execuÃ§Ã£o de testes de integraÃ§Ã£o ponta a ponta (correÃ§Ã£o do adaptador de tenants/salÃµes para API local realizada com sucesso).
- [x] Hotfix: CorreÃ§Ã£o do adaptador do Supabase (`supabase.js`) adicionando suporte a `upsert()`, `lt()` e `neq()` para evitar erros na seleÃ§Ã£o de horÃ¡rios e salvamento de configuraÃ§Ãµes operacionais da jornada.
- [x] Hotfix: PersistÃªncia do agendamento em `sessionStorage` (`BookingContext.jsx`) e conversÃ£o de preÃ§os para `Number` na revisÃ£o (`AgendamentoRevisao.jsx`) para evitar quebras por tipos incompatÃ­veis e perda de estado na navegaÃ§Ã£o.
- [x] Hotfix: CorreÃ§Ã£o do mapeamento de `cap_appointments` no adaptador do Supabase (`supabase.js`) de flat para aninhado e ajuste do filtro local de `client_id`, resolvendo a exibiÃ§Ã£o vazia e incompleta dos agendamentos no histÃ³rico do cliente.
- [x] Hotfix: ImplementaÃ§Ã£o de manipulador `onClick` no botÃ£o de cancelamento de agendamento na tela de histÃ³rico (`HistoricoAgendamentos.jsx`) e integraÃ§Ã£o com o mÃ©todo de update para alterar o status do agendamento para `'cancelled'`.
- [x] Hotfix: LiberaÃ§Ã£o da visualizaÃ§Ã£o do prÃ³prio perfil de cliente no endpoint `GET /clients/:id` do backend, e inclusÃ£o obrigatÃ³ria do campo de data de nascimento no formulÃ¡rio de primeiro cadastro (`CadastroCliente.jsx`).
- [x] Hotfix: CriaÃ§Ã£o do endpoint pÃºblico `/check-phone` no backend e atualizaÃ§Ã£o do adaptador do Supabase (`supabase.js`) para verificar a existÃªncia do nÃºmero de telefone de forma anÃ´nima e segura no inÃ­cio do fluxo, evitando o erro `403 Forbidden` ao acessar a pÃ¡gina.
- [x] ConfiguraÃ§Ã£o de ambiente de simulaÃ§Ã£o de VPS via VirtualBox (Ubuntu Server).
- [x] ContainerizaÃ§Ã£o do projeto (criaÃ§Ã£o do `Dockerfile` no backend e `docker-compose.yml`).
- [x] Deploy na VPS simulada utilizando Docker Compose e sincronizaÃ§Ã£o com WinSCP.
- [x] Hotfix: CorreÃ§Ã£o do mapeamento de propriedade de exceÃ§Ã£o (`exception_date`) no filtro de horÃ¡rios do agendamento (`AgendamentoHorarios.jsx`), resolvendo o erro `Cannot read properties of undefined (reading 'startsWith')`.
- [x] Hotfix: Ajuste no parser de data (`DATE`) do driver do PostgreSQL no backend (`db.js`) e remoÃ§Ã£o de conversÃ£o redundante para `Date` no salvamento de datas puras (`settings.js`, `auth.js`, `invoices.js`), eliminando de vez deslocamentos e colisÃµes no fuso horÃ¡rio.
- [x] Hotfix: SubstituiÃ§Ã£o dos inputs nativos de tipo `time` por inputs de tipo `text` com placeholder `HH:MM` em ConfiguraÃ§Ãµes Operacionais (`ConfiguracoesOperacionais.jsx`), fixando a exibiÃ§Ã£o e digitaÃ§Ã£o em formato brasileiro de 24h independente do locale do navegador.
- [x] Hotfix: CorreÃ§Ã£o no mapeamento de horÃ¡rios parciais nas exceÃ§Ãµes no front do cliente (`open_time` e `close_time` no lugar de `start_time` e `end_time` em `AgendamentoHorarios.jsx`), garantindo que horÃ¡rios alternativos sejam corretamente aplicados na jornada do cliente.
- [x] Hotfix: Restabelecimento completo do mÃ³dulo de Cupons de Desconto (`cap_coupons`), com criaÃ§Ã£o da tabela no banco de dados local, rotas dedicadas no backend (`coupons.js`), mapeamento no cliente de API (`api.js`) e no adaptador (`supabase.js`), resolvendo a criaÃ§Ã£o e listagem de cupons no painel do salÃ£o.
- [x] Hotfix: CorreÃ§Ã£o no incremento do contador de usos de cupons (`current_uses`) na conclusÃ£o do agendamento, implementando busca por ID de cupom no backend e mapeamento da RPC `increment_coupon_uses` e filtros no adaptador (`supabase.js`).
- [x] Hotfix: CorreÃ§Ã£o da listagem de faturamento (agendamentos) e faturas do salÃ£o no painel do Super Admin, adicionando suporte ao parÃ¢metro de consulta `tenant_id` no backend e repassando o filtro corretamente nas chamadas de API do frontend.
- [x] Hotfix: CorreÃ§Ã£o do fluxo de exibiÃ§Ã£o do banner promocional na tela inicial do cliente (adicionando suporte a gradiente degradÃª sob a paleta de cores se sem imagem) e ajuste de layout para posicionar o banner acima de "RecomendaÃ§Ãµes" em vez de no topo.
- [x] Feature: Suporte a mÃºltiplos banners cadastrÃ¡veis por salÃ£o, com controle de limites (max_banners) por plano de assinatura, carrossel de transiÃ§Ã£o fluida na Home do Cliente e gerenciamento no Super Admin e Gestor.
- [x] Hotfix: CorreÃ§Ã£o na lÃ³gica de translaÃ§Ã£o de slide (`translateX`) do carrossel de mÃºltiplos banners na Home do Cliente, garantindo que deslize na proporÃ§Ã£o correta baseada no total de banners e evitando telas brancas.
- [x] Feature: IntegraÃ§Ã£o da logomarca do salÃ£o (logo_url) no portal do cliente (cabeÃ§alho da Home, login, senha e cadastro), aprimorando a identidade White Label visualmente.
- [x] Hotfix: Ajuste do recuo seguro superior (safe area) contra notches e cÃ¢meras de celulares nas telas de autenticaÃ§Ã£o e login por senha do cliente, mantendo o logo em destaque centralizado na tela inicial de login por telefone.
- [x] RefatoraÃ§Ã£o: Limpeza e exclusÃ£o de arquivos e rotas legadas no frontend (App.jsx e src/pages/*) e scripts temporÃ¡rios de teste/migraÃ§Ã£o Ã³rfÃ£os no backend, otimizando a arquitetura do repositÃ³rio.
- [x] Feature: ConfiguraÃ§Ã£o de EndereÃ§o (LocalizaÃ§Ã£o) e Redes Sociais no painel do Gestor e menus dinÃ¢micos com modais de funcionamento na tela de Login do cliente final.


## Fase 31: CorreÃ§Ãµes de SeguranÃ§a e PreparaÃ§Ã£o para ProduÃ§Ã£o (Auditoria)
**Fase CrÃ­tica (Bloqueante - Fazer ANTES do deploy):**
- [x] Remover fallback hardcoded do JWT_SECRET e usar fail-fast (`auth.js`).
- [x] Adicionar `.env` e `backend/.env` ao `.gitignore` e limpar histÃ³rico Git.
- [x] Gerar novo JWT_SECRET seguro para ambiente de produÃ§Ã£o.
- [x] Configurar CORS com whitelist de origens permitidas (`server.js`).
- [x] Adicionar `authMiddleware` na rota PUT de cupons e separar a lÃ³gica de incremento (`coupons.js`).
- [x] Adicionar filtro de tenant obrigatÃ³rio na rota GET de cupom por ID.
- [x] Instalar e configurar `helmet` para headers de seguranÃ§a HTTP (`server.js`).
- [x] Instalar e configurar `express-rate-limit` nas rotas de login.
- [x] Limitar tamanho do body JSON: `express.json({ limit: '1mb' })`.
- [x] Corrigir ordem de rotas: mover `/occupied-slots` para antes de `/:id` (`appointments.js`).
- [x] Corrigir import faltante de `jwt` e remover parsing manual de token duplicado (`staff.js`, `services.js`, `settings.js`).
- [x] Criar Ã­ndices recomendados no banco de dados para otimizaÃ§Ã£o de performance.
- [x] Configurar pool de conexÃµes PostgreSQL otimizado (`max: 20`, com timeouts adequados).
- [x] Eliminar chamadas diretas ao Supabase no frontend e migrar tudo para a API Express.
- [x] Migrar a verificaÃ§Ã£o de Super Admin no frontend para depender exclusivamente do JWT do backend.

**Fase Alta (NecessÃ¡rio para produÃ§Ã£o estÃ¡vel):**
- [x] Implementar Access Token + Refresh Token (com cookie HttpOnly).
- [x] Instalar logger para logs estruturados (ex: `winston` ou `pino`).
- [x] Implementar validaÃ§Ã£o de input com `zod` ou `express-validator` nas rotas do backend.
- [x] Adicionar paginaÃ§Ã£o (LIMIT/OFFSET) nas queries de listagens mais pesadas.
- [x] Validar estoque mÃ­nimo (>= 0) antes da baixa nos serviÃ§os.
- [ ] Configurar infraestrutura de VPS: Nginx reverse proxy + TLS (Let's Encrypt).
- [ ] Configurar PM2 em cluster mode com auto-restart.
- [ ] Configurar backup automÃ¡tico do PostgreSQL (cron + pg_dump).
- [ ] Configurar firewall (ufw) na VPS.
- [x] Padronizar logs: substituir `console.error` residual por `req.log.error` (Pino) em todas as rotas.

## Fase 32: Landing Page (PÃ¡gina de Vendas do SaaS)
- [x] ImplementaÃ§Ã£o do layout de apresentaÃ§Ã£o do produto (Pitch de vendas, benefÃ­cios).
- [x] FormulÃ¡rio de intenÃ§Ã£o de assinatura / Contato comercial.
- [x] IntegraÃ§Ã£o com botÃ£o de Login do Super Admin na Ã¡rea restrita.

## Fase 33: RefatoraÃ§Ã£o Frontend CrÃ­tica (RemoÃ§Ã£o do Supabase)
- [x] Migrar `TenantContext.jsx` para usar API Express (eliminar `supabase.rpc` e `localStorage`).
- [x] Migrar `SuperAdminProtectedRoute` no `App.jsx` para usar JWT do backend.
- [x] **Parte 1: MÃ³dulo Cliente** (7 arquivos) - PÃ¡ginas de Login, Cadastro, Home Cliente, Perfil, HistÃ³rico de Agendamentos e Landing Page.
- [x] **Parte 2: MÃ³dulo Staff e Agendamento** (8 arquivos) - PÃ¡ginas do Profissional, Login do Staff, Agenda DiÃ¡ria, CRM e todo o funil de agendamento do cliente (ServiÃ§os, Profissionais, HorÃ¡rios, RevisÃ£o).
- [x] **Parte 3: MÃ³dulo GestÃ£o / Admin do SalÃ£o** (9 arquivos)
  - [x] Dashboard (`DashboardAdmin.jsx`)
  - [x] GestÃ£o de ServiÃ§os (`GestaoServicos.jsx`)
  - [x] Equipe (`GestaoEquipe.jsx`)
  - [x] Clientes (`GestaoClientes.jsx`)
  - [x] Financeiro (`GestaoFinanceira.jsx`)
  - [x] Estoque (`ControleEstoque.jsx`)
  - [x] Assinatura (`AssinaturaSaaS.jsx`)
  - [x] ConfiguraÃ§Ãµes (`ConfiguracoesOperacionais.jsx`)
  - [x] Branding / CustomizaÃ§Ã£o (`BrandingCustomizacao.jsx`)
- [x] **Parte 4: MÃ³dulo Super Admin** (6 arquivos)
  - [x] Login Super Admin (`SuperAdminLogin.jsx`)
  - [x] GestÃ£o de Planos (`PlanosAdmin.jsx`)
  - [x] Lista de Inquilinos (`TenantListAdmin.jsx`)
  - [x] Detalhes do Inquilino (`TenantDetailAdmin.jsx`)
  - [x] ConfiguraÃ§Ãµes (`SettingsAdmin.jsx`)
  - [x] Dashboard Principal (`SuperAdmin.jsx`)

## Fase 34: Hardening Backend (Fase 2)
- [x] Implementar validaÃ§Ã£o `zod` completa nas rotas faltantes (`coupons`, `staff`, `services`, `settings`, `superadmin`).
- [x] Corrigir rota `POST /coupons/:id/redeem`: incluir isolamento por tenant e validaÃ§Ã£o de `max_uses`.
- [x] Corrigir vulnerabilidade na paginaÃ§Ã£o SQL (`appointments.js`) parametrizando corretamente `LIMIT` e `OFFSET`.

## Fase 35: Auditoria de SeguranÃ§a Final (v3) + ClassificaÃ§Ã£o
- [x] Auditoria completa de seguranÃ§a e arquitetura do cÃ³digo.
- [x] VerificaÃ§Ã£o de migraÃ§Ã£o: 0 chamadas `supabase.from()` ou `supabase.rpc()` no frontend.
- [x] VerificaÃ§Ã£o de validaÃ§Ã£o: Zod em 100% das rotas crÃ­ticas.
- [x] VerificaÃ§Ã£o de logging: Zero `console.error` em rotas do backend.
- [x] AtualizaÃ§Ã£o do `relatorio_auditoria_producao.md` para v3.
- [x] **ClassificaÃ§Ã£o final do cÃ³digo: 8.5/10 ð¢ â PRONTO PARA PRODUÃÃO.**

## Fase 36: Polish Final PrÃ©-ProduÃ§Ã£o
- [x] Remover 4 imports mortos do Supabase (`App.jsx`, `ProfessionalRegister.jsx`, `NewAppointmentModal.jsx`, `Timeline.jsx`).
- [x] Remover variÃ¡veis `VITE_SUPABASE_*` do `.env` do frontend.
- [x] Deletar arquivo `src/lib/supabase.js` (nÃ£o Ã© mais utilizado).
- [x] Substituir TODOS os `alert()` / `window.alert()` por toasts do `NotificationProvider` (`showSuccess`, `showError`).
  - [x] `TenantDetailAdmin.jsx` (10 alerts)
  - [x] `SettingsAdmin.jsx` (2 alerts)
  - [x] `PlanosAdmin.jsx` (4 alerts)
  - [x] `ResumoAgendamento.jsx` (1 alert)
  - [x] `PerfilCliente.jsx` (4 alerts)
  - [x] `PerfilProfissional.jsx` (5 alerts)
  - [x] `HistoricoAgendamentos.jsx` (2 alerts)
  - [x] `FichaClienteCRM.jsx` (1 alert)
  - [x] `AgendamentoRevisao.jsx` (7 alerts)
  - [x] `BrandingCustomizacao.jsx` (4 alerts)
  - [x] `GestaoServicos.jsx` (6 alerts)
  - [x] `GestaoEquipe.jsx` (6 alerts)
  - [x] `ConfiguracoesOperacionais.jsx` (9 alerts)
  - [x] `ControleEstoque.jsx` (4+ alerts)
  - [x] `GestaoClientes.jsx` (2+ alerts)

## Fase 37: ConfiguraÃ§Ã£o de Infraestrutura (VPS) â CONCLUÃDO
- [x] Docker Compose (Containers: Caddy Frontend/Proxy + Backend API + Postgres).
- [x] Caddy reverse proxy + TLS automÃ¡tico (Let's Encrypt para o domÃ­nio oficial).
- [x] Frontend build estÃ¡tico (`npm run build`) servido pelo Caddy com suporte a SPA.
- [x] ResoluÃ§Ã£o de conflitos de variÃ¡veis de ambiente e seguranÃ§a de banco de dados.
- [ ] Backup automÃ¡tico do PostgreSQL (pg_dump + cron).
- [ ] Firewall (ufw: portas 22, 80, 443).
- [ ] CI/CD (GitHub Actions â Docker push â VPS pull).

## Fase 38: Melhoria ContÃ­nua (PÃ³s-Deploy e Escalabilidade)
- [x] Adicionar validaÃ§Ã£o Zod nas rotas secundÃ¡rias (`clients.js`, `invoices.js`, `plans.js`, `tenants.js`, `inventory.js`).
- [x] Implementar Audit Trail (log de aÃ§Ãµes crÃ­ticas do sistema).
- [x] Separar rotas do backend em uma Service Layer.
- [x] Escrever testes automatizados das rotas mais crÃ­ticas.

## Fase 39: Bugfixes e Refinamentos Finais (SessÃ£o Atual)
- [x] CorreÃ§Ã£o do layout espremido no Tailwind v4 (ajuste no `index.css` usando `!important` nas classes customizadas de utilitÃ¡rios `max-w-*` para nÃ£o conflitar com a escala global de espaÃ§amento).
- [x] CorreÃ§Ã£o do interceptador JWT no Backend e Frontend (retornando `401` em vez de `403` no `auth.js` em caso de falha de validaÃ§Ã£o para forÃ§ar logout limpo no interceptador do `api.js`).
- [x] CorreÃ§Ã£o do HistÃ³rico de Agendamentos para ler os campos do banco postgresql corretamente (`item.service_name` e `item.staff_name` ao invÃ©s das propriedades antigas do driver Supabase).
- [x] EvoluÃ§Ã£o de GestÃ£o de ServiÃ§os (`GestaoServicos.jsx`) para suportar painel dinÃ¢mico permitindo que mÃºltiplos itens de estoque sejam vinculados a um Ãºnico serviÃ§o (Many-to-Many Array Payload).
- [x] CorreÃ§Ã£o na listagem de cupons do Gestor (`ConfiguracoesOperacionais.jsx`) repassando corretamente a constraint `tenant_id` exigida pelo schema de validaÃ§Ã£o pÃºblico na rota GET.
- [x] Correção do redirecionamento fantasma da rota raiz de staff (redirecionar `/staff` para `staff/login` dentro do escopo do inquilino).
- [x] Correção e validação do envio de anotações na Timeline do CRM, garantindo que o frontend empacote como FormData e o backend processe a imagem e/ou o texto sem retornar erro 400.

## Fase 31: Melhorias Pós-Lançamento SaaS (Sustentação)
- [x] Melhoria: Múltiplos serviços atrelados aos Planos de Assinatura (Clube de Fidelidade). Migração de `service_id` para `service_ids` (JSONB).
- [x] Melhoria: Ranking de consumo de serviços e histórico detalhado na Ficha do Cliente (CRM).
- [x] Melhoria: Atualização do Favicon (Logomarca premium) e configuração do PWA.
- [x] Melhoria: Ajustes no frontend da Landing Page para formatar corretamente os itens do plano (capitalização de texto e tradução de módulos internos como 'clube' e 'pdv').

## Fase 40: Novo Fluxo de Vale-Presente (Segurança & SaaS)
- [x] Atualização do banco de dados (`cap_giftcards` e `cap_tenant_payment_methods`).
- [x] Refatoração das rotas backend (`giftcards.js`) para suportar VP, VG, PIX e transações seguras.
- [x] Atualização do frontend cliente (Tela de compra com instrução PIX e envio ao WhatsApp).
- [x] Atualização do frontend gestor (Novas validações de pagamento e resgate parcial seguro).

---

# PLANO DE MELHORIAS v1.0: Rebrand, Correções e Melhorias (Fases 41 a 46)

> [!IMPORTANT]
> **Fonte única de verdade:** [`OperaBeauty_Plano_de_Melhorias.md`](OperaBeauty_Plano_de_Melhorias.md) (v1.0 de 18/10/2026 + seção 9 de 19/10/2026).
> Este `fase.md` serve para **organizar e acompanhar** as tarefas. **Objetivo, Passos e Aceite** de cada tarefa ficam no plano, identificados pelo **ID** (ex.: `C2`, `B5`, `J4`). Cada item abaixo tem um link `→ Plano §x·ID` para o trecho exato.
> Os números de linha nos links são só atalhos. **O que vale é o ID**: se o plano for editado e as linhas mudarem, procure pelo ID.

### Protocolo obrigatório do agente (antes de executar qualquer item das Fases 41 a 46)
1. Abrir o plano no ID indicado e ler por completo o **Objetivo, Passos e Aceite** da tarefa.
2. Ler sempre o **§0 do plano**: Regras de ouro (§0.1), Fluxo por tarefa (§0.2), DoD global (§0.3) e Convenções de commit/branch/componentes (§0.4). → [Plano §0](OperaBeauty_Plano_de_Melhorias.md#L11-L50)
3. Itens de **Rebrand/UI**: ler também a Direção visual "Rosé Editorial" ([§2](OperaBeauty_Plano_de_Melhorias.md#L92-L226)), a especificação da tela (§3 ou §9) e a imagem de referência (tabela abaixo), seguindo as skills `ui-design-system`, `dashboard-layout` e `responsive-design`.
4. Onde o plano marcar **[VERIFICAR]**: conferir o código real antes de agir e registrar a divergência em `documentacao.md`.
5. Mudança de banco: migração versionada e reversível em `migrations/` + atualização do `database.md`.
6. Endpoint novo ou alterado: teste cross-tenant e de IDOR (`tests/routes/security.test.js`).
7. Ao concluir: marcar `[x]` **aqui e no plano**, registrar em `docs/changelog.md` (ainda não existe, criar na primeira entrega) e atualizar `documentacao.md`.
8. Não misturar Rebrand com mudança de regra de negócio no mesmo PR (§0.1, regra 6).

### Mapa das fases
| Fase | Tipo | Conteúdo | IDs do plano | Referência |
|---|---|---|---|---|
| 41 | REBRAND I | Fundação de design + telas do cliente | A1–A6, L1, B1–B8 | §2, §3, §4 Grupos A e B |
| 42 | REBRAND II | Painéis Super Admin e Gestor | H2–H9, J1–J8, J10 | §9 |
| 43 | CORREÇÕES | Robustez, segurança e correções visuais/texto | C1–C14, H1, J9 | §4 Grupo C, §9.1 |
| 44 | MELHORIAS I | Funcionalidades de retenção e receita | D1–D25 | §4 Grupo D |
| 45 | MELHORIAS II | Planos, preços, landing e vendas | E1–E3, F1–F5 | §4 Grupos E e F, §5 |
| 46 | CORREÇÕES ESTRUTURAIS | Qualidade, operação e débito técnico | G1–G7 | §4 Grupo G (100% Concluída ✅) |

### Ordem de execução (Plano §6 e §9.7)
→ [Plano §6](OperaBeauty_Plano_de_Melhorias.md#L607-L616) · [Plano §9.7](OperaBeauty_Plano_de_Melhorias.md#L720-L725)

| Sprint | Itens | Status |
|---|---|---|
| 1: Risco e base | C1, C9 ✅, C2, C3, C4, A1 ✅, A2 (parcial) | ⚠️ P0 pendentes: C1, C2, C3, C4 |
| 2: Visual do cliente | A3, A5, A6, B1 ✅, B2 ✅, B3 ✅, B4 ✅, B5 ✅, B6 ✅, B7 ✅ | Em andamento |
| 3: Operação e vendas | C5, C6, C7, C10, C11, C12, C14, G2 ✅, G3 ✅, G4 ✅, E1, E2, F1, F2 | Em andamento |
| 4: Receita e retenção | D18, D1, D2, D3, D4, D5, D6, D7, D8, D9, D10, D11 | Pendente |
| 5: Estética e crescimento | D12–D17, B7, B8, G1 ✅, G5 ✅, F4, F5 | Em andamento |
| Depois | D19–D25, C13, G6 ✅, G7 ✅, E3, F3 (+ A4, que o §6 não aloca) | Em andamento |
| Painéis (§9.7) | H1 ✅ → H2 + J1 ✅ → J4 ✅ → J5 ✅ → J6 ✅, J2 → H7, H3–H6 → J3, J7 ✅, J9 ✅ → H9 ✅ → J8 ✅ → H8, J10 | Em andamento |

> [!WARNING]
> Os itens **P0** do Sprint 1 (**C1** backup, **C2** agendamento duplo, **C3** sessão do celular, **C4** segredos) continuam abertos, mesmo com o rebrand do Sprint 2 já avançado. O plano manda tratá-los primeiro. Nos painéis, a correção P0 é a **H1** (numerais).

### Imagens de referência: layout-alvo (nome no plano → arquivo real no repositório)
As imagens do **layout novo (como as telas têm que ficar)** estão em **`docs/layout/novo/`**. Os nomes dos arquivos são diferentes dos citados no plano (`NN-*.png`), por isso use a tabela abaixo.
Os prints do sistema antigo (`docs/layout/atual/...` no plano) **não estão no repositório**. São só comparação e não bloqueiam nenhuma tarefa.

| Nome no plano | Arquivo real |
|---|---|
| `novo/01-login.png` | `docs/layout/novo/1 · Login@2x.png` |
| `novo/02-inicio.png` | `docs/layout/novo/2 · Início@2x.png` |
| `novo/03-servicos.png` | `docs/layout/novo/3 · Serviços@2x.png` |
| `novo/04-data-horario.png` | `docs/layout/novo/4 · Data e horário@2x.png` |
| `novo/05-confirmacao.png` | `docs/layout/novo/5 · Confirmação@2x.png` |
| `novo/06-temas.png` | `docs/layout/novo/Temas white-label@2x.png` |
| `novo/07-sa-painel.png` | `docs/layout/novo/S1 · Super Admin - Painel@2x.png` |
| `novo/08-sa-planos.png` | `docs/layout/novo/S2 · Super Admin - Planos@2x.png` |
| `novo/09-sa-salao.png` | `docs/layout/novo/S3 · Super Admin - Salão@2x.png` |
| `novo/10-gestor-dashboard.png` | `docs/layout/novo/G1 · Gestor - Dashboard@2x.png` |
| `novo/11-gestor-agenda.png` | `docs/layout/novo/G2 · Gestor - Agenda@2x.png` |
| `novo/12-gestor-clientes.png` | `docs/layout/novo/G3 · Gestor - Clientes@2x.png` |
| `novo/13-gestor-ficha.png` | `docs/layout/novo/G4 · Gestor - Ficha@2x.png` |
| Landing (L1) | `docs/layout/novo/L1 · Landing page de vendas (desktop)@2x.png` |

---

## Fase 41: REBRAND I — Design System Rosé Editorial e App do Cliente
> Referências: [§2 Direção visual](OperaBeauty_Plano_de_Melhorias.md#L92-L226) · [§3 Telas do cliente](OperaBeauty_Plano_de_Melhorias.md#L230-L351) · [§4 Grupo A](OperaBeauty_Plano_de_Melhorias.md#L360-L390) · [§4 Grupo B](OperaBeauty_Plano_de_Melhorias.md#L392-L402). Problemas do layout antigo a eliminar: [§3.2](OperaBeauty_Plano_de_Melhorias.md#L258-L266). Tom de voz: [§2.8](OperaBeauty_Plano_de_Melhorias.md#L186-L195). Acessibilidade: [§2.10](OperaBeauty_Plano_de_Melhorias.md#L220-L226).

- [x] **A1 (P1) — Tokens e Tema Padrão Rosé** → [Plano §4·A1](OperaBeauty_Plano_de_Melhorias.md#L362-L365): Configuração central de cores no Tailwind v4 (`src/index.css`), tipografia (Playfair Display + Plus Jakarta Sans), raios de cartões (`22px`), sombras sutis (`rgba(142,59,78,0.08)`) e injeção dinâmica em `:root` via `TenantContext.jsx` e `BrandingCustomizacao.jsx`.
- [x] **C9 (P0) — Liberar Zoom Mobile** *(correção do Grupo C feita junto com o rebrand; listada também na Fase 43)* → [Plano §4·C9](OperaBeauty_Plano_de_Melhorias.md#L439-L441): Remoção da restrição de escala no viewport do `index.html` e adição de `preconnect` para fontes.
- [x] **L1 (P1) — Redesenho da Landing Page de Vendas (Rosé Editorial)** → [Plano §4·L1](OperaBeauty_Plano_de_Melhorias.md#L394): Implementação 1:1 baseada em `L1 · Landing page de vendas (desktop)@2x.png` em `src/pages/LandingPage.jsx`. Inclui Hero com mockup do smartphone e notificação flutuante, tríade de benefícios, onboarding em 3 passos, vitrine dos 6 temas White-Label, grade de 6 recursos, tabela de 4 planos (Básico, Essencial, Premium, Signature), prova social com depoimento, FAQ em accordion interativo, modal de teste grátis e modal de acesso direto a salões ou super admin.
- [x] **A2 (P1) — Biblioteca de Componentes de UI** → [Plano §4·A2](OperaBeauty_Plano_de_Melhorias.md#L367-L370) · lista em [§2.5](OperaBeauty_Plano_de_Melhorias.md#L159-L169): Implementação completa da biblioteca universal em `src/components/ui/` com padrão único de nomenclatura, tokens Rosé Editorial, foco visível, `aria-*`, estados (normal, hover, active, loading, disabled, erro, vazio) e testes automatizados Jest (`backend/tests/uiLibrary.test.js` passando 100%).
  - **Componentes Implementados & Unificados:** `Botao`, `Button` (adapter retrocompatível), `Chip`, `ChipSelecionavel`, `Cartao`, `Card` (adapter retrocompatível), `CartaoServico`, `CartaoProfissional`, `CartaoProximoHorario`, `CartaoClube`, `CampoTexto`, `CampoTelefone`, `CampoCodigo` (OTP de 4 a 6 dígitos com avanço automático e paste), `Input` (adapter retrocompatível), `FaixaDeDias`, `GradeDeHorarios` (3 colunas, turnos e slots ocupados), `BarraDeProgresso`, `BarraFixaInferior`, `BottomSheet` (drawer deslizante com handle, backdrop e teclado), `Toast` e `ProvedorToast` (`useToast` com 4 variantes semânticas), `Skeleton` (shimmer rosé), `EstadoVazio`, `EstadoErro` (com botão de retry), `NavegacaoInferior` (integrado ao `ClienteBottomNavBar`), `Avatar` (com monograma, anel e status), `PlaceholderImagem` e `ModalRecorteImagem`.
  - **Barrel File:** Criado `src/components/ui/index.js` exportando todos os componentes com exportações nomeadas e default.
  - **Vitrine /ui-kit:** Criada a página `src/pages/UiKitShowcase.jsx` e registrada nas rotas `/ui-kit` e `/:tenant_slug/ui-kit` com mostruário interativo, seletor de tema em tempo real e homologação visual 100% aprovada via navegador.
- [x] **A3 (P1) — Layout Base com Área Segura (Safe Area)** → [Plano §4·A3](OperaBeauty_Plano_de_Melhorias.md#L372-L375) · [§2.3](OperaBeauty_Plano_de_Melhorias.md#L123-L129): Criação do componente universal `src/components/ui/TelaCliente.jsx` (exportado no barrel `index.js`) que centraliza o tratamento de notch (`env(safe-area-inset-top)`) e barra inferior de gestos (`env(safe-area-inset-bottom)`), gerenciando espaçamentos para navegação inferior e barras fixas de rodapé. Remoção de todos os paddings manuais repetidos `pt-[calc(env(safe-area-inset-top)+Npx)]` em 100% das páginas do cliente (`HomeCliente`, `PerfilCliente`, `HistoricoAgendamentos`, `AgendamentoServicos`, `AgendamentoProfissionais`, `AgendamentoHorarios`, `AgendamentoRevisao`, `AgendamentoConfirmado`, `AcessoTelefone`, `AcessoSenha`, `CadastroCliente`, `ClubeFidelidade`, `FidelidadeCarteira`, `ComprarGiftCard`, `IndiqueGanhe`, `NotificacoesCliente`, `ClienteAnamnese`). `AdminLayout.jsx` mantido como responsável único pelo painel administrativo. Testes automatizados Jest em `backend/tests/uiLibrary.test.js` passando 100% e validação visual móvel (390x844) sem sobreposições.
- [x] **A4 (P2) — Remover o paliativo do Tailwind v4** → [Plano §4·A4](OperaBeauty_Plano_de_Melhorias.md#L377-L380) · [§2.4](OperaBeauty_Plano_de_Melhorias.md#L131-L157): Remoção completa do paliativo com `!important` em `@utility max-w-*` no `src/index.css`. Eliminação de variáveis conflitantes `--spacing-*` sob `@theme`, configuração canônica dos containers nativos do Tailwind v4 (`--container-xs` a `--container-7xl`) e criação de `@utility` limpos para classes de layout do legado Stitch (`px-gutter`, `px-container-margin`, `gap-*`, `p-*`, `py-*`, `px-*`, `mb-*`, `mt-*`). Validação com compilação limpa Vite (`npm run build`), testes Jest passando 100% e inspeção visual comprovando ausência de qualquer compressão horizontal em todas as telas (login, formulários, home e vitrine).
- [x] **A5 (P1) — Temas White-Label (6 temas + cor livre)** → [Plano §4·A5](OperaBeauty_Plano_de_Melhorias.md#L382-L385) · [§2.9](OperaBeauty_Plano_de_Melhorias.md#L197-L218) · [§3.8](OperaBeauty_Plano_de_Melhorias.md#L339-L341) · imagem `Temas white-label@2x.png`: Migração `migrations/phase10_white_label_themes.sql` adicionando `theme_id` (varchar) e `brand_hex` (varchar) em `cap_tenants` (atualizado no banco e em `database.md`); rota `PUT /tenants/branding` atualizada com Zod e validação server-side de contraste; módulo universal de tokens e contraste WCAG 2.1 (`themeTokens.js`) com testes automatizados Jest (`backend/tests/themeContrast.test.js` passando 100% com ratio >= 4,5:1); tela `BrandingCustomizacao.jsx` redesenhada 1:1 com `Temas white-label@2x.png` exibindo os 6 temas oficiais (Rosé, Nude, Lavanda, Sálvia, Preto e Dourado, Bordô), mini-cartão de serviço, chips e amostras de paleta; seletor de cor livre com aferição de acessibilidade em tempo real e bloqueio de cores ilegíveis; live preview instantâneo via `TenantContext.jsx` refletindo dinamicamente em `:root` tanto no painel quanto na Home do cliente sem recarregar o servidor.
- [x] **A6 (P1) — Imagens: upload, recorte e placeholders** → [Plano §4·A6](OperaBeauty_Plano_de_Melhorias.md#L387-L390) · [§2.6](OperaBeauty_Plano_de_Melhorias.md#L171-L178): Rota segura de upload autenticado `POST /api/upload/image` em `backend/routes/upload.js` com Multer, sanitização com nomes aleatórios criptográficos, validação estrita de tipos MIME (JPG, PNG, WebP) e limite de 5MB; utilitário `imageProcessing.js` no frontend com detector algorítmico de fundo sólido para logos e conversor automático para WebP; componente universal `PlaceholderImagem.jsx` com ícones contextuais por categoria de serviço (cabelo, unhas, sobrancelha, estética) e monograma editorial para logos e avatares (nunca exibe imagem quebrada ou vazia); componente `ModalRecorteImagem.jsx` com recorte guiado por proporção fixa (1:1 para logo/avatar e 16:9 para banners), zoom interativo, pan e aviso educativo caso a logo possua fundo sólido; integrado e validado em `BrandingCustomizacao.jsx` e `CartaoServico.jsx`.
- [x] **B1 (P1) — Redesenho da Tela de Login (Rosé Editorial)** → [Plano §4·B1](OperaBeauty_Plano_de_Melhorias.md#L395) · tela [§3.3](OperaBeauty_Plano_de_Melhorias.md#L268-L284): Implementação 1:1 baseada em `1 · Login@2x.png` em `src/pages/AcessoTelefone.jsx` e alinhamento em `AcessoSenha.jsx` e `CadastroCliente.jsx`. Inclui logo circular 72px com borda dourada e monograma com letra inicial estilizada (fallback), card de capa com formas orgânicas suaves, título em Playfair Display, slogan editável pelo salão, campo de telefone de 56px com raio de 18px e máscara brasileira com validação amigável, botão de ação primária em cor cheia permanente com foco acessível, pílulas informativas dinâmicas de Endereço (com modal e Google Maps), Horários (com tabela de funcionamento) e Instagram, e link discreto para login de staff. Criação dos componentes base universais `Botao`, `Chip`, `CampoTexto` e `CampoTelefone` em `src/components/ui/`.
- [x] **B2 (P1) — Redesenho da Tela de Início (Rosé Editorial)** → [Plano §4·B2](OperaBeauty_Plano_de_Melhorias.md#L396) · tela [§3.4](OperaBeauty_Plano_de_Melhorias.md#L286-L301): Implementação 1:1 baseada em `2 · Início@2x.png` em `src/pages/HomeCliente.jsx`. Inclui cabeçalho fixo com logo e sino de notificações, faixa de lembrete push 24h fina e dispensável, saudação editorial em Playfair Display ("Olá, {nome}"), cartão "Seu próximo horário" com badge de data estilizado (dia da semana e número) e botões de contorno "Remarcar" e "Detalhes", estado vazio acolhedor, botão de ação primária dominante "+ Agendar novo horário", atalhos em chips para "Repetir último serviço" e "Indicar uma amiga" (com modal de compartilhamento para WhatsApp), cartão do Clube com sessões disponíveis e moldura dourada, carrossel de banners com cantos de 22px e vitrine horizontal de serviços. Ajuste fino de acessibilidade e contraste (WCAG AAA) nos elementos escuros: faixa de lembrete com fundo rosé suave fixo `#F6E4E4` e texto nítido `#2B2327`, chips de ação universais (`Chip.jsx`) com fundo pastel e texto destacado, e banner promocional com badge legível em alto contraste.
- [x] **B3 (P1) — Navegação Inferior do Cliente (ClienteBottomNavBar)** → [Plano §4·B3](OperaBeauty_Plano_de_Melhorias.md#L397): 5 abas integradas (Início, Agenda, botão central elevado "Agendar" (+) com elevação e sombra brand, Clube e Perfil). Ocultamento automático durante o fluxo de agendamento.
- [x] **B4 (P1) — Redesenho da Tela de Serviços** → [Plano §4·B4](OperaBeauty_Plano_de_Melhorias.md#L398) · tela [§3.5](OperaBeauty_Plano_de_Melhorias.md#L303-L314) · imagem `3 · Serviços@2x.png`: Implementação 1:1 baseada em `3 · Serviços@2x.png` em `src/pages/AgendamentoServicos.jsx` e `CartaoServico.jsx`. Topo do fluxo com botão circular de voltar, barra de progresso rosé editorial ("1 de 4") e sem navegação inferior; chips de categorias ordenados canonicamente (Todos, Cabelo, Unhas, Sobrancelha, Estética); busca quando houver mais de 12 serviços; cartões compactos (~72px) com ícones contextuais por categoria (tesoura, sobrancelha, brilhos), preço destacado e botão redondo de seleção (36px com + ou ✓); seleção múltipla (`role="checkbox"`, `aria-checked`, `aria-pressed`); barra fixa inferior com quantidade, duração consolidada, total em Playfair com numerais alinhados (`tabular-nums` / lining figures) e botão primário "Continuar →" de 52px. Validado visualmente e funcionalmente com browser subagent e montagem de volume no container Caddy.
- [x] **B5 (P1) — Redesenho da Tela de Data e Horário** → [Plano §4·B5](OperaBeauty_Plano_de_Melhorias.md#L399) · tela [§3.6](OperaBeauty_Plano_de_Melhorias.md#L316-L327) · imagem `4 · Data e horário@2x.png`: Implementação 1:1 baseada em `4 · Data e horário@2x.png` em `src/pages/AgendamentoHorarios.jsx`. Remoção total do input de data nativo do navegador; criação do componente universal `FaixaDeDias.jsx` (14 dias com dia da semana, dia do mês e modal/BottomSheet de calendário completo para agendamentos futuros); cartão resumo do atendimento no topo ("{serviço} · {duração} com {profissional}"); grupos de horários Manhã, Tarde e Noite em grade estrita de 3 colunas (44px); intervalos de 30 minutos respeitando exceções, expediente e bloqueios; horários ocupados renderizados com estilo riscado (`line-through`) e desabilitados; link integrado "Dia lotado? Entrar na lista de espera" (`WaitlistModal.jsx`); barra fixa inferior com data por extenso ("{dia_sem}, {dia} de {mes} · {hora}") e botão de avanço para `/agendar/revisao`. Criação de profissionais de teste ("Juliana Costa" e "Caio Profissional") com serviços associados no banco.
- [x] **B6 (P1) — Redesenho de Revisão e Confirmação** → [Plano §4·B6](OperaBeauty_Plano_de_Melhorias.md#L400) · tela [§3.7](OperaBeauty_Plano_de_Melhorias.md#L329-L337) · imagem `5 · Confirmação@2x.png`: Implementação 1:1 baseada em `5 · Confirmação@2x.png` em `src/pages/AgendamentoConfirmado.jsx` e `AgendamentoRevisao.jsx`. Revisão com progresso "3 de 4" e barra rosé 75%; resumo consolidado de serviços, profissional, data por extenso e horários; integração preservada de Cupons de desconto, Vales-Presente e resgate de Cashback de carteira digital; aviso contextual de pagamento presencial; barra fixa inferior de 52px. Confirmação (Passo 4 de 4) com círculo duplo rosé e check animado centralizado, saudação personalizada com nome ("Tudo certo, {nome}!"), subtítulo editorial com data e hora exatas, cartão-resumo com detalhes, faixa de lembrete push notification 24h com opt-in direto, botão primário "Adicionar ao calendário" com exportação segura de arquivo `.ics` (fuso local Brasil) e botão de retorno a "Ver meus agendamentos".
- [x] **B7 (P2) — Histórico/Agenda e Perfil do Cliente** → [Plano §4·B7](OperaBeauty_Plano_de_Melhorias.md#L401): Implementação baseada na identidade Rosé Editorial em `src/pages/HistoricoAgendamentos.jsx` e `src/pages/PerfilCliente.jsx`. Histórico com abas "Próximos" e "Concluídos" em segmented control pílula, badge de data com dia e número, status claros, ação "Remarcar" em 1 toque (preenche serviço e profissional e redireciona), modal de Self Check-in de mimos para clientes presentes no salão, cancelamento com diálogo de confirmação seguro, estados vazios acolhedores com atalho de agendamento e paginação. Perfil do cliente com monograma elegante, informações pessoais (nome, telefone com máscara, data de nascimento), segurança com validação dinâmica de requisitos de nova senha (mínimo 6 chars, letras e números), status da ficha de anamnese com link direto, vales-presente e programa de indicação, além de conformidade total com LGPD (exportação de dados em JSON e anonimização/exclusão de conta).
- [x] **Refatoração Editorial — Tela de Login do Staff** (`src/pages/AcessoProfissional.jsx`): Redesenho completo 1:1 baseado no Design System Rosé Editorial / White-Label. Card centralizado com split desktop (vitrine institucional à esquerda com imagem em alta resolução, badges translúcidas, monograma editorial com anel dourado e destaques de produto) e formulário moderno à direita (inputs com ícones Lucide, focus ring brand, alternador seguro de visibilidade de senha, botão primário robusto com spinner de carregamento, atalho suave de retorno para clientes e modal educativo de recuperação de senha). Validação funcional e visual completa no navegador aprovada com sucesso.
- [x] **B8 (P2) — Painel do Gestor e do Profissional** → [Plano §4·B8](OperaBeauty_Plano_de_Melhorias.md#L402): Concluído através da entrega integral da **Fase 42** (grupos H e J, §9: Super Admin e Painel do Gestor com identidade Rosé Editorial, navegação agrupada, dashboard, financeiro, agenda sem conflitos, clientes CRM, ficha CRM, estoque G5, PDV G6, serviços G7, equipe G8, clube G9, vales-presente G10 e configurações/LGPD).

---

## Fase 42: REBRAND II — Painéis Administrativos (Super Admin e Gestor)
> Referências: [§9 Painéis administrativos](OperaBeauty_Plano_de_Melhorias.md#L639-L725) · problemas comuns aos dois painéis [§9.1](OperaBeauty_Plano_de_Melhorias.md#L643-L653) · layout base (barra lateral 264px, agrupamentos, tabelas) [§9.2](OperaBeauty_Plano_de_Melhorias.md#L655-L664) · diretrizes gerais [§3.9](OperaBeauty_Plano_de_Melhorias.md#L343-L351) · ordem sugerida [§9.7](OperaBeauty_Plano_de_Melhorias.md#L720-L725).
> Seguir a skill `dashboard-layout`. As correções **H1** (numerais) e **J9** (limpeza de dados/textos) ficam na **Fase 43**.

**Super Admin (Grupo H)** → telas [§9.3](OperaBeauty_Plano_de_Melhorias.md#L666-L677) · tarefas [§9.5](OperaBeauty_Plano_de_Melhorias.md#L695-L705)
- [x] **H2 (P1) — Layout base do Super Admin** → [Plano §9.5·H2](OperaBeauty_Plano_de_Melhorias.md#L698): Criação do layout mestre universal `SuperAdminLayout.jsx` com barra lateral canônica de 264px (`w-[264px]`), sem degradês agressivos, com grupos canônicos estruturados: **Negócio** (Painel Geral, Salões e Clientes, Gestão de Planos), **Plataforma** (Feature Flags, Mural de Avisos, Equipe SaaS) e **Sistema** (Auditoria e Saúde, Configurações). Eliminação de toda a duplicação de `<aside>`, cabeçalhos mobile e gavetas nas 8 telas do Super Admin (`SuperAdmin.jsx`, `TenantListAdmin.jsx`, `TenantDetailAdmin.jsx`, `PlanosAdmin.jsx`, `SettingsAdmin.jsx`, `FeatureFlagsAdmin.jsx`, `EquipeAdmin.jsx`, `AvisosAdmin.jsx`, `AuditoriaAdmin.jsx`), que agora renderizam direto via `<Outlet />`. Rodapé fixo com dados do administrador e botão de logout. Compilação Vite limpa e validação visual no navegador aprovada com sucesso.
- [x] **H3 (P1) — Painel geral** → [Plano §9.5·H3](OperaBeauty_Plano_de_Melhorias.md#L699) · imagem `S1 · Super Admin - Painel@2x.png`: Implementação 1:1 baseada na imagem canônica oficial em `src/pages/superadmin/SuperAdmin.jsx`. **Cabeçalho Editorial**: Título em Playfair Display ("Visão geral"), subtítulo ("Desempenho e faturamento de todos os salões"), seletor de período dinâmico em pílula (**Mês**, **3 meses**, **Ano**) e botão primário em pílula bordô `+ Novo salão` conectado ao `CreateTenantModal`. **Grade de 5 KPIs Compactos**: `RECEITA RECORRENTE (MRR)` (com cálculo somando apenas salões ativos, numerais alinhados `tabular-nums lining-nums` via `formatCurrency` e subtítulo com pluralização rigorosa "N salões pagantes"), `SALÕES ATIVOS` (com contador e subtítulo "Na plataforma"), `FATURAS PENDENTES` (conformidade estrita com a regra 9.1.4: neutro quando zero, exibindo pílula verde `Tudo em dia`, jamais emitindo alarme falso; quando positivo, valor em destaque), `CHURN DO MÊS` (taxa percentual calculada sobre cancelamentos/suspensões com subtítulo informativo) e `CLIENTES ÚNICOS` (base consolidada de telefones únicos sem duplicidades). **Corpo Principal (2 Colunas)**: **Coluna Esquerda**: Card `Salões` com busca em tempo real em pílula com ícone de lupa, tabela corporativa elegante com avatares circulares rosé dotados de monogramas, link do slug, badge do plano (`Enterprise`), MRR por salão, situação da fatura (`Em dia`), status (`Ativo`), seta de navegação e linha inteira clicável direcionando para o detalhe do salão; **Coluna Direita**: Card `Precisa de atenção` com ícone circular verde e texto acolhedor ("Nada pendente. Faturas vencidas e salões sem acesso há 7 dias aparecem aqui.") quando regular, ou listagem de salões com pendência; Card `Receita por plano` com faturamento por plano, barra de progresso horizontal na cor brand e contador de assinantes. Backend enriquecido em `superadminService.js` com dados consolidados de `revenue_by_plan`, `attention_items` e faturas (`cap_invoices`). Testes automatizados Jest em `backend/tests/painelSuperAdmin.test.js` passando 100% (10/10), compilação Vite limpa em 3.12s e homologação visual e funcional via navegador aprovada com sucesso com gravação de sessão em vídeo WebP.
- [x] **H4 (P1) — Salões e clientes** → [Plano §9.5·H4](OperaBeauty_Plano_de_Melhorias.md#L700): Implementação e homologação completa da tela `TenantListAdmin.jsx`. **Barra de Ferramentas Avançada**: busca em tempo real com lupa e limpeza em 1 clique (filtrando por nome, slug e plano), dropdown de plano dinâmico alimentado pelo backend, seletor de ordenação (**Nome A-Z**, **Nome Z-A**, **Maior MRR**, **Menor MRR**, **Mais recentes**), segmented controls em pílula para **Status** (`Todos`, `Ativos`, `Suspensos`) e **Fatura** (`Todas`, `Em dia`, `Vencidas / Pendentes`), e botão de limpeza total de filtros quando ativos. **Tabela Corporativa**: linhas com hover sutil, avatares circulares com monogramas rosé, badge de plano (`Enterprise`), MRR formatado via `formatCurrency` com numerais alinhados (`tabular-nums lining-nums`), pílulas semânticas de situação da fatura e status da conta, métricas de clientes/equipe, chevron de navegação e linha inteira clicável direcionando para o detalhe do salão (`/superadmin/tenants/:id`). **Paginação e Resiliência**: paginação dinâmica (`itemsPerPage = 8`) com controles Anterior/Próxima, e estado vazio acolhedor com ilustração simples e botão de redefinição de filtros. Testes automatizados Jest em `backend/tests/superadminH4H5.test.js` passando 100% (12/12) e homologação visual/funcional via browser subagent autenticado como Super Admin aprovada com gravação de sessão em vídeo WebP (`superadmin_saloes_h4_1792614814382.webp`).
- [x] **H5 (P1) — Gestão de planos** → [Plano §9.5·H5](OperaBeauty_Plano_de_Melhorias.md#L701) · imagem `S2 · Super Admin — Planos@2x.png`: Implementação e homologação completa da tela `PlanosAdmin.jsx` com fidelidade 1:1 ao mockup canônico S2. **Cabeçalho Editorial**: título em Playfair Display ("Planos e preços"), subtítulo institucional ("Planos exibidos na página de vendas."), seletor de periodicidade dinâmico (**Mensal** / **Anual** com pílula de desconto) e botão primário em pílula bordô `+ Criar plano`. **Grid de Cartões dos Planos**: nomes em Playfair Display (Básico, Premium, Enterprise), preço destacado com numerais alinhados (`font-display tabular-nums lining-nums`), pílula de visibilidade (`Público` em verde pastel e `Oculto` em cinza/âmbar neutro), contagem de assinantes e MRR consolidado (`tabular-nums`), pílulas de limites de profissionais e banners. **Recursos com Check Único**: lista de recursos com apenas um checkmark elegante na cor brand (`#7C3A4D`), sanitização automática substituindo qualquer menção antiga a "Suporte 24/7" por "Suporte por WhatsApp" e correção terminante de "Interprise" para "Enterprise". **Ações nos Cartões**: botões com ordem e estilos 1:1 ao mockup S2 (`Editar plano` primário à esquerda e `Ocultar` / `Publicar` de contorno à direita). **Reordenação e Modal Completo**: reordenação suave de planos com persistência na API (`api.plans.reorder`), modal de criação e edição com sugestões em 1 clique e suporte a preço anual com desconto. Testes automatizados Jest em `backend/tests/superadminH4H5.test.js` passando 100% (12/12) e homologação visual/funcional via browser subagent autenticado como Super Admin aprovada com gravação de sessão em vídeo WebP (`superadmin_planos_h5_1792615313201.webp`).
- [x] **H6 (P1) — Detalhe do salão** → [Plano §9.5·H6](OperaBeauty_Plano_de_Melhorias.md#L702) · imagem `S3 · Super Admin — Salão@2x.png`: Implementação e homologação completa da tela `TenantDetailAdmin.jsx` com fidelidade 1:1 ao mockup canônico S3. **Navegação e Cabeçalho**: link de retorno editorial `← Salões e clientes`, título em Playfair Display ("Studio Thais") com pílula semântica de status (`Ativo`), subtítulo com pílula de slug (`/studiothais`) e botão `Copiar link` com feedback instantâneo via toast, e botão de contorno `Abrir painel do salão ↗`. **Abas de Conteúdo**: abas elegantes (`Visão geral`, `Equipe`, `Clientes`, `Faturamento`, `Faturas SaaS`) com sublinhado bordô na aba ativa. **Card Informações Base**: campo de nome do salão, campo de slug bloqueado por padrão exibindo aviso educativo de proteção contra quebra de rotas (`Bloqueado · alterar quebra os links`), campos de cor primária e secundária com amostra circular e código hexadecimal integrado, seletor de status da conta com controle segmentado em pílula (**Ativo**, **Suspenso**, **Cancelado**), seletor estilizado de planos exibindo preço em moeda padrão brasileira (`Enterprise · R$ 99,90/mês`) e botão primário em pílula bordô `Salvar alterações`. **Coluna Lateral**: Card `Assinatura` com Plano, Valor formatado via `formatCurrency` (`tabular-nums lining-nums`) e situação das Faturas (`Em dia` em verde pastel); e Card `Zona de risco` integrado aos mecanismos seguros de suspensão com justificativa e reativação em 1 clique (H7). Testes automatizados Jest em `backend/tests/detalheSalaoH6.test.js` passando 100% (9/9) e homologação visual/funcional via browser subagent autenticado como Super Admin aprovada com gravação de sessão em vídeo WebP (`superadmin_salao_h6_1792616193479.webp`).
- [x] **H7 (P1) — Suspensão segura** → [Plano §9.5·H7](OperaBeauty_Plano_de_Melhorias.md#L703): Implementação completa do mecanismo seguro de suspensão e reativação de salões no Super Admin. **Backend & Proteção na API**: Endpoints dedicados `POST /api/superadmin/tenants/:id/suspend` e `POST /api/superadmin/tenants/:id/reactivate` com validação Zod; interceptação obrigatória em `updateTenant` (`PUT /api/superadmin/tenants/:id`) bloqueando terminantemente qualquer suspensão sem o nome exato digitado e motivo formal (mínimo 5 caracteres); invalidação imediata da chave de cache Redis `tenant_slug:${slug}` para revogação em tempo real de acessos públicos e administrativos; registro completo na trilha de auditoria `cap_audit_logs` com usuário autenticado, IP, data/hora e dados antes/depois; emissão de aviso aos gestores na tabela `cap_notifications`. **Frontend Rosé Editorial (`TenantDetailAdmin.jsx`)**: Seletor de status com aviso de gerenciamento seguro; Zona de Risco estruturada com botão `Suspender conta...` (quando ativo) e `Reativar conta do salão (1 clique)` (quando suspenso com badge e pulso de alerta); componente de alta costura `ModalSuspenderSalao` com explicação didática dos impactos imediatos, contagem dinâmica de caracteres do motivo e bloqueio reativo do botão até a digitação exata do nome do salão. Testes automatizados Jest em `backend/tests/suspensaoSegura.test.js` passando 100% (11/11 testes) e homologação visual e funcional via navegador aprovada com sucesso com gravação de sessão em vídeo WebP.
- [x] **H9 (P2) — Auditoria visível do Super Admin** → [Plano §9.5·H9](OperaBeauty_Plano_de_Melhorias.md#L705): Implementação e homologação completa da trilha de auditoria e segurança visível do Super Admin. **Backend & Enriquecimento (`auditService.js`, `superadminService.js`, `routes/superadmin.js`)**: Captura automática de dados anteriores e novos (`old_data` e `new_data`) na atualização de salões (`updateTenant`), disparando eventos especializados `UPDATE_TENANT_PLAN` (com plano anterior, preço, novo plano e novo preço), `UPDATE_TENANT_SLUG` (com slug anterior e novo slug) e `UPDATE_TENANT` (para edições cadastrais gerais); vinculação persistente de `tenant_id` garantindo isolamento e relacionamento auditável com `cap_tenants` em suspensões (`SUSPEND_TENANT`) e reativações (`REACTIVATE_TENANT`); consulta `getSuperAdminLogs` enriquecida com `LEFT JOIN cap_tenants` (trazendo nome e slug) e `LEFT JOIN cap_platform_admins` (trazendo o administrador executor), com suporte a filtros via query string por tipo de ação (`action`), salão (`tenant_id`), busca textual (`search`) e limite. **Frontend Rosé Editorial (`AuditoriaAdmin.jsx`)**: Cabeçalho institucional com pílula de segurança ativa ("Audit Trail Ativo & Imutável"), abas dedicadas para Logs de Segurança e Armazenamento por Studio com contadores dinâmicos, barra de ferramentas avançada com pílulas de filtragem rápida por ação (**Todas as Ações**, **Suspensões**, **Reativações**, **Troca de Plano**, **Alteração de Slug**, **Edições Gerais**), busca em tempo real com lupa e limpeza em 1 clique, badges semânticas com código de cores por severidade (`SUSPEND_TENANT` em vermelho/rose, `REACTIVATE_TENANT` em verde esmeralda, `UPDATE_TENANT_PLAN` em âmbar e `UPDATE_TENANT_SLUG` em azul céu), e componente modal de alta fidelidade `ModalDetalhesAuditoria` exibindo alerta de justificativa da suspensão com confirmação deliberada, diff visual comparativo de transformação de estado (Antes vs Depois) e metadados de IP, data/hora e ID da transação. **Controle Seguro de Slug (`TenantDetailAdmin.jsx`)**: Desbloqueio deliberado de alteração de link do salão com aviso explícito de impacto em links públicos compartilhados e confirmação gravada na auditoria. Testes automatizados Jest em `backend/tests/auditoriaAdminH9.test.js` passando 100% (7/7) e homologação visual e funcional via browser subagent autenticado como Super Admin aprovada com gravação de sessão em vídeo WebP (`superadmin_auditoria_h9_perfeita_1792628377759.webp`).

**Gestor (Grupo J)** → telas [§9.4](OperaBeauty_Plano_de_Melhorias.md#L679-L693) · tarefas [§9.6](OperaBeauty_Plano_de_Melhorias.md#L707-L718)
- [x] **J1 (P1) — Navegação agrupada** → [Plano §9.6·J1](OperaBeauty_Plano_de_Melhorias.md#L709): Refatoração completa da barra lateral em `AdminLayout.jsx` com largura exata de 264px (`w-[264px]`), acabamento Rosé Editorial (`border-r border-line`), e 4 seções com rótulos em caixa alta de 11px: **Operação** (Dashboard, Agenda, Clientes, PDV), **Catálogo** (Serviços, Estoque, Clube, Vales-Presente), **Gestão** (Financeiro, Comissões, Equipe, Relatórios BI) e **Configurações** (Operacional, Branding, Segurança e LGPD, Minha Assinatura). Destaque do item ativo com fundo suave `bg-brand-tint` (`#F6E4E4`), texto `text-brand font-semibold` e ícone fill 1. Rolagem suave interna (`hide-scrollbar`), rodapé fixo com dados do perfil logado e botão "Sair da Conta". Integração com rotas dinâmicas do salão sem quebras visuais e homologação visual 100% via navegador.
- [x] **J2 (P1) — Dashboard** → [Plano §9.6·J2](OperaBeauty_Plano_de_Melhorias.md#L710) · imagem `G1 · Gestor — Dashboard@2x.png`: Implementação 1:1 baseada na imagem canônica oficial em `src/pages/admin/DashboardAdmin.jsx`. **Cabeçalho Editorial**: Saudação contextual baseada no horário do dia ("Bom dia, {nome}" / "Boa tarde, {nome}") em Playfair Display (`font-display`), data por extenso em português do Brasil com inicial maiúscula (ex: "Quarta-feira, 21 de outubro"), botão secundário de contorno `Venda rápida` (com navegação direta para o PDV) e botão primário dominante `+ Novo agendamento` em pílula bordô integrado ao `NewAppointmentModal`. **Grade de 4 KPIs Compactos**: `FATURAMENTO HOJE` (com valor formatado via `formatCurrency` e subtítulo com pluralização rigorosa "N atendimentos concluídos"), `FATURAMENTO DO MÊS` (com subtítulo "Mês atual"), `AGENDA DE HOJE` (contador tabular com subtítulo "N atendimentos marcados" e navegação para a agenda) e `TICKET MÉDIO` (com cálculo seguro e subtítulo "no mês"). **Corpo Principal (2 Colunas)**: Card amplo `Próximos atendimentos` (`rounded-[22px] border border-line bg-white`) com estado vazio acolhedor dotado de ilustração circular rosé, ícone de calendário, texto "Nenhum atendimento para hoje." e botão `Agendar manualmente`, além de renderização elegante em lista com horários, clientes, serviços e status na paleta Rosé Editorial quando preenchido. **Coluna Direita (Cards Laterais de Gestão)**: Card `Estoque baixo` com badge no topo com pluralização correta ("1 item" vs "N itens"), listagem de produtos com estoque crítico, quantidade em destaque, estoque mínimo ideal e botão `Repor` com abertura do `ModalReporEstoque` integrado (reposição rápida com atalhos numéricos e persistência imediata via `api.inventory.update`); Card `Aniversariantes · 30 dias` com badge de contador e ação rápida de envio de felicitações pelo WhatsApp; Card `Retornos · 30 dias` com cálculo preditivo por `maintenance_days` e lembrete direto via WhatsApp. Adicionado módulo de inventário no frontend (`src/lib/api.js`), testes automatizados Jest em `backend/tests/dashboardAdmin.test.js` passando 100% (12/12) e homologação visual e funcional aprovada via navegador com gravação de sessão.
- [x] **J3 (P1) — Financeiro** → [Plano §9.6·J3](OperaBeauty_Plano_de_Melhorias.md#L711): Implementação completa e redesenho editorial em `src/pages/admin/GestaoFinanceira.jsx` alinhado ao Design System Rosé Editorial e regras 9.1.2 e 9.1.4. **Cabeçalho Editorial e Controles**: Título em Playfair Display com subtítulo contextual, seletor de período dinâmico em pílula (**Este mês**, **Mês anterior**, **30 dias**, **Este ano**, **Personalizado**), botão de exportação `CSV` sanitizado sem IDs internos e botão de impressão limpa `PDF` com formatação dedicada `@media print`. **5 KPIs Limpos e Sem Sobreposições**: `FATURAMENTO BRUTO` (com numerais alinhados `tabular-nums lining-nums` via `formatCurrency` e contagem de atendimentos concluídos), `FATURAMENTO LÍQUIDO` (margem livre do salão deduzindo comissões e descontos), `TICKET MÉDIO` (gasto médio por cliente), `COMISSÕES PENDENTES` (com conformidade estrita à regra 9.1.4: neutro quando zero, jamais exibindo alerta vermelho indevido) e `DESCONTOS APLICADOS` (cupons e benefícios). **Gráfico de Receita por Dia**: Visualização responsiva diária com barras de progresso proporcionais na cor brand, tooltips flutuantes de hover com valor monetário e data, e estado vazio acolhedor. **Quebra por Formas de Pagamento**: Distribuição detalhada com barras de progresso e percentuais calculados sobre o faturamento (**Pix**, **Cartão de Crédito**, **Cartão de Débito**, **Dinheiro**, **Vale-Presente**). **Extrato de Transações**: Tabela corporativa com badges elegantes de pagamento, cliente com link para ficha CRM, serviço, profissional e valores em verde suave (`text-emerald-800 font-semibold`) com paginação configurável (5, 10, 20, todos). **Ranking e Comissões**: Card de `Comissões da equipe` com cálculo por profissional e modal de confirmação segura de quitação de comissões pendentes ([`ModalPagarComissao`](file:///d:/Repositorios/OperaBeauty/src/pages/admin/GestaoFinanceira.jsx)) com feedback instantâneo via toast; Card de `Serviços mais rentáveis` com barras de progresso rosé proporcionais. Adicionada coluna `payment_method` na tabela `cap_appointments` e em `database.md`. Testes automatizados Jest em `backend/tests/gestaoFinanceira.test.js` passando 100% (8/8) e homologação visual e funcional aprovada no navegador via subagente com gravação de sessão em vídeo WebP.
- [x] **J4 (P1) — Agenda do salão** → [Plano §9.6·J4](OperaBeauty_Plano_de_Melhorias.md#L712) · imagem `G2 · Gestor - Agenda@2x.png`: Implementação 1:1 baseada na imagem canônica em `src/pages/AgendaProfissional.jsx`. Cabeçalho editorial com Playfair Display, navegação de data por setas circulares e atalho "Hoje" com capitalização correta em pt-BR (ex: "Terça, 20 de outubro"), alternadores de período em pílulas ("Dia" / "Semana") e de contexto ("Minha agenda" / "Salão"), e botão dominante de destaque permanente "+ Novo agendamento". Barra de legenda com 4 pílulas semânticas refinadas da paleta Rosé Editorial (`Confirmado` em verde pastel `#E8F5E9`, `Pendente` em âmbar pastel `#FFF8E1`, `Concluído` em nude pastel `#F0EAE6` e `Cancelado` em vermelho pastel `#FDE8E8`). Grade de linhas horárias com 72px de altura canônica (`ROW_HEIGHT = 72`) das 08:00 às 20:00, com divisórias sutis. Na visão "Salão", grade dividida em colunas por profissional com monograma em degradê pastel, nome e cargo. Linha do "Agora" com linha contínua vermelha viva (`#D32F2F`) e ponto indicador em tempo real calculada ao minuto. Posicionamento preciso de cards proporcionais com menu/drawer de ações rápidas (Concluir, Iniciar Atendimento, Cancelar, Ficha CRM e WhatsApp) e criação rápida em 1 clique ao tocar em qualquer slot vazio da equipe. **Algoritmo de Lanes de Sobreposição**: resolução inteligente de horários concorrentes (clustering & calendar packing), dividindo automaticamente a coluna em sub-colunas proporcionais lado a lado para eliminar sobreposições de cards e cortes de texto, com valores monetários em padrão brasileiro (`formatCurrency`) posicionados estrategicamente no topo direito para máxima visibilidade e ergonomia. **Redesign Editorial do NewAppointmentModal (`NewAppointmentModal.jsx`)**: modal de alta costura Rosé Editorial com cantos arredondados de 32px, stepper visual de 2 etapas, busca de clientes em tempo real, grid de procedimentos em 2 colunas com preços formatados e seleção de profissional com monogramas. **Correções Técnicas**: aplicadas colunas `discount_applied` em `cap_appointments` e `is_starting_price` em `cap_services` (eliminando erros 500 da API), e criado `public/sw.js` estático com MIME type `text/javascript` (eliminando erro de ServiceWorker no Vite). Testes automatizados Jest em `backend/tests/uiLibrary.test.js` passando 100% e validação visual móvel e desktop aprovada no navegador.
- [x] **J5 (P1) — Clientes** → [Plano §9.6·J5](OperaBeauty_Plano_de_Melhorias.md#L713) · imagem `G3 · Gestor — Clientes@2x.png`: Implementação 1:1 baseada na imagem canônica oficial em `src/pages/admin/GestaoClientes.jsx`. Substituição completa dos cartões antigos em grid por tabela corporativa escalável com cantos arredondados de 22px (`rounded-[22px] border border-line`). Colunas canônicas: **CLIENTE** (avatar circular rosé com monograma, nome e telefone com máscara brasileira `(11) 99999-9999`), **NÍVEL** (badges suaves em pílula harmonizados na paleta Rosé Editorial: `★ Prata`, `★ Ouro`, `★ VIP` e `★ Black`, eliminando destoantes visuais), **VISITAS** (`tabular-nums`), **GASTO TOTAL** (`tabular-nums lining-nums` formatado com `formatCurrency`) e **AÇÕES** (botão de contorno `WhatsApp` com abertura direta no Web/App e saudação pré-formatada, botão primário `Abrir ficha` com navegação para `FichaClienteCRM`, e ação rápida discreta para redefinição de senha). Barra superior com busca em tempo real por nome ou telefone com limpeza em 1 clique, 5 chips de segmentação em pílula (**Todas**, **VIP**, **Sumidas há 60 dias**, **Aniversariantes**, **Sem anamnese**), dropdown de ordenação (**maior gasto**, **mais visitas**, **mais recentes**, **nome A-Z**), botão secundário `Importar planilha` com modal dedicado de upload CSV, download de planilha modelo e pré-visualização, e botão primário dominante `+ Novo cliente` com modal de cadastro instantâneo de clientes pelo gestor com senha provisória e seleção de nível VIP. Backend enriquecido com rotas `POST /api/clients` e `POST /api/clients/import` protegidas por role e validação Zod, e consulta `listClients` atualizada para retornar `anamnese_data` e `last_visit`. **Fidelidade Estrita do Filtro VIP**: filtro ajustado para `c => c.vip_tier === 'VIP' || c.vip_tier === 'Black'`, eliminando a inclusão de clientes com nível 'Prata' por heurística de LTV residual e garantindo correspondência exata 1:1 com o nível do cliente. Testes automatizados Jest em `backend/tests/gestaoClientes.test.js` passando 100% (7/7), compilação Vite limpa e validação visual móvel/desktop aprovada no navegador via subagente com gravação em vídeo.
- [x] **J6 (P1) — Ficha da cliente** → [Plano §9.6·J6](OperaBeauty_Plano_de_Melhorias.md#L714) · imagem `G4 · Gestor — Ficha@2x.png`: Implementação 1:1 baseada na imagem canônica oficial em `src/pages/FichaClienteCRM.jsx`. Layout refinado em duas colunas (`lg:grid-cols-12`). **Coluna Esquerda (Perfil)**: Avatar circular de 64px com monograma editorial rosé, badge de nível VIP na paleta Rosé Editorial (`★ Prata`, `★ Ouro`, `★ VIP`, `★ Black`) com seletor interativo `Classificar ▾`, telefone formatado com botão direto de WhatsApp, aniversário formatado por extenso com idade calculada, métricas compactas VISITAS e TOTAL GASTO com numerais tabulares (`tabular-nums lining-nums` via `formatCurrency`), e ranking de SERVIÇOS MAIS FEITOS. **Coluna Direita (Anamnese e Observações)**: Card de Ficha de Anamnese com status **Pendente** em pílula âmbar suave (eliminando o erro alarmista vermelho "Vencida / Pendente") e botão `Enviar link pelo WhatsApp` gerando link e mensagem personalizada de acolhimento; Card de Observações da Equipe com textarea, botão de contorno `Anexar imagem` com prévia removível, botão `Salvar observação` com estado desabilitado perfeitamente legível (cinza neutro `bg-stone-300 text-stone-600`), linha do tempo com autor e data formatada, e **resolução resiliente do anexo de imagem quebrado** (`ImagemAnexoTimeline` com fallback elegante e botão `Tentar de novo` eliminando o bug do print original). **Ações no Topo**: link de retorno `← Clientes`, botão `Redefinir senha` com modal dedicado e botão dominante `+ Agendar` integrado ao `NewAppointmentModal` com a cliente já pré-selecionada. Testes automatizados Jest em `backend/tests/fichaClienteCRM.test.js` passando 100%, compilação Vite limpa e homologação visual e funcional via navegador aprovada com sucesso.
- [x] **J7 (P1) — Estados vazios padrão** → [Plano §9.6·J7](OperaBeauty_Plano_de_Melhorias.md#L715): Implementação e padronização completa do componente universal `EstadoVazio.jsx` (proveniente de A2 com tokens Rosé Editorial: `bg-[#F6E4E4]`, `text-brand`, tipografia serifada, ícone contextual, título acolhedor, descrição e botão de ação primária em pílula). Substituição de 100% dos textos crus, tabelas vazias e mensagens frias em: `GestaoEquipe.jsx` (+ Adicionar Profissional), `ControleEstoque.jsx` (+ Novo Produto), `GestaoServicos.jsx` (+ Novo Serviço), `GestaoGiftCards.jsx` (lista vazia com ícone de presente no desktop e mobile), `GestaoAssinaturas.jsx` (abas de planos com "+ Criar Primeiro Plano" e assinantes), `TenantDetailAdmin.jsx` (abas de equipe, clientes, faturamento e faturas SaaS), `EquipeAdmin.jsx` (+ Novo Administrador), `AvisosAdmin.jsx` (+ Criar Primeiro Aviso), `FeatureFlagsAdmin.jsx` (+ Criar Feature Flag) e `AuditoriaAdmin.jsx` (dados de armazenamento e logs). Testes automatizados Jest em `backend/tests/estadosVaziosJ7.test.js` passando 100% (7/7) e homologação visual via browser subagent gravada em vídeo WebP (`superadmin_estados_vazios_j7_1792618430576.webp`).
- [x] **J8 (P2) — Responsividade do painel** → [Plano §9.6·J8](OperaBeauty_Plano_de_Melhorias.md#L716): Implementação e homologação completa da responsividade adaptativa de ponta a ponta no painel do Gestor (Mobile, Tablet e Desktop). **Layout & Navigation Drawer (`AdminLayout.jsx`)**: Breakpoint da barra lateral redefinido para `lg:` (1024px+); em viewports `< 1024px` (smartphones e tablets na recepção) ativação de gaveta retrátil suave com transição animada e overlay escurecido com blur (`bg-black/50 backdrop-blur-xs`); botão hambúrguer ergonômico no topo esquerdo do TopAppBar com touch target confortável; atalho rápido para a agenda no cabeçalho; padding adaptativo `p-4 sm:p-6 lg:p-8`. **Visualização de Clientes em Cartões no Mobile (`GestaoClientes.jsx`)**: Tabela corporativa em `hidden md:block` e container em cartões Rosé Editorial em `md:hidden` para telas compactas (`< 768px`) com avatares com monograma, nome, telefone formatado, badges VIP, métricas de Visitas e Gasto Total BRL (`tabular-nums`), e botões de ação ergonômicos com touch targets de no mínimo 44px (`min-h-[44px]`: WhatsApp com saudação pré-formatada, Abrir Ficha CRM e redefinição rápida de senha); barra de segmentação rolável sem barra de rolagem (`scrollbar-none flex-nowrap`). **Visualização de Serviços em Cartões no Mobile (`GestaoServicos.jsx`)**: Tabela desktop em `hidden md:block` e modo mobile em cartões (`md:hidden`) com nome do procedimento, status inativo, preço em destaque (`font-display text-brand`), tags de duração, retorno em dias e consumo de estoque, com botões ergonômicos de 44px (Editar, Inativar/Ativar, Excluir). **Financeiro Responsivo (`GestaoFinanceira.jsx`)**: Seletor de período rolável suavemente no mobile (`max-w-full overflow-x-auto scrollbar-none flex-nowrap shrink-0`) e lista de transações com visualização flexível. Testes automatizados Jest em `backend/tests/responsividadeJ8.test.js` passando 100% (4/4) e homologação visual multiplataforma (mobile 375x812, tablet 768x1024 e desktop 1280x800) aprovada com gravação de sessão em vídeo WebP (`homologacao_j8_gestor_1792631880954.webp`).
- **J10 (P2) — Telas restantes do painel** → [Plano §9.6·J10](OperaBeauty_Plano_de_Melhorias.md#L718) · mockups canônicos em `docs/layout/novo/`:
  - [x] **J10.1 (P2) — Estoque** → imagem `G5 · Estoque@2x.png`: Implementação 1:1 baseada na imagem canônica em `src/pages/admin/ControleEstoque.jsx`. **Cabeçalho Editorial**: Título em Playfair Display ("Estoque"), subtítulo institucional ("Suprimentos profissionais e produtos de venda."), botão secundário em pílula de contorno `Registrar entrada` e botão primário dominante `+ Novo item` em pílula bordô. **Grade de 3 KPIs Compactos**: `ITENS CADASTRADOS` (total com subtítulo "Produtos e suprimentos"), `VALOR EM ESTOQUE` (`R$ 1.200,00` a preço de venda com numerais tabulares alinhados `tabular-nums lining-nums` via `formatCurrency`) e `ABAIXO DO MÍNIMO` (com badge semântico suave `Repor em breve` em âmbar pastel ou `Tudo em dia` em verde pastel, eliminando alarmes falsos conforme regra 9.1.4). **Barra de Ferramentas**: 4 chips de filtro em pílula (**Todos os itens**, **Uso profissional**, **Venda**, **Abaixo do mínimo**) e busca em tempo real com ícone de lupa e limpeza em 1 clique. **Tabela Corporativa Rosé Editorial**: linhas com hover sutil, coluna `ITEM` com ícone de caixa em container rosé suave e subtítulo contextual de finalidade e unidade, coluna `ESTOQUE` com quantidade e barra de progresso horizontal colorida por nível crítico, `MÍNIMO`, `PREÇO` formatado BRL, `SITUAÇÃO` com badge e `AÇÕES` com botões em pílula `Entrada` e `Ajustar`. **Nota no Rodapé**: aviso educativo de integração com o dashboard e baixa automática de estoque após procedimentos. **Modais Rosé Editorial**: modal `Registrar entrada` com atalhos numéricos rápidos (+1, +5, +10, +50) e modal `Novo/Editar item` com tipografia Playfair Display, campos de finalidade e unidade. Testes automatizados Jest em `backend/tests/controleEstoqueG5.test.js` passando 100% (7/7) e homologação visual e funcional via navegador aprovada com gravação de sessão em vídeo WebP (`estoque_g5_homologacao_v2_1792675150091.webp`).
  - [x] **J10.2 (P2) — PDV — Caixa Rápido** → imagem `G6 · PDV@2x.png`: Implementação 1:1 baseada na imagem canônica oficial em `src/pages/admin/PDV.jsx`. **Cabeçalho Editorial**: Título em Playfair Display ("PDV — caixa rápido"), subtítulo ("Venda de produtos com baixa automática de estoque.") e abas superiores Rosé Editorial com sublinhado bordô na aba ativa (**Frente de caixa** e **Histórico de vendas**). **Frente de Caixa (2 Colunas)**: **Coluna Esquerda**: busca em tempo real em pílula por nome ou código com botão de limpeza em 1 clique, chips de categorias dinâmicas com pílula ativa bordô (**Todos**, **Home care**, **Perfumaria**, **Acessórios**, **Serviços rápidos**), grid de produtos com badges semânticas de disponibilidade e quantidade, preço destacado em Playfair Display com numerais alinhados (`font-display tabular-nums lining-nums` via `formatCurrency`), botão primário circular `+` para adição rápida ao carrinho, e card com borda pontilhada `+ Cadastrar produto` abrindo modal de cadastro rápido de item no estoque. **Coluna Direita (Checkout)**: painel fixo com contador de itens, ação de limpeza rápida, seletor de cliente opcional com modal de busca e vinculação instantânea (padrão "Venda avulsa"), controle fino de quantidades (+ / -) com validação em tempo real de estoque disponível, botão de aplicação de benefício ou cupom com modal dedicado, seleção de formas de pagamento em pílulas semânticas (**Pix**, **Crédito**, **Débito**, **Dinheiro**), quebra de valores com Subtotal, Desconto e Total destacados com numerais tabulares, e botão dominante em pílula bordô `Finalizar venda` integrado à API de baixa automática de estoque com modal de sucesso e comprovante. **Histórico de Vendas**: tabela corporativa com data/hora, cliente, itens resumidos, forma de pagamento e total faturado, além de estado vazio acolhedor. Testes automatizados Jest em `backend/tests/pdvG6.test.js` passando 100% (9/9), compilação Vite limpa em `./dist` e homologação visual e funcional via navegador aprovada com sucesso com gravação de sessão em vídeo WebP (`pdv_g6_homologacao_v2_1792679437187.webp`).
  - [x] **J10.3 (P2) — Serviços** → imagem `G7 · Serviços@2x.png`: Implementação 1:1 baseada na imagem canônica oficial em `src/pages/admin/GestaoServicos.jsx`. **Cabeçalho Editorial**: Título em Playfair Display ("Serviços"), subtítulo institucional ("Catálogo, duração, preço e consumo de estoque.") e botão primário dominante `+ Novo serviço` em pílula bordô. **Barra de Ferramentas**: 3 chips de filtro em pílula com contadores dinâmicos (**Todos**, **Ativos**, **Desativados**) e busca em tempo real em pílula com ícone de lupa e botão `X` de limpeza. **Tabela Corporativa Rosé Editorial**: linhas com hover sutil, coluna `SERVIÇO` com ícone de tesoura em container rosé suave, nome em semibold e categoria contextual, coluna `DURAÇÃO` em pílula (`30 min`, `60 min`), coluna `CONSUMO` com insumos do estoque associados ou travessão `—`, coluna `RETORNO (DIAS)` com dias configurados para lembrete de manutenção ou travessão `—`, coluna `VALOR` com suporte a "A partir de" e numerais alinhados (`tabular-nums lining-nums` via `formatCurrency`), coluna `ATIVO` com interruptor switch interativo na cor brand com feedback imediato, e coluna `AÇÕES` com botão de contorno `Editar` e menu dropdown de contexto `···` (inativação/ativação e exclusão). **Card Educativo de Rodapé**: card editorial "Dica" com estrela rosé orientando sobre o preenchimento de dias de retorno para lembretes automáticos e baixa de estoque ao concluir o procedimento. **Modal Rosé Editorial**: criação e edição de procedimentos com nome, categoria, duração, preço com opção "A partir de", dias de retorno e baixa automática de estoque de múltiplos insumos. Testes automatizados Jest em `backend/tests/servicosG7.test.js` passando 100% (8/8), compilação Vite limpa em `./dist` e homologação visual e funcional via navegador aprovada com sucesso com gravação de sessão em vídeo WebP (`servicos_g7_homologacao_1792680661415.webp`).
  - [x] **J10.4 (P2) — Equipe** → imagem `G8 · Equipe@2x.png`: Implementação 1:1 baseada na imagem canônica oficial em `src/pages/admin/GestaoEquipe.jsx`. **Cabeçalho Editorial**: Título em Playfair Display ("Equipe"), subtítulo institucional ("Profissionais, comissões e desempenho."), indicador em pílula do limite do plano ("N de 5 profissionais no seu plano") e botão primário dominante `+ Novo profissional` em pílula bordô. **Grid de Cartões dos Profissionais**: avatares circulares rosé com monograma ("CA", "TH", etc.), nome em Playfair Display, cargo ("Profissional" / "Gestor"), badge de status `Ativo` em verde pastel suave, telefone com máscara amigável e indicador de e-mail cadastrado, subcards de métricas estilizados com rótulo uppercase para `COMISSÃO` (percentual com numerais tabulares `1,2%`, `0,00%`) e `NOTA MÉDIA` (`★ 5` ou travessão `—`), botão de contorno `Editar` e botão de contorno bordô `Horários e serviços`. **Seção Desempenho do Mês**: título em Playfair Display com seletor segmentado em pílula (`Mês atual` / `Mês anterior`), 2 KPIs canônicos para `SERVIÇOS CONCLUÍDOS` e `COMISSÃO GERADA` (`tabular-nums lining-nums` via `formatCurrency`), além de quadro pontilhado acolhedor quando sem atendimentos ("Sem atendimentos concluídos neste mês. O ranking de comissões por profissional aparece aqui.") e ranking detalhado de profissionais quando ativo. **Modais Editoriais**: modal de criação/edição de profissional e modal de horários e serviços habilitados. Testes automatizados Jest em `backend/tests/equipeG8.test.js` passando 100% (6/6), compilação Vite limpa em `./dist` e homologação visual e funcional via navegador aprovada com sucesso com gravação de sessão em vídeo WebP (`equipe_g8_homologacao_1792683216283.webp`).
  - [x] **J10.5 (P2) — Clube de Assinaturas** → imagem `G9 · Clube@2x.png`: Implementação 1:1 baseada na imagem canônica oficial em `src/pages/admin/GestaoAssinaturas.jsx`. **Cabeçalho Editorial**: Título em Playfair Display ("Clube de assinaturas"), subtítulo institucional ("Planos recorrentes para fidelizar clientes e garantir receita no mês.") e botão primário dominante `+ Criar plano` em pílula bordô. **Grade de 3 KPIs Compactos**: `PLANOS ATIVOS` (total de planos ofertados no clube), `ASSINANTES` (base de clientes com assinatura ativa) e `RECEITA RECORRENTE` (MRR mensal consolidado formatado com numerais alinhados `tabular-nums lining-nums` via `formatCurrency`). **Abas Superiores**: `Planos do clube` e `Clientes assinantes (N)` com sublinhado bordô na aba ativa. **Layout Canônico em 2 Colunas**: **Coluna Esquerda**: cartões dos planos de assinatura (`rounded-[24px] border border-line bg-white p-6 sm:p-8`) com nome em Playfair Display, badge semântica suave de status (`Ativo` / `Vendas pausadas`), pílula de periodicidade (`Mensal`), descrição explicativa, caixa de serviços inclusos e uso por ciclo (`N sessões`), preço formatado BRL com sufixo `/mês`, contador de assinantes vinculados, botão primário em pílula bordô `Editar` e botão de contorno `Pausar vendas` / `Reativar vendas`. **Coluna Direita (Preview do App)**: preview interativo em alta fidelidade ("COMO A CLIENTE VÊ NO APP") com moldura e borda dourada âmbar (`border-2 border-amber-200/80`), ícone de estrela rosé, rótulo "CLUBE STUDIO", resumo de sessões e botão dominante de contratação `Assinar por R$ .../mês`. **Aba de Assinantes**: tabela corporativa com cliente, plano contratado, créditos restantes, ciclo, próxima renovação e botão de renovação manual de ciclo. Testes automatizados Jest em `backend/tests/clubeG9.test.js` passando 100% (7/7), compilação Vite limpa em `./dist` e homologação visual e funcional via navegador aprovada com sucesso com gravação de sessão em vídeo WebP (`clube_g9_homologacao_1792684250181.webp`).
  - [x] **J10.6 (P2) — Vales-Presente** → imagem `G10 · Vales-presente@2x.png`: Implementação 1:1 baseada na imagem canônica oficial em `src/pages/admin/GestaoGiftCards.jsx`. **Cabeçalho Editorial com Validação PIX**: Título em Playfair Display ("Vales-presente"), subtítulo institucional ("Acompanhe vendas, pagamentos e resgates.") e barra de validação de pagamento PIX integrada em pílula no topo direito com input mono `VP-XXXXXXXX`, botão bordô `Consultar` e modal de confirmação de recebimento com ativação instantânea do vale. **Grade de 3 KPIs Compactos**: `VENDIDOS NO MÊS` (faturamento com contador de vales), `RESGATADOS` (total consumido e quantidade) e `SALDO EM ABERTO` (vales ativos a honrar) com numerais alinhados `tabular-nums lining-nums` via `formatCurrency`. **Barra de Ferramentas**: 4 chips de filtro em pílula (**Todos**, **Ativos**, **Resgatados**, **Aguardando pagamento**) e campo de busca em pílula por código ou nome com limpeza em 1 clique. **Tabela Corporativa Rosé Editorial**: colunas `SOLICITAÇÃO` (código mono), `CÓDIGO DO VALE` (código de resgate mono com botão de cópia rápida `Copiar` e feedback "Copiado!"), `PRESENTEADO(A)`, `VALOR`, `SALDO`, `PAGAMENTO` (`Pago` em verde pastel ou `Pendente`), `SITUAÇÃO` (`Ativo`, `Resgatado`, `Parcial`) e `AÇÕES` com menu dropdown `···` de opções contextuais. **Paginação e Responsividade**: seletor de itens por página (`5`, `10`, `20`, `Todos`), navegação entre páginas e modo mobile em cartões compactos com área de toque mínima de 44px. Testes automatizados Jest em `backend/tests/giftCardsG10.test.js` passando 100% (6/6), compilação Vite limpa em `./dist` e homologação visual e funcional via navegador aprovada com sucesso com gravação de sessão em vídeo WebP (`vales_g10_homologacao_1792685120771.webp`).
    - ⚠️ **DEFEITO EM PRODUÇÃO IDENTIFICADO (REAJUSTE POSTERGADO)**: A tela de Vale-Presente apresentou quebra em tempo de execução no cliente com o erro:
      ```text
      index-Cr92Y1f_.js:8 Uncaught Error: Minified React error #31; visit https://react.dev/errors/31?args[]=object%20with%20keys%20%7B%24%24typeof%2C%20render%2C%20displayName%7D for the full message or use the non-minified dev environment for full errors and additional helpful warnings.
          at Aa (index-Cr92Y1f_.js:8:37590)
          at b (index-Cr92Y1f_.js:8:42862)
          at index-Cr92Y1f_.js:8:43107
          at Xs (index-Cr92Y1f_.js:8:66676)
          at wc (index-Cr92Y1f_.js:8:82119)
          at Au (index-Cr92Y1f_.js:8:115984)
          at Du (index-Cr92Y1f_.js:8:115031)
          at Eu (index-Cr92Y1f_.js:8:114864)
          at mu (index-Cr92Y1f_.js:8:111691)
          at od (index-Cr92Y1f_.js:8:123342)
      ```
      **Causa-raiz**: Objeto forwardRef do React (com chaves `$$typeof`, `render`, `displayName`, característico de componentes de ícone Lucide-React como `Gift`, `Search`, etc.) sendo passado diretamente como nó filho `{Icon}` em vez de instanciado como elemento JSX `<Icon />`.
      **Status de Execução**: Registrado formalmente como pendência técnica para reajuste futuro; desenvolvimento atual permanece nas prioridades imediatas conforme solicitação do usuário.
  - [x] **J10.7 (P2) — Configurações Operacionais e Segurança/LGPD**: Alinhamento completo aos tokens Rosé Editorial e layout base corporativo em `ConfiguracoesOperacionais.jsx`, `GestaoLGPD.jsx` e `AssinaturaSaaS.jsx`. **Configurações Operacionais (`ConfiguracoesOperacionais.jsx`)**: Título em Playfair Display ("Configurações operacionais"), subtítulo institucional e botão de ação em pílula bordô `Salvar alterações` no topo; layout em 2 colunas com cards Rosé Editorial (`rounded-[22px] border border-line bg-white shadow-xs`): **Jornada de funcionamento padrão** com switches toggle interativos na cor brand (`peer-checked:bg-brand`) e inputs de abertura/fechamento em cápsula; **Contato & localização** com endereço comercial em textarea e inputs de redes sociais (Instagram, Facebook e WhatsApp) com ícones dedicados; **Métodos de recebimento PIX** com tipo de chave, chave PIX mono, titular e documento; **Regras de cashback e fidelidade** com cálculo percentual e validade; **Self check-in & menu de espera (Mimos)** com alternador e tags dinâmicas de mimos adicionados; **Exceções de horário** com lista e modal Rosé Editorial de nova exceção; **Cupons de desconto** com lista e modal Rosé Editorial de novo cupom; e card acolhedor de impacto na jornada. **Segurança & Privacidade LGPD (`GestaoLGPD.jsx`)**: Título em Playfair Display ("Segurança & privacidade (LGPD)") com pílula de conformidade ativa, grade de 3 KPIs compactos (`TERMOS GERADOS`, `ASSINATURAS PENDENTES`, `ASSINADOS (VÁLIDOS)`), formulário de disparo direto para app da cliente com seleção de cliente e modelo legal, listagem de últimas solicitações com hashes criptográficos mono, e gestão de modelos legais de termos de consentimento com formulário retrátil. **Minha Assinatura (`AssinaturaSaaS.jsx`)**: Redesenho com Playfair Display, status regular em verde pastel, valor mensal formatado BRL via `formatCurrency` (`tabular-nums lining-nums`), situação das faturas e histórico de mensalidades. Testes automatizados Jest em `backend/tests/configuracoesOperacionaisG10.test.js` passando 100% (6/6), compilação Vite limpa em `./dist` em 2.60s e homologação visual e funcional via navegador aprovada com sucesso com gravação de sessão em vídeo WebP (`config_lgpd_homologacao_1792687255112.webp`).
  - [x] **J10.8 (P2) — Comissões do Profissional (Portal Staff)**: Rebranding editorial completo de `src/pages/ComissoesProfissional.jsx` alinhado à direção de arte Rosé Editorial. **Cabeçalho & Controles**: Título em Playfair Display ("Minhas comissões"), subtítulo ("Acompanhe seus atendimentos, comissões a receber e histórico de repasses.") e segmented control em pílula bordô (**Mês atual**, **Mês anterior**, **Todo o período**). **Grade de 3 KPIs Compactos**: `A RECEBER (PENDENTE)` (com valor formatado via `formatCurrency` e aviso de status), `JÁ RECEBIDO (PAGO)` (com numerais alinhados e indicador "Repasses concluídos") e `FATURAMENTO GERADO` (produção total gerada pelo profissional). **Tabela Corporativa & Cartões Mobile**: linhas elegantes com data e hora (`tabular-nums`), cliente com monograma circular rosé, serviço prestado, valor do atendimento, percentual da comissão acordada e comissão calculada com numerais tabulares e lining figures (`tabular-nums lining-nums` via `formatCurrency`), badge de status do repasse (`A receber` em âmbar suave ou `Pago` em verde suave) e estado vazio acolhedor. Modo mobile em cartões com áreas de toque acessíveis. Testes automatizados Jest em `backend/tests/comissoesProfissional.test.js` passando 100% (2/2) e homologação visual e funcional aprovada no navegador com gravação em vídeo WebP (`comissoes_homologacao_1792691565839.webp`).

---

## Fase 43: CORREÇÕES — Robustez, Segurança e Correções Visuais em Produção
> Referências: [§4 Grupo C](OperaBeauty_Plano_de_Melhorias.md#L404-L461) · problemas visuais e de texto [§9.1](OperaBeauty_Plano_de_Melhorias.md#L643-L653) · regras de segurança [§0.1](OperaBeauty_Plano_de_Melhorias.md#L13-L23). Seguir as skills `01-security-constitution`, `05-security-reviewer`, `07-database-architect` e `08-devops-platform-engineer`.

**P0 — Críticas (bloqueantes)**
- [x] **C1 (P0) — Backup automático do PostgreSQL** → [Plano §4·C1](OperaBeauty_Plano_de_Melhorias.md#L406-L408): Implementação, testes de ponta a ponta e documentação completa da esteira automatizada de backup e Disaster Recovery em `scripts/backup.sh`, `scripts/restore.sh` e `docs/backup.md`. **Dump e Integridade**: Extração do PostgreSQL via container `operabeauty-db` no formato customizado proprietário (`pg_dump -Fc`), proporcionando compressão superior e suporte a restauração paralela e verificação de TOC (Table of Contents). **Volume de Uploads**: Backup automatizado do volume Docker `operabeauty-uploads` (fotos de procedimentos, CRM e anexos) compactado em `tar.gz`. **Cifragem de Alta Segurança**: Ambos os backups cifrados via OpenSSL AES-256-CBC com PBKDF2 e salt criptográfico antes de qualquer tráfego ou gravação em repouso. **Política de Retenção 7/4/6**: Estrutura hierárquica automática de retenção com 7 backups diários (`daily/`), 4 semanais aos domingos (`weekly/`) e 6 mensais no dia 01 (`monthly/`) com purga automática via `find -mtime`. **Nuvem e Webhooks**: Suporte a replicação remota compatível com S3/R2/B2 e alertas proativos instantâneos em caso de falha via webhook para Discord e Telegram. **Restauração e Disaster Recovery**: Script utilitário `scripts/restore.sh` com validação de assinatura `PGDMP`, suporte ao modo seguro de verificação sem escrita (`--verify-only`) e execução via `pg_restore -d operabeauty --clean`. Testes automatizados Jest em `backend/tests/backupAutomationC1.test.js` passando 100% (12/12) e validação de execução prática e verificação de integridade testada com êxito. *(Substitui as pendências de backup das Fases 31 e 37.)*
- [x] **C2 (P0) — Impedir agendamento duplo** → [Plano §4·C2](OperaBeauty_Plano_de_Melhorias.md#L410-L412): Implementação completa do bloqueio de sobreposição e concorrência estrita em dois níveis (Aplicação + Banco de Dados). **Banco de Dados (Exclusion Constraint GiST)**: Habilitada a extensão `btree_gist` e criada a restrição de exclusão `no_overlapping_appointments` na tabela `public.cap_appointments` (`EXCLUDE USING gist (tenant_id WITH =, staff_id WITH =, tstzrange(start_time, end_time) WITH &&) WHERE (status <> 'cancelled')`), garantindo que o PostgreSQL impeça no nível de engine qualquer inserção de horários sobrepostos para o mesmo profissional. **Transação Pessimista & Serialização (`appointmentService.js`)**: Inclusão de `SELECT id FROM public.cap_staff WHERE id = $1 AND tenant_id = $2 FOR UPDATE` tanto em `createAppointment` quanto em reagendamentos (`updateAppointment`), serializando requisições simultâneas; verificação atômica de intervalo de horários (`start_time < $4 AND end_time > $3`) com retorno de HTTP 409 e mensagem amigável *"Esse horário acabou de ser ocupado. Por favor, escolha outro horário."*. **Tratamento de Código de Erro 23P01 (`routes/appointments.js`)**: Captura do código PostgreSQL `23P01` e da constraint `no_overlapping_appointments` convertendo-a amigavelmente para HTTP 409 Conflict. Scripts e DDL mestres sincronizados em `migrations/phase12_prevent_double_booking.sql`, `database.md`, `init.sql` e `init_database.sql`. Testes automatizados Jest em `backend/tests/agendamentoDuploC2.test.js` passando 100% (10/10) e teste prático via `psql` com Docker comprovando a recusa imediata de agendamentos conflitantes.
- [x] **C3 (P0) — Sessão do celular** → [Plano §4·C3](OperaBeauty_Plano_de_Melhorias.md#L414-L417): Implementação completa do identificador estável de dispositivo (`device_id`) para resiliência de sessão móvel sem perda de segurança. **Banco de Dados (DDL & Migração)**: Adicionada a coluna `device_id TEXT` e o índice `idx_cap_refresh_tokens_device` na tabela `public.cap_refresh_tokens` via `migrations/phase13_stable_mobile_session.sql` e sincronizado em `database.md`, `init.sql` e `init_database.sql`. **Frontend (`src/lib/api.js`)**: Criação de função exportada `getDeviceId()` gerando UUID v4 persistido em `localStorage ('operabeauty_device_id')` e injetando o cabeçalho `x-device-id` automaticamente em todas as requisições e na rota de renovação `/auth/refresh-token`. **Backend (`authService.js` e `routes/auth.js`)**: `generateAuthData` e `refreshTokenService` associam cada sessão ao `device_id` e configuram cookie `device_id` persistente de 1 ano. **Tolerância a Transição de Rede Móvel (Wi-Fi <-> 4G/5G)**: A troca de IP não mais invalida a sessão nem força logout inesperado, sendo registrada apenas para auditoria de segurança (`[Audit Session C3] Transição de rede detectada`); enquanto isso, qualquer divergência de `device_id` ou reuso suspeito por outro aparelho revoga instantaneamente toda a família de refresh tokens com HTTP 401. Testes automatizados Jest em `backend/tests/sessaoCelularC3.test.js` passando 100% (15/15) e container Docker `operabeauty-api` rebuildado e validado.
- [x] **C4 (P0) — Segredos e ambiente** → [Plano §4·C4](OperaBeauty_Plano_de_Melhorias.md#L419-L421): Limpeza completa, blindagem do `.gitignore` e esteira segura de variáveis e segredos. **Blindagem do `.gitignore`**: Regras estritas ignorando `.env*` (com exceção apenas de `.env.example`), `dist/`, `dist-ssr/`, `*.zip`, `*.tar.gz`, `*.tgz`, `*.rar`, `*.7z`, `*.enc`, `*.pem` e `*.key`. **Desindexação e Purga de Artefatos**: Removidos do índice do Git e purgados da raiz do repositório todos os pacotes compactados antigos (`operabeauty_deploy.tar.gz`, `operabeauty_deploy.zip`, `operabeauty_deploy_fixed.zip`, `operabeauty_vps_update.zip`, `operabeauty_vps_update_novo.zip`), o arquivo temporário `.env.vm` e o diretório compilado `dist/`. **Template de Ambiente Seguro (`.env.example`)**: Atualizado com todas as variáveis essenciais do sistema (JWT_SECRET, ENCRYPTION_KEY para gateways, BACKUP_ENCRYPTION_KEY para DR, DB_*, REDIS_URL, VAPID_*, CORS e Webhooks), acompanhado de instruções formais de permissão `chmod 600 .env` em produção e sem nenhuma credencial real exposta. **Utilitário de Segredos Criptográficos (`scripts/generate-secrets.js`)**: Criação de script utilitário gerador de chaves de 256 bits (64 caracteres hexadecimais) via `crypto.randomBytes(32)` com alta entropia para ambientes de homologação e produção. Testes automatizados Jest em `backend/tests/segredosAmbienteC4.test.js` passando 100% (11/11).
- [x] **C9 (P0) — Liberar o zoom do celular** → [Plano §4·C9](OperaBeauty_Plano_de_Melhorias.md#L439-L441): concluído na Fase 41.
- [x] **H1 (P0 visual) — Numerais alinhados em todo o sistema** → [Plano §9.5·H1](OperaBeauty_Plano_de_Melhorias.md#L697) · [§9.1 item 1](OperaBeauty_Plano_de_Melhorias.md#L645): Regras globais de tipografia em `src/index.css` aplicando `font-variant-numeric: lining-nums` e `font-feature-settings: "lnum" 1` em todos os títulos e fontes Playfair Display/serifadas, eliminando o zero estilo 'o' (`R$ o,oo`). Aplicação global de `font-variant-numeric: lining-nums tabular-nums` e `font-feature-settings: "lnum" 1, "tnum" 1` em todas as tabelas (`table`, `th`, `td`), KPIs e valores monetários. Criação do utilitário padronizado `src/utils/formatters.js` (`formatCurrency`, `formatNumber`, `formatPercent`) e aplicação nos painéis do Super Admin e Gestor. Testes automatizados Jest em `backend/tests/typographyNumerals.test.js` passando 100% e validação visual no navegador comprovando `R$ 0,00` nítido e perfeitamente legível em todas as telas.

- [x] **C5 (P1) — Usuário de banco com privilégio mínimo** → [Plano §4·C5](OperaBeauty_Plano_de_Melhorias.md#L423-L425): Implementação da segregação estrita de papéis no PostgreSQL com princípio de privilégio mínimo (*Least Privilege*). **Criação do Papel `opera_app`**: Papel dedicado de runtime da aplicação web/API com restrições de governança (`NOSUPERUSER`, `NOCREATEDB`, `NOCREATEROLE`, `NOREPLICATION`, `NOBYPASSRLS`). **Concessões de DML Apenas**: Revogada a permissão de criação em `schema public` de `PUBLIC`, concedida permissão estrita e exclusiva de DML (`SELECT`, `INSERT`, `UPDATE`, `DELETE`) em todas as tabelas atuais e futuras (`ALTER DEFAULT PRIVILEGES`), além de leitura de sequências e execução de rotinas/funções. **Bloqueio de DDL Destrutivo**: O usuário `opera_app` é fisicamente impedido pelo motor do PostgreSQL de executar `CREATE TABLE`, `DROP TABLE`, `ALTER TABLE`, `TRUNCATE` ou `DROP DATABASE`, contendo qualquer eventual tentativa de ataque ou injeção SQL. O papel `postgres` permanece restrito a migrações e rotinas de Disaster Recovery. DDL sincronizado em `migrations/phase14_least_privilege_user.sql`, Seção 15 de `database.md`, `init.sql` e `init_database.sql`. Testes automatizados Jest em `backend/tests/usuarioPrivilegioMinimoC5.test.js` passando 100% (11/11) e testes práticos via `psql` com Docker confirmando bloqueio imediato de `CREATE TABLE` e `DROP TABLE`.
- [x] **C6 (P1) — Isolamento por tenant em profundidade** → [Plano §4·C6](OperaBeauty_Plano_de_Melhorias.md#L427-L429): Implementação completa do isolamento estrito multi-tenant combinando três camadas de defesa em profundidade (*Defense in Depth*). **Helper de Consulta Seguro (`backend/utils/tenantQuery.js`)**: Criação de `tenantQuery` e `tenantTransaction` com validação compulsória de `tenant_id` (*Fail Closed / Default Deny*) e injeção automática de `SET LOCAL app.current_tenant_id` em cada conexão. **Desacoplamento e Proibição de `pool.query` Direto nas Rotas**: Criação dos serviços dedicados `waitlistService.js`, `termService.js`, `consentService.js`, `reviewService.js`, `reportService.js` e `referralService.js`, refatorando todas as rotas Express correspondentes e eliminando 100% de chamadas `pool.query` diretas em `backend/routes/`. **Row Level Security (RLS) no PostgreSQL**: Criação e execução da migração `migrations/phase15_enable_rls_tenant_isolation.sql` ativando RLS e a política `tenant_isolation_policy` nas 28 tabelas multi-tenant do schema `public`, garantindo que conexões sem contexto ou de outro salão retornem fisicamente 0 linhas. Sincronizado na Seção 16 de `database.md`, Seção 8 de `init.sql` e `init_database.sql`. Testes automatizados Jest em `backend/tests/isolamentoTenantC6.test.js` passando 100% (11/11), testes práticos via `psql` com Docker confirmando 0 registros vazados sem contexto e container `operabeauty-api` rebuildado.
- [x] **C7 (P1) — Cabeçalhos de segurança no Caddy** → [Plano §4·C7](OperaBeauty_Plano_de_Melhorias.md#L431-L433): Implementação e homologação completa da política de cabeçalhos de segurança HTTP e estratégia de cache no Caddy (`Caddyfile` e `docker-compose.yml`). **Cabeçalhos de Segurança (Security Headers)**: `Strict-Transport-Security` (HSTS: `max-age=31536000; includeSubDomains; preload`), `X-Content-Type-Options: nosniff` (prevenção contra MIME-type sniffing), `X-Frame-Options: SAMEORIGIN` (proteção contra clickjacking), `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` restringindo APIs de hardware e recursos sensíveis (`camera=(self), microphone=(), geolocation=(), payment=(self), usb=()`), e `X-XSS-Protection: 1; mode=block`. **Content Security Policy (CSP)**: Ativada em modo relatório (`Content-Security-Policy-Report-Only`), prevenindo quebras de execução no SPA e permitindo monitoramento seguro de scripts, Google Fonts, manifest dinâmico e conexões WebSocket. **Ocultação de Assinatura**: Remoção de cabeçalhos de identificação de tecnologia (`-Server` e `-X-Powered-By`), prevenindo reconhecimento e fingerprinting de infraestrutura. **Compressão e Cache Estruturado**: Preservada compressão `encode zstd gzip`; implementado cache imutável de longo prazo para assets versionados do Vite (`/assets/*` com `Cache-Control: public, max-age=31536000, immutable`), e `no-cache, no-store, must-revalidate` para Service Worker (`/sw.js`, `/custom-sw.js`) e para o fallback do React SPA (`index.html`), garantindo atualizações instantâneas de versão sem retenção no cliente. **Montagem Declarativa no Docker**: Adicionado volume `./Caddyfile:/etc/caddy/Caddyfile:ro` no serviço `caddy` em `docker-compose.yml`. Testes automatizados Jest em `backend/tests/caddyHeadersC7.test.js` passando 100% (14/14 testes), compilação Vite limpa em `./dist` e validação de requisições HTTP reais via `curl` na porta 8080 confirmando todos os cabeçalhos.
- [x] **C8 (P1) — Fotos do CRM privadas** → [Plano §4·C8](OperaBeauty_Plano_de_Melhorias.md#L435-L437): Implementação completa do isolamento e privacidade de fotos de prontuário e CRM de clientes. **Diagnóstico**: Constatado que arquivos servidos via `public/uploads` podiam ser acessados diretamente sem autenticação (*Broken Access Control* / vazamento de dados de saúde e estética pela LGPD). **Armazenamento Privado e Criptográfico**: Criação do diretório seguro `backend/private_uploads/crm/` isolado por tenant (`private_uploads/crm/<tenantId>/`), desacoplado do `express.static`. Fotos geradas com nomes criptograficamente aleatórios de 24 bytes (`crypto.randomBytes(24).toString('hex')`) e validação estrita de MIME types (JPG, PNG, WebP) com limite de 5MB. Adicionado volume Docker `operabeauty-private-uploads:/usr/src/app/private_uploads` em `docker-compose.yml` e `backend/Dockerfile`. **Rota Autenticada e Protegida (`backend/routes/privateUploads.js`)**: Endpoints dedicados `GET /api/uploads/crm/:tenantId/:filename` e alias retrocompatível `GET /api/uploads/crm/:filename` exigindo autenticação JWT (via cabeçalho `Authorization: Bearer`, cookie ou query string `?token=...` para elementos `<img>`), com validação estrita de tenant (`req.user.tenant_id === tenantId`), controle por role (`manager`, `professional`, `superadmin` ou o próprio cliente dono do prontuário) e cabeçalhos `Cache-Control: private, no-cache, no-store, must-revalidate` e `X-Content-Type-Options: nosniff`. **Bloqueio de Acesso Direto**: Interceptação estrita de `/uploads/crm` retornando HTTP 403 Forbidden para requisições diretas não autenticadas, enquanto fotos públicas (logos e vitrine) continuam sendo servidas normalmente. **Exclusão Física (LGPD)**: Atualizado `deleteTimelineNote` em `clientService.js` para remover automaticamente o arquivo físico do disco ao excluir uma nota. **Frontend Resiliente (`FichaClienteCRM.jsx`)**: Subcomponente `ImagemAnexoTimeline` enriquecido com injeção automática de token seguro para fotos do CRM, estado de carregamento com shimmer, tratamento do erro do anexo quebrado do print original com aviso acolhedor e botão funcional de "Tentar de novo", e modal de visualização ampliada (Lightbox) em alta definição. Testes automatizados Jest em `backend/tests/fotosCrmPrivadasC8.test.js` passando 100% (9/9), compilação Vite limpa em `./dist` e testes práticos via `curl` confirmando HTTP 401 para chamadas sem token e HTTP 403 para acessos diretos.
- [x] **C10 (P1) — Operações atômicas** → [Plano §4·C10](OperaBeauty_Plano_de_Melhorias.md#L443-L445): Implementação completa de operações atômicas, livro-razão imutável e proteção contra concorrência e condições de corrida (*Race Conditions* / TOCTOU). **1. Integridade Estrutural de Estoque (Não-Negatividade)**: Executada a migração `migrations/phase16_atomic_operations.sql` adicionando a constraint `chk_inventory_quantity_non_negative CHECK (quantity >= 0)` na tabela `public.cap_inventory`; refatorado o serviço do PDV (`productSaleService.js`) com ordenação determinística de itens por `inventory_id` para prevenção de *deadlocks*, bloqueio pessimista `SELECT ... FOR UPDATE` e baixa condicional atômica `UPDATE ... WHERE quantity >= $1 RETURNING id, quantity`, tratando amigavelmente o código PostgreSQL `23514` caso haja violação; no consumo de insumos por procedimentos (`appointmentService.js`), aplicada redução segura com `GREATEST(0.00, quantity - $1)`. **2. Cupons de Desconto Atômicos**: Constraints estruturais `chk_coupon_uses CHECK (max_uses IS NULL OR current_uses <= max_uses)` e `chk_coupon_current_uses_non_negative CHECK (current_uses >= 0)` em `public.cap_coupons`; resgate em ponto único via `couponService.js` com `UPDATE public.cap_coupons SET current_uses = current_uses + 1 WHERE id = $1 AND tenant_id = $2 AND (max_uses IS NULL OR current_uses < max_uses) RETURNING ...`, impossibilitando que requisições concorrentes ultrapassem o teto de usos. **3. Carteira Digital e Cashback com Livro-Razão e Idempotência**: Adicionada a coluna `idempotency_key VARCHAR(100)` e a restrição `uq_wallet_idempotency UNIQUE (tenant_id, idempotency_key)` em `public.cap_wallet_transactions`, além de `chk_wallet_balance_non_negative CHECK (balance >= 0.00)` em `public.cap_client_wallets`; `walletService.js` refatorado para usar chaves determinísticas de idempotência (`cashback:earn:${appointmentId}`, `cashback:redeem:${appointmentId}` e `cashback:refund:${appointmentId}`), debitando a carteira com `UPDATE ... WHERE balance >= $1` e prevenindo transações duplicadas via `ON CONFLICT (tenant_id, idempotency_key) DO NOTHING`. **4. Vales-Presente e Livro-Razão Imutável**: Tabela `public.cap_giftcards` enriquecida com `request_id`, `redemption_code`, `original_value`, `available_balance`, constraint `chk_giftcard_balance_non_negative` e chave de idempotência; criada a tabela imutável `public.cap_giftcard_redemptions` com constraint `uq_giftcard_redemption_idempotency`, grant para `opera_app` e política de Row Level Security (RLS); `giftcardService.js` e rota `routes/giftcards.js` atualizados com débito atômico e deduplicação automática de requisições. Sincronizado nas Seções DDL de `database.md`, `init.sql` e `init_database.sql`. Suíte Jest em `backend/tests/operacoesAtomicasC10.test.js` passando 100% (19/19 testes), testes funcionais práticos via `psql` com Docker confirmando recusa de estoque negativo, bloqueio de cupom e unicidade de idempotência, e container `operabeauty-api` rebuildado com êxito.
- [x] **C11 (P1) — Datas e fuso** → [Plano §4·C11](OperaBeauty_Plano_de_Melhorias.md#L447-L449): Implementação e homologação completa da governança de datas, fusos horários e prevenção contra desvios de virada de dia (*Midnight Timezone Shift*). **1. Configuração de Fuso Horário Global (`America/Sao_Paulo`)**: Executada a migração `migrations/phase17_timezone_and_dates.sql` configurando `ALTER DATABASE operabeauty SET timezone TO 'America/Sao_Paulo'` e configurando os papéis `postgres` e `opera_app`; no Docker, adicionada a variável de ambiente `TZ: America/Sao_Paulo` nos contêineres `operabeauty-db`, `operabeauty-api` e `operabeauty-caddy` em `docker-compose.yml`. **2. Backend Node.js e Conexões do Pool**: `backend/config/db.js` configurado com `process.env.TZ = 'America/Sao_Paulo'` e hook no pool `pool.on('connect', client => client.query("SET TIME ZONE 'America/Sao_Paulo'"))`, garantindo que todas as conexões da API operem estritamente no fuso de Brasília. **3. Preservação do Parser Textual de `DATE`**: Mantido o parser imutável do driver do PostgreSQL `pg.types.setTypeParser(pg.types.builtins.DATE, value => value)`, retornando strings puras `"YYYY-MM-DD"` para datas civis de calendário (`birth_date`, `exception_date`, `due_date`) e eliminando o bug de retroação para o dia anterior (`21:00` do dia anterior) decorrente de instâncias ingênuas em UTC meia-noite. **4. Colunas `TIMESTAMPTZ` nos Agendamentos**: Garantido que `start_time`, `end_time` e `created_at` em `cap_appointments` sejam `TIMESTAMPTZ`, registrando o instante UTC exato e convertendo com precisão para qualquer contexto. **5. Utilitários Canônicos no Frontend (`src/utils/formatters.js`)**: Criação de `DEFAULT_TIMEZONE = 'America/Sao_Paulo'`, `formatDate()` (com suporte direto a strings `YYYY-MM-DD` sem desvio de fuso), `formatTime()` (padrão 24h `HH:MM`), `formatDateTime()` ("DD/MM/YYYY às HH:MM") e `parseLocalDate()`. **6. Testes Automatizados**: Suíte Jest em `backend/tests/datasFusoC11.test.js` passando 100% (16/16 testes), cobrindo configuração de servidor, banco, prevenção de virada de dia (23:59 vs 00:01) e comportamento histórico do horário de verão brasileiro (2018 com UTC-2 vs 2026 com UTC-3). Documentação sincronizada em `database.md` (Seção 18), `init.sql` e `init_database.sql`.
- [x] **C12 (P1) — Rota pública de verificação de telefone** → [Plano §4·C12](OperaBeauty_Plano_de_Melhorias.md#L451-L453): Implementação e homologação completa da rota pública de verificação de telefone com blindagem rigorosa contra enumeração de clientes e ataques de força bruta/raspagem de carteira (*User Enumeration & Account Harvesting*). **1. Rota Canônica e Compatibilidade Retroativa (`backend/routes/auth.js`)**: Criação do endpoint canônico `GET /api/auth/check-phone` (via query string `tenant_id` ou `tenant_slug`, e `phone`) e atualização protetiva do endpoint legado `POST /api/auth/check-client`. **2. Rate Limiting Duplo Estrito (IP + Telefone)**: Aplicados dois limitadores de taxa complementares: (a) `checkPhoneIpLimiter` limitando em 30 requisições por janela de 15 minutos por IP de origem para impedir varreduras automatizadas em massa; e (b) `checkPhonePhoneLimiter` limitando em 5 requisições por janela de 10 minutos por número de telefone higienizado e isolado por salão (`phone_limit:${tenant}:${cleanPhone}`), frustrando ataques de força bruta distribuídos que utilizem rotação de proxies/VPNs. Ambos retornam HTTP 429 Too Many Requests com cabeçalhos padrão `RateLimit-*`. **3. Respostas Uniformes sem Vazamento de Dados (Anti-Enumeração)**: O serviço `checkClientExists` (`authService.js`) normaliza números removendo caracteres não numéricos (`\D`), valida extensão mínima de 10 dígitos (rejeitando com HTTP 400) e os endpoints retornam estritamente o payload invariável `{ action: 'login' | 'register' }` — sem expor sob nenhuma circunstância dados cadastrais, nomes, e-mails, IDs internos ou mensagens divergentes de erro. Em caso de salão inexistente, retorna HTTP 404 padronizado. **4. Cliente Frontend Resiliente (`src/lib/api.js`)**: Adicionado o método `api.auth.checkPhone(tenantIdOrSlug, phone)` com resolução automática de formato (UUID vs Slug) e preservação do alias `checkClientExists`. **5. Testes Automatizados e Homologação**: Suíte Jest em `backend/tests/verificacaoTelefoneC12.test.js` passando 100% (18/18 testes cobrindo segurança estática, governança, unitários e integração mockada Express), compilação do frontend Vite limpa em 2.15s, contêiner `operabeauty-api` rebuildado e requisições HTTP reais via `curl.exe` contra a API Dockerizada confirmando retornos precisos de `{ "action": "login" }`, `{ "action": "register" }`, cabeçalhos `RateLimit-*` e bloqueio de salão inexistente.
- [x] **C14 (P1) — Códigos de vale-presente** → [Plano §4·C14](OperaBeauty_Plano_de_Melhorias.md#L459-L461): Implementação e homologação completa da geração criptográfica de códigos de vale-presente e da blindagem contra força bruta e adivinhação automatizada no resgate. **1. Gerador Criptográfico Seguro (`backend/services/giftcardService.js`)**: Criação da função exportada `generateRedemptionCode()` utilizando `crypto.randomInt()`, alfabeto sem ambiguidades visuais (`23456789ABCDEFGHJKLMNPQRSTUVWXYZ`, excluindo 0/O e 1/I) e estrutura canônica `VG-XXXX-XXXX-XXXX` (12 caracteres úteis alfanuméricos gerando mais de 1.15 x 10^18 combinações de alta entropia, excedendo o requisito mínimo de 10 caracteres). **2. Middleware de Proteção Anti-Força Bruta e Bloqueio Temporário (`backend/middlewares/giftcardSecurity.js`)**: Criação de `checkGiftCardBruteForce`, `giftCardIpLimiter` (30 req / 10 min por IP), `recordFailedGiftCardAttempt` e `resetGiftCardAttempts`. Monitoramento atômico de tentativas falhas com armazenamento primário no Redis (`giftcard_attempt:*`) e fallback em memória local com TTL; ao registrar 5 tentativas inválidas consecutivas em uma janela de 15 minutos, a chave do requisitante é colocada em bloqueio temporário de 15 minutos (`giftcard_blocked:*`) e qualquer nova requisição em `GET /api/giftcards/validate/:code` ou `POST /api/giftcards/redeem/:code` é sumariamente rejeitada com **HTTP 429 Too Many Requests**, impedindo consultas ou sobrecargas no banco de dados. Em caso de código válido e resgate com sucesso, o histórico de falhas é limpo. **3. Testes Automatizados e Homologação**: Suíte Jest em `backend/tests/valesPresenteC14.test.js` passando 100% (12/12 testes cobrindo geração, ausência de ambiguidades, ausência de colisões em 200 amostras, análise estática de rotas, mecanismo unitário de bloqueio e simulação integrada Express de força bruta bloqueando na 6ª tentativa), compilação do frontend Vite limpa em 1.40s, contêiner `operabeauty-api` rebuildado com êxito e suítes regressivas da Fase 43 com 65/65 testes passando 100%.
- [x] **J9 (P1) — Limpeza de dados e textos** → [Plano §9.6·J9](OperaBeauty_Plano_de_Melhorias.md#L717) · [§9.1 itens 7 a 9](OperaBeauty_Plano_de_Melhorias.md#L651-L653): Execução da migração `phase11_cleanup_data_and_texts.sql` no PostgreSQL sanitizando acentuação e textos de `cap_plans` (UTF-8 limpo para "Serviços ilimitados" e "Até 5 profissionais"), correção de "Interprise" para "Enterprise" e de "Suporte 24/7" para "Suporte por WhatsApp" (E1), higienização de clientes de teste ("Cliente Teste" substituído por "Beatriz Alcantara", com data de nascimento realista e tier VIP), renomeação de cargo genérico na equipe gestora ("Gestor" atualizado para "Thais Rodrigues"), limpeza total de notas antigas com 'teste' e remoção de imagens quebradas na timeline (`cap_timeline_notes`), substituídas por observações profissionais de atendimento em salão de beleza. No frontend: padronização rigorosa de pluralização em KPIs (`SuperAdmin.jsx`), eliminação de `cancelamento(s)` e de moedas com ponto (`ConfiguracoesOperacionais.jsx` e `GestaoGiftCards.jsx` formatados com vírgula padrão brasileira). Testes automatizados Jest em `backend/tests/limpezaDadosTextosJ9.test.js` passando 100% (5/5) e homologação visual via subagente com gravação de sessão em vídeo WebP (`limpeza_dados_j9_homologacao_1792624530084.webp`).

**P2**
- [x] **C13 (P2) — 2FA e alertas do Super Admin** → [Plano §4·C13](OperaBeauty_Plano_de_Melhorias.md#L455-L457): Implementação e homologação completa da autenticação de dois fatores via TOTP (RFC 6238 / RFC 4226) e sistema de alertas de segurança para o Super Admin da plataforma SaaS. **1. Banco de Dados e Migração (`migrations/phase18_superadmin_2fa_and_alerts.sql`)**: Adicionadas as colunas `totp_secret TEXT`, `totp_enabled BOOLEAN DEFAULT FALSE`, `totp_temp_secret TEXT`, `last_login_at TIMESTAMPTZ`, `last_login_ip TEXT` e `last_login_user_agent TEXT` na tabela `public.cap_platform_admins`. Sincronizado em `database.md` (Seção 19), `init.sql` e `init_database.sql`. **2. Motor Criptográfico TOTP Nativo (`backend/utils/totp.js`)**: Implementação 100% nativa em Node.js (sem dependências externas) de segredos Base32 (20 bytes / 160 bits via `crypto.randomBytes`), cálculo HMAC-SHA1 de 30 segundos, truncamento dinâmico RFC 4226 para código numérico de 6 dígitos e tolerância de *clock drift* de ±1 janela (30s passado e 30s futuro) com comparação em tempo constante (`crypto.timingSafeEqual`) contra ataques de temporização, além de geração da URI canônica `otpauth://totp/...` para Google Authenticator, Authy, etc. **3. Trilha de Auditoria e Alertas de Login (`backend/services/securityAlertService.js`)**: A cada login autenticado, o sistema registra data/hora, IP e dispositivo; caso detecte troca de IP ou dispositivo em relação ao último acesso, emite log estruturado de segurança com alerta prioritário e despacha webhook para Discord/Slack corporativo com cartões ricos em detalhes. **4. Backend Express (`backend/routes/auth.js` e `authService.js`)**: Fluxo em duas etapas: no primeiro passo (`POST /auth/login-superadmin`), valida e-mail e senha; se `totp_enabled` for verdadeiro, emite desafio intermediário com `temp_token` assinado via JWT (5 minutos de expiração); no segundo passo (`POST /auth/login-superadmin/verify-2fa`), valida o código TOTP sob rate limit dedicado (`verify2faLimiter`: 10 req / 10 min), atualiza a auditoria, despacha alertas e emite a sessão JWT definitiva; criadas também rotas administrativas para setup, ativação e desativação (`/superadmin/2fa/setup`, `/enable` e `/disable`). **5. Frontend Editorial (`SuperAdminLogin.jsx` e `src/lib/api.js`)**: Tela de login com transição suave para Etapa 2 ("Segundo Fator de Autenticação"), apresentando ícone `ShieldCheck` em pílula rosé, campo numérico de 6 dígitos formatado com fonte mono espaçada, mensagens de erro semânticas, botão "Confirmar e Entrar" e opção de retorno. **6. Testes Automatizados**: Suíte Jest dedicada em `backend/tests/superadmin2FaC13.test.js` passando 100% (18/18 testes cobrindo geração de segredos, codificação/decodificação Base32, validação temporal de TOTP, tolerância de drift, rejeição de drift excessivo, alertas sem webhook, análise de governança de código e integração Express mockada de ponta a ponta com rejeição de código errado e emissão de JWT no sucesso), suíte completa de segurança da Fase 43 com 83/83 testes passando 100%, compilação do Vite limpa em 1.56s e contêiner `operabeauty-api` rebuildado e validado no Docker. *(Conclusão integral da Fase 43).*

---

## Fase 44: MELHORIAS I — Funcionalidades de Retenção e Receita
> Referências: [§4 Grupo D](OperaBeauty_Plano_de_Melhorias.md#L463-L536) · objetivo de negócio [§1.5](OperaBeauty_Plano_de_Melhorias.md#L86-L88). Todo módulo novo passa por `featureFlagMiddleware.js` / `FeatureProtectedRoute` conforme o plano (**E1**). Regras de negócio validadas **no backend**.

- [x] **D1 (P1) — Lembretes por push (Web Push/VAPID)** → [Plano §4·D1](OperaBeauty_Plano_de_Melhorias.md#L465-L467): Implementação e homologação completa do sistema de lembretes automáticos por Web Push (VAPID) com enfileiramento e atraso no Redis (BullMQ). **1. Gestão de Assinaturas e Multi-Tenancy (`cap_push_subscriptions`)**: Endpoints dedicados em `backend/routes/notifications.js` permitindo inscrição de clientes e equipe com isolamento estrito via `tenantQuery` (`tenant_id`, `client_id`, `endpoint`, chaves `p256dh` e `auth`). Endpoint `GET /api/notifications/vapid-public-key` disponibilizado publicamente sem travas de autenticação para permitir handshake VAPID resiliente no frontend. **2. Fila Redis e Jobs Agendados no BullMQ (`notificationService.js`)**: Criação de `scheduleAppointmentReminders(appointmentId)` calculando com precisão os instantes de envio para 24 horas antes (`start_time - 24h`) e 2 horas antes (`start_time - 2h`). Jobs enfileirados no BullMQ com `jobId` determinístico (`reminder:push:24h:<id>` e `reminder:push:2h:<id>`), delay milimétrico, retentativas automáticas e backoff exponencial. Se o agendamento ocorrer no mesmo dia com menos de 24h de antecedência, enfileira estritamente o lembrete de 2h; se faltar menos de 2h, não sobrecarrega a fila. **3. Respeito Rigoroso a Cancelamentos e Remarcações**: Criação de `cancelAppointmentReminders(appointmentId)` que remove imediatamente os jobs pendentes da fila do Redis ao cancelar ou deletar o agendamento em `appointmentService.js` (`updateAppointment` e `deleteAppointment`). Se o horário for remarcado, cancela os lembretes anteriores e reagenda novos com base no novo fuso de atendimento. **4. Worker Resiliente com Anti-Falha (`notificationWorker.js`)**: Trata a ação `sendAppointmentReminder`, valida atomicamente no PostgreSQL se o agendamento permanece ativo (`status NOT IN ('cancelled', 'completed')`) antes de enviar, evitando envios embaraçosos para procedimentos cancelados; ao detectar erro HTTP 404 ou 410 GONE da infraestrutura de push da Mozilla/Google, remove automaticamente o endpoint expirado de `cap_push_subscriptions` sem interromper a fila dos demais clientes. **5. Correção de Safety-Net no Cron (`cron/reminders.js`)**: Correção estrutural das consultas legadas que causavam crash ao buscar colunas inexistentes (`appointment_date`/`appointment_time`), unificando para `start_time TIMESTAMPTZ` no fuso oficial `America/Sao_Paulo`. **6. Frontend com Solicitação Amigável (`AgendamentoConfirmado.jsx`)**: Integração do fluxo real de assinatura Web Push no botão "Quer um lembrete 24h antes?", solicitando permissão com `Notification.requestPermission()`, registrando o Service Worker `/sw.js`, convertendo a chave VAPID via `urlBase64ToUint8Array` e persistindo a assinatura via `api.notifications.subscribe()`, com estado de carregamento e feedback "Ativado ✓". **7. Testes e Homologação**: Suíte Jest dedicada em `backend/tests/lembretesPushD1.test.js` passando 100% (10/10 testes), compilação do Vite limpa em 1.91s, contêiner `operabeauty-api` rebuildado com êxito e requisições HTTP reais via `curl.exe` contra a API Dockerizada confirmando retorno HTTP 200 na rota `/api/notifications/vapid-public-key`.
- [x] **D2 (P1) — Lembretes por WhatsApp com confirmação em 1 toque & Gateway Nativo (`operabeauty-wa-gateway`)** → [Plano §4·D2](OperaBeauty_Plano_de_Melhorias.md#L469-L471) · [Arquitetura](docs/whatsapp_gateway_architecture.md):
  - **1. Microsserviço Dedicado e Blindagem de Rede**: Criação do serviço `operabeauty-wa-gateway` rodando Node.js 20 sobre o motor Baileys v7, integrado à rede privada Docker `operabeauty-network` com **zero portas expostas externamente** no host ou no proxy Caddy. Comunicação M2M protegida com header `X-Internal-Secret` e validação timing-safe contra timing attacks.
  - **2. Zero Telemetria e Expulsa de Vulnerabilidades**: Auditoria e descarte integral do monólito `WA-AKG`, eliminando pings para `aikeigroup.net`, endpoints inseguros de flooding/spam e armadilhas de anti-SSRF.
  - **3. Criptografia AES-256-GCM em Repouso no PostgreSQL**: Modelagem das tabelas `cap_whatsapp_instances`, `cap_whatsapp_auth_keys` e `cap_whatsapp_messages` em `migrations/phase19_whatsapp_gateway_schema.sql` com RLS multi-tenant (`tenant_id`) e concessões restritas para `opera_app`. Credenciais de sessão do Signal Protocol encriptadas via AES-256-GCM com IV único e tag de autenticação de 16 bytes (`enc:v1:<iv>:<tag>:<ciphertext>`), eliminando 1.5GB de RAM ao dispensar MySQL 8.
  - **4. Fila com Jitter Anti-Ban e Botões Interativos**: Implementação em `messageQueue.js` com delay humanizado aleatório (2.5s a 5.5s), simulação de digitação `presence: composing` (1.5s), formatação dinâmica personalizada e botões de resposta rápida (`quick_reply`: `confirm_appointment:<id>` e `reschedule_appointment:<id>`) com fallback automático para texto estruturado.
  - **5. Confirmação e Remarcação em 1 Toque via Webhook Interno**: Rota interna `POST /api/whatsapp/webhook` no core `operabeauty-api` que recebe respostas interativas ou comandos ("1", "SIM", "2", "REMARCAR"), atualiza o status de agendamentos para `confirmed` ou `reschedule_requested` atomicamente e registra nota automática na timeline do CRM (`cap_timeline_notes`).
  - **6. Pareamento e Integração no Worker**: Suporte a pareamento por código de 8 dígitos (*Pairing Code*) ou QR Code; integração do disparo de WhatsApp 24h e 2h antes no `notificationWorker.js`, disparando em conjunto com Web Push caso o salão possua sessão ativa.
  - **7. Exclusividade do Maior Plano & Trava de Upgrade**: Proteção no backend com `requireFeature('whatsapp_gateway')` na rota `POST /api/whatsapp/connect` e no worker. Card em `ConfiguracoesOperacionais.jsx` renderiza trava educativa Rosé Editorial com ícone de cadeado e link para upgrade de plano caso o salão pertença a planos de entrada (Solo/Básico/Essencial). Flag `whatsapp_gateway` vinculada exclusivamente ao plano de topo `Enterprise` (futuro Signature) em `cap_plans`.
  - **8. Testes e Homologação**: Suíte Jest dedicada em `backend/tests/whatsappGatewayD2.test.js` passando 100% (14/14 testes cobrindo criptografia, M2M, webhooks e bloqueios de feature flag), build do Docker `operabeauty-wa-gateway` e `operabeauty-api` concluídos com sucesso, contêineres iniciados e validados via requisição M2M interna no Docker (`http://wa-gateway:4000/health`) e build do Vite concluído em 1.72s.
- [x] **D3 (P1) — Sinal por PIX no agendamento & Multi-Gateway Híbrido** → [Plano §4·D3](OperaBeauty_Plano_de_Melhorias.md#L473-L475):
  - **1. Multi-Gateway Híbrido Flexível (`paymentGatewayService.js`)**: Arquitetura desacoplada permitindo ao salão escolher seu provedor de preferência entre Mercado Pago, Asaas, AbacatePay, Chave PIX Manual com envio de comprovante, ou Simulador Sandbox (ideal para testes locais e homologação sem custos).
  - **2. Criptografia AES-256-GCM em Repouso no PostgreSQL (`cap_tenant_gateway_configs`)**: Modelagem da tabela `cap_tenant_gateway_configs` com segregação multi-tenant (`tenant_id`), criptografia de tokens privados, chaves de API e segredos de webhook com formato autenticado `IV:Tag:Ciphertext`. Endpoints administrativos em `backend/routes/payments.js` mascaram tokens confidenciais, nunca expondo credenciais em texto claro para o frontend ou em logs.
  - **3. Parametrização por Serviço e Gestão no Catálogo (`GestaoServicos.jsx`)**: Suporte a exigência de sinal por serviço com seleção de modelo (Porcentagem % ou Valor Fixo R$) e cálculo dinâmico da estimativa de sinal. Badges visuais no catálogo de serviços na visão desktop e nos cards responsivos para mobile.
  - **4. Painel de Controle Operacional (`ConfiguracoesOperacionais.jsx`)**: Seção dedicada para configuração do Gateway de Pagamento & Sinal PIX, permitindo definir tempo limite de expiração da reserva (padrão 15 minutos), alternar entre ambiente Sandbox e Produção, e cadastrar credenciais e instruções personalizadas.
  - **5. Experiência do Cliente no Funil de Agendamento (`AgendamentoRevisao.jsx`)**: Destaque Rosé Editorial no resumo financeiro alertando a cliente sobre a exigência de sinal para reserva da vaga, detalhando o valor a pagar imediatamente via PIX e o saldo remanescente que será acertado no salão após o procedimento. Botão primário adaptado para "Pagar Sinal PIX · R$ XX,XX".
  - **6. Checkout PIX com Contagem Regressiva e Polling em Tempo Real (`AgendamentoConfirmado.jsx`)**: Tela de confirmação com 3 estados dinâmicos:
    - *Pendente de Sinal*: Exibe QR Code PIX, código Copia-e-Cola com feedback visual ao copiar, cronômetro regressivo com expiração em 15 minutos e polling a cada 4 segundos checando o status do pagamento no backend (`/api/payments/deposit-status/:id`). Botão auxiliar de simulação de pagamento aprovado para ambientes Sandbox/Dev.
    - *Confirmado*: Transição imediata ao detectar confirmação bancária, comemoração visual de confetes festivos Rosé Editorial, resumo com badge "Sinal via PIX Confirmado ✓", download de arquivo de calendário `.ics` e ativação de lembrete push Web Push (D1).
    - *Expirado*: Bloqueio amigável alertando sobre o encerramento do prazo de 15 minutos e botão direto para escolher novo horário.
  - **7. Worker de Expiração Automática e Liberação de Horário (`notificationWorker.js`)**: Job periódica `checkDepositExpiration` que identifica agendamentos pendentes cujo `deposit_expires_at < NOW()`, cancela o agendamento (`status = 'cancelled'`, `deposit_status = 'expired'`), libera o horário na agenda para novos clientes e registra nota de auditoria na timeline do CRM.
  - **8. Testes Automatizados e Homologação**: Suíte Jest dedicada em `backend/tests/sinalPixD3.test.js` cobrindo 10/10 cenários (criptografia AES-256-GCM, integridade, cálculo percentual e fixo de sinal, idempotência de webhook e cancelamento automático pelo worker). Execução das 4 suítes da Fase 44 passando 100% (46/46 testes), build do frontend com Vite concluído com êxito em 2.15s gerando bundle de produção em `./dist` servido pelo Caddy.
- [x] **D4 (P1) — Vários serviços por visita** → [Plano §4·D4](OperaBeauty_Plano_de_Melhorias.md#L477-L479):
  - **1. Modelagem Relacional N:M no PostgreSQL (`cap_appointment_services`)**: Criação da tabela relacional em `migrations/phase22_multiple_services_schema.sql` com colunas `appointment_id`, `service_id`, `tenant_id`, `price`, `duration_minutes`, `commission_amount`, `order_index` e constraints RLS com isolamento multi-tenant estrito por `tenant_id`. Chave primária UUID e índices otimizados para consultas de histórico.
  - **2. Campo Descrição Curta (`short_description`)**: Adição da coluna `short_description TEXT` em `cap_services` com validação Zod de até 255 caracteres e suporte nos schemas de criação/atualização de catálogo (`catalogService.js` e `services.js`).
  - **3. Bloco Contínuo na Agenda e Soma de Preços/Duração (`appointmentService.js`)**: Criação de agendamentos consolidando duração total somada (`totalMinutes`), alocação de horário contínuo milimétrico de início a fim (`start_time` a `end_time = start_time + totalMinutes`), e prevenção de sobreposição de horários (`no_overlapping_appointments`). Compatibilidade retroativa 100% preservada atribuindo o serviço primário à coluna `service_id` do agendamento principal.
  - **4. Comissão Individual e Baixa de Estoque por Serviço na Conclusão**: Ao concluir o agendamento (`status = 'completed'`), o sistema itera sobre cada serviço registrado em `cap_appointment_services`, calcula a comissão individual do profissional proporcional ao valor do serviço (`commission_amount = price * commissionRate / 100`), persiste o valor no registro N:M e consolida a soma em `staff_commission_value`. Para cada serviço da visita configurado com `reduces_stock = true`, realiza a baixa automática dos insumos associados em `cap_inventory` (`cap_service_inventory`). Fallback gracioso ativo para agendamentos legados.
  - **5. Frontend: Gestão no Painel e Catálogo Público**:
    - *Gestão de Serviços (`GestaoServicos.jsx`)*: Inclusão do campo "Descrição Curta (opcional)" no modal de criação e edição com limite de 160 caracteres, e exibição visual sofisticada abaixo do nome na tabela corporativa desktop e nos cartões mobile.
    - *Catálogo Público (`CartaoServico.jsx` & `AgendamentoServicos.jsx`)*: Exibição da descrição curta e seleção flexível de múltiplos serviços com contagem no carrinho flutuante e totalizador de minutos/preço.
    - *Checkout & Revisão (`AgendamentoRevisao.jsx`)*: Envio do array estruturado `services` com id, preço e duração individual ao invocar `api.appointments.create`.
  - **6. Testes Automatizados e Homologação**: Suíte Jest dedicada em `backend/tests/multiplosServicosD4.test.js` passando 10/10 testes (cálculo de bloco contínuo, validação Zod, comissões individuais por serviço, baixa de insumos de estoque e limite de descrição curta). Suítes recentes da Fase 44 executadas com 20/20 testes aprovados, compilação de produção com Vite gerando bundle limpo em `./dist` em 2.73s servido pelo Caddy.
- [x] **D5 (P1) — "Qualquer profissional" e "próximo horário livre"** → [Plano §4·D5](OperaBeauty_Plano_de_Melhorias.md#L481-L482):
  - **1. Algoritmo de Elegibilidade e Balanceamento Justo de Carga (`appointmentService.js`)**:
    - Criação de `getEligibleStaff({ tenantId, serviceIds })`: identifica profissionais ativos e capacitados para realizar todos os serviços selecionados na visita, consultando a tabela `cap_staff_services`. Se nenhum vínculo existir, adota fallback elegante incluindo todos os profissionais ativos.
    - Suporte a `staff_id = 'any'` ou nulo no agendamento (`createAppointment`): quando a cliente escolhe agendar com o profissional mais rápido, o backend resolve os profissionais capacitados livres no intervalo, consulta o volume de agendamentos de cada um no dia (`GROUP BY staff_id`), e seleciona automaticamente o profissional com menor número de atendimentos, garantindo distribuição equitativa da carga de trabalho na equipe.
    - Bloqueio pessimista `FOR UPDATE` sobre o profissional designado no momento do `BEGIN`, prevenindo race conditions e concorrência simultânea.
  - **2. Cálculo de Horários Ocupados Agregado (`getOccupiedSlots`)**:
    - Ao agendar com "Qualquer profissional", um horário só é considerado indisponível se **todos** os profissionais capacitados estiverem ocupados naquele horário. Se ao menos um profissional capacitado estiver livre, o horário permanece aberto para a cliente.
  - **3. Varredura do "Próximo Horário Livre" (`getNextAvailableSlot`)**:
    - Algoritmo que varre os próximos 14 dias no fuso horário oficial `America/Sao_Paulo`, respeitando expediente semanal (`cap_business_hours`), exceções/folgas (`cap_date_exceptions`) e duração somada dos serviços.
    - Se a data for hoje, aplica margem de segurança de 15 minutos em relação à hora atual. Retorna payload estruturado com data, hora, profissional livre com menor carga e rótulo amigável legível (ex: *"Amanhã às 09:00"* ou *"Ter, 27/10 às 14:00"*).
  - **4. Rotas e Contratos de API (`routes/appointments.js` & `src/lib/api.js`)**:
    - Schema Zod `createAppointmentSchema` atualizado para aceitar `staff_id: z.union([z.string().uuid(), z.literal('any')]).nullable().optional()`.
    - Nova rota dedicada `GET /api/appointments/next-available-slot` montada antes dos endpoints parametrizados `:id`.
    - Atualização de `GET /api/appointments/occupied-slots` para receber `service_id` e múltiplos `service_ids`.
    - Integração de `api.appointments.getNextAvailableSlot(tenantId, params)` no cliente HTTP do frontend.
  - **5. Frontend: Experiência Rosé Editorial de 1 Toque**:
    - *Seleção de Profissional (`AgendamentoProfissionais.jsx`)*: Redesenho do funil com componente `TelaCliente`, topo Rosé (Etapa 2 de 4 - 50%), card em destaque de topo **"Qualquer profissional (mais rápido)"** com ícone de raio/centelha e badge "Menor tempo de espera", seguido da lista individual dos membros da equipe via `CartaoProfissional.jsx`.
    - *Seleção de Horários (`AgendamentoHorarios.jsx`)*: Banner inteligente no topo **⚡ "Próximo horário livre: {label}"** com botão de seleção em 1 toque que seleciona automaticamente o dia e o horário sem esforço.
    - *Revisão e Confirmação (`AgendamentoRevisao.jsx` & `AgendamentoConfirmado.jsx`)*: Exibe badge e texto "Qualquer profissional (Mais rápido) - Definido automaticamente por disponibilidade" no resumo, repassa o profissional designado retornado pelo backend e exibe o nome real do profissional no card final de confirmação.
  - **6. Testes Automatizados e Homologação**:
    - Suíte Jest dedicada em `backend/tests/qualquerProfissionalD5.test.js` passando 100% (10/10 testes cobrindo regras de negócio, balanceamento, contratos Zod e cliente de API).
    - Suíte `appointments.test.js` e `responsividadeJ8.test.js` atualizadas e 100% aprovadas.
    - Build de produção com Vite compilado com êxito em 1.39s gerando assets limpos.
    - Validação de ponta a ponta com Browser Subagent confirmando renderização perfeita do card "Qualquer profissional" e banner "Próximo horário livre" no navegador.
- [x] **D6 (P1) — Remarcar em 1 toque e lista de espera** → [Plano §4·D6](OperaBeauty_Plano_de_Melhorias.md#L484-L486):
  - **1. Remarcar em 1 Toque na Home e no Histórico (`appointmentService.js` & `routes/appointments.js`)**:
    - Criação da função de negócio `rescheduleAppointment` com lock pessimista `FOR UPDATE` e validação rigorosa contra conflitos de agenda para o mesmo profissional.
    - Reagendamento automático de lembretes no Redis BullMQ via `cancelAppointmentReminders` e `scheduleAppointmentReminders` (D1).
    - Registro de auditoria e nota automática na timeline do CRM (`cap_timeline_notes`).
    - Endpoint dedicado `POST /api/appointments/:id/reschedule` validado com schema Zod `rescheduleAppointmentSchema` e controle de permissões por tenant e role do cliente.
    - Botão "Remarcar" nos cartões da Home do Cliente (`HomeCliente.jsx`) e no Histórico de Agendamentos (`HistoricoAgendamentos.jsx`), preenchendo o `BookingContext` com preservação dos serviços e navegando diretamente para a seleção de novo dia/horário.
    - Tela de Revisão (`AgendamentoRevisao.jsx`) com cabeçalho adaptativo "Confirmar remarcação", badge "🔄 Remarcação de Atendimento" e botão "Confirmar Novo Horário".
  - **2. Modelagem e Migração da Lista de Espera (`cap_waitlist`)**:
    - Criação de `backend/migrations/phase23_waitlist_and_reschedule.sql` adicionando colunas `offered_at`, `expires_at`, `preferred_time_range` ('any', 'morning', 'afternoon', 'night'), `notified_at` e `appointment_id` (FK para `cap_appointments`), com índices otimizados `idx_cap_waitlist_pending_order` e `idx_cap_waitlist_expired_offers`.
    - Executada e aplicada no contêiner Docker `operabeauty-db` e documentada em `database.md` (§2.12.2).
  - **3. Fila de Espera FIFO e Oferta Automática (`waitlistService.js` & `routes/waitlist.js`)**:
    - `addToWaitlist`: Validação anti-duplicidade garantindo que o cliente não entre mais de uma vez para a mesma data.
    - `offerNextInWaitlist`: Ao cancelar ou remarcar um agendamento, o backend busca o primeiro cliente da fila na ordem de chegada (`ORDER BY w.created_at ASC LIMIT 1 FOR UPDATE OF w SKIP LOCKED`), define status `'offered'` e janela exclusiva de 30 minutos (`expires_at = NOW() + 30 min`), disparando notificação Web Push imediata.
    - `expireOffersAndAdvance`: Se a oferta não for confirmada no prazo de 30 minutos, o status é alterado para `'expired'` e a vaga é ofertada automaticamente ao próximo candidato da fila. Job cron a cada 2 minutos (`cron/reminders.js`).
    - `acceptWaitlistOffer`: Converte a oferta em agendamento oficial no PostgreSQL com status `'converted'`, retornando erro HTTP 410 GONE se a vaga já tiver expirado.
  - **4. Frontend: Design System Rosé Editorial da Lista de Espera**:
    - `WaitlistModal.jsx`: Modal responsivo com seletor de turnos preferidos ('Qualquer horário', 'Manhã', 'Tarde', 'Noite'), ícones temáticos Lucide React, feedback háptico e animações fluidas.
    - `HomeCliente.jsx`: Banner comemorativo e animado "⚡ Vaga Liberada para Você!" quando o cliente possuir oferta ativa na lista de espera, com botão "Garantir".
  - **5. Testes Automatizados e Homologação E2E**:
    - Suíte Jest em `backend/tests/remarcarWaitlistD6.test.js` passando 100% (10/10 testes).
    - Validação de ponta a ponta com Browser Subagent na porta de produção `:8080` comprovando o fluxo completo: clique em "Remarcar", seleção de novo dia e horário, revisão com badge de remarcação, confirmação com sucesso e persistência atômica no PostgreSQL.
- [x] **D7 (P1) — Login por código (WhatsApp) e recuperação de senha adaptativa (Ecossistema do Salão)** → [Plano §4·D7](OperaBeauty_Plano_de_Melhorias.md#L488-L490):
  - **1. Governança e Regras de Negócio (Ecossistema do Salão & Zero Custos)**:
    - Zero SMS: Provedores pagos descartados por custos e sustentabilidade do SaaS.
    - Zero Número Central: A plataforma OperaBeauty não disponibiliza número central para evitar banimento da Meta e preservar o White-Label integral.
    - Disparo Condicional: Envio automático por WhatsApp habilitado se e somente se o salão possuir plano com `whatsapp_gateway` e instância conectada no `cap_whatsapp_instances`.
    - Fallback Acolhedor: Salões sem WhatsApp conectado ou em planos básicos encaminham a cliente para atendimento direto com a recepção do salão via WhatsApp com mensagem pré-formatada, onde o gestor redefine a senha na Ficha CRM.
  - **2. Backend & Motor Criptográfico de OTP (`authService.js`, `routes/auth.js`, `gateway-whatsapp`)**:
    - Endpoints dedicados `POST /api/auth/client/request-code`, `POST /api/auth/client/verify-code` e `POST /api/auth/client/reset-password` protegidos por rate-limiting duplo (IP + Telefone).
    - Código numérico de 6 dígitos gerado via `crypto.randomInt` com expiração de 300 segundos (5 minutos) no Redis.
    - Proteção estrita contra força bruta com limite de 5 tentativas e comparação em tempo constante (`crypto.timingSafeEqual`).
    - Emissão de `reset_token` temporário assinado via JWT (10 min) com escopo restrito `client_password_reset`.
    - Suporte a login direto com código sem fricção (`purpose: 'login'`).
    - Endpoint `/internal/messages/send-otp` no microsserviço `wa-gateway` com registro de auditoria em `cap_whatsapp_messages`.
  - **3. Frontend Rosé Editorial & Modal Adaptativo (`AcessoSenha.jsx`, `ModalRecuperacaoSenha.jsx`)**:
    - Link "Esqueceu sua senha?" na tela de digitação de senha.
    - Botão alternativo "Entrar com código via WhatsApp".
    - Componente universal `ModalRecuperacaoSenha.jsx` com stepper adaptativo:
      - Modo Manual: card acolhedor com dados do salão e botão "Falar com o Salão no WhatsApp".
      - Modo Automação: digitação de 6 dígitos via `CampoCodigo`, temporizador regressivo de 5 minutos, reenvio com cooldown de 60s e formulário de nova senha com validação em tempo real.
  - **4. Testes Automatizados e Homologação**:
    - Suíte Jest em `backend/tests/loginOtpD7.test.js` passando 100% (12/12 testes cobrindo geração, governança, JWT e complexidade de senha).
    - Suítes regressivas de autenticação (`auth.test.js`, `verificacaoTelefoneC12.test.js`, `superadmin2FaC13.test.js`) com 38/38 testes passando.
    - Homologação visual e funcional via browser subagent autenticado gravada em vídeo WebP (`login_recuperacao_d7_1792964278342.webp`) e compilação limpa do Vite em 5.54s.
- [x] **D8 (P1) — Política de cancelamento e controle de faltas (no-show)** → [Plano §4·D8](OperaBeauty_Plano_de_Melhorias.md#L492-L494):
  - **1. Modelagem Relacional & Migração no PostgreSQL (`phase24_cancellation_and_no_shows.sql`)**:
    - `cap_tenants`: adicionadas as colunas `min_cancellation_hours INT DEFAULT 2` (prazo mínimo configurável em horas para cancelamentos e remarcações online), `no_show_penalty_action VARCHAR(30) DEFAULT 'warn'` ('warn' = apenas alertar na ficha, 'require_deposit' = exigir sinal PIX obrigatório, 'block' = bloquear agendamentos online), e `no_show_tolerance_count INT DEFAULT 2` (limite de faltas toleradas antes de aplicar a penalidade).
    - `cap_clients`: adicionadas as colunas `no_show_count INT DEFAULT 0`, `is_blocked BOOLEAN DEFAULT FALSE` e `blocked_reason TEXT`, com índice `idx_cap_clients_is_blocked`.
    - `cap_appointments`: adicionadas as colunas `no_show_marked_at TIMESTAMPTZ`, `no_show_marked_by UUID REFERENCES cap_staff(id)`, `cancellation_reason TEXT`, e índice `idx_cap_appointments_status`.
    - Concessões de permissão DML estritas concedidas ao usuário `opera_app` (Princípio de Menor Privilégio - C5).
  - **2. Validação Server-Side e Regras de Negócio no Backend (`appointmentService.js`, `clientService.js`)**:
    - **Bloqueio de Criação**: `createAppointment` valida no PostgreSQL se `client.is_blocked === true`. Se bloqueado, rejeita com HTTP 403 Forbidden e código semântico `CLIENT_BLOCKED`, orientando contato amigável com a recepção do salão.
    - **Janela de Antecedência no Cancelamento**: Em `updateAppointment` (ao alterar para `cancelled`) e em `deleteAppointment`, se solicitado pelo cliente (`userRole === 'client'`), valida se a antecedência em horas `(start_time - NOW())` é menor que `tenant.min_cancellation_hours`. Se menor, bloqueia com HTTP 400 Bad Request e código `CANCELLATION_WINDOW_EXPIRED`, retornando o WhatsApp do salão para contato direto. Registra a justificativa e nota na timeline do CRM.
    - **Janela de Antecedência na Remarcação**: `rescheduleAppointment` aplica a mesma trava de antecedência mínima antes de autorizar a remarcação de horários.
    - **Registro de Falta (No-Show)**: Implementada a função `markAppointmentNoShow` (restrita a `manager` e `professional`). Altera o status para `no_show`, grava `no_show_marked_at` e `no_show_marked_by`, incrementa atomicamente o contador `no_show_count` do cliente, cancela lembretes pendentes no Redis (D1), verifica se atingiu a tolerância e dispara a ação configurada (bloqueando o cliente se a ação for `'block'`), registrando nota explicativa na timeline do CRM.
    - **Reversão de Falta (Undo No-Show)**: `undoAppointmentNoShow` restaura o agendamento para `scheduled`, decrementa com segurança `GREATEST(0, no_show_count - 1)` e, se o cliente estava bloqueado por faltas e a contagem caiu abaixo da tolerância, restaura o acesso online automaticamente, registrando auditoria no CRM.
    - **Gestão no CRM (`clientService.js`)**: Endpoints `POST /api/clients/:id/reset-no-shows` (zera o contador com 1 toque) e `POST /api/clients/:id/toggle-block` (bloqueia ou desbloqueia agendamentos online com registro de justificativa).
  - **3. Frontend & Design System Rosé Editorial**:
    - *Configurações Operacionais (`ConfiguracoesOperacionais.jsx`)*: Seção rica e responsiva "Política de cancelamento & faltas (no-show)" com dropdowns estilizados para antecedência mínima (1h, 2h, 4h, 12h, 24h, 48h), tolerância de faltas (1, 2, 3, 5 faltas) e ação de penalidade ('Apenas Alertar', 'Exigir Sinal PIX', 'Bloquear Agendamentos Online'), além de card com boas práticas de gestão humanizada.
    - *Agenda Profissional (`AgendaProfissional.jsx`)*: Modal de detalhes do agendamento enriquecido com botão "Marcar Falta (Não Compareceu)" para atendimentos pendentes/em andamento, card âmbar com detalhes da falta e botão "Reverter Falta", além de badge estilizado para status `no_show`.
    - *Ficha do Cliente no CRM (`FichaClienteCRM.jsx`)*: Banner de alerta superior caso o cliente esteja bloqueado para agendamentos online com botão de desbloqueio em 1 clique; grid de métricas ampliado com terceiro card dedicado "FALTAS" (`no-show`) e botão discreto para zerar faltas; barra de status "Agendamento online liberado/bloqueado" com botão de ação rápida e modal para informar o motivo.
    - *Histórico de Agendamentos do Cliente (`HistoricoAgendamentos.jsx`)*: Tratamento acolhedor do erro `CANCELLATION_WINDOW_EXPIRED` ao tentar cancelar fora do prazo, orientando a cliente com as informações da recepção; badge âmbar "Não Compareceu" na lista de histórico para atendimentos com status `no_show`.
  - **4. Testes Automatizados e Homologação**:
    - Suíte Jest dedicada em `backend/tests/politicaCancelamentoD8.test.js` passando 100% (14/14 testes cobrindo DDL, regras de antecedência, bloqueio automático, reversão de faltas, zeramento, DML de menor privilégio e contratos de API).
    - Compilação limpa do frontend com Vite em 3.25s gerando bundle de produção em `./dist`.
    - Contêiner `operabeauty-api` reiniciado no Docker com PostgreSQL e Redis conectados com êxito.
    - Validação visual e funcional de ponta a ponta com Browser Subagent autenticado com perfil de gestor (`thais@studiodatha.com`), com screenshots gerados e registrados nos artefatos (`politica_cancelamento_section_1792973927043.png` e `crm_ficha_cliente_faltas_1792974037199.png`).
- [x] **D9 (P1) — Relatório mensal "Impacto OperaBeauty"** → [Plano §4·D9](OperaBeauty_Plano_de_Melhorias.md#L496-L498):
  - **1. Consolidação de Retorno e Lógica de Negócio no Backend (`reportService.js`)**:
    - Função exportada `getMonthlyImpactReport(tenantId, year, month)` agregando KPIs executivos de retorno de investimento com base nas consultas corrigidas por `start_time TIMESTAMPTZ` (sem referências a colunas legadas inexistentes).
    - *Economia de Tempo da Recepção*: cálculo baseado em 10 minutos poupados por agendamento feito de forma autônoma pelos próprios clientes via web app (`online_appointments_count`), consolidando total de horas poupadas (`hours_saved`).
    - *Faltas Evitadas e Faturamento Protegido*: estimativa de faltas evitadas (~20% taxa histórica padrão da indústria) garantidas pelos lembretes automáticos de 24h e 2h via push e WhatsApp, calculando o montante em reais de prejuízo evitado (`prevented_loss_revenue`).
    - *Faturamento Realizado e Crescimento*: consolidado de receita total no mês, comparativo percentual de crescimento em relação ao mês anterior (`growth_rate_vs_last_month`), ticket médio (`average_ticket`) e total de atendimentos concluídos.
    - *Fidelização & Retenção*: taxa percentual de clientes que retornaram no mês (`retention_rate`), contagem de clientes recorrentes vs novos conquistados no período.
    - *Clube de Assinaturas & Cashback*: número de membros ativos no Clube do Salão, receita recorrente mensal (MRR), volume de cashback distribuído vs resgatado e taxa de engajamento da carteira digital.
    - *Top 5 Serviços & Profissional Destaque*: ranking dos serviços mais lucrativos e determinação do profissional do mês por volume de atendimentos e receita.
    - *Navegação Histórica*: fornecimento de pílulas dos últimos 6 meses (`available_months`) para análise comparativa retroativa.
    - *Disparo de Resumo por WhatsApp*: função `sendImpactReportWhatsApp` formatando mensagem executiva enriquecida com emojis, negrito e métricas-chave do salão, enviada diretamente via gateway nativo de WhatsApp.
  - **2. Endpoints REST e Validação Server-Side (`routes/reports.js`)**:
    - Endpoints protegidos `GET /api/reports/monthly-impact` e `POST /api/reports/monthly-impact/send-whatsapp` com validação Zod tipada (`monthlyImpactQuerySchema`, `sendImpactWhatsAppSchema`), autenticação JWT compulsória e restrição estrita de acesso (`requireRole(['manager', 'superadmin'])`).
    - Atualização do plano `Enterprise` no PostgreSQL para incluir a feature flag `bi_reports`, liberando acesso pleno para os salões elegíveis.
  - **3. Notificação Automática Recorrente no Cron (`cron/reminders.js`)**:
    - Agendamento mensal (`0 8 1 * *`) disparado pontualmente às 08:00 de todo dia 1º de cada mês, criando notificação no banco de dados (`cap_notifications`) para todos os gestores ativos com atalho direto para a visualização do relatório do mês encerrado.
  - **4. Frontend Rosé Editorial, Print A4 e Card no Dashboard**:
    - *Cliente de API (`src/lib/api.js`)*: inclusão dos métodos `api.reports.getMonthlyImpact()` e `api.reports.sendMonthlyImpactWhatsApp()`.
    - *Central de Relatórios (`RelatoriosBI.jsx`)*: redesign completo na estética Rosé Editorial, apresentando Hero Banner comemorativo em gradiente escuro (*"Em [mês], o OperaBeauty poupou X horas da sua equipe e protegeu R$ Y em faturamento"*), pílulas interativas de seleção de mês, 4 cards dos pilares fundamentais, cards do Clube e Cashback, vitrine do Profissional Destaque, tabela dos Top Serviços, modal de envio via WhatsApp e folha de estilo dedicada `@media print` para impressão e geração de PDF limpo em A4 sem menus ou barras de navegação. Alternância de abas preservando a visualização de inteligência de ociosidade e ranking da equipe.
    - *Dashboard do Gestor (`DashboardAdmin.jsx`)*: banner comemorativo compacto posicionado logo após a grade de 4 KPIs com indicadores de horas e faturamento protegido, integrando atalho direto *"Ver Relatório Completo >"*.
  - **5. Testes Automatizados e Homologação**:
    - Suíte Jest em `backend/tests/relatorioImpactoD9.test.js` passando 100% (18/18 testes cobrindo cálculos, regras, schemas Zod, rotas, cron e frontend).
    - Compilação limpa do frontend com Vite em 1.82s gerando bundle de produção em `./dist`.
    - Contêiner `operabeauty-api` reconstruído e atualizado no Docker com suporte aos novos serviços.
    - Validação visual e funcional de ponta a ponta com Browser Subagent autenticado com perfil de gestora (`thais@studiodatha.com`), com screenshots e gravação registrados nos artefatos (`dashboard_impacto_banner_1792981724337.png`, `relatorios_bi_impacto_full_1792981743319.png` e gravação WebP `d9_validacao_final_sucesso_1792981702753.webp`).
- [x] **D10 (P1) — Importação de clientes e serviços por planilha** → [Plano §4·D10](OperaBeauty_Plano_de_Melhorias.md#L500-L502):
  - **1. Motor de Importação Transacional no PostgreSQL (`clientService.js` & `catalogService.js`)**:
    - Transações atômicas com `BEGIN ... COMMIT / ROLLBACK` isoladas sob Row Level Security (`SET LOCAL app.current_tenant_id`) garantindo integridade estrita multi-tenant.
    - Suporte a opções parametrizadas de execução: modo tudo ou nada por lote (`all_or_nothing: true`), que aborta a transação e realiza rollback integral caso qualquer linha contenha falha impeditiva, ou modo tolerante (`all_or_nothing: false`), que processa linhas válidas e isola as falhas no relatório de rejeições.
    - Tratamento de duplicidade com opção `on_duplicate`: `'skip'` (ignora registros pré-existentes sem abortar o lote) ou `'update'` (atualiza dados cadastrais e valores mantendo histórico).
    - Deduplicação inteligente em dois estágios: no próprio arquivo (bloqueando repetições na mesma planilha) e contra o banco de dados do salão (por telefone normalizado para clientes e por nome insensível a maiúsculas/minúsculas para serviços).
    - Invalidação automática de cache no Redis (`tenant:${tenantId}:services`) e registro de evento na trilha de auditoria (`logAudit`) com metadados do total processado e usuário responsável.
  - **2. Schemas de Validação Server-Side e Rotas REST (`routes/clients.js` & `routes/services.js`)**:
    - Criação de schemas Zod dedicados: `importClientsSchema` (limite seguro de até 1.000 clientes por lote) e `importServicesSchema` (limite de até 500 serviços por lote), validando tipos, formatação e faixas válidas.
    - Proteção das rotas `POST /api/clients/import` e `POST /api/services/import` com `authMiddleware` compulsório e controle estrito de papel (`requireRole(['manager'])`).
    - Resposta estruturada retornando `importedCount`, `rejectedCount`, `totalProcessed`, lista de rejeições com linha e motivo, e lista de registros persistidos.
  - **3. Frontend Rosé Editorial & Modal Universal de Importação (`ModalImportarPlanilha.jsx`)**:
    - Criação de componente universal reutilizável para Clientes e Serviços com esteira guiada em Stepper de 4 etapas (1. Arquivo, 2. Mapeamento, 3. Prévia & Validação, 4. Conclusão & Relatório).
    - Suporte nativo a planilhas nos formatos CSV e XLSX via SheetJS (`xlsx`), com zona drag & drop interativa, download de modelos estruturados em CSV e XLSX para preenchimento prévio, e leitura instantânea no cliente.
    - Mapeamento dinâmico de colunas com auto-detecção heurística por similaridade fonética e textual (reconhecendo cabeçalhos como "Telefone", "Celular", "WhatsApp", "Preço", "Valor", "Duração", "Tempo", etc.).
    - Pré-visualização com validação reativa por linha em badges coloridos, exibição de avisos e erros semânticos, e filtros rápidos ("Todas", "Apenas Válidas", "Com Inconsistências").
    - Toggles de controle operacional: "Tudo ou nada por lote" e "Ignorar duplicados já existentes".
    - Relatório pós-importação com taxa de sucesso, contadores de inseridos e ignorados, e botão direto para download de arquivo CSV contendo apenas as linhas rejeitadas com o motivo do erro.
  - **4. Integração nas Telas Administrativas (`GestaoClientes.jsx` & `GestaoServicos.jsx`)**:
    - Substituição do modal legado de clientes pelo novo componente universal com injeção de toasts do `NotificationProvider`.
    - Inclusão do botão "Importar planilha" no cabeçalho de Gestão de Serviços com modal adaptado para atributos do catálogo (preço, duração, categoria, comissão).
  - **5. Testes Automatizados e Homologação**:
    - Suíte Jest em `backend/tests/importacaoPlanilhaD10.test.js` passando 100% (21/21 testes cobrindo contratos Zod, limites de lote, validação de tipos, regras de duplicidade, transação com rollback e métodos de serviço).
    - Compilação limpa do Vite em 2.09s gerando bundle de produção em `./dist`.
    - Contêiner `operabeauty-api` reconstruído e atualizado no Docker (`healthy`).
    - Homologação visual e funcional de ponta a ponta com Browser Subagent autenticado como gestora, com evidências registradas em `modal_importar_clientes_1793034762452.png`, `modal_importar_servicos_1793034817476.png` e gravação de sessão WebP `validar_importacao_planilha_1793034729155.webp`.
- [x] **D11 (P1) — Onboarding guiado do salão** → [Plano §4·D11](OperaBeauty_Plano_de_Melhorias.md#L504-L506):
  - **1. Checklist Operacional Dinâmico no Dashboard (`CardOnboarding.jsx`)**:
    - Cálculo de progresso em tempo real no backend (`onboardingService.js`) auditando registros autênticos (`cap_services`, `cap_staff`, `cap_business_hours`, `cap_tenants` e `cap_appointments`), eliminando inconsistências de contagem.
    - 6 etapas essenciais com badges visuais (Verificado ✓ ou Pendente) e atalhos de 1 toque:
      1. *Serviços do Catálogo*: validação de procedimentos ativos com atalho direto para importação de catálogo pronto.
      2. *Equipe de Atendimento*: detecção de profissionais ativas com atalho para gestão de equipe.
      3. *Horários de Atendimento*: verificação de expediente semanal ativo com atalho para configurações operacionais.
      4. *Identidade Visual & Tema*: verificação de logotipo e paleta de cores personalizada.
      5. *Display de Balcão com QR Code*: abertura integrada do gerador de display de mesa.
      6. *Primeiro Agendamento de Teste*: atalho para o link público da cliente em nova aba e detecção automática do primeiro agendamento.
    - Barra de progresso animada Rosé Editorial, suporte a minimização com persistência de preferência (`onboarding_dismissed`), celebração ao atingir 100% de ativação e botão de reabertura rápida no cabeçalho do painel gerencial.
  - **2. Catálogos-Modelo por Segmento (`ModalCatalogoModelo.jsx`)**:
    - Dicionário estruturado com 6 segmentos especializados de beleza e estética: Manicure & Nail Design (7 serviços), Sobrancelhas & Cílios (7 serviços), Estética Facial (6 serviços), Drenagem & Massagem Corporal (6 serviços), Depilação (6 serviços) e Cabelo & Terapia Capilar (6 serviços).
    - Descrições comerciais de alto impacto, durações realistas e preços de referência de mercado.
    - Interface com chips temáticos por segmento, seleção com checkboxes individuais, contadores reativos e botão para marcar/desmarcar todos.
    - Aplicação transacional atômica no PostgreSQL via `applyCatalogTemplate` com isolamento multi-tenant compulsório (`SET LOCAL app.current_tenant_id`), prevenção de duplicações de nomes, invalidação imediata de cache no Redis (`tenant:${tenantId}:services`) e registro na trilha de auditoria (`cap_audit_logs`).
    - Integrado no `DashboardAdmin.jsx` e na `GestaoServicos.jsx` através do botão "Catálogo modelo".
  - **3. Gerador de Display de Balcão & QR Code Pronto para Imprimir (`ModalDisplayMesaQRCode.jsx`)**:
    - Renderização de QR Code vetorial de alta definição via biblioteca `qrcode` apontando para o link público do salão (`/${tenant.slug}`).
    - Layout editorial de totem de acrílico / display de mesa com monograma/logotipo, nome do salão, chamada acolhedora, instruções ilustradas em 3 passos e URL impressa.
    - Botão "Imprimir Display" integrado ao comando nativo `window.print()` com folha de estilo dedicada `@media print` otimizada para papel A4 e displays de acrílico (15x21 / 10x15 cm) sem poluição visual de menus.
    - Botão "Baixar Imagem" para download direto do arquivo PNG em alta resolução.
    - Registro automático da data/hora de geração em `cap_tenants.qr_code_generated_at` e concessão de privilégios de DML para `opera_app` (C5).
  - **4. Testes Automatizados e Homologação**:
    - Suíte Jest em `backend/tests/onboardingD11.test.js` passando 100% (12/12 testes cobrindo contratos Zod, catálogo de 6 segmentos, transações atômicas com rollback, isolamento de papéis e DDL de migração).
    - Compilação limpa do Vite em 1.70s gerando bundle de produção em `./dist`.
    - Contêiner `operabeauty-api` reconstruído e validado no Docker.
    - Homologação visual e funcional de ponta a ponta com Browser Subagent autenticado com perfil de gestora, com evidências registradas em `modal_display_qrcode_1793039211004.png`, `modal_catalogo_modelo_1793039364961.png` e gravação WebP `validar_onboarding_d11_1793038867638.webp`.
- [x] **D18 (P1) — Cobrança automática do SaaS** → [Plano §4·D18](OperaBeauty_Plano_de_Melhorias.md#L532-L534):
  - **1. Modelagem Relacional & Migração no PostgreSQL (`phase26_automated_saas_billing.sql`)**:
    - `cap_invoices`: adição das colunas `pix_copy_paste TEXT` (código EMV BR Code), `pix_qr_code TEXT` (URL dinâmica do QR Code), `gateway_transaction_id VARCHAR(120)` (identificador externo do gateway de pagamento), `gateway_invoice_url TEXT`, `grace_period_days INT DEFAULT 5` e `warnings_sent JSONB DEFAULT '[]'::jsonb`.
    - `cap_tenants`: adição das colunas `grace_period_days INT DEFAULT 5` (dias de tolerância configuráveis), `overdue_since DATE` (início da inadimplência), `billing_locked_at TIMESTAMPTZ` (instante do bloqueio gradual) e `suspension_reason TEXT`.
    - Índices otimizados `idx_cap_invoices_status_due`, `idx_cap_invoices_gateway_tx` e `idx_cap_tenants_status_billing`.
    - Concessão de permissão DML restrita (`GRANT SELECT, INSERT, UPDATE ON public.cap_invoices TO opera_app;` e `GRANT SELECT, UPDATE ON public.cap_tenants TO opera_app;`) conforme princípio de privilégio mínimo (C5).
  - **2. Lógica de Negócio, Carência e Bloqueio Gradual no Backend (`saasBillingService.js`)**:
    - `generateSaaSPixPayload`: geração dinâmica de código EMV BR Code para pagamento de mensalidade da plataforma com chave PIX institucional e merchant 'OPERA BEAUTY SAAS'.
    - `getTenantBillingStatus`: cálculo em tempo real de dias em atraso (`days_overdue`), período de tolerância (*Grace Period* de 5 dias sem interrupção de operações), identificação de faturas abertas e status de bloqueio.
    - `checkOverdueInvoicesAndEnforceGracePeriod`: rotina de varredura que marca faturas vencidas como `overdue`, registra `overdue_since` durante a tolerância de 5 dias e, ao exceder a carência (`days_overdue > grace_period_days`), aplica o bloqueio gradual (`status = 'overdue'`, `billing_locked_at = NOW()`), gerando evento na trilha de auditoria (`cap_audit_logs`).
    - `paySaaSInvoice`: baixa atômica com `BEGIN ... COMMIT / ROLLBACK` sob `FOR UPDATE`, idempotência, baixa da fatura e **reativação automática imediata** (`cap_tenants.status = 'active'`, limpando `billing_locked_at` e `overdue_since`) assim que todas as faturas pendentes forem compensadas.
    - `processBillingWebhook`: suporte idempotente para confirmação assíncrona por gateways externos sem duplicar auditorias.
    - `simulateSaaSInvoicePayment`: endpoint sandbox para homologação e demonstração de quitação imediata.
  - **3. Trava de Agendamentos Online no Bloqueio Gradual (Modo Somente Leitura)**:
    - Em `appointmentService.js` (linha 395), ao criar um agendamento online (`createAppointment`), o sistema valida se o salão possui `billing_locked_at` ou status `overdue`/`suspended`. Em caso positivo, rejeita a criação com **HTTP 402 Payment Required** e código semântico `TENANT_OVERDUE`, preservando o acesso de leitura a dados, clientes e agenda interna.
  - **4. Frontend Rosé Editorial & Modal PIX com Reativação em Tempo Real**:
    - *Cliente de API (`src/lib/api.js`)*: inclusão do módulo `api.invoices` com `getBillingStatus()`, `simulatePayment()`, `checkOverdue()`, `list()`, `create()` e `pay()`.
    - *Tela de Assinatura (`AssinaturaSaaS.jsx`)*: visualização de plano, mensalidade, card da fatura pendente com botão primário "Pagar fatura com PIX (Reativação Imediata)", banner informativo de Carência (com contagem regressiva de dias restantes) ou Bloqueio Gradual (com aviso de suspensão temporária de agendamentos online), e histórico completo de mensalidades quitadas.
    - *Modal de Pagamento PIX (`ModalPagamentoPixSaaS.jsx`)*: renderização de QR Code em alta definição, código Pix Copia e Cola em campo protegido com botão de cópia em 1 clique ("Copiado!"), passo a passo ilustrado em 3 etapas, polling automático a cada 4 segundos detectando quitação bancária e botão para simulação sandbox imediata.
    - *Dashboard do Gestor (`DashboardAdmin.jsx`)*: banner de alerta discreto e contextual renderizado no topo quando o salão estiver em período de carência ou bloqueio por inadimplência, com atalho direto para a fatura.
  - **5. Testes Automatizados e Homologação E2E**:
    - Suíte Jest em `backend/tests/cobrancaAutomaticaSaaSD18.test.js` passando 100% (13/13 testes cobrindo geração de PIX BR Code, tolerância de carência, bloqueio gradual, migração SQL, menor privilégio C5, trava HTTP 402 e integração no frontend).
    - Compilação limpa do Vite em 3.48s gerando bundle de produção em `./dist`.
    - Contêiner `operabeauty-api` reconstruído e validado no Docker.
    - Homologação visual e funcional de ponta a ponta com Browser Subagent autenticado como gestora (`thais@studiodatha.com`), com evidências registradas em `assinatura_inicial_1793045888882.png`, `modal_pagamento_pix_1793045945903.png` e gravação WebP `cobranca_saas_pix_d18_1793045871567.webp`.
- [x] **Consolidação do Super Admin — Rebranding Rosé Editorial, Correção de Bugs e Parametrização PIX SaaS** → [§4·H4, §4·H5, §4·D18](OperaBeauty_Plano_de_Melhorias.md):
  - **1. Correção Crítica de JavaScript em Feature Flags e Mural de Avisos**:
    - Corrigido o erro `Uncaught ReferenceError: handleOpenNewModal is not defined` em `FeatureFlagsAdmin.jsx` e `AvisosAdmin.jsx`, padronizando o callback de ação para `() => openModal()`.
  - **2. Parametrização Completa do Gateway SaaS e Chave PIX Mestre (`SettingsAdmin.jsx`)**:
    - Rebranding completo para a estética Rosé Editorial, integrando campos institucionais da plataforma SaaS: Provedor de Gateway (Mercado Pago, Asaas, AbacatePay, Sandbox), Ambiente (Sandbox vs Produção), Chave PIX da Plataforma (com seleção de tipo: CNPJ, E-mail, Telefone, Chave Aleatória), Access Token protegido com criptografia AES-256 e mascaramento (`****`), Tolerância de Carência (*Grace Period* de 3 a 10 dias), URL do Webhook copiável com 1 clique e chave secreta HMAC.
  - **3. Rebranding de Equipe SaaS e Mural de Avisos (`EquipeAdmin.jsx`, `AvisosAdmin.jsx`)**:
    - Visual Rosé Editorial com tipografia moderna, crachás de permissão mestre, chips semânticos de severidade de comunicados e modais responsivos.
  - **4. Backend e Banco de Dados (`superadminService.js`, `routes/superadmin.js`, `cap_platform_settings`)**:
    - Migração DDL aplicada em `cap_platform_settings` no PostgreSQL adicionando `pix_key`, `pix_key_type`, `environment`, `grace_period_days` e `webhook_secret` com permissão concedida a `opera_app` (C5).
    - Métodos de serviço atualizados para mascaramento de tokens confidenciais e persistência idempotente.
  - **5. Testes e Homologação**:
    - Compilação limpa do Vite em 1.72s.
    - Suíte Jest com 50/50 testes passando 100%.
    - Homologação visual no navegador via Browser Subagent gravada em vídeo WebP (`superadmin_consolidation_1793047971614.webp`) e screenshots capturados.

**P2**
- [x] **D12 (P2) — Variações de preço e extras no serviço** → [Plano §4·D12](OperaBeauty_Plano_de_Melhorias.md#L508-L510):
  - **1. Modelagem Relacional & Migração no PostgreSQL (`phase27_service_variations_and_extras.sql`)**:
    - `public.cap_service_variations`: criação da tabela relacional de variações de serviço (ex.: Unha Curta, Média, Longa; Cabelo Curto, Médio, Longo) com colunas `id UUID PK`, `service_id UUID FK`, `tenant_id UUID FK`, `name TEXT`, `price NUMERIC(10,2)`, `duration_minutes INT`, `is_active BOOLEAN DEFAULT TRUE`, `order_index INT DEFAULT 0`, `created_at TIMESTAMPTZ`, índices e isolamento RLS multi-tenant (`tenant_isolation_service_variations`).
    - `public.cap_service_extras`: criação da tabela de adicionais e upsell opcionais (ex.: Nail Art, Esmaltação em Gel, Spa dos Pés, Massagem) com colunas `id UUID PK`, `service_id UUID FK`, `tenant_id UUID FK`, `name TEXT`, `price NUMERIC(10,2)`, `duration_minutes INT DEFAULT 0`, `is_active BOOLEAN DEFAULT TRUE`, `order_index INT DEFAULT 0`, `created_at TIMESTAMPTZ`, índices e isolamento RLS multi-tenant (`tenant_isolation_service_extras`).
    - `public.cap_appointment_services` e `public.cap_appointments`: inclusão das colunas `variation_id UUID REFERENCES cap_service_variations(id) ON DELETE SET NULL`, `variation_name TEXT` e `selected_extras JSONB DEFAULT '[]'::jsonb`.
    - Concessão de permissões DML estritas concedidas ao usuário `opera_app` conforme princípio de menor privilégio (C5). Migração aplicada e documentada em `database.md` (§2.7.2 e §2.7.3).
  - **2. Lógica de Catálogo, Invalidação de Cache e Integridade Server-Side (`catalogService.js`, `appointmentService.js`)**:
    - `listServices`: enriquecido com subconsultas otimizadas `json_agg` para `variations` e `extras` ativas ordenadas por `order_index` e `price`, calculando dinamicamente `is_starting_price = true` e `starting_price` a partir do menor valor entre o preço base do serviço e suas variações ativas. Cache Redis (`tenant:${tenantId}:services`) invalidado a cada criação/atualização.
    - `createService` e `updateService`: suporte transacional completo salvando e sincronizando variações e extras vinculados ao serviço.
    - `createAppointment`: validação server-side contra o banco de dados do preço e duração da variação e de cada extra selecionado, impossibilitando adulteração de valores pelo cliente. Totalização do valor e duração do agendamento somando a variação e os adicionais, cálculo proporcional de comissão do profissional sobre o valor total efetivo do serviço + extras, e baixa automática dos insumos de estoque vinculados.
    - `listAppointments` e `getAppointmentById`: retorno das variações e adicionais da visita formatados via `json_agg` nos serviços.
  - **3. Schemas de Validação Zod (`routes/services.js` & `routes/appointments.js`)**:
    - `variationItemSchema` e `extraItemSchema` validando tipos, nomes obrigatórios, preços e durações não negativas.
    - `serviceItemSchema` no agendamento expandido para aceitar `variation_id`, `variation_name` e array de IDs de `extras`, mantendo total compatibilidade retroativa para agendamentos legados sem personalizações.
  - **4. Frontend Editorial Rosé & Experiência de Agendamento (`ModalPersonalizarServico.jsx`, `CartaoServico.jsx`, `GestaoServicos.jsx`)**:
    - *Gestão Administrativa (`GestaoServicos.jsx`)*: Seções dedicadas no modal de criação e edição para Variações de Preço / Tamanho e Extras / Upsell Opcionais, com switches independentes, adição dinâmica de itens, campos de nome, preço e acréscimo de tempo, além de badges informativos na tabela corporativa desktop e nos cartões mobile.
    - *Cartão de Serviço (`CartaoServico.jsx`)*: Exibe badge sutil "Personalizável" e preço com prefixo "A partir de R$ XX,XX" quando houver variações ativas; quando o serviço personalizado está selecionado, exibe pílula com o nome da variação escolhida e quantidade de adicionais.
    - *Modal de Personalização Rosé (`ModalPersonalizarServico.jsx`)*: Interface mobile-first moderna com seleção de variação obrigatória (radio cards com indicador de tempo e preço) e seleção múltipla de adicionais opcionais (checkbox cards), cálculo dinâmico em tempo real de preço e tempo no rodapé e botão "Confirmar e Adicionar".
    - *Fluxo de Agendamento & Revisão (`AgendamentoServicos.jsx`, `AgendamentoRevisao.jsx`)*: Abertura automática do modal ao tocar em um serviço personalizável, totalização precisa de minutos e moeda no carrinho inferior, e exibição detalhada da variação e dos extras no resumo final com repasse ao backend.
  - **5. Testes Automatizados e Homologação E2E**:
    - Suíte Jest em `backend/tests/variacoesExtrasD12.test.js` passando 100% (17/17 testes cobrindo DDL, RLS, menor privilégio C5, schemas Zod, regras de preço/duração/comissão e integridade de componentes).
    - Compilação do Vite limpa em 2.87s gerando bundle de produção em `./dist` servido pelo Caddy.
    - Contêiner `operabeauty-api` reconstruído e validado no Docker.
    - Homologação visual e funcional de ponta a ponta com Browser Subagent gravada em vídeo WebP (`homologacao_d12_1793061198529.webp`) confirmando abertura do modal, seleção de variação e extras, cálculo em tempo real e transição pelas etapas de profissional, horários e revisão.
- [x] **D13 (P2) — Pacotes de sessões** → [Plano §4·D13](OperaBeauty_Plano_de_Melhorias.md#L512-L514):
  - **1. Modelagem Relacional & Migração no PostgreSQL (`phase28_service_packages.sql`)**:
    - `public.cap_packages`: tabela de modelos de pacotes pré-pagos ofertados pelo salão com colunas `id UUID PK`, `tenant_id UUID FK`, `name TEXT`, `description TEXT`, `service_id UUID FK`, `total_sessions INT CHECK (total_sessions > 0)`, `price NUMERIC(10,2) CHECK (price >= 0)`, `validity_days INT DEFAULT 90 CHECK (validity_days > 0)`, `min_interval_days INT DEFAULT 0 CHECK (min_interval_days >= 0)`, `is_active BOOLEAN DEFAULT TRUE`, `created_at TIMESTAMPTZ`, índices e isolamento RLS multi-tenant (`tenant_isolation_packages`).
    - `public.cap_client_packages`: tabela de controle de saldo de sessões por cliente com colunas `id UUID PK`, `tenant_id UUID FK`, `client_id UUID FK`, `package_id UUID FK`, `service_id UUID FK`, `total_sessions INT`, `used_sessions INT DEFAULT 0 CHECK (used_sessions >= 0)`, `remaining_sessions INT NOT NULL CHECK (remaining_sessions >= 0)` (**Regra de Aceite Principal: saldo NUNCA pode ficar negativo** garantido no nível do motor relacional), `price_paid NUMERIC(10,2)`, `payment_method TEXT`, `installments INT`, `status TEXT CHECK (status IN ('active', 'completed', 'expired', 'cancelled'))`, `purchased_at TIMESTAMPTZ`, `expires_at TIMESTAMPTZ`, `last_session_at TIMESTAMPTZ`, `notes TEXT`, índices e isolamento RLS multi-tenant (`tenant_isolation_client_packages`).
    - `public.cap_package_usages`: tabela de trilha de auditoria atômica para cada sessão debitada ou estornada com colunas `id UUID PK`, `tenant_id UUID FK`, `client_package_id UUID FK`, `appointment_id UUID FK`, `session_number INT`, `action TEXT CHECK (action IN ('consume', 'refund', 'adjustment'))`, `notes TEXT`, `created_at TIMESTAMPTZ`, índices e isolamento RLS multi-tenant (`tenant_isolation_package_usages`).
    - `public.cap_appointments`: adicionadas as colunas `client_package_id UUID REFERENCES cap_client_packages(id) ON DELETE SET NULL` e `is_package_session BOOLEAN NOT NULL DEFAULT FALSE`.
    - Cadastro da feature flag `'packages'` e habilitação automática nos planos `Premium` e `Enterprise` (`cap_plans.features || '["packages"]'::jsonb`).
    - Concessões DML concedidas ao usuário `opera_app` (**C5**) e documentação em `database.md` (§24, §2.7.4, §2.7.5, §2.7.6 e §2.12).
  - **2. Lógica Transacional e Regras de Negócio no Backend (`packageService.js`, `appointmentService.js`)**:
    - `consumePackageSession`: baixa atômica de 1 sessão com lock pessimista (`SELECT ... FOR UPDATE`), verificação de validade (`expires_at < NOW()`), status ativo, saldo suficiente e intervalo fisiológico mínimo (`min_interval_days`), gravando evento em `cap_package_usages`.
    - `refundPackageSession`: estorno atômico de sessão (`remaining_sessions + 1`, `used_sessions - 1`) com lock pessimista (`FOR UPDATE`) devolvendo o crédito à cliente em cancelamentos de agendamentos.
    - `createAppointment`: validação server-side de elegibilidade de pacote e saldo antes de criar o agendamento, definindo `is_package_session = true`, vinculando `client_package_id` e abatendo o valor do serviço base (R$ 0,00).
    - `updateAppointment` e `deleteAppointment`: consumo automático da sessão ao concluir o atendimento (`status = 'completed'`) e estorno automático em caso de cancelamento (`status = 'cancelled'`).
    - `getPackagesReport`: agregação executiva de KPIs (Modelos Ativos, Pacotes Vendidos, Sessões a Realizar e Receita Antecipada).
  - **3. Endpoints REST e Schemas Zod (`routes/packages.js`)**:
    - `POST /api/packages`: criação com validação de nome, sessões, preço, validade e intervalo mínimo.
    - `POST /api/packages/sell`: venda para cliente com persistência de saldo inicial e cálculo da data de expiração.
    - `GET /api/packages`: listagem do catálogo de pacotes do salão.
    - `GET /api/packages/client/:clientId`: consulta do saldo e histórico de pacotes da cliente.
    - `GET /api/packages/check-eligible/:serviceId`: verificação de elegibilidade de pacote ativo para o checkout.
    - `GET /api/reports/packages`: relatório executivo de pacotes e receita antecipada.
    - Proteção de acesso com `authMiddleware`, `requireRole` e `requireFeature('packages')`.
  - **4. Frontend Rosé Editorial & Experiência de Gestão e Checkout**:
    - *Gestão de Pacotes (`GestaoPacotes.jsx`)*: tela com 4 KPIs executivos, listagem com tabela e cards mobile, modal de criação com cálculo dinâmico de economia em tempo real (badge Rosé Editorial) e modal de venda para cliente.
    - *Navegação e Rotas (`App.jsx`, `AdminLayout.jsx`)*: inclusão da rota `staff/admin/pacotes` protegida por `FeatureProtectedRoute` e link no menu lateral sob a categoria 'Catálogo'.
    - *Ficha da Cliente CRM (`FichaClienteCRM.jsx`)*: card de "Pacotes de Sessões" na coluna esquerda com progresso de sessões restantes, status semântico (Ativo, Concluído, Expirado), datas de validade/última sessão e modal de venda direta com 1 clique.
    - *Checkout & Revisão (`AgendamentoRevisao.jsx`)*: card de pacote elegível ativo com switch toggle para abater 1 sessão (R$ 0,00) e detalhamento no resumo financeiro.
    - *Cliente de API (`api.js`)*: módulo `api.packages` com todas as funções integradas.
  - **5. Testes Automatizados e Homologação**:
    - Suíte Jest em `backend/tests/pacotesSessoesD13.test.js` passando 100% (20/20 testes cobrindo DDL, constraints `remaining_sessions >= 0`, RLS, concessões `opera_app`, schemas Zod, locks atômicos, regras de estorno, validade e intervalo fisiológico).
    - Suíte de regressão D12 passando 100% (17/17 testes). Total: 37 testes automatizados ativos e aprovados.
    - Build do Vite concluído com sucesso em 1.91s gerando bundle de produção em `./dist`.
    - Container `operabeauty-api` e `operabeauty-db` 100% online e operantes.
    - Homologação visual e funcional de ponta a ponta com Browser Subagent autenticado com perfil de gestora (`thais@studiodatha.com` / `Salaodatha98!` no salão `studiodatha`), criando com sucesso o pacote "Combo 5x Drenagem Corporal" e gerando gravação WebP (`homologacao_d13_studiodatha_1793066293762.webp`) e evidência fotográfica `package_created_success_1793068492725.png`.
- [x] **D14 (P2) — Anamnese dinâmica, termo de consentimento e evolução** → [Plano §4·D14](OperaBeauty_Plano_de_Melhorias.md#L516-L518): dados de saúde (LGPD), com criptografia em repouso e log de acesso:
  - **1. Modelagem Relacional & Migração no PostgreSQL (`phase29_anamnesis_consent_and_evolution.sql`)**:
    - `cap_anamnesis_templates`: evolução adicionando `terms_text TEXT`, `terms_version INT DEFAULT 1`, `require_terms BOOLEAN DEFAULT TRUE` e `require_signature BOOLEAN DEFAULT FALSE`.
    - `cap_client_anamnesis`: evolução adicionando `answers_encrypted TEXT` (respostas criptografadas em repouso com AES-256-GCM para atender o Artigo 11 da LGPD), `terms_accepted BOOLEAN DEFAULT FALSE`, `terms_version INT DEFAULT 1`, `consented_at TIMESTAMPTZ`, `consent_ip_address VARCHAR(45)`, `consent_user_agent TEXT`, `consent_hash VARCHAR(64)` (hash SHA-256 de não repúdio do termo) e `signature_data TEXT` (assinatura digital eletrônica manuscrita).
    - `cap_client_evolutions`: criação da tabela de prontuário e evolução clínica por sessão com colunas `id UUID PK`, `tenant_id UUID FK`, `client_id UUID FK`, `staff_id UUID FK REFERENCES cap_staff(id)`, `appointment_id UUID FK`, `session_date DATE`, `procedure_name TEXT`, `notes TEXT`, `measurements JSONB DEFAULT '{}'::jsonb`, `before_photos JSONB DEFAULT '[]'::jsonb`, `after_photos JSONB DEFAULT '[]'::jsonb`, `photo_consent_level VARCHAR(30) CHECK (photo_consent_level IN ('none', 'internal_only', 'social_media_anonymous', 'social_media_full')) DEFAULT 'internal_only'`, índices e política RLS multi-tenant (`tenant_isolation_client_evolutions`).
    - Concessões de privilégios concedidas a `opera_app` (**C5**). Documentado em `database.md` (§25).
  - **2. Lógica de Negócio, Criptografia LGPD e Controle de Acesso Server-Side (`anamnesisService.js`, `evolutionService.js`)**:
    - *Criptografia em Repouso*: Cifragem transparente das respostas de saúde com AES-256-GCM (`iv:authTag:cipherText`) antes de persistir em `answers_encrypted` e decifragem autorizada em tempo de leitura.
    - *Controle de Acesso Estrito (Regra de Aceite Principal D14)*: Ficha de anamnese e prontuário restritos exclusivamente a gestores (`admin`, `manager`, `superadmin`), ao próprio cliente (`client`) e aos profissionais (`staff`) que possuem atendimento vinculado à cliente (`checkStaffClientAccess`). Tentativas de acesso por profissionais sem agendamento conjunto são barradas com HTTP 403 Forbidden.
    - *Hash de Integridade Jurídica*: Geração de hash SHA-256 contendo texto do termo aceito, versão, ID do cliente, IP, User-Agent e carimbo de tempo.
    - *Trilha de Auditoria LGPD*: Todo acesso a dados sensíveis de saúde é registrado no audit trail (`cap_audit_logs`) com a ação `'ACCESS_HEALTH_DATA'`.
  - **3. Schemas de Validação Zod & Rotas REST (`routes/anamnesis.js`, `routes/evolutions.js`)**:
    - Endpoints `GET /api/anamnesis/template/:tenantId`, `PUT /api/anamnesis/template`, `GET /api/anamnesis/client/:clientId` e `POST /api/anamnesis/client` com captura de IP e User-Agent.
    - Endpoints `POST /api/evolutions`, `GET /api/evolutions/client/:clientId`, `PUT /api/evolutions/:id` e `DELETE /api/evolutions/:id` montados em `app.js`.
  - **4. Frontend Rosé Editorial & Experiência de Anamnese, Termos e Prontuário**:
    - *Configuração de Template (`AnamneseTemplate.jsx`)*: Tabs de "Perguntas da Ficha" e "Termo de Consentimento & Assinatura (vX)", toggles para exigir aceite de termos e assinatura manuscrita, editor do texto legal e botão de incremento de versão.
    - *Assinatura Digital Manuscrita (`AssinaturaDigitalCanvas.jsx`)*: Componente de canvas touch/mouse de alta resolução para coleta de assinatura digital na tela.
    - *Preenchimento da Cliente (`ClienteAnamnese.jsx`)*: Tela com perguntas dinâmicas, caixa de rolagem com texto do termo, checkbox de ciência legal e quadro de assinatura manuscrita.
    - *Ficha da Cliente no CRM (`FichaClienteCRM.jsx`)*: Card de Anamnese com selo de criptografia AES-256, badge de aceite de termo, hash SHA-256 e modal de visualização da assinatura eletrônica; nova seção "Evolução clínica & Sessões" com histórico de procedimentos, badge de autorização de fotos, badges de medidas corporais/faciais, comparador visual de fotos Antes & Depois e modal Rosé Editorial para cadastro de nova sessão com upload seguro de imagens.
    - *Cliente de API (`api.js`)*: Inclusão dos módulos `api.anamnesis` e `api.evolutions`.
  - **5. Testes Automatizados e Homologação**:
    - Suíte Jest em `backend/tests/anamneseConsentimentoEvolucaoD14.test.js` passando 100% (16/16 testes). Total de testes de regressão (D12, D13, D14): 53 testes aprovados.
    - Build do Vite concluído com sucesso em 4.53s gerando bundle de produção em `./dist`.
    - Contêiner `operabeauty-api` e `operabeauty-db` saudáveis (latência 1ms).
    - Homologação visual e funcional de ponta a ponta com Browser Subagent autenticado com perfil de gestora (`thais@studiodatha.com`), com evidências registradas em `anamnese_terms_screen_1793103075624.png`, `evolution_modal_1793103223993.png`, `clinical_evolution_saved_1793103452162.png` e gravação WebP `homologacao_d14_anamnese_1793102899161.webp`.
- [x] **D15 (P2) — Campanhas automáticas** → [Plano §4·D15](OperaBeauty_Plano_de_Melhorias.md#L520-L522): Aniversário, Retorno/Manutenção e Reativação 60 dias (sumidas):
  - **1. Modelagem Relacional & Migração no PostgreSQL (`phase30_automated_campaigns.sql`)**:
    - `cap_marketing_campaigns`: tabela de configuração por salão (`id UUID PK`, `tenant_id UUID FK`, `type VARCHAR(30) CHECK IN ('birthday', 'maintenance', 'reactivation_60d')`, `name TEXT`, `is_active BOOLEAN DEFAULT TRUE`, `message_template TEXT`, `discount_type VARCHAR(20) DEFAULT 'percentage'`, `discount_value NUMERIC(10,2)`, `coupon_validity_days INT`, `min_days_inactive INT`, `send_channel VARCHAR(20) DEFAULT 'whatsapp'`, `cooldown_days INT DEFAULT 60`, `CONSTRAINT uq_campaign_tenant_type UNIQUE(tenant_id, type)`).
    - `cap_campaign_logs`: tabela de histórico, deduplicação e contagem (`id UUID PK`, `tenant_id UUID FK`, `campaign_id UUID FK`, `client_id UUID FK`, `campaign_type VARCHAR(30)`, `phone VARCHAR(30)`, `message_content TEXT`, `coupon_id UUID FK`, `coupon_code TEXT`, `status VARCHAR(20) DEFAULT 'sent' CHECK IN ('sent', 'failed', 'opt_out', 'skipped_cooldown')`, `error_message TEXT`, `channel VARCHAR(20)`, `sent_at TIMESTAMPTZ`).
    - `cap_clients`: extensão com `marketing_opt_out BOOLEAN DEFAULT FALSE` e `opt_out_at TIMESTAMPTZ`, acompanhados de índice composto `idx_cap_clients_opt_out`.
    - RLS multi-tenant ativado nas duas tabelas (`tenant_isolation_marketing_campaigns`, `tenant_isolation_campaign_logs`).
    - Concessões DML restritas ao usuário `opera_app` (**Princípio C5**). Documentado em `database.md` (§26).
  - **2. Lógica de Negócio, Deduplicação e Cron Diário (`campaignService.js`, `reminders.js`)**:
    - *Geração Automática de Cupons de Uso Único*: Ao disparar campanhas com desconto, cupons exclusivos com prefixos semânticos (`NIVER`, `VOLTA`, `RETORNO`), sufixo criptográfico aleatório, validade personalizada e `max_uses = 1` são gerados em `cap_coupons`.
    - *Deduplicação por Carência (Regra de Aceite Principal D15)*: Nenhuma cliente recebe a mesma campanha duas vezes dentro da janela de carência (`cooldown_days`). A verificação `isClientInCooldown` consulta logs anteriores e impede spam.
    - *Respeito Absoluto a Opt-Out*: Clientes com `marketing_opt_out = true` são ignoradas pelas campanhas automáticas e registradas como status `opt_out`.
    - *Rotina Cron Diária*: Integração em `backend/cron/reminders.js` às 08:00 para varredura automática (`runCampaignScan`).
  - **3. Schemas de Validação Zod & Rotas REST (`routes/campaigns.js`)**:
    - Endpoints `GET /api/campaigns`, `PUT /api/campaigns/:type`, `POST /api/campaigns/run`, `GET /api/campaigns/history` e `POST /api/campaigns/clients/:clientId/opt-out`.
    - Sanitização Zod rejeitando descontos negativos e parâmetros fora dos limites operacionais.
  - **4. Frontend Rosé Editorial & Experiência de Gestão e CRM**:
    - *Painel de Gestão de Campanhas (`GestaoCampanhas.jsx`)*: 4 KPIs executivos no topo (Total Disparado no Mês, Aniversários, Retornos/Manutenções, Cupons Gerados e Clientes com Opt-Out), 3 cards de campanhas com switches de ativação, sliders de desconto e carência, editor de template com preview WhatsApp em tempo real, botão de disparo manual e tabela de histórico de auditoria.
    - *Navegação Administrativa (`App.jsx`, `AdminLayout.jsx`)*: Rota registrada `staff/admin/campanhas` e link no menu lateral "Campanhas & Retenção" com ícone Google Material Symbols `campaign`.
    - *Ficha da Cliente CRM (`FichaClienteCRM.jsx`)*: Switch interativo na coluna de dados cadastrais exibindo status de Campanhas Automáticas (Ativo / Opt-Out) com alternância instantânea e feedback via toast.
    - *Cliente de API (`api.js`)*: Módulo `api.campaigns` implementado.
  - **5. Testes Automatizados e Homologação**:
    - Suíte Jest em `backend/tests/campanhasAutomaticasD15.test.js` passando 100% (14/14 testes). Total de testes de regressão (D12, D13, D14, D15): 67 testes aprovados.
    - Compilação de produção Vite concluída em 17.29s sem nenhum aviso ou erro.
    - Contêineres Docker reiniciados e validados (`/health/complete` OK com latência de 8ms).
    - Homologação visual e funcional de ponta a ponta com Browser Subagent gravada em vídeo WebP (`homologacao_d15_campanhas_1793105297237.webp`) e screenshots capturadas (`d15_campanhas_dashboard_png_1793105361442.png` e `d15_cliente_optout_toggle_png_1793105516583.png`).
- [x] **D16 (P2) — Avaliações e Google** → [Plano §4·D16](OperaBeauty_Plano_de_Melhorias.md#L524-L526): Avaliação de 1 a 5 estrelas pós-atendimento; média geral e por profissional; convite para avaliar no Google (Google Reviews) quando a nota for 4 ou 5 estrelas:
  - **1. Modelagem Relacional & Migração no PostgreSQL (`phase31_reviews_and_google.sql`)**:
    - `cap_tenants`: adicionadas as colunas `google_review_url TEXT` (link direto da ficha no Google Meu Negócio / Google Reviews) e `updated_at TIMESTAMPTZ DEFAULT NOW()`.
    - `cap_reviews`: evolução estrutural adicionando `service_id UUID REFERENCES cap_services(id)`, `is_public BOOLEAN DEFAULT TRUE`, `staff_reply TEXT`, `replied_at TIMESTAMPTZ` e `replied_by UUID REFERENCES cap_staff(id)`.
    - *Unicidade por Atendimento (Regra de Aceite Principal D16)*: Aplicação do índice único parcial `CREATE UNIQUE INDEX uq_idx_reviews_appointment ON cap_reviews(appointment_id) WHERE appointment_id IS NOT NULL`, blindando o sistema contra avaliações duplicadas e manipulação de notas.
    - Índices de otimização: `idx_reviews_tenant_professional`, `idx_reviews_tenant_public` e `idx_reviews_client`.
    - RLS multi-tenant ativo (`tenant_isolation_reviews`) e concessões DML estritas concedidas ao usuário `opera_app` (**Princípio C5**). Documentado em `database.md` (§27).
  - **2. Lógica de Negócio, Moderação e Impulsionador Google Reviews (`reviewService.js`)**:
    - *Avaliação Pós-Atendimento*: Validação de nota de 1 a 5 estrelas e vínculo obrigatório a agendamento com status `completed`. Retorna HTTP 409 Conflict em caso de tentativa de duplicidade.
    - *Impulsionador Inteligente de Google Reviews*: Quando a cliente atribui nota 4 ou 5 estrelas e o salão configurou seu `google_review_url`, o serviço retorna `google_invite_eligible: true` com a URL direta do Google Reviews. Notas de 1 a 3 estrelas são tratadas internamente sem expor a reputação pública do salão.
    - *Métricas e Relatórios*: `getReviewsStats` computa média geral, total de feedbacks, taxa de satisfação positiva (%), distribuição de estrelas 1 a 5 e ranking detalhado de média e feedbacks por profissional.
    - *Moderação e Respostas Oficiais*: Funções `toggleReviewVisibility` para ocultar/exibir avaliações na vitrine pública e `replyToReview` registrando respostas oficiais da equipe com carimbo de tempo e ID do autor.
  - **3. Schemas de Validação Zod & Rotas REST (`routes/reviews.js`)**:
    - Endpoints protegidos com validação Zod: `GET /api/reviews/stats`, `POST /api/reviews`, `GET /api/reviews/pending`, `GET /api/reviews/public` (com suporte flexível a `tenant_id` e `tenant_slug`), `GET /api/reviews`, `PATCH /api/reviews/:id/visibility`, `POST /api/reviews/:id/reply` e `PUT /api/reviews/google-url`.
  - **4. Frontend Rosé Editorial & Experiência de Gestão e Cliente**:
    - *Painel de Gestão de Avaliações (`GestaoAvaliacoes.jsx`)*: Tela executiva com 4 KPIs superiores (Média Geral, Taxa de Satisfação, Total de Feedbacks e Status do Convite Google), card "Impulsionador de Avaliações no Google Meu Negócio" com input e salvamento de link, painel lateral de ranking da equipe e tabela de moderação com filtros rápidos de estrelas (Todas, 5★ a 1★), busca, badges de visibilidade e modal de resposta oficial.
    - *Navegação Administrativa (`App.jsx`, `AdminLayout.jsx`)*: Rota registrada `staff/admin/avaliacoes` e link no menu lateral "Avaliações & Google" com ícone Google Material Symbols `star`.
    - *Experiência da Cliente (`ReviewModal.jsx`, `HistoricoAgendamentos.jsx`)*: Botão de avaliação integrado nos cards concluídos do histórico, seletor de 1 a 5 estrelas Rosé Editorial, campo de comentário opcional e tela festiva pós-avaliação convidando a cliente satisfeita a publicar seu elogio no Google Meu Negócio.
    - *Cliente de API (`api.js`)*: Módulo `api.reviews` integrado com métodos completos (`getStats`, `list`, `listPublic`, `getPending`, `create`, `toggleVisibility`, `reply`, `updateGoogleUrl`).
  - **5. Testes Automatizados e Homologação**:
    - Suíte Jest em `backend/tests/avaliacoesGoogleD16.test.js` passando 100% (16/16 testes cobrindo DDL, RLS, regras de nota 4-5 Google Reviews, schemas Zod e componentes). Total de testes de regressão (D12, D13, D14, D15, D16): 83 testes aprovados.
    - Compilação de produção Vite (`npm run build`) validada em 1.59s sem erros gerando bundle limpo em `./dist`.
    - Contêineres Docker reiniciados e operando de forma saudável.
    - Homologação visual e funcional via Browser Subagent gravada em vídeo WebP (`homologacao_d16_avaliacoes_1793110303022.webp`) e evidenciada em screenshots (`d16_gestao_avaliacoes_sucesso_1793110622196.png`).
- [x] **D17 (P2) — Comanda unificada e fechamento de caixa** → [Plano §4·D17](OperaBeauty_Plano_de_Melhorias.md#L528-L530): Vários serviços + produtos + gorjeta; pagamento dividido (PIX + cartão + dinheiro); aplicar cupom/vale/cashback; fechamento diário com conciliação exata de estoque e financeiro:
  - **1. Modelagem Relacional & Migração no PostgreSQL (`phase32_unified_order_and_cash_register.sql`)**:
    - `cap_cash_registers`: tabela de sessões diárias de caixa do salão com controle de operador, data/hora, status (`open`/`closed`), fundo de troco inicial, totais esperados por método e conferência física com cálculo de quebra/sobra (`cash_difference`, `total_difference`).
    - `cap_cash_movements`: tabela de suprimentos e sangrias vinculadas à sessão com tipo (`supply`/`bleed`), valor e justificativa auditada.
    - `cap_orders`: tabela de comandas unificadas com número sequencial (`CMD-YYYYMMDD-XXX`), vínculo opcional com agendamento e cliente, subtotal, descontos, gorjeta e troco em espécie.
    - `cap_order_items`: itens da comanda segregados por `item_type` (`service`/`product`), vínculo de profissional executor e cálculo de comissões individuais.
    - `cap_order_payments`: registro do rateio de pagamento com método (`cash`, `pix`, `credit_card`, `debit_card`, `wallet`, `giftcard`), parcelas e dados adicionais.
    - Row Level Security (RLS) multi-tenant ativado nas 5 tabelas e privilégios DML concedidos ao papel `opera_app` (**Princípio C5**). Documentado em `database.md` (§28).
  - **2. Lógica de Negócio, Baixa Atômica e Split Payment (`orderService.js`, `cashRegisterService.js`)**:
    - *Comanda Unificada*: Agrupamento de múltiplos serviços e produtos de pronta entrega com gorjeta destinada à equipe ou salão.
    - *Baixa Atômica de Estoque*: Lock pessimista ordenado `SELECT ... FOR UPDATE` sobre `cap_inventory`, validação de saldo disponível e baixa condicional `UPDATE cap_inventory SET quantity = quantity - $1 WHERE quantity >= $1`.
    - *Benefícios Combinados*: Aplicação de cupons em ponto único (`redeemCoupon`), resgate de vales-presente em livro-razão imutável (`redeemGiftCard`) e débito atômico na carteira de cashback (`processCashbackRedemption`).
    - *Split Payment & Troco*: Rateio de pagamentos entre múltiplas formas e cálculo automático de troco em dinheiro.
    - *Vínculo com Agendamento*: Atualização atômica do status do agendamento vinculado para `completed`.
    - *Ciclo Diário de Caixa*: Abertura com fundo de troco, sangrias/suprimentos com trava de saldo em gaveta e fechamento com conferência física cega e apuração de divergências.
  - **3. Schemas de Validação Zod & Rotas REST (`routes/orders.js`, `routes/cashRegister.js`)**:
    - Endpoints de caixa: `GET /api/cash-register/current`, `POST /api/cash-register/open`, `POST /api/cash-register/movements`, `POST /api/cash-register/close`, `GET /api/cash-register/history` e `GET /api/cash-register/:id`.
    - Endpoints de comanda: `POST /api/orders`, `POST /api/orders/:id/items`, `DELETE /api/orders/:id/items/:itemId`, `POST /api/orders/:id/checkout`, `GET /api/orders`, `GET /api/orders/:id` e `POST /api/orders/:id/cancel`.
  - **4. Frontend Rosé Editorial & Experiência de Caixa e Checkout (`PDV.jsx`)**:
    - *4 Abas Integradas*: Comanda & Checkout, Sessão de Caixa, Catálogo de Revenda e Histórico & Fechamentos.
    - *Modais Operacionais*: `ModalAbrirCaixa.jsx` (fundo de troco e notas), `ModalMovimentacaoCaixa.jsx` (sangria/suprimento com validação de saldo) e `ModalFecharCaixa.jsx` (conferência física com apuração de quebra/sobra).
    - *Comanda e Split*: Adição dinâmica de serviços e produtos de pronta entrega, campo de gorjeta para a equipe, seletor de cliente/agendamento do dia, seletor de forma de pagamento única ou rateio via Split Payment com indicador de restante a pagar e emissão de comprovante.
    - *Cliente de API (`api.js`)*: Módulos `api.cashRegister` e `api.orders` integrados.
  - **5. Testes Automatizados e Homologação**:
    - Suíte Jest em `backend/tests/comandaFechamentoCaixaD17.test.js` passando 100% (15/15 testes). Total de testes de regressão (D12 a D17): 98/98 testes passando 100%.
    - Compilação de produção com Vite (`npm run build`) concluída com êxito em 2.73s gerando bundle limpo em `./dist`.
    - Contêineres Docker reiniciados e operantes com latência normalizada.
    - Homologação visual e funcional via Browser Subagent gravada em vídeo WebP (`homologacao_d17_comanda_caixa_1793114850866.webp`).
- [x] **D19 (P2) — Indique e ganhe** → [Plano §4·D19](OperaBeauty_Plano_de_Melhorias.md#L536): Libera o chip "Indicar uma amiga" da Home (§3.4 item 6) com sistema de aquisição orgânica de clientes:
  - **1. Modelagem Relacional & Migração no PostgreSQL (`phase33_referral_program.sql`)**:
    - `cap_tenants`: parametrização flexível do programa com colunas `referral_program_active`, `referral_reward_type` ('wallet', 'coupon'), `referral_referrer_reward` (R$), `referral_referee_reward` (R$), `referral_trigger` ('on_first_completed_appointment' vs 'on_signup') e `referral_custom_message`.
    - `cap_referrals`: tabela de ciclo de vida de indicações com status (`pending`, `completed`, `cancelled`), valores de recompensas e vínculo com agendamento.
    - *Blindagem Anti-Fraude*: Constraints `chk_no_self_referral CHECK (referrer_id <> referee_id)` e `uq_referral_tenant_referee UNIQUE (tenant_id, referee_id)`.
    - Row Level Security (RLS) multi-tenant ativo (`tenant_isolation_referrals`) e concessões DML estritas concedidas ao usuário `opera_app` (**Princípio C5**). Documentado em `database.md` (§29).
  - **2. Lógica de Negócio, Geração de Códigos e Idempotência (`referralService.js`)**:
    - *Geração Criptográfica Única*: Função `generateUniqueReferralCode` com alfabeto sem ambiguidades visuais (sem 0, O, 1, I).
    - *Validação Pública Pré-Cadastro*: Endpoint `GET /api/referral/validate/:code` validando o código e retornando nome e benefício.
    - *Preservação de Contexto*: Captura de `?ref=...` em `TenantContext.jsx` persistida em `sessionStorage` e `localStorage`.
    - *Liberação Atômica de Crédito (Princípio C10)*: Concessão de bônus na carteira digital (`cap_wallet_transactions`) e saldo (`cap_client_wallets`) com chaves de idempotência (`referral:referrer:${id}` e `referral:referee:${id}`), disparada tanto em atendimentos concluídos na agenda (`updateAppointment`) quanto no fechamento de comanda no PDV (`checkoutOrder`).
    - *Registro na Timeline do CRM*: Gravação de notas afetuosas automáticas em `cap_timeline_notes`.
  - **3. Frontend Rosé Editorial & Experiência de Cliente e Gestão**:
    - *Home da Cliente (`ModalIndicarAmiga.jsx`, `HomeCliente.jsx`)*: Chip "Indicar uma amiga" abrindo modal Rosé Editorial com benefícios mútuos (R$ 15,00 cada), cópia do código em 1 clique, envio direto para WhatsApp, minipainel com métricas da cliente (amigas indicadas, atendidas e bônus ganho) e atalho para a carteira.
    - *Cadastro da Cliente (`CadastroCliente.jsx`)*: Card acolhedor *"Convite especial de [Nome]! Ganhe R$ 15,00 de presente no seu primeiro atendimento"*.
    - *Painel de Gestão no Staff / Admin (`GestaoIndicacoes.jsx`)*: Tela executiva com 4 KPIs superiores, painel de regras com switches de ativação, sliders de bônus, gatilho no 1º atendimento vs cadastro, vitrine de Top Embaixadoras e tabela paginada com histórico de auditoria.
    - *Navegação Administrativa (`App.jsx`, `AdminLayout.jsx`)*: Rota registrada `staff/admin/indicacoes` e link no menu lateral sob a seção "Gestão" com ícone de compartilhamento.
  - **4. Resolução de Bug: Query de Serviços com `tenant_id=undefined`**:
    - Corrigido `src/lib/api.js` para não injetar `?tenant_id=undefined` quando o ID for omitido, alinhado `PDV.jsx` para passar `tenant?.id` e blindado `listServicesSchema` no backend para aceitar graciosamente consultas sem query params usando o token JWT do operador.
  - **5. Testes Automatizados e Homologação**:
    - Suíte Jest em `backend/tests/indiqueGanheD19.test.js` passando 100% (8/8 testes). Total de testes de regressão (D12 a D19): **106/106 testes passando 100%**.
    - Compilação de produção com Vite (`npm run build`) validada em 2.40s.
    - Homologação visual e funcional de ponta a ponta via Browser Subagent gravada em vídeo WebP (`homologacao_d19_indique_ganhe_1793118212629.webp`) e screenshots registradas.
- [x] **D20 (P2) — Mini-site do salão & SEO Dinâmico** → [Plano §4·D20](OperaBeauty_Plano_de_Melhorias.md#L536) · [F3](OperaBeauty_Plano_de_Melhorias.md#L551):
  - **1. Modelagem Relacional & Migração no PostgreSQL (`phase34_salon_minisite.sql`)**:
    - `cap_tenants`: adição das colunas institucionais e de SEO `about_text TEXT`, `headline TEXT`, `minisite_gallery JSONB DEFAULT '[]'::jsonb`, `google_maps_url TEXT`, `meta_title TEXT`, `meta_description TEXT`, `meta_image_url TEXT` e `minisite_enabled BOOLEAN DEFAULT TRUE`.
    - Concessões C5 de menor privilégio concedidas estritamente ao usuário `opera_app` (`GRANT SELECT, UPDATE ON public.cap_tenants TO opera_app`).
    - Seed institucional elegante inserido com copywriting acolhedor e profissional para `studiodatha`. Documentado na Seção 30 de `database.md`.
  - **2. Backend Services, Rotas REST e Cache Atômico (`minisiteService.js`, `routes/minisite.js`)**:
    - `getMinisiteData(slug)`: consolidação transacional em ponto único dos dados do salão, avaliações 4-5★ públicas (D16), lookbook de trabalhos, horários de funcionamento, equipe de especialistas, serviços em destaque e tags de SEO social (OpenGraph e Twitter Cards), com cache no Redis de 15 minutos (`minisite:${slug}`).
    - `updateMinisiteSettings(tenantId, payload)`: atualização com validação de tipos via Zod e invalidação atômica de cache Redis.
    - Endpoints montados em `app.js`: `GET /api/minisite/:slug` (pública), `GET /api/minisite/:slug/seo` (pública para indexadores) e `PUT /api/minisite` (autenticada para gestores).
  - **3. Frontend Rosé Editorial & Experiência Pública e Gestora**:
    - `src/hooks/useSEO.js`: hook reutilizável para manipulação de `document.title`, `meta[name=description]`, `og:title`, `og:description`, `og:image`, `og:url` e `twitter:card`.
    - `src/pages/MiniSiteSalao.jsx`: página pública completa acessível em `/:tenant_slug/site` com Navbar flutuante e monograma, Hero com imagem e headline, Sobre o Espaço, Procedimentos em Destaque, Galeria de Trabalhos & Lookbook com modal Lightbox ampliado de alta definição, Equipe de Especialistas, Depoimentos Reais com selo de verificação e link do Google Reviews, Localização com rota no Google Maps, Horários com indicador "Aberto agora" em tempo real e CTA mobile fixo "Agendar Horário Online".
    - `src/pages/admin/GestaoMiniSite.jsx`: tela de gestão administrativa em `staff/admin/minisite` com toggle de ativação, edição de headline, texto sobre nós, link do Maps, gerenciador de fotos da galeria com upload de URL/legenda e preview em tempo real do cartão de compartilhamento do WhatsApp/Instagram.
    - `src/components/admin/AdminLayout.jsx`: link "Mini-site & SEO" adicionado no menu lateral com ícone `public`.
    - `src/pages/HomeCliente.jsx`: chip "Conhecer o espaço" integrado nas ações rápidas direcionando para o mini-site.
    - `src/App.jsx`: rotas registradas `/:tenant_slug/site` e `staff/admin/minisite`.
    - `vite.config.js`: ajustado `workbox.maximumFileSizeToCacheInBytes: 5 * 1024 * 1024` para permitir bundle PWA com segurança.
  - **4. Testes Automatizados e Homologação E2E**:
    - Suíte Jest em `backend/tests/minisiteD20.test.js` passando 100% (6/6 testes).
    - Suíte acumulada de P2 (D12 a D20): **112/112 testes passando 100%**.
    - Compilação limpa do Vite em 2.21s gerando bundle de produção em `./dist`.
    - Homologação visual e funcional de ponta a ponta via Browser Subagent gravada em vídeo WebP (`homologacao_d20_minisite_1793128270490.webp`) e screenshots registradas (`minisite_public_view_1793128281573.png`, `lightbox_modal_view_1793128403721.png`, `admin_minisite_page_1793128777601.png`, `minisite_saved_verify_1793129128750.png`).

**P3 (evolução)**
- [ ] **D21 (P3) — NFS-e** → [Plano §4·D21](OperaBeauty_Plano_de_Melhorias.md#L536).
- [ ] **D22 (P3) — Sincronização com Google Calendar** → [Plano §4·D22](OperaBeauty_Plano_de_Melhorias.md#L536).
- [ ] **D23 (P3) — Multiunidade** → [Plano §4·D23](OperaBeauty_Plano_de_Melhorias.md#L536).
- [ ] **D24 (P3) — Domínio próprio por salão** → [Plano §4·D24](OperaBeauty_Plano_de_Melhorias.md#L536).
- [ ] **D25 (P3) — Modo offline básico na agenda da profissional** → [Plano §4·D25](OperaBeauty_Plano_de_Melhorias.md#L536).

---

## Fase 45: MELHORIAS II — Planos, Preços, Landing e Vendas
> Referências: [§4 Grupo E](OperaBeauty_Plano_de_Melhorias.md#L538-L545) · [§4 Grupo F](OperaBeauty_Plano_de_Melhorias.md#L547-L553) · proposta de planos [§5](OperaBeauty_Plano_de_Melhorias.md#L568-L603) · planos atuais [§1.4](OperaBeauty_Plano_de_Melhorias.md#L75-L84).
> Os preços do §5 são **proposta a validar com custos reais**: confirmar com o responsável pelo produto antes de gravar em `cap_plans`.

**Planos e preços (Grupo E)**
- [x] **E1 (P1) — Reestruturar planos** → [Plano §4·E1](OperaBeauty_Plano_de_Melhorias.md#L540-L542) · [§5.2](OperaBeauty_Plano_de_Melhorias.md#L578-L591):
  - **1. Modelagem Relacional & Migração no PostgreSQL (`phase35_restructure_plans_e1.sql`)**:
    - `cap_plans`: adicionadas as colunas `slug VARCHAR(50) UNIQUE`, `description TEXT`, `max_whatsapp_messages INT DEFAULT 0`, `is_featured BOOLEAN DEFAULT FALSE`, `badge_label VARCHAR(50)`, `marketing_features JSONB DEFAULT '[]'::jsonb` e `extra_professional_price NUMERIC(10,2) DEFAULT 15.00`.
    - Consolidação dos 4 planos oficiais:
      * **Solo**: R$ 49,90/mês (R$ 499,00 anual), 1 profissional, 1 banner, 0 WhatsApp msgs, mini-site com SEO, cupons e agenda digital.
      * **Essencial**: R$ 79,90/mês (R$ 799,00 anual), até 3 profissionais, 2 banners, controle de estoque, caixa, fluxo financeiro e comissões.
      * **Premium**: R$ 129,90/mês (R$ 1.299,00 anual), até 6 profissionais, 3 banners, 200 msgs WhatsApp, clube de fidelidade, cashback, pacotes de sessões, anamnese com termos e assinatura digital, avaliações Google Reviews, lista de espera inteligente e campanhas automáticas. Destaque editorial "Mais Escolhido".
      * **Signature**: R$ 199,90/mês (R$ 1.999,00 anual), até 12 profissionais (+R$ 15/prof adicional), 5 banners, 500 msgs WhatsApp, PDV com conferência cega, vales-presente digitais, gateway WhatsApp oficial conectado, relatórios avançados de BI e suporte VIP prioritário.
    - Desativação do plano legado obsoleto (`Básico` desativado com `is_active = FALSE`).
    - `cap_tenants`: adicionadas as colunas `is_founder BOOLEAN NOT NULL DEFAULT FALSE`, `frozen_price NUMERIC(10,2)`, `price_frozen_until TIMESTAMPTZ` e `founder_badge_label VARCHAR(50) DEFAULT 'Fundador'`.
    - Migração dos salões atuais (`studiodatha` e `atelietodabonita`) garantindo o selo comemorativo **Fundador**, preço congelado em R$ 99,90/mês por 12 meses (`price_frozen_until = NOW() + INTERVAL '12 months'`) e migração para o plano `Signature`, preservando 100% dos recursos ativos sem perda de dados ou quebra de chaves estrangeiras.
    - Concessões C5 de menor privilégio concedidas estritamente ao papel `opera_app` (`GRANT SELECT, UPDATE ON public.cap_plans TO opera_app;` e `GRANT SELECT, UPDATE ON public.cap_tenants TO opera_app;`). Documentado na Seção 31 de `database.md`.
  - **2. Backend Services, Regras de Negócio e Governança**:
    - `planService.js`: expandido para consultar e persistir os atributos de marketing, limites e ordenação por `sort_order`. Suporte a filtro de planos ativos via `active_only`.
    - `tenantService.js`: exposição dos dados de fundador (`is_founder`, `frozen_price`, `price_frozen_until`, `founder_badge_label`) e consolidação das features do plano.
    - `saasBillingService.js`: verificação e respeito estrito ao preço congelado de R$ 99,90 na emissão de faturas e status de cobrança para clientes fundadores (`is_price_frozen = true`).
    - `routes/plans.js`: endpoint público `GET /api/plans` suportando query string `?active_only=true`.
  - **3. Frontend Rosé Editorial & Experiência de Gestão e Assinatura**:
    - `AssinaturaSaaS.jsx`:
      * Card do plano atual exibindo selo dourado "Salão Fundador ★", badge "Preço Congelado", aviso de 12 meses de garantia em R$ 99,90/mês, mensalidade congelada com valor de tabela riscado e nome do plano atualizado para "Plano Signature (Alta Performance)".
      * Seção "Catálogo de Planos OperaBeauty" com toggle interativo Mensal / Anual (2 meses grátis / 17% off), grid comparativo dos 4 planos com badges de "Seu Plano Atual" e "Mais Escolhido" (Premium), limites detalhados de equipe/banners/mensagens e lista de recursos de marketing.
    - `UpgradePlanRequired.jsx`: tela de bloqueio de recursos não contratados totalmente redesenhada em estilo Rosé Editorial, com grid dos 4 planos, indicação de recursos e botões de retorno e direcionamento para gestão de assinatura.
    - `AdminLayout.jsx`: selo dourado com estrela "★ Fundador" posicionado junto ao nome do salão no menu lateral de navegação.
    - `PlanosAdmin.jsx`: textos de suporte sanitizados para "Suporte por WhatsApp em horário comercial".
  - **4. Testes Automatizados e Homologação**:
    - Suíte Jest em `backend/tests/reestruturacaoPlanosE1.test.js` passando 100% (10/10 testes cobrindo DDL, contratos C5, 4 planos oficiais, congelamento de preço, saasBillingService e componentes frontend).
    - Suíte de regressão (D16, D17, D19, D20): 45/45 testes passando 100%. Total acumulado: **55/55 testes aprovados**.
    - Compilação limpa do Vite em 2.23s gerando bundle de produção em `./dist`.
    - Imagem Docker da API (`operabeauty-api`) reconstruída com `--no-cache` e reiniciada no Docker.
- [x] **E2 (P1) — Página de planos** → [Plano §4·E2](OperaBeauty_Plano_de_Melhorias.md#L544): Implementação, testes e homologação completa da página de planos dedicada `/planos` e dinamização dos planos na Landing Page:
  - **1. Página Pública de Planos (`src/pages/PaginaPlanos.jsx` & Rota `/planos`)**:
    - Página pública dedicada `/planos` com Navbar institucional, monograma OperaBeauty e metadados SEO via hook `useSEO` (`title`: "Planos e Preços | OperaBeauty — Software de Gestão para Salões").
    - Toggle de ciclo de cobrança no Hero: **Faturamento Mensal** vs **Faturamento Anual** com badge *"2 meses grátis (17% off)"*.
    - Grid dinâmico dos 4 planos oficiais consumindo `api.plans.list(true)` do banco de dados (Solo: R$ 49,90, Essencial: R$ 79,90, Premium: R$ 129,90 e Signature: R$ 199,90), destacando o plano **Premium** com badge *"Mais Escolhido"*, borda rosé acentuada e sombra suave.
    - **Tabela Comparativa Lado a Lado (Feature Matrix)**: Matriz completa de recursos dividida em 5 categorias (*Equipe e Infraestrutura*, *Agendamento e Presença Digital*, *Finanças, Comissões e Caixa*, *Fidelização, Clube e Marketing*, *Segurança, Integrações e Suporte*), com ícones semânticos de check e X comparando os 4 planos.
    - **FAQ Interativo**: Seletor de perguntas frequentes em sanfona sobre teste grátis de 14 dias sem cartão, upgrade a qualquer momento, cálculo do anual e limites de equipe.
    - **Modal de Captura de Leads**: Modal de teste grátis sem cartão de crédito com envio para a API de leads e redirecionamento para atendimento via WhatsApp com consultor.
  - **2. Desacoplamento e Dinamização na Landing Page (`src/pages/LandingPage.jsx`)**:
    - Eliminado o HTML estático/hardcoded da seção `#planos` da Landing Page.
    - Integrado o carregamento dinâmico via `api.plans.list(true)` com fallback resiliente dos 4 planos oficiais.
    - Adicionado o switcher de Faturamento Mensal / Anual (2 meses grátis) no topo da seção.
    - Inserido botão *"Ver tabela comparativa completa de recursos →"* direcionando para `/planos`, além de link no rodapé.
  - **3. Testes Automatizados e Homologação**:
    - Suíte Jest dedicada em `backend/tests/paginaPlanosE2.test.js` passando 100% (7/7 testes cobrindo rotas públicas, integridade dos componentes, ordenação e regras de cálculo do ciclo anual).
    - Suíte acumulada de E1 e E2: **17/17 testes aprovados**.
    - Build de produção do Vite concluído com sucesso em 2.10s.
    - Homologação visual e funcional completa via Browser Subagent gravada em vídeo WebP (`homologacao_e2_planos_1793133471020.webp`) e screenshots anexadas.
- [x] **E3 (P2) — Complementos (Add-ons do SaaS)** → [Plano §4·E3](OperaBeauty_Plano_de_Melhorias.md#L545): Implementação, testes automatizados e homologação completa da esteira de complementos (Add-ons) sob demanda da plataforma SaaS:
  - **1. Modelagem Relacional & Migração no PostgreSQL (`phase38_saas_addons_e3.sql`)**:
    * Criação da tabela `cap_addons` (catálogo oficial) e `cap_tenant_addons` (contratos multi-tenant com constraint `uq_tenant_addon`).
    * Extensão em `cap_tenants` com colunas `custom_domain`, `custom_domain_verified`, `extra_whatsapp_messages` e `nfse_enabled`.
    * Cadastro dos 4 complementos oficiais: `whatsapp_500` (+500 msgs / R$ 29,90/mês), `whatsapp_1000` (+1.000 msgs / R$ 49,90/mês), `custom_domain` (Domínio Próprio / R$ 39,90/mês) e `nfse_module` (Módulo Fiscal NFS-e / R$ 49,90/mês).
    * Isolamento RLS ativo e concessões DML concedidas ao papel `opera_app` (Princípios C5 e C6).
  - **2. Serviços de Negócio e Rotas REST (`addonService.js`, `routes/addons.js`, `saasBillingService.js`)**:
    * Métodos de contratação (`subscribeAddon`), cancelamento atômico (`cancelAddon`), atualização de configurações (`updateAddonConfig`) e verificação de apontamento DNS (`verifyCustomDomainDns`).
    * Integração atômica em `saasBillingService.js`, consolidando o valor dos complementos ativos (`addons_price`) e calculando a mensalidade total combinada do salão (`total_monthly_price`).
    * Rotas protegidas com validação Zod e isolamento por papel (`manager`, `admin`, `superadmin`).
  - **3. Frontend Rosé Editorial & Modal de Configuração (`AssinaturaSaaS.jsx`, `ModalConfigurarAddon.jsx`, `src/lib/api.js`)**:
    * Módulo `api.addons` adicionado no cliente unificado do frontend.
    * Nova seção Rosé Editorial em `AssinaturaSaaS.jsx`: "Complementos & Add-ons para o seu Salão", apresentando card de composição financeira, status visual em tempo real e vitrine dos 3 add-ons com botões de contratação e cancelamento.
    * Componente `ModalConfigurarAddon.jsx` com instruções de CNAME (`cname.operabeauty.com.br`), botão de cópia em 1 clique, verificação em tempo real de DNS e formulário de dados tributários para emissão fiscal.
  - **4. Testes Automatizados**:
    * Suíte Jest em `backend/tests/complementosSaaSE3.test.js` passando 100% (16/16 testes aprovados).

**Landing e vendas (Grupo F)**
- [x] **F1 (P1) — Landing page estática com SEO, separada do app** → [Plano §4·F1](OperaBeauty_Plano_de_Melhorias.md#L549): Implementação, testes e homologação completa da infraestrutura de SEO, separação da Landing Page em relação ao SPA e experiência interativa de vendas:
  - **1. Diretivas de Rastreamento & Mapa de Páginas Canônicas (`robots.txt` & `sitemap.xml`)**:
    * Criação de `public/robots.txt` permitindo indexação limpa de `/`, `/planos`, `/termos`, `/privacidade` e `/*/site`, enquanto bloqueia o rastreamento de rotas internas da API (`/api/`), painéis administrativos (`/superadmin/`, `/staff/`) e uploads privados (`/private_uploads/`), com referência ao sitemap.
    * Criação de `public/sitemap.xml` estruturado no protocolo canônico do sitemaps.org com prioridades calibradas (`1.0` para Home `/`, `0.9` para `/planos`, `0.4` para termos e privacidade). Ambos refletidos na raiz do build `dist/` servidos pelo Caddy.
  - **2. Meta Tags Estáticas e Dados Estruturados Schema.org (`index.html`)**:
    * Injeção de metatags estáticas completas em `index.html` para indexadores sem JavaScript (Googlebot, Bingbot) e pré-visualização em redes sociais e apps de mensagens (WhatsApp, Telegram, Facebook, Twitter Card): título editorial, meta description, keywords, canonical link, `og:site_name`, `og:title`, `og:description`, `og:image` e `og:url`.
    * Inclusão de dados estruturados JSON-LD Schema.org no padrão `@graph` cobrindo `SoftwareApplication` (com categoria, preços dos 4 planos em BRL e avaliação agregada de 4.9 estrelas) e `Organization` (com nome, logotipo, redes sociais e canal oficial de suporte).
  - **3. Hook Universal de SEO (`src/hooks/useSEO.js`)**:
    * Expandido para suportar injeção dinâmica de links canônicos (`rel="canonical"`) e scripts de dados estruturados JSON-LD (`type="application/ld+json"`), garantindo atualização reativa em tempo de execução sem acúmulo de tags órfãs no `<head>`.
  - **4. Experiência de Conversão & Demonstração Interativa em 3 Passos (`LandingPage.jsx`)**:
    * Integração de dados estruturados `FAQPage` via `useSEO` mapeando as 6 perguntas e respostas frequentes para exibição de Rich Snippets nas buscas do Google.
    * Redesenho interativo da demonstração no Hero do smartphone com 3 abas temáticas e alternância fluida (com timer de transição a cada 4.5s e pausa ao interagir):
      1. *Agendamento no App*: visualização da cliente escolhendo serviços com dia, horário e confirmação.
      2. *Lembrete WhatsApp*: simulação de mensagem oficial do salão com botão de confirmação de presença em 1 toque ("Confirmar Presença ✓").
      3. *Clube & Retenção*: visualização do cartão com moldura dourada, carteira digital com R$ 25,00 em cashback e cupom promocional.
    * Inclusão do widget flutuante de WhatsApp no canto inferior direito com pulso animado, tooltip de acolhimento e redirecionamento direto com consultor comercial.
  - **5. Testes Automatizados e Homologação**:
    * Suíte Jest dedicada em `backend/tests/landingPageSeoF1.test.js` passando 100% (8/8 testes cobrindo `robots.txt`, `sitemap.xml`, `index.html`, `useSEO.js`, `LandingPage.jsx` e arquivos compilados no `dist`).
    * Suíte de regressão da Fase 45 (E1, E2, F1) com 25/25 testes aprovados.
    * Compilação limpa do Vite (`npm run build`) gerando bundle de produção em 20.07s com inclusão automática dos artefatos de SEO.
    * Homologação visual e funcional completa via Browser Subagent gravada em vídeo WebP (`landing_page_seo_f1_1793205344058.webp`).
- [x] **F2 (P1) — Salão de demonstração público ("Studio Demo")** → [Plano §4·F2](OperaBeauty_Plano_de_Melhorias.md#L550): Implementação, testes automatizados e homologação completa do Salão de Demonstração público ("Studio Demo" / "Studio Thaís") integrado à arquitetura multi-tenant real e com geração nativa de QR Code para teste no smartphone:
  - **1. Banco de Dados e Dados Canônicos (§7 do Plano)**:
    * Tenant real no PostgreSQL com slug `studiothais` (com resolução transparente dos aliases `/demo`, `/studiodemo` e `/studiodatha`).
    * Configuração dos 5 serviços oficiais do protótipo com valores e durações exatas do §7: *Corte* (R$ 45, 60min), *Escova* (R$ 50, 60min), *Hidratação* (R$ 80, 45min), *Manicure* (R$ 40, 60min) e *Design de Sobrancelha* (R$ 35, 30min).
    * Profissionais vinculados (Thaís Rodrigues, Caio Profissional, Juliana Costa), grade de horários de funcionamento (Seg a Sáb 09:00 às 18:00) e clientes/agendamentos demonstrativos.
  - **2. Resolução de Slugs e Flag no Backend (`tenantService.js` & `minisiteService.js`)**:
    * Implementada a função utilitária `resolveDemoSlug` no backend mapeando chamadas públicas de `/api/tenants/by-slug/demo`, `/studiodemo` e `/studiodatha` diretamente para `studiothais` com cache Redis atômico.
    * Injeção da flag de ambiente `is_demo: true` no retorno público do tenant e do mini-site, permitindo ao frontend ativar comportamento e proteções de demonstração.
    * Reconstrução e reload do container Docker `operabeauty-api` (`docker compose up -d --build api`).
  - **3. Barra Superior Fixa de Demonstração (`src/components/DemoBanner.jsx`)**:
    * Componente elegante e sticky no topo (`sticky top-0 z-50`) com design luxuoso Rosé Gold / Dark Glass (`bg-[#1F171C]/95 backdrop-blur-md border-b border-[#D4AF37]/35`).
    * Badge animado `✨ Modo Demonstração`, mensagem acolhedora de navegação e três ações diretas:
      1. *Testar no Celular*: abre modal com QR Code dinâmico gerado localmente via lib `qrcode` para escanear com a câmera.
      2. *Voltar ao Site*: botão de retorno com link direto para a Landing Page (`/`).
      3. *Criar Meu Salão*: CTA em gradiente dourado direcionando para a vitrine de planos (`/planos`).
    * Acoplamento universal dentro de `TenantWrapper` em `src/App.jsx`.
    * Criação do módulo desacoplado `src/lib/demoUtils.js` contendo `isDemoTenantSlug` e `getDemoUrl`.
  - **4. Integração na Landing Page e na Página de Planos (`LandingPage.jsx` & `PaginaPlanos.jsx`)**:
    * Botões de "Ver demonstração" e links de demonstração atualizados para direcionar diretamente para `/demo`.
    * Inclusão do botão `Testar no celular` (`#btn-hero-qrcode`) na seção Hero ao lado do CTA principal.
    * Modal dedicado no Hero (`#hero-qrcode-modal`) com QR Code do app, instruções de leitura pela câmera e link de contingência.
  - **5. Testes Automatizados e Homologação Visual**:
    * Suíte Jest dedicada em `backend/tests/salaoDemoF2.test.js` passando 100% (**13/13 testes** cobrindo resolução de slug, função de identificação de demo, estrutura do `DemoBanner`, acoplamento no `App.jsx`, links da `LandingPage.jsx` e `PaginaPlanos.jsx`).
    * Regressão da Fase 45 (F1 + F2): **21/21 testes aprovados**.
    * Compilação de produção do Vite (`npm run build`) concluída com sucesso em 3.72s.
    * Homologação visual e funcional ponta a ponta via Browser Subagent gravada em vídeo WebP (`salao_demo_f2_test_1793208977584.webp`), validando a abertura do modal de QR Code no Hero, fechamento, navegação para `/demo`, presença da barra superior, abertura do QR Code na barra e retorno com sucesso para a Landing Page (`/`).
- [x] **F3 (P2) — Páginas públicas dos salões com SEO dinâmico** → [Plano §4·F3](OperaBeauty_Plano_de_Melhorias.md#L551): Implementação, testes automatizados e homologação completa da pré-renderização dinâmica (OpenGraph SSR) e injeção contextual de metadados para compartilhamento em redes sociais e indexação de salões:
  - **1. Serviço de Pré-renderização no Backend (`backend/services/seoRendererService.js`)**:
    * Criação da função exportada `renderTenantSeoHtml` que gera documento HTML completo com meta tags dinâmicas por salão (`title`, `description`, `og:site_name`, `og:title`, `og:description`, `og:image`, `og:url`, `twitter:card`, `twitter:image` e `theme-color`).
    * Injeção dinâmica de dados estruturados Schema.org `BeautySalon` em JSON-LD com nome, descrição, foto de capa, telefone/WhatsApp, endereço, horários de funcionamento e avaliação agregada de estrelas.
    * Bloco `<noscript>` estruturado com resumo institucional e lista de serviços em destaque para indexadores e robôs sem interpretação de JavaScript.
  - **2. Rotas do Backend Express (`backend/routes/seo.js` & `backend/app.js`)**:
    * Endpoints dedicados `GET /api/seo/render/:slug/:subpath?` e `GET /api/seo/tenant/:slug/:subpath?` servindo HTML com cabeçalhos `Content-Type: text/html; charset=utf-8` e `Cache-Control: public, max-age=600, s-maxage=1800`.
    * Tratamento gracioso de status 404 para salões inexistentes ou suspensos.
    * Reconstrução da imagem do container Docker `operabeauty-api` (`docker compose up -d --build api`).
  - **3. Roteamento Inteligente de Bots no Caddyfile (`Caddyfile`)**:
    * Criação do matcher declarativo `@social_crawlers` cobrindo os User-Agents dos robôs de redes sociais e buscadores (*WhatsApp, FacebookExternalHit, Twitterbot, TelegramBot, LinkedInBot, Slackbot, Applebot, Discordbot, Bingbot, Googlebot*).
    * Reescrita e proxy reverso automático para `/api/seo/render{path}` na API, garantindo que links compartilhados em chats exibam imediatamente o título, logo e resumo real do salão parceiro em vez de metadados globais.
    * Navegadores humanos continuam recebendo o SPA ultra rápido via cache imutável e `try_files {path} /index.html`.
  - **4. Enriquecimento de SEO Client-side (`MiniSiteSalao.jsx` & `HomeCliente.jsx`)**:
    * `MiniSiteSalao.jsx`: Atualização do hook `useSEO` com injeção reativa do Schema.org `BeautySalon` (com endereço, telefone e avaliações) e link canônico dinâmico.
    * `HomeCliente.jsx`: Acoplamento de `useSEO` com o nome do salão, mensagem de boas-vindas e logo oficial.
  - **5. Testes Automatizados e Homologação Visual**:
    * Suíte Jest dedicada em `backend/tests/paginasPublicasSeoF3.test.js` passando 100% (**9/9 testes**).
    * Regressão acumulada da Fase 45 (F1 + F2 + F3): **30/30 testes aprovados**.
    * Compilação limpa do Vite (`npm run build`) concluída em 3.80s.
    * Testes HTTP reais via `curl` comprovando que o Caddy serve o HTML do salão para o User-Agent do WhatsApp e o SPA para navegadores comuns.
    * Homologação visual via Browser Subagent gravada em vídeo WebP (`seo_paginas_f3_test_1793210523427.webp`).
- [x] **F4 (P2) — Programa de indicação e revenda & Governança Super Admin** → [Plano §4·F4](OperaBeauty_Plano_de_Melhorias.md#L552): Implementação, governança financeira, testes automatizados e homologação completa do Programa de Parceiros e Revenda SaaS do OperaBeauty (1 mês grátis mútuo + 20% de comissão recorrente permanente sobre as mensalidades dos salões indicados):
  - **1. Modelagem Relacional e Governança no PostgreSQL (`phase35_saas_reseller_program.sql` & `phase36_reseller_governance_superadmin.sql`)**:
    * Criação de 4 novas tabelas com constraints, chaves estrangeiras, índices e RLS:
      1. `public.cap_saas_resellers`: cadastro do parceiro com `referral_code` único, `commission_rate` (default 20.00%), dados de repasse PIX (`pix_key`, `pix_key_type`), `status` ('active', 'suspended', 'pending') e `tenant_id` opcional.
      2. `public.cap_saas_referrals`: vínculo determinístico e único entre o parceiro e o salão indicado (`tenant_id`), com rastreamento dos bônus mútuos (`referrer_free_month_applied`, `referee_free_month_applied`).
      3. `public.cap_saas_commissions`: extrato de comissões calculadas por fatura paga (`invoice_id`, `invoice_amount`, `commission_rate`, `commission_amount`, `reference_month`, status 'available', 'paid', 'cancelled').
      4. `public.cap_saas_payouts`: histórico de solicitações de saque PIX com validação de valor mínimo (R$ 50,00) e comprovante de transferência.
    * **Governança & Proteção de Caixa Inicial (`cap_platform_settings`)**:
      - Adicionadas as colunas `reseller_program_enabled BOOLEAN NOT NULL DEFAULT FALSE` e `reseller_default_commission_rate NUMERIC(5,2) NOT NULL DEFAULT 20.00`.
      - O programa nasce **DESATIVADO** por padrão para evitar que o SaaS recém-nascido tenha custos promocionais de 1 mês grátis mútuo sem retorno comprovado.
  - **2. Serviços de Negócio e Rotas de Backend (`resellerService.js`, `superadminService.js`, `routes/reseller.js`, `routes/superadmin.js`)**:
    * `GET /api/resellers/status`: status público da flag de ativação e comissão padrão.
    * `POST /api/resellers/register`: bloqueado com HTTP 403 Forbidden para cadastros públicos enquanto desativado; liberado para cadastro manual pelo Super Admin (`is_superadmin: true`).
    * Rotas de Governança no Super Admin:
      - `GET /api/superadmin/resellers/settings` e `PUT /api/superadmin/resellers/settings`: leitura e alteração do toggle global e comissão padrão.
      - `GET /api/superadmin/resellers/list`: listagem auditável de parceiros com chaves PIX completas, WhatsApp, métricas de indicação e comissões.
      - `POST /api/superadmin/resellers/create`: convite/cadastro manual de parceiros VIP pelo Super Admin.
      - `PATCH /api/superadmin/resellers/:id/status` e `PATCH /api/superadmin/resellers/:id/commission`: moderação de parceiro e taxa personalizada.
      - `GET /api/superadmin/resellers/payouts` e `POST /api/superadmin/resellers/payouts/:id/process`: aprovação de saques PIX (com anexo de comprovante) ou recusa com estorno atômico de saldo.
  - **3. Frontend: Módulo no Super Admin & Painel do Revendedor (`ParceirosAdmin.jsx`, `PainelRevendedor.jsx`)**:
    * **Painel Super Admin (`src/pages/superadmin/ParceirosAdmin.jsx`)**:
      - Rota `/superadmin/parceiros` com atalho no menu 'Negócio' do `SuperAdminLayout.jsx`.
      - Card de sustentabilidade financeira com toggle de ativação global, status explicativo (`DESATIVADO (Recomendado na Fase Inicial)`), taxa padrão ajustável e botão de salvar.
      - Grade de 4 KPIs: Parceiros Ativos, Salões Conquistados, Comissões Geradas e Saques Pendentes PIX.
      - Abas de Gestão:
        1. *Solicitações de Saque PIX*: filtro de status, dados bancários do parceiro, chave PIX com botão de cópia em 1 clique, modais de confirmação de pagamento (com URL do comprovante) e de recusa (com motivo).
        2. *Parceiros & Chaves PIX*: tabela completa com nome, e-mail, telefone/WhatsApp, código de indicação, chave PIX visível e auditável com cópia instantânea, salões indicados, comissões acumuladas e alternador de status (Ativo/Suspenso).
      - Modal de *Convidar Parceiro Manualmente*: permite ao Super Admin criar parceiros VIP seletivos mesmo com o programa público fechado.
    * **Painel do Revendedor (`PainelRevendedor.jsx`)**:
      - Exibe banner de "Programa em Fase de Convite Exclusivo" quando desativado e bloqueia novos formulários públicos.
    * **Landing Page (`LandingPage.jsx`) & Planos (`PaginaPlanos.jsx`)**:
      - Consultam o endpoint `/api/resellers/status` e só exibem a faixa promocional de indicação e o link no rodapé/menu quando o Super Admin ativar o programa.
  - **4. Testes Automatizados e Homologação Visual**:
    * Suíte Jest dedicada em `backend/tests/programaRevendaF4.test.js` passando 100% (**19/19 testes aprovados**, incluindo testes de governança, bloqueio 403, liberação para superadmin e regras financeiras).
    * Compilação Vite (`npm run build`) concluída com êxito em 2.35s.
    * Homologação visual via Browser Subagent gravada em vídeo WebP (`superadmin_parceiros_gov_1793215516756.webp`), com prints comprovando o painel do Super Admin (`superadmin_parceiros_page_1793215676650.png`) e a Landing Page limpa sem banners promocionais (`landing_page_ref_1793215713328.png`).
- [x] **F5 (P1) — Formalização e termos** → [Plano §4·F5](OperaBeauty_Plano_de_Melhorias.md#L553): Estruturação jurídica e documental completa da plataforma, estabelecendo formalmente os Termos de Uso do SaaS, a Política de Privacidade e Governança LGPD, o Contrato de Operadora de Dados (DPA) e o Canal Interativo do Encarregado pelo Tratamento de Dados (DPO):
  - **1. Arquitetura e Modelagem Relacional de Privacidade (`phase37_privacy_dpo_governance.sql`)**:
    * Criação da tabela `public.cap_privacy_requests` para protocolo e auditoria de solicitações de titulares de dados:
      - `protocol` único alfanumérico gerado criptograficamente no formato `LGPD-AAAAMMDD-XXXX`.
      - Identificação do requerente (`requester_name`, `requester_email`, `requester_document`, `requester_type`).
      - Tipificação do direito exercido (`access`, `correction`, `anonymization`, `deletion`, `portability`, `consent_revocation`, `information`).
      - Ciclo de vida auditável (`received`, `under_review`, `completed`, `rejected`), parecer do DPO e timestamps.
    * Concessões de privilégio estrito para o papel `opera_app` (Princípio do Menor Privilégio - C5) e índices de busca rápida por protocolo e e-mail.
  - **2. Serviços de Negócio e Rotas de Backend (`privacyService.js` & `routes/privacy.js`)**:
    * `createPrivacyRequest`: validação estrita com Zod, geração de protocolo e armazenamento no banco com rate limit.
    * `getPrivacyRequestStatus`: consulta pública e transparente do status e parecer do DPO pelo titular via protocolo.
    * `listPrivacyRequests` e `updatePrivacyRequestStatus`: gestão e moderação de chamados do DPO no Super Admin.
    * `GET /api/privacy/dpo-info`: endpoint público com dados institucionais do DPO (`privacidade@operabeauty.com.br`) e prazo legal de resposta (15 dias úteis).
    * Rotas registradas no pipeline principal do `backend/app.js` (`/api/privacy`). Container Docker `operabeauty-api` reconstruído.
  - **3. Frontend: Documentos Oficiais no Design System Rosé Editorial**:
    * **Termos de Uso (`src/pages/TermsOfService.jsx` nas rotas `/termos` e `/termos-de-uso`)**:
      - Card de Destaque fundamental: *"O Salão é o Controlador dos seus dados; a OperaBeauty é a Operadora da tecnologia"*, assegurando a propriedade irrestrita dos dados aos estabelecimentos.
      - Índice lateral sticky para navegação direta entre as 8 cláusulas.
      - Cláusulas completas: Objeto, Matriz dos 4 Planos Oficiais (Solo, Essencial, Premium, Signature), Política de Suspensão Segura (carência de 5 dias úteis por atraso + custódia garantida de 60 dias de backup antes de qualquer expurgo), Nível de Serviço (SLA 99,5%), Propriedade Intelectual, Portabilidade sem amarras (JSON/CSV) e Foro.
    * **Política de Privacidade (`src/pages/PrivacyPolicy.jsx` nas rotas `/privacidade` e `/politica-de-privacidade`)**:
      - Tríade de cartões com os papéis da LGPD (Salão Controlador, OperaBeauty Operadora, Titular de Dados).
      - Bases legais explícitas (Art. 7º e 11 da LGPD) e detalhamento das salvaguardas técnicas (Row Level Security no PostgreSQL, criptografia em trânsito TLS 1.3, proteção privada de fotos de prontuário com cabeçalhos `no-store` - C8, senhas em bcrypt).
      - Catálogo dos direitos do titular (Art. 18 da LGPD) e atalho de ação primária para o canal DPO.
    * **Portal de Privacidade e Direitos do Titular (`src/pages/CanalPrivacidadeDPO.jsx` nas rotas `/dpo` e `/privacidade/canal`)**:
      - Aba 1 ("Exercer Direitos LGPD"): formulário estruturado para solicitação de acesso, correção, anonimização, exclusão, portabilidade ou revogação de consentimento, gerando protocolo instantâneo com botão de cópia.
      - Aba 2 ("Consultar Protocolo"): consulta do andamento do chamado pelo titular com badge de status estilizado e notas de resolução do DPO.
    * **Contrato de Operadora de Dados / DPA (`src/pages/ContratoOperadoraDPA.jsx` nas rotas `/dpa` e `/contrato-operadora`)**:
      - Minuta formal do Data Processing Agreement nos termos do Art. 39 da LGPD, estabelecendo obrigações de confidencialidade, auxílio em auditorias da ANPD e notificação obrigatória de incidentes em até 48 horas úteis.
    * **Integração de Links no Rodapé**: Landing Page (`LandingPage.jsx`) e Página de Planos (`PaginaPlanos.jsx`) atualizadas com links visíveis para o Canal DPO.
  - **4. Testes Automatizados e Homologação Visual**:
    * Suíte Jest dedicada em `backend/tests/formalizacaoTermosF5.test.js` passando 100% (**15/15 testes aprovados**).
    * Suíte acumulada da Fase 45 (F1 + F2 + F3 + F4 + F5) passando 100% (**64/64 testes aprovados**).
    * Compilação Vite de produção (`npm run build`) concluída com êxito em 2.59s.
    * Homologação visual via Browser Subagent gravada em vídeo WebP (`formalizacao_termos_f5_1793218069046.webp`), com prints comprovando os Termos de Uso (`terms_page_v2_1793218086925.png`), a Política de Privacidade (`privacy_page_1793218107542.png`) e a consulta do protocolo `LGPD-20261028-51CE` no Portal DPO com retorno de status "Recebido / Aguardando Triagem" (`protocol_query_submitted_1793218597540.png`).

---

## Fase 46: CORREÇÕES ESTRUTURAIS — Qualidade, Operação e Débito Técnico
> Referências: [§4 Grupo G](OperaBeauty_Plano_de_Melhorias.md#L555-L564). Seguir as skills `06-code-quality-gate`, `08-devops-platform-engineer`, `09-qa-automation-engineer`, `10-ai-refactor-specialist` e `code-maturity-assessor`.

- [x] **G1 (P2) — Remoção Definitiva do Adaptador Supabase & Higiene de Arquitetura** → [Plano §4·G1](OperaBeauty_Plano_de_Melhorias.md#L557-L558):
  - **1. Purgas e Limpeza no Código-Fonte**:
    * Inexistência física do arquivo legado `src/lib/supabase.js`.
    * Remoção de comentários históricos e estados mortos remanescentes em `src/App.jsx`.
    * Remoção e validação de ausência de dependências `@supabase/supabase-js` em `package.json` raiz e `backend/package.json`.
  - **2. Varredura Estática de Conformidade**:
    * 0 imports e 0 referências de código a SDK ou tabelas remotas de Supabase em 100% dos componentes e páginas de `src/` e serviços de `backend/`.
    * Validação de que 100% dos fluxos de dados consom a API REST nativa do OperaBeauty (`src/lib/api.js`) com injeção automática de tokens JWT e cabeçalhos de segurança (`Authorization: Bearer`, `x-device-id`).
    * Validação de que `.env.example` não requer chaves legadas e opera exclusivamente com infraestrutura dedicada (PostgreSQL, Redis, Caddy).
  - **3. Testes Automatizados**:
    * Suíte Jest dedicada em `backend/tests/remocaoSupabaseG1.test.js` passando 100% (9/9 testes aprovados).
- [x] **G2 (P1) — Deploy automatizado** → [Plano §4·G2](OperaBeauty_Plano_de_Melhorias.md#L559):
  - **1. Pipeline de CI/CD e Quality Gate (`.github/workflows/deploy.yml`)**:
    * Trigger automático em commits nas branches `main`, `staging`, `develop` e suporte a disparo manual `workflow_dispatch`.
    * Gate de Qualidade compulsório (`quality-gate`): compilação de produção do frontend (`npm run build`), auditoria de segurança e suíte de testes automatizados Jest no backend (`npm test`).
    * Build multi-stage e publicação de imagens imutáveis no GitHub Container Registry (GHCR):
      - `ghcr.io/${{ github.repository }}/api:sha-xxxxxxx` (+ tag de ambiente `latest` / `staging`)
      - `ghcr.io/${{ github.repository }}/caddy:sha-xxxxxxx` (+ tag de ambiente `latest` / `staging`)
      - `ghcr.io/${{ github.repository }}/wa-gateway:sha-xxxxxxx` (+ tag de ambiente `latest` / `staging`)
    * Deploy remoto na VPS via SSH (`appleboy/ssh-action`): gravação de `.last_deployed_tag`, atualização atômica de `IMAGE_TAG` no `.env`, autenticação GHCR e execução de `docker compose pull && docker compose up -d --remove-orphans`.
    * **Smoke Test & Auto-Rollback**: verificação pós-deploy testando `http://localhost:5001/health` e `http://localhost:8080/`. Se o healthcheck falhar dentro do tempo limite, aciona automaticamente o script `./scripts/rollback.sh` restaurando a versão anterior e emitindo alerta.
  - **2. Mecanismo de Rollback em 1 Comando na VPS (`scripts/rollback.sh`)**:
    * Script bash estrito (`set -euo pipefail`) permitindo rollback imediato via linha de comando (`./scripts/rollback.sh [TAG]`) ou restauração automática a partir de `.last_deployed_tag`.
    * Atualização declarativa de `IMAGE_TAG` no `.env`, download das imagens, reinicialização dos containers, loop de healthchecks e notificação por webhook (Discord/Telegram).
  - **3. Workflow de Rollback em 1 Clique (`.github/workflows/rollback.yml`)**:
    * Disparo manual pelo painel do GitHub Actions permitindo ao operador reverter o ambiente de Produção ou Staging para a versão estável anterior em 1 clique.
  - **4. Ambiente Isolado de Homologação / Staging (`docker-compose.staging.yml`)**:
    * Configuração completa de staging com portas não conflitantes (Frontend HTTP 8081, HTTPS 8444, API 5002), banco de dados `operabeauty_staging` em volume isolado `operabeauty-staging-pgdata` e `NODE_ENV=staging`.
  - **5. Parametrização no `docker-compose.yml` Principal & Guia Operacional**:
    * `docker-compose.yml` parametrizado com variáveis `API_IMAGE`, `CADDY_IMAGE`, `WA_GATEWAY_IMAGE` e `IMAGE_TAG` mantendo compatibilidade de build local e pull de imagens imutáveis do GHCR.
    * Guia operacional completo de deploy, secrets e operação de rollback em `docs/deploy.md`.
  - **6. Testes Automatizados**:
    * Suíte Jest dedicada em `backend/tests/deployAutomatizadoG2.test.js` passando 100% (**20/20 testes aprovados**). Compilação do Vite validada em `./dist`.
- [x] **G3 (P1) — Monitoramento** → [Plano §4·G3](OperaBeauty_Plano_de_Melhorias.md#L560):
  - **1. Endpoints de Telemetria e Observabilidade (`backend/app.js`)**:
    * Sonda Liveness (`GET /health`): valida processo HTTP ativo (200 OK).
    * Sonda Readiness (`GET /health/complete`): valida conectividade com PostgreSQL com medição de latência em milissegundos.
    * Sonda de Telemetria Completa (`GET /health/system`): relatório dinâmico para monitores externos (UptimeRobot, BetterUptime) expondo status geral (`HEALTHY`/`DEGRADED`), timestamp ISO, uptime em segundos, versão do Node, ambiente (`NODE_ENV`), uso de memória RAM (`heap_used_mb`, `heap_total_mb`, `rss_mb`) e status com latência do PostgreSQL e Redis sob proteção de timeout fail-fast (1500ms).
  - **2. Limites Declarativos de Recursos (CPU e Memória)**:
    * Configuração estrita de `deploy.resources.limits` e `reservations` em `docker-compose.yml` e `docker-compose.staging.yml`:
      - `db`: limit 1.50 CPU, 1024M RAM (reserva 256M)
      - `redis`: limit 0.50 CPU, 256M RAM (reserva 64M) + healthcheck `redis-cli ping`
      - `api`: limit 1.00 CPU, 768M RAM (reserva 128M)
      - `wa-gateway`: limit 1.00 CPU, 512M RAM (reserva 128M)
      - `caddy`: limit 0.50 CPU, 256M RAM (reserva 64M) + healthcheck HTTP
  - **3. Segurança de Contêineres Sem Root (Non-Root)**:
    * Execução compulsória sob usuário desprivilegiado `nodeuser:1001` em `backend/Dockerfile` e `gateway-whatsapp/Dockerfile`, prevenindo escalada de privilégios no host da VPS.
  - **4. Script de Auditoria da VPS e Alertas (`scripts/system_monitor.sh`)**:
    * Script bash estrito (`set -euo pipefail`) monitorando ocupação de disco (aviso >85%, crítico >92%), memória RAM disponível (<10%), integridade dos 5 contêineres Docker (`unhealthy`/`exited`) e atraso no backup diário (>26h), com envio automático de alertas via webhook (Discord/Telegram).
  - **5. Documentação Operacional (`docs/monitoramento.md`)**:
    * Guia completo cobrindo telemetria, configuração de UptimeRobot, crontab a cada 15 min na VPS e captura de exceções 500 com suporte a Sentry.
  - **6. Testes Automatizados**:
    * Suíte Jest dedicada em `backend/tests/monitoramentoG3.test.js` passando 100% (**12/12 testes aprovados**).
- [x] **G4 (P1) — Ferramenta de migrações com rollback** → [Plano §4·G4](OperaBeauty_Plano_de_Melhorias.md#L561):
  - **1. Motor Transacional de Migrações (`scripts/migrate.js`)**:
    * Implementado motor nativo transacional em Node.js com suporte completo a comandos `up`, `down` (rollback do último lote), `status`, `create <nome>` e `baseline`.
    * Cada migração executa dentro de uma transação atômica (`BEGIN ... COMMIT`), acionando `ROLLBACK` instantâneo em caso de falha para prevenir estados inconsistentes no schema.
    * Tabela de controle `public.cap_schema_migrations` com colunas `id`, `name`, `batch`, `checksum` (SHA-256) e `executed_at`.
    * Parser inteligente que identifica delimitadores `-- >>> UP >>>` e `-- >>> DOWN >>>` para execução simétrica de reversões.
    * Comando `baseline` que registra os 42 arquivos SQL existentes como aplicados no `Batch #1` com seus respectivos hashes SHA-256, sem reexecutar DDLs contra o banco já populado.
  - **2. Integração com Docker e npm Scripts**:
    * Adicionados scripts nos arquivos `package.json` (raiz e backend): `migrate:up`, `migrate:down`, `migrate:status`, `migrate:create`, `migrate:baseline`.
    * Montagem dos diretórios `./migrations` e `./scripts` como volumes de leitura no serviço `api` em `docker-compose.yml`, permitindo execução direta dentro do container (`docker compose exec api node scripts/migrate.js ...`).
  - **3. Documentação Operacional (`docs/migracoes.md`)**:
    * Manual técnico detalhando estrutura dos arquivos, comandos CLI, boas práticas de idempotência e operações em produção.
  - **4. Testes Automatizados**:
    * Suíte Jest dedicada em `backend/tests/ferramentaMigracoesG4.test.js` passando 100% (**10/10 testes aprovados**), cobrindo parser UP/DOWN, cálculo de checksum SHA-256, geração de arquivos, transações BEGIN/COMMIT, rollback sob erro e baseline.
- [x] **G5 (P1) — Testes dos fluxos de dinheiro** → [Plano §4·G5](OperaBeauty_Plano_de_Melhorias.md#L562):
  - **1. Suíte Consolidada de Testes de Integridade Monetária (`backend/tests/fluxosDinheiroG5.test.js`)**:
    * **Checkout de Comanda & Split Payment**: validação de cálculo de subtotal, descontos, gorjetas e rateio multi-meios (PIX, dinheiro, cartão, vale e carteira), bloqueio de pagamentos parciais e regra de troco restrito a dinheiro em espécie.
    * **Cupons de Desconto**: cálculo de desconto percentual e fixo sem permitir total negativo, validação de validade (`expires_at`), limites de uso (`max_uses`) e incremento atômico.
    * **Vales-Presente (Gift Cards)**: resgate parcial com manutenção de saldo ativo, resgate total (status `redeemed`), bloqueio de resgate com saldo insuficiente e garantia de idempotência via chave única (`idempotency_key`).
    * **Carteira Digital & Cashback**: acúmulo proporcional de cashback pós-atendimento, resgate em checkout, bloqueio de saldo negativo e validação da constraint PostgreSQL `chk_wallet_balance_non_negative`.
    * **Rateio de Comissões e Gorjetas**: rateio individual por profissional baseado em taxas configuradas e repasse integral de 100% da gorjeta ao profissional recebedor.
    * **Faturas SaaS & Assinaturas**: liquidação via webhook PIX, ativação de status do salão e aplicação de precificação com desconto anual (2 meses grátis).
    * **Sinal / Depósito PIX & Concorrência de Horários**: transição para `pending_deposit` e bloqueio de agendamento duplo sobreposto para o mesmo profissional.
    * **Fluxo de Caixa Diário (Cash Register)**: apuração do saldo em gaveta, bloqueio estrito de sangria descalçada e conciliação de fechamento apurando quebras e sobras de caixa.
  - **2. Resultados da Validação**:
    * 100% dos testes aprovados (**21/21 testes passando no Jest**).
- [x] **G6 (P2) — Higiene do repositório e documentação** → [Plano §4·G6](OperaBeauty_Plano_de_Melhorias.md#L563):
  - **1. Limpeza de Arquivos Mortos e Legados**:
    * Remoção definitiva do arquivo de infraestrutura legada `vercel.json` (substituído por Docker Compose e Caddy).
    * Remoção e unificação do script DDL obsoleto `init_database.sql`, consolidando `init.sql` como o único baseline canônico do banco PostgreSQL.
    * Realocação de scripts manuais soltos da raiz (`test_timeline.js`, `test_update_appt.js`, `test_zod.js`) para `backend/tests/scratch/`.
    * Garantia no `.gitignore` contra pacotes binários compactados (`.zip`, `.tar.gz`) e diretórios de build (`dist/`).
  - **2. Modularização da Documentação Técnica**:
    * Criação do documento canônico [docs/arquitetura.md](file:///d:/Repositorios/OperaBeauty/docs/arquitetura.md) cobrindo multi-tenancy, isolamento RLS, camadas de software e livros-razão.
    * Manutenção consolidada de [docs/deploy.md](file:///d:/Repositorios/OperaBeauty/docs/deploy.md) (G2), [docs/monitoramento.md](file:///d:/Repositorios/OperaBeauty/docs/monitoramento.md) (G3), [docs/migracoes.md](file:///d:/Repositorios/OperaBeauty/docs/migracoes.md) (G4) e [docs/changelog.md](file:///d:/Repositorios/OperaBeauty/docs/changelog.md).
    * Remoção e atualização de referências legadas a "Supabase" e "RPCs" em `documentacao.md`, refletindo fielmente a arquitetura REST dedicada sobre PostgreSQL e Express.
  - **3. Reescritta Completa do README.md**:
    * Novo [README.md](file:///d:/Repositorios/OperaBeauty/README.md) executivo e profissional cobrindo diagrama de arquitetura Mermaid, stack técnica, inicialização local e Docker, testes automatizados e gestão de migrações.
  - **4. Testes Automatizados**:
    * Suíte Jest dedicada em `backend/tests/higieneRepositorioG6.test.js` passando 100% (**7/7 testes aprovados**).
- [x] **G7 (P2) — TypeScript gradual** → [Plano §4·G7](OperaBeauty_Plano_de_Melhorias.md#L564):
  - **1. Contratos de Resposta e Tipos Centrais (`src/types/apiContracts.d.ts`)**:
    * Criação de declarações estritas em TypeScript para os modelos de domínio: `User`, `Tenant`, `Service`, `Staff`, `Appointment`, `Order`, `OrderItem`, `OrderPayment`, `Coupon`, `GiftCard`, `CashRegister`, `ClientWallet`, `Invoice` e `AuthResponse`.
  - **2. Tipagem Estática do Cliente HTTP (`src/lib/api.d.ts` e `src/lib/api.js`)**:
    * Declaração de interfaces completas do `ApiClient` tipando métodos em todos os submódulos: `auth`, `tenants`, `clients`, `services`, `staff`, `appointments`, `orders`, `cashRegister`, `coupons`, `giftcards`, `wallets`, `invoices`, `superadmin`, `privacy` e `addons`.
    * Inclusão de anotações JSDoc `@typedef` no topo de `src/lib/api.js` proporcionando autocompletion inteligente e validação estática no IDE/VSCode sem overhead em runtime.
  - **3. Contratos de Tipagem de Backend (`backend/types/contracts.d.ts`)**:
    * Definição de tipos TypeScript para relatórios de observabilidade/telemetria (`SystemHealthReport`) e logs de auditoria (`BaseAuditLog`).
  - **4. Testes e Validação de Build**:
    * Suíte Jest dedicada em `backend/tests/typescriptGradualG7.test.js` passando 100% (**4/4 testes aprovados**).
    * Compilação de produção Vite (`npm run build`) validada com sucesso em 15.13s gerando bundle minificado e Service Worker PWA em `./dist`.
- [x] **G8 (P1) — Reajuste da tela de Vale-Presente (Minified React Error #31)**: Identificado e corrigido o erro de renderização em tempo de execução (`index-Cr92Y1f_.js:8 Uncaught Error: Minified React error #31; object with keys {$$typeof, render, displayName}`). **1. Blindagem Defensiva em `EstadoVazio.jsx`**: Implementado helper de renderização que verifica se o ícone é elemento JSX (`React.isValidElement`), componente funcional ou forwardRef com `$$typeof` (instanciando via `<IconComponent className="..." />`), além de compatibilizar props `textoBotao`/`textoAcao`, `aoClicar`/`aoClicarAcao` e slot personalizado `acao`. **2. Correção em `GestaoGiftCards.jsx`**: Corrigida a instanciação do ícone para `<Gift className="w-8 h-8 text-brand" />` e alinhadas as propriedades `textoAcao` e `aoClicarAcao`, além de proteção com `setGiftCards([])` no bloco catch de `fetchData`. **3. Recompilação**: Build de produção Vite gerado com sucesso em 16.9s e refletido no volume Docker do Caddy.
- [x] **G9 (P1) — Catálogo Oficial de 4 Planos SaaS e Módulo de Parceiros / Afiliados**:
  - **1. Catálogo Oficial dos 4 Planos (Sem Solo)**:
    * Plano Solo permanentemente desativado.
    * Catálogo oficial composto exclusivamente por:
      - **Básico**: R$ 69,90/mês, até 1 profissional (`basico`, `sort_order: 1`).
      - **Essencial**: R$ 79,90/mês, até 3 profissionais (`essencial`, `sort_order: 2`).
      - **Premium**: R$ 129,90/mês, ilimitado, badge 'Mais Escolhido' (`premium`, `sort_order: 3`).
      - **Signature**: R$ 199,90/mês, ilimitado, bot WhatsApp, badge 'Alta Performance' (`signature`, `sort_order: 4`).
    * Alinhamento em `init.sql`, `database.md`, Landing Page (`LandingPage.jsx`) e build do frontend (`dist/`).
  - **2. Módulo de Parceiros / Afiliados no Super Admin (`/superadmin/parceiros`)**:
    * Resolução de erro 404 em `GET /api/superadmin/resellers/list` através de suporte a rotas duplas `['/resellers', '/resellers/list']` em `backend/routes/superadmin.js`.
    * Resolução de erro 500 em `payouts` e `settings` com incorporação no baseline `init.sql` e `database.md` das tabelas `cap_saas_resellers`, `cap_saas_referrals`, `cap_saas_commissions` e `cap_saas_payouts`, com colunas `reseller_program_enabled` e `reseller_default_commission_rate` em `cap_platform_settings`.
  - **3. Integridade do Cliente de API do Super Admin e Configurações Globais**:
    * Remoção da declaração duplicada da chave `superadmin` em `src/lib/api.js` que sobrescrevia 39 métodos e causava `TypeError: K.superadmin.* is not a function`.
    * Inclusão das colunas de gateway, chave PIX, ambiente e carência em `cap_platform_settings` no `init.sql` e `database.md`, sanando erro 500 em `GET /api/superadmin/settings`.
    * Geração de build de produção limpo em `./dist` (`index-BGdup7ij.js`).
  - **4. Rebrand do Modal de Criação de Salão (`CreateTenantModal.jsx`)**:
    * Interface refinada seguindo o Design System Rosé Editorial / Stitch com cantos amplos, cabeçalho editorial e layout responsivo.
    * Grade com os 6 temas White-Label da coleção (`Rosé`, `Nude`, `Lavanda`, `Sálvia`, `Noir`, `Bordô`) com amostras visuais de cores em círculos e mini-botão.
    * Suporte a Tom Exclusivo (HEX) com validação de contraste WCAG 2.1 em tempo real.
    * Mini preview dinâmico ao vivo da vitrine do salão.
    * Cards visuais dos 4 planos oficiais (sem plano Solo).
    * Gerador de senha forte aleatória para o gestor com botão de alternar visibilidade.
    * Persistência de `theme_id`, `brand_hex`, `primary_color`, `secondary_color` e `tertiary_color` na criação do salão no backend e banco.
- [x] **G10 (P1) — Blindagem Multi-Tenant, Resolução de 500 no carregamento do salão e erradicação de fallbacks de "Studio Thais"**:
  - **1. Causa Raiz Diagnosticada e Resolvida**:
    * A rota `GET /api/tenants/by-slug/:slug` quebrava com erro 500 (`ERROR: column t.theme_id / t.is_founder does not exist`) porque a tabela `public.cap_tenants` recriada por `init.sql` não continha as colunas de temas white-label, fundadores, cancelamento, onboarding e addons.
    * Com a falha 500 da API, o `TenantContext` permanecia com `tenant = null`, fazendo com que `HomeCliente`, `AcessoProfissional` e demais telas caíssem em fallbacks legados estáticos `{tenant?.name || 'Studio Thais'}` com monograma 'T', simulando o salão errado para os usuários.
  - **2. Extensão e Idempotência no Banco de Dados (`init.sql` e `database.md`)**:
    * Definição completa e bloco de `ALTER TABLE public.cap_tenants ADD COLUMN IF NOT EXISTS ...` incorporados no baseline para todas as 16 colunas: `theme_id`, `brand_hex`, `min_cancellation_hours`, `no_show_penalty_action`, `no_show_tolerance_count`, `is_founder`, `frozen_price`, `price_frozen_until`, `founder_badge_label`, `onboarding_dismissed`, `qr_code_generated_at`, `custom_domain`, `custom_domain_verified`, `extra_whatsapp_messages`, `nfse_enabled`, `google_review_url`, `headline`, `about_text`, etc.
    * Extensões idempotentes adicionadas também para `cap_clients` (`no_show_count`, `is_blocked`, `blocked_reason`) e `cap_appointments` (`no_show_marked_at`, `no_show_marked_by`, `cancellation_reason`).
  - **3. Blindagem de Roteamento com `TenantGate` (`src/App.jsx`)**:
    * Implementado gate de validação para todas as rotas filhas de `/:tenant_slug`:
      - Durante o carregamento (`loading`): exibe tela suave de loading Rosé com spinner e mensagem amigável.
      - Se o salão não for encontrado (`!tenant`): exibe página de 404 limpa ("Salão não encontrado: /{tenant_slug}"), impedindo completamente a renderização com dados nulos ou incorretos.
      - Se o salão for encontrado: carrega as variáveis de tema e renderiza os dados do salão.
  - **4. Erradicação de Fallbacks Legados no Frontend**:
    * `HomeCliente.jsx`, `AcessoProfissional.jsx`, `AcessoTelefone.jsx`, `AcessoSenha.jsx`, `CadastroCliente.jsx` e `HistoricoAgendamentos.jsx` atualizados com monogramas e nomes dinâmicos baseados no salão atual (`Atelie Toda Bonita` -> monograma "A"), removendo qualquer menção estática a 'Studio Thais'.
  - **5. Validação E2E com Navegador**:
    * Testado e comprovado via `browser_subagent` que `http://localhost:5173/atelietodabonita/home` exibe "Atelie Toda Bonita" (monograma "A", Clube Atelie) e `http://localhost:5173/atelietodabonita/staff/login` exibe o portal da equipe com "Atelie Toda Bonita" e monograma "A".
- [x] **G11 (P1) — Resolução de Erros 500 em Produção (VPS) e Paridade Estrutural de Schema**:
  - **1. Causa Raiz Diagnosticada e Resolvida**:
    * Análise dos logs em `erro.md` e logs da API Docker revelou falhas de `column does not exist` e `relation does not exist` em todas as telas principais da aplicação:
      - `GET /api/services`: falha por ausência de `short_description` em `cap_services`.
      - `GET /api/invoices/status`: falha por ausência de `pix_copy_paste`, `warnings_sent`, etc. em `cap_invoices`.
      - `GET /api/referral/admin/dashboard`: falha por ausência da tabela `cap_referrals` e colunas `referral_*` em `cap_tenants`.
      - `GET /api/addons`: falha por ausência de catálogo em bancos com migrations desatualizadas.
  - **2. Criação das Migrações Faltantes e Migração Consolidada de Reparo**:
    * Criado `migrations/phase26_automated_saas_billing.sql` (PIX, carência, D18).
    * Criado `migrations/phase33_referral_program.sql` (Programa Indique e Ganhe, D19).
    * Criado `migrations/phase46_production_schema_repair.sql`: script mestre consolidado 100% idempotente (`ADD COLUMN IF NOT EXISTS`, `CREATE TABLE IF NOT EXISTS`, `CREATE INDEX IF NOT EXISTS`, RLS e permissões para `opera_app`), seguro para executar sem downtime ou perda de dados.
  - **3. Automação de Deploy na VPS e Testes**:
    * `scripts/deploy_vm.sh` atualizado para executar automaticamente `docker compose exec api node scripts/migrate.js up` a cada deploy.
    * `init.sql` regenerado em 100% de paridade com `database.md`.
    * Testes Jest de D18 e D19 executados com 100% de aprovação (21/21 testes).
    * API local reiniciada e validada com endpoints `/health`, `/health/complete`, `/api/addons` e `/api/services` respondendo com sucesso (código 200).
- [x] **G12 (P1) — Resolução de Erro 500 em /api/appointments e Restauração do Card de Onboarding no Dashboard**:
  - **1. Causa Raiz e Interdependência Diagnosticada**:
    * Ao acessar o Dashboard do Gestor (`/admin`), a tela disparava requisição para `GET /api/appointments?start_date=...&end_date=...` que retornava **HTTP 500** (`Erro interno ao obter agendamentos`).
    * No PostgreSQL, a tabela `cap_appointments` não possuía as colunas `discount_applied`, `payment_method`, `gift_card_redeemed`, `client_package_id` e `is_package_session`.
    * No frontend (`DashboardAdmin.jsx`), a chamada `api.appointments.list` era executada sequencialmente antes da chamada de status de onboarding (`api.onboarding.getStatus()`) sem encapsulamento individual de `try...catch`. Com o estouro do erro 500, a execução do carregamento do dashboard era abortada, pulando diretamente para o `catch` geral (`Erro ao carregar dashboard`).
    * Consequentemente, o estado `onboardingStatus` permanecia `null` e o card de "Etapas para novos salões" (`CardOnboarding`) nunca chegava a ser renderizado na tela.
  - **2. Ações Corretivas Executadas**:
    * **Migração e DDL (`phase46_production_schema_repair.sql` e `database.md`)**:
      - Adicionadas as colunas ausentes de `cap_appointments` (`discount_applied`, `payment_method`, `gift_card_redeemed`, `client_package_id`, `is_package_session`) e as tabelas de pacotes (`cap_packages`, `cap_client_packages`, `cap_package_usages`) com índices, RLS e permissões ao usuário `opera_app`.
      - Criada a migração `migrations/phase25_onboarding_schema.sql` e ajustada a paridade no `init.sql`.
      - Executada a migração com sucesso no PostgreSQL local (`operabeauty-db`).
    * **Resiliência e Blindagem no Frontend (`DashboardAdmin.jsx`)**:
      - As chamadas de busca de agendamentos de hoje e do mês foram encapsuladas em blocos `try...catch` dedicados, garantindo que mesmo se houver falha pontual em métricas de agenda, o restante dos cards (incluindo Onboarding, Estoque, Avisos da Plataforma e Cobrança SaaS) carreguem normalmente sem travar a interface.
    * **Testes e Build**:
      - Suítes de testes `onboardingD11.test.js`, `cobrancaAutomaticaSaaSD18.test.js`, `indiqueGanheD19.test.js` e `operacoesAtomicasC10.test.js` aprovadas com 100% de sucesso.
      - Build Vite de produção gerado com sucesso em 2.74s sem erros.
- [x] **G13 (P1) — Paridade Integral do Banco de Dados para Operação Real do Cliente (PDV, Waitlist, Anamnese, Campanhas, Avaliações e Minisite)**:
  - **1. Diagnóstico dos Erros 500 Reportados em Produção (`erro.md`)**:
    * Análise dos logs das telas da aplicação do cliente revelou ausência de tabelas e colunas que não haviam sido sincronizadas na VPS:
      - `GET /api/waitlist`: falha por ausência da tabela `cap_waitlist` (Lista de Espera Inteligente).
      - `GET /api/cash-register/current`: falha por ausência das tabelas `cap_cash_registers`, `cap_cash_movements`, `cap_orders`, `cap_order_items`, `cap_order_payments` (PDV e Caixa).
      - `GET /api/anamnesis/template/:tenantId`: falha por ausência das colunas `terms_text`, `terms_version`, `require_terms`, `require_signature` em `cap_anamnesis_templates` e tabelas de prontuário e evolução clínica.
      - `GET /api/campaigns`: falha por ausência das tabelas `cap_marketing_campaigns`, `cap_campaign_logs` e coluna `marketing_opt_out` em `cap_clients`.
      - `GET /api/reviews?limit=100`: falha por ausência das colunas `service_id`, `is_public`, `staff_reply`, `replied_at`, `replied_by` em `cap_reviews`.
      - `GET /api/minisite/:slug`: falha por tentar consultar `WHERE r.is_public = TRUE` em `cap_reviews`, derrubando o mini-site inteiro.
  - **2. Arquitetura de Planos e Proteção em 2 Camadas**:
    * Esclarecido e documentado o funcionamento do controle de funcionalidades por plano (ex: Plano Signature com acesso irrestrito):
      - Frontend: `FeatureProtectedRoute` intercepta a navegação e redireciona de forma amigável para a página de upgrade (`/admin/upgrade-required`), nunca gerando erro 500 de quebra de tela.
      - Backend: `requireFeature` valida no servidor as permissões do plano ativo do salão e retorna HTTP 403 Forbidden seguro (`Este recurso não está disponível no plano atual`).
      - A causa raiz dos erros 500 atuais era exclusivamente ausência de tabelas/colunas no PostgreSQL da VPS, e não bloqueio de plano.
  - **3. Consolidação e Idempotência Total (`phase46_production_schema_repair.sql`, `init.sql` e `database.md`)**:
    * Estruturação de script mestre 100% não destrutivo com `CREATE TABLE IF NOT EXISTS`, `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`, índices com `IF NOT EXISTS`, políticas de RLS completas e `GRANT` de permissões para a role `opera_app`.
    * Cobertura de: `cap_waitlist`, `cap_cash_registers`, `cap_cash_movements`, `cap_orders`, `cap_order_items`, `cap_order_payments`, `cap_anamnesis_templates`, `cap_client_anamnesis`, `cap_client_evolutions`, `cap_marketing_campaigns`, `cap_campaign_logs`, `cap_reviews`, `cap_lookbook`, `cap_whatsapp_instances`, `cap_whatsapp_auth_keys`, `cap_whatsapp_messages`, `cap_privacy_requests`.
    * Validação local em container Docker `operabeauty-db` com código de retorno 0.
  - **4. Resolução Definitiva de 500 em /api/waitlist (Agenda Profissional)**:
    * Adicionados blocos `ALTER TABLE public.cap_waitlist ADD COLUMN IF NOT EXISTS ...` para garantir que todas as colunas sejam criadas mesmo se a tabela já existisse previamente no banco de dados.
    * Refatorado endpoint `GET /api/waitlist` com suporte a fallback de `tenant_id` e sanitização estrita de `date` para evitar `invalid input syntax for type date`.
    * Refatorado `src/lib/api.js` para serializar automaticamente `options.params` em query strings HTTP.
    * Blindada chamada de waitlist em `AgendaProfissional.jsx` e `WaitlistManagerModal.jsx` utilizando `api.waitlist.list`.
    * Build de produção e testes validados com sucesso.
- [x] **G14 (P1) — Suporte Universal a Safe Area (Notch, Dynamic Island e Câmeras Frontais em Smartphones)**:
  - **1. Diagnóstico do Problema Físico em iPhones / Android**:
    * Testes em dispositivos físicos (iPhones com notch e Dynamic Island, e Androids com furo de câmera no meio/topo da tela) evidenciaram que botões e títulos superiores estavam sendo encobertos pelo recorte físico do hardware da câmera frontal.
    * Telas afetadas identificadas:
      - **SuperAdminLayout**: Header mobile (`md:hidden`) com altura fixa `h-16` encobrindo o título "Super Admin" e botão hambúrguer.
      - **DemoBanner**: Barra superior fixa (`sticky top-0`) com `py-2` sobreposta pelo notch, cobrindo textos de "Modo Demonstração" e botões de ação ("Voltar ao Site" / "Criar Meu Salão").
      - **AdminLayout**: Header superior (`h-16`) e cabeçalho do drawer lateral retrátil colidindo com a barra de status / recorte da câmera.
      - **LandingPage, MiniSiteSalao, PaginaPlanos, PainelRevendedor**: Headers fixos no topo sem espaçamento da safe area superior.
  - **2. Arquitetura e Implementação de Safe Area Tokens (`src/index.css`)**:
    * Criação de utilitários CSS universais consumindo `env(safe-area-inset-*, 0px)`:
      - `.safe-top`: Aplica `padding-top: env(safe-area-inset-top, 0px)`.
      - `.safe-bottom`: Aplica `padding-bottom: env(safe-area-inset-bottom, 0px)`.
      - `.safe-header`: Aplica `padding-top: env(safe-area-inset-top, 0px)` e `min-height: calc(4rem + env(safe-area-inset-top, 0px))` para manter alinhamento vertical e proporções no design system.
      - `.safe-banner-top`: Aplica `padding-top: max(env(safe-area-inset-top, 0px), 0.5rem)` para banners compactos fixos.
  - **3. Aplicação nos Componentes do Sistema**:
    * `SuperAdminLayout.jsx`: Aplicado `safe-header` no header mobile e no header do drawer, e `safe-bottom` no rodapé da barra lateral.
    * `DemoBanner.jsx`: Aplicado `safe-banner-top pb-2` mantendo todos os botões e tags visíveis abaixo do notch/Dynamic Island.
    * `AdminLayout.jsx`: Aplicado `safe-header` no TopAppBar do salão e no topo da gaveta de navegação, e `safe-bottom` no rodapé de logout.
    * `LandingPage.jsx`, `MiniSiteSalao.jsx`, `PaginaPlanos.jsx`, `PainelRevendedor.jsx`: Aplicado `safe-top` nos elementos `<header>` fixos.
  - **4. Validação e Não-Regressão**:
    * Em desktops e notebooks (onde `safe-area-inset-*` é `0px`), a altura e o padding permanecem inalterados.
    * Em dispositivos móveis com qualquer formato de câmera ou notch, o conteúdo é empurrado automaticamente para a área 100% segura e visível.
    * `npm run build` executado e aprovado com sucesso.
- [x] **G15 (P1) — Resolução de Erro 500 no Guia de Ativação do Salão (apply-catalog-template)**:
  - **1. Diagnóstico e Causa Raiz Identificada em Produção**:
    * Ao tentar cadastrar os serviços modelo no Onboarding/Guia de Ativação do Salão (`POST /api/onboarding/apply-catalog-template`), a API retornava **HTTP 500 (Internal Server Error)** com mensagem `syntax error at or near "$1"`.
    * No PostgreSQL, comandos de sessão como `SET` ou `SET LOCAL` não aceitam parâmetros de prepared statement (`$1`, `$2`). A instrução `SET LOCAL app.current_tenant_id = $1` falha compulsoriamente no analisador gramatical do Postgres com erro de sintaxe 42601 (`syntax error at or near "$1"`).
  - **2. Correção Arquitetural e Blindagem Multi-Tenant**:
    * Substituída a sintaxe inválida pela função oficial e segura do PostgreSQL `SELECT set_config($1, $2, true)` com parâmetros `['app.current_tenant_id', String(tenantId)]`.
    * A correção foi estendida e padronizada em todos os serviços afetados que continham a mesma falha latente:
      - `backend/services/onboardingService.js` (`applyCatalogTemplate`)
      - `backend/services/packageService.js` (`sellPackageToClient`)
      - `backend/services/clientService.js` (`importClients`)
      - `backend/services/catalogService.js` (`importServices`)
    * Garantida ativação explícita de RLS dentro do bloco transacional (`BEGIN`).
  - **3. Validação de Testes e Build**:
    * Suítes de testes executadas com 100% de aprovação (53/53 testes): `onboardingD11.test.js`, `importacaoPlanilhaD10.test.js` e `pacotesSessoesD13.test.js`.
    * Build Vite de produção validado com sucesso.
- [x] **G16 (P1) — Correção de Redirecionamento do Card de Identidade Visual no Guia de Ativação**:
  - **1. Diagnóstico**:
    * O Passo 4 do Guia de Ativação ("Personalizar Identidade Visual (Logo & Tema)") no Card de Onboarding do Dashboard estava apontando para `/:slug/staff/admin/configuracoes?tab=branding` em vez da rota canônica `/:slug/staff/admin/branding` (`BrandingCustomizacao.jsx`).
  - **2. Correção em 2 Camadas**:
    * **Backend (`onboardingService.js`)**: Atualizado `actionUrl` da etapa `'branding'` para `/${tenant.slug}/staff/admin/branding`.
    * **Frontend (`CardOnboarding.jsx`)**: Adicionada interceptação resiliente no `handleAction` mapeando o passo `'branding'` ou qualquer URL contendo `tab=branding` para `/${slug}/staff/admin/branding`, protegendo sessões ativas e evitando descompassos de cache.
  - **3. Validação**:
    * Testes Jest de onboarding aprovados com sucesso.
    * Build de produção Vite concluído em 2.60s.
- [x] **G17 (P1) — Resolução da Impressão em Branco e Exportação da Arte Completa do Display de Balcão (QR Code)**:
  - **1. Diagnóstico dos Problemas Reportados em Produção**:
    * **Folhas em Branco na Impressão**: O container modal possuía a classe `.no-print` (`display: none !important`), que desativava o nó pai do `#printable-display-area`. Pela especificação do CSS, elementos descendentes de nós com `display: none` jamais são renderizados, resultando em 3 folhas em branco no diálogo nativo de impressão.
    * **Download Apenas do QR Code**: O botão "Baixar Imagem" executava download direto de `qrDataUrl`, baixando exclusivamente a matriz pura do código QR sem a arte do display de balcão (nome do salão, logo, chamada de agendamento e passos).
  - **2. Arquitetura e Engenharia de Resolução**:
    * **Impressão Isolada via Iframe Dedicado**: Implementada renderização com criação de documento limpo em `iframe` isolado com estilos de página A4 `@page { size: A4 portrait; margin: 10mm; }` e `-webkit-print-color-adjust: exact`. Isso garante 1 única folha de papel com a arte do display centralizada e com cores perfeitas, sem conflitos com estilos da SPA.
    * **Motor de Exportação Gráfica via Canvas 2D**: Criada a função `drawDisplayToCanvas()` que desenha a placa de recepção completa em alta definição (1200 x 1750 px, proporção 2:3 pronta para impressão/gráfica), incluindo moldura arredondada, gradiente da marca, logotipo com fallback para monograma de texto, tipografia editorial, código QR centralizado, os 3 passos ilustrados e badge com o link do salão.
    * **Ações Duplas no Modal**: Mantido o botão primário "Baixar Imagem do Display" (PNG completo de alta resolução) e adicionado botão secundário "Baixar apenas o QR Code avulso (.png)" para flexibilidade do salão.
  - **3. Validação**:
    * Build Vite de produção executado com êxito em 3.27s.
    * Testes Jest de onboarding e DDL validados com 100% de sucesso.
- [x] **G18 (P1) — Correção dos Botões de Agendamento Online no Mini-Site do Salão**:
  - **1. Causa Raiz Diagnosticada**:
    * No Mini-Site do Salão (`MiniSiteSalao.jsx`), a função `handleGoToBooking` navegava para `/${tenant.slug}/servicos`.
    * A rota `servicos` não existia no roteador do salão (`App.jsx`), fazendo com que o React Router caísse na rota coringa `<Route path="*" element={<Navigate to="/" replace />} />`.
    * Como resultado, clicar em "Agendar Atendimento Online" (Hero), "Agendar Horário" (Navbar), "Agendar com {profissional}" (Equipe) ou na barra fixa mobile redirecionava o cliente para fora do salão e abria a Landing Page institucional do sistema OperaBeauty.
  - **2. Resolução**:
    * **MiniSite (`MiniSiteSalao.jsx`)**: Atualizada a função `handleGoToBooking` para navegar diretamente para a rota oficial de catálogo e agendamento: `/${slug}/agendar/servicos`.
    * **Roteador Global (`App.jsx`)**: Adicionados redirecionamentos canônicos automáticos para compatibilidade retroativa:
      - `<Route path="servicos" element={<Navigate to="agendar/servicos" replace />} />`
      - `<Route path="agendar" element={<Navigate to="agendar/servicos" replace />} />`
    * **Governança de Migrações**: Criada a migração `phase34_salon_minisite.sql` garantindo paridade na suíte de testes.
  - **3. Validação**:
    * Suíte de testes `minisiteD20.test.js` aprovada com 100% de sucesso (6/6 testes).
    * Build de produção Vite concluído em 3.37s.
- [x] **G19 (P1) — Redirecionamento de Agendamento do Mini-Site para Autenticação Segura (Login/Fluxo do Salão)**:
  - **1. Diagnóstico de Experiência do Usuário (UX/Fluxo de Conversão)**:
    - Ao clicar em "Agendar Atendimento Online" vindo do Mini-site público, se o cliente deslogado for enviado diretamente para a tela de escolha de serviços (`/agendar/servicos`), ele gasta tempo selecionando procedimentos, especialistas e horários para somente no último passo ser barrado por uma tela de login/cadastro, gerando a falsa impressão de que seu atendimento já estava finalizado.
  - **2. Arquitetura da Solução Implementada**:
    - **Detecção de Sessão no Mini-Site (`MiniSiteSalao.jsx`)**:
      - Integrado o hook `useTenant` para inspecionar `session` e o token ativo no `localStorage` (`operabeauty_token`).
      - Se o cliente **já estiver autenticado**: a função `handleGoToBooking` direciona diretamente para `/${slug}/agendar/servicos`, permitindo selecionar procedimentos com sua identidade já vinculada.
      - Se o cliente **não estiver autenticado**: `handleGoToBooking` direciona para a tela de entrada do salão (`/${slug}/login` — `AcessoTelefone.jsx`), onde ele insere seu telefone e senha (ou se cadastra se for nova cliente) seguindo o fluxo natural sem frustrações.
    - **Proteção Reativa de Sessão na Tela de Login (`AcessoTelefone.jsx`)**:
      - Adicionado efeito reativo com `useTenant` para que clientes que já possuem sessão ativa e acessem `/${tenant_slug}/login` sejam automaticamente encaminhados para a `/${tenant_slug}/home` do salão.
  - **3. Validação e Homologação**:
    - Suíte de testes `minisiteD20.test.js` aprovada com 100% de sucesso (6/6 testes).
    - Build de produção do Vite executado com sucesso.
- [x] **G20 (P1) — Blindagem de Rota Webhook de Faturas e Suporte a Mercado Pago no Super Admin**:
  - **1. Arquitetura da Rota de Webhook (`invoices.js`)**:
    - Padronizada a rota de webhook para aceitar `/webhook` e `/webhook/:gateway`.
    - Garantida a passagem correta dos parâmetros `(gateway, payload)` para `processBillingWebhook`, com resolução de contingência pelo gateway ativo da plataforma (`cap_platform_settings`).
  - **2. Validação**:
    - Suíte de testes `minisiteD20.test.js` aprovada com 100% de sucesso (6/6 testes).
- [x] **G21 (P1) — Blindagem de Segurança do Botão de Simulação Sandbox e Restrição de Baixa de Faturas**:
  - **1. Diagnóstico de Risco de Negócio**:
    - O botão de simulação de baixa (`Simular Baixa (Sandbox)`) no modal de PIX de mensalidade SaaS estava visível para qualquer gestor de salão cliente, permitindo que salões clientes dessem baixa em suas próprias faturas sem efetuar o pagamento.
  - **2. Arquitetura de Proteção em Dupla Camada**:
    - **Backend (`invoices.js` e `saasBillingService.js`)**: Endpoint `POST /api/invoices/:id/simulate-pay` restrito compulsoriamente apenas a `superadmin` (`requireRole(['superadmin'])`). Adicionada verificação server-side que rejeita imediatamente (HTTP 403 Forbidden) qualquer tentativa de simulação se a plataforma estiver configurada em `production`.
    - **Frontend (`ModalPagamentoPixSaaS.jsx`)**: O botão de simulação é completamente removido da interface quando a plataforma estiver em produção, ficando disponível exclusivamente para o Super Admin ou quando em ambiente de testes/sandbox.
  - **3. Validação**:
    - Build Vite de produção concluído com sucesso.
    - Suíte de testes `minisiteD20.test.js` aprovada com 100% de sucesso.
- [x] **G22 (P1) — Integração Direta da API do Mercado Pago para Mensalidades SaaS e Baixa Automática**:
  - **1. Geração Dinâmica de Cobrança na API do Mercado Pago**:
    - Função `generateSaaSPixPayload` atualizada para realizar chamada oficial a `POST https://api.mercadopago.com/v1/payments` usando o `Access Token` criptografado configurado no Super Admin.
    - O QR Code gerado nas faturas agora é emitido diretamente pelo Mercado Pago / Banco Central, registrando o pagamento na conta do titular da plataforma.
    - Faturas pendentes existentes são automaticamente sincronizadas e registradas na API do Mercado Pago ao serem visualizadas no painel do salão.
  - **2. Validação Oficial de Status no Webhook**:
    - No recebimento do webhook do Mercado Pago, o sistema consulta a API oficial (`GET /v1/payments/:id`) para validar o status real `approved` antes de executar `paySaaSInvoice`.
  - **3. Validação e Compilação**:
    - Build Vite de produção concluído com êxito em 4.12s.
    - Suíte de testes Jest 100% aprovada.
- [x] **G23 (P1) – Blindagem da Geração de Pix SaaS, Padrão BACEN EMV BR Code e Diagnóstico de Gateway Mercado Pago**:
  - **1. Diagnóstico de Raiz do Erro "Esse Pix ou QR code não é mais válido"**:
    - Identificado que o fallback gerava código Pix com CRC16 estático fixo (`6304ABCD`), sendo prontamente rejeitado por qualquer aplicativo bancário (Nubank, Itaú, Bradesco, Inter, Santander) como inválido/expirado.
    - Na integração com a API do Mercado Pago, a falta do envio do parâmetro `date_of_expiration` delegava o prazo ao default do provedor, além do fato de cobranças já canceladas ficarem retidas em cache caso a chave de idempotência não variasse.
    - Além disso, contas recebedoras do Mercado Pago recusam pagamentos de mesma titularidade (`payer.email` igual ao do recebedor ou tentativas de pagamento do titular no app do Mercado Pago).
  - **2. Utilitário Oficial BACEN EMV BR Code (`backend/utils/pixEmv.js`)**:
    - Implementação estrita do algoritmo de cálculo de CRC16-CCITT (Polinômio 0x1021, valor inicial 0xFFFF) em caixa alta.
    - Função `buildPixStaticPayload` com formatação TLV rigorosa para Tags 00, 26, 52, 53, 54, 58, 59, 60, 62 e 63, gerando QR codes estáticos e dinâmicos plenamente compatíveis com qualquer banco brasileiro.
  - **3. Blindagem de Cobrança e Renovação Contínua (`backend/services/saasBillingService.js` e `invoices.js`)**:
    - Definição explícita de `date_of_expiration` com janela mínima de 3 dias no futuro para impedir expiração antes do pagamento.
    - Chave de idempotência dinâmica para permitir emissão de novas cobranças sem conflito com pagamentos expirados.
    - Renovação automática no carregamento de faturas pendentes (`getTenantBillingStatus`) caso o status retornado pelo Mercado Pago seja `cancelled` ou `expired`.
    - Criação do endpoint `POST /api/invoices/:id/refresh-pix` permitindo que tanto o gestor quanto o Super Admin regenerem o QR code instantaneamente.
  - **4. Diagnóstico em Tempo Real no Super Admin (`SettingsAdmin.jsx` e `superadminService.js`)**:
    - Novo endpoint `POST /api/superadmin/settings/test-gateway` conectado a `GET https://api.mercadopago.com/users/me`.
    - Interface com botão "Testar Conexão com Gateway" e cartão de diagnóstico que identifica a conta, nickname, e-mail e avisa se as credenciais pertencem ao ambiente de Sandbox (`TEST-`) ou Produção (`APP_USR-`).
    - Alerta proativo caso chaves de teste sejam salvas com a plataforma em modo Produção.
  - **5. Interface do Modal de Pagamento (`ModalPagamentoPixSaaS.jsx`)**:
    - Adicionado botão interativo "Código expirado? Gerar Novo QR Code".
    - Caixa informativa com orientações práticas para homologação e testes de faturas em produção.
  - **6. Validação e Qualidade**:
    - Nova suíte de testes `pixEmvGateway.test.js` 100% aprovada (6/6 testes).
    - Suíte de regressão `cobrancaAutomaticaSaaSD18.test.js` 100% aprovada (13/13 testes).
    - Build de produção do Vite compilado com sucesso.
  - **7. Homologação em Produção (VPS)**:
    - Homologado e confirmado com sucesso pelo usuário em ambiente de produção na VPS (`srv1827901`) em 30/10/2026. Fatura SaaS de R$ 1,00 gerada no Mercado Pago, QR Code lido perfeitamente e pagamento compensado.

## Fase 32: Auditoria Geral de Produção, Segurança e Resiliência (G24 & G25)
- [x] **G24 (P0/P1/P2/P3) – Varredura Completa da Base de Código e Infraestrutura em Produção**:
  - **1. Auditoria Estrutural**:
    - Levantamento de riscos em infraestrutura Docker Compose, Caddy Reverse Proxy, camada de banco de dados PostgreSQL (pool leaks, locks concorrentes), controle de acesso JWT/cookies, M2M WhatsApp, rotinas de cron e integridade financeira nos fluxos SaaS e de salões.
  - **2. Diagnóstico e Registro Formal**:
    - Documento oficial de auditoria compilado e salvo no projeto: `AUDITORIA_PRODUCAO.md`.
    - Identificação de 2 vulnerabilidades críticas (`P0`: rota `/simulate-paid` pública e validação cega de webhook de sinal de agendamento), 2 altas (`P1`: fallback de webhook SaaS e porta 5001 exposta em `0.0.0.0`), 2 médias (`P2`: cron com renovação infinita de planos e ausência de rate-limit em rotas de cadastro/leads) e 2 baixas (`P3`: tokens em query strings e fallback hardcoded de segredo M2M).
  - **3. Plano de Remediação**:
    - Plano de ação estruturado em duas etapas (Etapa 1: blindagem financeira e rede; Etapa 2: resiliência e estabilidade) registrado na documentação técnica.

- [x] **G25 (P0/P1/P2/P3) – Execução das Correções de Segurança e Blindagem de Produção**:
  - **1. Blindagem de Pagamentos e Webhooks (P0/P1)**:
    - `backend/routes/payments.js`: Rota `POST /simulate-paid/:appointmentId` bloqueada em produção (`NODE_ENV === 'production' -> 403 Forbidden`) e restrita a gateways em modo sandbox. Botão de simulação no frontend (`AgendamentoConfirmado.jsx`) condicionado estritamente a `import.meta.env.DEV`.
    - `backend/routes/payments.js` & `paymentGatewayService.js`: Webhook de sinal de agendamentos (`/api/payments/webhook/:tenantId/:provider`) atualizado para consultar a API oficial do Mercado Pago / Asaas antes de confirmar pagamentos. Removido fallback permissivo de `a.id::text` em `confirmDepositPayment`, assegurando correspondência exclusiva por `deposit_payment_id`.
    - `backend/services/saasBillingService.js`: Removida brecha no fallback que considerava `payment.created` como faturas quitadas.
  - **2. Isolamento de Perímetro e Infraestrutura (P1)**:
    - `docker-compose.yml` e `docker-compose.staging.yml`: Portas das APIs (5001/5002) vinculadas estritamente a `127.0.0.1`, impedindo bypass dos cabeçalhos de segurança do Caddy.
  - **3. Resiliência de Assinaturas e Proteção Anti-Abuso (P2)**:
    - `backend/cron/reminders.js`: Assinaturas expiradas são alteradas para `'past_due'` sem conceder sessões gratuitas nem estender ciclos sem faturamento.
    - `backend/routes/auth.js` & `backend/routes/leads.js`: Adicionados `registerClientLimiter` (15/hora) e `leadLimiter` (10/15min) contra ataques de flood.
  - **4. Privacidade e Segredos (P3)**:
    - `backend/routes/privateUploads.js`: Adicionados cabeçalhos `Referrer-Policy: no-referrer` e `Cache-Control: private, no-store, max-age=0` na entrega de arquivos do prontuário CRM.
    - `backend/routes/whatsappRoutes.js`, `gateway-whatsapp/src/server.js` e `.env.example`: Adicionado alerta explícito para ausência de `INTERNAL_SECRET` em produção e template de configuração.
  - **5. Validação**:
    - Testes unitários e de integração aprovados (16/16 em gateway/Pix, 9/9 em CRM).
    - Compilação de produção Vite (`npm run build`) concluída com êxito.
