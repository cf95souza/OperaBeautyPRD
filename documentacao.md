# Documentação do Projeto: OperaBeauty

## Escopo do Projeto
O OperaBeauty é um sistema SaaS White Label Multi Tenant focado no ramo de beleza feminina, abrangendo estúdios, salões de beleza, manicures, clínicas de estética, entre outros. A arquitetura Multi Tenant permite que uma única instância do sistema atenda múltiplas empresas simultaneamente, com segurança e independência.

A estratégia principal de acesso (tanto para clientes finais quanto para os profissionais e gestores) se dará através de rotas baseadas no nome do salão, utilizando o formato `seudominio.com/[nomedosalao]` (ex: `OperaBeauty/salaodamaria`). Esse formato evita falhas globais de roteamento, garante isolamento visual/dados, e permite customização de identidade visual (White Label) para cada ambiente.

O sistema é dividido estrategicamente em 4 Módulos Principais (fundamentados pelo novo Design System do Stitch):
1. **Módulo Cliente (Portal do Cliente):** Fluxo de agendamento, histórico, fidelidade e pagamentos. **Importante:** O isolamento de clientes é total. O link de acesso dita a base de dados. Se uma cliente usa o salão A e o salão C, ela terá cadastros e senhas separadas para cada um, vinculados unicamente àquele link.
    - **Fluxo Exato do Cliente:**
      1. Acessa o link do salão (`/[nomedosalao]`).
      2. Tela **`acesso_telefone`**: Digita o número. Se já tiver cadastro, avança para:
      3. Tela **`acesso_senha`**: Digita a senha para autenticar.
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
   docker exec -it operabeauty-db psql -U postgres -d operabeauty
   ```
3. Cole o conteúdo de `database.md` no console e dê enter para estruturar as tabelas SaaS Multi-Tenant.

---

## Histórico de Alterações

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
   docker exec -it operabeauty-db psql -U postgres -d operabeauty
   ```
3. Cole o conteúdo de `database.md` no console e dê enter para estruturar as tabelas SaaS Multi-Tenant.

---

## Histórico de Alterações

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
  - **Aprimoramentos de UI/UX e Responsividade Mobile-First (18.5)**: Transformação da tabela de extrato de comissões em um *Feed de Cards Responsivo* em telas menores (`md:hidden`), eliminando scroll horizontal em smartphones; redesenho completo dos botões de observação e anexo de imagens no CRM (`FichaClienteCRM.jsx`) utilizando tokens de alto contraste (`bg-slate-900`) e alinhamento flexível para touchscreens.


