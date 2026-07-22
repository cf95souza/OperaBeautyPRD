import React, { useState, useEffect } from 'react';
import { useTenant } from '../../context/TenantContext';
import { api } from '../../lib/api';
import { useNotification } from '../../context/NotificationProvider';

const LookbookAdmin = () => {
  const { tenant } = useTenant();
  const { showSuccess, showError, confirm } = useNotification();
  const [lookbooks, setLookbooks] = useState([]);
  const [services, setServices] = useState([]);
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    image_url: '',
    title: '',
    description: '',
    service_id: '',
    staff_id: ''
  });

  useEffect(() => {
    if (tenant?.id) {
      fetchData();
    }
  }, [tenant]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [lookData, servData, staffData] = await Promise.all([
        api.lookbook.list(tenant.id),
        api.services.list(tenant.id),
        api.staff.list(tenant.id)
      ]);
      setLookbooks(lookData || []);
      setServices(servData || []);
      setStaff(staffData || []);
    } catch (err) {
      console.error(err);
      showError("Erro ao carregar dados do lookbook.");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (await confirm("Tem certeza que deseja remover esta foto do lookbook?")) {
      try {
        await api.lookbook.delete(id);
        showSuccess("Removido com sucesso!");
        fetchData();
      } catch (err) {
        showError("Erro ao remover.");
      }
    }
  };

  const handleSave = async () => {
    if (!formData.image_url) {
      showError("A URL da imagem é obrigatória.");
      return;
    }

    try {
      await api.lookbook.create({
        tenant_id: tenant.id,
        image_url: formData.image_url,
        title: formData.title,
        description: formData.description,
        service_id: formData.service_id || null,
        staff_id: formData.staff_id || null
      });
      showSuccess("Adicionado com sucesso!");
      setShowModal(false);
      setFormData({ image_url: '', title: '', description: '', service_id: '', staff_id: '' });
      fetchData();
    } catch (err) {
      showError("Erro ao salvar.");
    }
  };

  if (loading) return <div className="p-xl flex justify-center">Carregando...</div>;

  return (
    <div className="flex-1 w-full max-w-7xl mx-auto pb-xl animate-fade-in-up">
      <div className="mb-xl flex justify-between items-end">
        <div>
          <h1 className="font-headline-lg-mobile md:font-headline-lg text-headline-lg-mobile md:text-headline-lg text-primary mb-sm">Lookbook</h1>
          <p className="font-body-md text-body-md text-secondary">Crie uma galeria de inspirações para seus clientes. As fotos vinculadas a serviços permitirão agendamentos rápidos ("Quero Fazer Igual").</p>
        </div>
        <button 
          onClick={() => setShowModal(true)} 
          className="bg-primary text-on-primary px-lg py-sm rounded-lg flex items-center gap-sm shadow-sm hover:bg-primary/90 transition-colors"
        >
          <span className="material-symbols-outlined">add_a_photo</span>
          Nova Foto
        </button>
      </div>

      {lookbooks.length === 0 ? (
        <div className="bg-surface-container-lowest p-xl rounded-xl shadow-[0px_4px_20px_rgba(0,0,0,0.04)] text-center">
          <span className="material-symbols-outlined text-6xl text-surface-variant mb-4">photo_library</span>
          <h3 className="font-headline-md text-on-surface mb-2">Nenhuma inspiração cadastrada</h3>
          <p className="text-secondary mb-4">Comece adicionando fotos de resultados para atrair mais agendamentos.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {lookbooks.map(item => (
            <div key={item.id} className="bg-surface-container-lowest rounded-xl overflow-hidden shadow-[0px_4px_20px_rgba(0,0,0,0.04)] group flex flex-col">
              <div className="relative aspect-square w-full overflow-hidden bg-surface-variant">
                <img src={item.image_url} alt={item.title || 'Lookbook image'} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                <button 
                  onClick={() => handleDelete(item.id)}
                  className="absolute top-2 right-2 bg-error text-on-error w-8 h-8 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <span className="material-symbols-outlined text-sm">delete</span>
                </button>
              </div>
              <div className="p-4 flex flex-col flex-1">
                <h3 className="font-label-lg font-bold text-on-surface line-clamp-1 mb-1">{item.title || 'Sem título'}</h3>
                {item.description && <p className="font-body-sm text-secondary line-clamp-2 mb-2">{item.description}</p>}
                
                <div className="mt-auto space-y-1">
                  {item.service_name && (
                    <div className="flex items-center gap-1 text-xs font-semibold text-primary bg-primary-container px-2 py-1 rounded-md inline-flex">
                      <span className="material-symbols-outlined text-[14px]">spa</span> {item.service_name}
                    </div>
                  )}
                  {item.staff_name && (
                    <div className="flex items-center gap-1 text-xs text-secondary">
                      <span className="material-symbols-outlined text-[14px]">person</span> {item.staff_name}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Novo */}
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-in fade-in">
          <div className="bg-surface rounded-2xl w-full max-w-lg p-6 shadow-2xl overflow-y-auto max-h-[90vh]">
            <h3 className="text-xl font-bold mb-6 text-on-surface">Adicionar Inspiração</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-secondary mb-1">URL da Imagem *</label>
                <input 
                  type="url" 
                  value={formData.image_url}
                  onChange={(e) => setFormData({...formData, image_url: e.target.value})}
                  className="w-full p-3 border border-outline-variant rounded-xl outline-none focus:border-primary"
                  placeholder="https://exemplo.com/foto.jpg"
                />
                {formData.image_url && (
                  <div className="mt-2 w-full h-32 rounded-lg bg-surface-variant overflow-hidden">
                    <img src={formData.image_url} alt="Preview" className="w-full h-full object-cover" onError={(e) => e.target.style.display = 'none'} />
                  </div>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-bold text-secondary mb-1">Título</label>
                <input 
                  type="text" 
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                  className="w-full p-3 border border-outline-variant rounded-xl outline-none focus:border-primary"
                  placeholder="Ex: Loiro Perolado"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-secondary mb-1">Descrição</label>
                <textarea 
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  className="w-full p-3 border border-outline-variant rounded-xl outline-none focus:border-primary min-h-[80px]"
                  placeholder="Detalhes sobre o procedimento..."
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-secondary mb-1">Serviço Vinculado</label>
                <select 
                  value={formData.service_id}
                  onChange={(e) => setFormData({...formData, service_id: e.target.value})}
                  className="w-full p-3 border border-outline-variant rounded-xl outline-none focus:border-primary"
                >
                  <option value="">Nenhum</option>
                  {services.map(s => <option key={s.id} value={s.id}>{s.name} (R$ {s.price})</option>)}
                </select>
                <p className="text-xs text-secondary mt-1">Ao selecionar um serviço, o botão "Quero Fazer Igual" fará o agendamento direto dele.</p>
              </div>

              <div>
                <label className="block text-sm font-bold text-secondary mb-1">Profissional (Opcional)</label>
                <select 
                  value={formData.staff_id}
                  onChange={(e) => setFormData({...formData, staff_id: e.target.value})}
                  className="w-full p-3 border border-outline-variant rounded-xl outline-none focus:border-primary"
                >
                  <option value="">Nenhum (Qualquer um)</option>
                  {staff.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
            </div>
            
            <div className="mt-8 flex justify-end gap-3">
              <button onClick={() => setShowModal(false)} className="px-6 py-2.5 text-sm font-bold text-secondary hover:bg-surface-variant rounded-xl">Cancelar</button>
              <button onClick={handleSave} className="px-6 py-2.5 text-sm font-bold bg-primary text-on-primary rounded-xl hover:bg-primary/90">Salvar Inspiração</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LookbookAdmin;
