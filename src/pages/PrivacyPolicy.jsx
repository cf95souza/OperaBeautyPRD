import React from 'react';
import { Link } from 'react-router-dom';

export default function PrivacyPolicy() {
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
                <h1 className="font-display-sm text-display-sm text-primary mb-xl">Política de Privacidade</h1>
                
                <div className="space-y-md text-secondary">
                    <p className="text-body-lg">Última atualização: 08 de Julho de 2026</p>
                    
                    <h2 className="font-headline-sm text-on-surface mt-lg">1. Informações que Coletamos</h2>
                    <p>O OperaBeauty ("nós", "nosso", "plataforma") coleta dados pessoais essenciais para a prestação de serviços de gestão para o seu salão. Isso inclui, mas não se limita a, informações de contato (nome, e-mail, telefone), dados de uso da plataforma e informações financeiras processadas através de gateways de pagamento terceirizados seguros.</p>
                    
                    <h2 className="font-headline-sm text-on-surface mt-lg">2. Como Usamos Seus Dados</h2>
                    <p>Utilizamos seus dados exclusivamente para operar, manter e melhorar nossos serviços. Isso inclui o gerenciamento de agendamentos, cálculo de comissões, envio de lembretes e faturamento da sua assinatura SaaS.</p>
                    
                    <h2 className="font-headline-sm text-on-surface mt-lg">3. Dados dos Seus Clientes (Titulares dos Dados)</h2>
                    <p>Como Gestor do salão, você atua como Controlador dos dados dos seus clientes finais. O OperaBeauty atua como Operador de dados, processando-os apenas sob sua orientação. Você é responsável por garantir que seus clientes estejam cientes da coleta e possuam as devidas autorizações (LGPD).</p>
                    
                    <h2 className="font-headline-sm text-on-surface mt-lg">4. Compartilhamento de Informações</h2>
                    <p>Não vendemos ou comercializamos seus dados pessoais ou os dados dos seus clientes com terceiros. O compartilhamento ocorre apenas com prestadores de serviços estritamente necessários (ex: servidores de hospedagem AWS/DigitalOcean, gateways de pagamento) sob rigorosos acordos de confidencialidade.</p>
                    
                    <h2 className="font-headline-sm text-on-surface mt-lg">5. Segurança dos Dados</h2>
                    <p>Empregamos medidas de segurança rígidas, incluindo criptografia em trânsito (HTTPS/TLS) e criptografia de senhas no banco de dados (pgcrypto), para proteger suas informações contra acesso, alteração ou destruição não autorizada.</p>
                    
                    <h2 className="font-headline-sm text-on-surface mt-lg">6. Seus Direitos</h2>
                    <p>De acordo com a Lei Geral de Proteção de Dados (LGPD), você tem o direito de solicitar acesso, correção, anonimização ou exclusão dos seus dados pessoais. Para exercer estes direitos, entre em contato através do e-mail privacidade@operabeauty.com.</p>
                </div>
            </main>
            
            <footer className="bg-surface-container-low py-lg border-t border-outline-variant/30 text-center">
                <p className="font-body-sm text-secondary">© 2026 OperaTech Systems. Todos os direitos reservados.</p>
            </footer>
        </div>
    );
}
