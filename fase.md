# Projeto Capelli - Fases de Desenvolvimento

Este arquivo rastreia o progresso do desenvolvimento do sistema de gestão do salão Capelli.

## Fase 1: Setup e Infraestrutura Core
- [x] Inicialização da estrutura na pasta `capelli`. (Concluído)
- [x] Configuração do Supabase (Tabelas de Clientes, Serviços, Estoque, Vouchers, Agendamentos). (Concluído)
- [x] Setup do projeto React + Vite + Tailwind v4. (Concluído)
- [x] Configuração de Níveis de Acesso (Dono, Profissional, Cliente). (Concluído)

## Fase 2: Gestão Administrativa e Estoque
- [x] Dashboard Financeiro (Estrutura e KPIs Visuais). (Concluído)
- [x] CRUD de Serviços com vínculo automático de estoque (Insumos). (Concluído)
- [x] Gerenciamento de Profissionais integrados ao Supabase Profiles. (Concluído)
- [x] Controle de Estoque com avisos de quantidade mínima e unidades (ml, un). (Concluído)
- [x] Cadastro e Gestão de Clientes (Base CRM). (Concluído)

## Fase 3: CRM, Timeline e Aniversariantes
- [x] Perfil do Cliente com Timeline interativa (comentários). (Concluído)
- [x] Módulo de Aniversariantes com filtro mensal e mensagens padronizadas. (Concluído)
- [x] Histórico detalhado de serviços vinculados a cada cliente. (Concluído)

## Fase 4: Agenda Inteligente e Configurações
- [x] Tela de Configurações (Branding, Horários e Feriados).
- [x] Agenda Mestre com visualização mensal e diária por profissional.
- [x] Motor de slots inteligentes (bloqueio automático de horários ocupados).
- [x] Integração de aviso de agendamento via WhatsApp.
- [x] Sistema de criação e validação de Vouchers de Desconto.

## Fase 5: Refinamento de Estoque e Automação Operacional
- [x] Interface de Estoque: Botões de ação (+, Editar, Inativar, Lixeira) sempre visíveis. (Concluído)
- [x] Interface de Estoque: Sistema de status triplo (Disponível, Crítico, Inativo). (Concluído)
- [x] Reposição Rápida: Botão "+" para entrada de mercadorias com registro simplificado. (Concluído)
- [x] Segurança de Fluxo: Alerta de serviços dependentes ao inativar/excluir item de estoque. (Concluído)
- [x] Gestão de Agenda: Inclusão de botões "Concluir" e "Cancelar" nos atendimentos. (Concluído)
- [x] Automação Backend: Gatilho (Trigger) para baixa automática de insumos apenas ao marcar serviço como "Concluído". (Concluído)
- [x] Estorno Inteligente: Devolução de estoque em caso de cancelamento de serviço concluído. (Concluído)

## Fase 6: Gestão Centralizada de Equipe (Admin/Gestor)
- [x] Remoção de Auto-Cadastro: Eliminar fluxo de registro público de profissionais. (Concluído)
- [x] Criação por Convite: Gestor/ADM cria o acesso (Email/Senha/Nome) diretamente no painel. (Concluído)
- [x] Gestão de Credenciais: Botões para Reset de Senha, Edição de Nome e Status. (Concluído)
- [x] Bloqueio de Acesso: Profissionais desabilitados ficam impedidos de logar no sistema. (Concluído)
- [x] Visibilidade de Reserva: Apenas profissionais habilitados aparecem no portal de agendamento público. (Concluído)
- [x] Exclusão de Agenda: Gestores e ADMs não aparecem como profissionais para os clientes. (Concluído)

## Fase 7: Portal do Profissional (Experiência Mobile)
- [x] Módulo Responsivo: Ambiente exclusivo para o Profissional ao logar. (Concluído)
- [x] Agenda do Dia: Visualização simplificada e rápida dos atendimentos agendados. (Concluído)
- [x] CRM do Profissional: Acesso ao histórico completo, fotos e timeline do cliente antes/durante o serviço. (Concluído)
- [x] Alerta Real: Notificação de aniversariante (dia ou mês) no momento do atendimento. (Concluído)
- [x] Operação: Check de "Concluído" diretamente no portal mobile para disparar baixa de estoque. (Concluído)
- [x] Restrição de Acesso: Gestores visualizam mas não operam no ambiente exclusivo do profissional. (Concluído)

## Fase 8: Portal de Agendamento Público
- [x] Correção técnica: Resolução de Erro 406 ao carregar horários (maybeSingle). (Concluído)
- [x] Fluxo de reserva: Seleção de Serviço -> Profissional -> Data disponível. (Concluído)
- [x] Identificação por celular (Cadastro automático para novos). (Concluído)
- [x] Customização visual dinâmica (Cores do ADM). (Concluído)
- [x] Consulta de agendamentos próprios via celular. (Concluído)

## Fase 9: Agendamentos Multi-Serviços (Combos) e Jornada
- [x] Infraestrutura 1:N para múltiplos serviços por agendamento. (Concluído)
- [x] Interface de Cesta de Serviços no Portal do Cliente. (Concluído)
- [x] Visualização de Combos na Agenda do Gestor. (Concluído)
- [x] Ajuste de Jornada: Remoção do auto-save nos horários de funcionamento. (Concluído)
- [x] Botão Salvar (Disquete): Implementação de botão físico para atualizar horários no banco. (Concluído)

## Fase 10: CRM Avançado e Linha do Tempo
- [x] Timeline interativa por cliente com histórico de fotos. (Concluído)
- [x] Notificações automáticas de manutenção (Maintenance Days). (Concluído)
- [ ] Dashboards de fidelidade e recorrência.

## Fase 12: Correções Críticas e Refinamentos (Concluída)
- [x] **Fix Agenda Mestre**: Habilitado RLS em `cap_appointment_services` (Resolução do Erro 403). (Concluído)
- [x] **Fix Agenda Mestre**: Corrigido reset de data ao abrir/avançar no `NewAppointmentModal.jsx`. (Concluído)
- [x] **Roteamento Inteligente**: Implementado `ProtectedRoute` (Admin -> Dashboard / Profissional -> Portal). (Concluído)
- [x] **Menu do Profissional**: Criado e integrado `ProfessionalMenu.jsx` para navegação funcional mobile. (Concluído)
- [x] **Otimização de Slots**: Revisão de lógica de busca para agendamentos múltiplos realizada. (Concluído)

## Fase 13: Homologação e Qualidade
- [ ] Teste de responsividade mobile (`responsive-design`).
- [ ] Auditoria de segurança e maturidade (`code-maturity-assessor`).
- [ ] Deployment final e treinamento.

## Fase 14: Separação de Ambientes e Autorizações (Gestor vs Profissional)

### Escopo: Gestor/ADM
- [x] Dashboard de visão geral com KPIs financeiros e operacionais.
- [x] Controle total da Agenda mestre (Novos agendamentos, remanejamentos, edições e cancelamentos).
- [x] Gestão completa de Clientes (Cadastro, manutenção e atualização de dados).
- [x] Módulo Manutenção: Envio de alertas e mensagens para carteira de clientes inativos.
- [x] Módulo Aniversariantes: Gestão e envio de mensagens comemorativas.
- [x] Gestão de Profissionais: Controles rígidos (Cadastro, edição, inativação e exclusão).
- [x] Gestão de Serviços: (Cadastro, atualização, modificação, inativação e exclusão).
- [x] Gestão ampla de Estoque e suprimentos.
- [x] Acesso administrativo às Configurações do ambiente do salão.
- [x] Acesso corporativo ao "Minha Conta" para edições de dados.

### Escopo: Profissional (Ambiente Mobile VIP)
- [x] **Restrição Absoluta**: Sem acesso a Dashboard, Clientes, Manutenção, Profissionais, Configurações e Aniversariantes.
- [x] **Menu Otimizado**: Correção dos ícones de navegação mobile para não exibir telas restritas e agora ajustado para Desktops.
- [x] **Agenda Swipe**: Formato de colunas por dia com auto-focus scroll.
- [x] **Card Simplificado**: Exibe Horário, Status, Cliente, Serviços e botão de Detalhes.
- [x] **Visão de Prontuário Clínico/Estético (Detalhe do Atendimento)**: 
    - Ficha técnica do cliente com tag de Nascimento.
    - Histórico retrospectivo de datas de atendimentos anteriores.
    - Área para digitação de anotações do atendimento vigente.
    - Área para anexo/upload de novas fotos via câmera vinculada a CRM.
    - **Botões de Iniciar e Finalizar** migrados permanentemente para esta tela.
- [x] **Leitura de Dados Básicos (Read-Only)**: Acesso restrito a Serviços e Estoque para consulta.
- [x] **Design Nobre (UI/UX)**: Experiência Mobile encapsulada garantindo harmonia mesmo em desktops.

## Fase 15: Arquitetura White Label (SaaS)
- [x] Mapeamento e substituição de textos engessados "Capelli" em todas as pontas do sistema.
- [x] Consumo dinâmico da base de `cap_settings` para nome fantasia operando em nuvem. Logo e títulos atualizam instantaneamente.

## Fase 16: Estabilização de Fluxos Zero-Data
- [x] **Cadastro Automático**: Implementada a interface de registro para novos clientes no portal público, permitindo a entrada de Nome e Data de Nascimento. (Concluído)
- [x] **Limpeza de Base**: Script de truncate estruturado para preservar usuários e configurações durante resets de sistema. (Concluído)

## Fase 17: Ajustes Globais e Refinamento de Agenda (Em Homologação)
- [x] **Correção de Fuso Horário**: Ajuste técnico em 6 módulos para garantir que datas de nascimento não sofram redução de dia devido ao fuso UTC. (Concluído)
- [x] **Padronização de Nomes**: Implementação de caixa alta (UPPERCASE) em todos os nomes de clientes no Portal do Profissional, Agenda, CRM e Modais. (Concluído)
- [x] **Destaque de Bloqueios**: Implementação visual de dias bloqueados na Agenda Mestre com padrão de listras (stripes) e badge de "BLOQUEADO". (Concluído)

## Planejamento Final - Avaliação e Refino
- Aguardando os direcionamentos do Caio.
