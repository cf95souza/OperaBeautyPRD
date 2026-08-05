import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTenant } from '../context/TenantContext';
import { api } from '../lib/api';
import { useNotification } from '../context/NotificationProvider';
import ClienteBottomNavBar from '../components/ClienteBottomNavBar';

const ClienteAnamnese = () => {
  const { tenant_slug } = useParams();
  const navigate = useNavigate();
  const { tenant } = useTenant();
  const { showSuccess, showError } = useNotification();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [template, setTemplate] = useState([]);
  const [answers, setAnswers] = useState({});
  const [lastUpdate, setLastUpdate] = useState(null);

  useEffect(() => {
    if (tenant?.id) {
      fetchData();
    }
  }, [tenant]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('operabeauty_token');
      const session = JSON.parse(localStorage.getItem('operabeauty_user') || '{}');
      
      // Busca o template
      const resTmpl = await fetch(`${import.meta.env.VITE_API_URL}/api/anamnesis/template/${tenant.id}`);
      if (!resTmpl.ok) throw new Error('Falha ao buscar template');
      const tmplData = await resTmpl.json();
      setTemplate(tmplData.fields_schema || []);

      // Busca as respostas do cliente logado
      if (session?.id) {
        const resAns = await fetch(`${import.meta.env.VITE_API_URL}/api/anamnesis/client/${session.id}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (resAns.ok) {
          const ansData = await resAns.json();
          if (ansData) {
            setAnswers(ansData.answers || {});
            setLastUpdate(ansData.updated_at);
          }
        }
      }
    } catch (err) {
      console.error(err);
      showError('Erro ao carregar Ficha de Anamnese.');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (fieldId, value) => {
    setAnswers(prev => ({ ...prev, [fieldId]: value }));
  };

  const handleCheckboxChange = (fieldId, option, checked) => {
    setAnswers(prev => {
      const current = Array.isArray(prev[fieldId]) ? prev[fieldId] : [];
      if (checked) {
        return { ...prev, [fieldId]: [...current, option] };
      } else {
        return { ...prev, [fieldId]: current.filter(o => o !== option) };
      }
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      const token = localStorage.getItem('operabeauty_token');
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/anamnesis/client`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ answers })
      });
      if (!res.ok) throw new Error('Falha ao salvar respostas');
      
      const data = await res.json();
      setLastUpdate(data.updated_at);
      showSuccess('Ficha atualizada com sucesso! Válida por mais 4 meses.');
      setTimeout(() => navigate(`/${tenant_slug}/perfil`), 2000);
    } catch (err) {
      console.error(err);
      showError('Erro ao salvar formulário.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-background">
        <span className="material-symbols-outlined animate-spin text-primary text-4xl">progress_activity</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-32">
      {/* Header */}
      <div className="bg-surface pt-[max(env(safe-area-inset-top),_1.5rem)] pb-4 px-container-margin sticky top-0 z-10 shadow-sm border-b border-surface-variant">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-full hover:bg-surface-variant text-on-surface transition-colors">
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <h1 className="font-headline-sm text-on-surface">Ficha de Anamnese</h1>
          <div className="w-10"></div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto py-lg px-container-margin md:px-0">
        
        {lastUpdate && (
          <div className="bg-primary-container/20 border border-primary/30 p-md rounded-2xl mb-lg flex items-center gap-4">
            <span className="material-symbols-outlined text-primary text-3xl">verified</span>
            <div>
              <h2 className="font-label-lg text-on-surface">Ficha atualizada em:</h2>
              <p className="font-body-md text-secondary">
                {new Date(lastUpdate).toLocaleString('pt-BR')}
              </p>
            </div>
          </div>
        )}

        {template.length === 0 ? (
          <div className="text-center py-xl text-secondary">
            <p className="font-body-lg">Este salão não configurou uma ficha de anamnese.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-lg">
            {template.map(field => (
              <div key={field.id} className="bg-surface-container-lowest border border-outline-variant p-lg rounded-2xl shadow-sm">
                <label className="block font-label-lg text-on-surface mb-4">
                  {field.label} {field.required && <span className="text-error">*</span>}
                </label>
                
                {field.type === 'text' && (
                  <input
                    type="text"
                    required={field.required}
                    value={answers[field.id] || ''}
                    onChange={(e) => handleInputChange(field.id, e.target.value)}
                    className="w-full bg-surface border border-outline-variant rounded-xl p-4 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                  />
                )}

                {field.type === 'textarea' && (
                  <textarea
                    required={field.required}
                    rows="3"
                    value={answers[field.id] || ''}
                    onChange={(e) => handleInputChange(field.id, e.target.value)}
                    className="w-full bg-surface border border-outline-variant rounded-xl p-4 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                  />
                )}

                {field.type === 'radio' && (
                  <div className="space-y-3">
                    {field.options?.map(opt => (
                      <label key={opt} className="flex items-center gap-3 p-3 border border-outline-variant rounded-xl hover:bg-surface-variant/30 cursor-pointer transition-colors">
                        <input
                          type="radio"
                          name={field.id}
                          required={field.required}
                          checked={answers[field.id] === opt}
                          onChange={() => handleInputChange(field.id, opt)}
                          className="w-5 h-5 text-primary focus:ring-primary border-outline-variant"
                        />
                        <span className="font-body-md text-on-surface">{opt}</span>
                      </label>
                    ))}
                  </div>
                )}

                {field.type === 'select' && (
                  <select
                    required={field.required}
                    value={answers[field.id] || ''}
                    onChange={(e) => handleInputChange(field.id, e.target.value)}
                    className="w-full bg-surface border border-outline-variant rounded-xl p-4 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                  >
                    <option value="">Selecione...</option>
                    {field.options?.map(opt => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                )}

                {field.type === 'checkbox' && (
                  <div className="space-y-3">
                    {field.options?.map(opt => {
                      const isChecked = Array.isArray(answers[field.id]) && answers[field.id].includes(opt);
                      return (
                        <label key={opt} className="flex items-center gap-3 p-3 border border-outline-variant rounded-xl hover:bg-surface-variant/30 cursor-pointer transition-colors">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => handleCheckboxChange(field.id, opt, e.target.checked)}
                            className="w-5 h-5 text-primary focus:ring-primary rounded border-outline-variant"
                          />
                          <span className="font-body-md text-on-surface">{opt}</span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}

            <button
              type="submit"
              disabled={saving}
              className="w-full bg-primary text-on-primary py-4 rounded-xl font-label-lg flex justify-center items-center gap-2 mt-xl active:scale-95 transition-transform disabled:opacity-50"
            >
              <span className="material-symbols-outlined">save</span>
              {saving ? 'Salvando...' : 'Salvar Ficha de Anamnese'}
            </button>
          </form>
        )}
      </div>

      <ClienteBottomNavBar />
    </div>
  );
};

export default ClienteAnamnese;
