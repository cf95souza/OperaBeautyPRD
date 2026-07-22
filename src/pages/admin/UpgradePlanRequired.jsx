import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';

const UpgradePlanRequired = () => {
  const navigate = useNavigate();
  const { tenant_slug } = useParams();

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-gutter md:p-xl text-center max-w-[550px] mx-auto w-full min-h-[60vh] animate-fade-in-up">
      <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center text-primary mb-lg relative">
        <span className="material-symbols-outlined text-[40px]" style={{ fontVariationSettings: "'FILL' 1" }}>workspace_premium</span>
        <div className="absolute -top-1 -right-1 w-5 h-5 bg-error text-on-error rounded-full flex items-center justify-center">
          <span className="material-symbols-outlined text-[12px] font-bold">lock</span>
        </div>
      </div>

      <h2 className="font-headline-lg text-on-background mb-base">Recurso Premium Bloqueado</h2>
      
      <p className="font-body-md text-secondary mb-xl">
        Esta funcionalidade não está disponível no plano de assinatura atual do seu estabelecimento. 
        Para obter acesso ao Clube de Assinaturas, Controle de PDV e outros recursos premium, faça o upgrade do seu plano SaaS.
      </p>

      <div className="flex flex-col sm:flex-row gap-md w-full justify-center">
        <button
          onClick={() => navigate(-1)}
          className="px-6 py-3 rounded-full border border-outline hover:bg-surface-variant text-secondary font-label-md text-sm transition-all"
        >
          Voltar
        </button>
        <button
          onClick={() => navigate(`/${tenant_slug}/staff/admin/assinatura`)}
          className="px-6 py-3 rounded-full bg-primary text-on-primary font-label-md text-sm hover:opacity-90 shadow-md transition-all flex items-center justify-center gap-2"
        >
          <span className="material-symbols-outlined text-[18px]">upgrade</span> Ver Planos SaaS
        </button>
      </div>
    </div>
  );
};

export default UpgradePlanRequired;
