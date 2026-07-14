import React from 'react';
import { Link } from 'react-router-dom';

export default function TermsOfService() {
    return (
        <div className="bg-background text-on-surface font-body-md min-h-screen">
            <header className="w-full z-50 bg-surface/80 shadow-sm border-b border-outline-variant/30">
                <div className="max-w-7xl mx-auto px-container-margin flex justify-between items-center h-20">
                    <Link to="/" className="font-headline-md text-headline-md font-bold tracking-tight text-primary">
                        OperaBeauty
                    </Link>
                    <Link to="/" className="text-secondary hover:text-primary transition-colors flex items-center gap-2 font-label-md">
                        <span className="material-symbols-outlined text-sm">arrow_back</span> Voltar
                    </Link>
                </div>
            </header>

            <main className="max-w-3xl mx-auto px-container-margin py-32 space-y-lg">
                <h1 className="font-display-sm text-display-sm text-primary mb-xl">Termos de Serviço</h1>
                
                <div className="space-y-md text-secondary">
                    <p className="text-body-lg">Última atualização: 08 de Julho de 2026</p>
                    
                    <h2 className="font-headline-sm text-on-surface mt-lg">1. Aceitação dos Termos</h2>
                    <p>Ao acessar e utilizar a plataforma SaaS OperaBeauty, você concorda em cumprir e ficar vinculado a estes Termos de Serviço. Caso não concorde com qualquer parte destes termos, você não deve usar nossos serviços.</p>
                    
                    <h2 className="font-headline-sm text-on-surface mt-lg">2. Descrição do Serviço</h2>
                    <p>O OperaBeauty fornece um software online (SaaS) projetado para a gestão de salões de beleza, estúdios e clínicas de estética. O serviço inclui gerenciamento de agendas, controle de estoque, comissionamento e área de agendamento para clientes finais.</p>
                    
                    <h2 className="font-headline-sm text-on-surface mt-lg">3. Contas de Usuário</h2>
                    <p>Você é responsável por manter a confidencialidade das credenciais de acesso (e-mail e senha) da sua conta e de todos os profissionais cadastrados (Staff). O OperaBeauty não se responsabiliza por perdas e danos decorrentes do acesso não autorizado resultante de falhas na proteção de suas credenciais.</p>
                    
                    <h2 className="font-headline-sm text-on-surface mt-lg">4. Uso Aceitável</h2>
                    <p>Você concorda em usar o serviço apenas para fins lícitos de gestão do seu negócio. É terminantemente proibido utilizar o OperaBeauty para spam, envio de mensagens abusivas, armazenamento de conteúdo ilícito, tentativas de engenharia reversa do código-fonte ou qualquer ação que comprometa a integridade da infraestrutura.</p>
                    
                    <h2 className="font-headline-sm text-on-surface mt-lg">5. Assinaturas e Pagamentos</h2>
                    <p>O acesso ao OperaBeauty requer uma assinatura ativa (mensal ou anual). A interrupção ou inadimplência do pagamento resultará, após avisos prévios, na suspensão temporária do acesso à plataforma. Não realizamos reembolsos pró-rata por períodos não utilizados após o cancelamento.</p>
                    
                    <h2 className="font-headline-sm text-on-surface mt-lg">6. Limitação de Responsabilidade</h2>
                    <p>O OperaBeauty envida seus melhores esforços para garantir 99.9% de uptime, mas o software é fornecido "no estado em que se encontra", sem garantias explícitas de ausência de falhas técnicas eventuais. Não seremos responsabilizados por lucros cessantes, perdas indiretas ou corrupção acidental de dados gerada por mau uso ou instabilidades em servidores de terceiros.</p>
                    
                    <h2 className="font-headline-sm text-on-surface mt-lg">7. Modificações no Serviço e Preços</h2>
                    <p>Reservamo-nos o direito de modificar as funcionalidades do sistema para sua evolução. Alterações no valor das assinaturas serão comunicadas com pelo menos 30 dias de antecedência, não afetando pagamentos já realizados em planos anuais vigentes.</p>
                </div>
            </main>
            
            <footer className="bg-surface-container-low py-lg border-t border-outline-variant/30 text-center">
                <p className="font-body-sm text-secondary">© 2026 OperaTech Systems. Todos os direitos reservados.</p>
            </footer>
        </div>
    );
}
