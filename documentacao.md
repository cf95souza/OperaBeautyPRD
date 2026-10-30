# Documentação do Projeto: OperaBeauty

## Escopo do Projeto
O OperaBeauty é um sistema SaaS White Label Multi Tenant focado no ramo de beleza feminina, abrangendo estúdios, salões de beleza, manicures, clínicas de estética, entre outros. A arquitetura Multi Tenant permite que uma única instância do sistema atenda múltiplas empresas simultaneamente, com segurança e independência.

A estratégia principal de acesso (tanto para clientes finais quanto para os profissionais e gestores) se dará através de rotas baseadas no nome do salão, utilizando o formato `seudominio.com/[nomedosalao]` (ex: `OperaBeauty/salaodamaria`). Esse formato evita falhas globais de roteamento, garante isolamento visual/dados, e permite customização de identidade visual (White Label) para cada ambiente.

O sistema é dividido estrategicamente em 4 Módulos Principais (fundamentados pelo novo Design System do Stitch):
1. **Módulo Cliente (Portal do Cliente):** Fluxo de agendamento, histórico, fidelidade e pagamentos. **Importante:** O isolamento de clientes é total. O link de acesso dita a base de dados. Se uma cliente usa o salão A e o salão C, ela terá cadastros e senhas separadas para cada um, vinculados unicamente àquele link.
    - **Fluxo Exato do Cliente:**
      1. Acessa o link do salão (`/[nomedosalao]`).
      2. Tela **`acesso_telefone`**: Digita o número. Se já tiver cadastro, avança para:
      3. Tela **`acesso_senha`**: Digita a senha para autenticar, ou opta por **"Entrar com código via WhatsApp"** (login sem senha) ou **"Esqueceu sua senha?"** (recuperação adaptativa via WhatsApp do salão ou contato direto com a recepção - D7).
      4. Tela **`home_dashboard`**: Painel principal do cliente com atalhos.
      5. Jornada de Agendamento (Implementada com Design Stitch): **`agendamento_selecionar_profissional`** > **`agendamento_selecionar_servi_o`** > **`agendamento_selecionar_hor_rio`** > **`agendamento_revis_o_e_cupom`** > **`agendamento_confirmado`**.
      6. Tela **`hist_rico_de_agendamentos`** (Implementada): Permite gerenciar, cancelar e rever procedimentos realizados.
      7. Tela **`meu_perfil`**: Gestão e atualização de dados pessoais.
2. **Módulo Operador / Profissional (Staff App):** Acessado via link do próprio salão. Assim como clientes, profissionais que trabalham em mais de um salão terão usuários separados para cada link, sem cruzamento de dados. Cada gestor administra sua própria equipe.
    - **Fluxo Exato do Profissional:**
      1. Tela **`acesso_profissional_staff`**: Login.
      2. Tela **`agenda_profissional_controles_de_atendimento`**: Visualização da agenda do salão e da sua própria agenda.
      3. Tela **`ficha_da_cliente_crm`**: O acesso ao CRM/Ficha da cliente se dá *exclusivamente* por dentro de um procedimento em andamento.
      - *Regra de Negócio (Multitarefa):* É possível iniciar um procedimento, deixá-lo "em andamento", voltar para a tela principal e iniciar outro procedimento simultaneamente. Isso economiza tempo operacional do salão.
3. **Módulo Gerente / Dono (Administrativo):** Dashboard gerencial, gestão de equipe total, fluxo financeiro, estoque e renovação de assinatura do sistema.
    - **Fluxo Exato do Gestor:**
      1. Login pela mesma tela da equipe: **`acesso_profissional_staff`**.
      2. Telas Gerenciais (Implementadas): **`dashboard_administrativo`**, **`gest_o_financeira`**, **`gest_o_de_equipe`**, **`configura_es_operacionais`**, **`branding_customiza_o`** e **`controle_de_estoque`**.
      - *Regra de Negócio:* O gestor também pode executar serviços (atuar como profissional). Portanto, he tem acesso livre à tela de agenda com a mesma visão e controles da equipe.
4. **Módulo Super Admin (SaaS Mestre):** Acesso exclusivo do dono da plataforma (Você). Responsável por cadastrar os salões novos e monitorar o faturamento macro. Futuras atualizações (Fase 8) incluirão:
    - **Dashboard Financeiro (MRR):** Controle de assinaturas e inadimplência.
    - **Gestão de Administradores:** Controle da equipe SaaS (novos super admins).
    - **Sidebar Unificado**: O painel master exibe o nome da marca ("OperaBeauty") acima do card indicador de "Super Admin - Gestão da Plataforma", garantindo consistência visual em todas as sub-páginas administrativas.
    - **Mural de Avisos (Broadcast):** Alertas em massa para todos os salões.
    - **Logs de Auditoria & Saúde:** Uso de armazenamento e segurança.
    - **Feature Flags:** Habilitar módulos em fase Beta para clínicas específicas.

---

## O Novo Design System (Integração Stitch)
O projeto passou por um grande refatoramento visual. Foram exportadas 27 telas completas do Stitch, que definem a nova identidade visual do sistema. As tecnologias utilizadas para comportar este design continuam sendo:
- **Frontend Core:** React 19, Vite 8, React Router v7.
- **Estilização e UI:** Tailwind CSS v4.

---

## Funcionalidades e Diferenciais (Roadmap Estratégico)

### 1. Agenda e Agendamento (Core)
- **Funcionalidades:** Agenda diária/semanal/mensal, fluxos otimizados para seleção.
- **Diferencial (IA):** Sugestão automática de encaixes.

### 2. CRM Avançado e Ficha de Anamnese
- **Ficha de Cliente (CRM):** Histórico completo (acessível apenas via procedimento em andamento).
- **Anamnese 100% Dinâmica (Form Builder):** O sistema terá um construtor completamente aberto (provavelmente utilizando campos JSON no banco de dados). O salão terá autonomia total para montar o questionário como bem entender (textos, múltipla escolha, checkboxes), sem limitação de formato.

### 3. Serviços e Equipe (Gestão)
- **Painel de Equipe:** Gestão de staff, acessos e perfil do profissional.
- **Comissões Automatizadas:** Ao cadastrar um profissional, o gestor pode (opcionalmente) definir taxas de comissão. O sistema utilizará esses dados para calcular o pagamento de forma 100% automática a cada serviço concluído.
- **Controle Operacional:** Check-in e checkout de atendimentos.

### 4. Financeiro e Estoque
- **Dashboard e Financeiro:** Fluxo de caixa e histórico de receitas e despesas.
- **Estoque Atrelado a Serviços:** Ao cadastrar um serviço, o gestor pode escolher se ele consome estoque. Se ativado, ele seleciona um ou mais itens da lista de insumos e define a quantidade exata consumida por serviço. A baixa é automática assim que o procedimento for concluído no aplicativo.

### 5. Multi Tenant, Roteamento e Assinaturas (SaaS)
- **Criação de Salão (Onboarding):** Feita exclusivamente de forma manual pelo Super Admin (Você).
- **Modelo de Negócio (Plano Único):** O salão paga uma assinatura mensal de **R$ 59,99/mês**, sem limites de profissionais.
- **Gateway de Pagamento (AbacatePay):** Será a **última etapa do projeto** (em fase de aprovação). O pagamento e renovação da assinatura do sistema será feito pelo dono do salão por dentro do painel gerencial.
- **Roteamento Dinâmico (Slug):** Acesso individualizado por salão através da rota `/[nomedosalao]`.
- **Isolamento de Dados:** RLS (Row Level Security) aplicado rigorosamente.

---

## Relatório de Status Atual (Atualizado)

Nesta última grande sprint, concluímos a fundação visual de **todos os 4 módulos principais** do sistema utilizando o novo Design System exportado do Figma via Stitch.

### O que já foi feito (Telas Implementadas):
1. **Módulo Cliente:** Todo o fluxo de login (telefone/senha), cadastro, dashboard inicial, jornada completa de agendamento (serviço, profissional, horário, revisão) e histórico de agendamentos.
2. **Módulo Profissional:** Login da equipe, agenda diária e ficha de CRM da cliente.
3. **Módulo Gestor (Admin):** Dashboard gerencial, gestão financeira, gestão de equipe, controle de estoque, configurações operacionais, gestão de serviços e branding/customização.
4. **Módulo Super Admin:** Painel global do dono da plataforma (SaaS Mestre) e tela de login isolada e super segura.
5. **Arquitetura Base e Integração BD:** O modelo Multi-Tenant foi ativado e todas as telas fundamentais estão integradas. As páginas de Dashboard, Financeiro, Agenda (Profissional e Salão), Gestão de Equipe, Estoque e Serviços já realizam operações reais de leitura/escrita e manipulam dados vivos utilizando Supabase RPCs seguras e joins relacionais.
6. **Configurações Operacionais Dinâmicas:** A tabela de bloqueios de datas foi transformada para suportar Exceções Específicas por Data (podendo abrir com horários diferenciados). O calendário geral agora aceita gestão flexível de todos os dias (Domingo a Sábado).
7. **Gestão de Serviços Avançada:** Implementamos o Módulo de Serviços (Módulo Ouro) integrando o controle de tempo de manutenção e o abatimento automático de estoque atrelado ao procedimento. O Dashboard agora prevê e avisa automaticamente os Retornos Agendados (Próximos 30 dias).
8. **Motor de Cupons e Branding Completo:** Sistema de descontos funcional com controle de expiração (data) e limites de quantidade de usos, integrado em tempo real no checkout da cliente. Branding customizável permitindo alterar nome e slug (link) do salão de forma dinâmica.
9. **CRM Aprimorado:** Tela de clientes com rápido acesso para iniciar chamadas no WhatsApp, redefinição segura de senhas pelo gerente e proteção contra links quebrados no painel.

1. **Módulo de Faturas SaaS e Assinaturas:** Painel do Salão integrado à leitura real de suas mensalidades, e painel Mestre (Super Admin) com capacidade de gerar faturas manuais e dar baixa.
2. **Proteção de Acessos Avançada:** Reforçamos o bfcache e roteamento do navegador garantindo que sessões encerradas expulsem usuários imediatamente de painéis de gerência.

### O Sistema Está Pronto para Homologação (V 1.0)!
Todo o core do SaaS Multi-Tenant está implementado. O sistema conta com agendamento autônomo do cliente, CRM atrelado a banco de dados isolado via RLS (Row Level Security) focado por salão, controles de gestão (estoque, serviços, finanças), além do super painel master da franquia.

### Transição de Ambiente (VPS & Backend Dedicado):
1. **Nova Arquitetura de Backend Dedicado**: Desenvolvimento de uma aplicação servidora em Node.js (Express) com suporte a roteamento REST moderno. O backend cuidará das conexões com o PostgreSQL local/VPS, das lógicas de controle de sessão/JWT e de isolamento de tenants (filtros de segurança RLS lógico baseados no `tenant_id` do JWT do usuário).
2. **Banco de Dados PostgreSQL Próprio**: Uso de uma instalação local/VPS tradicional do PostgreSQL, executando o DDL contido em `estrutura_db.md`. A criptografia de senhas será gerenciada no backend via `bcryptjs`.
3. **Refatoração do Frontend**: Desacoplamento completo do SDK do Supabase no frontend. O React passará a consumir a API REST dedicada através de um cliente unificado de chamadas HTTP (`src/lib/api.js`), eliminando queries de banco diretas e vulnerabilidades de segurança na interface. Além disso, o adaptador de compatibilidade (`src/lib/supabase.js`) foi atualizado para suportar encadeamento no padrão Thenable e realizar corretamente a listagem, busca e onboarding de salões (tenants) no painel do Super Admin.
4. **Landing Page de Vendas**: Criação do portal "vitrine" do OperaBeauty focado em captar novos donos de salão interessados na assinatura.

---

## Guia Oficial de Deploy e Setup na VPS (Ubuntu Server)

Para manter a consistência de DevOps e garantir facilidade em migrações, a aplicação e o banco de dados rodam orquestrados por **Docker Compose**. Este roteiro serve para configurar tanto a máquina virtual de testes local quanto a VPS definitiva em produção.

### 1. Conexão e Sincronização (WinSCP & SSH)
- Para acessar a VPS, você precisa do IP do servidor e da porta SSH (padrão 22). No VirtualBox local em modo NAT, faça o redirecionamento de portas (ex: host porta 2222 para porta 22 da VM) ou coloque em modo Bridge.
- Utilize o **WinSCP** para acessar os arquivos graficamente. Basta inserir Host, Porta, Usuário e Senha. Use o WinSCP para transferir a pasta `OperaBeauty` inteira do seu Windows para dentro da VPS (ex: `/home/seu-usuario/OperaBeauty`).

### 2. Instalação do Docker e Compose na VPS (Ubuntu)
Abra o terminal (PuTTY ou direto no VirtualBox) e execute:
```bash
# Instalar dependências
sudo apt update && sudo apt install -y ca-certificates curl gnupg lsb-release

# Adicionar a chave GPG oficial do Docker
sudo mkdir -p /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg

# Configurar o repositório
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Instalar Docker Engine
sudo apt update && sudo apt install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# Permitir uso sem sudo (faça logoff e login depois)
sudo usermod -aG docker $USER
```

### 3. Rodando o Projeto (Deploy)
Pelo terminal, navegue até a pasta que você copiou via WinSCP:
```bash
cd /home/seu-usuario/OperaBeauty

# Para inicializar a API e o PostgreSQL em segundo plano:
docker compose up -d

# Para verificar se estão rodando:
docker compose ps

# Para ver os logs da API (se houver algum erro):
docker compose logs api
```

### 4. Inicializando o Banco de Dados pela Primeira Vez
Com o container rodando, você deve aplicar o DDL (script que cria as tabelas) da documentação `database.md`:
1. Use o WinSCP ou terminal para colocar o script de criação dentro da VPS ou simplesmente copie-o.
2. Acesse o container do Postgres via terminal:
   ```bash
cd /home/seu-usuario/OperaBeauty

# Para inicializar a API e o PostgreSQL em segundo plano:
docker compose up -d

# Para verificar se estão rodando:
docker compose ps

# Para ver os logs da API (se houver algum erro):
docker compose logs api
```

### 4. Inicializando o Banco de Dados pela Primeira Vez
Com o container rodando, você deve aplicar o DDL (script que cria as tabelas) da documentação `database.md`:
1. Use o WinSCP ou terminal para colocar o script de criação dentro da VPS ou simplesmente copie-o.
2. Acesse o container do Postgres via terminal:
   ```bash
   docker exec -it operabeauty-db psql -U postgres -d operabeauty
   ```
3. Cole o conteúdo de `database.md` no console e dê enter para estruturar as tabelas SaaS Multi-Tenant.

---

## Histórico de Alterações

- **23/10/2026 - Estruturação e Hotfix das Tabelas de Anamnese Dinâmica (CRM / Ficha da Cliente):**
  - **Banco de Dados**: Criadas e aplicadas as tabelas `public.cap_anamnesis_templates` (armazenamento do schema JSON dinâmico dos questionários por salão) e `public.cap_client_anamnesis` (respostas dos clientes com data de expiração e isolamento multi-tenant) via [migrations/phase20_anamnesis_schema.sql](file:///d:/Repositorios/OperaBeauty/migrations/phase20_anamnesis_schema.sql). Adicionados índices de performance, RLS e privilégios para `opera_app`.
  - **Backend (API)**: Resolvidos os erros `HTTP 500` nos endpoints `GET /api/anamnesis/template/:tenantId` e `GET /api/anamnesis/client/:clientId` decorrentes da inexistência das tabelas no PostgreSQL. Agora retornam `HTTP 200` com schema e respostas íntegras.
  - **Documentação de Infraestrutura**: Atualizados [database.md](file:///d:/Repositorios/OperaBeauty/database.md) e [init.sql](file:///d:/Repositorios/OperaBeauty/init.sql) para garantir reprodutibilidade em novos deploys e ambientes de homologação.

- **23/10/2026 - Correção na Navegação do Modal de Agendamento (Agenda Profissional → CRM):**
  - **Frontend (Staff/Agenda)**: Corrigido o direcionamento do botão *"Abrir Ficha da Cliente (CRM)"* no modal de detalhes do agendamento em [AgendaProfissional.jsx](file:///d:/Repositorios/OperaBeauty/src/pages/AgendaProfissional.jsx). Anteriormente o botão navegava para a listagem genérica de clientes (`/staff/admin/clientes`), exigindo busca manual. Agora navega diretamente para a ficha individual da cliente com seu ID (`/${tenant_slug}/staff/ficha-cliente/${selectedAppointment.client_id}`), carregando seu histórico de procedimentos, fotos, consentimentos e timeline no CRM com apenas 1 clique.

- **10/08/2026 - Novo Fluxo de Vale-Presente (Segurança e SaaS):**
  - **Banco de Dados**: Refatoração da tabela `cap_giftcards` removendo a obrigatoriedade do `redemption_code` inicial, adicionando colunas de `request_id` (VP-XXXX), `original_value`, `available_balance` e `payment_status`. Criação da tabela `cap_tenant_payment_methods` para armazenar chaves PIX dos salões.
  - **Backend (API)**: Alteração da lógica de criação de vales-presente, separando a solicitação (PENDING_PAYMENT) da confirmação (ACTIVE). Criação de rotas para consultar solicitações, confirmar pagamentos (gerando o código de resgate), e validar/resgatar códigos de forma parcial.
  - **Frontend (Cliente)**: Tela de compra ajustada para não gerar mais o código final imediatamente. Agora o cliente recebe um `request_id` e os dados PIX do salão para realizar o pagamento externo, com atalho para enviar comprovante via WhatsApp.
  - **Frontend (Gestor)**: Gestão de Gift Cards totalmente reconstruída com abas de validação de pagamento (para gerar o código após PIX) e validação de código (para debitar saldo). Regra clara de que quem envia o código ao presenteado é o comprador.

- **19/07/2026 - Conclusão Parcial da Fase 8 (Módulos Avançados do Super Admin):**
  - **Mural de Avisos (Broadcast):** Adicionada a funcionalidade para o Super Admin enviar comunicados globais que aparecem no painel de todos os studios ativos através da tabela `cap_platform_announcements`.
  - **Menu Lateral Unificado:** Padronização visual da sidebar do Super Admin (com logo e identificador), replicada e aplicada consistentemente em todas as telas de administração mestra.
  - **Auditoria, Saúde e Logs:** Criação da tabela `cap_crm_images` para rastrear consumo de armazenamento de cada studio em MBs (simulação de CRM) e implementação da funcionalidade de logs de segurança na tabela `cap_audit_logs`, registrando acesso, ações sensíveis e o endereço IP do Super Admin, exposto em um novo painel `AuditoriaAdmin.jsx`.

- **07/07/2026 - Configuração de Endereço, Redes Sociais, Horários na Login e Novo Design de Profissionais:**
  - Banco de Dados: Adicionadas as colunas `address`, `social_instagram`, `social_facebook` e `social_whatsapp` na tabela `cap_tenants` para armazenar o endereço físico e links das redes sociais do salão.
  - Backend: Atualizadas as rotas `GET /by-slug/:slug` e `PUT /branding` no backend (`tenants.js`) para suportar a leitura e persistência dessas novas configurações.
  - Painel do Gestor: Atualizada a tela de Configurações Operacionais (`ConfiguracoesOperacionais.jsx`) com novos campos de formulário para Localização e Redes Sociais, integrando com o salvamento global de configurações.
  - Portal do Cliente (Login): Atualizada a tela de Login por Telefone (`AcessoTelefone.jsx`) para renderizar condicionalmente botões pílulas de Localização (exibindo endereço em modal com redirecionamento de rotas no Google Maps), Horários (exibindo tabela de funcionamento em modal) e ícones de redes sociais (com links externos seguros), dependendo de sua configuração no banco de dados.
  - Portal do Cliente (Agendamento): Redesenhada a tela de agendamento de profissionais (`AgendamentoProfissionais.jsx`) para substituir os cards verticais com espaços gigantes vazios para fotos por uma listagem horizontal compacta e premium, contendo avatar circular com as iniciais do profissional, cargo, chip de verificação e botão com chevron.
  - Portal do Cliente (Checkout): Corrigido bug de incremento duplo do contador de usos de cupons (`current_uses`) em [AgendamentoRevisao.jsx](file:///d:/Repositorios/OperaBeauty/src/pages/AgendamentoRevisao.jsx) ocasionado por um bloco redundante de update manual rodando após a chamada da RPC `increment_coupon_uses`.

- **05/07/2026 - Refatoração do Layout Móvel do Cliente (Safe Area e BottomNavBar):**
  - Criado o componente unificado `ClienteBottomNavBar` que implementa a navegação no estilo Material Design 3 (onde a pílula colorida verde-água circula apenas o ícone, corrigindo o formato oval achatado).
  - Implementado espaçamento superior de segurança (`pt-[calc(env(safe-area-inset-top,0px)+12px)]`) contra notches de câmera frontal em todas as telas principais do cliente (`HomeCliente`, `PerfilCliente`, `HistoricoAgendamentos` e fluxo de agendamento).

- **04/07/2026 - Hotfix no Adaptador do Supabase (`supabase.js`):**
  - Adicionado suporte ao método `.upsert()` para delegação direta na API REST local de gerenciamento de horários (`api.settings.updateBusinessHours`).
  - Adicionado suporte aos métodos de comparação e filtragem `.lt()` e `.neq()` no query builder mock do Supabase.
  - Implementado filtros de comparação de menor que (`_lt`) e diferença (`_neq`) para avaliações locais/em memória no `executeSelect()`, evitando quebras de tela (tela branca) na listagem e seleção de horários de agendamento por parte do cliente.

- **04/07/2026 - Hotfix na Jornada de Agendamento (Persistência e Tipagem):**
  - Implementada a persistência dos dados de agendamento (`bookingData`) em `sessionStorage` dentro do [BookingContext.jsx](file:///d:/Repositorios/OperaBeauty/src/context/BookingContext.jsx) para prevenir perda de estado na navegação, redirecionamentos ou recarregamento de rotas.
  - Adicionado suporte a atualizações em lote no `updateBooking` (recebendo um objeto), otimizando a seleção de data/hora em [AgendamentoHorarios.jsx](file:///d:/Repositorios/OperaBeauty/src/pages/AgendamentoHorarios.jsx) com uma única chamada em vez de duas.
  - Normalizado o preço do serviço para `Number` em [AgendamentoRevisao.jsx](file:///d:/Repositorios/OperaBeauty/src/pages/AgendamentoRevisao.jsx) para evitar quebras por tipos incompatíveis e erro fatal de `.toFixed(2)` se o valor retornado do banco/API vier como string.

- **04/07/2026 - Hotfix na Listagem de Agendamentos (`HistoricoAgendamentos`):**
  - Corrigido o mapeamento de `cap_appointments` no adaptador do Supabase ([supabase.js](file:///d:/Repositorios/OperaBeauty/src/lib/supabase.js#L149-L159)) para converter a resposta flat da API Express em objetos relacionais aninhados (`cap_services`, `cap_staff`, `cap_clients`) que o frontend original consome.
  - Injetado o valor de `client_id` no mapeamento dos agendamentos no frontend para que a filtragem em memória do query builder do Supabase não descarte os registros devido à ausência desta propriedade no select da API do cliente no backend, resolvendo a listagem vazia na tela "Minha agenda".

- **04/07/2026 - Hotfix no Cancelamento de Agendamentos (`HistoricoAgendamentos`):**
  - Implementada a função `handleCancel` em [HistoricoAgendamentos.jsx](file:///d:/Repositorios/OperaBeauty/src/pages/HistoricoAgendamentos.jsx#L13-L27) para enviar um PUT para `/api/appointments/:id` atualizando o status do agendamento para `'cancelled'`.
  - Associada a função ao evento `onClick` do botão de cancelar no JSX.
  - Adicionado o estado `refreshTrigger` no array de dependências do `useEffect` para recarregar automaticamente a lista de agendamentos na tela após o sucesso da operação.

- **04/07/2026 - Hotfix no Cadastro e Perfil do Cliente (`PerfilCliente` e `CadastroCliente`):**
  - Liberada a rota `GET /clients/:id` no backend ([clients.js](file:///d:/Repositorios/OperaBeauty/backend/routes/clients.js#L28-L38)) para que os próprios clientes autenticados consigam ler o seu próprio perfil (estava bloqueado apenas para `manager` e `professional`, gerando erro `403 Forbidden` e campos em branco na tela de perfil).
  - Incluído suporte à data de nascimento (`birth_date`) no endpoint de cadastro do cliente no backend (`POST /register-client`) e atualizado `registerClient` na API do frontend ([api.js](file:///d:/Repositorios/OperaBeauty/src/lib/api.js#L67-L72)) e adaptador ([supabase.js](file:///d:/Repositorios/OperaBeauty/src/lib/supabase.js#L400-L408)) para trafegá-lo.
  - Adicionado o campo de "Data de Nascimento" obrigatório (`required`) e o respectivo estado `birthDate` na tela de primeiro cadastro do cliente ([CadastroCliente.jsx](file:///d:/Repositorios/OperaBeauty/src/pages/CadastroCliente.jsx#L13-L140)).

- **04/07/2026 - Hotfix na Verificação Anônima de Telefone (`check-phone`):**
  - Criado o endpoint público `GET /auth/check-phone` no backend ([auth.js](file:///d:/Repositorios/OperaBeauty/backend/routes/auth.js#L8-L30)) para permitir que a tela de início do fluxo (`AcessoTelefone.jsx`) verifique a existência do telefone de um cliente sem a necessidade de um token de autenticação (evitando erros de `403 Forbidden`).
  - Atualizado o adaptador do Supabase ([supabase.js](file:///d:/Repositorios/OperaBeauty/src/lib/supabase.js#L143-L151)) para que, ao detectar um select em `cap_clients` contendo os filtros `phone` e `tenant_id`, utilize o novo endpoint público `/check-phone`.

- **05/07/2026 - Atualização Documental de DevOps (Solução de Cache ARP):**
  - Atualizado o guia de VPS ([configuracao_vps.md](file:///d:/Repositorios/OperaBeauty/configuracao_vps.md)) adicionando a seção de Troubleshooting (Parte 7).
  - Documentado o comando `arp -d` do Windows para limpar rapidamente o cache do IP da VM em caso de erros `ECONNREFUSED` ou `ETIMEDOUT` na porta 5432, evitando a necessidade de reconfiguração de rede ou reinício da VM.
- **05/07/2026 - Módulo do Profissional (Tela de Perfil, Câmeras/Notch e Notificações):**
  - Ajustado o padding superior do cabeçalho de administração ([AdminLayout.jsx](file:///d:/Repositorios/OperaBeauty/src/components/admin/AdminLayout.jsx#L133)) para `pt-[calc(env(safe-area-inset-top,0px)+28px)]` a fim de evitar sobreposição com notches de câmera frontal em aparelhos mobile.
  - Ativado o botão de notificações do layout administrativo com a criação de um Toast elegante de feedback temporário (3 segundos).
  - Transformado o avatar de perfil do header e da barra lateral em links interativos apontando para a nova rota `/staff/perfil`.
  - Criada a nova tela [PerfilProfissional.jsx](file:///d:/Repositorios/OperaBeauty/src/pages/PerfilProfissional.jsx) para que funcionários visualizem seu e-mail e editem nome, telefone e senha, integrada via RPC `cap_update_staff`.
  - Atualizada a rota `PUT /staff/:id` no backend ([staff.js](file:///d:/Repositorios/OperaBeauty/backend/routes/staff.js#L84-L122)) para permitir a edição de dados pelo próprio profissional logado (autenticado) e impedir que profissionais modifiquem seu próprio cargo, status de ativação ou taxa de comissão sem perfil de gestor.
  - Incluído o campo `email` no retorno do endpoint `/me` no backend ([auth.js](file:///d:/Repositorios/OperaBeauty/backend/routes/auth.js#L246)) para que o perfil do profissional exiba seu e-mail corretamente em tempo real.

- **05/07/2026 - Hotfix no Carregamento de Exceções de Horários (Agendamento):**
  - Corrigido o bug na tela [AgendamentoHorarios.jsx](file:///d:/Repositorios/OperaBeauty/src/pages/AgendamentoHorarios.jsx#L82) onde a propriedade da exceção de data era acessada incorretamente como `e.date` em vez de `e.exception_date`.
  - Adicionado tratamento defensivo usando `String()` e verificação de existência do campo para evitar quebras se a propriedade estiver ausente ou for nula.

- **05/07/2026 - Hotfix de Timezone de Datas e Formato 24 Horas:**
  - Configurado o parser global do driver do PostgreSQL no backend ([db.js](file:///d:/Repositorios/OperaBeauty/backend/config/db.js)) para retornar colunas do tipo `DATE` como strings cruas no formato `"YYYY-MM-DD"`, evitando conversões indesejadas e distorções causadas por fuso horário.
  - Removido o cast redundante `new Date()` no backend para salvar campos `DATE` na persistência de exceções ([settings.js](file:///d:/Repositorios/OperaBeauty/backend/routes/settings.js)), clientes ([auth.js](file:///d:/Repositorios/OperaBeauty/backend/routes/auth.js)) e faturas ([invoices.js](file:///d:/Repositorios/OperaBeauty/backend/routes/invoices.js)), impedindo deslocamento de datas e colisões na constraint de unicidade do banco.
  - Substituído o input de tipo `time` por inputs de tipo `text` com placeholder `"HH:MM"` e `maxLength={5}` em Configurações Operacionais ([ConfiguracoesOperacionais.jsx](file:///d:/Repositorios/OperaBeauty/src/pages/admin/ConfiguracoesOperacionais.jsx)) para forçar a exibição e manipulação de horários no padrão de 24h brasileiro, independentemente das preferências de idioma do navegador.

- **05/07/2026 - Hotfix no Mapeamento de Horários Especiais de Exceções:**
  - Corrigido o bug na tela [AgendamentoHorarios.jsx](file:///d:/Repositorios/OperaBeauty/src/pages/AgendamentoHorarios.jsx#L86) onde o frontend lia incorretamente `exception.start_time` e `exception.end_time` (que são propriedades de agendamentos) em vez de `exception.open_time` e `exception.close_time` (que são as propriedades de funcionamento nas exceções parciais), garantindo o correto processamento de horários alternativos para o cliente.

- **05/07/2026 - Restabelecimento do Módulo de Cupons de Desconto (cap_coupons):**
  - Adicionado o DDL de criação e cleanup da tabela `cap_coupons` nos arquivos de documentação do banco ([database.md](file:///d:/Repositorios/OperaBeauty/database.md) e [estrutura_db.md](file:///d:/Repositorios/OperaBeauty/estrutura_db.md)), assim como no script do backend ([setup_database.sql](file:///d:/Repositorios/OperaBeauty/backend/scripts/setup_database.sql)).
  - Criado o roteador REST de cupons no backend ([coupons.js](file:///d:/Repositorios/OperaBeauty/backend/routes/coupons.js)) e integrado no servidor Express ([server.js](file:///d:/Repositorios/OperaBeauty/backend/server.js)), suportando inserção, listagem com JOIN de serviços, exclusão e incremento de usos no checkout.
  - Implementado os métodos de consumo de cupons no cliente HTTP unificado ([api.js](file:///d:/Repositorios/OperaBeauty/src/lib/api.js)) e o respectivo mapeamento de consultas e escritas no adaptador de compatibilidade ([supabase.js](file:///d:/Repositorios/OperaBeauty/src/lib/supabase.js)), resolvendo de vez o salvamento e exibição de cupons no painel do salão.

- **05/07/2026 - Hotfix no Incremento de Usos de Cupons (Checkout):**
  - Adicionado o endpoint `GET /:id` no backend ([coupons.js](file:///d:/Repositorios/OperaBeauty/backend/routes/coupons.js)) para obter dados de um cupom específico pelo seu ID primário.
  - Adicionado o método REST `api.coupons.get(id)` no cliente de API ([api.js](file:///d:/Repositorios/OperaBeauty/src/lib/api.js)).
  - Ajustado o select no adaptador [supabase.js](file:///d:/Repositorios/OperaBeauty/src/lib/supabase.js) para aceitar buscas por `id` do cupom, permitindo que a busca redundante no checkout funcione de forma isolada sem depender de `tenant_id` e sem quebrar com erro HTTP 400.
  - Implementado tratamento no método `rpc()` do adaptador [supabase.js](file:///d:/Repositorios/OperaBeauty/src/lib/supabase.js) para a RPC `increment_coupon_uses`, interceptando chamadas e incrementando o contador no banco.

- **05/07/2026 - Hotfix no Faturamento e Faturas do Super Admin:**
  - Ajustada a rota `GET /appointments` no backend ([appointments.js](file:///d:/Repositorios/OperaBeauty/backend/routes/appointments.js)) para ler e aceitar o parâmetro `tenant_id` via query string quando o usuário autenticado for `superadmin`.
  - Ajustada a rota `GET /invoices` no backend ([invoices.js](file:///d:/Repositorios/OperaBeauty/backend/routes/invoices.js)) para permitir o filtro por `tenant_id` via query string quando a role for `superadmin`.
  - Atualizado o cliente de API no frontend ([api.js](file:///d:/Repositorios/OperaBeauty/src/lib/api.js)) para incluir `tenant_id` como parâmetro em `api.appointments.list` e `api.invoices.list`.
  - Atualizado o adaptador de compatibilidade no frontend ([supabase.js](file:///d:/Repositorios/OperaBeauty/src/lib/supabase.js)) para passar o filtro `this.filters.tenant_id` nas requisições REST de agendamentos e faturas, resolvendo a listagem em branco na tela de detalhes do salão no painel administrativo master.
  - Traduzidos os status dos agendamentos na listagem de faturamento do Super Admin para o Português do Brasil (ex: "Concluído", "Cancelado") e adicionada estilização elegante via chips coloridos.

- **05/07/2026 - Hotfix na Exibição de Banner do Salão:**
  - Ajustada a exibição do banner promocional na Home do Cliente ([HomeCliente.jsx](file:///d:/Repositorios/OperaBeauty/src/pages/HomeCliente.jsx)) para que a seção de promoção seja renderizada sempre que houver título ou subtítulo promocionais ativos, mesmo sem uma imagem (URL) fornecida.
  - Implementado um fundo degradê dinâmico via `linear-gradient` com as cores primárias e secundárias do estabelecimento caso o banner não possua imagem definida.
  - Atualizado o preview de branding no painel do Gestor ([BrandingCustomizacao.jsx](file:///d:/Repositorios/OperaBeauty/src/pages/admin/BrandingCustomizacao.jsx)) para refletir em tempo real a pré-visualização do degradê degradê, otimizando a experiência White Label.
  - Reposicionado o banner promocional na Home do Cliente ([HomeCliente.jsx](file:///d:/Repositorios/OperaBeauty/src/pages/HomeCliente.jsx)) para ficar logo acima da seção de "Recomendações" (Serviços Especiais), limpando o topo da página onde se encontra a saudação inicial do cliente.

- **05/07/2026 - Múltiplos Banners & Trava por Plano de Assinatura:**
  - Banco de Dados: Adicionadas as colunas `max_banners` (tabela `cap_plans`), `plan_id` (tabela `cap_tenants`) e `banners` JSONB (tabela `cap_tenants`). Criado script de migração para migrar banners legados para o novo formato de array JSONB de forma compatível.
  - Backend: Atualizadas rotas de planos, superadmin e tenants para persistir, ler e validar a quantidade máxima de banners permitida por plano na rota `PUT /branding`. Sincronizado o primeiro banner do array de volta para os campos legados `banner_url`, `banner_title` e `banner_subtitle` no banco para compatibilidade total.
  - Super Admin: Adicionado o campo "Limite de Banners" no gerenciador de planos ([PlanosAdmin.jsx](file:///d:/Repositorios/OperaBeauty/src/pages/superadmin/PlanosAdmin.jsx)) e a seleção de plano de assinatura associado ao salão ([TenantDetailAdmin.jsx](file:///d:/Repositorios/OperaBeauty/src/pages/superadmin/TenantDetailAdmin.jsx)).
  - Painel do Gestor: Implementada a aba de múltiplos banners em customização de branding ([BrandingCustomizacao.jsx](file:///d:/Repositorios/OperaBeauty/src/pages/admin/BrandingCustomizacao.jsx)) com suporte a criação, deleção e edição do banner selecionado, respeitando a trava do plano do salão.
  - Home do Cliente: Implementado carrossel dinâmico deslizante horizontal puro em React/CSS na Home do Cliente ([HomeCliente.jsx](file:///d:/Repositorios/OperaBeauty/src/pages/HomeCliente.jsx)) para alternar automaticamente os banners promocionais cadastrados.
- **Painel de Equipe:** Gestão de staff, acessos e perfil do profissional.
- **Comissões Automatizadas:** Ao cadastrar um profissional, o gestor pode (opcionalmente) definir taxas de comissão. O sistema utilizará esses dados para calcular o pagamento de forma 100% automática a cada serviço concluído.
- **Controle Operacional:** Check-in e checkout de atendimentos.

### 4. Financeiro e Estoque
- **Dashboard e Financeiro:** Fluxo de caixa e histórico de receitas e despesas.
- **Estoque Atrelado a Serviços:** Ao cadastrar um serviço, o gestor pode escolher se ele consome estoque. Se ativado, ele seleciona um ou mais itens da lista de insumos e define a quantidade exata consumida por serviço. A baixa é automática assim que o procedimento for concluído no aplicativo.
- **Vales-Presente (Gift Cards):** Sistema seguro com separação entre ID de Solicitação (para pagamento via PIX direto ao salão) e Código de Resgate (gerado apenas após confirmação do pagamento). Suporta resgates parciais e controle de validade e saldo.
- **Vales-Presente (Gift Cards):** Sistema seguro com separação entre ID de Solicitação (para pagamento via PIX direto ao salão) e Código de Resgate (gerado apenas após confirmação do pagamento). Suporta resgates parciais e controle de validade e saldo.

### 5. Multi Tenant, Roteamento e Assinaturas (SaaS)
- **Criação de Salão (Onboarding):** Feita exclusivamente de forma manual pelo Super Admin (Você).
- **Modelo de Negócio (Plano Único):** O salão paga uma assinatura mensal de **R$ 59,99/mês**, sem limites de profissionais.
- **Gateway de Pagamento (AbacatePay):** Será a **última etapa do projeto** (em fase de aprovação). O pagamento e renovação da assinatura do sistema será feito pelo dono do salão por dentro do painel gerencial.
- **Roteamento Dinâmico (Slug):** Acesso individualizado por salão através da rota `/[nomedosalao]`.
- **Isolamento de Dados:** RLS (Row Level Security) aplicado rigorosamente.

### 6. Retenção, Fidelidade e Gamificação (CRM Plus)
- **Níveis VIP:** Classificação de clientes (Prata, Ouro, VIP, Black) para oferecer status psicológico e atendimento diferenciado.
- **Clube do Salão (Assinaturas):** Possibilidade do lojista vender pacotes recorrentes para previsibilidade de receita.
- **PDV (Ponto de Venda Livre):** Comercialização de produtos físicos de forma avulsa.
- **SaaS Flagging:** As ferramentas de Clube e PDV só ficarão disponíveis para Lojistas cujo Plano SaaS (Super Admin) contemple essas _features_.
- **Carteira Digital (Cashback):** Clientes recebem % do valor do serviço em saldo para o próximo agendamento (incentivo à recorrência).

### 7. Experiência Premium do Cliente Final (App)
- **Self Check-in com Mimos:** Cliente avisa que chegou pelo app e escolhe uma bebida (água, café, espumante). Habilitável pelo painel do lojista.
- **Lookbook / Inspirações:** Galeria de fotos com botão "Quero Fazer Igual" (venda por impulso com pré-preenchimento de agendamento).
- **Vales-Presente (Gift Cards):** Venda de serviços como presente via WhatsApp (condicionado ao Plano SaaS).
- **Indique e Ganhe (Máquina Viral):** Sistema de afiliados onde quem indica ganha Cashback e o amigo ganha desconto (condicionado ao Plano SaaS).

### 8. Inteligência e Comunicação
- **Relatórios BI Lite:** Taxa de retorno de clientes, ranking de profissionais e mapa de calor de horários ociosos (condicionado ao Plano SaaS).
- **Notificações Push:** Lembretes de agendamento (24h/2h antes), lembrete de retorno por intervalo de manutenção e parabéns de aniversário com cupom automático.
- **Lista de Espera Inteligente:** Quando não há horários, a cliente entra numa fila e é notificada automaticamente em caso de cancelamento.
- **Central de Notificações (Sininho 🔔):** Hub unificado in-app para cliente e profissional com todas as interações relevantes.

### 9. Conformidade e Proteção Jurídica
- **Avaliações / NPS:** Tela de 1 a 5 estrelas após atendimento, com média por profissional e nota geral do salão como prova social.
- **Termos e Consentimento Digital (LGPD):** Assinatura digital de termos de consentimento para procedimentos de risco, com registro no CRM (condicionado ao Plano SaaS).

---

## Relatório de Status Atual (Atualizado)

Nesta última grande sprint, concluímos a fundação visual de **todos os 4 módulos principais** do sistema utilizando o novo Design System exportado do Figma via Stitch.

### O que já foi feito (Telas Implementadas):
1. **Módulo Cliente:** Todo o fluxo de login (telefone/senha), cadastro, dashboard inicial, jornada completa de agendamento (serviço, profissional, horário, revisão) e histórico de agendamentos.
2. **Módulo Profissional:** Login da equipe, agenda diária e ficha de CRM da cliente.
3. **Módulo Gestor (Admin):** Dashboard gerencial, gestão financeira, gestão de equipe, controle de estoque, configurações operacionais, gestão de serviços e branding/customização.
4. **Módulo Super Admin:** Painel global do dono da plataforma (SaaS Mestre) e tela de login isolada e super segura.
5. **Arquitetura Base e Integração BD:** O modelo Multi-Tenant foi ativado e todas as telas fundamentais estão integradas. As páginas de Dashboard, Financeiro, Agenda (Profissional e Salão), Gestão de Equipe, Estoque e Serviços realizam operações reais de leitura/escrita e manipulam dados vivos utilizando endpoints REST nativos da API Express com isolamento RLS e transações atômicas no PostgreSQL.
6. **Configurações Operacionais Dinâmicas:** A tabela de bloqueios de datas foi transformada para suportar Exceções Específicas por Data (podendo abrir com horários diferenciados). O calendário geral agora aceita gestão flexível de todos os dias (Domingo a Sábado).
7. **Gestão de Serviços Avançada:** Implementamos o Módulo de Serviços (Módulo Ouro) integrando o controle de tempo de manutenção e o abatimento automático de estoque atrelado ao procedimento. O Dashboard agora prevê e avisa automaticamente os Retornos Agendados (Próximos 30 dias).
8. **Motor de Cupons e Branding Completo:** Sistema de descontos funcional com controle de expiração (data) e limites de quantidade de usos, integrado em tempo real no checkout da cliente. Branding customizável permitindo alterar nome e slug (link) do salão de forma dinâmica.
9. **CRM Aprimorado:** Tela de clientes com rápido acesso para iniciar chamadas no WhatsApp, redefinição segura de senhas pelo gerente e proteção contra links quebrados no painel.

1. **Módulo de Faturas SaaS e Assinaturas:** Painel do Salão integrado à leitura real de suas mensalidades, e painel Mestre (Super Admin) com capacidade de gerar faturas manuais e dar baixa.
2. **Proteção de Acessos Avançada:** Reforçamos o bfcache e roteamento do navegador garantindo que sessões encerradas expulsem usuários imediatamente de painéis de gerência.

### O Sistema Está Pronto para Homologação (V 1.0)!
Todo o core do SaaS Multi-Tenant está implementado. O sistema conta com agendamento autônomo do cliente, CRM atrelado a banco de dados isolado via RLS (Row Level Security) focado por salão, controles de gestão (estoque, serviços, finanças), além do super painel master da franquia.

### Arquitetura de Produção (VPS & Backend Dedicado):
1. **Backend REST Dedicado**: Aplicação servidora nativa em Node.js 20 ESM (Express) com suporte a roteamento REST moderno. O backend gerencia o pool de conexões com o PostgreSQL local/VPS (`opera_app`), as lógicas de controle de sessão/JWT e o isolamento em profundidade de tenants (filtros de segurança RLS baseados no `tenant_id` do JWT do usuário).
2. **Banco de Dados PostgreSQL Próprio**: Instalação conteinerizada do PostgreSQL 16 executando o DDL baseline contido em `init.sql` e gerenciado pelo motor de migrações transacionais (`scripts/migrate.js`). A criptografia de senhas é gerenciada no backend via `bcryptjs`.
3. **Arquitetura 100% Desacoplada de Supabase**: O frontend consome exclusivamente a API REST dedicada através de um cliente unificado de chamadas HTTP (`src/lib/api.js`), eliminando queries de banco diretas e qualquer dependência ou adaptador de SDK legado na interface (Item G1).
4. **Landing Page de Vendas**: Portal "vitrine" do OperaBeauty focado em captar novos donos de salão interessados na assinatura com SEO completo e demonstração interativa.

---

## Guia Oficial de Deploy e Setup na VPS (Ubuntu Server)

Para manter a consistência de DevOps e garantir facilidade em migrações, a aplicação e o banco de dados rodam orquestrados por **Docker Compose**. Este roteiro serve para configurar tanto a máquina virtual de testes local quanto a VPS definitiva em produção.

### 1. Conexão e Sincronização (WinSCP & SSH)
- Para acessar a VPS, você precisa do IP do servidor e da porta SSH (padrão 22). No VirtualBox local em modo NAT, faça o redirecionamento de portas (ex: host porta 2222 para porta 22 da VM) ou coloque em modo Bridge.
- Utilize o **WinSCP** para acessar os arquivos graficamente. Basta inserir Host, Porta, Usuário e Senha. Use o WinSCP para transferir a pasta `OperaBeauty` inteira do seu Windows para dentro da VPS (ex: `/home/seu-usuario/OperaBeauty`).

### 2. Instalação do Docker e Compose na VPS (Ubuntu)
Abra o terminal (PuTTY ou direto no VirtualBox) e execute:
```bash
# Instalar dependências
sudo apt update && sudo apt install -y ca-certificates curl gnupg lsb-release

# Adicionar a chave GPG oficial do Docker
sudo mkdir -p /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg

# Configurar o repositório
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Instalar Docker Engine
sudo apt update && sudo apt install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# Permitir uso sem sudo (faça logoff e login depois)
sudo usermod -aG docker $USER
```

### 3. Rodando o Projeto (Deploy)
Pelo terminal, navegue até a pasta que você copiou via WinSCP:
```bash
cd /home/seu-usuario/OperaBeauty

# Para inicializar a API e o PostgreSQL em segundo plano:
docker compose up -d

# Para verificar se estão rodando:
docker compose ps

# Para ver os logs da API (se houver algum erro):
docker compose logs api
```

### 4. Inicializando o Banco de Dados pela Primeira Vez
Com o container rodando, você deve aplicar o DDL (script que cria as tabelas) da documentação `database.md`:
1. Use o WinSCP ou terminal para colocar o script de criação dentro da VPS ou simplesmente copie-o.
2. Acesse o container do Postgres via terminal:
   ```bash
   docker exec -it operabeauty-db psql -U postgres -d operabeauty
   ```
3. Cole o conteúdo de `database.md` no console e dê enter para estruturar as tabelas SaaS Multi-Tenant.

---

## Histórico de Alterações

- **22/10/2026 - Rebrand Editorial: Minhas Comissões do Profissional (`ComissoesProfissional.jsx`):**
  - **Identidade Rosé Editorial**:
    - Cabeçalho institucional com Playfair Display (*"Minhas comissões"*), subtítulo contextual e segmented control em pílula para seleção de período (**Mês atual**, **Mês anterior**, **Todo o período**) com estados ativos e transições suaves.
    - Grade de 3 KPIs compactos: `A RECEBER (PENDENTE)` (com cálculo dinâmico e mensagem *"Tudo em dia"* quando zerado, conforme regra 9.1.4), `JÁ RECEBIDO (PAGO)` (repasses já liquidados pelo gestor) e `FATURAMENTO GERADO` (volume bruto produzido e contagem de atendimentos concluídos com pluralização rigorosa).
    - Tabela corporativa de extrato de atendimentos com ícones Lucide contextuais (`Calendar`, `Scissors`, `User`), valores monetários BRL alinhados com `tabular-nums lining-nums` via `formatCurrency`, badges de situação em tons pastéis (`Pago` em verde suave e `Pendente` em âmbar), e seletor de paginação configurável.
    - Modo mobile em cartões compactos (`rounded-[18px] border border-line bg-stone-50/50 p-4`) com área de toque confortável.
  - **Testes & Homologação**:
    - Suíte de testes unitários Jest em `backend/tests/comissoesProfissional.test.js` passando 100% (2/2).
    - Compilação Vite limpa em `./dist` em 4.72s.
    - Homologação visual e funcional via browser subagent autenticado gravada em vídeo WebP (`comissoes_homologacao_1792691565839.webp`).

- **22/10/2026 - Correção Crítica: Listagem de Clientes no PDV e Tabela de Métodos de Pagamento:**
  - **Correção da Query de Clientes (`clientService.js`)**:
    - Identificada exceção de banco de dados (`error: column a.appointment_date does not exist`) disparada na rota `GET /api/clients`.
    - A coluna de data de agendamento na tabela canônica `cap_appointments` é `start_time` (e não `appointment_date`). Corrigida a expressão SQL de cálculo da última visita para `MAX(a.start_time) FILTER (WHERE a.status = 'completed') as last_visit`.
  - **Tabela de Métodos de Pagamento do Salão (`cap_tenant_payment_methods`)**:
    - Aplicado no container PostgreSQL o DDL documentado na seção 13 de `database.md` para a tabela `public.cap_tenant_payment_methods` e seu respectivo índice `idx_cap_tenant_payment_methods_tenant`, sanando erro 500 na rota `/giftcards/payment-methods`.
  - **Validação & Testes**:
    - Reconstruída a imagem Docker da API via `docker compose up -d --build api`.
    - Validado no navegador via subagente que o modal de vinculação de clientes no PDV abre com status HTTP 200 listando todos os clientes da base sem erros.

- **22/10/2026 - Item J10.7 (P2) — Configurações Operacionais, Segurança/LGPD e Minha Assinatura (Conclusão da Fase 42):**
  - **Configurações Operacionais (`ConfiguracoesOperacionais.jsx`)**:
    - Alinhamento 1:1 aos tokens Rosé Editorial: cabeçalho com Playfair Display ("Configurações operacionais"), subtítulo institucional e botão de ação primária em pílula bordô `Salvar alterações`.
    - Layout responsivo em 2 colunas com cards elegantes (`rounded-[22px] border border-line bg-white shadow-xs`):
      1. **Jornada de Funcionamento (Padrão)**: lista de dias com switches toggle com a cor brand (`peer-checked:bg-brand`), bloqueio reativo dos inputs de abertura/fechamento em cápsula e alinhamento visual de horários.
      2. **Contato & Localização**: endereço comercial em textarea e inputs dedicados para Instagram, Facebook e WhatsApp comercial com componentes SVG dedicados.
      3. **Métodos de Recebimento PIX**: seletor de tipo de chave PIX (CPF/CNPJ, E-mail, Telefone, Chave Aleatória), chave com fonte mono, titular e documento.
      4. **Regras de Cashback e Fidelidade**: porcentagem e prazo de expiração (com trava educativa se o salão não possuir o Clube no plano).
      5. **Self Check-in & Menu de Espera (Mimos)**: switch toggle e tags dinâmicas com remoção e adição via tecla Enter.
      6. **Exceções de Horário e Feriados**: lista de bloqueios com badges semânticas e modal Rosé Editorial (`rounded-[24px]`) com seleção de dia inteiro ou horário especial.
      7. **Cupons de Desconto**: códigos promocionais, escopo global ou por procedimento, modal Rosé Editorial de criação e exclusão segura.
      8. **Card Informativo**: aviso institucional sobre impactos na grade de horários dos profissionais.
  - **Segurança e Privacidade LGPD (`GestaoLGPD.jsx`)**:
    - Cabeçalho com Playfair Display ("Segurança & privacidade (LGPD)") e badge verde pastel `Conformidade LGPD Ativa`.
    - Grade de 3 KPIs compactos: `TERMOS GERADOS`, `ASSINATURAS PENDENTES` e `ASSINADOS (VÁLIDOS)` com ícones Lucide contextuais.
    - Formulário corporativo para disparar solicitação de consentimento para o app da cliente com seleção de cliente e modelo legal.
    - Histórico de solicitações com status semânticos e hashes criptográficos em fonte mono.
    - Seção de modelos de termos legais com formulário retrátil de cadastro e exclusão segura.
  - **Minha Assinatura (`AssinaturaSaaS.jsx`)**:
    - Redesenho Rosé Editorial com tipografia Playfair Display, status regular em verde pastel, valor mensal formatado BRL via `formatCurrency` (`tabular-nums lining-nums`), situação das faturas e histórico de faturas quitadas.
  - **Testes & Homologação**:
    - Testes automatizados Jest em `backend/tests/configuracoesOperacionaisG10.test.js` passando 100% (6/6).
    - Compilação de produção com Vite (`npm run build`) validada sem advertências e sem erros em 2.60s.
    - Homologação visual e funcional via browser subagent autenticado como Gestor com gravação de sessão em vídeo WebP (`config_lgpd_homologacao_1792687255112.webp`).
    - Encerramento formal de todos os itens da **Fase 42 (REBRAND II - Grupos H e J)** e liberação do item **B8**.

- **21/10/2026 - Item H9 (P2) — Auditoria Visível do Super Admin (suspender, trocar plano, alterar slug):**
  - **Trilha de Auditoria & Governança (`cap_audit_logs`)**:
    - Enriquecidos os serviços `auditService.js` e `superadminService.js` para registrar eventos especializados com transformação de estado (`old_data` e `new_data`), incluindo troca de plano (`UPDATE_TENANT_PLAN`), alteração de slug (`UPDATE_TENANT_SLUG`) e alterações cadastrais (`UPDATE_TENANT`).
    - Vinculação persistente de `tenant_id` garantindo isolamento e relacionamento auditável com `cap_tenants` em suspensões (`SUSPEND_TENANT`) e reativações (`REACTIVATE_TENANT`).
    - Endpoint `GET /api/superadmin/audit-logs` e consulta `getSuperAdminLogs` enriquecidos com `LEFT JOIN cap_tenants` (trazendo nome e slug) e `LEFT JOIN cap_platform_admins` (trazendo o administrador executor), com suporte a filtros via query string por tipo de ação (`action`), salão (`tenant_id`), busca textual (`search`) e paginação.
  - **Frontend Rosé Editorial (`AuditoriaAdmin.jsx`)**:
    - Cabeçalho institucional com pílula de segurança ativa ("Audit Trail Ativo & Imutável"), abas dedicadas para Logs de Segurança e Armazenamento por Studio com contadores dinâmicos.
    - Barra de ferramentas avançada com pílulas de filtragem rápida por ação (**Todas as Ações**, **Suspensões**, **Reativações**, **Troca de Plano**, **Alteração de Slug**, **Edições Gerais**), busca em tempo real com lupa e limpeza em 1 clique.
    - Badges semânticas com código de cores por severidade (`SUSPEND_TENANT` em vermelho/rose, `REACTIVATE_TENANT` em verde esmeralda, `UPDATE_TENANT_PLAN` em âmbar e `UPDATE_TENANT_SLUG` em azul céu).
    - Modal de alta fidelidade `ModalDetalhesAuditoria` exibindo alerta de justificativa da suspensão com confirmação deliberada, diff visual comparativo de transformação de estado (Antes vs Depois) e metadados de IP, data/hora e ID da transação.
  - **Controle Seguro de Slug (`TenantDetailAdmin.jsx`)**:
    - Adicionado botão de desbloqueio deliberado para alteração de link do salão com aviso explícito de impacto em links públicos compartilhados e confirmação gravada na auditoria.
  - **Testes & Homologação**:
    - Testes automatizados Jest em `backend/tests/auditoriaAdminH9.test.js` passando 100% (7/7).
    - Homologação visual e funcional via browser subagent autenticado como Super Admin aprovada com gravação de sessão em vídeo WebP (`superadmin_auditoria_h9_perfeita_1792628377759.webp`).

- **10/07/2026 - Correções Críticas de Layout, Autenticação, Relacionamentos e Gestão de Serviços:**
  - **Layout (Tailwind v4)**: Inclusão do sufixo `!important` nas classes customizadas de utilitários de largura máxima (`@utility max-w-*`) no `index.css` para evitar sobreposição pelas variáveis globais de espaçamento (`--spacing-*`) introduzidas pela nova versão da ferramenta, corrigindo problema crasso de compressão horizontal na tela de Autenticação.
  - **Autenticação (Backend/Frontend)**: Ajuste no middleware de autenticação (`auth.js`) para disparar erro HTTP 401 (Unauthorized) ao invés de 403 em caso de falha na validação do JWT (token expirado). Isso aciona corretamente o interceptador do Frontend (`api.js`), limpando o cache e exigindo relogin sem tela branca.
  - **Relacionamentos e Histórico (Frontend)**: Atualização na renderização do `HistoricoAgendamentos.jsx` para acessar objetos de resposta devidamente "achatados" pelo Express (`service_name` e `staff_name`), abandonando as assinaturas baseadas no modelo "join and nest" (`item.cap_services.name`) que existiam no modelo do Supabase legado.
  - **Gestão de Serviços (Painel)**: Refatoração no modal de cadastro do `GestaoServicos.jsx` para suportar seleção múltipla (Array) de itens de estoque para consumo em um único serviço. O pipeline para a API REST também foi refatorado passando as entradas com o atributo `inputs: []`, persistindo todas as associações iteradas no Banco de Dados Postgres (tabela de junção `cap_service_inventory`).
  - **Gestão de Cupons (Painel)**: Correção na invocação de APIs públicas de leitura de cupons pela tela de `ConfiguracoesOperacionais.jsx`. Adição forçada do querystring `?tenant_id=...` para atender perfeitamente aos schemas rigorosos estabelecidos pelo parser Zod no Gateway Node.js.

- **07/07/2026 - Configuração de Endereço, Redes Sociais, Horários na Login e Novo Design de Profissionais:**
  - Banco de Dados: Adicionadas as colunas `address`, `social_instagram`, `social_facebook` e `social_whatsapp` na tabela `cap_tenants` para armazenar o endereço físico e links das redes sociais do salão.
  - Backend: Atualizadas as rotas `GET /by-slug/:slug` e `PUT /branding` no backend (`tenants.js`) para suportar a leitura e persistência dessas novas configurações.
  - Painel do Gestor: Atualizada a tela de Configurações Operacionais (`ConfiguracoesOperacionais.jsx`) com novos campos de formulário para Localização e Redes Sociais, integrando com o salvamento global de configurações.
  - Portal do Cliente (Login): Atualizada a tela de Login por Telefone (`AcessoTelefone.jsx`) para renderizar condicionalmente botões pílulas de Localização (exibindo endereço em modal com redirecionamento de rotas no Google Maps), Horários (exibindo tabela de funcionamento em modal) e ícones de redes sociais (com links externos seguros), dependendo de sua configuração no banco de dados.
  - Portal do Cliente (Agendamento): Redesenhada a tela de agendamento de profissionais (`AgendamentoProfissionais.jsx`) para substituir os cards verticais com espaços gigantes vazios para fotos por uma listagem horizontal compacta e premium, contendo avatar circular com as iniciais do profissional, cargo, chip de verificação e botão com chevron.
  - Portal do Cliente (Checkout): Corrigido bug de incremento duplo do contador de usos de cupons (`current_uses`) em [AgendamentoRevisao.jsx](file:///d:/Repositorios/OperaBeauty/src/pages/AgendamentoRevisao.jsx) ocasionado por um bloco redundante de update manual rodando após a chamada da RPC `increment_coupon_uses`.

- **05/07/2026 - Refatoração do Layout Móvel do Cliente (Safe Area e BottomNavBar):**
  - Criado o componente unificado `ClienteBottomNavBar` que implementa a navegação no estilo Material Design 3 (onde a pílula colorida verde-água circula apenas o ícone, corrigindo o formato oval achatado).
  - Implementado espaçamento superior de segurança (`pt-[calc(env(safe-area-inset-top,0px)+12px)]`) contra notches de câmera frontal em todas as telas principais do cliente (`HomeCliente`, `PerfilCliente`, `HistoricoAgendamentos` e fluxo de agendamento).

- **04/07/2026 - Hotfix no Adaptador do Supabase (`supabase.js`):**
  - Adicionado suporte ao método `.upsert()` para delegação direta na API REST local de gerenciamento de horários (`api.settings.updateBusinessHours`).
  - Adicionado suporte aos métodos de comparação e filtragem `.lt()` e `.neq()` no query builder mock do Supabase.
  - Implementado filtros de comparação de menor que (`_lt`) e diferença (`_neq`) para avaliações locais/em memória no `executeSelect()`, evitando quebras de tela (tela branca) na listagem e seleção de horários de agendamento por parte do cliente.

- **04/07/2026 - Hotfix na Jornada de Agendamento (Persistência e Tipagem):**
  - Implementada a persistência dos dados de agendamento (`bookingData`) em `sessionStorage` dentro do [BookingContext.jsx](file:///d:/Repositorios/OperaBeauty/src/context/BookingContext.jsx) para prevenir perda de estado na navegação, redirecionamentos ou recarregamento de rotas.
  - Adicionado suporte a atualizações em lote no `updateBooking` (recebendo um objeto), otimizando a seleção de data/hora em [AgendamentoHorarios.jsx](file:///d:/Repositorios/OperaBeauty/src/pages/AgendamentoHorarios.jsx) com uma única chamada em vez de duas.
  - Normalizado o preço do serviço para `Number` em [AgendamentoRevisao.jsx](file:///d:/Repositorios/OperaBeauty/src/pages/AgendamentoRevisao.jsx) para evitar quebras por tipos incompatíveis e erro fatal de `.toFixed(2)` se o valor retornado do banco/API vier como string.

- **04/07/2026 - Hotfix na Listagem de Agendamentos (`HistoricoAgendamentos`):**
  - Corrigido o mapeamento de `cap_appointments` no adaptador do Supabase ([supabase.js](file:///d:/Repositorios/OperaBeauty/src/lib/supabase.js#L149-L159)) para converter a resposta flat da API Express em objetos relacionais aninhados (`cap_services`, `cap_staff`, `cap_clients`) que o frontend original consome.
  - Injetado o valor de `client_id` no mapeamento dos agendamentos no frontend para que a filtragem em memória do query builder do Supabase não descarte os registros devido à ausência desta propriedade no select da API do cliente no backend, resolvendo a listagem vazia na tela "Minha agenda".

- **04/07/2026 - Hotfix no Cancelamento de Agendamentos (`HistoricoAgendamentos`):**
  - Implementada a função `handleCancel` em [HistoricoAgendamentos.jsx](file:///d:/Repositorios/OperaBeauty/src/pages/HistoricoAgendamentos.jsx#L13-L27) para enviar um PUT para `/api/appointments/:id` atualizando o status do agendamento para `'cancelled'`.
  - Associada a função ao evento `onClick` do botão de cancelar no JSX.
  - Adicionado o estado `refreshTrigger` no array de dependências do `useEffect` para recarregar automaticamente a lista de agendamentos na tela após o sucesso da operação.

- **04/07/2026 - Hotfix no Cadastro e Perfil do Cliente (`PerfilCliente` e `CadastroCliente`):**
  - Liberada a rota `GET /clients/:id` no backend ([clients.js](file:///d:/Repositorios/OperaBeauty/backend/routes/clients.js#L28-L38)) para que os próprios clientes autenticados consigam ler o seu próprio perfil (estava bloqueado apenas para `manager` e `professional`, gerando erro `403 Forbidden` e campos em branco na tela de perfil).
  - Incluído suporte à data de nascimento (`birth_date`) no endpoint de cadastro do cliente no backend (`POST /register-client`) e atualizado `registerClient` na API do frontend ([api.js](file:///d:/Repositorios/OperaBeauty/src/lib/api.js#L67-L72)) e adaptador ([supabase.js](file:///d:/Repositorios/OperaBeauty/src/lib/supabase.js#L400-L408)) para trafegá-lo.
  - Adicionado o campo de "Data de Nascimento" obrigatório (`required`) e o respectivo estado `birthDate` na tela de primeiro cadastro do cliente ([CadastroCliente.jsx](file:///d:/Repositorios/OperaBeauty/src/pages/CadastroCliente.jsx#L13-L140)).

- **04/07/2026 - Hotfix na Verificação Anônima de Telefone (`check-phone`):**
  - Criado o endpoint público `GET /auth/check-phone` no backend ([auth.js](file:///d:/Repositorios/OperaBeauty/backend/routes/auth.js#L8-L30)) para permitir que a tela de início do fluxo (`AcessoTelefone.jsx`) verifique a existência do telefone de um cliente sem a necessidade de um token de autenticação (evitando erros de `403 Forbidden`).
  - Atualizado o adaptador do Supabase ([supabase.js](file:///d:/Repositorios/OperaBeauty/src/lib/supabase.js#L143-L151)) para que, ao detectar um select em `cap_clients` contendo os filtros `phone` e `tenant_id`, utilize o novo endpoint público `/check-phone`.

- **05/07/2026 - Atualização Documental de DevOps (Solução de Cache ARP):**
  - Atualizado o guia de VPS ([configuracao_vps.md](file:///d:/Repositorios/OperaBeauty/configuracao_vps.md)) adicionando a seção de Troubleshooting (Parte 7).
  - Documentado o comando `arp -d` do Windows para limpar rapidamente o cache do IP da VM em caso de erros `ECONNREFUSED` ou `ETIMEDOUT` na porta 5432, evitando a necessidade de reconfiguração de rede ou reinício da VM.
- **05/07/2026 - Módulo do Profissional (Tela de Perfil, Câmeras/Notch e Notificações):**
  - Ajustado o padding superior do cabeçalho de administração ([AdminLayout.jsx](file:///d:/Repositorios/OperaBeauty/src/components/admin/AdminLayout.jsx#L133)) para `pt-[calc(env(safe-area-inset-top,0px)+28px)]` a fim de evitar sobreposição com notches de câmera frontal em aparelhos mobile.
  - Ativado o botão de notificações do layout administrativo com a criação de um Toast elegante de feedback temporário (3 segundos).
  - Transformado o avatar de perfil do header e da barra lateral em links interativos apontando para a nova rota `/staff/perfil`.
  - Criada a nova tela [PerfilProfissional.jsx](file:///d:/Repositorios/OperaBeauty/src/pages/PerfilProfissional.jsx) para que funcionários visualizem seu e-mail e editem nome, telefone e senha, integrada via RPC `cap_update_staff`.
  - Atualizada a rota `PUT /staff/:id` no backend ([staff.js](file:///d:/Repositorios/OperaBeauty/backend/routes/staff.js#L84-L122)) para permitir a edição de dados pelo próprio profissional logado (autenticado) e impedir que profissionais modifiquem seu próprio cargo, status de ativação ou taxa de comissão sem perfil de gestor.
  - Incluído o campo `email` no retorno do endpoint `/me` no backend ([auth.js](file:///d:/Repositorios/OperaBeauty/backend/routes/auth.js#L246)) para que o perfil do profissional exiba seu e-mail corretamente em tempo real.

- **05/07/2026 - Hotfix no Carregamento de Exceções de Horários (Agendamento):**
  - Corrigido o bug na tela [AgendamentoHorarios.jsx](file:///d:/Repositorios/OperaBeauty/src/pages/AgendamentoHorarios.jsx#L82) onde a propriedade da exceção de data era acessada incorretamente como `e.date` em vez de `e.exception_date`.
  - Adicionado tratamento defensivo usando `String()` e verificação de existência do campo para evitar quebras se a propriedade estiver ausente ou for nula.

- **05/07/2026 - Hotfix de Timezone de Datas e Formato 24 Horas:**
  - Configurado o parser global do driver do PostgreSQL no backend ([db.js](file:///d:/Repositorios/OperaBeauty/backend/config/db.js)) para retornar colunas do tipo `DATE` como strings cruas no formato `"YYYY-MM-DD"`, evitando conversões indesejadas e distorções causadas por fuso horário.
  - Removido o cast redundante `new Date()` no backend para salvar campos `DATE` na persistência de exceções ([settings.js](file:///d:/Repositorios/OperaBeauty/backend/routes/settings.js)), clientes ([auth.js](file:///d:/Repositorios/OperaBeauty/backend/routes/auth.js)) e faturas ([invoices.js](file:///d:/Repositorios/OperaBeauty/backend/routes/invoices.js)), impedindo deslocamento de datas e colisões na constraint de unicidade do banco.
  - Substituído o input de tipo `time` por inputs de tipo `text` com placeholder `"HH:MM"` e `maxLength={5}` em Configurações Operacionais ([ConfiguracoesOperacionais.jsx](file:///d:/Repositorios/OperaBeauty/src/pages/admin/ConfiguracoesOperacionais.jsx)) para forçar a exibição e manipulação de horários no padrão de 24h brasileiro, independentemente das preferências de idioma do navegador.

- **05/07/2026 - Hotfix no Mapeamento de Horários Especiais de Exceções:**
  - Corrigido o bug na tela [AgendamentoHorarios.jsx](file:///d:/Repositorios/OperaBeauty/src/pages/AgendamentoHorarios.jsx#L86) onde o frontend lia incorretamente `exception.start_time` e `exception.end_time` (que são propriedades de agendamentos) em vez de `exception.open_time` e `exception.close_time` (que são as propriedades de funcionamento nas exceções parciais), garantindo o correto processamento de horários alternativos para o cliente.

- **05/07/2026 - Restabelecimento do Módulo de Cupons de Desconto (cap_coupons):**
  - Adicionado o DDL de criação e cleanup da tabela `cap_coupons` nos arquivos de documentação do banco ([database.md](file:///d:/Repositorios/OperaBeauty/database.md) e [estrutura_db.md](file:///d:/Repositorios/OperaBeauty/estrutura_db.md)), assim como no script do backend ([setup_database.sql](file:///d:/Repositorios/OperaBeauty/backend/scripts/setup_database.sql)).
  - Criado o roteador REST de cupons no backend ([coupons.js](file:///d:/Repositorios/OperaBeauty/backend/routes/coupons.js)) e integrado no servidor Express ([server.js](file:///d:/Repositorios/OperaBeauty/backend/server.js)), suportando inserção, listagem com JOIN de serviços, exclusão e incremento de usos no checkout.
  - Implementado os métodos de consumo de cupons no cliente HTTP unificado ([api.js](file:///d:/Repositorios/OperaBeauty/src/lib/api.js)) e o respectivo mapeamento de consultas e escritas no adaptador de compatibilidade ([supabase.js](file:///d:/Repositorios/OperaBeauty/src/lib/supabase.js)), resolvendo de vez o salvamento e exibição de cupons no painel do salão.

- **05/07/2026 - Hotfix no Incremento de Usos de Cupons (Checkout):**
  - Adicionado o endpoint `GET /:id` no backend ([coupons.js](file:///d:/Repositorios/OperaBeauty/backend/routes/coupons.js)) para obter dados de um cupom específico pelo seu ID primário.
  - Adicionado o método REST `api.coupons.get(id)` no cliente de API ([api.js](file:///d:/Repositorios/OperaBeauty/src/lib/api.js)).
  - Ajustado o select no adaptador [supabase.js](file:///d:/Repositorios/OperaBeauty/src/lib/supabase.js) para aceitar buscas por `id` do cupom, permitindo que a busca redundante no checkout funcione de forma isolada sem depender de `tenant_id` e sem quebrar com erro HTTP 400.
  - Implementado tratamento no método `rpc()` do adaptador [supabase.js](file:///d:/Repositorios/OperaBeauty/src/lib/supabase.js) para a RPC `increment_coupon_uses`, interceptando chamadas e incrementando o contador no banco.

- **05/07/2026 - Hotfix no Faturamento e Faturas do Super Admin:**
  - Ajustada a rota `GET /appointments` no backend ([appointments.js](file:///d:/Repositorios/OperaBeauty/backend/routes/appointments.js)) para ler e aceitar o parâmetro `tenant_id` via query string quando o usuário autenticado for `superadmin`.
  - Ajustada a rota `GET /invoices` no backend ([invoices.js](file:///d:/Repositorios/OperaBeauty/backend/routes/invoices.js)) para permitir o filtro por `tenant_id` via query string quando a role for `superadmin`.
  - Atualizado o cliente de API no frontend ([api.js](file:///d:/Repositorios/OperaBeauty/src/lib/api.js)) para incluir `tenant_id` como parâmetro em `api.appointments.list` e `api.invoices.list`.
  - Atualizado o adaptador de compatibilidade no frontend ([supabase.js](file:///d:/Repositorios/OperaBeauty/src/lib/supabase.js)) para passar o filtro `this.filters.tenant_id` nas requisições REST de agendamentos e faturas, resolvendo a listagem em branco na tela de detalhes do salão no painel administrativo master.
  - Traduzidos os status dos agendamentos na listagem de faturamento do Super Admin para o Português do Brasil (ex: "Concluído", "Cancelado") e adicionada estilização elegante via chips coloridos.

- **05/07/2026 - Hotfix na Exibição de Banner do Salão:**
  - Ajustada a exibição do banner promocional na Home do Cliente ([HomeCliente.jsx](file:///d:/Repositorios/OperaBeauty/src/pages/HomeCliente.jsx)) para que a seção de promoção seja renderizada sempre que houver título ou subtítulo promocionais ativos, mesmo sem uma imagem (URL) fornecida.
  - Implementado um fundo degradê dinâmico via `linear-gradient` com as cores primárias e secundárias do estabelecimento caso o banner não possua imagem definida.
  - Atualizado o preview de branding no painel do Gestor ([BrandingCustomizacao.jsx](file:///d:/Repositorios/OperaBeauty/src/pages/admin/BrandingCustomizacao.jsx)) para refletir em tempo real a pré-visualização do degradê degradê, otimizando a experiência White Label.
  - Reposicionado o banner promocional na Home do Cliente ([HomeCliente.jsx](file:///d:/Repositorios/OperaBeauty/src/pages/HomeCliente.jsx)) para ficar logo acima da seção de "Recomendações" (Serviços Especiais), limpando o topo da página onde se encontra a saudação inicial do cliente.

- **05/07/2026 - Múltiplos Banners & Trava por Plano de Assinatura:**
  - Banco de Dados: Adicionadas as colunas `max_banners` (tabela `cap_plans`), `plan_id` (tabela `cap_tenants`) e `banners` JSONB (tabela `cap_tenants`). Criado script de migração para migrar banners legados para o novo formato de array JSONB de forma compatível.
  - Backend: Atualizadas rotas de planos, superadmin e tenants para persistir, ler e validar a quantidade máxima de banners permitida por plano na rota `PUT /branding`. Sincronizado o primeiro banner do array de volta para os campos legados `banner_url`, `banner_title` e `banner_subtitle` no banco para compatibilidade total.
  - Super Admin: Adicionado o campo "Limite de Banners" no gerenciador de planos ([PlanosAdmin.jsx](file:///d:/Repositorios/OperaBeauty/src/pages/superadmin/PlanosAdmin.jsx)) e a seleção de plano de assinatura associado ao salão ([TenantDetailAdmin.jsx](file:///d:/Repositorios/OperaBeauty/src/pages/superadmin/TenantDetailAdmin.jsx)).
  - Painel do Gestor: Implementada a aba de múltiplos banners em customização de branding ([BrandingCustomizacao.jsx](file:///d:/Repositorios/OperaBeauty/src/pages/admin/BrandingCustomizacao.jsx)) com suporte a criação, deleção e edição do banner selecionado, respeitando a trava do plano do salão.
  - Home do Cliente: Implementado carrossel dinâmico deslizante horizontal puro em React/CSS na Home do Cliente ([HomeCliente.jsx](file:///d:/Repositorios/OperaBeauty/src/pages/HomeCliente.jsx)) para alternar automaticamente os banners promocionais cadastrados.
  - Hotfix Carrossel: Corrigido o cálculo de translação do carrossel deslizante (`translateX`) para considerar a proporção de divisão da largura do wrapper em relação ao total de banners ativos, eliminando o estouro de layout/tela branca ao mudar de slide.
  - Logomarca do Salão: Integrada a exibição dinâmica do `logo_url` nos cabeçalhos e telas de jornada do cliente: Home ([HomeCliente.jsx](file:///d:/Repositorios/OperaBeauty/src/pages/HomeCliente.jsx)), Histórico ([HistoricoAgendamentos.jsx](file:///d:/Repositorios/OperaBeauty/src/pages/HistoricoAgendamentos.jsx)), Perfil ([PerfilCliente.jsx](file:///d:/Repositorios/OperaBeauty/src/pages/PerfilCliente.jsx)), login por telefone ([AcessoTelefone.jsx](file:///d:/Repositorios/OperaBeauty/src/pages/AcessoTelefone.jsx)), login por senha ([AcessoSenha.jsx](file:///d:/Repositorios/OperaBeauty/src/pages/AcessoSenha.jsx)) e cadastro ([CadastroCliente.jsx](file:///d:/Repositorios/OperaBeauty/src/pages/CadastroCliente.jsx)), substituindo ícones estáticos genéricos.
  - Safe Area contra Notches de Câmeras: Adicionado o recuo superior dinâmico `safe-area-inset-top` contra notches e lentes de câmera frontal de smartphones na tela de colocar senha e cadastro (com Top App Bar mini) e no topo da tela de login por telefone (com a logo grande centralizada).
  - Limpeza de Arquivos Mortos e Refatoração: Excluídas as rotas legadas e imports antigos em [App.jsx](file:///d:/Repositorios/OperaBeauty/src/App.jsx), deletadas as páginas legadas da versão anterior do frontend (Dashboard, Clients, Birthdays, Settings, Agenda, Services, Employees, Inventory, PublicBooking, Maintenance, ProfileSettings, ProfessionalPortal) e removidos scripts utilitários órfãos e de teste rápidos na raiz do backend (atualizar_emails, check_tenants, migration_procedures, migration_staff, reset_caco, reset_password, test_api, test_proc, ver_proc), além da exclusão do arquivo DDL duplicado `estrutura_db.md`.

- **10/07/2026 - Padronização de Logs no Backend (Pino):**
  - Backend: Substituição de todas as ocorrências residuais de `console.error` em todos os endpoints de rota Express por `req.log.error` utilizando a instância do logger estruturado do Pino (`pino-http`), evitando logs desestruturados no terminal/produção e exposição de stack traces.

- **10/07/2026 - Migração do Dashboard do Gestor (Supabase → API Express):**
  - Backend: Incluída a coluna `s.maintenance_days` no select da rota `GET /appointments` para permitir que o gestor receba o tempo de manutenção do serviço e calcule os retornos na tela de visão geral.
  - Painel do Gestor (Dashboard): Refatorada a tela [DashboardAdmin.jsx](file:///d:/Repositorios/OperaBeauty/src/pages/admin/DashboardAdmin.jsx) para remover a dependência direta do SDK do Supabase e migrar as consultas de faturamento, atendimentos, estoque, aniversariantes e retornos de manutenção para consumirem a API local Express através do cliente unificado `api`. Adaptados os campos mapeados para ler os retornos flats da API.

- **10/07/2026 - Migração de Gestão de Serviços, Equipe, Clientes, Financeiro e Estoque (Módulo Gestão):**
  - Refatorados os arquivos [GestaoServicos.jsx](file:///d:/Repositorios/OperaBeauty/src/pages/admin/GestaoServicos.jsx), [GestaoEquipe.jsx](file:///d:/Repositorios/OperaBeauty/src/pages/admin/GestaoEquipe.jsx), [GestaoClientes.jsx](file:///d:/Repositorios/OperaBeauty/src/pages/admin/GestaoClientes.jsx), [GestaoFinanceira.jsx](file:///d:/Repositorios/OperaBeauty/src/pages/admin/GestaoFinanceira.jsx) e [ControleEstoque.jsx](file:///d:/Repositorios/OperaBeauty/src/pages/admin/ControleEstoque.jsx) para eliminar o Supabase SDK. As operações de listagem, CRUD, alteração de status e redefinição de senhas foram migradas para utilizar os endpoints REST equivalentes expostos pela API Express.

- **10/07/2026 - Migração de Assinatura, Configurações e Branding (Módulo Gestão - Conclusão):**
  - Backend: Adicionada a rota `GET /settings/payment-gateway` em [settings.js](file:///d:/Repositorios/OperaBeauty/backend/routes/settings.js) para consulta segura da configuração de gateway ativa no banco.
  - Frontend: Adicionado o método `getPaymentGateway` no cliente `api` em [api.js](file:///d:/Repositorios/OperaBeauty/src/lib/api.js).
  - Assinatura SaaS: Refatorado [AssinaturaSaaS.jsx](file:///d:/Repositorios/OperaBeauty/src/pages/admin/AssinaturaSaaS.jsx) para remover o Supabase SDK, consumindo faturas e gateway via API local.
  - Configurações Operacionais: Refatorado [ConfiguracoesOperacionais.jsx](file:///d:/Repositorios/OperaBeauty/src/pages/admin/ConfiguracoesOperacionais.jsx) para migrar a persistência de jornadas, exceções, cupons ativos e listagem de serviços para a API Express. Adaptada a exibição de cupons no JSX para ler dados flats.
  - Branding e Customização: Refatorado [BrandingCustomizacao.jsx](file:///d:/Repositorios/OperaBeauty/src/pages/admin/BrandingCustomizacao.jsx) para salvar cores, banners e logo via `api.tenants.updateBranding(...)`. Adicionada restrição de somente-leitura ao campo Link do Salão (slug) no painel do inquilino para garantir estabilidade das rotas do sistema.

- **10/07/2026 - Migração do Login do Super Admin (Módulo Super Admin - Parte 4):**
  - Frontend: Refatorado o arquivo [SuperAdminLogin.jsx](file:///d:/Repositorios/OperaBeauty/src/pages/superadmin/SuperAdminLogin.jsx) para remover o SDK do Supabase. A autenticação do Super Admin foi migrada para chamar o endpoint seguro `/auth/login-superadmin` do Express através do cliente HTTP unificado `api`. O token JWT e os dados de perfil retornados são persistidos localmente no `localStorage` sob as chaves `operabeauty_token` e `operabeauty_user` para manter a sessão ativa.

- **10/07/2026 - Migração da Gestão de Planos (Módulo Super Admin - Parte 4):**
  - Frontend: Refatorado o arquivo [PlanosAdmin.jsx](file:///d:/Repositorios/OperaBeauty/src/pages/superadmin/PlanosAdmin.jsx) para remover o SDK do Supabase. A listagem de planos, ordenação local por preço, criação, edição e inativação/ativação foram portadas para consumir o cliente de API Express local (`api.plans`). O logout do painel master também foi migrado para chamar `api.auth.logout()`.

- **10/07/2026 - Migração da Lista de Salões e Modal de Criação (Módulo Super Admin - Parte 4):**
  - Frontend: Refatorados os arquivos [TenantListAdmin.jsx](file:///d:/Repositorios/OperaBeauty/src/pages/superadmin/TenantListAdmin.jsx) e [CreateTenantModal.jsx](file:///d:/Repositorios/OperaBeauty/src/components/superadmin/CreateTenantModal.jsx) para remover o SDK do Supabase. A listagem de salões é carregada via `api.superadmin.listTenants()` e os filtros de pesquisa, ordenação e paginação são processados localmente em memória. O modal de onboarding do salão foi reestruturado para carregar pacotes via `api.plans.list()` e persistir tanto o inquilino (`api.superadmin.createTenant`) quanto seu gestor inicial (`api.superadmin.createStaff`) de forma segura via chamadas REST da API.

- **10/07/2026 - Migração dos Detalhes do Salão (Módulo Super Admin - Parte 4):**
  - Frontend: Refatorado o arquivo [TenantDetailAdmin.jsx](file:///d:/Repositorios/OperaBeauty/src/pages/superadmin/TenantDetailAdmin.jsx) para remover o SDK do Supabase. Adicionado o método administrativo `api.superadmin.getTenant` no cliente de API. Todas as coletas de sub-informações (planos, dados de cadastro, equipe, clientes, agendamentos e faturas) foram migradas para utilizar endpoints REST da API Express. Também foram refatoradas as operações de alteração cadastral do salão, geração de cobrança manual, baixa de fatura, reset de senha do profissional via API e redefinição de senha do cliente via API.

- **10/07/2026 - Migração de Ajustes Globais da Plataforma (Módulo Super Admin - Parte 4):**
  - Backend: Criadas as rotas protegidas `GET /superadmin/settings` e `POST /superadmin/settings` em [superadmin.js](file:///d:/Repositorios/OperaBeauty/backend/routes/superadmin.js) para carregar e salvar as credenciais e configurações do gateway SaaS da plataforma (Mercado Pago, Stripe, etc.) de forma segura na tabela `cap_platform_settings`.
  - Frontend: Adicionados os métodos `getPlatformSettings` e `savePlatformSettings` em [api.js](file:///d:/Repositorios/OperaBeauty/src/lib/api.js). Refatorado o arquivo [SettingsAdmin.jsx](file:///d:/Repositorios/OperaBeauty/src/pages/superadmin/SettingsAdmin.jsx) para remover o SDK do Supabase e integrar as lógicas de leitura/gravação das chaves de pagamento e de encerramento de sessão com a API do Express.

- **10/07/2026 - Migração do Dashboard Principal (Módulo Super Admin - Conclusão da Parte 4):**
  - Frontend: Refatorado o arquivo [SuperAdmin.jsx](file:///d:/Repositorios/OperaBeauty/src/pages/superadmin/SuperAdmin.jsx) para remover o SDK do Supabase. A listagem de planos contratados foi migrada para `api.plans.list()`, e a listagem do diretório de salões foi integrada com `api.superadmin.listTenants()`, processando busca em tempo real, ordenação alfabética e paginação em memória no frontend. A ação de encerramento de sessão master foi direcionada para `api.auth.logout()`.

- **10/07/2026 - Fase 34: Hardening Backend (Fase 2 - Conclusão):**
  - Backend: Implementada validação de esquemas Zod em todas as rotas restantes (`coupons.js`, `staff.js`, `services.js`, `settings.js` e `superadmin.js`).
  - Backend (Segurança em Cupons): Refatorada a rota `POST /coupons/:id/redeem` em [coupons.js](file:///d:/Repositorios/OperaBeauty/backend/routes/coupons.js) para introduzir isolamento estrito por `tenant_id`, validar limite de utilizações (`max_uses`) e data de expiração (`expires_at`).
  - Frontend (Segurança em Cupons): Refatorada a chamada `api.coupons.redeem` em [api.js](file:///d:/Repositorios/OperaBeauty/src/lib/api.js) e em [AgendamentoRevisao.jsx](file:///d:/Repositorios/OperaBeauty/src/pages/AgendamentoRevisao.jsx) para enviar o `tenant.id` durante a finalização da compra.
  - Backend (Prevenção SQL Injection): Corrigida vulnerabilidade de interpolação SQL na paginação da rota `GET /appointments` em [appointments.js](file:///d:/Repositorios/OperaBeauty/backend/routes/appointments.js), parametrizando `LIMIT` e `OFFSET` como parâmetros seguros da query string.

- **10/07/2026 - Auditoria de Segurança e Infraestrutura (Fases 3 a 5):**
  - **Sessões e Dispositivos:** Implementado Device Fingerprinting e vinculação do Refresh Token ao IP/User-Agent para mitigar roubo de sessão. Schema da tabela `cap_refresh_tokens` ajustado via migration.
  - **Hardening do Servidor:** Documentado e configurado no `configuracao_vps.md` o uso de UFW (firewall), Fail2ban e bloqueio de SSH por senha para máxima proteção da VPS de produção.
  - **LGPD:** Criado processo de anonimização estrita de dados sensíveis na rota `DELETE /api/clients/me/anonymize` e de exportação de dados em `GET /api/clients/me/export`. O consentimento obrigatório foi incluído na tela de cadastro.
  - **Logs e Webhooks:** Implementada rotação diária e limite de tamanho de logs com o módulo `pino-roll`. Adicionado envio imediato de alertas 500 para Discord/Telegram via webhook.
  - **Rate Limiting e Healthchecks:** Criado limitação de uso global (`express-rate-limit`) com limites específicos para rotas sensíveis, além de healthcheck atrelado à sanidade do banco Postgres.
  - **Testes e CI/CD:** Escrita de suíte completa de segurança (IDOR, Cross-Tenant e Zod Regexes) em `tests/routes/security.test.js`. Criado pipeline de Integração Contínua no GitHub Actions para PRs. Pipeline de Deploy Automatizado mantido preparado em `.github/workflows/ci.yml`.
  - **Manutenção Automatizada:** Criado cron script local para purgar diariamente tokens expirados do banco (`scripts/cleanup_tokens.sh`).

- **19/07/2026 - Fase 9: Expansão do Modelo de Negócios (Itens 9.2 a 9.5) [Concluída]:**
  - **Clube do Salão (Assinaturas - 9.2)**: Criadas tabelas para controle de planos recorrentes (`cap_salon_memberships`) e créditos de clientes (`cap_client_memberships`). Desenvolvida a tela de gestão de planos e assinantes no painel do gerente (`GestaoAssinaturas.jsx`) e a interface do cliente final para consulta de créditos e contratação simulada (`ClubeFidelidade.jsx`). Integrado o decremento automático de créditos ao concluir agendamentos vinculados a assinaturas.
  - **Caixa Rápido (PDV - 9.3)**: Implementado módulo de checkout físico para vendas diretas de produtos de revenda (`PDV.jsx`) com seletor de clientes opcional, totalizadores e métodos de pagamento integrados (Pix, cartões e dinheiro), com baixa automática no estoque de inventário e registro histórico de vendas.
  - **Feature Flagging Premium (9.4)**: Desenvolvido middleware de proteção de rotas no Express (`featureFlagMiddleware.js`) condicionando acessos ao Clube de Assinaturas e PDV às funcionalidades contratadas no plano SaaS (`cap_plans.features`) do salão. No frontend, criadas barreiras de redirecionamento de URL (`FeatureProtectedRoute`) e a tela de bloqueio com convite de upgrade (`UpgradePlanRequired.jsx`), ocultando também os respectivos links da barra de navegação administrativa.
  - **Carteira Digital e Cashback (9.5)**: Criado módulo completo de Cashback Automático e carteira digital com expiração configurável. Adicionadas as tabelas `cap_client_wallets` e `cap_wallet_transactions`. Desenvolvido backend em `walletService.js` integrado à conclusão de agendamentos e ao resgate como desconto no checkout (`AgendamentoRevisao.jsx`). No frontend, criada a interface de extrato (`FidelidadeCarteira.jsx`), card dinâmico com saldo na Home do cliente e inputs de parametrização no painel gerencial (`ConfiguracoesOperacionais.jsx`).

- **25/07/2026 - Validação Pré-Go-Live na VPS (Fases 16.2 e 17.2 Concluídas):**
  - **Homologação Local (17.2)**: Concluídos e validados os testes em ambiente local Windows via Docker Desktop (`docker compose up -d --build`) no endereço `https://localhost`.
  - **Prontidão Caddy / TLS (16.2)**: Auditado e validado o arquivo `Caddyfile`, confirmando que o proxy reverso está configurado com `{$DOMAIN:localhost}`, sem forçar certificado de staging ou CAs de fallback, deixando o sistema pronto para obtenção automática de certificado de produção para `operabeauty.tech` ao iniciar na VPS.

- **25/07/2026 - Fase 18: Portal do Profissional (Comissões e Autoatendimento) [Concluída]:**
  - **Isolamento de Dados no Backend (18.1)**: Reforçada a segurança na rota de listagem de agendamentos (`GET /api/appointments`) e consulta de detalhes (`getAppointmentById`), impondo o filtro estrito pelo ID do usuário quando logado com o cargo `professional`, evitando IDOR ou visualização cruzada de agendas/faturamentos entre colegas de trabalho.
  - **Minhas Comissões (18.2)**: Desenvolvida nova tela no frontend (`ComissoesProfissional.jsx`) para que os profissionais do salão possam acompanhar com total transparência seus ganhos acumulados, faturamento produzido, comissões pendentes de pagamento e histórico de comissões pagas, com filtro de período mensal.
  - **Meu Perfil e Senha (18.3)**: Aprimorada a tela de gestão cadastral do profissional (`PerfilProfissional.jsx`) alinhando-a ao novo Design System e conectando validação Zod rigorosa no frontend e backend para troca segura de senha e alteração de nome de exibição.
  - **Adequação de Navegação (18.4)**: Expostos os links "Minhas Comissões" e "Meu Perfil" diretamente no menu lateral de administração (`AdminLayout.jsx`) e no menu de contexto do profissional (`ProfessionalSidebar.jsx`), registrando a rota `/staff/comissoes` protegida por autenticação em `App.jsx`.
- **19/10/2026 - Fase 41: Rebranding & Design System Rosé Editorial (Plano de Melhorias v1.0) [Em Andamento]:**
  - **A1 — Tokens e Tema Padrão Rosé**: Integrada a paleta oficial "Rosé Editorial" no Tailwind v4 (`src/index.css`), configurando variáveis `--color-bg: #FBF7F5`, `--color-surface: #FFFFFF`, `--color-ink: #2B2327`, `--color-ink-soft: #6F6168`, `--color-brand: #8E3B4E`, `--color-brand-accent: #B76E79`, `--color-brand-tint: #F6E4E4`, `--color-gold: #C9A66B`, `--color-line: #EADFDC`, além das famílias tipográficas Playfair Display e Plus Jakarta Sans. Configurada injeção dinâmica em `:root` em `TenantContext.jsx` e `BrandingCustomizacao.jsx`.
  - **C9 — Liberar Zoom Mobile**: Removida a restrição `user-scalable=no` e `maximum-scale=1.0` da meta tag viewport no `index.html`, além de inclusão de conexões `preconnect` para otimização de performance no carregamento das fontes.
  - **Docker Desktop & Ambiente Local**: Atualizado `docker-compose.yml` para rotear Caddy localmente na porta 8080 (evitando colisões de portas locais), com proxy transparente para a API (`operabeauty-api`) e PostgreSQL (`operabeauty-db`). Build e deploy local validados com sucesso no container Caddy.
  - **L1 — Redesenho Completo da Landing Page de Vendas (Rosé Editorial)**: Reestruturação completa da rota `/` (`LandingPage.jsx`) reproduzindo com fidelidade total o design `L1 · Landing page de vendas (desktop)@2x.png`. Implementadas todas as seções: Hero com mockup realista do smartphone e card flutuante de lembrete, tríade de benefícios elevados, fluxo de 3 passos, mostruário visual dos 6 temas White-Label com paleta de cores, grade dos 6 módulos operacionais, precificação com os 4 novos planos (Solo, Essencial, Premium e Signature), depoimento em destaque com citação, sanfona/accordion expansível de FAQ, faixa final vinho de alta conversão, e modais elegantes para iniciar teste grátis (leads com WhatsApp) e entrada de salões parceiros.
  - **B1 — Redesenho da Tela de Login e Componentes Universais de UI (Rosé Editorial)**:
    - **Componentes Universais**: Criados os componentes base reutilizáveis em `src/components/ui/`: `Botao.jsx` (variantes primário, secundário, contorno e texto, com altura 52px, pílula, foco acessível e spinner), `Chip.jsx` (altura 36px, fundo brand-tint, texto brand), `CampoTexto.jsx` (altura 56px, raio 18px, foco suave, ícone e tipografia 16px para evitar auto-zoom no iOS) e `CampoTelefone.jsx` (máscara de telefone brasileiro `(XX) XXXXX-XXXX`, tipo e inputmode `tel`).
    - **AcessoTelefone (`1 · Login@2x.png`)**: Reestruturação com fidelidade 1:1 à referência visual. Inclui logo circular de 72px com anel dourado e monograma elegante com a inicial do salão em Playfair Display itálico (fallback quando sem logo cadastrado), card de foto nítida do salão com composição abstrata de formas circulares em tons rosé, tipografia em Playfair Display ("Que bom ter você aqui"), slogan editável, campo com máscara telefônica, botão de ação em cor cheia permanente (`Continuar →`) com validação amigável, pílulas de ação rápida exibidas dinamicamente (Endereço com modal e link do Google Maps, Horários com tabela semanal completa de funcionamento, e Instagram), e link de acesso rápido para equipe/gestão.
  - **B2 & B3 — Redesenho da Tela de Início e Navegação Inferior (Rosé Editorial)**:
    - **HomeCliente (`2 · Início@2x.png`)**: Reestruturação completa com cabeçalho sticky elegante (logo circular, título do salão em Playfair Display e sino de notificações com indicador de mensagens não lidas). Faixa fina de push notification ("Receber lembrete 24h antes?") com ativação e dispensa em memória local. Saudação editorial personalizada ("Olá, {nome}"). Cartão "SEU PRÓXIMO HORÁRIO" com badge em destaque contendo o dia da semana ("QUA") e dia do mês em serifada, dados do serviço e profissional, acompanhado de botões com contorno para remarcação e visualização de detalhes (com modal completo de informações e endereço). Estado sem agendamento acolhedor convidando para o agendamento. Botão de ação primária dominante de 52px ("+ Agendar novo horário"). Atalhos rápidos em chips para "Repetir último serviço" (que recupera o serviço concluído mais recente) e "Indicar uma amiga" (com modal de compartilhamento para WhatsApp e link de indicação). Cartão de Fidelidade/Clube com moldura dourada e indicador de sessões disponíveis. Carrossel de banners com cantos de 22px e vitrine horizontal de serviços em destaque. Remoção do atalho duplicado "Meus Agendamentos" da Home, centralizando na navegação inferior.
    - **ClienteBottomNavBar (`B3`)**: Barra fixa inferior com backdrop blur e suporte a safe area, contendo 5 abas integradas (Início, Agenda, botão central elevado "Agendar" (+) de 56px com sombra e ring protetor, Clube e Perfil), com ocultamento automático inteligente durante todo o funil de agendamento de serviços.
    - **Hotfix de Contraste e Acessibilidade (WCAG AAA)**: Correção nos elementos com baixa visibilidade identificados na tela inicial do cliente (`HomeCliente.jsx` e `Chip.jsx`):
      1. Faixa superior de lembretes: Substituído o fundo escuro/indeterminado por fundo rosé suave fixo `#F6E4E4` com borda sutil, texto nítido em tinta editorial `#2B2327`, botão "Ativar" em cor de destaque com texto branco e botão de fechar visível.
      2. Botões de atalho (Chips "Repetir último serviço" e "Indicar uma amiga"): Atualizado o componente universal `Chip.jsx` para utilizar fundo rosé pastel `#F6E4E4` e texto em destaque com borda suave, eliminando qualquer texto sobreposto a fundo escuro.
      3. Banner Promocional do Salão (Fallback): Atualizada a composição para fundo rosé claro `#F6E4E4` com formas artísticas em degradê e badge central translúcido em alto contraste (`bg-white/85 text-brand`), garantindo legibilidade imediata do texto `[BANNER PROMOCIONAL DO SALÃO]`.
      4. Card sem agendamento e modais: Círculo de ícone de calendário e ícone do modal de indicação padronizados com fundo `#F6E4E4` e contraste impecável.
      5. `TenantContext.jsx`: Padronizada a injeção de `--color-brand-tint` com fallback para `#F6E4E4` e limpeza de Service Workers obsoletos para garantir renderização instantânea sem caches antigos.

- **20/10/2026 - Fase 41: B4 — Redesenho da Tela de Serviços (Rosé Editorial) [Concluída]:**
  - **Fidelidade Visual 1:1 (`3 · Serviços@2x.png`)**: Reestruturação de `AgendamentoServicos.jsx` e `CartaoServico.jsx` alinhada à direção de arte Rosé Editorial.
  - **Topo do Fluxo e Progresso**: Botão voltar circular de 40px, barra de progresso horizontal rosé editorial de 6px (marcando "1 de 4", 25%) perfeitamente centralizada e sem navegação inferior (`ClienteBottomNavBar`).
  - **Tipografia e Categorias**: Título "Escolha seu serviço" em Playfair Display 28px, subtítulo "Pode escolher mais de um." e barra horizontal de chips em pastel rosé `#F6E4E4` com ordenação canônica (`Todos`, `Cabelo`, `Unhas`, `Sobrancelha`, `Estética`), além de busca inteligente ativada automaticamente quando o salão possuir mais de 12 serviços.
  - **Cartões Compactos Universais (`CartaoServico.jsx`)**: Altura compacta ~72px permitindo 5 a 6 serviços visíveis por tela sem rolagem. Ícones contextuais dinâmicos (Tesoura para cortes, escovas e hidratações; Olho para sobrancelha; Brilhos para manicure/unhas). Preço destacado em cor da marca (`#8E3B4E`), duração legível e botão circular de seleção (36px com contorno e `+` quando livre; fundo vinho sólido e checkmark `✓` quando selecionado). Adicionada borda `border-[1.5px] border-brand` ao cartão selecionado e suporte a acessibilidade total (`role="checkbox"`, `aria-checked`, `aria-pressed`, controle por teclado).
  - **Barra Fixa Inferior**: Resumo dinâmico da seleção ("{n} serviços · {duração total}"), valor total em Playfair Display com numerais alinhados (`tabular-nums` / lining figures contra desalinhamento da fonte) e botão de ação primária "Continuar →" de 52px que prossegue para a seleção de profissionais (`/agendar/profissionais`).
  - **Integração de Ambiente**: Mapeamento do volume `./dist:/srv/dist:ro` no serviço Caddy do `docker-compose.yml` para reflexão em tempo real das compilações, ajuste de proxy de desenvolvimento em `vite.config.js` para a porta 5001 e validação com browser subagent.

- **20/10/2026 - Fase 41: B5 — Redesenho da Tela de Data e Horário (Rosé Editorial) [Concluída]:**
  - **Fidelidade Visual 1:1 (`4 · Data e horário@2x.png`)**: Reestruturação de `AgendamentoHorarios.jsx` e criação do componente universal `src/components/ui/FaixaDeDias.jsx`.
  - **Componente Universal `FaixaDeDias.jsx`**: Carrossel horizontal elegante com os próximos 14 dias navegáveis, exibindo dia da semana abreviado em caixa alta, dia do mês em Playfair Display, status de disponibilidade (aberto/fechado), estado ativo com destaque na cor da marca e botão circular final com ícone de calendário para abertura de modal completo de calendário mensal.
  - **Eliminação de Input Nativo**: Eliminado o `<input type="date">` padrão do sistema operacional, substituído pela experiência tátil de chips verticais e modal integrado.
  - **Card Resumo Superior**: Bloco fixo discreto com fundo surface e borda suave mostrando o resumo do agendamento: `{serviço} · {duração} com {profissional}` e link rápido para troca de profissional.
  - **Grade de Horários em 3 Colunas**: Divisão estrita em períodos do dia (MANHÃ, TARDE e NOITE) em slots compactos de 44px de altura, estados interativos suaves, slots ocupados marcados com `line-through` e desabilitados.
  - **Lista de Espera Integrada**: Link contextual "Dia lotado? Entrar na lista de espera" conectado ao `WaitlistModal.jsx`.
  - **Barra Fixa Inferior**: Indicação completa por extenso da data e hora escolhida ("{dia_sem}, {dia} de {mes} · {hora}") e botão de 52px "Continuar →" avançando para a tela de revisão e confirmação (`/agendar/revisao`).

- **20/10/2026 - Fase 41: B6 — Redesenho de Revisão e Confirmação (Rosé Editorial) [Concluída]:**
  - **Fidelidade Visual 1:1 (`5 · Confirmação@2x.png`)**: Reestruturação de `AgendamentoRevisao.jsx` e `AgendamentoConfirmado.jsx`.
  - **Tela de Revisão (`AgendamentoRevisao.jsx`)**: Topo do fluxo com botão voltar circular (40px) e barra de progresso horizontal rosé editorial preenchida em 75% ("3 de 4"); listagem consolidada de serviços, profissional selecionado e data/hora com botões de alteração rápida; integração completa com validação de cupons, abatimento de vale-presente e toggle funcional de cashback; resumo financeiro detalhado com numerais alinhados (`tabular-nums`) e botão de ação primária de 52px.
  - **Tela de Confirmação (`AgendamentoConfirmado.jsx`)**: Círculo de checkmark animado duplo (externo `#F6E4E4`, interno `#8E3B4E`), tipografia editorial com saudação calorosa "Tudo certo, {nome}!", subtítulo informativo, cartão-resumo branco de 24px de raio, faixa de lembrete 24h antes com ativação de notificações, confetes com a paleta Rosé Editorial, botão primário "Adicionar ao calendário" com download de arquivo `.ics` com fuso local brasileiro, e botão "Ver meus agendamentos" conectado ao histórico do cliente.

- **20/10/2026 - Fase 41: B7 — Histórico/Agenda e Perfil do Cliente (Rosé Editorial) [Concluída]:**
  - **Conversão Completa do Módulo Cliente**: `HistoricoAgendamentos.jsx` e `PerfilCliente.jsx` totalmente alinhados aos tokens universais e estética do Rosé Editorial.
  - **Minha Agenda (`HistoricoAgendamentos.jsx`)**: Segmented control pílula ("Próximos" e "Concluídos"), cartões com badge de data estilizado, cancelamento seguro, modal de Self Check-in de mimos para atendimentos do dia, ação "Remarcar" em 1 toque nos procedimentos anteriores (repasse imediato ao fluxo de agendamento), estados vazios acolhedores com atalho para agendamento e paginação.
  - **Meu Perfil (`PerfilCliente.jsx`)**: Monograma elegante da cliente com anel dourado, badge VIP/Fidelidade, edição cadastral limpa, validação dinâmica de senha (requisitos com feedback visual), atalhos de vales-presente e programa de indicação, e conformidade rigorosa com a LGPD (exportação em JSON e exclusão/anonimização com confirmação dupla).
  - **Clube de Assinaturas (`ClubeFidelidade.jsx`)**: Reestruturação alinhada ao design Rosé Editorial com banner degradê, badge de clube exclusivo, cartões com cantos de 24px e preços em lining figures.
  - **Hotfix de Exibição de Agendamento Ativo (`HomeCliente.jsx`)**: Corrigido o cálculo de `proximoHorario` para cobrir todo o dia atual a partir de 00:00, garantindo que agendamentos de hoje com status `scheduled` permaneçam em destaque no card "SEU PRÓXIMO HORÁRIO".
- **20/10/2026 - Fase 41: A5 — Temas White-Label e Acessibilidade WCAG 2.1 [Concluída]:**
  - **DDL e Banco de Dados (`migrations/phase10_white_label_themes.sql` e `database.md`)**:
    - Criação e aplicação de migração adicionando as colunas `theme_id` (varchar(50) DEFAULT 'rose') e `brand_hex` (varchar(7) DEFAULT '#8E3B4E') à tabela `public.cap_tenants`.
    - Atualização do arquivo mestre `database.md`.
  - **Backend e API (`backend/routes/tenants.js` e `backend/services/tenantService.js`)**:
    - Suporte aos parâmetros `theme_id` e `brand_hex` no endpoint `PUT /tenants/branding` com validação Zod.
    - Validação de contraste WCAG server-side quando `theme_id === 'custom'`, impedindo a gravação de cores com contraste inferior a 4,5:1 e retornando erro 400 descritivo.
    - Retorno imediato de `theme_id` e `brand_hex` no endpoint público `GET /tenants/by-slug/:slug` com controle de invalidação no Redis.
  - **Módulo de Tokens e Algoritmo de Contraste WCAG 2.1 (`themeTokens.js`)**:
    - Definição dos 6 temas oficiais do plano: Rosé, Nude, Lavanda, Sálvia, Preto e Dourado, Bordô.
    - Cálculo de luminância relativa e proporção de contraste segundo a norma W3C WCAG 2.1.
    - Algoritmo de derivação de paleta personalizada (`generateCustomPalette`) gerando matizes suaves para `tint`, `bg`, `accent` e `on_brand` (#FFFFFF com contraste >= 4,5:1).
    - Testes automatizados Jest (`backend/tests/themeContrast.test.js`) cobrindo 100% dos temas e regras de contraste, aprovados com sucesso.
  - **Interface Administrativa (`src/pages/admin/BrandingCustomizacao.jsx`)**:
    - Redesenho completo 1:1 baseado na imagem oficial `docs/layout/novo/Temas white-label@2x.png`.
    - Mostruário de 6 cartões de temas (Rosé, Nude, Lavanda, Sálvia, Preto e Dourado, Bordô) exibindo mini-cartão de serviço ("Corte R$ 45"), chips ("Manhã" e "11:00"), botão "Agendar horário", amostras de paleta e badge de tema ativo.
    - Modo de Cor Livre com seletor hex/color picker, aferição em tempo real de acessibilidade (selo verde de aprovação ou vermelho de alerta) e auto-ajuste para tom seguro.
    - Bloqueio na interface para impedir gravação de cores sem conformidade WCAG AA.
  - **Live Preview Dinâmico sem Reload (`src/context/TenantContext.jsx`)**:
    - Integração de `applyLiveTheme` com injeção direta em runtime das variáveis CSS (`--color-brand`, `--color-brand-tint`, `--color-brand-accent`, `--color-bg`, etc.).
    - Ao selecionar um tema (ex: Sálvia), tanto o painel do gestor quanto o aplicativo do cliente (`/studiothais`) atualizam instantaneamente suas cores sem recarregar o servidor. Homologado visualmente via navegador.

- **20/10/2026 - Fase 41: A6 — Imagens: Upload, Recorte Guiado e Placeholders [Concluída]:**
  - **Backend Seguro de Upload (`backend/routes/upload.js` & `backend/app.js`)**:
    - Criação e montagem da rota autenticada `POST /api/upload/image` com proteção por token JWT de gestores e staff.
    - Armazenamento em disco usando Multer com nomes pseudo-aleatórios via `crypto.randomBytes(16)` para evitar colisões e ataques de directory traversal.
    - Validação de tipos MIME restrita a imagens web (`image/jpeg`, `image/png`, `image/webp`) e limite máximo de 5MB por requisição.
    - Serviço estático de arquivos com caching e headers apropriados.
  - **Processamento de Imagem no Cliente (`src/lib/imageProcessing.js`)**:
    - Utilitário de amostragem algorítmica de bordas e cantos (`detectSolidBackground`) que identifica quando um logotipo enviado possui fundo sólido e opaco, exibindo aviso educativo na interface recomendando PNG ou WebP transparente para não prejudicar o design em temas de cores diferentes.
    - Conversão automática de canvas recortado para Blob WebP otimizado (`canvasToWebpBlob`).
  - **Modal de Recorte Guiado (`src/components/ui/ModalRecorteImagem.jsx`)**:
    - Interface interativa de recorte respeitando as proporções obrigatórias: 1:1 (quadrado com cantos arredondados) para Logotipos, Fotos de Profissionais e Avatares; 16:9 para Banners e Capas.
    - Suporte a zoom contínuo por slider, arrasto bidirecional (pan) por mouse e touch, e alerta inline de fundo sólido.
  - **Componente Universal `PlaceholderImagem` (`src/components/ui/PlaceholderImagem.jsx`)**:
    - Eliminação completa de caixas vazias ou ícones de imagem quebrada em todo o sistema.
    - Renderização de monograma editorial estilizado em Playfair Display para logotipos de salões e avatares sem imagem cadastrada.
    - Renderização de ícones temáticos contextuais em SVG de acordo com a categoria de serviço (tesoura para cabelo, mão com esmalte para unhas/manicure, olho para sobrancelhas/cílios, brilhos para estética geral).
    - Tratamento de erro automático com fallback gracioso via evento `onError`.
  - **Integração no Painel do Salão (`BrandingCustomizacao.jsx`)**:
    - Adicionados botões de ação guiados para upload e recorte de Logo (1:1) e Banner (16:9) integrados à API e ao componente universal. Homologado visualmente com sucesso.

- **20/10/2026 - Fase 41: A2 — Biblioteca Universal de Componentes de UI (Rosé Editorial) [Concluída]:**
  - **Componentes Universais em `src/components/ui/`**:
    - Criação de componentes robustos e acessíveis com foco visível, conformidade W3C WAI-ARIA (`role="checkbox"`, `aria-checked`, `role="dialog"`, `aria-modal="true"`, `role="progressbar"`, `role="alert"`):
      - `Botao`: Alturas 52px, 44px e 36px, variantes primário, secundário, contorno, texto e perigo, estados de loading com spinner SVG animado e desabilitado.
      - `Button`: Adapter retrocompatível mapeando as props do legado para `Botao`.
      - `Chip` e `ChipSelecionavel`: Chips rosé suave `#F6E4E4` com texto contrastante, contadores numéricos, suporte a múltiplos itens e seleção única.
      - `Cartao`: Cartão base editorial com cantos de 22px (`rounded-[22px]`), bordas sutis e sombras suaves.
      - `Card`: Adapter retrocompatível reexportando `Cartao`.
      - `CartaoProfissional`: Apresentação de profissionais com avatar, nota/estrelas douradas, especialidade e seleção.
      - `CartaoProximoHorario`: Card do próximo horário com badge de data estilizado (dia da semana, número em Playfair), detalhes e botões "Remarcar" e "Detalhes".
      - `CartaoClube`: Card promocional do clube de assinaturas com moldura dourada `#E6CA65`, contagem de sessões disponíveis e CTA.
      - `CampoTexto`: Input de 56px de altura, cantos de 18px, foco suave em `--color-brand`, ícones e validação.
      - `CampoTelefone`: Input especializado com máscara telefônica brasileira `(XX) XXXXX-XXXX` e inputmode numérico.
      - `CampoCodigo`: Input OTP de 4 a 6 dígitos com caixas individuais, auto-avanço de foco, backspace reverso e suporte a colagem direta (`onPaste`).
      - `Input`: Adapter retrocompatível estendendo `CampoTexto`.
      - `FaixaDeDias`: Seletor de 14 dias com dia abreviado, dia do mês e modal/BottomSheet de calendário completo.
      - `GradeDeHorarios`: Grade estrita de 3 colunas e slots de 44px divididos em Manhã, Tarde e Noite, com marcação de slots ocupados em `line-through`.
      - `BarraDeProgresso`: Barra rosé suave de 6px com preenchimento contínuo animado e rótulo de etapa textual.
      - `BarraFixaInferior`: Barra de rodapé fixada com backdrop blur, safe area inset, resumo financeiro em lining figures (`tabular-nums`) e botão primário de 52px.
      - `BottomSheet`: Drawer modal deslizante com puxador (*handle*), animação suave e fechamento por ESC e clique fora.
      - `Toast` & `ProvedorToast`: Sistema de feedback instantâneo flutuante (`useToast`) com 4 variantes semânticas (sucesso, alerta, erro, info).
      - `Skeleton`: Shimmer animado para carregamento de cartões, botões e avatares.
      - `EstadoVazio`: Layout acolhedor com ícone em círculo pastel, tipografia Playfair Display e botão de ação primária.
      - `EstadoErro`: Layout com ícone de alerta, orientação amigável e botão "Tentar novamente".
      - `NavegacaoInferior`: Barra fixa inferior com 5 abas e botão central elevado de agendamento (+).
      - `Avatar`: Avatar circular (sm, md, lg, xl) com foto, iniciais automáticas em degradê e anel dourado opcional.
  - **Barrel File (`src/components/ui/index.js`)**:
    - Centralização de todas as exportações da biblioteca em um ponto único.
  - **Página Vitrine `/ui-kit` (`src/pages/UiKitShowcase.jsx`)**:
    - Página interativa demonstrando todos os componentes com estados e troca dinâmica de temas (Rosé, Nude, Lavanda, Sálvia, Preto & Dourado, Bordô).
  - **Testes Automatizados Jest (`backend/tests/uiLibrary.test.js`)**:
    - Suíte com 100% de aprovação validando integridade, adapters retrocompatíveis e WAI-ARIA.
  - **Homologação Visual**:
    - Aprovado via navegador com screenshots comprovando BottomSheet, Toast, botões, chips e cartões.

- **20/10/2026 - Fase 41: A3 — Layout Base com Área Segura (Safe Area) [Concluída]:**
  - **Componente Universal `TelaCliente.jsx` (`src/components/ui/TelaCliente.jsx`)**:
    - Criação do componente base arquitetural para a jornada do cliente, encapsulando `env(safe-area-inset-top, 0px)` e `env(safe-area-inset-bottom, 0px)`.
    - Gestão automatizada de respiro inferior para navegação por abas (`temNavegacaoInferior: pb-[calc(env(safe-area-inset-bottom)+80px)]`) e barras fixas de rodapé (`temBarraFixaInferior: pb-[calc(env(safe-area-inset-bottom)+96px)]`), com suporte a larguras padrão mobile (`max-w-[420px]`) e expandidas (`max-w-7xl` e `max-w-3xl`).
    - Exportado no barrel file `src/components/ui/index.js`.
  - **Eliminação de Safe-Area Duplicada por Tela**:
    - Remoção de paddings repetidos manuais `pt-[calc(env(safe-area-inset-top,0px)+12px)]`, `pt-[calc(env(safe-area-inset-top,0px)+24px)]` e `pt-[calc(env(safe-area-inset-top,0px)+28px)]` em todas as páginas do cliente (`HomeCliente`, `PerfilCliente`, `HistoricoAgendamentos`, `ClubeFidelidade`, `AgendamentoServicos`, `AgendamentoProfissionais`, `AgendamentoHorarios`, `AgendamentoRevisao`, `AgendamentoConfirmado`, `AcessoTelefone`, `AcessoSenha`, `CadastroCliente`, `NotificacoesCliente`, `IndiqueGanhe`, `FidelidadeCarteira`, `ComprarGiftCard`, `ClienteAnamnese`), tornando as telas limpas e agnósticas a detalhes de hardware.
  - **Testes Automatizados Jest (`backend/tests/uiLibrary.test.js`)**:
    - Teste de regressão garantindo que `TelaCliente` centraliza os insets e que nenhuma tela do cliente reintroduz paddings manuais. 10 de 10 testes passando 100%.
  - **Homologação Visual Móvel**:
    - Validado via browser subagent em viewport mobile nativo (390x844): ausência total de sobreposição com notch de iPhone/Android e rodapés fluidos.

- **20/10/2026 - Fase 41: A4 — Remoção do Paliativo do Tailwind v4 [Concluída]:**
  - **Eliminação de Conflito de Variáveis no Tailwind v4 (`src/index.css`)**:
    - Removidas todas as variáveis de espaçamento personalizadas `--spacing-*` sob `@theme` (`--spacing-gutter`, `--spacing-xl`, `--spacing-sm`, `--spacing-xs`, `--spacing-md`, `--spacing-container-margin`, `--spacing-base`, `--spacing-lg`) que colidiam com a escala interna do Tailwind v4 e faziam classes como `max-w-md` serem computadas como `16px`.
    - Configuradas as variáveis canônicas de containers sob `@theme` (`--container-xs: 20rem` até `--container-7xl: 80rem`), permitindo que o compilador do Tailwind v4 gere de forma pura e nativa todas as classes de largura máxima (`max-w-xs`, `max-w-sm`, `max-w-md`, etc.).
  - **Remoção de Regras Forçadas com `!important`**:
    - Eliminadas todas as 11 declarações paliativas `@utility max-w-* { max-width: ... !important; }` criadas na Fase 39.
  - **Utilitários Legados de Layout**:
    - Declaradas regras limpas de `@utility` direto para classes de espaçamento e padding utilizadas no painel administrativo e telas legadas (`px-gutter`, `px-container-margin`, `gap-xs`, `gap-sm`, `gap-md`, `gap-lg`, `gap-xl`, `p-*`, `py-*`, `px-*`, `mb-*`, `mt-*`) sem colisão de variáveis.
  - **Validação e Homologação**:
    - Compilação Vite em ambiente de produção gerada em 2.33s sem erros (`npm run build`).
    - 10 de 10 testes automatizados Jest passando 100%.
    - Homologação visual via subagente de navegador atestando que nenhuma tela sofre compressão horizontal (telas de autenticação `/studiothais/login`, Home `/studiothais/home` e mostruário `/ui-kit`).

- **20/10/2026 - Fase 42 / Fase 43: H1 — Numerais Alinhados em Todo o Sistema [Concluída]:**
  - **Padronização Global de Tipografia Numérica (`src/index.css`)**:
    - Aplicada regra global `font-variant-numeric: lining-nums; font-feature-settings: "lnum" 1;` a todos os cabeçalhos (`h1`-`h6`), `.font-display`, `.font-serif`, `.font-headline-*` e seletores de fonte do tema Playfair Display.
    - Resolvido o defeito estético da Playfair Display onde algarismos zero eram renderizados como minúsculos ("old-style"), assemelhando-se à letra 'o' (`R$ o,oo`).
    - Aplicada regra global `font-variant-numeric: lining-nums tabular-nums; font-feature-settings: "lnum" 1, "tnum" 1;` em tabelas (`table`, `th`, `td`), classes `.tabular-nums`, `.kpi-value`, `.metric-value` e `.currency-value`.
    - Adicionados utilitários no Tailwind v4: `@utility lining-nums`, `@utility tabular-nums` e `@utility font-numeric-aligned`.
  - **Módulo de Utilitários de Moeda e Números (`src/utils/formatters.js`)**:
    - Criado helper canônico `formatCurrency(value)` usando `Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })`, garantindo sempre o padrão monetário oficial com centavos (ex: `R$ 0,00`).
    - Criados os helpers `formatNumber` e `formatPercent`.
    - Integrado nos painéis do Super Admin (`SuperAdmin.jsx`, `TenantDetailAdmin.jsx`, `TenantListAdmin.jsx`, `PlanosAdmin.jsx`) e Gestor (`DashboardAdmin.jsx`, `GestaoFinanceira.jsx`, `ComissoesProfissional.jsx`).
  - **Testes Automatizados e Homologação**:
    - Criada a suíte Jest `backend/tests/typographyNumerals.test.js` com 5 testes de regressão aprovados com 100% de sucesso.
    - Homologado visualmente via navegador com login do salão demonstrando cartões de KPI do Dashboard e da Gestão Financeira com `R$ 0,00` nítido, alinhado e perfeitamente legível.

- **20/10/2026 - Fase 42: H2 (Layout Base Super Admin) & J1 (Navegação Agrupada do Gestor) [Concluída]:**
  - **Super Admin — Componente Mestre Unificado `SuperAdminLayout.jsx`**:
    - Criado o componente de layout arquitetural `src/components/superadmin/SuperAdminLayout.jsx` com barra lateral desktop de largura canônica de 264px (`w-[264px]`), sem degradês desnecessários, com separador `border-r border-line`, rodapé fixo com dados do administrador autenticado e botão de logout.
    - Estruturação dos grupos canônicos: **Negócio** (Painel Geral `/superadmin`, Salões e Clientes `/superadmin/tenants`, Gestão de Planos `/superadmin/planos`), **Plataforma** (Feature Flags `/superadmin/features`, Mural de Avisos `/superadmin/avisos`, Equipe SaaS `/superadmin/equipe`) e **Sistema** (Auditoria e Saúde `/superadmin/auditoria`, Configurações `/superadmin/configuracoes`).
    - Eliminação completa de marcações duplicadas de `<aside>`, cabeçalho mobile e gavetas em todas as 8 páginas do Super Admin, reduzindo centenas de linhas de código repetido e passando a renderizar diretamente via `<Outlet />`.
    - Roteamento mestre centralizado em `src/App.jsx`.
  - **Gestor — Barra Lateral Agrupada em `AdminLayout.jsx`**:
    - Refatoração da barra lateral para a largura canônica de 264px (`w-[264px]`) com acabamento Rosé Editorial (`border-r border-line`).
    - Agrupamento dos 16 itens do salão em 4 seções com rótulos em caixa alta de 11px: **Operação** (Dashboard, Agenda, Clientes, PDV), **Catálogo** (Serviços, Estoque, Clube, Vales-Presente), **Gestão** (Financeiro, Comissões, Equipe, Relatórios BI) e **Configurações** (Operacional, Branding, Segurança e LGPD, Minha Assinatura).
    - Destaque do item ativo com fundo suave `bg-brand-tint` (`#F6E4E4`), texto `text-brand font-semibold` e ícone com fill 1.
    - Rolagem interna suave (`hide-scrollbar`) impedindo corte de itens em monitores verticais menores, e rodapé fixo com dados do perfil e botão "Sair da Conta".
  - **Validação e Homologação**:
    - Compilação Vite bem-sucedida (`npm run build` gerou bundles de produção sem erros em 2.35s).
    - 15 de 15 testes Jest passando 100%.
    - Validação visual completa no navegador pelo browser subagent, sem duplicação de layout e com transições fluidas.

- **20/10/2026 - Refatoração Editorial: Tela de Login do Staff (`AcessoProfissional.jsx`) [Concluída]:**
  - **Identidade Rosé Editorial & Split Layout Desktop**:
    - Refatoração completa da tela de login do staff (`src/pages/AcessoProfissional.jsx`) aplicando card centralizado com cantos arredondados de 32px e sombras suaves.
    - Coluna esquerda: Vitrine institucional em alta resolução, badges translúcidas de segurança ("Portal da Equipe • OperaBeauty SaaS"), monograma editorial com moldura dourada e pílulas de recursos (Agenda Dinâmica, CRM & Histórico, Gestão Segura).
    - Coluna direita: Formulário moderno com ícones Lucide contextuais (`Mail`, `Lock`, `Eye`, `EyeOff`), botão dominante com a cor brand do salão, foco com anel translúcido, atalho de navegação amigável para o Portal da Cliente e modal educativo de recuperação de senha institucional.
  - **Homologação e Testes**:
    - Compilação Vite limpa em 6.60s.
    - Teste de fluxo pontual via subagente de navegador com credenciais de gestor (`thais@studiodatha.com`), autenticação via JWT realizada com sucesso e redirecionamento direto para o dashboard gerencial do salão.

- **20/10/2026 - Fase 42: J4 — Agenda do Salão (`AgendaProfissional.jsx`) [Concluída]:**
  - **Alinhamento Visual 1:1 com `G2 · Gestor — Agenda@2x.png`**:
    - Reestruturação completa de `src/pages/AgendaProfissional.jsx` no padrão estético Rosé Editorial.
    - Cabeçalho editorial com Playfair Display, navegação de datas com botões circulares e atalho "Hoje", capitalização canônica em pt-BR ("Terça, 20 de outubro"), controle segmentado "Dia" / "Semana", alternador de contexto "Minha agenda" / "Salão" e botão de ação primária destacado "+ Novo agendamento".
    - Barra de status com 4 pílulas semânticas refinadas da paleta Rosé Editorial: `Confirmado` (`#E8F5E9`), `Pendente` (`#FFF8E1`), `Concluído` (`#F0EAE6`) e `Cancelado` (`#FDE8E8`).
  - **Grade Temporal e Multi-Colunas por Profissional**:
    - Grade com linhas temporais de 72px de altura canônica (`ROW_HEIGHT = 72`) das 08:00 às 20:00, com divisórias sutis.
    - Visão "Salão": grade dividida em colunas proporcionais por profissional com avatar monograma pastel, nome e cargo.
    - Linha do "Agora": indicador em tempo real com linha contínua vermelha viva (`#D32F2F`) no minuto exato do dia atual, com atualização automática a cada 30 segundos.
  - **Interatividade e Criação Rápida em 1 Clique**:
    - Clique em qualquer slot vazio da equipe abre o `NewAppointmentModal` com a data, horário e profissional da coluna já pré-selecionados.
    - Clique em card de agendamento abre modal com detalhes completos (procedimento, cliente, WhatsApp, profissional, valor) e botões de ação instantânea ("Marcar como Concluído", "Iniciar Atendimento", "Cancelar Agendamento", "Abrir Ficha CRM").
  - **Testes e Homologação**:
    - Adicionado teste de regressão em `backend/tests/uiLibrary.test.js` (7 de 7 testes passando 100%).
    - Build Vite executado com sucesso em 4.53s sem erros.
    - Homologação visual completa via navegador demonstrando visão unificada, alternância para visão Salão com 3 colunas e abertura de modal por clique.

- **20/10/2026 - Fase 42: Redesign do Modal de Novo Agendamento & Correções Técnicas [Concluída]:**
  - **Redesign Editorial do `NewAppointmentModal.jsx`**:
    - Substituída a interface crua anterior por um modal de alta costura Rosé Editorial com cantos arredondados generosos (`rounded-[32px]`), cabeçalho de luxo com tipografia Serif Playfair Display e stepper visual de duas etapas (`1. Procedimento & Profissional` -> `2. Data & Horário`).
    - **Etapa 1**: Campo de busca de clientes em tempo real com avatar monograma e atalho "Trocar cliente"; grade de 2 colunas para o catálogo de procedimentos com preços formatados em padrão monetário brasileiro e duração; seleção de profissionais da equipe com monograma pastel.
    - **Etapa 2**: Barra de navegação com datas por extenso em pt-BR e setas de alternância; grade de horários livres em formato de pílulas refinadas (`09:00`, `09:30`, etc.); resumo em tempo real do procedimento selecionado.
    - **Tela de Sucesso**: Recibo detalhado de agendamento e botão direto de confirmação com WhatsApp integrado com mensagem personalizada de acolhimento.
  - **Correções no Banco de Dados (Erros 500)**:
    - Aplicada a coluna faltante `discount_applied NUMERIC(10,2) DEFAULT 0.00` na tabela `cap_appointments`.
    - Aplicada a coluna `is_starting_price BOOLEAN DEFAULT FALSE` na tabela `cap_services`.
    - Realizado flush no cache do Redis (`FLUSHALL`) garantindo dados limpos.
  - **Resolução do Service Worker (`public/sw.js`)**:
    - Criado o arquivo estático `public/sw.js` com importação de `custom-sw.js`, fornecendo o MIME type correto (`text/javascript`) e eliminando o erro `The script has an unsupported MIME type ('text/html')` no Vite Dev Server e no navegador.
  - **Algoritmo de Lanes para Resolução de Sobreposição de Horários na Agenda (`AgendaProfissional.jsx`)**:
    - Implementado o algoritmo *Interval Overlap Clustering / Calendar Packing* em `columnAppointments`: quando múltiplos agendamentos ocorrem em horários concorrentes no mesmo profissional/coluna, o sistema agrupa os intervalos em clusters e distribui horizontalmente em sub-colunas proporcionais (`totalLanes` e `laneIndex`).
    - Eliminado o problema de cards se sobreporem ou cobrirem o texto de outros atendimentos.
    - Densidade e visibilidade monetária otimizadas: nos cards estreitos (sub-colunas), o valor monetário (`formatCurrency`) foi reposicionado no canto superior direito ao lado do nome do serviço, garantindo 100% de visibilidade sem risco de corte vertical pela base, com horário e badge de status distribuídos equilibradamente na linha inferior.

- **21/10/2026 - Fase 42: J5 — Gestão de Clientes (`GestaoClientes.jsx`) [Concluída]:**
  - **Alinhamento Visual 1:1 com `G3 · Gestor — Clientes@2x.png`**:
    - Substituição completa da antiga listagem em cards pesados por uma tabela corporativa elegante, de alta densidade e escalável para milhares de registros (`rounded-[22px] border border-line bg-white shadow-2xs`).
    - **Cabeçalho Canônico**: Tipografia Playfair Display ("Clientes") com subtítulo editorial ("Sua base, fidelização e histórico."), campo de busca em pílula por nome ou telefone com limpeza em 1 toque, botão secundário de contorno `Importar planilha` e botão dominante `+ Novo cliente`.
    - **Segmentação em Chips de Pílula**: Filtros rápidos para `Todas`, `VIP` (LTV >= R$ 500 ou categorias Ouro/VIP/Black), `Sumidas há 60 dias` (clientes sem visitas nos últimos 60 dias), `Aniversariantes` (clientes que fazem aniversário no mês atual) e `Sem anamnese` (clientes sem prontuário preenchido).
    - **Ordenação Dinâmica**: Seletor com ordenação por `maior gasto` (LTV desc), `mais visitas` (volume desc), `mais recentes` (cadastro desc) e `nome (A-Z)`.
    - **Colunas da Tabela**:
      - `CLIENTE`: Avatar circular em rosé pastel com monograma de iniciais, nome em negrito e telefone com máscara brasileira `(11) 99999-9999`.
      - `NÍVEL`: Badges de fidelidade harmônicos da paleta Rosé Editorial (`★ Prata`, `★ Ouro`, `★ VIP`, `★ Black`), eliminando o antigo selo azul-marinho destoante.
      - `VISITAS`: Total de atendimentos concluídos com numerais tabulares (`tabular-nums`).
      - `GASTO TOTAL`: LTV formatado com `formatCurrency` (`R$ 0,00`) com numerais alinhados e tabulares (`tabular-nums lining-nums`).
      - `AÇÕES`: Botão de contorno `WhatsApp` com abertura direta no Web/App e mensagem de saudação cordial pré-formatada, botão primário `Abrir ficha` com link direto para a ficha CRM, e ação discreta de redefinição de senha com modal seguro.
  - **Modais Integrados**:
    - **Cadastrar Novo Cliente**: Cadastro rápido de novos contatos pela equipe (nome, celular com máscara, nascimento opcional, nível VIP e senha provisória).
    - **Importar Planilha CSV**: Upload de arquivos CSV com download de modelo de cabeçalho (`nome,telefone,nascimento,nivel`), pré-visualização dos 10 primeiros registros e processamento em lote.
  - **Evolução do Backend (`clients.js` & `clientService.js`)**:
    - Rota `POST /api/clients` protegida por autenticação e validação estrita Zod para cadastro rápido.
    - Rota `POST /api/clients/import` para importação de contatos em lote com relatório de sucessos e duplicados.
    - Consulta `listClients` atualizada para retornar `c.anamnese_data` e `MAX(a.appointment_date) as last_visit`, viabilizando 100% dos filtros e segmentações.
  - **Testes e Homologação**:
    - Criada suíte de testes Jest em `backend/tests/gestaoClientes.test.js` (6 de 6 testes passando 100%).
    - Compilação de produção Vite (`npm run build`) executada com sucesso absoluto em 29s sem warnings de tipos ou quebras.
    - Homologação visual e funcional via browser subagent autenticado como Gestor demonstrando alinhamento estético 1:1, abertura de modais e gravação de vídeo WebP.

- **21/10/2026 - Fase 42: J6 — Ficha da Cliente CRM (`FichaClienteCRM.jsx`) [Concluída]:**
  - **Alinhamento Visual 1:1 com `G4 · Gestor — Ficha@2x.png`**:
    - Reestruturação completa da tela em duas colunas canônicas (`lg:grid-cols-12`) no Design System Rosé Editorial.
    - **Coluna Esquerda (Perfil)**: Avatar circular de 64px com monograma editorial rosé, badge de nível VIP na paleta (`★ Prata`, `★ Ouro`, `★ VIP`, `★ Black`) com seletor interativo `Classificar ▾`, telefone formatado com botão direto de WhatsApp, aniversário formatado por extenso com idade calculada ("29 de setembro de 1995 (31 anos)"), blocos de métricas VISITAS e TOTAL GASTO com numerais tabulares (`tabular-nums lining-nums` via `formatCurrency`), e ranking de SERVIÇOS MAIS FEITOS.
    - **Coluna Direita (Anamnese e Observações)**:
      - Card de Ficha de Anamnese com status **Pendente** em pílula âmbar suave (`bg-amber-50 text-amber-800`), eliminando o erro alarmista vermelho "Vencida / Pendente", e botão de contorno `Enviar link pelo WhatsApp` gerando link e mensagem personalizada de acolhimento.
      - Card de Observações da Equipe com textarea, botão de contorno `Anexar imagem` com prévia removível, botão `Salvar observação` com estado desabilitado perfeitamente legível (cinza neutro `bg-stone-300 text-stone-600`), linha do tempo com autor e data formatada, e **resolução resiliente do anexo de imagem quebrado** (`ImagemAnexoTimeline` com fallback elegante e botão `Tentar de novo` eliminando o bug do print original).
    - **Ações no Topo**: link de retorno `← Clientes`, botão `Redefinir senha` com modal dedicado e botão dominante `+ Agendar` integrado ao `NewAppointmentModal` com a cliente já pré-selecionada.
  - **Testes e Homologação**:
    - Criada suíte de testes Jest em `backend/tests/fichaClienteCRM.test.js` (7 de 7 testes passando 100%).
    - Compilação de produção Vite (`npm run build`) executada com sucesso absoluto em 1m 8s.
    - Homologação visual e funcional via browser subagent autenticado como Gestor demonstrando alinhamento estético 1:1, abertura do modal de agendamento com cliente pré-selecionada e gravação de vídeo WebP.

- **21/10/2026 - Fase 42: J2 — Dashboard do Gestor (`DashboardAdmin.jsx`) [Concluída]:**
  - **Alinhamento Visual 1:1 com `G1 · Gestor — Dashboard@2x.png`**:
    - Reestruturação completa do dashboard gerencial do salão no Design System Rosé Editorial / White-Label, eliminando tokens antigos de Material Theme e unificando com o layout base canônico (`AdminLayout.jsx`).
    - **Cabeçalho Editorial**: Saudação contextual baseada no horário do dia ("Bom dia, {nome}" / "Boa tarde, {nome}") em Playfair Display (`font-display text-3xl sm:text-4xl`), data por extenso em português do Brasil com inicial maiúscula (ex: "Quarta-feira, 21 de outubro"), botão secundário de contorno `Venda rápida` (com navegação direta para o PDV) e botão primário dominante `+ Novo agendamento` em pílula bordô integrado ao `NewAppointmentModal`.
    - **Grade de 4 KPIs Compactos**:
      1. `FATURAMENTO HOJE`: valor em negrito com `tabular-nums lining-nums` (`formatCurrency`) e subtítulo com pluralização rigorosa ("N atendimentos concluídos").
      2. `FATURAMENTO DO MÊS`: valor formatado em BRL e subtítulo ("Mês atual").
      3. `AGENDA DE HOJE`: total de atendimentos marcados com numerais tabulares e subtítulo ("N atendimentos marcados") e navegação para a agenda.
      4. `TICKET MÉDIO`: valor médio por atendimento formatado em BRL (`formatCurrency`) e subtítulo ("no mês").
    - **Corpo Principal (2 Colunas)**:
      - **Coluna Esquerda (Ampla)**: Card `Próximos atendimentos` (`rounded-[22px] border border-line bg-white p-6 shadow-2xs min-h-[460px]`). Quando vazio, renderiza estado acolhedor dotado de ilustração circular rosé, ícone de calendário, texto "Nenhum atendimento para hoje." e botão de contorno `Agendar manualmente` (conectado ao `NewAppointmentModal`); quando com atendimentos, renderiza lista organizada por horários com badges na paleta Rosé Editorial, cliente, serviço, profissional e ações rápidas para WhatsApp e ficha CRM.
      - **Coluna Direita (Cards Laterais de Gestão)**:
        1. `Estoque baixo`: badge com pluralização correta ("1 item" vs "N itens"), listagem dos produtos críticos com nome, quantidade atual e mínima (ex: `Perfume Árabe · Mínimo ideal: 9 un · 8 un`) e botão `Repor` com abertura do `ModalReporEstoque` integrado (reposição rápida com atalhos numéricos e persistência imediata via `api.inventory.update`).
        2. `Aniversariantes · 30 dias`: badge com total de clientes aniversariantes e listagem com ação rápida de envio de felicitações/cupom pelo WhatsApp.
        3. `Retornos · 30 dias`: badge com total de clientes que necessitam de manutenção preventiva calculada via `maintenance_days` e envio de lembrete pelo WhatsApp.
    - **Biblioteca de API (`src/lib/api.js`)**:
      - Adicionado o módulo `inventory` exposto na API do frontend (`list`, `create`, `update`, `delete`), eliminando chamadas indefinidas.
    - **Testes e Homologação**:
      - Criada suíte de testes Jest em `backend/tests/dashboardAdmin.test.js` (12 de 12 testes passando 100%).
      - Compilação de produção Vite (`npm run build`) executada com sucesso absoluto em 3.61s.
      - Homologação visual e funcional via browser subagent autenticado como Gestor demonstrando alinhamento estético 1:1, abertura e fechamento do modal de reposição rápida de estoque (`ModalReporEstoque`) e do `NewAppointmentModal`, com gravação de sessão em vídeo WebP.

- **21/10/2026 - Fase 42: J3 — Gestão Financeira (`GestaoFinanceira.jsx`) [Concluída]:**
  - **Alinhamento Editorial e Resolução dos Problemas Visuais (§9.1 e §9.6·J3)**:
    - Redesenho completo no Design System Rosé Editorial / White-Label, eliminando sobreposições de ícones de fundo em degradê e cores semânticas fora de padrão.
    - **Cabeçalho Editorial e Seletor de Período**: Título em Playfair Display com indicação contextual do período ativo, pílula de alternância dinâmica (**Este mês**, **Mês anterior**, **30 dias**, **Este ano**, **Personalizado**), botão de exportação `CSV` sanitizado sem IDs internos e botão `PDF` / Impressão com `@media print` otimizado.
    - **Grade de 5 KPIs Limpos**:
      1. `FATURAMENTO BRUTO`: total faturado no período com numerais alinhados (`tabular-nums lining-nums` via `formatCurrency`) e total de atendimentos concluídos.
      2. `FATURAMENTO LÍQUIDO`: margem livre do salão após dedução de comissões da equipe e descontos concedidos.
      3. `TICKET MÉDIO`: gasto médio por atendimento com cálculo seguro.
      4. `COMISSÕES PENDENTES`: conformidade com a regra 9.1.4 (zero é neutro, sem alertas vermelhos indevidos; valor positivo em tom âmbar suave).
      5. `DESCONTOS APLICADOS`: total de cupons e benefícios abatidos no período.
    - **Gráfico de Receita Diária e Quebra de Pagamento**:
      - Gráfico de barras responsivo com escala dinâmica, hover com tooltip contendo data e valor faturado, e estado acolhedor quando vazio.
      - Card `Formas de pagamento` com barras proporcionais e percentuais exatos calculados sobre o faturamento (**Pix**, **Cartão de Crédito**, **Cartão de Débito**, **Dinheiro**, **Vale-Presente**).
    - **Extrato de Transações e Pagamento de Comissões**:
      - Tabela de transações com badges elegantes de forma de pagamento, cliente com link direto para a ficha CRM, serviço, profissional e valores em verde suave (`text-emerald-800 font-semibold`) com paginação configurável.
      - Card `Comissões da equipe` com botão `Pagar pendência` que abre o [`ModalPagarComissao`](file:///d:/Repositorios/OperaBeauty/src/pages/admin/GestaoFinanceira.jsx) com confirmação segura e quitação via `api.appointments.payCommissions`.
      - Card `Serviços mais rentáveis` com barras de progresso rosé proporcionais.
    - **Evolução de Banco de Dados**:
      - Adicionada coluna `payment_method` na tabela `cap_appointments` e documentada em `database.md`.
      - Query `listAppointments` em `appointmentService.js` atualizada para retornar `a.payment_method`.
    - **Testes e Homologação**:
      - Criada suíte de testes Jest em `backend/tests/gestaoFinanceira.test.js` (8 de 8 testes passando 100%).
      - Compilação de produção Vite (`npm run build`) executada com sucesso absoluto em 2.65s.
      - Homologação visual e funcional via browser subagent autenticado como Gestor comprovando a ausência de sobreposições, abertura e fechamento do modal de comissões e gravação de vídeo WebP.

- **21/10/2026 - Fase 42: H7 — Suspensão Segura do Salão (Super Admin) [Concluída]:**
  - **Mecanismo Seguro de Suspensão e Reativação (§9.3 e §9.5·H7)**:
    - Implementação de barreiras de proteção para ações destrutivas no Super Admin, impossibilitando suspensões acidentais ou sem justificativa.
    - **Backend & Regras Rígidas na API (`superadminService.js` e `routes/superadmin.js`)**:
      - Criação dos endpoints dedicados `POST /api/superadmin/tenants/:id/suspend` e `POST /api/superadmin/tenants/:id/reactivate` validados via Zod (`suspendTenantSchema`, `reactivateTenantSchema`).
      - Bloqueio estrito no endpoint legado/geral `PUT /api/superadmin/tenants/:id`: qualquer tentativa de enviar `status = 'suspended'` ou `'inactive'` é interceptada e exige confirmação do nome exato do salão e motivo formal (mínimo 5 caracteres).
      - **Invalidação Imediata de Cache**: Limpeza instantânea da chave Redis `tenant_slug:${slug}` para revogação em tempo real de acessos tanto da vitrine pública de clientes quanto das sessões de gestores e staff.
      - **Trilha de Auditoria Governamental**: Gravação obrigatória em `cap_audit_logs` registrando ação (`SUSPEND_TENANT` / `REACTIVATE_TENANT`), ID do tenant, status anterior/novo, motivo, nome confirmado, IP de origem e carimbo de data/hora.
      - **Notificação aos Gestores**: Gravação automática de aviso de bloqueio/desbloqueio em `cap_notifications` para os usuários com papel `manager` do salão afetado.
      - **Reativação em 1 Clique**: Método `reactivateTenant` que restaura o status para `active`, invalida o cache Redis, registra o evento na auditoria e notifica a equipe.
    - **Frontend Rosé Editorial (`TenantDetailAdmin.jsx`)**:
      - Cabeçalho aprimorado com badge de status dinâmico (`Ativo` com ponto verde vs `Suspenso` com borda rosé e ponto pulsante de alerta).
      - Seletor de status com aviso visual educativo ("Gerenciado na Zona de Risco"), impedindo alteração indevida no formulário comum.
      - **Zona de Risco Estruturada**: Card de destaque na coluna lateral com botão `Suspender conta...` (quando ativo) e `Reativar conta do salão (1 clique)` (quando suspenso com estilo e confirmação rápida).
      - Componente modal `ModalSuspenderSalao` com aviso de impactos imediatos, contagem dinâmica de caracteres no textarea de motivo, validação em tempo real com ícones (`check_circle` / `error`) ao digitar o nome exato do salão, e bloqueio do botão até preenchimento completo.
    - **Client API (`src/lib/api.js`)**:
      - Adicionados os métodos `superadmin.suspendTenant(id, { confirm_tenant_name, reason })` e `superadmin.reactivateTenant(id)`.
    - **Testes e Homologação**:
      - Criada suíte de testes Jest em `backend/tests/suspensaoSegura.test.js` com 11 de 11 testes passando 100% (validação de nome, motivo, bloqueio via PUT, auditoria, Redis e reativação).
      - Compilação de produção Vite (`npm run build`) executada com sucesso absoluto em 1.94s.
      - Homologação visual e funcional via browser subagent autenticado como Super Admin navegando pelo painel, abrindo o salão `studiothais`, testando validações de erro e sucesso no `ModalSuspenderSalao` com gravação de sessão em vídeo WebP (`suspensao_segura_h7_1792599640389.webp`).

- **21/10/2026 - Fase 42: H3 — Painel Geral do Super Admin (`SuperAdmin.jsx`) [Concluída]:**
  - **Fidelidade 1:1 com a Imagem Canônica Oficial (`S1 · Super Admin - Painel@2x.png`)**:
    - **Cabeçalho Editorial & Controles Globais**:
      - Título em Playfair Display ("Visão geral") e subtítulo institucional ("Desempenho e faturamento de todos os salões").
      - Seletor de período dinâmico em pílula com borda suave (**Mês**, **3 meses**, **Ano**).
      - Botão primário dominante em pílula bordô `+ Novo salão` perfeitamente integrado ao modal `CreateTenantModal`.
    - **Grade de 5 KPIs Compactos**:
      1. `RECEITA RECORRENTE (MRR)`: soma dos valores de planos de salões ativos (`R$ 199,80`), numerais alinhados `tabular-nums lining-nums` via `formatCurrency` e subtítulo com pluralização rigorosa ("2 salões pagantes").
      2. `SALÕES ATIVOS`: total de salões com acesso ativo na plataforma ("2" com subtítulo "Na plataforma").
      3. `FATURAS PENDENTES`: conformidade com a regra 9.1.4 (zero é neutro; pílula verde `Tudo em dia`, jamais emitindo erro ou alarme falso; quando houver pendência, valor em destaque com pílula âmbar `A regularizar`).
      4. `CHURN DO MÊS`: percentual de cancelamento com base em salões suspensos / inativos ("0%" com subtítulo "Nenhum cancelamento").
      5. `CLIENTES ÚNICOS`: total de clientes únicos cadastrados na base do SaaS sem duplicidades ("3" com subtítulo "Sem duplicidade").
    - **Corpo Principal (2 Colunas)**:
      - **Coluna Esquerda (Salões)**: Card `Salões` com busca em tempo real em pílula arredondada com ícone de lupa, tabela corporativa elegante com avatares circulares rosé dotados de monogramas, nome e slug, badge de plano (`Enterprise`), MRR por salão (`formatCurrency`), situação da fatura (`Em dia`), status da conta (`Ativo`), chevron de navegação e linha inteira clicável direcionando para `TenantDetailAdmin.jsx`.
      - **Coluna Direita (Cards Laterais de Gestão)**:
        - Card `Precisa de atenção`: ícone circular verde com check e texto acolhedor ("Nada pendente. Faturas vencidas e salões sem acesso há 7 dias aparecem aqui.") quando regular, ou listagem de salões com pendência.
        - Card `Receita por plano`: faturamento por plano, barra de progresso horizontal na cor brand (`#7C3A4D`) e contagem de assinantes ("Enterprise · R$ 199,80", "Premium e Básico · 0 assinantes").
    - **Backend e Métricas Consolidadas (`superadminService.js`)**:
      - `getDashboardMetrics` enriquecido com agregação de receita por plano (`revenue_by_plan`), verificação de pendências críticas (`attention_items`) e cálculo de churn.
      - `listTenantsWithStats` enriquecido trazendo o nome do plano (`plan_name`), status da fatura mais recente (`latest_invoice_status`) e contagem de faturas atrasadas (`overdue_invoices_count`).
    - **Testes e Homologação**:
      - Criada suíte de testes Jest em `backend/tests/painelSuperAdmin.test.js` com 10 de 10 testes passando 100%.
      - Compilação de produção Vite (`npm run build`) executada com sucesso absoluto em 3.12s.
- **21/10/2026 - Fase 42: H4 — Salões e Clientes do Super Admin (`TenantListAdmin.jsx`) [Concluída]:**
  - **Filtros Avançados, Busca em Tempo Real e Paginação (§9.5·H4)**:
    - **Barra de Ferramentas e Busca Dinâmica**:
      - Busca em tempo real com ícone de lupa e botão de limpeza em 1 clique (filtrando instantaneamente por nome, slug ou plano).
      - Dropdown de filtro dinâmico de Planos (`Todos os planos` e planos ativos vindos da API).
      - Dropdown de ordenação com 5 modos de classificação: **Nome (A-Z)**, **Nome (Z-A)**, **Maior MRR**, **Menor MRR** e **Mais recentes**.
      - Controles segmentados em pílula para **Status** (`Todos`, `Ativos`, `Suspensos`) e para **Fatura** (`Todas`, `Em dia`, `Vencidas / Pendentes`).
      - Botão de limpeza de filtros com feedback visual reativo (`Limpar filtros`).
    - **Tabela Corporativa e Linha Clicável**:
      - Avatares circulares rosé com monogramas das iniciais dos salões.
      - Nome do salão com destaque e slug com link direto.
      - Badge elegante de plano na paleta Rosé Editorial (`Enterprise`).
      - MRR formatado via `formatCurrency` com numerais alinhados (`tabular-nums lining-nums`: ex `R$ 99,90`).
      - Pílulas semânticas de situação de faturas e status da conta em estrita conformidade com as regras de cores 9.1.4.
      - Contadores de clientes e equipe associados ao salão.
      - Linha inteira com hover sutil e cursor pointer direcionando para o detalhe do salão (`/superadmin/tenants/:id`).
    - **Paginação e Tratamento de Estados**:
      - Paginação dinâmica com cálculo automático de páginas (`itemsPerPage = 8`) e botões de navegação Anterior/Próxima.
      - Estado vazio acolhedor com ícone, mensagem explicativa e botão de restauração de filtros.
    - **Testes e Homologação**:
      - Testes automatizados Jest em `backend/tests/superadminH4H5.test.js` passando 100% (12/12 testes).
      - Compilação de produção Vite (`npm run build`) executada com sucesso absoluto em 26.23s.
- **21/10/2026 - Fase 42: H5 — Gestão de Planos e Preços (`PlanosAdmin.jsx`) [Concluída]:**
  - **Fidelidade 1:1 com o Mockup Canônico S2 (`S2 · Super Admin — Planos@2x.png`)**:
    - **Cabeçalho Editorial & Ações Globais**:
      - Título em Playfair Display ("Planos e preços") e subtítulo institucional ("Planos exibidos na página de vendas.").
      - Seletor de periodicidade dinâmico (**Mensal** / **Anual** com pílula de desconto `Desconto`).
      - Botão primário dominante em pílula bordô `+ Criar plano` integrado ao modal de criação.
    - **Grade de Cartões dos Planos**:
      - Títulos em Playfair Display 24px (`Básico`, `Premium`, `Enterprise`).
      - Pílulas semânticas de visibilidade (`Público` em verde pastel `#E8F5E9` e `Oculto` em cinza neutro).
      - Preço destacado com numerais alinhados (`font-display text-4xl tabular-nums lining-nums`) e indicador de intervalo `/mês` ou `/ano`.
      - Métrica de assinantes e MRR por plano consolidado em tempo real (ex: "2 assinantes · MRR R$ 199,80").
      - Pílulas de limites operacionais de profissionais (ex: `5 profissionais` ou `Profissionais ilimitados`) e banners (`4 banner(s)`).
    - **Lista de Recursos com Check Único & Correção de Nomenclatura**:
      - Cada recurso com apenas 1 ícone de check na cor brand (`#7C3A4D`), eliminando duplicações e excesso de elementos visuais.
      - Sanitização automática de textos: substituição mandatória de "Suporte 24/7" por "Suporte por WhatsApp" e correção de qualquer grafia "Interprise" para "Enterprise" (regra E1).
    - **Ações e Reordenação**:
      - Botões de rodapé na ordem e estilos exatos do mockup S2 (`Editar plano` primário à esquerda e `Ocultar` / `Publicar` de contorno à direita).
      - Reordenação suave de planos com persistência na API (`api.plans.reorder`).
      - Modal completo de criação e edição com sugestões em 1 clique e campo de preço anual.
    - **Testes e Homologação**:
      - Testes automatizados Jest em `backend/tests/superadminH4H5.test.js` passando 100% (12/12 testes).
      - Compilação de produção Vite (`npm run build`) executada com sucesso absoluto em 3.22s.
- **21/10/2026 - Fase 42: H6 — Detalhes do Salão no Super Admin (`TenantDetailAdmin.jsx`) [Concluída]:**
  - **Fidelidade 1:1 com o Mockup Canônico S3 (`S3 · Super Admin — Salão@2x.png`)**:
    - **Navegação e Cabeçalho Superior**:
      - Link de retorno suave `← Salões e clientes` direcionando de volta para a listagem.
      - Nome do salão em destaque Playfair Display ("Studio Thais") acompanhado de pílula semântica de status (`Ativo` em verde pastel `#E8F5E9`).
      - Pílula com o slug de acesso (`/studiothais`) e botão discreto `Copiar link` com feedback instantâneo de cópia via toast.
      - Botão de contorno arredondado `Abrir painel do salão ↗` com link externo para o portal do salão.
    - **Abas de Navegação Editorial**:
      - Abas estruturadas: **Visão geral**, **Equipe**, **Clientes**, **Faturamento** e **Faturas SaaS**, com indicador sublinhado na cor brand `#7C3A4D` na aba selecionada.
    - **Card de Informações Base**:
      - Campo de nome do salão com foco acessível.
      - Campo de endereço (slug) bloqueado por padrão exibindo aviso educativo de proteção contra quebra de rotas (`Bloqueado · alterar quebra os links`).
      - Campos de cor primária e secundária com amostra circular interativa de prévia e código hexadecimal associado.
      - Controle segmentado em pílula para **Status da conta** (**Ativo**, **Suspenso**, **Cancelado**).
      - Seletor de **Plano de assinatura** com preço formatado em padrão monetário brasileiro via `formatCurrency` (`Enterprise · R$ 99,90/mês`).
      - Botão primário dominante em pílula bordô `Salvar alterações`.
    - **Cards Laterais de Gestão (Coluna Direita)**:
      - **Card Assinatura**: exibição do plano associado, valor com numerais alinhados (`tabular-nums lining-nums`) e situação das faturas (`Em dia` em pílula verde).
      - **Card Zona de Risco**: integrado à proteção contra suspensão acidental (H7), com botão `Suspender conta...` (quando ativo) e `Reativar conta do salão (1 clique)` (quando suspenso).
    - **Testes e Homologação**:
      - Criada suíte de testes unitários Jest em `backend/tests/detalheSalaoH6.test.js` com 9 de 9 testes passando 100%.
      - Compilação de produção Vite (`npm run build`) executada com sucesso absoluto em 3.98s.
      - Homologação visual e funcional via browser subagent autenticado como Super Admin com navegação, conferência de campos, alternância de abas e gravação de sessão em vídeo WebP (`superadmin_salao_h6_1792616193479.webp`).

- **21/10/2026 - Redesign Editorial da Tela de Login do Super Admin (`SuperAdminLogin.jsx`) [Concluída]:**
  - **Identidade Visual Rosé Editorial Split-Screen**:
    - **Coluna Esquerda (Vitrine Institucional Master)**: acabamento em degradê escuro sofisticado (`#231A1E` a `#1A1215`), título OperaBeauty SaaS em serifada Playfair Display, badge institucional de governança e três cartões de destaque translúcidos em vidro (`Multi-Tenant Isolado`, `PostgreSQL Dedicado & Redis` e `Trilha de Auditoria Audit Trail`), além de indicador de status operacional com pulso verde.
    - **Coluna Direita (Autenticação de Alta Segurança)**: monograma editorial "OB", título "Acesso do Mestre", campos de e-mail e chave de segurança com ícones Lucide, alternador interativo de visibilidade de senha (olho), checkbox de persistência de sessão e botão primário em pílula bordô `Entrar no Painel Global`.
    - **Testes e Validação**: Compilação de produção Vite (`npm run build`) e homologação visual e funcional via navegador autenticado como Super Admin com gravação de sessão em vídeo WebP (`superadmin_login_novo_1792616806401.webp`).

- **21/10/2026 - Fase 42: J7 — Padronização Universal de Estados Vazios (`EstadoVazio.jsx`) [Concluída]:**
  - **Componente Universal `EstadoVazio.jsx` Integrado**:
    - Padronização em 100% dos painéis eliminando mensagens cruas, tabelas desprovidas de contexto e textos vazios impessoais.
    - Estrutura com ícone contextual circular rosé (`bg-[#F6E4E4]`, `text-brand`), título em serifada Playfair Display, descrição acolhedora em Plus Jakarta Sans e botão primário de ação em pílula bordô conectado à ação da tela.
  - **Páginas do Painel do Gestor Atualizadas**:
    - `GestaoEquipe.jsx`: estado vazio para quando não houver profissionais cadastrados, com ação `+ Adicionar Profissional`.
    - `ControleEstoque.jsx`: estado vazio para estoque zerado com ação `+ Novo Produto` ou `Ver todos os itens`.
    - `GestaoServicos.jsx`: estado vazio para catálogo sem procedimentos com ação `+ Novo Serviço`.
    - `GestaoGiftCards.jsx`: estado vazio para ausência de vales-presente emitidos, tanto no desktop quanto no card mobile.
    - `GestaoAssinaturas.jsx`: estados vazios dedicados nas abas de planos de fidelidade (com ação `+ Criar Primeiro Plano`) e assinantes.
  - **Páginas do Super Admin Atualizadas**:
    - `TenantDetailAdmin.jsx`: integrado nas abas de Equipe, Clientes, Faturamento e Faturas SaaS.
    - `EquipeAdmin.jsx`: estado vazio com ícone `ShieldCheck` e ação `+ Novo Administrador`.
    - `AvisosAdmin.jsx`: estado vazio com ícone `Bell` e ação `+ Criar Primeiro Aviso`.
    - `FeatureFlagsAdmin.jsx`: estado vazio com ícone `ToggleLeft` e ação `+ Criar Feature Flag`.
    - `AuditoriaAdmin.jsx`: estados vazios acolhedores para métricas de armazenamento do CRM e logs de auditoria.
  - **Testes e Homologação**:
    - Criada suíte de testes unitários Jest em `backend/tests/estadosVaziosJ7.test.js` passando 100% (7/7 testes).
    - Compilação de produção Vite (`npm run build`) executada com sucesso absoluto em 2.00s.
    - Homologação visual e funcional no navegador via subagente com gravação de sessão em vídeo WebP (`superadmin_estados_vazios_j7_1792618430576.webp`) e capturas de tela arquivadas.

- **21/10/2026 - Fase 42: J9 — Limpeza de Dados e Textos (Regra 9.1 itens 7 a 9) [Concluída]:**
  - **Migração de Dados no PostgreSQL (`phase11_cleanup_data_and_texts.sql`)**:
    - **Planos SaaS (`cap_plans`)**: Sanitização das descrições de `features` em UTF-8 limpo sem caracteres corrompidos (`??`), consolidação do plano `Enterprise` e substituição formal de "Suporte 24/7" por "Suporte por WhatsApp" (E1).
    - **Base de Clientes Demonstrativa (`cap_clients`)**: Substituição de dados brutos ("Cliente Teste") por cadastro feminino realista e refinado ("Beatriz Alcantara", aniversário `14/05/1992`, telefone `(11) 99888-2020` e classificação `★ VIP`).
    - **Equipe Gestora (`cap_staff`)**: Atualização do cargo genérico "Gestor" para "Thais Rodrigues", gestora proprietária do salão demo Studio Thais.
    - **Timeline e Observações da Cliente (`cap_timeline_notes`)**: Limpeza total de registros de teste que continham o texto cru "teste" e remoção de referências a imagens locais inexistentes/quebradas (`image_path`), substituídas por anotações técnicas e acolhedoras de procedimentos capilares e estéticos de alto padrão.
  - **Higienização de Textos e Formatação no Frontend**:
    - **Pluralização Rigorosa em KPIs**: No painel geral do Super Admin (`SuperAdmin.jsx`), eliminação de `cancelamento(s)` no KPI de Churn, substituído por pluralização estrita: `1 cancelamento` vs `${metrics.suspended_tenants} cancelamentos`.
    - **Padronização Monetária Brasileira**: Em `ConfiguracoesOperacionais.jsx` e `GestaoGiftCards.jsx`, todos os valores monetários foram padronizados para o formato brasileiro com vírgula para centavos (`R$ 99,90`), eliminando exibições inadequadas com ponto decimal.
  - **Testes e Homologação**:
    - Criada suíte de testes automatizados Jest em `backend/tests/limpezaDadosTextosJ9.test.js` passando 100% (5/5 testes).
    - Compilação de produção Vite (`npm run build`) executada com sucesso em 2.16s.
- **21/10/2026 - Fase 42: H9 — Auditoria Visível do Super Admin (§9.5·H9) [Concluída]:**
  - **Trilha de Auditoria Especializada e Imutável no Backend**:
    - Em `auditService.js` e `superadminService.js`, implementada a captura dos estados anterior e novo (`old_data` e `new_data`), disparando eventos especializados de segurança: `UPDATE_TENANT_PLAN` (com plano anterior, preço, novo plano e novo preço), `UPDATE_TENANT_SLUG` (slug antigo vs novo), `UPDATE_TENANT` (modificações gerais), `SUSPEND_TENANT` (com motivo, usuário executor e bloqueio) e `REACTIVATE_TENANT`.
    - Rota `GET /api/superadmin/audit-logs` enriquecida com query parameters (`action`, `tenant_id`, `search`, `limit`) e `LEFT JOIN` com `cap_tenants` e `cap_platform_admins`.
  - **Interface Rosé Editorial (`AuditoriaAdmin.jsx`)**:
    - Cabeçalho institucional com pílula de segurança ativa ("Audit Trail Ativo & Imutável"), abas dedicadas para Logs de Segurança e Armazenamento por Studio com contadores dinâmicos.
    - Pílulas de filtro rápido por ação, busca em tempo real, badges semânticas coloridas por criticidade e modal `ModalDetalhesAuditoria` com comparativo Antes vs Depois (diff visual) e metadados de IP, data/hora e identificador da transação.
  - **Controle Seguro de Slug (`TenantDetailAdmin.jsx`)**:
    - Desbloqueio explícito com alerta de quebra de links públicos e gravação na auditoria.
  - **Testes e Homologação**:
    - Suíte de testes Jest em `backend/tests/auditoriaAdminH9.test.js` passando 100% (7/7 testes).
    - Homologação visual gravada no browser: `superadmin_auditoria_h9_perfeita_1792628377759.webp`.

- **21/10/2026 - Fase 42: J8 — Responsividade do Painel do Gestor (Mobile, Tablet e Desktop) (§9.6·J8) [Concluída]:**
  - **Navegação & Drawer Adaptativo (`AdminLayout.jsx`)**:
    - Breakpoint da barra lateral redefinido para `lg:` (1024px+). Telas menores (tablets em modo retrato na recepção e smartphones) utilizam a gaveta retrátil suave com transição animada e backdrop overlay escurecido com blur (`bg-black/50 backdrop-blur-xs`).
    - Botão hambúrguer ergonômico no topo esquerdo do TopAppBar com touch target confortável (`min-h-[44px]`).
    - Atalho rápido "Agenda" no topo para acesso ágil na recepção e padding adaptativo `p-4 sm:p-6 lg:p-8`.
  - **Listagem de Clientes em Cartões no Mobile (`GestaoClientes.jsx`)**:
    - Tabela corporativa encapsulada em `hidden md:block` e container em cartões Rosé Editorial em `md:hidden` para telas compactas (`< 768px`).
    - Cada cartão apresenta avatar circular rosé com monograma, nome, telefone formatado, badge de nível VIP, métricas de Visitas e Gasto Total BRL (`tabular-nums`), e botões de ação com área de toque mínima de 44px (WhatsApp, Abrir Ficha CRM e chave de redefinição de senha).
    - Barra de chips de segmentação rolável suavemente sem quebras feias (`scrollbar-none flex-nowrap`).
  - **Catálogo de Procedimentos em Cartões no Mobile (`GestaoServicos.jsx`)**:
    - Tabela desktop em `hidden md:block` e modo mobile em cartões (`md:hidden`) com nome do procedimento, status inativo, preço em destaque (`font-display text-brand`), tags de duração, retorno em dias e consumo de estoque, com botões ergonômicos de 44px (Editar, Inativar/Ativar, Excluir).
  - **Financeiro com Rolagem Suave (`GestaoFinanceira.jsx`)**:
    - Seletor de período rolável suavemente no mobile (`max-w-full overflow-x-auto scrollbar-none flex-nowrap shrink-0`) e lista de transações com visualização flexível.
  - **Testes e Homologação**:
    - Criada suíte de testes automatizados Jest em `backend/tests/responsividadeJ8.test.js` passando 100% (4/4 testes).
    - Compilação de produção Vite (`npm run build`) executada com código 0 e container Caddy reiniciado.
- **22/10/2026 - Fase 42: J10.1 — Controle de Estoque (Mockup G5 · Rosé Editorial) (§9.6·J10) [Concluída]:**
  - **Interface 1:1 Baseada no Mockup Canônico G5 (`ControleEstoque.jsx`)**:
    - **Cabeçalho Editorial**: Título em tipografia Playfair Display ("Estoque"), subtítulo institucional ("Suprimentos profissionais e produtos de venda."), botão secundário em pílula de contorno `Registrar entrada` e botão primário dominante `+ Novo item` em pílula bordô.
    - **Grade de 3 KPIs Compactos**: `ITENS CADASTRADOS` (total com subtítulo "Produtos e suprimentos"), `VALOR EM ESTOQUE` (`R$ 1.200,00` a preço de venda com numerais alinhados `tabular-nums lining-nums` via `formatCurrency`) e `ABAIXO DO MÍNIMO` (com badge semântico suave `Repor em breve` em âmbar pastel ou `Tudo em dia` em verde pastel, eliminando alarmes falsos conforme regra 9.1.4).
    - **Barra de Ferramentas**: 4 chips de filtro em pílula (**Todos os itens**, **Uso profissional**, **Venda**, **Abaixo do mínimo**) e busca em tempo real com ícone de lupa e limpeza em 1 clique.
    - **Tabela Corporativa Rosé Editorial**: linhas com hover sutil, coluna `ITEM` com ícone de caixa em container rosé suave e subtítulo contextual de finalidade e unidade, coluna `ESTOQUE` com quantidade e barra de progresso horizontal colorida por nível crítico, `MÍNIMO`, `PREÇO` formatado BRL, `SITUAÇÃO` com badge e `AÇÕES` com botões em pílula `Entrada` e `Ajustar`.
    - **Nota no Rodapé**: aviso educativo de integração com o dashboard e baixa automática de estoque após procedimentos.
    - **Modais Rosé Editorial**: modal `Registrar entrada` com atalhos numéricos rápidos (+1, +5, +10, +50) e modal `Novo/Editar item` com tipografia Playfair Display, campos de finalidade e unidade.
  - **Testes e Homologação**:
    - Criada suíte de testes automatizados Jest em `backend/tests/controleEstoqueG5.test.js` passando 100% (7/7 testes).
    - Compilação de produção Vite (`npm run build`) executada com código 0 e container Caddy atualizado.
    - Homologação visual e funcional com login autenticado da gestora (`thais@studiodatha.com`) aprovada com gravação de sessão em vídeo WebP (`estoque_g5_homologacao_v2_1792675150091.webp`).

- **22/10/2026 - Fase 42: J10.2 — PDV — Caixa Rápido (Mockup G6 · Rosé Editorial) (§9.6·J10) [Concluída]:**
  - **Interface 1:1 Baseada no Mockup Canônico G6 (`PDV.jsx`)**:
    - **Cabeçalho Editorial**: Título em Playfair Display ("PDV — caixa rápido"), subtítulo ("Venda de produtos com baixa automática de estoque.") e abas superiores Rosé Editorial com sublinhado bordô na aba ativa (**Frente de caixa** e **Histórico de vendas**).
    - **Frente de Caixa (2 Colunas)**:
      - **Coluna Esquerda (Catálogo & Busca)**: busca em tempo real em pílula por nome ou código com botão de limpeza em 1 clique, chips de categorias dinâmicas com pílula ativa bordô (**Todos**, **Home care**, **Perfumaria**, **Acessórios**, **Serviços rápidos**), grid de produtos com badges semânticas de disponibilidade e quantidade, preço destacado em Playfair Display com numerais alinhados (`font-display tabular-nums lining-nums` via `formatCurrency`), botão primário circular `+` para adição rápida ao carrinho, e card com borda pontilhada `+ Cadastrar produto` abrindo modal de cadastro rápido de item no estoque.
      - **Coluna Direita (Painel de Checkout & Pagamento)**: painel fixo com contador de itens, ação de limpeza rápida, seletor de cliente opcional com modal de busca e vinculação instantânea (padrão "Venda avulsa"), controle fino de quantidades (+ / -) com validação em tempo real de estoque disponível, botão de aplicação de benefício ou cupom com modal dedicado, seleção de formas de pagamento em pílulas semânticas (**Pix**, **Crédito**, **Débito**, **Dinheiro**), quebra de valores com Subtotal, Desconto e Total destacados com numerais tabulares, e botão dominante em pílula bordô `Finalizar venda` integrado à API de baixa automática de estoque com modal de sucesso e comprovante.
    - **Histórico de Vendas**: tabela corporativa com data/hora, cliente, itens resumidos, forma de pagamento e total faturado, além de estado vazio acolhedor.
    - **Infraestrutura e Feature Flags**: Normalização de feature flags (`pdv`, `clube`, `giftcards`) em `featureFlagMiddleware.js`, `tenantService.js` e `App.jsx`, liberando o acesso ao módulo para o plano do salão.
  - **Testes e Homologação**:
    - Criada suíte de testes automatizados Jest em `backend/tests/pdvG6.test.js` passando 100% (9/9 testes).
    - Compilação de produção Vite (`npm run build`) executada com código 0 e container Caddy atualizado.
    - Homologação visual e funcional com login autenticado da gestora (`thais@studiodatha.com`) aprovada com gravação de sessão em vídeo WebP (`pdv_g6_homologacao_v2_1792679437187.webp`).

- **22/10/2026 - Fase 42: J10.3 — Catálogo de Serviços (Mockup G7 · Rosé Editorial) (§9.6·J10) [Concluída]:**
  - **Interface 1:1 Baseada no Mockup Canônico G7 (`GestaoServicos.jsx`)**:
    - **Cabeçalho Editorial**: Título em Playfair Display ("Serviços"), subtítulo institucional ("Catálogo, duração, preço e consumo de estoque.") e botão primário dominante `+ Novo serviço` em pílula bordô.
    - **Barra de Ferramentas**: 3 chips de filtro em pílula com contadores dinâmicos (**Todos**, **Ativos**, **Desativados**) e busca em tempo real com ícone de lupa e botão `X` de limpeza.
    - **Tabela Corporativa Rosé Editorial**:
      - Colunas: `SERVIÇO`, `DURAÇÃO`, `CONSUMO`, `RETORNO (DIAS)`, `VALOR`, `ATIVO`, `AÇÕES`.
      - Ícone de tesoura `Scissors` em container circular/arredondado rosé suave com nome em semibold e categoria contextual.
      - Pílulas de duração formatada (`30 min`, `60 min`).
      - Insumos de consumo de estoque vinculados ou travessão neutro `—`.
      - Dias para lembrete de retorno pós-atendimento ou travessão neutro `—`.
      - Preços formatados BRL com numerais alinhados (`tabular-nums lining-nums` via `formatCurrency`) e suporte à modalidade "A partir de".
      - Switch toggle de ativo/inativo na cor brand com atualização instantânea de estado.
      - Botão de contorno `Editar` e menu `···` para ações rápidas de ativação/inativação e exclusão com diálogo seguro.
    - **Card de Dica Editorial no Rodapé**:
      - Box estilizado rosé claro com estrela destacada e texto explicativo instruindo o preenchimento de dias de retorno para disparo de lembrete de agendamento via WhatsApp e consumo de estoque para baixa automática ao finalizar procedimentos.
    - **Modal de Cadastro/Edição**:
      - Formulário editorial completo com nome, categoria, duração, preço, dias de retorno e baixa automática de estoque de múltiplos insumos com seletores dinâmicos.
  - **Testes e Homologação**:
    - Criada suíte de testes automatizados Jest em `backend/tests/servicosG7.test.js` passando 100% (8/8 testes).
    - Compilação de produção Vite (`npm run build`) executada com código 0 e container Caddy atualizado.
    - Homologação visual e funcional com login autenticado da gestora (`thais@studiodatha.com`) aprovada com gravação de sessão em vídeo WebP (`servicos_g7_homologacao_1792680661415.webp`).

- **22/10/2026 - Fase 42: J10.4 — Gestão de Equipe (Mockup G8 · Rosé Editorial) (§9.6·J10) [Concluída]:**
  - **Interface 1:1 Baseada no Mockup Canônico G8 (`GestaoEquipe.jsx`)**:
    - **Cabeçalho Editorial**: Título em Playfair Display ("Equipe"), subtítulo institucional ("Profissionais, comissões e desempenho."), indicador em pílula do limite do plano ("N de 5 profissionais no seu plano") e botão primário dominante `+ Novo profissional` em pílula bordô.
    - **Grid de Cartões dos Profissionais**:
      - Avatares circulares rosé com monograma ("CA", "TH", etc.).
      - Nome em Playfair Display, cargo ("Profissional" / "Gestor").
      - Badge de status `Ativo` em verde pastel suave.
      - Telefone com máscara amigável e indicador de e-mail cadastrado.
      - Subcards de métricas estilizados com rótulo uppercase para `COMISSÃO` (percentual com numerais tabulares `1,2%`, `0,00%`) e `NOTA MÉDIA` (`★ 5` ou travessão `—`).
      - Botão de contorno `Editar` e botão de contorno bordô `Horários e serviços`.
    - **Seção Desempenho do Mês**:
      - Título em Playfair Display com seletor segmentado em pílula (`Mês atual` / `Mês anterior`).
      - 2 KPIs canônicos para `SERVIÇOS CONCLUÍDOS` e `COMISSÃO GERADA` (`tabular-nums lining-nums` via `formatCurrency`).
      - Quadro pontilhado acolhedor quando sem atendimentos ("Sem atendimentos concluídos neste mês. O ranking de comissões por profissional aparece aqui.") e ranking detalhado de profissionais quando ativo.
    - **Modais Editoriais**:
      - Modal de criação/edição de profissional e modal de horários e serviços habilitados com seleção ágil por checkboxes.
  - **Testes e Homologação**:
    - Criada suíte de testes automatizados Jest em `backend/tests/equipeG8.test.js` passando 100% (6/6 testes).
    - Compilação de produção Vite (`npm run build`) executada com código 0 e container Caddy atualizado.
    - Homologação visual e funcional com login autenticado da gestora (`thais@studiodatha.com`) aprovada com gravação de sessão em vídeo WebP (`equipe_g8_homologacao_1792683216283.webp`).

- **22/10/2026 - Fase 42: J10.5 — Clube de Assinaturas (Mockup G9 · Rosé Editorial) (§9.6·J10) [Concluída]:**
  - **Interface 1:1 Baseada no Mockup Canônico G9 (`GestaoAssinaturas.jsx`)**:
    - **Cabeçalho Editorial**: Título em Playfair Display ("Clube de assinaturas"), subtítulo institucional ("Planos recorrentes para fidelizar clientes e garantir receita no mês.") e botão primário dominante `+ Criar plano` em pílula bordô.
    - **Grade de 3 KPIs Compactos**: `PLANOS ATIVOS` (total de planos ofertados no clube), `ASSINANTES` (base de clientes com assinatura ativa) e `RECEITA RECORRENTE` (MRR mensal consolidado formatado com numerais alinhados `tabular-nums lining-nums` via `formatCurrency`).
    - **Abas Superiores**: `Planos do clube` e `Clientes assinantes (N)` com sublinhado bordô na aba ativa.
    - **Layout Canônico em 2 Colunas**:
      - **Coluna Esquerda**: cartões dos planos de assinatura (`rounded-[24px] border border-line bg-white p-6 sm:p-8`) com nome em Playfair Display, badge semântica suave de status (`Ativo` / `Vendas pausadas`), pílula de periodicidade (`Mensal`), descrição explicativa, caixa de serviços inclusos e uso por ciclo (`N sessões`), preço formatado BRL com sufixo `/mês`, contador de assinantes vinculados, botão primário em pílula bordô `Editar` e botão de contorno `Pausar vendas` / `Reativar vendas`.
      - **Coluna Direita (Preview do App)**: preview interativo em alta fidelidade ("COMO A CLIENTE VÊ NO APP") com moldura e borda dourada âmbar (`border-2 border-amber-200/80`), ícone de estrela rosé, rótulo "CLUBE STUDIO", resumo de sessões e botão dominante de contratação `Assinar por R$ .../mês`.
    - **Aba de Assinantes**: tabela corporativa com cliente, plano contratado, créditos restantes, ciclo, próxima renovação e botão de renovação manual de ciclo.
    - **Modais Editoriais**: modal de criação e edição com nome, descrição, preço, sessões por mês e vínculo dinâmico com serviços.
  - **Testes e Homologação**:
    - Criada suíte de testes automatizados Jest em `backend/tests/clubeG9.test.js` passando 100% (7/7 testes).
    - Compilação de produção Vite (`npm run build`) executada com código 0 e container Caddy atualizado.
    - Homologação visual e funcional com login autenticado da gestora (`thais@studiodatha.com`) aprovada com gravação de sessão em vídeo WebP (`clube_g9_homologacao_1792684250181.webp`).

- **22/10/2026 - Fase 42: J10.6 — Gestão de Vales-Presente (Mockup G10 · Rosé Editorial) (§9.6·J10) [Concluída]:**
  - **Interface 1:1 Baseada no Mockup Canônico G10 (`GestaoGiftCards.jsx`)**:
    - **Cabeçalho Editorial com Validação PIX**: Título em Playfair Display ("Vales-presente"), subtítulo institucional ("Acompanhe vendas, pagamentos e resgates.") e barra de validação de pagamento PIX integrada em pílula no topo direito com input mono `VP-XXXXXXXX`, botão bordô `Consultar` e modal de confirmação de recebimento com ativação instantânea do vale.
    - **Grade de 3 KPIs Compactos**: `VENDIDOS NO MÊS` (faturamento com contador de vales), `RESGATADOS` (total consumido e quantidade) e `SALDO EM ABERTO` (vales ativos a honrar) com numerais alinhados `tabular-nums lining-nums` via `formatCurrency`.
    - **Barra de Ferramentas**: 4 chips de filtro em pílula (**Todos**, **Ativos**, **Resgatados**, **Aguardando pagamento**) e campo de busca em pílula por código ou nome com limpeza em 1 clique.
    - **Tabela Corporativa Rosé Editorial**: colunas `SOLICITAÇÃO` (código mono), `CÓDIGO DO VALE` (código de resgate mono com botão de cópia rápida `Copiar` e feedback "Copiado!"), `PRESENTEADO(A)`, `VALOR`, `SALDO`, `PAGAMENTO` (`Pago` em verde pastel ou `Pendente`), `SITUAÇÃO` (`Ativo`, `Resgatado`, `Parcial`) e `AÇÕES` com menu dropdown `···` de opções contextuais.
    - **Paginação e Responsividade**: seletor de itens por página (`5`, `10`, `20`, `Todos`), navegação entre páginas e modo mobile em cartões compactos com área de toque mínima de 44px.
  - **Testes e Homologação**:
    - Criada suíte de testes automatizados Jest em `backend/tests/giftCardsG10.test.js` passando 100% (6/6 testes).
    - Compilação de produção Vite (`npm run build`) executada com código 0 e container Caddy atualizado.

- **22/10/2026 - Fase 42: J10.7 — Configurações Operacionais, Segurança/LGPD e Assinatura SaaS (§9.6·J10) [Concluída]:**
  - **Configurações Operacionais (`ConfiguracoesOperacionais.jsx`)**: Título em Playfair Display ("Configurações operacionais"), subtítulo institucional e botão de ação em pílula bordô `Salvar alterações`; layout editorial em 2 colunas com cards Rosé Editorial (`rounded-[22px] border border-line bg-white shadow-xs`): **Jornada de funcionamento padrão** com switches toggle na cor brand (`peer-checked:bg-brand`) e inputs de abertura/fechamento em cápsula; **Contato & localização** com endereço comercial em textarea e inputs de redes sociais (Instagram, Facebook e WhatsApp) com ícones dedicados; **Métodos de recebimento PIX** com tipo de chave, chave PIX mono, titular e documento; **Regras de cashback e fidelidade** com cálculo percentual e validade; **Self check-in & menu de espera (Mimos)** com alternador e tags dinâmicas de mimos adicionados; **Exceções de horário** com lista e modal Rosé Editorial de nova exceção; **Cupons de desconto** com lista e modal Rosé Editorial de novo cupom; e card acolhedor de impacto na jornada.
  - **Segurança & Privacidade LGPD (`GestaoLGPD.jsx`)**: Título em Playfair Display ("Segurança & privacidade (LGPD)") com pílula de conformidade ativa, grade de 3 KPIs compactos (`TERMOS GERADOS`, `ASSINATURAS PENDENTES`, `ASSINADOS (VÁLIDOS)`), formulário de disparo direto para app da cliente com seleção de cliente e modelo legal, listagem de últimas solicitações com hashes criptográficos mono, e gestão de modelos legais de termos de consentimento com formulário retrátil.
  - **Minha Assinatura (`AssinaturaSaaS.jsx`)**: Redesenho com Playfair Display, status regular em verde pastel, valor mensal formatado BRL via `formatCurrency` (`tabular-nums lining-nums`), situação das faturas e histórico de faturas do salão.
  - **Testes e Homologação**:
    - Criada suíte de testes automatizados Jest em `backend/tests/configuracoesOperacionaisG10.test.js` passando 100% (6/6 testes).
    - Compilação de produção Vite (`npm run build`) executada com código 0 e container Caddy atualizado.
    - Homologação visual e funcional com login autenticado da gestora (`thais@studiodatha.com`) aprovada com gravação de sessão em vídeo WebP (`config_lgpd_homologacao_1792687255112.webp`).

- **22/10/2026 - Fase 42: J10.8 — Comissões do Profissional (Portal Staff) [Concluída]:**
  - **Rebranding Editorial Completo (`ComissoesProfissional.jsx`)**:
    - **Cabeçalho & Controles**: Título em Playfair Display ("Minhas comissões"), subtítulo ("Acompanhe seus atendimentos, comissões a receber e histórico de repasses.") e segmented control em pílula bordô (**Mês atual**, **Mês anterior**, **Todo o período**).
    - **Grade de 3 KPIs Compactos**: `A RECEBER (PENDENTE)` (com valor formatado via `formatCurrency` e aviso de status), `JÁ RECEBIDO (PAGO)` (com numerais alinhados e indicador "Repasses concluídos") e `FATURAMENTO GERADO` (produção total gerada pelo profissional).
    - **Tabela Corporativa & Cartões Mobile**: linhas elegantes com data e hora (`tabular-nums`), cliente com monograma circular rosé, serviço prestado, valor do atendimento, percentual da comissão acordada e comissão calculada com numerais tabulares e lining figures (`tabular-nums lining-nums` via `formatCurrency`), badge de status do repasse (`A receber` em âmbar suave ou `Pago` em verde suave) e estado vazio acolhedor. Modo mobile em cartões com áreas de toque acessíveis.
  - **Testes e Homologação**:
    - Criada suíte de testes automatizados Jest em `backend/tests/comissoesProfissional.test.js` passando 100% (2/2 testes).
    - Compilação de produção Vite (`npm run build`) executada com código 0 e container Caddy atualizado.
    - Homologação visual e funcional via navegador aprovada com sucesso com gravação de sessão em vídeo WebP (`comissoes_homologacao_1792691565839.webp`).

- **22/10/2026 - Ajuste de Segmentação no CRM de Clientes (Filtro VIP) [Concluída]:**
  - **Diagnóstico da Causa Raiz**: O filtro anterior em `GestaoClientes.jsx` utilizava uma heurística mista (`['Ouro', 'VIP', 'Black'].includes(c.vip_tier) || Number(c.ltv || 0) >= 500`). Como clientes cadastrados com tier 'Prata' poderiam ter gasto acumulado superior a R$ 500,00 (ex: Caio Franca com R$ 711,00), eles eram capturados pelo filtro e mantinham a badge 'Prata', gerando a percepção visual de que a lista de clientes não mudava ao clicar no chip "VIP".
  - **Ajuste Canônico**: Restringido o predicado do segmento estritamente para `c => c.vip_tier === 'VIP' || c.vip_tier === 'Black'`, alinhando a fidelidade da filtragem à classificação formal atribuída à cliente.
  - **Testes e Homologação**:
    - Atualizado teste unitário em `backend/tests/gestaoClientes.test.js` validando que clientes de outros tiers (como Prata) não constam no filtro VIP mesmo que possuam LTV elevado (7/7 testes passando 100%).
    - Compilação de produção Vite (`npm run build`) concluída com sucesso em 2.85s.
    - Homologação visual via subagente com gravação em vídeo WebP (`vip_filter_check_1792692138766.webp`) e captura de tela demonstrando que apenas a cliente VIP (Beatriz Alcantara) é exibida quando o chip VIP está ativo.

- **22/10/2026 - Fase 43: C1 (P0) — Automação de Backup do PostgreSQL e Disaster Recovery (§4·C1) [Concluída]:**
  - **Arquitetura de Backup e Formato Customizado (`scripts/backup.sh`)**:
    - Implementado script automatizado de backup utilizando `pg_dump -U postgres -Fc operabeauty` direto do container Docker `operabeauty-db`. O formato binário customizado (`-Fc`) garante compressão embutida, suporte a restauração paralela e verificação segura de tabela de conteúdos (TOC).
    - Adicionado backup automático do volume de uploads `operabeauty-uploads` (fotos de procedimentos, CRM e anexos da anamnese) via `tar czf`.
    - Criptografia simétrica com OpenSSL utilizando cifra AES-256-CBC com PBKDF2 e salt criptográfico para ambos os arquivos (.dump.enc e .tar.gz.enc), eliminando qualquer exposição de dados sensíveis em repouso.
    - Implementada política de retenção 7/4/6:
      - 7 cópias diárias em `daily/` (purga automática após 7 dias);
      - 4 cópias semanais em `weekly/` (arquivamento automático aos domingos, retenção de 28 dias);
      - 6 cópias mensais em `monthly/` (arquivamento no primeiro dia do mês, retenção de 180 dias).
    - Suporte nativo à sincronização externa com buckets compatíveis com S3 (AWS S3, Cloudflare R2 ou Backblaze B2) e integração com webhooks do Discord e Telegram para alertas imediatos de falha e sucesso.
  - **Script de Restauração e Verificação (`scripts/restore.sh`)**:
    - Desenvolvido script de recuperação com descriptografia OpenSSL, validação da assinatura de cabeçalho `PGDMP`, execução de `pg_restore` com `--clean` e `--if-exists`, e restauração do volume de uploads.
    - Suporte ao modo `--verify-only` para testes de integridade periódicos não destrutivos sem impacto no banco em produção.
  - **Documentação de Disaster Recovery (`docs/backup.md`)**:
    - Documentação completa com instruções de agendamento via `crontab` (diariamente às 03:00), guia de variáveis de ambiente, simulações de verificação e passo a passo de restauração emergencial.
  - **Testes e Homologação**:
    - Criada suíte de testes automatizados Jest em `backend/tests/backupAutomationC1.test.js` passando 100% (12/12 testes).
    - Execução do backup e verificação de restauração não destrutiva (`--verify-only`) testadas e validadas com sucesso prático.

- **22/10/2026 - Fase 43: C2 (P0) — Bloqueio Estrito de Agendamento Duplo Concorrente (§4·C2) [Concluída]:**
  - **Diagnóstico da Causa Raiz**:
    - A função `createAppointment` realizava a inserção direta na tabela `public.cap_appointments` sem conferir sobreposição de intervalos e sem aplicar travas de concorrência. Se dois clientes clicassem simultaneamente no mesmo horário vago, ambas as requisições geravam agendamentos confirmados para o mesmo profissional.
  - **Exclusion Constraint GiST no PostgreSQL (`phase12_prevent_double_booking.sql`, `database.md`, `init.sql`)**:
    - Ativada a extensão `btree_gist` e adicionada a restrição de integridade física `no_overlapping_appointments`:
      ```sql
      ALTER TABLE public.cap_appointments 
      ADD CONSTRAINT no_overlapping_appointments 
      EXCLUDE USING gist (
        tenant_id WITH =,
        staff_id WITH =,
        tstzrange(start_time, end_time) WITH &&
      ) 
      WHERE (status <> 'cancelled');
      ```
    - A restrição impede no nível de motor do banco de dados qualquer inserção de agendamentos com sobreposição temporal (`&&`) para o mesmo profissional e tenant, permitindo a reutilização imediata do slot caso o agendamento anterior tenha sido cancelado (`WHERE (status <> 'cancelled')`).
  - **Camada Transacional com Lock Pessimista (`appointmentService.js`)**:
    - Em `createAppointment` e `updateAppointment`, implementado `SELECT id FROM public.cap_staff WHERE id = $1 AND tenant_id = $2 FOR UPDATE`, serializando tentativas simultâneas para o mesmo profissional.
    - Checagem atômica de sobreposição de intervalo (`start_time < $4 AND end_time > $3`) dentro da transação, devolvendo status 409 com mensagem acolhedora: *"Esse horário acabou de ser ocupado. Por favor, escolha outro horário."*.
    - Tratamento de exceção capturando violação da constraint `no_overlapping_appointments` (código `23P01`) e mapeando-a de forma limpa para HTTP 409 Conflict em `routes/appointments.js`.
  - **Testes e Homologação**:
    - Criada suíte de testes automatizados Jest em `backend/tests/agendamentoDuploC2.test.js` com 10/10 testes passando 100%.
    - Teste de regressão em `backend/tests/routes/appointments.test.js` atualizado e passando 100% (6/6).
    - Executados testes de concorrência e sobreposição diretamente no container PostgreSQL com `psql`, comprovando recusa imediata de agendamentos sobrepostos e liberação automática de horários cancelados.

- **22/10/2026 - Fase 43: C3 (P0) — Sessão do Celular e Identificador Estável de Dispositivo (§4·C3) [Concluída]:**
  - **Diagnóstico da Causa Raiz**:
    - O serviço de renovação de sessão (`refreshTokenService` em `backend/services/authService.js`) comparava estritamente `tokenData.ip_address !== reqIp`. Quando um cliente ou profissional em smartphone alternava de Wi-Fi para rede móvel 4G/5G (ou vice-versa), o IP público sofria alteração instantânea, provocando a exclusão de toda a família de refresh tokens e forçando logout abrupto com erro "Dispositivo não reconhecido".
  - **Identificador Estável de Dispositivo (`device_id`) e Migração DDL**:
    - Criada a migração `migrations/phase13_stable_mobile_session.sql` adicionando a coluna `device_id TEXT` e o índice otimizado `idx_cap_refresh_tokens_device` na tabela `public.cap_refresh_tokens`.
    - Sincronização executada em `database.md`, `init.sql` e `init_database.sql`.
  - **Frontend (`src/lib/api.js`)**:
    - Implementada a função `getDeviceId()` que gera um UUID v4 persistido em `localStorage ('operabeauty_device_id')`.
    - O cabeçalho `x-device-id` passa a ser injetado automaticamente em todas as requisições HTTP e na chamada do endpoint de renovação `/auth/refresh-token`.
  - **Backend (`backend/services/authService.js` e `backend/routes/auth.js`)**:
    - `generateAuthData`: atualizado para aceitar `deviceId` e gravá-lo no banco no momento do login (staff, client, superadmin e register).
    - `setAuthCookies`: emite cookie seguro e duradouro `device_id` (1 ano) em conjunto com o `refresh_token`.
    - `refreshTokenService`:
      - Se houver `device_id` registrado e o `device_id` recebido na requisição for divergente, a família de tokens é imediatamente revogada com alerta crítico de segurança e retorno HTTP 401 (bloqueio rigoroso de roubo de sessão ou uso em aparelho não autorizado).
      - Se apenas o endereço IP mudou (troca de Wi-Fi para 4G/5G no mesmo aparelho), a sessão permanece plenamente válida e renova normalmente, registrando evento de auditoria (`[Audit Session C3] Transição de rede detectada`).
      - Preserva e propaga o `device_id` no payload rotacionado.
  - **Testes e Homologação**:
    - Criada suíte de testes automatizados Jest em `backend/tests/sessaoCelularC3.test.js` com 15/15 testes passando 100%.
    - Teste de rotas de auth (`backend/tests/routes/auth.test.js`) atualizado e passando 100%.
    - Container Docker `operabeauty-api` rebuildado e validado com sucesso.

- **22/10/2026 - Fase 43: C4 (P0) — Segredos e Ambiente (§4·C4) [Concluída]:**
  - **Diagnóstico da Causa Raiz**:
    - Arquivos compactados antigos de deploy (`.zip` e `.tar.gz`), arquivos de ambiente de homologação (`.env.vm`) e o diretório compilado `dist/` estavam presentes na raiz do repositório e rastreados pelo Git, gerando risco de vazamento de credenciais legadas e poluição do histórico.
    - O `.gitignore` anterior cobria apenas `.env` e `backend/.env`, deixando expostos eventuais sufixos (`.env.vm`, `.env.production`, etc.) e extensões compactadas.
  - **Blindagem do `.gitignore`**:
    - Padronização rigorosa para ignorar `.env*` de forma universal, preservando exclusivamente `!.env.example`.
    - Bloqueio de pacotes de build e arquivos compactados: `dist/`, `dist-ssr/`, `*.zip`, `*.tar.gz`, `*.tgz`, `*.rar`, `*.7z`.
    - Bloqueio de artefatos criptografados e certificados: `*.enc`, `*.pem`, `*.key`.
  - **Desindexação e Purga**:
    - Executado `git rm --cached` desindexando `dist/`, `.env.vm` e todos os arquivos `.zip`/`.tar.gz`.
    - Excluídos fisicamente da raiz do repositório todos os pacotes obsoletos de deploy (`operabeauty_deploy.tar.gz`, `operabeauty_deploy.zip`, `operabeauty_deploy_fixed.zip`, `operabeauty_vps_update.zip`, `operabeauty_vps_update_novo.zip`) e o arquivo `.env.vm`.
  - **Template Seguro (`.env.example`) & Utilitário (`scripts/generate-secrets.js`)**:
    - `.env.example` reestruturado com todas as variáveis obrigatórias (JWT, Gateway Encryption, Disaster Recovery, PostgreSQL, Redis, VAPID, Webhooks), sem senhas reais vazadas e com instruções explícitas de permissão `chmod 600 .env` em produção.
    - Desenvolvido `scripts/generate-secrets.js` para geração de chaves criptográficas de 256 bits com alta entropia (`crypto.randomBytes(32)`).
  - **Testes e Homologação**:
    - Criada suíte de testes automatizados Jest em `backend/tests/segredosAmbienteC4.test.js` com 11/11 testes passando 100%.

- **22/10/2026 - Fase 43: C5 (P1) — Usuário de Banco com Privilégio Mínimo (§4·C5) [Concluída]:**
  - **Diagnóstico e Princípio Constitucional**:
    - A aplicação web Express utilizava o superusuário `postgres` para todas as conexões de banco de dados, violando o princípio de Menor Privilégio (*Least Privilege*) e expondo o banco a riscos operacionais desnecessários caso ocorresse falha ou injeção SQL hipotética.
  - **Criação do Papel `opera_app` e Migração DDL**:
    - Desenvolvida a migração `migrations/phase14_least_privilege_user.sql` criando o role `opera_app` com atributos estritos: `NOSUPERUSER`, `NOCREATEDB`, `NOCREATEROLE`, `NOREPLICATION`, `NOBYPASSRLS`.
    - Revogada a criação em schema público de `PUBLIC` (`REVOKE CREATE ON SCHEMA public FROM PUBLIC`).
    - Concedida permissão estrita e exclusiva de DML: `SELECT, INSERT, UPDATE, DELETE` em todas as tabelas do schema `public`, leitura de sequências (`USAGE, SELECT`) e execução de rotinas/procedures.
    - Configurados privilégios padrão (`ALTER DEFAULT PRIVILEGES`) para que novos objetos criados por migrações futuras herdem automaticamente os acessos DML sem conceder comandos DDL.
  - **Sincronização Documental e Schemas Mestres**:
    - Adicionada a Seção 15 em [database.md](file:///d:/Repositorios/OperaBeauty/database.md) formalizando a matriz de papéis e responsabilidades (`opera_app` para runtime da API e `postgres` restrito a migrações e backups).
    - Bloco de criação e grants incorporado ao final de `init.sql` e `init_database.sql`.
  - **Testes e Homologação**:
    - Criada suíte de testes automatizados Jest em `backend/tests/usuarioPrivilegioMinimoC5.test.js` com 11/11 testes passando 100%.
    - Executados testes práticos via `docker exec operabeauty-db psql -U opera_app`, confirmando sucesso em leituras legítimas e bloqueio imediato com erro de permissão para tentativas de `CREATE TABLE` (`permission denied for schema public`) e `DROP TABLE` (`must be owner of table`).

- **22/10/2026 - Fase 43: C6 (P1) — Isolamento por Tenant em Profundidade (§4·C6) [Concluída]:**
  - **Diagnóstico e Defesa em Profundidade (*Defense in Depth*)**:
    - O isolamento entre salões dependia primordialmente de cláusulas manuais `WHERE tenant_id = $...` espalhadas no código. Rotas menores acessavam `pool.query` diretamente sem camada de serviço, trazendo risco de vazamento de dados (*Cross-Tenant Data Leakage*) e vulnerabilidades de IDOR (*Insecure Direct Object References*).
  - **Helper de Consulta Seguro (`backend/utils/tenantQuery.js`)**:
    - Criados os utilitários `tenantQuery` e `tenantTransaction` com validação compulsória de `tenant_id` (*Fail Closed / Default Deny*) e injeção contextual de `SET LOCAL app.current_tenant_id` em cada transação/sessão local do PostgreSQL.
  - **Proibição de `pool.query` Direto nas Rotas**:
    - Desenvolvidos os serviços dedicados `waitlistService.js`, `termService.js`, `consentService.js`, `reviewService.js`, `reportService.js` e `referralService.js`.
    - Refatoradas 100% das rotas residuais em `backend/routes/` (`waitlist.js`, `terms.js`, `consents.js`, `reviews.js`, `reports.js`, `referral.js`, `manifest.js`), eliminando completamente o uso de `pool.query` direto em rotas.
  - **Row Level Security (RLS) no Motor do PostgreSQL**:
    - Criada e executada a migração `migrations/phase15_enable_rls_tenant_isolation.sql` ativando RLS e a política `tenant_isolation_policy` nas 28 tabelas multi-tenant do schema `public`.
    - O papel `opera_app` (que possui `NOBYPASSRLS`) é contido pelo motor do banco: consultas sem variável de sessão retornam fisicamente **0 linhas** e tentativas de mutação cross-tenant afetam 0 registros.
  - **Sincronização Documental**:
    - Adicionada a Seção 16 em [database.md](file:///d:/Repositorios/OperaBeauty/database.md), Seção 8 em `init.sql` e `init_database.sql`.
- **23/10/2026 - Fase 43: C7 (P1) — Cabeçalhos de Segurança no Caddy (§4·C7) [Concluída]:**
  - **Diagnóstico e Hardening de Infraestrutura**:
    - O servidor web reverso Caddy atuava como ponto único de terminação e roteamento HTTP, porém não aplicava cabeçalhos universais de segurança (*Security Headers*), não suprimia a identificação do servidor (`Server: Caddy`) e não distinguia políticas de cache entre assets versionados por hash (`/assets/*`) e documentos SPA mutáveis (`index.html` e `sw.js`).
  - **Hardening no Caddyfile**:
    - `Strict-Transport-Security` (HSTS): forçado para 1 ano (`max-age=31536000; includeSubDomains; preload`).
    - `X-Content-Type-Options`: configurado como `nosniff` contra ataques de MIME sniffing.
    - `X-Frame-Options`: configurado como `SAMEORIGIN` contra clickjacking e incorporação indevida por terceiros.
    - `Referrer-Policy`: definido como `strict-origin-when-cross-origin` para proteção de privacidade de navegação.
    - `Permissions-Policy`: restrição estrita de APIs do navegador (`camera=(self), microphone=(), geolocation=(), payment=(self), usb=()`).
    - `X-XSS-Protection`: `1; mode=block` para clientes e navegadores legados.
    - `Content-Security-Policy-Report-Only`: ativada em modo relatório para auditar scripts externos, fontes do Google (Google Fonts / GStatic), manifest dinâmico e conexões WebSockets sem quebrar o SPA React.
    - `header -Server` e `header -X-Powered-By`: supressão total de assinaturas tecnológicas contra fingerprinting.
  - **Otimização e Estratégia de Cache**:
    - `/assets/*`: configurado com `Cache-Control: public, max-age=31536000, immutable` (assets versionados com hash do Vite têm cache máximo).
    - `/sw.js` e `/custom-sw.js`: configurado com `Cache-Control: no-cache, no-store, must-revalidate` (Service Worker sempre atualizado).
    - Fallback SPA (`index.html`): `Cache-Control: no-cache, no-store, must-revalidate`, garantindo que o navegador sempre descubra novas versões dos bundles imediatamente.
  - **Docker Compose**:
    - Adicionado mapeamento do volume `./Caddyfile:/etc/caddy/Caddyfile:ro` no serviço `caddy`, permitindo hot-reloads sem rebuild desnecessário de imagens.
  - **Testes e Homologação**:
    - Criada a suíte Jest `backend/tests/caddyHeadersC7.test.js` com 14/14 testes passando 100%.
    - Testes HTTP reais com `curl -i` em `localhost:8080` confirmaram presença de todos os cabeçalhos e remoção do cabeçalho `Server`.

- **23/10/2026 - Fase 43: C8 (P1) — Fotos do CRM Privadas (§4·C8 & J6) [Concluída]:**
  - **Diagnóstico e Vulnerabilidade de Privacidade (LGPD)**:
    - O Express expunha estaticamente a pasta `public/uploads` sem autenticação, permitindo que fotos confidenciais de prontuário, estética e saúde fossem baixadas por terceiros caso o nome fosse descoberto (*Broken Access Control*).
    - O gerador anterior utilizava números de baixa entropia (`Date.now() + randomInt(1000000000)`), facilitando enumeração.
  - **Armazenamento Privado e Criptografia**:
    - Criado o diretório seguro `backend/private_uploads/crm/` isolado por pasta de salão (`<tenantId>/`).
    - Nomes de arquivo gerados via `crypto.randomBytes(24).toString('hex')` (48 caracteres hexadecimais aleatórios com alta entropia criptográfica).
    - Criado volume Docker dedicado `operabeauty-private-uploads` mapeado em `/usr/src/app/private_uploads` em `docker-compose.yml` e `backend/Dockerfile`.
  - **Rota Autenticada e Controle de Acesso (`backend/routes/privateUploads.js`)**:
    - Endpoints `GET /api/uploads/crm/:tenantId/:filename` e `GET /api/uploads/crm/:filename`.
    - Autenticação flexível e segura: aceita Header `Authorization: Bearer`, Cookie de sessão ou Query Param `?token=...` (permitindo renderização nativa em elementos `<img>` no navegador).
    - Autorização restrita com isolamento multi-tenant: bloqueia com HTTP 403 requisições de outros salões, permitindo acesso apenas para gestores e profissionais do salão, superadministradores da plataforma ou o próprio cliente titular do prontuário.
    - Cabeçalhos de privacidade estrita: `Cache-Control: private, no-cache, no-store, must-revalidate` e `X-Content-Type-Options: nosniff`.
  - **Bloqueio de Acesso Direto**:
    - Interceptador em `backend/app.js` bloqueando qualquer requisição estática para `/uploads/crm` com HTTP 403 Forbidden.
    - Fotos públicas (logos, avatares públicos, vitrine de serviços) continuam públicas e acessíveis sem impacto.
  - **Exclusão Física de Arquivos (LGPD)**:
    - `deleteTimelineNote` em `clientService.js` atualizado para remover automaticamente o arquivo físico do disco ao deletar uma nota.
  - **Frontend Resiliente (`FichaClienteCRM.jsx`)**:
    - `ImagemAnexoTimeline` atualizado com injeção automática de token em rotas de CRM, estado de carregamento com shimmer, tratamento do erro do anexo quebrado do print original com mensagem acolhedora e botão funcional "Tentar de novo", e modal de visualização ampliada (Lightbox).
  - **Testes e Homologação**:
    - Criada a suíte de testes automatizados Jest em `backend/tests/fotosCrmPrivadasC8.test.js` com 9/9 testes passando 100%.
    - Testes reais via `curl` na porta 8080 confirmaram HTTP 401 sem token e HTTP 403 para acessos diretos.

- **23/10/2026 - Fase 43: C10 (P1) — Operações Atômicas, Idempotência e Livro-Razão (§4·C10) [Concluída]:**
  - **Integridade Estrutural de Estoque (Não-Negatividade)**:
    - Executada a migração `migrations/phase16_atomic_operations.sql` aplicando a constraint `chk_inventory_quantity_non_negative CHECK (quantity >= 0)` em `public.cap_inventory`.
    - No serviço do PDV (`productSaleService.js`), implementada ordenação estável por `inventory_id` para eliminar deadlocks, lock pessimista `SELECT ... FOR UPDATE` e baixa atômica condicional `UPDATE ... WHERE quantity >= $1 RETURNING id, quantity`, tratando amigavelmente a violação de constraint `23514`.
    - No consumo de insumos por procedimentos (`appointmentService.js`), implementada redução com `GREATEST(0.00, quantity - $1)` para prevenir estoque negativo.
  - **Cupons Atômicos em Ponto Único**:
    - Constraints `chk_coupon_uses` e `chk_coupon_current_uses_non_negative` em `public.cap_coupons`.
    - Resgate em ponto único via `couponService.js` com `UPDATE ... SET current_uses = current_uses + 1 WHERE (max_uses IS NULL OR current_uses < max_uses) RETURNING ...`, impossibilitando estouro de limite por concorrência.
  - **Carteira Digital, Cashback e Livro-Razão com Idempotência**:
    - Adicionada coluna `idempotency_key` e constraint `uq_wallet_idempotency UNIQUE (tenant_id, idempotency_key)` em `public.cap_wallet_transactions`.
    - Constraint `chk_wallet_balance_non_negative CHECK (balance >= 0.00)` em `public.cap_client_wallets`.
    - Chaves determinísticas de idempotência em `walletService.js` para ganho (`cashback:earn:${appointmentId}`), resgate (`cashback:redeem:${appointmentId}`) e estorno (`cashback:refund:${appointmentId}`), debitando a carteira com `UPDATE ... WHERE balance >= $1` e prevenindo transações duplicadas via `ON CONFLICT (tenant_id, idempotency_key) DO NOTHING`.
  - **Vales-Presente e Livro-Razão Imutável**:
    - Tabela `public.cap_giftcards` enriquecida com saldo, constraint `chk_giftcard_balance_non_negative` e chave de idempotência.
    - Criada a tabela imutável `public.cap_giftcard_redemptions` com restrição `uq_giftcard_redemption_idempotency`, concessões para `opera_app` e políticas de Row Level Security (RLS).
    - `giftcardService.js` e rotas Express com débito atômico e suporte transparente ao cabeçalho `Idempotency-Key`.
  - **DDL Sincronizado**:
    - `database.md` atualizado com a Seção 17 detalhando todas as constraints e padrões de livro-razão.
    - `init.sql` e `init_database.sql` atualizados com as constraints e novas tabelas.
  - **Testes e Homologação**:
    - Suíte Jest em `backend/tests/operacoesAtomicasC10.test.js` passando 100% (19/19 testes).
    - Validação prática via `psql` no container PostgreSQL confirmando recusa de estoque negativo, bloqueio de cupom e unicidade de chave de idempotência.
    - Container `operabeauty-api` rebuildado e validado.

- **23/10/2026 - Fase 43: C11 (P1) — Datas e Fuso Horário (§4·C11) [Concluída]:**
  - **Fuso Horário Global (America/Sao_Paulo)**:
    - Executada a migração `migrations/phase17_timezone_and_dates.sql` configurando `ALTER DATABASE operabeauty SET timezone TO 'America/Sao_Paulo'` e os papéis `postgres` e `opera_app`.
    - No Docker Compose, adicionada a variável `TZ: America/Sao_Paulo` nos contêineres `operabeauty-db`, `operabeauty-api` e `operabeauty-caddy`.
  - **Servidor Backend Express (`backend/config/db.js`)**:
    - Fixado `process.env.TZ = 'America/Sao_Paulo'` no processo Node.js.
    - Hook no pool `pool.on('connect', client => client.query("SET TIME ZONE 'America/Sao_Paulo'"))` garantindo que toda conexão do cliente execute sob o fuso de Brasília.
    - Preservado o parser de datas civis de calendário `pg.types.setTypeParser(pg.types.builtins.DATE, value => value)` retornando `"YYYY-MM-DD"` como string literal sem desvio UTC.
  - **Modelagem de Banco de Dados**:
    - Confirmado e garantido o tipo `TIMESTAMPTZ` para `start_time`, `end_time` e `created_at` em `public.cap_appointments`.
    - Preservado o tipo `DATE` puro para `birth_date`, `exception_date` e `due_date`.
  - **Utilitários do Frontend (`src/utils/formatters.js`)**:
    - Constante `DEFAULT_TIMEZONE = 'America/Sao_Paulo'`.
    - `formatDate()` com atalho para strings `YYYY-MM-DD` sem criação de objetos Date em UTC, eliminando regressão de dia (virada de 23/10 para 22/10 às 21h).
    - `formatTime()` no padrão 24 horas (`HH:MM`) e `formatDateTime()`.
    - `parseLocalDate()` criando instâncias no meio-dia local para prevenção de desvios noturnos.
  - **Testes e Homologação**:
    - Criada a suíte Jest `backend/tests/datasFusoC11.test.js` com 16/16 testes passando 100%.
    - Testes de virada de dia (23:59 vs 00:01) e simulação do horário de verão brasileiro histórico (2018 com UTC-2 vs 2026 com UTC-3) aprovados com sucesso.
    - Sincronizado na Seção 18 de `database.md`, `init.sql` e `init_database.sql`.

- **23/10/2026 - Fase 43: C12 (P1) — Rota Pública de Verificação de Telefone e Anti-Enumeração (§4·C12) [Concluída]:**
  - **Endpoint Canônico e Retrocompatibilidade (`backend/routes/auth.js`)**:
    - Criação de `GET /api/auth/check-phone` (via query params `tenant_id` ou `tenant_slug`, e `phone`).
    - Atualização de segurança do endpoint legado `POST /api/auth/check-client`.
  - **Duplo Rate Limiting Estrito (IP + Telefone)**:
    - `checkPhoneIpLimiter`: taxa máxima de 30 requisições por janela de 15 minutos por endereço IP, bloqueando raspagens automatizadas em massa.
    - `checkPhonePhoneLimiter`: taxa máxima de 5 requisições por janela de 10 minutos por número de telefone e salão (`phone_limit:${tenant}:${cleanPhone}`), com chave gerada após higienização de caracteres não numéricos (`\D`), frustrando ataques distribuídos com proxies/VPNs rotativos.
    - Resposta uniforme HTTP 429 Too Many Requests e cabeçalhos padrão IETF `RateLimit-*`.
  - **Prevenção Rigorosa de Vazamento de Dados (Anti-Enumeração de Clientes)**:
    - O serviço `checkClientExists` (`backend/services/authService.js`) normaliza o telefone, valida extensão mínima (≥ 10 dígitos) e executa consulta atômica.
    - A resposta retornada em ambas as rotas é estritamente invariável: `{ action: 'login' | 'register' }`.
    - Sob nenhuma hipótese são expostos dados pessoais, nomes, e-mails, IDs internos ou mensagens divergentes que permitam identificar a existência ou perfil de clientes.
    - Salões inexistentes recebem resposta padronizada HTTP 404 (`{"error":"Salão não encontrado."}`).
  - **Integração no Cliente Frontend (`src/lib/api.js`)**:
    - Método `api.auth.checkPhone(tenantIdOrSlug, phone)` com resolução automática de formato (UUID vs Slug) e preservação retrocompatível de `checkClientExists`.
  - **Testes e Homologação**:
    - Suíte Jest `backend/tests/verificacaoTelefoneC12.test.js` passando 100% (18/18 testes cobrindo segurança estática, rate limiters, unitários e integração Express).
    - Compilação Vite limpa em 2.15s sem quebras.
    - Contêiner `operabeauty-api` rebuildado com êxito.
    - Homologação prática via `curl.exe` no contêiner Docker ativo na porta 5001 confirmando respostas precisas: `{ "action": "login" }` para telefone cadastrado, `{ "action": "register" }` para telefone inexistente, cabeçalhos `RateLimit-*` e retorno 404 para salão inválido.

- **23/10/2026 - Fase 43: C14 (P1) — Códigos de Vale-Presente Criptográficos e Anti-Força Bruta (§4·C14) [Concluída]:**
  - **Gerador Criptográfico Seguro de Códigos (`backend/services/giftcardService.js`)**:
    - Função exportada `generateRedemptionCode()` utilizando `crypto.randomInt()`.
    - Alfabeto sem ambiguidades visuais: `23456789ABCDEFGHJKLMNPQRSTUVWXYZ` (excluídos `0`, `O`, `1`, `I`), prevenindo erros de digitação e fraudes de similaridade.
    - Estrutura canônica: `VG-XXXX-XXXX-XXXX` (12 caracteres úteis alfanuméricos com mais de 1.15 x 10^18 combinações possíveis de alta entropia, excedendo o teto de 10 caracteres).
  - **Middleware de Proteção Anti-Força Bruta e Bloqueio Temporário (`backend/middlewares/giftcardSecurity.js`)**:
    - Monitoramento atômico de tentativas falhas com suporte dual Redis + fallback em memória local.
    - Limite estrito de no máximo 5 tentativas inválidas consecutivas em uma janela de 15 minutos (`MAX_FAILED_ATTEMPTS = 5`).
    - Ao atingir 5 tentativas inválidas, a chave do requisitante entra em bloqueio temporário de 15 minutos (`giftcard_blocked:*`) e chamadas a `/validate/:code` e `/redeem/:code` são sumariamente rejeitadas com **HTTP 429 Too Many Requests**, antes de qualquer toque no banco de dados.
    - Limpeza de tentativas no sucesso: `resetGiftCardAttempts()` restaura a contagem para requisitantes legítimos após resgate ou validação bem-sucedida.
    - `giftCardIpLimiter`: taxa geral de 30 requisições / 10 minutos por IP.
  - **Testes e Homologação**:
    - Criada a suíte Jest `backend/tests/valesPresenteC14.test.js` com 12/12 testes passando 100%.
    - Testes de alta entropia (200 códigos gerados sem colisão), validação de formato e ausência de caracteres ambíguos.
    - Teste de força bruta integrado com Express Mock confirmando bloqueio rigoroso na 6ª tentativa com HTTP 429.
    - Execução da suíte regressiva completa da Fase 43 (C10, C11, C12, C14) com 65/65 testes passando 100%.
    - Compilação Vite limpa em 1.40s e container `operabeauty-api` rebuildado e ativo no Docker.

- **23/10/2026 - Fase 43: C13 (P2) — 2FA TOTP (RFC 6238) e Alertas de Segurança do Super Admin (§4·C13) [Concluída]:**
  - **Modelagem de Dados e Migração (`migrations/phase18_superadmin_2fa_and_alerts.sql`)**:
    - Adicionadas colunas `totp_secret`, `totp_enabled`, `totp_temp_secret`, `last_login_at`, `last_login_ip` e `last_login_user_agent` na tabela `public.cap_platform_admins`.
    - DDL sincronizado em `database.md` (Seção 19), `init.sql` e `init_database.sql`.
  - **Motor Criptográfico TOTP Nativo (`backend/utils/totp.js`)**:
    - Implementação 100% nativa em Node.js (sem dependências externas) de segredos Base32 (20 bytes / 160 bits via `crypto.randomBytes`), cálculo HMAC-SHA1 de 30 segundos e truncamento dinâmico RFC 4226 para código numérico de 6 dígitos.
    - Janela de tolerância temporal de ±1 step (30s passado e futuro) com comparação em tempo constante (`crypto.timingSafeEqual`) contra ataques de temporização.
    - Geração da URI canônica `otpauth://totp/...` para Google Authenticator, Authy, Microsoft Authenticator.
  - **Auditoria de Login e Alertas de Segurança (`backend/services/securityAlertService.js`)**:
    - Gravação de trilha de auditoria (`last_login_at`, `last_login_ip`, `last_login_user_agent`) no login com sucesso.
    - Detecção automática de novo IP ou aparelho em relação ao último acesso com envio de alerta para Webhook corporativo (Discord/Slack) e log de auditoria estruturado.
  - **Endpoints Backend de Autenticação e Gestão (`backend/routes/auth.js` e `authService.js`)**:
    - `POST /api/auth/login-superadmin`: se 2FA ativo, emite desafio com `temp_token` JWT de 5 minutos sem emitir sessão definitiva.
    - `POST /api/auth/login-superadmin/verify-2fa`: valida o segundo fator sob rate limit de 10 req / 10 min (`verify2faLimiter`), emite JWT final e cookies, e dispara alertas.
    - `POST /api/auth/superadmin/2fa/setup`, `/enable` e `/disable`: ciclo de vida completo de ativação e revogação do 2FA.
  - **Interface do Usuário (`src/pages/superadmin/SuperAdminLogin.jsx` e `src/lib/api.js`)**:
    - Tela de login com transição suave para Etapa 2 ("Segundo Fator de Autenticação"), campo OTP de 6 dígitos em fonte mono espaçada, mensagens semânticas e botão de retorno.
  - **Testes e Homologação**:
    - Criada a suíte Jest `backend/tests/superadmin2FaC13.test.js` com 18/18 testes passando 100%.
    - Suíte completa de segurança da Fase 43 com 83/83 testes passando 100%.
    - Compilação Vite limpa em 1.56s e contêiner `operabeauty-api` rebuildado e validado.
    - **Conclusão integral da Fase 43**.

- **23/10/2026 - Fase 44: Planejamento Arquitetural do Gateway Nativo de WhatsApp Privado (`operabeauty-wa-gateway`):**
  - **Auditoria de Segurança de Repositório de Terceiros (`WA-AKG`)**:
    - Realizada auditoria profunda de código-fonte de repositório open-source baseado em Baileys v7.
    - Identificada e neutralizada telemetria oculta ativa por padrão para servidor externo (`aikeigroup.net`), endpoints de flood/bombing perigosos com risco de banimento permanente e armadilhas de SSRF contra redes internas Docker.
    - Decisão pela **NÃO utilização do monólito original** (Next.js 16 + MySQL 8 consumindo 1.5GB de RAM).
  - **Especificação do Microsserviço Próprio (`operabeauty-wa-gateway`)**:
    - Desenho de arquitetura enxuta em Node.js puro (~80MB de RAM) hospedada na VPS em rede interna Docker isolada (`operabeauty-network`), **sem nenhuma porta exposta para a internet**.
    - Persistência das credenciais de sessão do WhatsApp criptografadas em repouso com **AES-256-GCM** diretamente no **PostgreSQL** do OperaBeauty (`cap_whatsapp_instances`, `cap_whatsapp_auth_keys`, `cap_whatsapp_messages`) com isolamento multi-tenant e RLS.
    - Comunicação M2M segura entre `operabeauty-api` e `operabeauty-wa-gateway` autenticada via token fixo `X-Internal-Secret`.
    - Suporte a botões interativos de confirmação em 1 toque (Confirmar / Remarcar) atrelados ao `cap_appointments`, fila de anti-spam com jitter humanizado e pareamento sem câmera via *Pairing Code*.
    - Documentação canônica completa criada em [`docs/whatsapp_gateway_architecture.md`](docs/whatsapp_gateway_architecture.md).

- **23/10/2026 - Fase 44: D1 (P1) — Lembretes por Push (Web Push/VAPID) com Fila no Redis (§4·D1) [Concluída]:**
  - **Gestão de Assinaturas e Multi-Tenancy (`cap_push_subscriptions`)**:
    - Assinaturas de dispositivos isoladas por salão (`tenant_id`) e usuário (`client_id` ou `staff_id`), gravadas no PostgreSQL via helper seguro `tenantQuery`.
    - Endpoint público `GET /api/notifications/vapid-public-key` liberado antes do middleware de autenticação, viabilizando handshake VAPID assíncrono e confiável no frontend.
  - **Enfileiramento Inteligente no BullMQ e Redis (`notificationService.js`)**:
    - `scheduleAppointmentReminders(appointmentId)`: calcula matematicamente as janelas de envio para 24 horas antes e 2 horas antes do procedimento.
    - Jobs agendados com `jobId` determinístico (`reminder:push:24h:<id>` e `reminder:push:2h:<id>`), delay milimétrico, 3 retentativas e backoff exponencial.
    - Agendamentos de última hora (mesmo dia com menos de 24h) enfileiram unicamente o lembrete de 2h; agendamentos imediatos (< 2h) não criam atrasos indevidos.
  - **Cancelamento e Remarcação de Agendamentos**:
    - `cancelAppointmentReminders(appointmentId)`: remove os jobs pendentes da fila do BullMQ pelo identificador único caso o agendamento seja cancelado ou excluído (`appointmentService.js`).
    - Em caso de reagendamento para novo horário, cancela os lembretes anteriores e enfileira novas notificações adaptadas ao novo horário.
  - **Worker Resiliente Anti-Falha (`notificationWorker.js`)**:
    - Antes de despachar cada notificação, consulta atomicamente no banco se o agendamento não foi cancelado ou concluído previamente (`status NOT IN ('cancelled', 'completed')`), prevenindo notificações indevidas.
    - Ao capturar erros HTTP 404 ou 410 GONE da infraestrutura de push, exclui automaticamente o registro morto de `cap_push_subscriptions`, mantendo o banco limpo e a fila 100% saudável para os demais clientes.
  - **Interface do Cliente (`src/pages/AgendamentoConfirmado.jsx`)**:
    - Botão "Quer um lembrete 24h antes?" integrado com `Notification.requestPermission()`, registro do Service Worker `/sw.js`, conversão de chave VAPID via `urlBase64ToUint8Array`, assinatura no `PushManager` do navegador e persistência no backend via `api.notifications.subscribe()`.
  - **Testes e Homologação**:
    - Criada a suíte Jest `backend/tests/lembretesPushD1.test.js` com 10/10 testes passando 100%.
    - Compilação do Vite limpa em 1.91s, contêiner `operabeauty-api` rebuildado com êxito no Docker e validação via `curl.exe` confirmando retorno HTTP 200 na rota `/api/notifications/vapid-public-key`.

- **23/10/2026 - Fase 44: D2 (P1) — WhatsApp Gateway Nativo & Lembretes Interativos em 1 Toque (§4·D2) [Concluída]:**
  - **Construção do Microsserviço Privado (`operabeauty-wa-gateway`)**:
    - Desenvolvido microsserviço dedicado e ultra-enxuto Node.js 20 sobre o motor Baileys v7, conectado exclusivamente à rede privada Docker `operabeauty-network` com **zero portas mapeadas externamente** no host ou no proxy Caddy.
    - Eliminadas 100% das telemetrias externas (`aikeigroup.net`) e vetores de ataque/spam bombing detectados no repositório auditado `WA-AKG`.
  - **Criptografia AES-256-GCM em Repouso no PostgreSQL (`cap_whatsapp_*`)**:
    - Criada migração `migrations/phase19_whatsapp_gateway_schema.sql` definindo as tabelas `cap_whatsapp_instances`, `cap_whatsapp_auth_keys` e `cap_whatsapp_messages`, com RLS multi-tenant (`tenant_id`), índices de alta performance e grants DML restritos ao papel `opera_app`.
    - Adaptador de sessão `postgresAuthState.js` persistindo credenciais e chaves criptográficas do Signal Protocol cifradas com AES-256-GCM (`enc:v1:<iv>:<tag>:<ciphertext>`), dispensando MySQL 8 e economizando 1.5GB de RAM na VPS.
  - **Fila com Jitter Anti-Ban e Botões Interativos (`messageQueue.js`)**:
    - Disparo humanizado com atraso randômico (2.5s a 5.5s) entre mensagens consecutivas do mesmo salão e simulação de presença `composing` (1.5s).
    - Formatação personalizada com nome da cliente, salão, data/hora e procedimento, além de botões interativos nativos (`quick_reply`: `confirm_appointment:<id>` e `reschedule_appointment:<id>`) com fallback automático para texto estruturado.
  - **Confirmação e Remarcação em 1 Toque via Webhook Interno (`/api/whatsapp/webhook`)**:
    - Endpoint interno protegido por segredo M2M (`X-Internal-Secret`) e verificação em tempo constante (`crypto.timingSafeEqual`).
    - Ao receber clique em confirmação ou respostas amigáveis ("1", "SIM", "OK"), atualiza atomicamente o agendamento para `confirmed` e insere nota de CRM na timeline do cliente.
    - Ao receber solicitação de remarcação ("2", "REMARCAR"), atualiza o status para `reschedule_requested` e alerta o salão na timeline.
  - **Integração no Worker e Pareamento**:
    - Suporte a conexão por Pairing Code de 8 dígitos ou QR Code.
    - Lembretes disparados de forma transparente pelo `notificationWorker.js` (24h e 2h antes) em conjunto com Web Push caso o salão possua sessão de WhatsApp ativa.
    - Métodos do cliente API expostos em `src/lib/api.js` (`api.whatsapp`).
  - **Testes e Homologação**:
    - Suíte Jest `backend/tests/whatsappGatewayD2.test.js` com 11/11 testes passando 100% (criptografia AES-256-GCM, proteção anti-adulteração, autenticação M2M, processamento de webhook e idempotência).
    - Total de testes da Fase 44 passando 100% (21/21 testes).
    - Imagens Docker `operabeauty-wa-gateway` e `operabeauty-api` construídas e ativas em produção (`operabeauty-network`).
    - Validação de chamada M2M via rede Docker interna (`http://wa-gateway:4000/health`) e verificação de bloqueio 401 sem token secreto.
    - Build do Vite (`npm run build`) concluído com sucesso limpo em 2.07s.

- **24/10/2026 - Fase 46: G8 (P1) — Correção da Tela de Vale-Presente (Minified React Error #31) [Concluída]:**
  - **Causa Raiz Identificada**:
    - Em `GestaoGiftCards.jsx`, o subcomponente `EstadoVazio` recebia `icone={Gift}` (passando a referência direta do componente/objeto `forwardRef` em vez de um elemento JSX `<Gift className="..." />`). Quando a lista de vales-presente estava vazia (ou sem autenticação prévia), o React tentava renderizar o nó `{$$typeof, render, displayName}` diretamente no DOM, disparando a exceção fatal em tempo de execução `Minified React error #31`.
  - **Blindagem Defensiva em `EstadoVazio.jsx`**:
    - Implementada função resiliente de renderização que detecta se `icone` é elemento JSX (`React.isValidElement`), componente funcional ou forwardRef (objeto com `$$typeof`), instanciando-o de forma segura `<IconComponent className="w-7 h-7 stroke-[1.7]" />`.
    - Unificação das propriedades de ação para aceitar tanto `textoAcao`/`aoClicarAcao` quanto `textoBotao`/`aoClicar` e o slot de elemento customizado `acao`.
  - **Correção em `GestaoGiftCards.jsx`**:
    - Atualizada a prop para `icone={<Gift className="w-8 h-8 text-brand" />}`, alinhados `textoAcao` e `aoClicarAcao`, e adicionado reset de estado defensivo com `setGiftCards([])` no `catch` de `fetchData`.
  - **Homologação e Build**:
    - Build de produção Vite (`npm run build`) concluído com sucesso em 16.9s gerando `./dist` atualizado e servido imediatamente no Caddy Docker (`http://localhost:8080`) e no Vite dev server (`http://localhost:5173`).

- **24/10/2026 - Fase 44: D3 (P1) — Sinal por PIX no Agendamento & Multi-Gateway Híbrido (§4·D3) [Concluída]:**
  - **Arquitetura Multi-Gateway Híbrido Flexível (`paymentGatewayService.js`)**:
    - Modelagem desacoplada permitindo aos salões escolherem livremente seu provedor de pagamentos (Mercado Pago, Asaas, AbacatePay, Chave PIX Manual com envio de comprovante, ou Simulador Sandbox).
    - Criptografia simétrica autenticada AES-256-GCM (`enc:v1:<iv>:<tag>:<ciphertext>`) para credenciais de API, tokens privados e segredos de webhook em repouso na tabela `cap_tenant_gateway_configs`.
    - Mascaramento estrito de dados sensíveis nas rotas administrativas de pagamentos (`backend/routes/payments.js`), impedindo vazamento de chaves privadas para o frontend ou logs.
  - **Parametrização por Serviço e Painel de Operações**:
    - Gestão de serviços (`GestaoServicos.jsx`): Adicionados campos e toggles para configuração de sinal por procedimento (`requires_deposit`, `deposit_type` [porcentagem % ou fixo R$] e `deposit_amount`), com badges indicativos na tabela desktop e nos cards móveis.
    - Configurações Operacionais (`ConfiguracoesOperacionais.jsx`): Seção "Gateway de Pagamento & Sinal por PIX" permitindo configurar credenciais, prazo de expiração (padrão 15 min), modo sandbox e dados de recebimento.
  - **Jornada do Cliente no Checkout e Pagamento PIX**:
    - Revisão do Agendamento (`AgendamentoRevisao.jsx`): Cálculo dinâmico do sinal antecipado e do valor remanescente a ser pago no salão, exibindo card de destaque Rosé Editorial e ajustando o botão de ação primária. Geração automática da cobrança de sinal via API logo após a criação da reserva.
    - Tela de Confirmação & Pagamento (`AgendamentoConfirmado.jsx`):
      - *Estado Pendente*: Renderização de QR Code PIX, código Copia-e-Cola com feedback visual ao copiar, cronômetro regressivo com contagem de 15 minutos até a expiração, e polling assíncrono a cada 4 segundos verificando a compensação bancária. Inclui botão de homologação rápida para simulação em ambiente Sandbox/Dev.
      - *Estado Confirmado*: Ao detectar compensação do PIX, transiciona instantaneamente para a confirmação de agendamento garantido com animação festiva de confetes Rosé Editorial, badge de sinal confirmado e liberação dos botões de calendário (.ics) e lembrete Web Push.
      - *Estado Expirado*: Caso o prazo encerre sem compensação, exibe aviso amigável de liberação do horário com link direto para escolher novo horário.
  - **Worker de Expiração Automática de Sinal (`notificationWorker.js`)**:
    - Rotina em segundo plano `checkDepositExpiration` que consulta periodicamente reservas pendentes com prazo vencido (`deposit_expires_at < NOW()`), cancelando o agendamento (`status = 'cancelled'`, `deposit_status = 'expired'`), liberando a vaga na agenda e registrando nota na timeline do CRM.
  - **Testes e Homologação**:
    - Suíte Jest `backend/tests/sinalPixD3.test.js` passando 100% (10/10 testes).
    - Conjunto completo de testes recentes da Fase 44 passando 100% (46/46 testes em 1.06s).
    - Build de produção do Vite gerado em 2.15s com precache do Service Worker e artefatos servidos no Docker Caddy (`http://localhost:8080`) e Vite dev server (`http://localhost:5173`).

- **24/10/2026 - Fase 44: D4 (P1) — Vários Serviços por Visita (§4·D4) [Concluída]:**
  - **Modelagem Relacional N:M no PostgreSQL (`cap_appointment_services`)**:
    - Criação da tabela relacional em `migrations/phase22_multiple_services_schema.sql` com colunas `appointment_id`, `service_id`, `tenant_id`, `price`, `duration_minutes`, `commission_amount`, `order_index` e constraints RLS com isolamento multi-tenant estrito por `tenant_id`.
    - Adição da coluna `short_description TEXT` na tabela `public.cap_services` com validação Zod de até 255 caracteres e suporte nos métodos de listagem, criação e atualização de catálogo (`catalogService.js` e `services.js`).
  - **Bloco Contínuo na Agenda e Soma de Preços/Duração (`appointmentService.js`)**:
    - Suporte a múltiplos procedimentos em uma única reserva, somando a duração de todos os itens (`totalMinutes`) e garantindo alocação de bloco contínuo no calendário profissional (`start_time` a `end_time = start_time + totalMinutes`).
    - Validação contra sobreposição na tabela `cap_appointments` respeitando o bloco somado integral.
    - Retrocompatibilidade absoluta mantendo o serviço primário em `cap_appointments.service_id` para integração com relatórios e consultas legadas.
    - Na consulta `getAppointmentById`, agregação automática dos serviços detalhados da visita a partir de `cap_appointment_services` e composição de `service_name` composto (`"Corte + Escova + Hidratação"`).
  - **Cálculo de Comissão Proporcional e Baixa Individual de Estoque na Conclusão**:
    - No método `updateAppointment`, ao marcar o agendamento como `completed`, itera sobre cada serviço registrado em `cap_appointment_services`, calcula a comissão individual do profissional proporcional ao valor do serviço (`commission_amount = price * commissionRate / 100`), grava no registro N:M e consolida a soma em `staff_commission_value`.
    - Para cada serviço da visita configurado com `reduces_stock = true`, realiza a baixa automática dos insumos associados em `cap_inventory` (`cap_service_inventory`). Fallback gracioso ativo para agendamentos legados de serviço único.
  - **Experiência Visual e Gestão no Frontend**:
    - *Gestão de Serviços (`GestaoServicos.jsx`)*: Inclusão do campo "Descrição Curta (opcional)" no formulário dos modais de criação e edição com limite de 160 caracteres, e exibição visual sofisticada abaixo do nome na tabela corporativa desktop e nos cartões mobile.
    - *Catálogo Público (`CartaoServico.jsx` & `AgendamentoServicos.jsx`)*: Exibição da descrição curta e seleção flexível de múltiplos serviços com contagem no carrinho flutuante e totalizador de minutos/preço.
    - *Checkout & Revisão (`AgendamentoRevisao.jsx`)*: Envio do array estruturado `services` com id, preço e duração individual ao invocar `api.appointments.create`.
  - **Testes Automatizados e Homologação**:
    - Suíte Jest dedicada em `backend/tests/multiplosServicosD4.test.js` passando 10/10 testes (cálculo de bloco contínuo, validação Zod, comissões individuais por serviço, baixa de insumos de estoque e limite de descrição curta).

- **25/10/2026 - Correção Crítica: Avaliação de Atendimento (POST /api/reviews 400 - Dados Inválidos):**
  - **Causa Raiz Identificada**:
    - A rota `GET /api/reviews/pending` retornava um array `[ pending ]` (ou `[]`). No frontend `HomeCliente.jsx`, o retorno era atribuído diretamente ao estado `pendingReview`, fazendo com que `pendingReview` fosse um array em vez de um objeto unitário.
    - Como consequência, no `ReviewModal.jsx`, a expressão `reviewData.appointment_id` resultava em `undefined`, fazendo com que o JSON enviado no corpo do `POST /api/reviews` omitisse `appointment_id`.
    - O backend, ao validar `!appointmentId`, disparava o erro 400: *"Dados inválidos para avaliação."*.
    - Além disso, a query de `getPendingReview` não incluía o nome do serviço (`service_name`), fazendo com que o modal ficasse incompleto.
  - **Solução Implementada**:
    - *Backend (`reviewService.js`)*: Atualizada a consulta `getPendingReview` com JOIN em `cap_services` e agregação automática de múltiplos serviços de `cap_appointment_services`, retornando o nome formatado do procedimento.
    - *Frontend (`HomeCliente.jsx`)*: Normalização defensiva da resposta de pendência (`const reviewItem = Array.isArray(pending) ? pending[0] : pending;`), garantindo que o modal só abra quando houver um agendamento com `appointment_id` válido.
    - *Componente (`ReviewModal.jsx`)*: Refatoração integral para a identidade **Rosé Editorial**: ícones Lucide React (`Star`, `Heart`, `X`, `Sparkles`, `Loader2`, `AlertCircle`), tipografia Playfair Display, estrelas interativas com animação de hover e rótulos contextuais, textarea minimalista, extração defensiva de `appointmentId` (`data?.appointment_id || data?.id`) e alerta inline de erro.
  - **Testes & Homologação**:
    - Suíte de testes Jest em `backend/tests/reviews.test.js` passando 100% (7/7 testes).
    - Build de produção do Vite gerado limpo em 3.75s e servido pelo Caddy e Vite dev server.

- **25/10/2026 - Fase 44: D5 (P1) — "Qualquer profissional" e "Próximo horário livre" (§4·D5) [Concluída]:**
  - **Algoritmo de Elegibilidade e Balanceamento Justo de Carga (`appointmentService.js`)**:
    - Implementação de `getEligibleStaff({ tenantId, serviceIds })`: identifica profissionais ativos e capacitados para realizar todos os serviços selecionados na visita a partir da tabela `cap_staff_services`, com fallback automático caso não haja mapeamento restrito.
    - Suporte a `staff_id = 'any'` ou nulo no agendamento (`createAppointment`): quando a cliente escolhe agendar com o profissional mais rápido, o backend resolve os profissionais capacitados livres no intervalo, consulta o volume de agendamentos de cada um no dia (`GROUP BY staff_id`), e seleciona automaticamente o profissional com menor número de atendimentos, garantindo distribuição justa e equitativa de carga de trabalho entre os colaboradores.
    - Bloqueio pessimista `FOR UPDATE` sobre o profissional designado no momento do `BEGIN`, prevenindo race conditions e conflitos de horários em acessos simultâneos.
  - **Cálculo de Horários Ocupados Agregado (`getOccupiedSlots`)**:
    - Ao agendar com "Qualquer profissional", um horário só é considerado indisponível se **todos** os profissionais capacitados estiverem ocupados naquele horário. Se ao menos um profissional capacitado estiver livre, o horário permanece aberto para a cliente.
  - **Varredura do "Próximo Horário Livre" (`getNextAvailableSlot`)**:
    - Algoritmo que varre os próximos 14 dias no fuso horário oficial `America/Sao_Paulo`, respeitando expediente semanal (`cap_business_hours`), exceções/folgas (`cap_date_exceptions`) e duração somada dos serviços.
    - Se a data for hoje, aplica margem de segurança de 15 minutos em relação à hora atual. Retorna payload estruturado com data, hora, profissional livre com menor carga e rótulo amigável legível (ex: *"Amanhã às 09:00"* ou *"Ter, 27/10 às 14:00"*).
  - **Rotas e Contratos de API (`routes/appointments.js` & `src/lib/api.js`)**:
    - Schema Zod `createAppointmentSchema` atualizado para aceitar `staff_id: z.union([z.string().uuid(), z.literal('any')]).nullable().optional()`.
    - Nova rota dedicada `GET /api/appointments/next-available-slot` montada antes dos endpoints parametrizados `:id`.
    - Atualização de `GET /api/appointments/occupied-slots` para receber `service_id` e múltiplos `service_ids`.
    - Integração de `api.appointments.getNextAvailableSlot(tenantId, params)` no cliente HTTP do frontend.
  - **Frontend: Experiência Rosé Editorial de 1 Toque**:
    - *Seleção de Profissional (`AgendamentoProfissionais.jsx`)*: Redesenho do funil com componente `TelaCliente`, topo Rosé (Etapa 2 de 4 - 50%), card em destaque de topo **"Qualquer profissional (mais rápido)"** com ícone de centelha e badge "Menor tempo de espera", seguido da lista individual dos membros da equipe via `CartaoProfissional.jsx`.
    - *Seleção de Horários (`AgendamentoHorarios.jsx`)*: Banner inteligente no topo **⚡ "Próximo horário livre: {label}"** com botão de seleção em 1 toque que seleciona automaticamente o dia e o horário sem atrito.
    - *Revisão e Confirmação (`AgendamentoRevisao.jsx` & `AgendamentoConfirmado.jsx`)*: Exibe badge e texto "Qualquer profissional (Mais rápido) - Definido automaticamente por disponibilidade" no resumo, repassa o profissional designado retornado pelo backend e exibe o nome real do profissional no card final de confirmação.
- **25/10/2026 - Fase 44: D6 (P1) — Remarcar em 1 toque e Lista de espera com auto-oferta (§4·D6) [Concluída]:**
  - **1. Remarcação em 1 Toque (`appointmentService.js` & `routes/appointments.js`)**:
    - Criação de `rescheduleAppointment`: Adotado bloqueio pessimista `FOR UPDATE` sobre o registro do agendamento, validação estrita de choque de horário para o profissional designado, liberação do horário anterior e atualização das datas/horários.
    - Reagendamento automático de lembretes no Redis BullMQ via `cancelAppointmentReminders` e `scheduleAppointmentReminders` (D1).
    - Registro de nota na timeline de auditoria do CRM (`cap_timeline_notes`).
    - Disparo automático de `offerNextInWaitlist` para oferecer o horário liberado para o primeiro cliente da lista de espera.
    - Nova rota `POST /api/appointments/:id/reschedule` com validação Zod (`rescheduleAppointmentSchema`) e isolamento multi-tenant.
  - **2. Modelagem Relacional e Índices (`cap_waitlist`)**:
    - Criação da migração `backend/migrations/phase23_waitlist_and_reschedule.sql` adicionando colunas `offered_at`, `expires_at`, `preferred_time_range` ('any', 'morning', 'afternoon', 'night'), `notified_at` e `appointment_id` (FK para `cap_appointments`).
    - Índices parciais otimizados: `idx_cap_waitlist_pending_order` (`tenant_id, desired_date, status, created_at`) e `idx_cap_waitlist_expired_offers` (`status, expires_at WHERE status = 'offered'`).
    - DDL documentado em `database.md` (§2.12.2).
  - **3. Fila FIFO, Janela Exclusiva de 30 Minutos e Expiração Automática (`waitlistService.js` & `cron/reminders.js`)**:
    - `addToWaitlist`: Validação anti-duplicidade prevenindo múltiplas entradas para a mesma cliente na mesma data.
    - `offerNextInWaitlist`: Ao cancelar ou reagendar um agendamento, busca o primeiro candidato por ordem cronológica (`ORDER BY w.created_at ASC LIMIT 1 FOR UPDATE OF w SKIP LOCKED`), define status `'offered'`, janela exclusiva de 30 minutos (`expires_at = NOW() + 30 min`) e notificação Web Push imediata.
    - `expireOffersAndAdvance`: Job no cron a cada 2 minutos (`*/2 * * * *`) que identifica ofertas com `expires_at < NOW()`, altera para status `'expired'` e avança automaticamente a vaga para o próximo cliente da fila.
    - `acceptWaitlistOffer`: Converte a oferta em agendamento oficial com status `'converted'`, com validação contra expiração retornando erro HTTP 410 GONE.
  - **4. Frontend: Design System Rosé Editorial**:
    - `WaitlistModal.jsx`: Modal responsivo com seletor de turno de preferência ('Qualquer horário', 'Manhã', 'Tarde', 'Noite'), tipografia Playfair Display, ícones Lucide React e integração com `api.waitlist.join`.
    - `HomeCliente.jsx`: Banner comemorativo e animado "⚡ Vaga Liberada para Você!" exibido automaticamente quando o cliente autenticado possuir uma oferta ativa na lista de espera, com botão "Garantir".
    - Botão "Remarcar" nos cartões da Home e no Histórico (`HistoricoAgendamentos.jsx`), preenchendo o `BookingContext` com os serviços pré-selecionados e navegando diretamente para a seleção de novo horário.
    - Tela de Revisão (`AgendamentoRevisao.jsx`): Título adaptativo "Confirmar remarcação", badge "🔄 Remarcação de Atendimento" e botão "Confirmar Novo Horário".
  - **5. Testes Automatizados e Homologação E2E**:
    - Suíte Jest em `backend/tests/remarcarWaitlistD6.test.js` passando 100% (10/10 testes).
    - Validação de ponta a ponta com Browser Subagent na porta de produção `:8080` comprovando o fluxo completo: visualização do banner de oferta de lista de espera na Home, clique em "Remarcar", seleção de novo dia e horário, revisão com badge de remarcação, confirmação com sucesso e persistência atômica no PostgreSQL.

- **25/10/2026 - Fase 44: D7 (P1) — Login por Código WhatsApp e Recuperação de Senha Adaptativa (§4·D7) [Concluída]:**
  - **1. Governança de Custos e White-Label Estrito**:
    - Eliminação completa de dependências de SMS pagos (Twilio, Zenvia, etc.), assegurando sustentabilidade de custos no SaaS.
    - Banimento de número central compartilhado da plataforma: disparos efetuados exclusivamente pela instância WhatsApp do salão contratante via microsserviço `operabeauty-wa-gateway`, preservando reputação de número e identidade visual do salão.
  - **2. Arquitetura Adaptativa**:
    - Salões com plano que inclui `whatsapp_gateway` e instância conectada em `cap_whatsapp_instances`: fluxo 100% automatizado com envio de código de 6 dígitos via WhatsApp.
    - Salões em planos de entrada ou sem WhatsApp conectado: fallback elegante e humanizado direcionando a cliente com 1 toque para o WhatsApp da recepção do salão com mensagem pré-formatada, onde a gerência redefine o acesso via Ficha CRM.
  - **3. Backend & Criptografia**:
    - Endpoints `POST /api/auth/client/request-code`, `POST /api/auth/client/verify-code` e `POST /api/auth/client/reset-password` sob rate-limit duplo (IP + Telefone).
    - Código numérico de 6 dígitos gerado via `crypto.randomInt` com expiração de 300 segundos no Redis e validação em tempo constante (`crypto.timingSafeEqual`).
    - Emissão de `reset_token` assinado via JWT (10 min) de escopo restrito `client_password_reset`.
  - **4. Testes e Homologação**:
    - Suíte Jest em `backend/tests/loginOtpD7.test.js` passando 100% (12/12 testes).
    - Validação funcional e visual gravada em vídeo WebP (`login_recuperacao_d7_1792964278342.webp`).

- **25/10/2026 - Fase 44: D8 (P1) — Política de Cancelamento e Controle de Faltas (No-Show) (§4·D8) [Concluída]:**
  - **1. Modelagem Relacional & Migração no PostgreSQL (`phase24_cancellation_and_no_shows.sql`)**:
    - `cap_tenants`: `min_cancellation_hours INT DEFAULT 2` (prazo mínimo em horas para cancelamentos e remarcações online), `no_show_penalty_action VARCHAR(30) DEFAULT 'warn'` ('warn' = alertar no CRM, 'require_deposit' = exigir sinal PIX obrigatório para novas reservas, 'block' = bloquear agendamentos online), e `no_show_tolerance_count INT DEFAULT 2` (limite de faltas toleradas antes de aplicar a penalidade).
    - `cap_clients`: `no_show_count INT DEFAULT 0`, `is_blocked BOOLEAN DEFAULT FALSE` e `blocked_reason TEXT`, com índice parcial `idx_cap_clients_is_blocked`.
    - `cap_appointments`: `no_show_marked_at TIMESTAMPTZ`, `no_show_marked_by UUID` e `cancellation_reason TEXT`, com índice `idx_cap_appointments_status`.
    - Concessões de permissão DML estritas concedidas ao usuário `opera_app` (C5).
  - **2. Validações Server-Side & Regras de Negócio no Backend**:
    - *Bloqueio na Criação*: `createAppointment` bloqueia novas reservas online se `client.is_blocked === true`, retornando HTTP 403 Forbidden (`CLIENT_BLOCKED`) com mensagem humanizada orientando contato com a equipe.
    - *Janela de Cancelamento e Remarcação*: `updateAppointment`, `deleteAppointment` e `rescheduleAppointment` validam se a antecedência em horas `(start_time - NOW())` é menor que `tenant.min_cancellation_hours` para requisições de clientes (`userRole === 'client'`). Rejeita cancelamentos tardios com HTTP 400 Bad Request (`CANCELLATION_WINDOW_EXPIRED`), retornando o telefone da recepção para alinhamento direto.
    - *Registro de Falta (No-Show)*: `markAppointmentNoShow` (restrito a `manager` e `professional`) altera o status para `no_show`, grava carimbo de data/hora e autor, incrementa o contador `no_show_count` do cliente, cancela lembretes push no Redis, dispara a penalidade configurada (bloqueio automático se a ação for `'block'`) e registra nota detalhada na timeline do CRM.
    - *Reversão de Falta (Undo No-Show)*: `undoAppointmentNoShow` reverte o atendimento para `scheduled`, decrementa com segurança `GREATEST(0, no_show_count - 1)`, remove o bloqueio se o cliente estava restrito e as faltas caíram abaixo da tolerância, e audita o evento na timeline do CRM.
    - *Gestão Administrativa no CRM*: Endpoints `POST /api/clients/:id/reset-no-shows` e `POST /api/clients/:id/toggle-block` para zerar faltas e gerenciar restrições online com justificativa auditada.
  - **3. Frontend Rosé Editorial & Experiência Integrada**:
    - *Configurações Operacionais (`ConfiguracoesOperacionais.jsx`)*: Seção rica e responsiva "Política de cancelamento & faltas (no-show)" com seletores para antecedência mínima, tolerância e ação punitiva, além de card de boas práticas de gestão humanizada de faltas.
    - *Agenda Profissional (`AgendaProfissional.jsx`)*: Botões de ação rápida "Marcar Falta (Não Compareceu)" e "Reverter Falta" no modal de detalhes do agendamento, com badge âmbar semântico.
    - *Ficha do Cliente no CRM (`FichaClienteCRM.jsx`)*: Banner de bloqueio online no topo, métrica de faltas acumuladas em destaque no card "FALTAS" com botão de 1 clique para zerar histórico, e controle de status online com modal de justificativa.
    - *Histórico de Agendamentos (`HistoricoAgendamentos.jsx`)*: Tratamento acolhedor com dados da recepção ao tentar cancelar fora do prazo, e badge "Não Compareceu" na lista de histórico.
  - **4. Testes Automatizados e Homologação**:
    - Suíte Jest em `backend/tests/politicaCancelamentoD8.test.js` passando 100% (14/14 testes).
    - Compilação limpa do Vite em 3.25s gerando bundle de produção em `./dist`.
    - Homologação visual completa via browser subagent autenticado como gestor com evidências registradas em `politica_cancelamento_section_1792973927043.png` e `crm_ficha_cliente_faltas_1792974037199.png`.
- **25/10/2026 - Fase 44: D9 (P1) — Relatório Mensal "Impacto OperaBeauty" (§4·D9) [Concluída]:**
  - **1. Consolidação de Retorno e Métricas no Backend (`reportService.js`)**:
    - Função `getMonthlyImpactReport(tenantId, year, month)` agregando KPIs executivos de retorno de investimento:
      - *Tempo Poupado pela Equipe*: baseado em 10 minutos economizados por agendamento autônomo feito via web app (`online_appointments_count`), consolidando total de horas poupadas (`hours_saved`).
      - *Faltas Evitadas e Faturamento Protegido*: estimativa de faltas evitadas (~20% taxa histórica da indústria) prevenidas pelos lembretes multicanal de 24h e 2h via push e WhatsApp, calculando o montante em reais de prejuízo evitado (`prevented_loss_revenue`).
      - *Faturamento Realizado e Crescimento*: receita total no mês, comparativo percentual de crescimento em relação ao mês anterior (`growth_rate_vs_last_month`), ticket médio (`average_ticket`) e total de atendimentos concluídos.
      - *Retenção & Fidelização*: taxa percentual de clientes que retornaram no mês (`retention_rate`), contagem de clientes recorrentes vs novos conquistados.
      - *Clube de Assinaturas & Cashback*: número de membros ativos no Clube do Salão, receita recorrente mensal (MRR), volume de cashback distribuído vs resgatado e taxa de engajamento da carteira digital.
      - *Top Serviços & Profissional Destaque*: ranking dos serviços mais lucrativos e determinação do profissional do mês por atendimentos e receita.
      - *Navegação Histórica*: pílulas dos últimos 6 meses (`available_months`) para análise comparativa.
    - Função `sendImpactReportWhatsApp`: mensagem executiva pré-formatada enviada diretamente via gateway nativo de WhatsApp para o gestor.
  - **2. Endpoints REST e Validação Server-Side (`routes/reports.js`)**:
    - Endpoints `GET /api/reports/monthly-impact` e `POST /api/reports/monthly-impact/send-whatsapp` com validação Zod tipada, autenticação JWT e restrição de acesso a gestores (`manager`) e superadmins (`superadmin`).
    - Ativação da feature `bi_reports` no plano `Enterprise` no PostgreSQL.
  - **3. Notificação Automática Recorrente no Cron (`cron/reminders.js`)**:
    - Agendamento mensal (`0 8 1 * *`) disparado às 08:00 de todo dia 1º de cada mês, criando notificação em `cap_notifications` para todos os gestores ativos.
  - **4. Frontend Rosé Editorial, Print A4 e Card no Dashboard**:
    - *Cliente de API (`src/lib/api.js`)*: inclusão dos métodos `api.reports.getMonthlyImpact()` e `api.reports.sendMonthlyImpactWhatsApp()`.
    - *Central de Relatórios (`RelatoriosBI.jsx`)*: redesign completo na estética Rosé Editorial, apresentando Hero Banner comemorativo em gradiente escuro (*"Em [mês], o OperaBeauty poupou X horas da sua equipe e protegeu R$ Y em faturamento"*), pílulas interativas de seleção de mês, 4 cards dos pilares fundamentais, cards do Clube e Cashback, vitrine do Profissional Destaque, tabela dos Top Serviços, modal de envio via WhatsApp e folha de estilo dedicada `@media print` para impressão e geração de PDF limpo em A4 sem menus ou barras de navegação. Alternância de abas preservando a inteligência de ociosidade e ranking da equipe.
    - *Dashboard do Gestor (`DashboardAdmin.jsx`)*: banner comemorativo compacto posicionado logo após a grade de 4 KPIs com indicadores de horas e faturamento protegido, integrando atalho direto *"Ver Relatório Completo >"*.
  - **5. Testes Automatizados e Homologação**:
    - Suíte Jest em `backend/tests/relatorioImpactoD9.test.js` passando 100% (18/18 testes).
    - Compilação limpa do frontend com Vite em 1.82s gerando bundle de produção em `./dist`.
    - Homologação visual completa via browser subagent autenticado como gestor com evidências registradas em `dashboard_impacto_banner_1792981724337.png`, `relatorios_bi_impacto_full_1792981743319.png` e gravação WebP `d9_validacao_final_sucesso_1792981702753.webp`.

- **26/10/2026 - Correção & Sincronização de Contratos de API (Reviews & LGPD Consents Stats):**
  - **1. Endpoint `GET /api/reviews/stats` (`routes/reviews.js` & `services/reviewService.js`)**:
    - Implementação da função `getReviewsStats(tenantId)` agregando média e total de avaliações do salão, além da média de rating individual e quantidade de avaliações por profissional da equipe.
    - Exposição da rota `GET /api/reviews/stats` protegida por autenticação JWT e papéis `manager`, `superadmin` e `professional`.
    - Eliminação do erro HTTP 404 ao carregar a página de Gestão de Equipe (`GestaoEquipe.jsx`).
  - **2. Endpoint `GET /api/consents/stats` & `POST /api/terms/request-signature` (`routes/consents.js`, `routes/terms.js` & `services/consentService.js`)**:
    - Implementação da função `getConsentsStats(tenantId)` retornando indicadores de conformidade jurídica LGPD (`total`, `pending`, `signed`) e lista das 10 solicitações mais recentes com hash criptográfico SHA-256 e dados do cliente.
    - Exposição da rota `GET /api/consents/stats` protegida por autenticação JWT e restrição de acesso.
    - Criação do endpoint alias `POST /api/terms/request-signature` em `routes/terms.js` para integração transparente com `GestaoLGPD.jsx`.
    - Eliminação do erro HTTP 404 ao carregar a central de Segurança & LGPD (`GestaoLGPD.jsx`).
  - **3. Testes Automatizados & Homologação**:
    - Suíte Jest em `backend/tests/statsReviewsConsents.test.js` passando 100% (5/5 testes).
    - Validação de ponta a ponta com Browser Subagent confirmando carregamento perfeito de `/equipe` e `/lgpd` com zero erros 404 no console, com gravação WebP `validar_stats_fix_1792985517425.webp`.

- **26/10/2026 - Fase 44: D10 (P1) — Importação de Clientes e Serviços por Planilha (§4·D10) [Concluída]:**
  - **1. Motor Transacional e Resiliência no PostgreSQL (`clientService.js` & `catalogService.js`)**:
    - `importClients`: Processamento em lote com transação atômica (`BEGIN ... COMMIT / ROLLBACK`), injeção de contexto de isolamento multi-tenant (`SET LOCAL app.current_tenant_id`) e verificação de inquilino ativo (`status != 'inactive'`). Suporte a `all_or_nothing: true` (reversão total em caso de erro impeditivo) e `on_duplicate` ('skip' para ignorar duplicatas ou 'update' para atualizar cadastros). Deduplicação inteligente de telefones em 2 etapas: verificação de duplicidade interna dentro da planilha e consulta unificada ao banco de dados (`cap_clients`). Registro em auditoria via `logAudit` e relatório detalhado com `importedCount`, `rejectedCount` e lista de erros por linha.
    - `importServices`: Transação atômica similar no catálogo, com validação de campos obrigatórios (`name`, `price >= 0`, `duration_minutes >= 5`), deduplicação de nomes (no lote e no banco), persistência de categoria, descrição e comissão, invalidação de cache no Redis (`tenant:${tenantId}:services`) e auditoria com `logAudit`.
  - **2. Contratos REST e Schemas de Validação Server-Side (`routes/clients.js` & `routes/services.js`)**:
    - Validação com Zod de payloads de importação: `importClientsSchema` limitando a até 1.000 clientes por requisição e `importServicesSchema` limitando a até 500 serviços por lote.
    - Proteção estrita por autenticação JWT e autorização restrita à gerência (`requireRole(['manager'])`).
  - **3. Componente Universal de Importação Rosé Editorial (`ModalImportarPlanilha.jsx`)**:
    - Esteira guiada em Stepper de 4 passos:
      1. *Arquivo*: Zona de drag & drop, suporte a `.csv`, `.xlsx` e `.xls` via SheetJS (`xlsx`), e botões para download de planilhas-modelo oficiais de Clientes e Serviços com cabeçalhos pré-formatados.
      2. *Mapeamento*: Identificação inteligente de cabeçalhos por heurística (reconhecendo variações como "Telefone", "Celular", "WhatsApp", "Preço", "Valor", etc.), com seletores manuais para correção de mapeamento.
      3. *Prévia & Validação*: Renderização de tabela paginada com status por linha, badges coloridos (Válido / Erro), mensagens explicativas em tooltip e filtros rápidos ("Todas", "Apenas Válidas", "Com Erros"). Toggles para "Tudo ou nada por lote" e "Ignorar duplicados existentes".
      4. *Conclusão & Relatório*: Feedback de sucesso, contadores de registros criados e ignorados, e botão para exportação em CSV com o detalhamento das linhas rejeitadas e seus respectivos motivos.
  - **4. Integração nos Painéis Administrativos (`GestaoClientes.jsx` & `GestaoServicos.jsx`)**:
    - Atualização do método `api.clients.import` e adição de `api.services.import` em `src/lib/api.js`.
    - Substituição do modal legado em `GestaoClientes.jsx` pelo novo `ModalImportarPlanilha`.
    - Inclusão do botão "Importar planilha" no topo de `GestaoServicos.jsx` e abertura integrada do modal.
  - **5. Testes Automatizados e Homologação**:
    - Suíte de testes Jest em `backend/tests/importacaoPlanilhaD10.test.js` passando 100% (21/21 testes cobrindo contratos Zod, limites de lote, validação de tipos, regras de duplicidade, transação com rollback e métodos de serviço).
    - Compilação limpa do Vite em 2.09s gerando bundle de produção em `./dist`.
    - Contêiner Docker `operabeauty-api` atualizado e testado.
    - Homologação visual e funcional via subagente com gravação de sessão WebP `validar_importacao_planilha_1793034729155.webp` e capturas de tela dos modais de clientes e serviços (`modal_importar_clientes_1793034762452.png` e `modal_importar_servicos_1793034817476.png`).

- **26/10/2026 - Fase 44: D11 (P1) — Onboarding Guiado do Salão & Display de Balcão com QR Code (§4·D11) [Concluída]:**
  - **1. Checklist Operacional Dinâmico no Backend (`onboardingService.js` & `routes/onboarding.js`)**:
    - Cálculo de progresso em tempo real baseado em consultas diretas ao banco de dados (`cap_services`, `cap_staff`, `cap_business_hours`, `cap_tenants` e `cap_appointments`), garantindo integridade estrita e eliminando inconsistências de contagem.
    - 6 etapas canônicas:
      1. *Serviços do Catálogo*: validação de procedimentos ativos com atalho para importação rápida de modelos prontos.
      2. *Equipe de Atendimento*: verificação de profissionais ativas para agendamento.
      3. *Horários de Atendimento*: checagem de expediente semanal com status de dias abertos.
      4. *Identidade Visual & Tema*: detecção de logo e personalização de cores.
      5. *Display de Balcão com QR Code*: abertura integrada do display de mesa para balcão.
      6. *Primeiro Agendamento de Teste*: verificação do primeiro agendamento realizado e link para a visão da cliente.
    - Endpoints protegidos: `GET /api/onboarding/status`, `GET /api/onboarding/catalog-templates`, `POST /api/onboarding/apply-catalog-template`, `POST /api/onboarding/dismiss` e `POST /api/onboarding/mark-qr-generated`.
  - **2. Catálogos-Modelo por Segmento (`ModalCatalogoModelo.jsx`)**:
    - 6 segmentos de beleza e estética pré-formatados com serviços, durações e preços de mercado: Manicure & Nail Design (7 serviços), Sobrancelhas & Cílios (7 serviços), Estética Facial (6 serviços), Drenagem & Massagem Corporal (6 serviços), Depilação (6 serviços) e Cabelo & Terapia Capilar (6 serviços).
    - Inserção em lote no PostgreSQL com transação atômica (`BEGIN ... COMMIT / ROLLBACK`), isolamento multi-tenant compulsório (`SET LOCAL app.current_tenant_id`), prevenção de nomes duplicados, invalidação de cache no Redis (`tenant:${tenantId}:services`) e auditoria (`logAudit`).
  - **3. Gerador de Display de Mesa & QR Code Pronto para Imprimir (`ModalDisplayMesaQRCode.jsx`)**:
    - Geração local de QR Code vetorial em alta definição via biblioteca `qrcode`.
    - Moldura editorial de totem/porta-retrato de mesa (Rosé Editorial, tipografia Playfair Display, logotipo ou monograma, chamada acolhedora e 3 passos com ícones).
    - Botão "Imprimir Display" com folha de estilo `@media print` para impressão isolada e centralizada em folhas A4 ou displays de acrílico 15x21 / 10x15 cm.
    - Botão "Baixar Imagem" para exportação direta em PNG para uso digital (WhatsApp, Instagram).
    - Registro de auditoria e persistência de `qr_code_generated_at` em `cap_tenants`.
  - **4. Card de Onboarding e Integração no Painel (`CardOnboarding.jsx`, `DashboardAdmin.jsx`, `GestaoServicos.jsx`)**:
    - Card com barra de progresso visual, atalhos contextuais e opção de dispensar/minimizar.
    - Botão de reabertura rápida ("Guia X/6") no cabeçalho do Dashboard e botão "Display Balcão" de acesso direto ao QR Code.
    - Botão "Catálogo modelo" integrado no cabeçalho de Gestão de Serviços.
  - **5. Testes Automatizados e Homologação**:
    - Suíte Jest em `backend/tests/onboardingD11.test.js` passando 100% (12/12 testes).
- **26/10/2026 - Fase 44: D18 (P1) — Cobrança Automática do SaaS, Carência, Bloqueio Gradual e Reativação Automática (§4·D18) [Concluída]:**
  - **1. Modelagem Relacional & Migração no PostgreSQL (`phase26_automated_saas_billing.sql`)**:
    - `cap_invoices`: enriquecida com `pix_copy_paste TEXT` (código EMV BR Code), `pix_qr_code TEXT` (URL do QR Code vetorial), `gateway_transaction_id VARCHAR(120)` (identificador de transação do gateway externo), `gateway_invoice_url TEXT`, `grace_period_days INT DEFAULT 5` e `warnings_sent JSONB DEFAULT '[]'::jsonb`.
    - `cap_tenants`: adicionadas as colunas de governança `grace_period_days INT DEFAULT 5` (dias de tolerância configuráveis sem interrupção de operações), `overdue_since DATE` (data de início da inadimplência), `billing_locked_at TIMESTAMPTZ` (instante em que o bloqueio gradual foi ativado) e `suspension_reason TEXT`.
    - Índices criados: `idx_cap_invoices_status_due`, `idx_cap_invoices_gateway_tx` e `idx_cap_tenants_status_billing`.
    - Permissões DML estritas concedidas ao papel `opera_app` (`GRANT SELECT, INSERT, UPDATE ON public.cap_invoices TO opera_app;` e `GRANT SELECT, UPDATE ON public.cap_tenants TO opera_app;`) conforme princípio de privilégio mínimo (C5).
  - **2. Lógica de Negócio, Carência e Bloqueio Gradual no Backend (`saasBillingService.js` & `routes/invoices.js`)**:
    - `generateSaaSPixPayload`: geração dinâmica de código EMV BR Code institucional com chave PIX e merchant 'OPERA BEAUTY SAAS'.
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
- **26/10/2026 - Fase 44: Consolidação, Rebranding e Correções no Super Admin (§4·H4, §4·H5, §4·D18) [Concluída]:**
  - **1. Correção Crítica de JavaScript em Feature Flags e Avisos**:
    - Corrigido o bug `Uncaught ReferenceError: handleOpenNewModal is not defined` em `FeatureFlagsAdmin.jsx` e `AvisosAdmin.jsx`, padronizando o acionamento do componente `EstadoVazio` para `() => openModal()`.
  - **2. Parametrização Completa de Gateway SaaS e Chave PIX Mestre (`SettingsAdmin.jsx`)**:
    - Rebranding completo para a estética Rosé Editorial.
    - Seletor de Ambiente (Sandbox vs Produção) e Provedor de Gateway (Mercado Pago, Asaas, AbacatePay, Sandbox).
    - Cadastro da Chave PIX oficial da plataforma (com tipo: CNPJ, E-mail, Telefone, Chave Aleatória).
    - Campo protegido com criptografia AES-256 e mascaramento para Access Token / Chave Secreta.
    - Seletor de tolerância de carência (*Grace Period* de 3 a 10 dias) para os salões clientes.
    - Caixa com URL do Webhook da plataforma (`/api/invoices/webhook`) com botão "Copiar URL" em 1 clique e segredo de assinatura HMAC.
    - Bloco de Segurança Master com atalho para ativação de 2FA TOTP (RFC 6238).
  - **3. Rebranding Rosé Editorial de Equipe SaaS e Mural de Avisos (`EquipeAdmin.jsx`, `AvisosAdmin.jsx`)**:
    - Modernização visual de `EquipeAdmin.jsx` com crachás de privilégio ("Acesso Total Mestre"), avatar tipográfico e modal de inclusão de novos administradores.
    - Modernização visual de `AvisosAdmin.jsx` com chips coloridos semânticos por severidade (Atenção, Novidade, Crítico, Informativo), controle de expiração e modal elegante.
  - **4. Backend e Banco de Dados (`superadminService.js`, `routes/superadmin.js`, `cap_platform_settings`)**:
    - DDL aplicado em `cap_platform_settings` adicionando `pix_key`, `pix_key_type`, `environment`, `grace_period_days` e `webhook_secret` com permissão concedida a `opera_app`.
    - Endpoints `GET /settings` e `POST /settings` sincronizados com mascaramento seguro e sanitização Zod.
  - **5. Homologação**:
    - Compilação limpa do Vite em 1.72s.
    - Suítes de testes Jest de backend passando 100% (50/50 testes).
    - Validação de ponta a ponta com subagente no navegador gravada em vídeo WebP (`superadmin_consolidation_1793047971614.webp`) e screenshots capturados.
- **26/10/2026 - Fase 44: D12 (P2) — Variações de Preço e Extras no Serviço (§4·D12) [Concluída]:**
  - **1. Modelagem Relacional & Migração no PostgreSQL (`phase27_service_variations_and_extras.sql`)**:
    - Criação da tabela `cap_service_variations` (tamanhos, comprimentos e variações com colunas `id`, `service_id`, `tenant_id`, `name`, `price`, `duration_minutes`, `is_active`, `order_index`), com índices otimizados e política de RLS multi-tenant (`tenant_isolation_service_variations`).
    - Criação da tabela `cap_service_extras` (adicionais e upsell opcionais com colunas `id`, `service_id`, `tenant_id`, `name`, `price`, `duration_minutes`, `is_active`, `order_index`), com índices otimizados e política de RLS multi-tenant (`tenant_isolation_service_extras`).
    - Extensão de `cap_appointment_services` e `cap_appointments` com as colunas `variation_id UUID`, `variation_name TEXT` e `selected_extras JSONB DEFAULT '[]'::jsonb`.
    - Concessão rigorosa de privilégios DML ao usuário de privilégio mínimo `opera_app` (C5).
  - **2. Lógica de Catálogo e Integridade Server-Side (`catalogService.js`, `appointmentService.js`)**:
    - `listServices`: inclusão de subconsultas correlacionadas `json_agg` para recuperar `variations` e `extras` ativas ordenadas por `order_index` e preço; cálculo dinâmico da flag `is_starting_price = true` e do menor valor efetivo em `starting_price`. Invalidação automática de cache Redis (`tenant:${tenantId}:services`).
    - `createService` e `updateService`: persistência e sincronização atômica de variações e extras associados.
    - `createAppointment`: validação server-side de segurança contra o banco de dados dos preços e tempos das variações e de cada extra selecionado; recálculo do valor total do agendamento, persistência em `cap_appointment_services`, cálculo proporcional da comissão do profissional sobre o valor integral do procedimento e baixa automática de estoque associado.
  - **3. Schemas de Validação Zod (`routes/services.js`, `routes/appointments.js`)**:
    - Criação de `variationItemSchema` e `extraItemSchema` validando tipos e faixas numéricas.
    - Extensão de `serviceItemSchema` no agendamento para aceitar `variation_id`, `variation_name` e `extras`.
  - **4. Frontend Editorial Rosé & Experiência de Agendamento (`ModalPersonalizarServico.jsx`, `CartaoServico.jsx`, `GestaoServicos.jsx`)**:
    - *Gestão de Serviços (`GestaoServicos.jsx`)*: Gerenciador completo de Variações de Tamanho / Preço e Adicionais Opcionais no modal editorial de criação/edição com switches dinâmicos, campos numéricos e badges na tabela e cartões mobile.
    - *Cartão de Serviço (`CartaoServico.jsx`)*: Exibe tag "Personalizável" e texto "A partir de R$ XX,XX" quando aplicável; ao ser selecionado, exibe pílula com o nome da variação e quantidade de extras.
    - *Modal de Personalização Rosé (`ModalPersonalizarServico.jsx`)*: Modal mobile-first moderno com seleção de 1 variação obrigatória via radio cards e N adicionais opcionais via checkbox cards, resumo de valor e minutos em tempo real e botão de confirmação.
    - *Agendamento & Revisão (`AgendamentoServicos.jsx`, `AgendamentoRevisao.jsx`)*: Disparo do modal ao tocar no serviço, carrinho com totalização reativa de tempo e preço e resumo completo no checkout com badges e envio do payload estruturado.
  - **5. Testes Automatizados e Homologação E2E**:
    - Suíte Jest em `backend/tests/variacoesExtrasD12.test.js` passando 100% (17/17 testes).
    - Compilação limpa do Vite em 2.87s servida pelo Caddy na porta 8080.
    - Contêiner `operabeauty-api` reconstruído e atualizado no Docker.
    - Homologação visual e funcional de ponta a ponta com Browser Subagent gravada em vídeo WebP (`homologacao_d12_1793061198529.webp`).
- **26/10/2026 - Fase 44: D13 (P2) — Pacotes de Sessões (§4·D13) [Concluída]:**
  - **1. Modelagem Relacional & Migração no PostgreSQL (`phase28_service_packages.sql`)**:
    - Criação da tabela `cap_packages` (modelos de pacotes pré-pagos ofertados com colunas `id`, `tenant_id`, `name`, `description`, `service_id`, `total_sessions`, `price`, `validity_days`, `min_interval_days`, `is_active`), com índices e RLS multi-tenant (`tenant_isolation_packages`).
    - Criação da tabela `cap_client_packages` (controle de saldo por cliente com `id`, `tenant_id`, `client_id`, `package_id`, `service_id`, `total_sessions`, `used_sessions`, `remaining_sessions` com constraint `CHECK (remaining_sessions >= 0)` — **Regra de Aceite Principal: saldo NUNCA pode ficar negativo**), `price_paid`, `payment_method`, `status`, `expires_at`, `last_session_at`, índices e RLS multi-tenant (`tenant_isolation_client_packages`).
    - Criação da tabela de auditoria `cap_package_usages` (histórico atômico de débitos e estornos por agendamento com `action IN ('consume', 'refund', 'adjustment')`).
    - Extensão de `cap_appointments` com as colunas `client_package_id UUID` e `is_package_session BOOLEAN DEFAULT FALSE`.
    - Registro da feature flag `'packages'` habilitada nos planos `Premium` e `Enterprise`.
    - Concessões DML restritas ao usuário `opera_app` (**C5**).
  - **2. Lógica de Negócio e Concorrência Segura no Backend (`packageService.js`, `appointmentService.js`)**:
    - `consumePackageSession`: baixa atômica de 1 sessão com lock pessimista (`SELECT ... FOR UPDATE`), verificação de validade (`expires_at < NOW()`), status ativo, saldo > 0 e intervalo fisiológico mínimo (`min_interval_days`), gravando auditoria.
    - `refundPackageSession`: estorno atômico de sessão (`remaining_sessions + 1`, `used_sessions - 1`) com lock pessimista (`FOR UPDATE`) devolvendo o saldo à cliente em cancelamentos.
    - `createAppointment`: validação server-side de elegibilidade e saldo antes de criar o agendamento, definindo `is_package_session = true`, vinculando `client_package_id` e abatendo o preço base (R$ 0,00).
    - `updateAppointment` e `deleteAppointment`: baixa automática ao concluir (`status = 'completed'`) e estorno automático ao cancelar (`status = 'cancelled'`).
    - `getPackagesReport`: agregação de KPIs executivos (Modelos Ativos, Pacotes Vendidos, Sessões a Realizar e Receita Antecipada).
  - **3. Schemas de Validação Zod & Rotas REST (`routes/packages.js`)**:
    - Endpoints `POST /api/packages`, `POST /api/packages/sell`, `GET /api/packages`, `GET /api/packages/client/:clientId`, `GET /api/packages/check-eligible/:serviceId` e `GET /api/reports/packages`.
    - Proteção com `authMiddleware`, `requireRole` e `requireFeature('packages')`.
  - **4. Frontend Rosé Editorial & Experiência de Gestão e Checkout**:
    - *Gestão Administrativa (`GestaoPacotes.jsx`)*: 4 KPIs executivos, tabela e cards mobile, modal de criação com prévia de economia calculada em tempo real (badge Rosé Editorial) e modal de venda para cliente.
    - *Menu e Rotas (`App.jsx`, `AdminLayout.jsx`)*: rota protegida `staff/admin/pacotes` sob o grupo 'Catálogo'.
    - *Ficha da Cliente CRM (`FichaClienteCRM.jsx`)*: card de "Pacotes de Sessões" na coluna esquerda com progresso de saldo, status semântico, datas de validade/última sessão e modal de venda direta com 1 clique.
    - *Checkout & Revisão (`AgendamentoRevisao.jsx`)*: card de pacote elegível ativo com toggle para abater 1 sessão (R$ 0,00) e detalhamento no resumo financeiro.
    - *Cliente de API (`api.js`)*: módulo `api.packages` integrado.
  - **5. Testes Automatizados e Homologação**:
    - Suíte Jest em `backend/tests/pacotesSessoesD13.test.js` passando 100% (20/20 testes).
    - Suíte de regressão D12 passando 100% (17/17 testes). Total: 37 testes automatizados aprovados.
- **27/10/2026 - Fase 44: D14 (P2) — Anamnese Dinâmica, Termo de Consentimento e Evolução Clínica (§4·D14) [Concluída]:**
  - **1. Modelagem Relacional & Migração no PostgreSQL (`phase29_anamnesis_consent_and_evolution.sql`)**:
    - `cap_anamnesis_templates`: evolução adicionando `terms_text TEXT`, `terms_version INTEGER DEFAULT 1`, `require_terms BOOLEAN DEFAULT TRUE` e `require_signature BOOLEAN DEFAULT FALSE`.
    - `cap_client_anamnesis`: evolução adicionando `answers_encrypted TEXT` (respostas criptografadas em repouso com AES-256-GCM para atender o Artigo 11 da LGPD), `terms_accepted BOOLEAN DEFAULT FALSE`, `terms_version INT DEFAULT 1`, `consented_at TIMESTAMPTZ`, `consent_ip_address VARCHAR(45)`, `consent_user_agent TEXT`, `consent_hash VARCHAR(64)` (hash SHA-256 de não repúdio do termo) e `signature_data TEXT` (assinatura digital eletrônica manuscrita).
    - `cap_client_evolutions`: criação da tabela de prontuário e evolução clínica por sessão com colunas `id UUID PK`, `tenant_id UUID FK`, `client_id UUID FK`, `staff_id UUID FK REFERENCES cap_staff(id)`, `appointment_id UUID FK`, `session_date DATE`, `procedure_name TEXT`, `notes TEXT`, `measurements JSONB DEFAULT '{}'::jsonb`, `before_photos JSONB DEFAULT '[]'::jsonb`, `after_photos JSONB DEFAULT '[]'::jsonb`, `photo_consent_level VARCHAR(30) CHECK (photo_consent_level IN ('none', 'internal_only', 'social_media_anonymous', 'social_media_full')) DEFAULT 'internal_only'`, índices otimizados e política RLS multi-tenant (`tenant_isolation_client_evolutions`).
    - Concessões de privilégios de menor privilégio concedidas a `opera_app` (**C5**).
  - **2. Lógica de Negócio, Criptografia LGPD e Controle de Acesso Server-Side (`anamnesisService.js`, `evolutionService.js`)**:
    - *Criptografia em Repouso*: Cifragem transparente das respostas de anamnese contendo dados médicos e sensíveis usando AES-256-GCM (`iv:authTag:cipherText`) antes da persistência no banco e decifragem autorizada em tempo de leitura.
    - *Controle de Acesso Estrito (Regra de Aceite Principal D14)*: A ficha de anamnese e o prontuário são restritos exclusivamente a gestores (`admin`, `manager`, `superadmin`), ao próprio cliente (`client`) e aos profissionais (`staff`) que possuem atendimento vinculado à cliente (`checkStaffClientAccess`). Tentativas de acesso por profissionais sem agendamento conjunto são barradas no servidor com HTTP 403 Forbidden.
    - *Hash de Integridade Jurídica*: Geração de hash SHA-256 irreversível contendo texto do termo aceito, versão, ID do cliente, IP, User-Agent e carimbo de tempo.
    - *Trilha de Auditoria LGPD*: Todo acesso a dados sensíveis de saúde é registrado no audit trail (`cap_audit_logs`) com a ação `'ACCESS_HEALTH_DATA'`.
  - **3. Schemas de Validação Zod & Rotas REST (`routes/anamnesis.js`, `routes/evolutions.js`)**:
    - Endpoints `GET /api/anamnesis/template/:tenantId`, `PUT /api/anamnesis/template`, `GET /api/anamnesis/client/:clientId` e `POST /api/anamnesis/client` com captura de IP e User-Agent.
    - Endpoints `POST /api/evolutions`, `GET /api/evolutions/client/:clientId`, `PUT /api/evolutions/:id` e `DELETE /api/evolutions/:id` montados em `app.js`.
  - **4. Frontend Rosé Editorial & Experiência de Anamnese, Termos e Prontuário**:
    - *Configuração de Template (`AnamneseTemplate.jsx`)*: Interface Rosé Editorial com tabs de "Perguntas da Ficha" e "Termo de Consentimento & Assinatura (vX)", toggles para exigir aceite de termos e assinatura manuscrita, editor do texto legal e botão de incremento de versão.
    - *Assinatura Digital Manuscrita (`AssinaturaDigitalCanvas.jsx`)*: Componente de canvas touch/mouse de alta resolução para coleta de assinatura digital na tela do celular ou desktop.
    - *Preenchimento da Cliente (`ClienteAnamnese.jsx`)*: Tela mobile-first com perguntas dinâmicas, caixa de rolagem com o texto do termo, checkbox formal de ciência legal e quadro de assinatura manuscrita.
    - *Ficha da Cliente no CRM (`FichaClienteCRM.jsx`)*:
      - Card de Anamnese com selo de criptografia AES-256, badge de aceite de termo (versão, data e IP), hash SHA-256 e modal de visualização da assinatura eletrônica.
      - Nova Seção "Evolução clínica & Sessões": histórico de procedimentos, profissional responsável, badge de autorização de fotos, badges de medidas corporais/faciais, comparador visual de fotos Antes & Depois e modal Rosé Editorial para cadastro de nova sessão com upload seguro de imagens via `/api/upload/image`.
    - *Cliente de API (`api.js`)*: Inclusão dos módulos `api.anamnesis` e `api.evolutions`.
  - **5. Testes Automatizados e Homologação**:
    - Suíte Jest em `backend/tests/anamneseConsentimentoEvolucaoD14.test.js` passando 100% (16/16 testes cobrindo DDL, RLS, menor privilégio C5, AES-256-GCM, hash SHA-256 e Zod).
    - Suíte de regressão D13 e D12 passando 100% (37/37 testes). Total: 53 testes automatizados aprovados.
    - Build do Vite concluído com sucesso em 4.53s gerando bundle de produção em `./dist`.
    - Contêiner `operabeauty-api` reiniciado e validado com latência de banco de 1ms.
    - Homologação visual e funcional de ponta a ponta com Browser Subagent autenticado com perfil de gestora (`thais@studiodatha.com`), com evidências registradas em `anamnese_terms_screen_1793103075624.png`, `evolution_modal_1793103223993.png`, `clinical_evolution_saved_1793103452162.png` e gravação WebP `homologacao_d14_anamnese_1793102899161.webp`.
- **27/10/2026 - Fase 44: D15 (P2) — Campanhas Automáticas de Retenção e Marketing (§4·D15) [Concluída]:**
  - **1. Modelagem Relacional & Migração no PostgreSQL (`phase30_automated_campaigns.sql`)**:
    - `cap_marketing_campaigns`: criação da tabela de configuração de campanhas por salão (`id UUID PK`, `tenant_id UUID FK`, `type VARCHAR(30) CHECK IN ('birthday', 'maintenance', 'reactivation_60d')`, `name TEXT`, `is_active BOOLEAN DEFAULT TRUE`, `message_template TEXT`, `discount_type VARCHAR(20) DEFAULT 'percentage'`, `discount_value NUMERIC(10,2)`, `coupon_validity_days INT`, `min_days_inactive INT`, `send_channel VARCHAR(20) DEFAULT 'whatsapp'`, `cooldown_days INT DEFAULT 60`, `CONSTRAINT uq_campaign_tenant_type UNIQUE(tenant_id, type)`).
    - `cap_campaign_logs`: criação da tabela de histórico, deduplicação e contagem (`id UUID PK`, `tenant_id UUID FK`, `campaign_id UUID FK`, `client_id UUID FK`, `campaign_type VARCHAR(30)`, `phone VARCHAR(30)`, `message_content TEXT`, `coupon_id UUID FK`, `coupon_code TEXT`, `status VARCHAR(20) DEFAULT 'sent' CHECK IN ('sent', 'failed', 'opt_out', 'skipped_cooldown')`, `error_message TEXT`, `channel VARCHAR(20)`, `sent_at TIMESTAMPTZ`).
    - `cap_clients`: extensão com `marketing_opt_out BOOLEAN DEFAULT FALSE` e `opt_out_at TIMESTAMPTZ`, acompanhados de índice composto `idx_cap_clients_opt_out`.
    - RLS multi-tenant ativado nas duas tabelas (`tenant_isolation_marketing_campaigns`, `tenant_isolation_campaign_logs`).
    - Concessões DML restritas ao usuário `opera_app` (**Princípio C5**).
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
    - Suíte Jest em `backend/tests/campanhasAutomaticasD15.test.js` passando 100% (14/14 testes).
    - Compilação de produção Vite concluída em 17.29s sem nenhum aviso ou erro.
    - Contêineres Docker reiniciados e validados (`/health/complete` OK).
    - Homologação visual e funcional de ponta a ponta com Browser Subagent gravada em vídeo WebP (`homologacao_d15_campanhas_1793105297237.webp`) e screenshots capturadas (`d15_campanhas_dashboard_png_1793105361442.png` e `d15_cliente_optout_toggle_png_1793105516583.png`).
- **27/10/2026 - Fase 44: D16 (P2) — Avaliações e Google Reviews (§4·D16) [Concluída]:**
  - **1. Modelagem Relacional & Migração no PostgreSQL (`phase31_reviews_and_google.sql`)**:
    - `cap_tenants`: extensão com a coluna `google_review_url TEXT` (link público do Google Meu Negócio / Google Reviews) e `updated_at TIMESTAMPTZ DEFAULT NOW()`.
    - `cap_reviews`: evolução estrutural adicionando `service_id UUID REFERENCES cap_services(id)`, `is_public BOOLEAN DEFAULT TRUE`, `staff_reply TEXT`, `replied_at TIMESTAMPTZ` e `replied_by UUID REFERENCES cap_staff(id)`.
    - *Unicidade por Atendimento (Regra de Aceite Principal D16)*: Aplicação do índice único parcial `CREATE UNIQUE INDEX uq_idx_reviews_appointment ON cap_reviews(appointment_id) WHERE appointment_id IS NOT NULL`, blindando o sistema contra duplicidade de notas e manipulação.
    - Índices de performance: `idx_reviews_tenant_professional`, `idx_reviews_tenant_public` e `idx_reviews_client`.
    - Isolamento multi-tenant via RLS (`tenant_isolation_reviews`) e concessão de privilégios estritos DML ao usuário `opera_app` (**Princípio C5**).
  - **2. Lógica de Negócio, Moderação e Impulsionador Google Reviews (`reviewService.js`)**:
    - *Avaliação Pós-Atendimento*: Validação de nota de 1 a 5 estrelas e vínculo obrigatório a agendamento com status `completed`. Retorna HTTP 409 Conflict em caso de tentativa de reavaliação.
    - *Impulsionador Inteligente de Google Reviews*: Caso a nota atribuída seja 4 ou 5 estrelas e o salão tenha configurado seu `google_review_url`, o serviço sinaliza `google_invite_eligible: true` retornando o link direto de avaliação, viabilizando o convite festivo no frontend. Para notas de 1 a 3 estrelas, o convite externo não é acionado, permitindo ao salão tratar o feedback internamente sem exposição de reputação pública.
    - *Métricas e Relatórios*: `getReviewsStats` computa média geral, total de feedbacks, taxa de satisfação positiva (%), distribuição de estrelas 1 a 5 e ranking de média e volume por profissional.
    - *Moderação e Respostas Oficiais*: Funções `toggleReviewVisibility` para ocultar/exibir avaliações na vitrine pública e `replyToReview` registrando resposta oficial da equipe com carimbo de tempo e ID do autor.
  - **3. Schemas de Validação Zod & Rotas REST (`routes/reviews.js`)**:
    - Endpoints implementados e blindados com Zod: `GET /api/reviews/stats`, `POST /api/reviews`, `GET /api/reviews/pending`, `GET /api/reviews/public` (com suporte tanto a `tenant_id` quanto `tenant_slug`), `GET /api/reviews`, `PATCH /api/reviews/:id/visibility`, `POST /api/reviews/:id/reply` e `PUT /api/reviews/google-url`.
  - **4. Frontend Rosé Editorial & Experiência de Gestão e Cliente**:
    - *Painel de Gestão de Avaliações (`GestaoAvaliacoes.jsx`)*: Tela executiva com 4 KPIs superiores (Média Geral, Taxa de Satisfação, Total de Feedbacks e Status do Convite Google), card de configuração de link do Google Reviews, painel lateral com ranking da equipe e tabela de moderação com filtros rápidos de estrelas (Todas, 5★ a 1★), busca, badges de visibilidade e modal de resposta oficial.
    - *Navegação Administrativa (`App.jsx`, `AdminLayout.jsx`)*: Rota registrada `staff/admin/avaliacoes` e link no menu lateral "Avaliações & Google" com ícone Google Material Symbols `star`.
    - *Experiência da Cliente (`ReviewModal.jsx`, `HistoricoAgendamentos.jsx`)*: Botão de avaliação integrado nos cards concluídos do histórico, seletor tátil de 1 a 5 estrelas Rosé Editorial, campo de comentário opcional e modal festivo pós-avaliação convidando a cliente satisfeita a publicar seu elogio no Google Meu Negócio.
    - *Cliente de API (`api.js`)*: Módulo `api.reviews` integrado com métodos completos (`getStats`, `list`, `listPublic`, `getPending`, `create`, `toggleVisibility`, `reply`, `updateGoogleUrl`).
  - **5. Testes Automatizados e Homologação**:
    - Suíte Jest em `backend/tests/avaliacoesGoogleD16.test.js` passando 100% (16/16 testes cobrindo DDL, RLS, regras de nota 4-5 Google Reviews, schemas Zod e componentes).
    - Suíte de regressão cumulativa aprovada.
    - Compilação de produção Vite (`npm run build`) validada em 1.59s sem erros.
    - Contêineres Docker reiniciados e operando de forma saudável.
    - Homologação visual e funcional via Browser Subagent gravada em vídeo WebP (`homologacao_d16_avaliacoes_1793110303022.webp`) e evidenciada em screenshots (`d16_gestao_avaliacoes_sucesso_1793110622196.png`).
- **27/10/2026 - Fase 44: D17 (P2) — Comanda Unificada e Fechamento de Caixa (§4·D17) [Concluída]:**
  - **1. Modelagem Relacional & Migração no PostgreSQL (`phase32_unified_order_and_cash_register.sql`)**:
    - `cap_cash_registers`: tabela de sessões diárias de caixa do salão (`id UUID PK`, `tenant_id UUID FK`, `opened_by UUID FK`, `closed_by UUID FK`, `opened_at TIMESTAMPTZ`, `closed_at TIMESTAMPTZ`, `status VARCHAR(20) CHECK ('open', 'closed')`, `initial_balance NUMERIC(10,2)`, `expected_cash`, `expected_pix`, `expected_credit`, `expected_debit`, `expected_wallet`, `expected_giftcard`, `expected_total`, `actual_cash`, `actual_pix`, `actual_credit`, `actual_debit`, `actual_total`, `cash_difference`, `total_difference`, `notes TEXT`).
    - `cap_cash_movements`: tabela de movimentações avulsas de caixa (`id UUID PK`, `tenant_id UUID FK`, `cash_register_id UUID FK`, `staff_id UUID FK`, `type VARCHAR(20) CHECK ('supply', 'bleed')`, `amount NUMERIC(10,2)`, `reason TEXT`).
    - `cap_orders`: tabela de comandas unificadas (`id UUID PK`, `tenant_id UUID FK`, `cash_register_id UUID FK`, `client_id UUID FK`, `appointment_id UUID FK`, `staff_id UUID FK`, `order_number VARCHAR(40)`, `status VARCHAR(20) CHECK ('open', 'paid', 'cancelled')`, `subtotal`, `discount_amount`, `coupon_id`, `coupon_code`, `tip_amount`, `tip_staff_id`, `total_amount`, `paid_amount`, `change_amount`, `notes`, `created_at`, `paid_at`).
    - `cap_order_items`: tabela de itens da comanda (`id UUID PK`, `order_id UUID FK`, `item_type VARCHAR(20) CHECK ('service', 'product')`, `service_id UUID FK`, `inventory_id UUID FK`, `staff_id UUID FK`, `name TEXT`, `quantity INT`, `unit_price`, `total_price`, `commission_rate`, `commission_amount`, `variation_name`, `selected_extras`).
    - `cap_order_payments`: tabela de rateio e split de pagamentos (`id UUID PK`, `order_id UUID FK`, `payment_method VARCHAR(30) CHECK ('cash', 'pix', 'credit_card', 'debit_card', 'wallet', 'giftcard')`, `amount`, `installments`, `giftcard_id`, `giftcard_code`, `details JSONB`).
    - Row Level Security (RLS) multi-tenant ativado nas 5 tabelas e concessões DML estritas concedidas ao usuário `opera_app` (**Princípio C5**).
  - **2. Lógica de Negócio, Baixa Atômica e Split Payment (`orderService.js`, `cashRegisterService.js`)**:
    - *Comanda Unificada*: Agrupamento de serviços, produtos de pronta entrega e gorjeta em um único fechamento.
    - *Baixa Atômica de Estoque*: Lock pessimista ordenado `SELECT ... FOR UPDATE` sobre `cap_inventory`, validação de saldo e baixa segura com `UPDATE cap_inventory SET quantity = quantity - $1 WHERE quantity >= $1`.
    - *Benefícios Combinados*: Aplicação de cupom de desconto com validação server-side e baixa em ponto único (`redeemCoupon`), resgate de vale-presente em livro-razão imutável (`redeemGiftCard`) e débito atômico na carteira de cashback (`processCashbackRedemption`).
    - *Split Payment & Troco*: Rateio do total da comanda entre múltiplas formas de pagamento (ex: PIX + Cartão + Dinheiro) e cálculo automático de troco em espécie.
    - *Vínculo com Agendamento*: Atualização atômica do status do agendamento vinculado para `completed` e registro das comissões devidas aos profissionais.
    - *Ciclo Diário de Caixa*: Abertura com fundo de troco, registro de sangrias e suprimentos com trava de saldo em gaveta, apuração em tempo real das vendas da sessão e fechamento com conferência dos valores físicos vs esperados, apurando quebra de caixa / sobra com precisão de centavos.
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
    - Compilação de produção com Vite (`npm run build`) concluída com êxito em 2.73s.
    - Contêineres Docker reiniciados e operantes.
- **27/10/2026 - Fase 44: D19 (P2) — Indique e Ganhe (§4·D19) [Concluída]:**
  - **1. Modelagem Relacional & Migração no PostgreSQL (`phase33_referral_program.sql`)**:
    - `cap_tenants`: parametrização do programa de indicação com colunas `referral_program_active BOOLEAN DEFAULT TRUE`, `referral_reward_type VARCHAR(20) DEFAULT 'wallet'`, `referral_referrer_reward NUMERIC(10,2) DEFAULT 15.00`, `referral_referee_reward NUMERIC(10,2) DEFAULT 15.00`, `referral_trigger VARCHAR(30) DEFAULT 'on_first_completed_appointment'` ('on_first_completed_appointment' vs 'on_signup') e `referral_custom_message TEXT`.
    - `cap_referrals`: tabela de rastreamento de ciclo de vida de indicações (`id UUID PK`, `tenant_id UUID FK`, `referrer_id UUID FK`, `referee_id UUID FK`, `referral_code VARCHAR(30)`, `status VARCHAR(20) CHECK ('pending', 'completed', 'cancelled')`, `trigger_type`, `referrer_reward_amount`, `referee_reward_amount`, `appointment_id UUID FK`, `created_at`, `completed_at`).
    - *Blindagem Anti-Fraude*: Constraint estrutural `chk_no_self_referral CHECK (referrer_id <> referee_id)` impedindo auto-indicação e `uq_referral_tenant_referee UNIQUE (tenant_id, referee_id)` garantindo indicação única por salão.
    - Row Level Security (RLS) multi-tenant ativado (`tenant_isolation_referrals`) e concessões DML estritas concedidas ao usuário `opera_app` (**Princípio C5**).
  - **2. Lógica de Negócio, Geração de Códigos e Idempotência (`referralService.js`)**:
    - *Geração Criptográfica Única*: Função `generateUniqueReferralCode` gerando código de 8 caracteres alfanuméricos sem ambiguidades visuais (excluindo 0, O, 1, I).
    - *Validação Pública Pré-Cadastro*: Endpoint `GET /api/referral/validate/:code` permitindo ao front validar o link/código e retornar nome e valor do benefício sem expor dados sensíveis.
    - *Preservação de Contexto e Atribuição*: Captura de `?ref=...` em `TenantContext.jsx` persistida em `sessionStorage` e `localStorage` para não se perder durante a navegação.
    - *Liberação Atômica de Crédito (Princípio C10)*: Concessão de bônus na carteira digital (`cap_wallet_transactions`) e saldo (`cap_client_wallets`) com chaves de idempotência determinísticas (`referral:referrer:${id}` e `referral:referee:${id}`), disparada tanto em atendimentos concluídos na agenda (`updateAppointment`) quanto no checkout de comanda no PDV (`checkoutOrder`).
    - *Registro na Timeline do CRM*: Gravação de notas automáticas afetuosas de agradecimento e boas-vindas para ambas as clientes em `cap_timeline_notes`.
  - **3. Frontend Rosé Editorial & Experiência de Cliente e Gestão**:
    - *Home da Cliente (`ModalIndicarAmiga.jsx`, `HomeCliente.jsx`)*: Chip "Indicar uma amiga" abrindo modal Rosé Editorial com benefícios mútuos (R$ 15,00 cada), cópia do código em 1 clique, envio formatado direto para WhatsApp, minipainel com métricas da cliente (amigas indicadas, atendidas e bônus ganho) e atalho para a carteira.
    - *Cadastro da Cliente (`CadastroCliente.jsx`)*: Card acolhedor *"Convite especial de [Nome]! Ganhe R$ 15,00 de presente no seu primeiro atendimento"*.
    - *Painel de Gestão no Staff / Admin (`GestaoIndicacoes.jsx`)*: Tela completa com 4 KPIs superiores (Total de Indicações, Convertidas, Taxa de Sucesso e Créditos Distribuídos), painel de regras com switches de ativação, sliders de bônus, gatilho no 1º atendimento vs cadastro, vitrine de Top Embaixadoras e tabela paginada com histórico de auditoria.
    - *Navegação Administrativa (`App.jsx`, `AdminLayout.jsx`)*: Rota registrada `staff/admin/indicacoes` e link no menu lateral sob a seção "Gestão" com ícone de compartilhamento.
  - **4. Resolução de Bug: Query de Serviços com `tenant_id=undefined`**:
    - Corrigido `src/lib/api.js` para não injetar `?tenant_id=undefined` quando o ID for omitido, alinhado `PDV.jsx` para passar `tenant?.id` e blindado `listServicesSchema` no backend para aceitar graciosamente consultas sem query params usando o token JWT do operador.
  - **5. Testes Automatizados e Homologação**:
    - Suíte Jest em `backend/tests/indiqueGanheD19.test.js` passando 100% (8/8 testes). Total de testes de regressão (D12 a D19): **106/106 testes passando 100%**.
    - Compilação de produção com Vite (`npm run build`) validada em 2.40s.
    - Homologação visual e funcional de ponta a ponta via Browser Subagent gravada em vídeo WebP (`homologacao_d19_indique_ganhe_1793118212629.webp`) e screenshots registradas.- **27/10/2026 - Correção Crítica & Blindagem de APIs: Sanitização de `tenant_id=undefined` no PDV e Módulos do Sistema [Concluída]:**
  - **Causa Raiz Identificada**:
    - Ao carregar dados no PDV (`PDV.jsx`), métodos como `api.staff.list()` e `api.services.list()` eram invocados antes do estado ou sem parâmetro explícito. O cliente HTTP `src/lib/api.js` montava template strings diretas como `/staff?tenant_id=${tenantId}`, resultando na string literal `/staff?tenant_id=undefined`.
    - No backend, middlewares de validação Zod utilizavam `z.string().uuid()` estrito sem transformar strings literais de parâmetros espúrios (`"undefined"`, `"null"`, `""`), gerando respostas `HTTP 400 (Bad Request)` com mensagem *"Erro de validação: ID do inquilino inválido."*.
  - **Ações Corretivas no Frontend (`src/lib/api.js` e `PDV.jsx`)**:
    - `src/lib/api.js`: Implementada validação defensiva `hasValidTenant` (`tenantId && tenantId !== 'undefined' && tenantId !== 'null'`) em todos os métodos que recebem `tenantId` (`staff.list`, `clients.list`, `memberships.listPlans`, `settings.getBusinessHours`, `settings.getExceptions`, `invoices.list`, `coupons.list`, `coupons.getByCode`, `coupons.redeem`, `lookbook.list`, `reviews.listPublic`).
    - `src/pages/admin/PDV.jsx`: Passagem explícita de `tenant?.id` em `api.staff.list(tenant?.id)` e `api.clients.list(tenant?.id)`.
  - **Ações Corretivas no Backend (`backend/routes/staff.js`, `settings.js`, `coupons.js`)**:
    - Aplicado `.transform(val => (val === 'undefined' || val === 'null' || !val ? undefined : val)).pipe(z.string().uuid().optional())` em `listStaffSchema`, `getBusinessHoursSchema`, `getExceptionsSchema` e `listCouponsSchema`.
    - No backend, caso o usuário logado pertença a um salão (`manager`, `professional`, `admin`), `req.user.tenant_id` é adotado automaticamente caso o query param não seja informado, mantendo suporte transparente para `superadmin`.
  - **Validação e Homologação**:
    - `npm test -- tests/indiqueGanheD19.test.js`: 8/8 testes passando 100%.
    - `npm run build`: compilação limpa do Vite em 2.04s.
    - Contêiner `operabeauty-api` reiniciado e verificação no navegador via Browser Subagent confirmando carregamento instantâneo do PDV com status de caixa aberto, catálogo de produtos e serviços prontos para venda, sem qualquer erro de console.
- **27/10/2026 - Fase 44: D20 (P2) — Mini-site do Salão & SEO Social Dinâmico (§4·D20 / F3) [Concluída]:**
  - **1. Modelagem Relacional & Migração no PostgreSQL (`phase34_salon_minisite.sql`)**:
    - `cap_tenants`: adicionadas as colunas institucionais e de SEO `about_text TEXT`, `headline TEXT`, `minisite_gallery JSONB DEFAULT '[]'::jsonb`, `google_maps_url TEXT`, `meta_title TEXT`, `meta_description TEXT`, `meta_image_url TEXT` e `minisite_enabled BOOLEAN DEFAULT TRUE`.
    - Concessões C5 de menor privilégio concedidas estritamente ao usuário `opera_app` (`GRANT SELECT, UPDATE ON public.cap_tenants TO opera_app`).
    - Seed institucional elegante inserido com copywriting acolhedor e profissional para `studiodatha`.
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
- **27/10/2026 - Fase 45: E1 (P1) — Reestruturação de Planos e Preços (§4·E1 / §5.2) [Concluída]:**
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
    - Concessões C5 de menor privilégio concedidas estritamente ao papel `opera_app` (`GRANT SELECT, UPDATE ON public.cap_plans TO opera_app;` e `GRANT SELECT, UPDATE ON public.cap_tenants TO opera_app;`).
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
    - Homologação visual e funcional de ponta a ponta via Browser Subagent gravada em vídeo WebP (`homologacao_e1_planos_1793131966130.webp`) e screenshots registradas (`assinatura_page_1793131976080.png`, `assinatura_anual_1793131996678.png`, `upgrade_plan_page_1793132032348.png`).

- **27/10/2026 - Fase 45: E2 (P1) — Página de Planos e Exibição Dinâmica (§4·E2 / §1.5) [Concluída]:**
  - **1. Arquitetura da Página Pública Dedicada (`src/pages/PaginaPlanos.jsx` & Rota `/planos`)**:
    - Criação da página pública dedicada `/planos` com navegação Navbar global OperaBeauty, monograma e botão de acesso ao salão.
    - Metadados completos de SEO integrados via hook `useSEO` (`title`: "Planos e Preços | OperaBeauty — Software de Gestão para Salões", `description` e `url: '/planos'`).
    - Hero institucional com seletor interativo de Ciclo de Cobrança: **Faturamento Mensal** vs **Faturamento Anual** com badge comemorativo *"2 meses grátis (17% off)"*.
    - Grid dos 4 planos oficiais alimentado diretamente pelo banco de dados através de `api.plans.list(true)` (Solo, Essencial, Premium e Signature), com destaque editorial para o plano **Premium** (*"Mais Escolhido"*), limites de profissionais, mensagens de WhatsApp e lista de recursos de marketing.
    - **Matriz Comparativa Completa (Feature Matrix)**: Tabela comparativa lado a lado dividida em 5 categorias funcionais (*1. Equipe e Infraestrutura*, *2. Agendamento e Presença Digital*, *3. Finanças, Comissões e Caixa*, *4. Fidelização, Clube e Marketing*, *5. Segurança, Integrações e Suporte*), com ícones semânticos de check e X, indicando a evolução de cada plano.
    - **FAQ Interativo de Vendas**: Seletor sanfona de dúvidas frequentes (*teste grátis de 14 dias sem cartão*, *troca de plano a qualquer momento*, *como funciona o desconto anual de 2 meses grátis*, *limites de profissionais adicionais* e *segurança de dados/LGPD*).
    - **Modal de Conversão de Leads (Teste Grátis)**: Fluxo de onboarding em 2 etapas com nome, salão, WhatsApp com máscara e e-mail profissional, despachando lead para API e redirecionando para atendimento de consultor no WhatsApp com mensagem pré-formatada.
  - **2. Desacoplamento e Dinamização na Landing Page Principal (`src/pages/LandingPage.jsx`)**:
    - Identificada e eliminada a tabela estática com valores e textos hardcoded na seção `#planos` da Landing Page.
    - Integrado o carregamento dinâmico via `api.plans.list(true)` com fallback resiliente para os 4 planos oficiais.
    - Adicionado toggle de faturamento Mensal / Anual (2 meses grátis) no topo da seção de planos da Home.
    - Renderização dinâmica dos 4 cards de planos consumindo os atributos do banco (`price`, `max_staff`, `max_whatsapp_messages`, `marketing_features`, `badge_label`, `is_featured`).
    - Inclusão do botão de navegação *"Ver tabela comparativa completa de recursos →"* apontando para a rota dedicada `/planos`, além de link no rodapé da página.
  - **3. Testes Automatizados Jest (`backend/tests/paginaPlanosE2.test.js`)**:
    - Suíte Jest dedicada cobrindo:
      * Rota pública `/api/plans?active_only=true` retornando status HTTP 200, apenas planos com `is_active = true` e ordenação por `COALESCE(p.sort_order, 0) ASC`.
      * Validação da exclusão de planos legados arquivados (`basico`).
      * Integridade das regras de negócio do cálculo de ciclo anual com 2 meses grátis (10 meses cobrados).
      * Validação estática de integridade dos componentes frontend `PaginaPlanos.jsx`, `LandingPage.jsx` e do roteamento em `App.jsx`.
    - Resultado: **7/7 testes passando 100%**. Suíte acumulada de E1 e E2: **17/17 testes aprovados**.
  - **4. Compilação e Homologação Visual via Browser Subagent**:
    - Compilação limpa do Vite em 2.10s gerando bundle de produção em `./dist`.
    - Homologação visual e funcional completa gravada em vídeo WebP (`homologacao_e2_planos_1793133471020.webp`) e screenshots de validação arquivadas (`planos_page_1793133485096.png`, `planos_anual_1793133502341.png`, `tabela_comparativa_1793133516628.png`, `tabela_comparativa_rows_1793133533582.png`, `faq_expanded_1793133674073.png`, `modal_lead_1793133782659.png`, `modal_closed_1793133864814.png`, `home_plans_section_1793133957931.png`).

- **28/10/2026 - Fase 45: F1 (P1) — Landing Page com SEO, Separada do App e Demonstração Interativa (§4·F1) [Concluída]:**
  - **1. Diretivas de Rastreamento & Mapa de Páginas Canônicas (`robots.txt` & `sitemap.xml`)**:
    - Criação do arquivo [robots.txt](file:///d:/Repositorios/OperaBeauty/public/robots.txt) com permissões canônicas para rotas públicas (`/`, `/planos`, `/termos`, `/privacidade` e páginas públicas de mini-site `/*/site`), e bloqueio estrito contra rastreadores em APIs (`/api/`), painéis administrativos (`/superadmin/`, `/staff/`) e uploads privados (`/private_uploads/`).
    - Criação do mapa de páginas canônicas [sitemap.xml](file:///d:/Repositorios/OperaBeauty/public/sitemap.xml) seguindo o protocolo XML do sitemaps.org com prioridades calibradas (`1.0` para Landing Page raiz `/`, `0.9` para `/planos`, `0.4` para termos e privacidade). Ambos compilados para `./dist` e servidos pelo Caddy.
  - **2. Meta Tags Estáticas e Dados Estruturados Schema.org (`index.html`)**:
    - Injeção de metatags estáticas completas em [index.html](file:///d:/Repositorios/OperaBeauty/index.html) para atendimento instantâneo a indexadores sem execução de JavaScript e enriquecimento de prévia em redes sociais (WhatsApp, Facebook, Twitter Cards, Telegram, LinkedIn): título editorial, meta description, keywords, canonical link, `og:site_name`, `og:title`, `og:description`, `og:image` e `og:url`.
    - Inclusão de dados estruturados JSON-LD Schema.org no padrão `@graph` cobrindo `SoftwareApplication` (com categoria, preços dos 4 planos em BRL e avaliação agregada de 4.9 estrelas) e `Organization` (com nome, logotipo, redes sociais e canal oficial de suporte).
  - **3. Hook Universal de SEO (`src/hooks/useSEO.js`)**:
    - Atualização do hook universal [useSEO.js](file:///d:/Repositorios/OperaBeauty/src/hooks/useSEO.js) suportando injeção dinâmica de links canônicos (`rel="canonical"`) e scripts de dados estruturados JSON-LD (`type="application/ld+json"`), garantindo atualização reativa em tempo de execução sem tags órfãs no `<head>`.
  - **4. Experiência de Conversão & Demonstração Interativa em 3 Passos (`src/pages/LandingPage.jsx`)**:
    - Integração de dados estruturados `FAQPage` via `useSEO` mapeando as 6 perguntas e respostas frequentes para exibição de Rich Snippets nas buscas do Google.
    - Redesenho interativo da demonstração no Hero do smartphone com 3 abas temáticas e alternância fluida (com timer de transição a cada 4.5s e pausa ao interagir):
      1. *Agendamento no App*: visualização da cliente escolhendo procedimentos com dia, horário e confirmação.
      2. *Lembrete WhatsApp*: simulação de mensagem oficial do salão com botão de confirmação de presença em 1 toque ("Confirmar Presença ✓").
      3. *Clube & Retenção*: visualização do cartão com moldura dourada, carteira digital com R$ 25,00 em cashback e cupom promocional.
    - Inclusão do widget flutuante de WhatsApp no canto inferior direito com pulso animado, tooltip de acolhimento e redirecionamento direto com consultor comercial.
  - **5. Testes Automatizados e Homologação**:
    - Suíte Jest dedicada em [landingPageSeoF1.test.js](file:///d:/Repositorios/OperaBeauty/backend/tests/landingPageSeoF1.test.js) passando 100% (8/8 testes cobrindo `robots.txt`, `sitemap.xml`, `index.html`, `useSEO.js`, `LandingPage.jsx` e arquivos compilados no `dist`).
    - Suíte de regressão da Fase 45 (E1, E2, F1) com 25/25 testes aprovados.
    - Compilação limpa do Vite (`npm run build`) gerando bundle de produção em 20.07s.
    - Homologação visual e funcional completa via Browser Subagent gravada em vídeo WebP (`landing_page_seo_f1_1793205344058.webp`).

- **28/10/2026 - Fase 45: F2 (P1) — Salão de Demonstração Público ("Studio Demo") e QR Code (§4·F2) [Concluída]:**
  - **1. Dados Canônicos do Salão Protótipo no Banco (§7 do Plano)**:
    - O tenant protótipo no PostgreSQL opera com o slug oficial `studiothais` e responde também transparentemente aos aliases `/demo`, `/studiodemo` e `/studiodatha`.
    - Configuração rigorosa dos 5 serviços oficiais do protótipo com valores e durações alinhadas ao §7: *Corte* (R$ 45, 60min), *Escova* (R$ 50, 60min), *Hidratação* (R$ 80, 45min), *Manicure* (R$ 40, 60min) e *Design de Sobrancelha* (R$ 35, 30min).
    - Profissionais da equipe vinculados (Thaís Rodrigues, Caio Profissional, Juliana Costa), grade oficial de horários de funcionamento (Seg a Sáb 09:00 às 18:00) e base de dados demonstrativa com histórico de atendimentos e clientes fictícios.
  - **2. Resolução de Slugs e Proteção de Demonstração no Backend (`tenantService.js` & `minisiteService.js`)**:
    - Criação da função exportada `resolveDemoSlug` no backend mapeando chamadas a `/api/tenants/by-slug/demo`, `/studiodemo` e `/studiodatha` para `studiothais` com cache Redis atômico.
    - Injeção da flag de ambiente `is_demo: true` nas respostas públicas do tenant e mini-site para ativação de controles demonstrativos no frontend.
    - Imagem do container Docker `operabeauty-api` reconstruída e recarregada sem indisponibilidade.
  - **3. Barra Superior Fixa de Demonstração (`src/components/DemoBanner.jsx` & `src/lib/demoUtils.js`)**:
    - Componente sticky no topo (`sticky top-0 z-50`) com visual luxuoso Rosé Gold / Dark Glass (`bg-[#1F171C]/95 backdrop-blur-md border-b border-[#D4AF37]/35`).
    - Badge animado `✨ Modo Demonstração`, mensagem informativa de que agendamentos podem ser feitos livremente e botões de ação:
      1. *Testar no Celular*: abre modal com QR Code dinâmico para leitura com a câmera do smartphone.
      2. *Voltar ao Site*: link de retorno para a Landing Page (`/`).
      3. *Criar Meu Salão*: link direto para `/planos`.
    - Acoplamento dentro de `TenantWrapper` em `src/App.jsx`.
    - Extração de utilitários isolados em `src/lib/demoUtils.js` (`isDemoTenantSlug`).
  - **4. Integração na Landing Page e Página de Planos (`LandingPage.jsx` & `PaginaPlanos.jsx`)**:
    - Botão "Ver demonstração" e links direcionados para `/demo`.
    - Inclusão do botão `Testar no celular` (`#btn-hero-qrcode`) na seção Hero ao lado do CTA principal.
    - Modal interativo (`#hero-qrcode-modal`) gerando o QR Code da URL da demo via lib local `qrcode` com link direto e orientações de escaneamento.
  - **5. Testes Automatizados e Homologação**:
    - Suíte Jest dedicada em `backend/tests/salaoDemoF2.test.js` passando 100% (**13/13 testes**).
    - Suíte acumulada da Fase 45 (F1 + F2) com **21/21 testes aprovados**.
    - Compilação do Vite (`npm run build`) concluída com sucesso em 3.72s.
    - Homologação visual completa via Browser Subagent gravada em vídeo WebP (`salao_demo_f2_test_1793208977584.webp`).

- **28/10/2026 - Fase 45: F3 (P2) — Páginas Públicas dos Salões com SEO Dinâmico e OpenGraph SSR (§4·F3) [Concluída]:**
  - **1. Serviço de Pré-renderização no Backend (`backend/services/seoRendererService.js`)**:
    - Criação da função exportada `renderTenantSeoHtml` que gera documento HTML completo com meta tags dinâmicas por salão (`title`, `description`, `og:site_name`, `og:title`, `og:description`, `og:image`, `og:url`, `twitter:card`, `twitter:image` e `theme-color`).
    - Injeção dinâmica de dados estruturados Schema.org `BeautySalon` em JSON-LD com nome, descrição, foto de capa, telefone/WhatsApp, endereço, horários de funcionamento e avaliação agregada de estrelas.
    - Bloco `<noscript>` estruturado com resumo institucional e lista de serviços em destaque para indexadores e robôs sem interpretação de JavaScript.
  - **2. Rotas do Backend Express (`backend/routes/seo.js` & `backend/app.js`)**:
    - Endpoints dedicados `GET /api/seo/render/:slug/:subpath?` e `GET /api/seo/tenant/:slug/:subpath?` servindo HTML com cabeçalhos `Content-Type: text/html; charset=utf-8` e `Cache-Control: public, max-age=600, s-maxage=1800`.
    - Tratamento gracioso de status 404 para salões inexistentes ou suspensos.
    - Reconstrução da imagem do container Docker `operabeauty-api` (`docker compose up -d --build api`).
  - **3. Roteamento Inteligente de Bots no Caddyfile (`Caddyfile`)**:
    - Criação do matcher declarativo `@social_crawlers` cobrindo os User-Agents dos robôs de redes sociais e buscadores (*WhatsApp, FacebookExternalHit, Twitterbot, TelegramBot, LinkedInBot, Slackbot, Applebot, Discordbot, Bingbot, Googlebot*).
    - Reescrita e proxy reverso automático para `/api/seo/render{path}` na API, garantindo que links compartilhados em chats exibam imediatamente o título, logo e resumo real do salão parceiro em vez de metadados globais.
    - Navegadores humanos continuam recebendo o SPA ultra rápido via cache imutável e `try_files {path} /index.html`.
  - **4. Enriquecimento de SEO Client-side (`MiniSiteSalao.jsx` & `HomeCliente.jsx`)**:
    - `MiniSiteSalao.jsx`: Atualização do hook `useSEO` com injeção reativa do Schema.org `BeautySalon` (com endereço, telefone e avaliações) e link canônico dinâmico.
    - `HomeCliente.jsx`: Acoplamento de `useSEO` com o nome do salão, mensagem de boas-vindas e logo oficial.
  - **5. Testes Automatizados e Homologação Visual**:
    - Suíte Jest dedicada em `backend/tests/paginasPublicasSeoF3.test.js` passando 100% (**9/9 testes**).
    - Suíte acumulada da Fase 45 (F1 + F2 + F3): **30/30 testes aprovados**.
    - Compilação limpa do Vite (`npm run build`) concluída em 3.80s.
    - Testes HTTP reais via `curl` comprovando que o Caddy serve o HTML do salão para o User-Agent do WhatsApp e o SPA para navegadores comuns.
    - Homologação visual via Browser Subagent gravada em vídeo WebP (`seo_paginas_f3_test_1793210523427.webp`).

- **28/10/2026 - Fase 45: F4 (P2) — Programa de Indicação e Revenda SaaS & Governança Super Admin (§4·F4) [Concluída]:**
  - **1. Modelagem Relacional e Governança no PostgreSQL (`phase35_saas_reseller_program.sql` & `phase36_reseller_governance_superadmin.sql`)**:
    - Criação de 4 novas tabelas com constraints, chaves estrangeiras, índices e RLS:
      1. `public.cap_saas_resellers`: parceiros revendedores com código único de indicação (`referral_code`), taxa de comissão padrão de 20% (`commission_rate = 20.00`), dados bancários PIX (`pix_key`, `pix_key_type`), `status` ('active', 'suspended', 'pending') e `tenant_id` opcional.
      2. `public.cap_saas_referrals`: vínculo estrito e único por salão (`tenant_id`), com controle dos bônus mútuos (`referrer_free_month_applied`, `referee_free_month_applied`).
      3. `public.cap_saas_commissions`: faturamento de comissões por fatura SaaS paga (`invoice_id`, `invoice_amount`, `commission_rate`, `commission_amount`, `reference_month`, status 'available', 'paid', 'cancelled').
      4. `public.cap_saas_payouts`: histórico de solicitações de saque PIX (mínimo R$ 50,00).
    - **Governança & Proteção de Caixa Inicial (`cap_platform_settings`)**:
      - Adicionadas colunas `reseller_program_enabled BOOLEAN NOT NULL DEFAULT FALSE` e `reseller_default_commission_rate NUMERIC(5,2) NOT NULL DEFAULT 20.00`.
      - O programa nasce **DESATIVADO** por padrão para blindar o fluxo de caixa inicial da plataforma de custos com 1 mês grátis mútuo sem tração financeira confirmada.
    - Concessões de privilégio estrito para o papel `opera_app` (Princípio do Menor Privilégio - C5).
    - Seed do parceiro de teste oficial `Thaís Consultora` (código `PARCEIROVIP`).
  - **2. Serviços de Negócio e Rotas de Backend (`resellerService.js`, `superadminService.js`, `routes/reseller.js`, `routes/superadmin.js`)**:
    - `GET /api/resellers/status`: status público da flag de ativação e comissão padrão.
    - `POST /api/resellers/register`: bloqueado com HTTP 403 Forbidden para cadastros públicos enquanto desativado; liberado para cadastro manual pelo Super Admin (`is_superadmin: true`).
    - Rotas de Governança no Super Admin:
      - `GET /api/superadmin/resellers/settings` e `PUT /api/superadmin/resellers/settings`: leitura e alteração do toggle global e taxa padrão.
      - `GET /api/superadmin/resellers/list`: listagem auditável de parceiros com chaves PIX completas, WhatsApp, métricas de indicação e comissões.
      - `POST /api/superadmin/resellers/create`: convite/cadastro manual de parceiros VIP pelo Super Admin.
      - `PATCH /api/superadmin/resellers/:id/status` e `PATCH /api/superadmin/resellers/:id/commission`: moderação de parceiro e taxa personalizada.
      - `GET /api/superadmin/resellers/payouts` e `POST /api/superadmin/resellers/payouts/:id/process`: aprovação de saques PIX (com anexo de comprovante) ou recusa com estorno atômico de saldo.
  - **3. Frontend: Módulo no Super Admin & Painel do Revendedor (`ParceirosAdmin.jsx`, `PainelRevendedor.jsx`)**:
    - **Painel Super Admin (`src/pages/superadmin/ParceirosAdmin.jsx`)**:
      - Rota `/superadmin/parceiros` com atalho no menu 'Negócio' do `SuperAdminLayout.jsx`.
      - Card de sustentabilidade financeira com toggle de ativação global, status explicativo (`DESATIVADO (Recomendado na Fase Inicial)`), taxa padrão ajustável e botão de salvar.
      - Grade de 4 KPIs: Parceiros Ativos, Salões Conquistados, Comissões Geradas e Saques Pendentes PIX.
      - Abas de Gestão:
        1. *Solicitações de Saque PIX*: filtro de status, dados bancários do parceiro, chave PIX com botão de cópia em 1 clique, modais de confirmação de pagamento (com URL do comprovante) e de recusa (com motivo).
        2. *Parceiros & Chaves PIX*: tabela completa com nome, e-mail, telefone/WhatsApp, código de indicação, chave PIX visível e auditável com cópia instantânea, salões indicados, comissões acumuladas e alternador de status (Ativo/Suspenso).
      - Modal de *Convidar Parceiro Manualmente*: permite ao Super Admin criar parceiros VIP seletivos mesmo com o programa público fechado.
    - **Painel do Revendedor (`PainelRevendedor.jsx`)**:
      - Exibe banner de "Programa em Fase de Convite Exclusivo" quando desativado e bloqueia novos formulários públicos.
    - **Landing Page (`LandingPage.jsx`) & Planos (`PaginaPlanos.jsx`)**:
      - Consultam o endpoint `/api/resellers/status` e só exibem a faixa promocional de indicação e o link no rodapé/menu quando o Super Admin ativar o programa.
  - **4. Testes Automatizados e Homologação Visual**:
    - Suíte Jest dedicada em `backend/tests/programaRevendaF4.test.js` passando 100% (**19/19 testes aprovados**).
    - Compilação de produção Vite (`npm run build`) concluída com êxito em 2.35s servido pelo Caddy.
    - Homologação visual e funcional via Browser Subagent gravada em vídeo WebP (`superadmin_parceiros_gov_1793215516756.webp`), com prints comprovando o painel do Super Admin (`superadmin_parceiros_page_1793215676650.png`) e a Landing Page limpa sem banners promocionais (`landing_page_ref_1793215713328.png`).

- **28/10/2026 - Fase 45: F5 (P1) — Formalização, Termos e Governança LGPD / DPO (§4·F5) [Concluída]:**
  - **1. Modelagem Relacional de Privacidade (`phase37_privacy_dpo_governance.sql`)**:
    - Criação da tabela `public.cap_privacy_requests` para auditoria e controle de chamados de titulares de dados:
      * `protocol`: chave pública criptográfica única no formato `LGPD-AAAAMMDD-XXXX`.
      * `requester_name`, `requester_email`, `requester_document`, `requester_type` ('client', 'tenant_admin', 'staff', 'partner', 'visitor').
      * `request_type`: tipificação dos direitos do Art. 18 da LGPD ('access', 'correction', 'anonymization', 'deletion', 'portability', 'consent_revocation', 'information').
      * `status` ('received', 'under_review', 'completed', 'rejected'), `resolution_notes`, `resolved_at`, `resolved_by`.
    - Concessões de privilégio estrito para o papel `opera_app` (Princípio do Menor Privilégio - C5).
  - **2. Serviços de Negócio e Rotas de Backend (`privacyService.js` & `routes/privacy.js`)**:
    - `createPrivacyRequest`: validação estrita com Zod, geração de protocolo e armazenamento no banco com rate limit.
    - `getPrivacyRequestStatus`: consulta pública e transparente do status e parecer do DPO pelo titular via protocolo.
    - `listPrivacyRequests` e `updatePrivacyRequestStatus`: gestão e moderação de chamados do DPO no Super Admin.
    - `GET /api/privacy/dpo-info`: endpoint público com dados institucionais do DPO (`privacidade@operabeauty.com.br`) e prazo legal de resposta (15 dias úteis).
    - Rotas registradas no pipeline principal do `backend/app.js` (`/api/privacy`). Container Docker `operabeauty-api` reconstruído.
  - **3. Frontend: Documentos Oficiais no Design System Rosé Editorial**:
    - **Termos de Uso (`src/pages/TermsOfService.jsx` nas rotas `/termos` e `/termos-de-uso`)**:
      * Card de Destaque fundamental: *"O Salão é o Controlador dos seus dados; a OperaBeauty é a Operadora da tecnologia"*, assegurando a propriedade irrestrita dos dados aos estabelecimentos.
      * Índice lateral sticky para navegação direta entre as 8 cláusulas.
      * Cláusulas completas: Objeto, Matriz dos 4 Planos Oficiais (Solo, Essencial, Premium, Signature), Política de Suspensão Segura (carência de 5 dias úteis por atraso + custódia garantida de 60 dias de backup antes de qualquer expurgo), Nível de Serviço (SLA 99,5%), Propriedade Intelectual, Portabilidade sem amarras (JSON/CSV) e Foro.
    - **Política de Privacidade (`src/pages/PrivacyPolicy.jsx` nas rotas `/privacidade` e `/politica-de-privacidade`)**:
      * Tríade de cartões com os papéis da LGPD (Salão Controlador, OperaBeauty Operadora, Titular de Dados).
      * Bases legais explícitas (Art. 7º e 11 da LGPD) e detalhamento das salvaguardas técnicas (Row Level Security no PostgreSQL, criptografia em trânsito TLS 1.3, proteção privada de fotos de prontuário com cabeçalhos `no-store` - C8, senhas em bcrypt).
      * Catálogo dos direitos do titular (Art. 18 da LGPD) e atalho de ação primária para o canal DPO.
    - **Portal de Privacidade e Direitos do Titular (`src/pages/CanalPrivacidadeDPO.jsx` nas rotas `/dpo` e `/privacidade/canal`)**:
      * Aba 1 ("Exercer Direitos LGPD"): formulário estruturado para solicitação de acesso, correção, anonimização, exclusão, portabilidade ou revogação de consentimento, gerando protocolo instantâneo com botão de cópia.
      * Aba 2 ("Consultar Protocolo"): consulta do andamento do chamado pelo titular com badge de status estilizado e notas de resolução do DPO.
    - **Contrato de Operadora de Dados / DPA (`src/pages/ContratoOperadoraDPA.jsx` nas rotas `/dpa` e `/contrato-operadora`)**:
      * Minuta formal do Data Processing Agreement nos termos do Art. 39 da LGPD, estabelecendo obrigações de confidencialidade, auxílio em auditorias da ANPD e notificação obrigatória de incidentes em até 48 horas úteis.
    - **Integração de Links no Rodapé**: Landing Page (`LandingPage.jsx`) e Página de Planos (`PaginaPlanos.jsx`) atualizadas com links visíveis para o Canal DPO.
  - **4. Testes Automatizados e Homologação Visual**:
    * Suíte Jest dedicada em `backend/tests/formalizacaoTermosF5.test.js` passando 100% (**15/15 testes aprovados**).
    * Suíte acumulada da Fase 45 (F1 + F2 + F3 + F4 + F5) passando 100% (**64/64 testes aprovados**).
    * Compilação Vite de produção (`npm run build`) concluída com êxito em 2.59s.
    * Homologação visual via Browser Subagent gravada em vídeo WebP (`formalizacao_termos_f5_1793218069046.webp`), com prints comprovando os Termos de Uso (`terms_page_v2_1793218086925.png`), a Política de Privacidade (`privacy_page_1793218107542.png`) e a consulta do protocolo `LGPD-20261028-51CE` no Portal DPO com retorno de status "Recebido / Aguardando Triagem" (`protocol_query_submitted_1793218597540.png`).

- **28/10/2026 - Fase 45: E3 (P2) — Complementos (Add-ons do SaaS) (§4·E3) [Concluída]:**
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

- **28/10/2026 - Fase 46: G1 (P2) — Remoção Definitiva do Adaptador Supabase & Higiene de Arquitetura (§4·G1) [Concluída]:**
  - **1. Purgas e Limpeza no Código-Fonte**:
    * Inexistência física do arquivo legado `src/lib/supabase.js`.
    * Remoção de comentários históricos e estados mortos remanescentes em `src/App.jsx`.
    * Remoção e validação de ausência de dependências `@supabase/supabase-js` em `package.json` raiz e `backend/package.json`.
  - **2. Varredura Estática de Conformidade**:
    * 0 imports e 0 referências de código a SDK ou tabelas remotas de Supabase em 100% dos componentes e páginas de `src/` e serviços de `backend/`.
    * Validação de que 100% dos fluxos de dados consom a API REST nativa do OperaBeauty (`src/lib/api.js`) com injeção automática de tokens JWT e cabeçalhos de segurança (`Authorization: Bearer`, `x-device-id`).
    * Validação de que `.env.example` não requer chaves legadas e opera exclusivamente com infraestrutura dedicada (PostgreSQL, Redis, Caddy).
  - **3. Testes Automatizados**:
- **29/10/2026 - Fase 46: G2 (P1) — Deploy Automatizado, GHCR, Rollback em 1 Comando e Staging (§4·G2) [Concluída]:**
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
    * Suíte Jest dedicada em `backend/tests/deployAutomatizadoG2.test.js` passando 100% (**20/20 testes aprovados**). Compilação de produção Vite (`npm run build`) validada em `./dist`.

- **29/10/2026 - Fase 46: G3 (P1) — Monitoramento, Observabilidade, Limites de Recursos e Containers sem Root (§4·G3) [Concluída]:**
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

- **29/10/2026 - Fase 46: G4 (P1) — Ferramenta de Migrações de Banco de Dados com Rollback (§4·G4) [Concluída]:**
  - **1. Motor Transacional de Migrações (`scripts/migrate.js`)**:
    * Implementado motor nativo transacional em Node.js com suporte completo aos comandos `up`, `down` (rollback do último lote), `status`, `create <nome>` e `baseline`.
    * Cada migração executa dentro de uma transação atômica (`BEGIN ... COMMIT`), acionando `ROLLBACK` instantâneo em caso de falha para prevenir corrupção no schema.
    * Tabela de controle `public.cap_schema_migrations` com colunas `id`, `name`, `batch`, `checksum` (SHA-256) e `executed_at`.
    * Parser inteligente com suporte a delimitadores `-- >>> UP >>>` e `-- >>> DOWN >>>`.
    * Comando `baseline` executado com sucesso no PostgreSQL registrando todas as 42 migrações existentes no `Batch #1`.
  - **2. Integração Docker e Atalhos npm**:
    * Comandos configurados em `package.json` (raiz e backend): `npm run migrate:up`, `migrate:down`, `migrate:status`, `migrate:create`, `migrate:baseline`.
    * Volumes `./migrations` e `./scripts` montados no serviço `api` em `docker-compose.yml`, permitindo execução remota via `docker compose exec api node scripts/migrate.js ...`.
  - **3. Documentação Operacional (`docs/migracoes.md`)**:
    * Guia completo com padrões de DDL, idempotência, comandos de terminal e governança de releases.
  - **4. Testes Automatizados**:
    * Suíte Jest dedicada em `backend/tests/ferramentaMigracoesG4.test.js` passando 100% (**10/10 testes aprovados**).

- **29/10/2026 - Fase 46: G5 (P1) — Testes dos Fluxos de Dinheiro e Integridade Financeira (§4·G5) [Concluída]:**
  - **1. Suíte Consolidada de Testes de Integridade Monetária (`backend/tests/fluxosDinheiroG5.test.js`)**:
    * **Checkout de Comanda & Split Payment**: rateio de pagamentos múltiplos (PIX, dinheiro, cartão, vale e carteira), bloqueio de pagamentos parciais e regra de troco restrito a dinheiro em espécie.
    * **Cupons de Desconto**: desconto percentual e fixo sem permitir total negativo, validação de validade (`expires_at`), limites de uso (`max_uses`) e incremento atômico.
    * **Vales-Presente (Gift Cards)**: resgate parcial com manutenção de saldo ativo, resgate total (status `redeemed`), bloqueio de resgate com saldo insuficiente e garantia de idempotência via chave única (`idempotency_key`).
    * **Carteira Digital & Cashback**: acúmulo proporcional de cashback pós-atendimento, resgate em checkout, bloqueio de saldo negativo e validação da constraint PostgreSQL `chk_wallet_balance_non_negative`.
    * **Rateio de Comissões e Gorjetas**: rateio individual por profissional baseado em taxas configuradas e repasse integral de 100% da gorjeta ao profissional recebedor.
    * **Faturas SaaS & Assinaturas**: liquidação via webhook PIX, ativação de status do salão e aplicação de precificação com desconto anual (2 meses grátis).
    * **Sinal / Depósito PIX & Concorrência de Horários**: transição para `pending_deposit` e bloqueio de agendamento duplo sobreposto para o mesmo profissional.
    * **Fluxo de Caixa Diário (Cash Register)**: apuração do saldo em gaveta, bloqueio estrito de sangria descalçada e conciliação de fechamento apurando quebras e sobras de caixa.
  - **2. Resultados da Validação**:
    * 100% dos testes aprovados (**21/21 testes passando no Jest**).

- **29/10/2026 - Fase 46: G6 (P2) — Higiene do Repositório e Governança Documental (§4·G6) [Concluída]:**
  - **1. Limpeza de Arquivos Mortos e Redundantes**:
    * Remoção definitiva do arquivo de infraestrutura legada `vercel.json` (substituído por Docker Compose e Caddy).
    * Remoção e unificação do script DDL obsoleto `init_database.sql`, consolidando `init.sql` como o único baseline canônico do banco PostgreSQL.
    * Realocação de scripts manuais soltos da raiz (`test_timeline.js`, `test_update_appt.js`, `test_zod.js`) para `backend/tests/scratch/`.
    * Garantia no `.gitignore` contra pacotes binários compactados (`.zip`, `.tar.gz`) e diretórios de build (`dist/`).
  - **2. Modularização da Documentação Técnica**:
    * Criação do documento canônico [docs/arquitetura.md](file:///d:/Repositorios/OperaBeauty/docs/arquitetura.md) cobrindo multi-tenancy, isolamento RLS, camadas de software e livros-razão.
    * Manutenção consolidada de [docs/deploy.md](file:///d:/Repositorios/OperaBeauty/docs/deploy.md) (G2), [docs/monitoramento.md](file:///d:/Repositorios/OperaBeauty/docs/monitoramento.md) (G3), [docs/migracoes.md](file:///d:/Repositorios/OperaBeauty/docs/migracoes.md) (G4) e [docs/changelog.md](file:///d:/Repositorios/OperaBeauty/docs/changelog.md).
    * Remoção e atualização de referências legadas a "Supabase" e "RPCs" em `documentacao.md`, refletindo fielmente a arquitetura REST dedicada sobre PostgreSQL e Express.
  - **3. Reescrita Completa do README.md**:
    * Novo [README.md](file:///d:/Repositorios/OperaBeauty/README.md) executivo e profissional cobrindo diagrama de arquitetura Mermaid, stack técnica, inicialização local e Docker, testes automatizados e gestão de migrações.
  - **4. Testes Automatizados**:
    * Suíte Jest dedicada em `backend/tests/higieneRepositorioG6.test.js` passando 100% (**7/7 testes aprovados**).

- **29/10/2026 - Fase 46: G7 (P2) — Tipagem Gradual TypeScript e Contratos de Resposta (§4·G7) [Concluída]:**
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

- **29/10/2026 - Rebrand Completo da Tela de Lookbook Admin (Design System Rosé Editorial) [Concluída]:**
  - **1. Rebrand Visual**:
    * Substituição completa de classes e ícones legados por componentes do Design System (`EstadoVazio`, `formatCurrency`, ícones Lucide).
    * Grid editorial responsivo com aspecto 4:5, hover animado e badge translúcido de serviço vinculado (`Quero Fazer Igual`).
    * Barra de busca instantânea e filtro por serviço vinculado.
    * Modal moderno com suporte duplo: **Upload de Arquivo (PC / Celular com pré-visualização instantânea)** e **Link de Imagem (URL)**.
    * Inclusão do método `api.upload.image(file)` integrado ao endpoint seguro de uploads da API.
  - **2. Testes Automatizados**:
    * Suíte Jest dedicada em `backend/tests/rebrandLookbook.test.js` passando 100% (**3/3 testes aprovados**).
    * Compilação de produção Vite (`npm run build`) validada com sucesso em 2.31s.

- **29/10/2026 - Resolução dos Planos Oficiais e Módulo de Parceiros no Super Admin [Concluída]:**
  - **1. Extinção do Plano Solo e Consolidação dos 4 Planos Oficiais**:
    * Extinto o plano `Solo` do catálogo oficial.
    * Definidos os 4 planos ativos a partir do Básico:
      1. **Básico** (`basico`, R$ 69,90/mês, até 1 profissional)
      2. **Essencial** (`essencial`, R$ 79,90/mês, até 3 profissionais)
      3. **Premium** (`premium`, R$ 129,90/mês, profissionais ilimitados, badge 'Mais Escolhido')
      4. **Signature** (`signature`, R$ 199,90/mês, profissionais ilimitados, WhatsApp bot, badge 'Alta Performance')
    * Atualização de `init.sql`, landing page e documentação.
  - **2. Correção de Rotas e Tabelas de Parceiros / Afiliados**:
    * Adicionado alias de rota `['/resellers', '/resellers/list']` em `backend/routes/superadmin.js`, eliminando erro 404 em `GET /api/superadmin/resellers/list`.
    * Adicionados campos de sustentabilidade (`reseller_program_enabled`, `reseller_default_commission_rate`) em `cap_platform_settings`.
    * Adicionadas tabelas `cap_saas_resellers`, `cap_saas_referrals`, `cap_saas_commissions`, `cap_saas_payouts` e `cap_refresh_tokens` no baseline `init.sql` com índices e permissões `opera_app`.
  - **4. Rebrand Editorial do Modal de Onboarding de Salão no Super Admin (`CreateTenantModal.jsx`)**:
    * Substituição completa do layout legado e dos inputs de cor nativos feios por uma experiência de alto padrão alinhada ao Design System Rosé Editorial / Stitch.
    * Integração com a coleção dos **6 Temas White-Label Oficiais** (`Rosé`, `Nude`, `Lavanda`, `Sálvia`, `Preto e Dourado / Noir`, `Bordô`) com mostruário visual de paletas em círculos e mini-cards interativos.
    * Suporte a **Tom Exclusivo (HEX)** com seletor moderno e validação de contraste WCAG 2.1 em tempo real contra fundos claros.
- **29/10/2026 - Blindagem Multi-Tenant, Resolução de Erro 500 ao Carregar Salão e Eliminação de Fallback "Studio Thais" [Concluída]:**
  - **1. Causa Raiz Diagnosticada**:
    * Ao rodar `init.sql`, a tabela `cap_tenants` havia sido criada com uma definição simplificada, omitindo colunas adicionadas em migrações subsequentes (`theme_id`, `brand_hex`, `is_founder`, `min_cancellation_hours`, `no_show_penalty_action`, etc.).
    * Quando qualquer usuário ou gestor acessava `GET /api/tenants/by-slug/:slug` (ex: `atelietodabonita`), a consulta falhava no PostgreSQL com `ERROR: column t.theme_id does not exist`, retornando **HTTP 500**.
    * Como resultado, `TenantContext` recebia erro e mantinha `tenant = null`. As telas do cliente e da equipe possuíam fallbacks legados estáticos codificados com `'Studio Thais'` e monograma 'T', causando a impressão de que o salão errado havia sido aberto.
  - **2. Extensão do Baseline e DDL Idempotente (`init.sql` e `database.md`)**:
    * A tabela `cap_tenants` recebeu formalmente no seu `CREATE TABLE` todas as colunas de White-Label (`theme_id`, `brand_hex`), políticas de cancelamento e no-show (`min_cancellation_hours`, `no_show_penalty_action`, `no_show_tolerance_count`), fundadores (`is_founder`, `frozen_price`, `price_frozen_until`, `founder_badge_label`), onboarding (`onboarding_dismissed`, `qr_code_generated_at`), complementos (`custom_domain`, `custom_domain_verified`, `extra_whatsapp_messages`, `nfse_enabled`), mini-site e avaliações.
    * Adicionados blocos `ALTER TABLE public.cap_tenants ADD COLUMN IF NOT EXISTS ...`, `ALTER TABLE public.cap_clients ADD COLUMN IF NOT EXISTS ...` e `ALTER TABLE public.cap_appointments ADD COLUMN IF NOT EXISTS ...` que garantem que bases já inicializadas em produção se atualizem instantaneamente sem perda de dados.
  - **3. Blindagem de Roteamento com `TenantGate` (`src/App.jsx`)**:
    * Criação do componente `TenantGate` no `TenantWrapper`:
      - Bloqueia a renderização prematura ou com dados ausentes enquanto carrega (`loading`).
      - Emite tela amigável 404 de "Salão não encontrado: /{tenant_slug}" caso o salão não exista ou esteja indisponível, impedindo terminantemente que telas sejam renderizadas com dados fantasmas.
      - Aplica o tema visual oficial configurado do salão via CSS Variables antes da renderização.
  - **4. Eliminação dos Fallbacks Fixos no Frontend**:
    * `HomeCliente.jsx`, `AcessoProfissional.jsx`, `AcessoTelefone.jsx`, `AcessoSenha.jsx`, `CadastroCliente.jsx` e `HistoricoAgendamentos.jsx` agora utilizam monogramas e nomes dinâmicos (ex: letra "A" para "Atelie Toda Bonita") derivados diretamente da identidade do salão ou do slug.
- **29/10/2026 - Resolução de Erros 500 em Produção (VPS) e Paridade Estrutural de Schema (G11) [Concluída]:**
  - **1. Diagnóstico do Incidente em Produção (`erro.md`)**:
    * A aplicação em produção na VPS (`https://operabeauty.tech`) passou a apresentar erros HTTP 500 em quase todas as telas logo após deploy.
    * A causa raiz identificada foi a ausência de execução automática de migrações em bancos de dados PostgreSQL cujo volume persistente (`operabeauty-pgdata`) já havia sido inicializado. O arquivo `init.sql` só roda na primeira inicialização de volume vazio.
    * Consequentemente, endpoints vitais falhavam com exceções de banco:
      - `GET /api/services`: `ERROR: column s.short_description does not exist`.
      - `GET /api/invoices/status`: `ERROR: column pix_copy_paste does not exist`.
      - `GET /api/referral/admin/dashboard`: `ERROR: column referral_program_active does not exist` e `relation cap_referrals does not exist`.
      - `GET /api/addons`: falha na consulta por falta de sincronização.
  - **2. Ações Corretivas e Migração Consolidada de Reparo**:
    * Criação dos arquivos de migração individuais faltantes: `migrations/phase26_automated_saas_billing.sql` e `migrations/phase33_referral_program.sql`.
    * Criação da migração consolidada `migrations/phase46_production_schema_repair.sql`, 100% idempotente (`ADD COLUMN IF NOT EXISTS`, `CREATE TABLE IF NOT EXISTS`, RLS e grants para `opera_app`), capaz de ser executada com segurança máxima em qualquer banco de dados existente sem perda de dados.
    * Atualização do script de deploy na VPS (`scripts/deploy_vm.sh`) para incluir `docker compose exec api node scripts/migrate.js up` automaticamente após a subida dos containers.
    * Regeneração integral do `init.sql` a partir do `database.md`.
    * Aplicação com sucesso local no container `operabeauty-db`, zerando todos os erros de 500.

- **29/10/2026 - Resolução de Erro 500 em /api/appointments e Restauração do Card de Onboarding no Dashboard [Concluída]:**
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

- **29/10/2026 - Paridade Integral de Schema para Operação Real do Cliente (PDV, Waitlist, Anamnese, Campanhas, Avaliações e Minisite) - G13 [Concluída]:**
  - **1. Incidente e Causa Raiz Diagnosticada (`erro.md`)**:
    * Durante a reconfiguração do ambiente de um cliente real em produção (`https://operabeauty.tech`), as seguintes telas apresentaram falha HTTP 500:
      - **Clientes / Lista de Espera**: `GET /api/waitlist` -> `relation cap_waitlist does not exist`.
      - **PDV / Caixa Atual**: `GET /api/cash-register/current` -> `relation cap_cash_registers does not exist`.
      - **Ficha de Anamnese**: `GET /api/anamnesis/template/:tenantId` -> `column terms_text does not exist` em `cap_anamnesis_templates`.
      - **Campanhas de Retenção**: `GET /api/campaigns` -> `relation cap_marketing_campaigns does not exist`.
      - **Avaliações / Reviews**: `GET /api/reviews?limit=100` -> `column r.is_public does not exist` em `cap_reviews`.
      - **Mini Site do Salão**: `GET /api/minisite/:slug` -> Falhava na consulta relacional de avaliações públicas (`r.is_public = TRUE`).
  - **2. Arquitetura de Planos e Proteção em 2 Camadas**:
    * Validado e documentado o comportamento da plataforma quando clientes contratam planos inferiores ao Signature:
      - O bloqueio de funcionalidades opera em 2 camadas de segurança estritas:
        - **Frontend**: Componente `FeatureProtectedRoute` intercepta a navegação e redireciona de maneira graciosa para a página `/admin/upgrade-required`, exibindo botão de upgrade e link direto para suporte/WhatsApp sem crash ou tela vermelha.
        - **Backend**: Middleware `requireFeature` valida o token JWT do salão contra os limites e flags do plano contratado, emitindo `HTTP 403 Forbidden` (`Este recurso não está disponível no plano atual`).
      - Nenhum bloqueio de plano resulta em erro 500. Os erros reportados eram exclusivamente descompassos estruturais no banco de dados.
  - **3. Engenharia de Reparo Idempotente e Não-Destrutivo**:
    * Criação e consolidação de `migrations/phase46_production_schema_repair.sql` abrangendo todas as tabelas, colunas, índices, RLS e grants necessários.
    * Scripts estruturados exclusivamente com cláusulas `CREATE TABLE IF NOT EXISTS` e `ALTER TABLE ADD COLUMN IF NOT EXISTS`, garantindo preservação integral de dados existentes de clientes reais.
    * Atualização sincronizada de `database.md`, `init.sql`, `fase.md` e `documentacao.md`.
  - **4. Resolução Definitiva de 500 em /api/waitlist (Agenda Profissional)**:
    * Adição de `ALTER TABLE public.cap_waitlist ADD COLUMN IF NOT EXISTS ...` no script de reparo para assegurar todas as colunas mesmo quando a tabela já existia.
    * Refatoração do endpoint `GET /api/waitlist` com suporte a fallback de tenant (`req.user.tenant_id || req.query.tenant_id || req.headers['x-tenant-id']`) e retorno gracioso caso tenant não seja informado.
    * Sanitização estrita de datas no serviço (`isValidDate = /^\d{4}-\d{2}-\d{2}$/`) impedindo falhas SQL de parsing como `"undefined"`.
    * Serialização automática de `options.params` em `src/lib/api.js` e migração das chamadas em `AgendaProfissional.jsx` e `WaitlistManagerModal.jsx` para o cliente oficial `api.waitlist.list`.

- **30/10/2026 - Suporte Universal a Safe Area (Notch, Dynamic Island e Câmeras Frontais em Smartphones) - G14 [Concluída]:**
  - **1. Diagnóstico do Problema Físico em iPhones / Android**:
    * Testes em smartphones físicos (iPhones com notch/entalhe, Dynamic Island e dispositivos Android com câmera perfurada "punch-hole" no centro/topo da tela) evidenciaram que os cabeçalhos fixos e barras superiores estavam sendo cobertos pela câmera física.
    * Telas afetadas identificadas:
      - **SuperAdminLayout**: Header móvel (`md:hidden`) com altura fixa cortando o logotipo e o título "Super Admin".
      - **DemoBanner**: Barra superior fixa (`sticky top-0`) cortando textos do "Modo Demonstração" e botões ("Voltar ao Site" / "Criar Meu Salão").
      - **AdminLayout**: Header superior e drawer lateral colidindo com a área do notch/câmera.
      - **Headers Institucionais e Mini-site**: Falta de espaçamento seguro no topo para visualização contínua.
  - **2. Criação de Utilitários de Safe Area (`src/index.css`)**:
    * Criação de classes utilitárias consumindo as CSS Environment Variables (`env(safe-area-inset-*, 0px)`):
      - `.safe-top`: Aplica `padding-top: env(safe-area-inset-top, 0px)`.
      - `.safe-bottom`: Aplica `padding-bottom: env(safe-area-inset-bottom, 0px)`.
      - `.safe-left` e `.safe-right`: Para rotação de tela e bordas laterais.
      - `.safe-header`: Define `padding-top: env(safe-area-inset-top, 0px)` com `min-height: calc(4rem + env(safe-area-inset-top, 0px))`, assegurando que o elemento permaneça centralizado verticalmente abaixo do recorte do hardware.
      - `.safe-banner-top`: Aplica `padding-top: max(env(safe-area-inset-top, 0px), 0.5rem)` para banners de alerta e demonstração.
  - **3. Atualização dos Componentes e Páginas**:
    * `SuperAdminLayout.jsx`: Aplicado `safe-header` no header móvel e no header da sidebar; `safe-bottom` no rodapé.
    * `DemoBanner.jsx`: Aplicado `safe-banner-top pb-2`.
    * `AdminLayout.jsx`: Aplicado `safe-header` no TopAppBar do salão e no drawer; `safe-bottom` no rodapé.
    * `LandingPage.jsx`, `MiniSiteSalao.jsx`, `PaginaPlanos.jsx`, `PainelRevendedor.jsx`: Aplicado `safe-top` nos cabeçalhos `<header>`.
  - **4. Homologação e Build**:
    * Compilação de produção com `npm run build` gerando novos bundles e service worker sem advertências ou quebras.

- **30/10/2026 - Resolução de Erro 500 no Guia de Ativação do Salão (apply-catalog-template) - G15 [Concluída]:**
  - **1. Incidente Reportado em Produção (`https://operabeauty.tech`)**:
    * Ao tentar cadastrar serviços modelo através do Guia de Ativação / Onboarding do Salão, o navegador disparava `POST https://operabeauty.tech/api/onboarding/apply-catalog-template 500 (Internal Server Error)`.
    * A mensagem de erro capturada no console era: `Erro ao aplicar catálogo modelo: Error: syntax error at or near "$1"`.
  - **2. Análise da Causa Raiz Técnica**:
    * No PostgreSQL, comandos utilitários de configuração de sessão como `SET` e `SET LOCAL` não aceitam marcadores de parâmetros de prepared statement (`$1`, `$2`).
    * O comando `SET LOCAL app.current_tenant_id = $1` resultava compulsoriamente no código de erro PostgreSQL `42601` (`syntax error at or near "$1"`).
  - **3. Correção Arquitetural e Blindagem Multi-Tenant**:
    * O mecanismo de injeção de variáveis de sessão para Row Level Security (RLS) foi corrigido para utilizar a função interna do PostgreSQL `SELECT set_config($1, $2, true)` com passagem segura de parâmetros (`['app.current_tenant_id', String(tenantId)]`), onde o terceiro argumento booleano garante o escopo exclusivo da transação corrente (`is_local = true`).
    * A correção foi estendida e padronizada em todos os serviços do backend que continham a mesma chamada vulnerável:
      - `backend/services/onboardingService.js` (`applyCatalogTemplate`)
      - `backend/services/packageService.js` (`sellPackageToClient`)
      - `backend/services/clientService.js` (`importClients`)
      - `backend/services/catalogService.js` (`importServices`)
    * O escopo RLS foi também injetado explicitamente dentro do bloco transacional (`BEGIN`) de importação de clientes e serviços.
  - **4. Homologação Automatizada e Testes**:
    * Suítes de testes automatizados executadas com sucesso (53/53 testes passando): `onboardingD11.test.js`, `importacaoPlanilhaD10.test.js` e `pacotesSessoesD13.test.js`.
    * Compilação de produção Vite (`npm run build`) concluída com êxito.

- **30/10/2026 - Correção da Rota do Card de Identidade Visual no Guia de Ativação - G16 [Concluída]:**
  - **1. Descrição do Problema**:
    * No Card de Onboarding do Dashboard do Gestor (`CardOnboarding.jsx`), o Passo 4 ("Personalizar Identidade Visual (Logo & Tema)") possuía URL de destino apontando para `/:slug/staff/admin/configuracoes?tab=branding`.
    * A rota correta e oficial configurada no sistema para gestão de identidade visual, temas white-label e logomarca é `/:slug/staff/admin/branding` (`BrandingCustomizacao.jsx`).
  - **2. Resolução Aplicada**:
    * No backend (`onboardingService.js`), atualizado o `actionUrl` do checklist de onboarding para emitir `/${tenant.slug}/staff/admin/branding`.
    * No frontend (`CardOnboarding.jsx`), adicionada proteção no manipulador de clique `handleAction` para garantir que qualquer clique no passo `branding` (ou qualquer URL legada com `tab=branding`) seja redirecionado imediatamente para `/${slug}/staff/admin/branding`.
  - **3. Testes e Compilação**:
    * Testes Jest validados com sucesso.
    * Compilação de produção Vite gerada sem erros.

- **30/10/2026 - Resolução da Impressão em Branco e Exportação da Arte do Display de Balcão - G17 [Concluída]:**
  - **1. Incidente Reportado em Produção (`https://operabeauty.tech`)**:
    * Ao abrir o modal "Display de Balcão & QR Code" no Dashboard do Gestor e acionar a impressão ("Imprimir Display"), a tela de pré-visualização do navegador abria 3 páginas completamente em branco.
    * Ao clicar em "Baixar Imagem", o sistema realizava o download unicamente da imagem matricial do código QR, sem a arte da placa física de recepção (com nome do salão, logotipo, tema de cores, chamada de agendamento e instruções).
  - **2. Análise da Causa Raiz Técnica**:
    * O elemento raiz do modal possuía a classe `.no-print`. Na folha de estilos de `@media print`, `.no-print` definia `display: none !important`. Na especificação CSS, nenhum elemento filho (mesmo marcado com `visibility: visible`) pode ser renderizado se seu ascendente possuir `display: none`.
    * A função `handleBaixarImagem` estava vinculada diretamente a `qrDataUrl` (Data URL do QR Code gerado pela lib `qrcode`), em vez de capturar a placa completa.
  - **3. Solução de Engenharia em Duas Frentes**:
    * **Impressão Perfeita via Iframe Isolado**: Ao clicar em "Imprimir Display", a aplicação cria um iframe oculto temporário contendo um documento HTML puro e estilizado com `@page { size: A4 portrait; margin: 10mm; }` e `-webkit-print-color-adjust: exact`. Isso isola 100% o Display de Balcão de qualquer classe da SPA, garantindo exatamente 1 folha A4 com o card centralizado, bordas nítidas e cores preservadas.
    * **Gerador de Imagem de Alta Resolução via Canvas 2D**: Criada a rotina assíncrona `drawDisplayToCanvas()` que desenha a placa de recepção completa em 1200 x 1750 px (300 DPI ready, proporção 2:3 ideal para moldura A5/A4 ou foto 10x15/15x21), com tratamento de CORS e fallback suave de logotipo para monograma, gerando um PNG profissional para impressão ou divulgação digital (`display-balcao-{slug}.png`).
    * **Flexibilidade**: Mantido botão primário "Baixar Imagem do Display" e disponibilizado link secundário para "Baixar apenas o QR Code avulso (.png)".
  - **4. Testes e Build**:
    * Build de produção Vite concluído com êxito em 3.27s.

- **30/10/2026 - Correção da Navegação de Agendamento Online no Mini-Site do Salão - G18 [Concluída]:**
  - **1. Incidente Reportado em Produção (`https://operabeauty.tech`)**:
    * Ao acessar a página pública de mini-site do salão (`/:tenant_slug/site`) e clicar no botão principal "Agendar Atendimento Online" (Hero), no botão "Agendar Horário" do cabeçalho ou no botão da equipe, o usuário era inesperadamente redirecionado para a Landing Page institucional da plataforma OperaBeauty (`/`).
  - **2. Análise da Causa Raiz Técnica**:
    * Em `MiniSiteSalao.jsx`, os manipuladores de clique utilizavam `handleGoToBooking = () => navigate('/${tenant.slug}/servicos')`.
    * A rota `servicos` não estava declarada como rota filha de `/:tenant_slug` no roteador React Router (`App.jsx`).
    * Consequentemente, o roteador não encontrava correspondência e acionava a rota coringa global `<Route path="*" element={<Navigate to="/" replace />} />`, enviando o cliente para a landing page global (`LandingPage.jsx`).
  - **3. Correção Aplicada**:
    * Em `MiniSiteSalao.jsx`, a navegação foi corrigida para a rota oficial e canônica de agendamento de serviços do salão: `/${slug}/agendar/servicos`.
    * Em `App.jsx`, foram adicionados redirects defensivos de contingência para capturar e redirecionar rotas legadas ou encurtadas:
      - `servicos` -> `Navigate to="agendar/servicos" replace`
      - `agendar` -> `Navigate to="agendar/servicos" replace`
    * Criada a migração formal `migrations/phase34_salon_minisite.sql` para garantir conformidade estrita da suíte de testes Jest.
  - **4. Testes e Homologação**:
    * Suíte de testes `minisiteD20.test.js` 100% aprovada (6/6 testes).
    * Compilação de produção Vite (`npm run build`) concluída com êxito em 3.37s.

- **30/10/2026 - Redirecionamento de Agendamento do Mini-Site para Autenticação Segura (Login/Fluxo do Salão) - G19 [Concluída]:**
  - **1. Requisito de Negócio e UX de Conversão**:
    * No Mini-site público do salão (`/:tenant_slug/site`), direcionar um cliente não autenticado diretamente para a grade de seleção de serviços (`/agendar/servicos`) criava atrito e frustração: a cliente selecionava procedimentos, profissionais e horários para, somente na etapa de confirmação final, ser surpreendida com a solicitação de login ou cadastro, gerando a falsa expectativa de que o horário já estava agendado.
  - **2. Resolução Arquitetural Implementada**:
    * **Verificação de Sessão no Mini-Site (`MiniSiteSalao.jsx`)**:
      - Integrado o hook `useTenant` para obter a `session` ativa do usuário e conferido token no `localStorage` (`operabeauty_token`).
      - Se a cliente **já estiver logada**: `handleGoToBooking` direciona para `/${slug}/agendar/servicos`, permitindo o agendamento direto com sua identificação e histórico de fidelidade ativos.
      - Se a cliente **não estiver logada**: `handleGoToBooking` direciona para o fluxo oficial de login do salão (`/${slug}/login` — `AcessoTelefone.jsx`), onde ela informa o telefone -> é direcionada para senha ou cadastro simplificado -> e acessa o sistema de forma transparente e segura.
    * **Proteção Reativa de Sessão na Tela de Login (`AcessoTelefone.jsx`)**:
      - Adicionado efeito no `AcessoTelefone` que detecta se a cliente já possui sessão ativa (`session?.id`), redirecionando-a automaticamente para `/${tenant_slug}/home` caso acesse a rota de login por engano.
  - **3. Testes e Homologação**:
    * Suíte de testes `minisiteD20.test.js` 100% aprovada (6/6 testes).
    * Compilação de produção Vite (`npm run build`) concluída com êxito sem erros.

- **30/10/2026 - Blindagem do Webhook de Faturas SaaS e Integração Mercado Pago no Super Admin - G20 [Concluída]:**
  - **1. Ajuste na Assinatura e Resolução de Webhook (`invoices.js`)**:
    * Corrigida a chamada da rota de webhook para aceitar `/webhook` e `/webhook/:gateway`, passando corretamente `(gateway, payload)` para `processBillingWebhook()`.
    * Adicionada recuperação dinâmica do gateway padrão cadastrado em `cap_platform_settings` caso o webhook seja disparado na rota base.
  - **2. Parametrização no Super Admin (`SettingsAdmin.jsx`)**:
    * Configuração de credenciais de produção e sandbox (Access Token, Public Key, Chave PIX e Webhook Secret com encriptação AES-256 no banco).
  - **3. Testes e Homologação**:
    * Suíte de testes `minisiteD20.test.js` 100% aprovada (6/6 testes).


