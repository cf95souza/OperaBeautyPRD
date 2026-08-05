import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useTenant } from '../../context/TenantContext';
import { api } from '../../lib/api';
import { useNotification } from '../../context/NotificationProvider';

// We'll create a new API method in lib/api.js, but for now we can use the fetch standard or add to api.js later.
// Let's assume we will add api.anamnesis.getTemplate() and api.anamnesis.updateTemplate().

const AnamneseTemplate = () => {
  const { tenant_slug } = useParams();
  const { tenant, session } = useTenant();
  const { showSuccess, showError } = useNotification();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [fields, setFields] = useState([]);

  useEffect(() => {
    if (tenant?.id) {
      fetchTemplate();
    }
  }, [tenant]);

  const fetchTemplate = async () => {
    try {
      setLoading(true);
      // Directly call API for now
      const token = localStorage.getItem('operabeauty_token');
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/anamnesis/template/${tenant.id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Falha ao buscar template');
      const data = await res.json();
      setFields(data.fields_schema || []);
    } catch (err) {
      console.error(err);
      showError('Não foi possível carregar a Ficha de Anamnese.');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const token = localStorage.getItem('operabeauty_token');
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/anamnesis/template`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ fields_schema: fields })
      });
      if (!res.ok) throw new Error('Falha ao salvar template');
      showSuccess('Ficha de Anamnese atualizada com sucesso!');
    } catch (err) {
      console.error(err);
      showError('Erro ao salvar as alterações.');
    } finally {
      setSaving(false);
    }
  };

  const addField = () => {
    setFields([
      ...fields, 
      { 
        id: `field_${Date.now()}`, 
        label: 'Nova Pergunta', 
        type: 'text', 
        required: false, 
        options: [] 
      }
    ]);
  };

  const updateField = (index, updates) => {
    const updated = [...fields];
    updated[index] = { ...updated[index], ...updates };
    setFields(updated);
  };

  const removeField = (index) => {
    const updated = [...fields];
    updated.splice(index, 1);
    setFields(updated);
  };

  const addOption = (index) => {
    const updated = [...fields];
    updated[index].options.push('Nova Opção');
    setFields(updated);
  };

  const updateOption = (fieldIndex, optIndex, value) => {
    const updated = [...fields];
    updated[fieldIndex].options[optIndex] = value;
    setFields(updated);
  };

  const removeOption = (fieldIndex, optIndex) => {
    const updated = [...fields];
    updated[fieldIndex].options.splice(optIndex, 1);
    setFields(updated);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[50vh]">
        <span className="material-symbols-outlined animate-spin text-primary text-4xl">progress_activity</span>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-lg px-container-margin md:px-0 animate-fade-in-up">
      <div className="flex justify-between items-center mb-xl">
        <div>
          <h1 className="font-headline-md text-headline-md text-primary">Ficha de Anamnese</h1>
          <p className="font-body-md text-body-md text-secondary">Crie e personalize as perguntas que seus clientes devem responder.</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="bg-primary text-on-primary px-6 py-3 rounded-xl font-label-lg flex items-center gap-2 hover:opacity-90 disabled:opacity-50 transition-opacity"
        >
          <span className="material-symbols-outlined">save</span>
          {saving ? 'Salvando...' : 'Salvar Ficha'}
        </button>
      </div>

      <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-xl shadow-sm mb-lg">
        {fields.length === 0 ? (
          <div className="text-center py-xl text-secondary">
            <span className="material-symbols-outlined text-5xl mb-4">description</span>
            <p className="font-body-lg">Sua ficha de anamnese está vazia.</p>
            <p className="font-body-sm mt-2 mb-6">Adicione perguntas para que seus clientes possam preencher via aplicativo.</p>
          </div>
        ) : (
          <div className="space-y-lg mb-xl">
            {fields.map((field, i) => (
              <div key={field.id} className="bg-surface-container border border-outline-variant p-md rounded-xl relative group">
                <button 
                  onClick={() => removeField(i)}
                  className="absolute top-4 right-4 text-error opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Remover Pergunta"
                >
                  <span className="material-symbols-outlined">delete</span>
                </button>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-md mb-4 pr-10">
                  <div>
                    <label className="block font-label-sm text-secondary mb-1">Pergunta</label>
                    <input 
                      type="text" 
                      value={field.label}
                      onChange={(e) => updateField(i, { label: e.target.value })}
                      className="w-full bg-surface border border-outline-variant rounded-lg p-3 font-body-md focus:outline-none focus:border-primary"
                    />
                  </div>
                  <div className="flex gap-4">
                    <div className="flex-1">
                      <label className="block font-label-sm text-secondary mb-1">Tipo de Resposta</label>
                      <select
                        value={field.type}
                        onChange={(e) => updateField(i, { type: e.target.value })}
                        className="w-full bg-surface border border-outline-variant rounded-lg p-3 font-body-md focus:outline-none focus:border-primary"
                      >
                        <option value="text">Texto Curto</option>
                        <option value="textarea">Texto Longo</option>
                        <option value="radio">Seleção Única (Radio)</option>
                        <option value="select">Seleção em Lista (Dropdown)</option>
                        <option value="checkbox">Múltipla Escolha (Checkboxes)</option>
                      </select>
                    </div>
                    <div className="flex items-center pt-6">
                      <label className="flex items-center gap-2 cursor-pointer font-label-md">
                        <input 
                          type="checkbox" 
                          checked={field.required}
                          onChange={(e) => updateField(i, { required: e.target.checked })}
                          className="w-5 h-5 rounded text-primary focus:ring-primary"
                        />
                        Obrigatório
                      </label>
                    </div>
                  </div>
                </div>

                {['radio', 'checkbox', 'select'].includes(field.type) && (
                  <div className="bg-surface-variant/30 p-md rounded-lg mt-4">
                    <p className="font-label-sm text-secondary mb-3">Opções de Resposta:</p>
                    <div className="space-y-2 mb-4">
                      {field.options?.map((opt, optIdx) => (
                        <div key={optIdx} className="flex gap-2">
                          <input 
                            type="text"
                            value={opt}
                            onChange={(e) => updateOption(i, optIdx, e.target.value)}
                            className="flex-1 bg-surface border border-outline-variant rounded-lg p-2 text-sm focus:outline-none focus:border-primary"
                          />
                          <button onClick={() => removeOption(i, optIdx)} className="text-error px-2 hover:bg-error/10 rounded-lg">
                            <span className="material-symbols-outlined text-lg">close</span>
                          </button>
                        </div>
                      ))}
                    </div>
                    <button 
                      onClick={() => addOption(i)}
                      className="text-primary font-label-sm flex items-center gap-1 hover:underline"
                    >
                      <span className="material-symbols-outlined text-sm">add</span>
                      Adicionar Opção
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <button 
          onClick={addField}
          className="w-full border-2 border-dashed border-primary text-primary py-4 rounded-xl font-label-lg flex items-center justify-center gap-2 hover:bg-primary-container/20 transition-colors"
        >
          <span className="material-symbols-outlined">add_circle</span>
          Adicionar Nova Pergunta
        </button>
      </div>
    </div>
  );
};

export default AnamneseTemplate;
