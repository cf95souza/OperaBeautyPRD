import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../lib/api'; // Precisamos usar o api.js do frontend para requisições se possível, ou fetch direto.

export default function LandingPage() {
    const [plans, setPlans] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [leadForm, setLeadForm] = useState({ name: '', email: '', phone: '', salon_name: '' });
    const [submitStatus, setSubmitStatus] = useState({ loading: false, success: false, error: null });

    useEffect(() => {
        // Smooth scroll implementation
        const anchors = document.querySelectorAll('a[href^="#"]');
        const handleScroll = function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) target.scrollIntoView({ behavior: 'smooth' });
        };
        anchors.forEach(anchor => anchor.addEventListener('click', handleScroll));

        // Header scroll effect
        const handleWindowScroll = () => {
            const header = document.querySelector('header');
            const innerDiv = header?.firstElementChild;
            if (!header || !innerDiv) return;
            if (window.scrollY > 50) {
                header.classList.add('shadow-md', 'bg-surface/95');
                header.classList.remove('bg-surface/80');
                innerDiv.classList.remove('h-20');
                innerDiv.classList.add('h-16');
            } else {
                header.classList.remove('shadow-md', 'bg-surface/95');
                header.classList.add('bg-surface/80');
                innerDiv.classList.remove('h-16');
                innerDiv.classList.add('h-20');
            }
        };
        window.addEventListener('scroll', handleWindowScroll);

        // Intersection Observer for fade-in animations
        const observerOptions = { threshold: 0.1 };
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('opacity-100', 'translate-y-0');
                    entry.target.classList.remove('opacity-0', 'translate-y-10');
                }
            });
        }, observerOptions);

        const elements = document.querySelectorAll('section > div');
        elements.forEach(el => {
            if (!el.classList.contains('no-anim')) {
                el.classList.add('transition-all', 'duration-1000', 'opacity-0', 'translate-y-10');
                observer.observe(el);
            }
        });

        return () => {
            anchors.forEach(anchor => anchor.removeEventListener('click', handleScroll));
            window.removeEventListener('scroll', handleWindowScroll);
            elements.forEach(el => observer.unobserve(el));
        };
    }, []);

    useEffect(() => {
        const fetchPlans = async () => {
            try {
                const data = await api.plans.list();
                if (data) setPlans(data);
            } catch (err) {
                console.error("Erro ao carregar planos:", err);
            }
        };
        fetchPlans();
    }, []);

    const handleLeadSubmit = async (e) => {
        e.preventDefault();
        setSubmitStatus({ loading: true, success: false, error: null });
        
        try {
            // Requisição direto para a API Express
            const response = await fetch('http://localhost:3001/api/leads', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(leadForm)
            });
            
            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Erro ao processar sua solicitação.');
            }
            
            setSubmitStatus({ loading: false, success: true, error: null });
            
            // Após 2 segundos de sucesso, redireciona para WhatsApp
            setTimeout(() => {
                setIsModalOpen(false);
                setSubmitStatus({ loading: false, success: false, error: null });
                window.open(`https://wa.me/5511922928343?text=Ol%C3%A1%2C%20me%20chamo%20${encodeURIComponent(leadForm.name)}%20e%20gostaria%20de%20come%C3%A7ar%20a%20usar%20o%20OperaBeauty%20no%20meu%20sal%C3%A3o.`, '_blank');
            }, 2000);
            
        } catch (error) {
            setSubmitStatus({ loading: false, success: false, error: error.message });
        }
    };

    return (
        <div className="bg-background text-on-surface font-body-md selection:bg-primary-container selection:text-on-primary-container">
            <style>{`
        .premium-shadow { box-shadow: 0px 4px 20px rgba(0,0,0,0.04); }
        .premium-shadow-lg { box-shadow: 0px 10px 30px rgba(0,0,0,0.08); }
        .glass-nav { backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); }
        .glass-modal { backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px); background: rgba(0, 0, 0, 0.5); }
      `}</style>

            {/*  Modal de Captura de Leads  */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center glass-modal p-4 animate-in fade-in duration-200">
                    <div className="bg-surface rounded-3xl w-[90%] max-w-[450px] p-6 md:p-8 premium-shadow-lg animate-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center mb-lg">
                            <h3 className="font-headline-md text-headline-md text-on-surface">Comece sua jornada</h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-secondary hover:text-primary">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>
                        
                        {submitStatus.success ? (
                            <div className="text-center py-xl space-y-md">
                                <span className="material-symbols-outlined text-6xl text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                                <h4 className="font-headline-sm text-headline-sm">Tudo Certo!</h4>
                                <p className="text-secondary">Redirecionando para falar com nosso consultor...</p>
                            </div>
                        ) : (
                            <form onSubmit={handleLeadSubmit} className="space-y-md">
                                <p className="text-secondary mb-md">Preencha seus dados para acessar os planos e falar com um especialista.</p>
                                
                                <div>
                                    <label className="block text-label-sm font-medium mb-1">Nome Completo <span className="text-error">*</span></label>
                                    <input required type="text" value={leadForm.name} onChange={(e) => setLeadForm({...leadForm, name: e.target.value})} className="w-full bg-surface-container border border-outline-variant rounded-xl px-4 py-3 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary" placeholder="Seu nome" />
                                </div>
                                
                                <div>
                                    <label className="block text-label-sm font-medium mb-1">E-mail <span className="text-error">*</span></label>
                                    <input required type="email" value={leadForm.email} onChange={(e) => setLeadForm({...leadForm, email: e.target.value})} className="w-full bg-surface-container border border-outline-variant rounded-xl px-4 py-3 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary" placeholder="seu@email.com" />
                                </div>
                                
                                <div>
                                    <label className="block text-label-sm font-medium mb-1">WhatsApp <span className="text-error">*</span></label>
                                    <input required type="tel" value={leadForm.phone} onChange={(e) => setLeadForm({...leadForm, phone: e.target.value})} className="w-full bg-surface-container border border-outline-variant rounded-xl px-4 py-3 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary" placeholder="(11) 90000-0000" />
                                </div>
                                
                                <div>
                                    <label className="block text-label-sm font-medium mb-1">Nome do Salão (Opcional)</label>
                                    <input type="text" value={leadForm.salon_name} onChange={(e) => setLeadForm({...leadForm, salon_name: e.target.value})} className="w-full bg-surface-container border border-outline-variant rounded-xl px-4 py-3 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary" placeholder="Studio Beauty" />
                                </div>

                                {submitStatus.error && (
                                    <p className="text-error text-label-sm">{submitStatus.error}</p>
                                )}
                                
                                <button type="submit" disabled={submitStatus.loading} className="w-full bg-primary text-on-primary py-4 rounded-xl font-label-lg mt-md hover:opacity-90 disabled:opacity-50 transition-opacity flex justify-center items-center gap-2">
                                    {submitStatus.loading ? <span className="material-symbols-outlined animate-spin">refresh</span> : 'Continuar'}
                                </button>
                            </form>
                        )}
                    </div>
                </div>
            )}

            {/*  Top Navigation Bar  */}
            <header className="fixed top-0 w-full z-50 bg-surface/80 glass-nav shadow-sm transition-all duration-300">
                <div className="max-w-7xl mx-auto px-container-margin flex justify-between items-center h-20">
                    <div className="flex items-center">
                        <span className="font-headline-md text-headline-md font-bold tracking-tight text-primary">OperaBeauty</span>
                    </div>
                    <nav className="hidden md:flex items-center space-x-lg">
                        <a className="font-body-md text-label-md text-secondary hover:text-primary transition-colors duration-200" href="#features">Recursos</a>
                        <a className="font-body-md text-label-md text-secondary hover:text-primary transition-colors duration-200" href="#testimonials">Depoimentos</a>
                        <a className="font-body-md text-label-md text-secondary hover:text-primary transition-colors duration-200" href="#pricing">Planos</a>
                    </nav>
                    <div className="flex items-center gap-sm">
                        <Link to="/superadmin/login" className="font-label-md text-label-md text-secondary hover:text-primary transition-colors px-md hidden md:block">Área Restrita</Link>
                        <button onClick={() => setIsModalOpen(true)} className="bg-primary text-on-primary font-label-md text-label-md px-lg py-sm rounded-full hover:opacity-80 transition-opacity inline-block">Começar</button>
                    </div>
                </div>
            </header>
            
            <main className="pt-20">
                {/*  Hero Section (Mais Agressiva)  */}
                <section className="relative overflow-hidden bg-background py-xl md:py-32">
                    <div className="max-w-7xl mx-auto px-container-margin grid grid-cols-1 md:grid-cols-2 gap-xl items-center">
                        <div className="space-y-lg z-10">
                            <span className="inline-block px-md py-xs bg-error/10 text-error rounded-full text-label-sm font-semibold tracking-wider">CHEGA DE AGENDAS NO PAPEL</span>
                            <h1 className="font-display-lg text-display-lg text-on-surface leading-tight">Lotando a agenda do seu salão sem perder o controle.</h1>
                            <p className="font-body-lg text-body-lg text-secondary w-full md:max-w-[90%]">Diga adeus aos furos de horário e faturamentos perdidos. O OperaBeauty automatiza seus agendamentos, calcula comissões instantaneamente e retém clientes para você.</p>
                            <div className="flex flex-wrap gap-md pt-md">
                                <button onClick={() => setIsModalOpen(true)} className="bg-primary text-on-primary px-xl py-md rounded-xl font-label-lg text-label-lg premium-shadow hover:-translate-y-1 transition-all duration-300 inline-block">Criar minha Conta</button>
                            </div>
                            <p className="text-label-sm text-secondary flex items-center gap-2">
                                <span className="material-symbols-outlined text-sm">verified</span> Teste 14 dias grátis. Cancelamento fácil.
                            </p>
                        </div>
                        <div className="relative mt-xl md:mt-0">
                            <div className="absolute -top-10 -right-10 w-64 h-64 bg-primary-container/20 blur-3xl rounded-full"></div>
                            <div className="bg-surface-container-low p-base rounded-3xl premium-shadow-lg rotate-3 hover:rotate-0 transition-transform duration-700 overflow-hidden">
                                <img className="w-full h-auto rounded-2xl" data-alt="A professional high-fidelity software dashboard interface mockup displayed on a sleek, silver laptop screen. The UI features a soft rose and deep charcoal color palette, minimalist charts, and elegant typography. The laptop is placed on a clean white marble surface with a soft-focus spa background with a green plant leaf. Natural morning sunlight creates soft shadows and a premium, tranquil mood." src="https://lh3.googleusercontent.com/aida-public/AB6AXuBd0G3KdYCei2MD6wJjFSIycAbDX9XW_OtYN1ahgdqO-W07l7BqUzCipbMCK7ASw9nva0QjY6LsXSKidFKchEbRqcwySHA5og1F_mr442k9rQ3UUbZZaWbqQEjZjw0VTx72JwsalFW3ysOzcX1U6X8va-IW0pHe6v_qf0Cy0Eb21fMXed64lslugPvP0qkmSVTaRv8izoVXKoSFrGj4wIUX20oSOIeiybE7OtX0MkZ0YrJwWVjAafZF29QBku3a_lnDkGwhrqbOqvz8" />
                            </div>
                        </div>
                    </div>
                </section>
                
                {/*  Social Proof/Stats  */}
                <section className="bg-surface-container py-lg border-y border-outline-variant/20">
                    <div className="max-w-7xl mx-auto px-container-margin">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-lg text-center divide-y md:divide-y-0 md:divide-x divide-outline-variant/30">
                            <div className="py-md md:py-0">
                                <div className="font-headline-lg text-headline-lg text-primary">+200</div>
                                <div className="text-label-md text-secondary uppercase tracking-widest mt-1">Salões Parceiros</div>
                            </div>
                            <div className="py-md md:py-0">
                                <div className="font-headline-lg text-headline-lg text-primary">+10k</div>
                                <div className="text-label-md text-secondary uppercase tracking-widest mt-1">Agendamentos Mensais</div>
                            </div>
                            <div className="py-md md:py-0">
                                <div className="font-headline-lg text-headline-lg text-primary">4.9/5</div>
                                <div className="text-label-md text-secondary uppercase tracking-widest mt-1">Satisfação Geral</div>
                            </div>
                        </div>
                    </div>
                </section>
                
                {/*  Features Grid  */}
                <section className="py-32 bg-background" id="features">
                    <div className="max-w-7xl mx-auto px-container-margin">
                        <div className="text-center mb-20">
                            <h2 className="font-headline-lg text-headline-lg text-on-surface mb-md">Gestão sem esforço, Resultados Excepcionais</h2>
                            <p className="font-body-md text-body-md text-secondary max-w-2xl mx-auto">Nossas ferramentas foram desenhadas para simplificar a complexidade, permitindo um controle total com apenas alguns cliques.</p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-xl">
                            {/*  Feature 1  */}
                            <div className="bg-surface p-xl rounded-2xl premium-shadow group hover:bg-primary-container/10 transition-colors duration-300 border border-transparent hover:border-primary/20">
                                <div className="w-16 h-16 bg-primary-container text-on-primary-container rounded-xl flex items-center justify-center mb-lg group-hover:scale-110 transition-transform">
                                    <span className="material-symbols-outlined text-3xl">calendar_month</span>
                                </div>
                                <h3 className="font-headline-md text-headline-md mb-md">Agenda Inteligente</h3>
                                <p className="font-body-md text-secondary">Reduza as faltas a zero com lembretes automáticos e uma visão completa de quem senta na sua cadeira hoje.</p>
                            </div>
                            {/*  Feature 2  */}
                            <div className="bg-surface p-xl rounded-2xl premium-shadow group hover:bg-primary-container/10 transition-colors duration-300 border border-transparent hover:border-primary/20">
                                <div className="w-16 h-16 bg-primary-container text-on-primary-container rounded-xl flex items-center justify-center mb-lg group-hover:scale-110 transition-transform">
                                    <span className="material-symbols-outlined text-3xl">payments</span>
                                </div>
                                <h3 className="font-headline-md text-headline-md mb-md">Comissionamento Automático</h3>
                                <p className="font-body-md text-secondary">Fim das brigas no fechamento do mês. O sistema calcula a comissão de cada profissional no momento exato do serviço.</p>
                            </div>
                            {/*  Feature 3  */}
                            <div className="bg-surface p-xl rounded-2xl premium-shadow group hover:bg-primary-container/10 transition-colors duration-300 border border-transparent hover:border-primary/20">
                                <div className="w-16 h-16 bg-primary-container text-on-primary-container rounded-xl flex items-center justify-center mb-lg group-hover:scale-110 transition-transform">
                                    <span className="material-symbols-outlined text-3xl">inventory_2</span>
                                </div>
                                <h3 className="font-headline-md text-headline-md mb-md">Estoque Blindado</h3>
                                <p className="font-body-md text-secondary">Saiba exatamente quanto de produto foi gasto. A baixa ocorre automaticamente na conclusão dos procedimentos.</p>
                            </div>
                        </div>
                    </div>
                </section>
                
                {/* Testimonials (NOVA SEÇÃO DE PROVA SOCIAL) */}
                <section className="py-32 bg-surface-container-low border-y border-outline-variant/30" id="testimonials">
                     <div className="max-w-7xl mx-auto px-container-margin">
                        <div className="text-center mb-20">
                            <h2 className="font-headline-lg text-headline-lg text-on-surface">O que os donos de salão dizem</h2>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-lg">
                            <div className="bg-surface p-xl rounded-2xl premium-shadow border border-outline-variant/30 relative">
                                <span className="material-symbols-outlined absolute top-6 right-6 text-primary/20 text-5xl">format_quote</span>
                                <div className="flex text-primary mb-4">
                                    {[...Array(5)].map((_, i) => <span key={i} className="material-symbols-outlined" style={{fontVariationSettings: "'FILL' 1"}}>star</span>)}
                                </div>
                                <p className="font-body-md text-secondary mb-lg italic">"A gente perdia muito tempo calculando comissão de 12 profissionais no fim do mês. Com o OperaBeauty, tá tudo na tela. Salvou nossa operação."</p>
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-primary-container text-on-primary-container rounded-full flex items-center justify-center font-bold">ML</div>
                                    <div>
                                        <h4 className="font-label-md font-bold text-on-surface">Mariana Lima</h4>
                                        <p className="text-label-sm text-secondary">Studio Belle, SP</p>
                                    </div>
                                </div>
                            </div>
                            <div className="bg-surface p-xl rounded-2xl premium-shadow border border-outline-variant/30 relative">
                                <span className="material-symbols-outlined absolute top-6 right-6 text-primary/20 text-5xl">format_quote</span>
                                <div className="flex text-primary mb-4">
                                    {[...Array(5)].map((_, i) => <span key={i} className="material-symbols-outlined" style={{fontVariationSettings: "'FILL' 1"}}>star</span>)}
                                </div>
                                <p className="font-body-md text-secondary mb-lg italic">"O controle de estoque automático é surreal. Nunca mais tivemos que fechar a agenda de química porque o descolorante tinha acabado."</p>
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-primary-container text-on-primary-container rounded-full flex items-center justify-center font-bold">RT</div>
                                    <div>
                                        <h4 className="font-label-md font-bold text-on-surface">Roberto Teixeira</h4>
                                        <p className="text-label-sm text-secondary">Espaço RT, RJ</p>
                                    </div>
                                </div>
                            </div>
                            <div className="bg-surface p-xl rounded-2xl premium-shadow border border-outline-variant/30 relative">
                                <span className="material-symbols-outlined absolute top-6 right-6 text-primary/20 text-5xl">format_quote</span>
                                <div className="flex text-primary mb-4">
                                    {[...Array(5)].map((_, i) => <span key={i} className="material-symbols-outlined" style={{fontVariationSettings: "'FILL' 1"}}>star</span>)}
                                </div>
                                <p className="font-body-md text-secondary mb-lg italic">"Interface maravilhosa! Bem superior aos sistemas engessados e feios que usávamos antes. A adaptação da minha equipe foi em um dia."</p>
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-primary-container text-on-primary-container rounded-full flex items-center justify-center font-bold">CF</div>
                                    <div>
                                        <h4 className="font-label-md font-bold text-on-surface">Carla Fonseca</h4>
                                        <p className="text-label-sm text-secondary">Concept Hair, MG</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                     </div>
                </section>

                {/*  Pricing Table  */}
                <section className="py-32 bg-background" id="pricing">
                    <div className="max-w-7xl mx-auto px-container-margin">
                        <div className="text-center mb-20">
                            <h2 className="font-headline-lg text-headline-lg text-on-surface">Invista no crescimento do seu salão</h2>
                            <p className="font-body-md text-body-md text-secondary">Pague menos que o valor de um corte por mês e ganhe controle total.</p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-lg">
                            {plans.map((plan, index) => {
                                const isFeatured = index === 1; // Destaca o plano do meio
                                return (
                                    <div key={plan.id} className={isFeatured
                                        ? "bg-on-background p-xl rounded-3xl premium-shadow-lg border-2 border-primary-container flex flex-col h-full transform md:-translate-y-4 relative"
                                        : "bg-surface p-xl rounded-3xl premium-shadow border border-outline-variant/30 flex flex-col h-full"
                                    }>
                                        {isFeatured && (
                                            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-primary-container text-on-primary-container px-lg py-1 rounded-full text-label-sm font-bold">
                                                MAIS POPULAR
                                            </div>
                                        )}
                                        <div className="mb-lg">
                                            <h3 className={`font-headline-md text-headline-md mb-2 ${isFeatured ? 'text-on-primary' : 'text-on-surface'}`}>{plan.name}</h3>
                                            <div className="flex items-baseline gap-1">
                                                <span className={`text-label-md ${isFeatured ? 'text-surface-variant' : 'text-secondary'}`}>R$</span>
                                                <span className={`text-4xl font-bold ${isFeatured ? 'text-on-primary' : 'text-on-surface'}`}>{Number(plan.price).toFixed(2).replace('.', ',')}</span>
                                                <span className={`text-label-sm ${isFeatured ? 'text-surface-variant' : 'text-secondary'}`}>/{plan.interval === 'month' ? 'mês' : 'ano'}</span>
                                            </div>
                                        </div>
                                        <ul className="space-y-md flex-grow mb-xl">
                                            {plan.features && plan.features.map((feature, i) => (
                                                <li key={i} className={`flex items-center gap-2 text-label-md ${isFeatured ? 'text-surface-variant' : 'text-secondary'}`}>
                                                    <span className={`material-symbols-outlined scale-75 ${isFeatured ? 'text-primary-container' : 'text-primary'}`} style={{ fontVariationSettings: isFeatured ? "'FILL' 1" : undefined }}>
                                                        {isFeatured ? 'check_circle' : 'done'}
                                                    </span>
                                                    {feature}
                                                </li>
                                            ))}
                                        </ul>
                                        <button onClick={() => setIsModalOpen(true)} className={`w-full py-md rounded-xl font-label-md transition-colors ${isFeatured
                                            ? 'bg-primary text-on-primary hover:opacity-90 transition-opacity'
                                            : 'border border-primary text-primary hover:bg-primary/5'
                                            }`}>
                                            Assinar Plano
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </section>
                
                {/* FAQ (NOVA SEÇÃO) */}
                <section className="py-32 bg-surface-container-low border-t border-outline-variant/30">
                    <div className="max-w-3xl mx-auto px-container-margin">
                        <div className="text-center mb-16">
                            <h2 className="font-headline-lg text-headline-lg text-on-surface">Perguntas Frequentes</h2>
                        </div>
                        <div className="space-y-4">
                            <div className="bg-surface p-lg rounded-2xl border border-outline-variant/30">
                                <h4 className="font-headline-sm font-bold text-on-surface mb-2">Eu preciso instalar algum aplicativo?</h4>
                                <p className="text-secondary font-body-md">Não! O OperaBeauty é 100% na nuvem. Você pode acessar de qualquer navegador no computador, tablet ou celular, em qualquer lugar do mundo.</p>
                            </div>
                            <div className="bg-surface p-lg rounded-2xl border border-outline-variant/30">
                                <h4 className="font-headline-sm font-bold text-on-surface mb-2">Posso cancelar minha assinatura a qualquer momento?</h4>
                                <p className="text-secondary font-body-md">Sim. Não temos fidelidade ou multas de rescisão. Você pode cancelar a qualquer hora diretamente pelo painel do gestor.</p>
                            </div>
                            <div className="bg-surface p-lg rounded-2xl border border-outline-variant/30">
                                <h4 className="font-headline-sm font-bold text-on-surface mb-2">Meus profissionais terão acesso a tudo?</h4>
                                <p className="text-secondary font-body-md">Não, nós garantimos que profissionais só tenham acesso à sua própria agenda e seus próprios relatórios. Apenas o perfil 'Gestor' vê o financeiro global do salão.</p>
                            </div>
                        </div>
                    </div>
                </section>

                {/*  Final CTA  */}
                <section className="py-32 bg-primary-container/20">
                    <div className="max-w-4xl mx-auto px-container-margin text-center space-y-lg">
                        <h2 className="font-headline-lg text-headline-lg text-on-surface">Eleve o nível do seu salão hoje mesmo</h2>
                        <p className="font-body-lg text-body-lg text-on-primary-container max-w-2xl mx-auto">Não perca mais tempo brigando com planilhas e agendas confusas. O primeiro mês é por nossa conta.</p>
                        <div className="pt-md">
                            <button onClick={() => setIsModalOpen(true)} className="bg-primary text-on-primary px-xl py-lg rounded-2xl font-label-md text-body-lg premium-shadow-lg hover:-translate-y-1 transition-all duration-300 inline-block">Começar Teste Grátis</button>
                        </div>
                        <p className="text-label-sm text-secondary">Sem fidelidade e suporte humanizado via WhatsApp.</p>
                    </div>
                </section>
            </main>
            
            {/*  Footer Refatorado  */}
            <footer className="bg-surface-container-low py-xl border-t border-outline-variant/30">
                <div className="max-w-7xl mx-auto px-container-margin grid grid-cols-1 md:grid-cols-4 gap-lg">
                    <div className="space-y-md col-span-1 md:col-span-1">
                        <span className="font-headline-md text-headline-md text-primary">OperaBeauty</span>
                        <p className="font-body-md text-body-md text-on-surface-variant">Sistemas de gestão premium para o mercado de beleza de alto padrão.</p>
                        <div className="flex gap-md">
                            <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className="material-symbols-outlined text-secondary hover:text-primary cursor-pointer transition-colors">camera_alt</a>
                            <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" className="material-symbols-outlined text-secondary hover:text-primary cursor-pointer transition-colors">thumb_up</a>
                            <a href="https://wa.me/5511922928343" target="_blank" rel="noopener noreferrer" className="material-symbols-outlined text-secondary hover:text-primary cursor-pointer transition-colors">chat</a>
                        </div>
                    </div>
                    <div>
                        <h4 className="font-label-md text-label-md text-on-surface mb-lg">Soluções</h4>
                        <ul className="space-y-sm">
                            <li><a className="font-body-md text-body-md text-on-secondary-container hover:text-primary transition-colors" href="#features">Recursos</a></li>
                            <li><a className="font-body-md text-body-md text-on-secondary-container hover:text-primary transition-colors" href="#pricing">Planos</a></li>
                        </ul>
                    </div>
                    <div>
                        <h4 className="font-label-md text-label-md text-on-surface mb-lg">Empresa</h4>
                        <ul className="space-y-sm">
                            <li><a className="font-body-md text-body-md text-on-secondary-container hover:text-primary transition-colors" href="#testimonials">Sobre Nós (Depoimentos)</a></li>
                            <li><button onClick={() => setIsModalOpen(true)} className="font-body-md text-body-md text-on-secondary-container hover:text-primary transition-colors cursor-pointer">Contato Comercial</button></li>
                        </ul>
                    </div>
                    <div>
                        <h4 className="font-label-md text-label-md text-on-surface mb-lg">Suporte</h4>
                        <ul className="space-y-sm">
                            <li><Link className="font-body-md text-body-md text-on-secondary-container hover:text-primary transition-colors" to="/privacidade">Política de Privacidade</Link></li>
                            <li><Link className="font-body-md text-body-md text-on-secondary-container hover:text-primary transition-colors" to="/termos">Termos de Serviço</Link></li>
                        </ul>
                    </div>
                </div>
                <div className="max-w-7xl mx-auto px-container-margin mt-xl pt-lg border-t border-outline-variant/20 flex flex-col md:flex-row justify-between items-center gap-md">
                    <p className="font-body-md text-body-md text-on-surface-variant">© 2026 OperaTech Systems. Todos os direitos reservados.</p>
                    <p className="font-body-md text-body-md text-on-surface-variant">Feito com elegância.</p>
                </div>
            </footer>
        </div>
    );
}
