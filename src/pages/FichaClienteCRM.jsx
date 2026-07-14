import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTenant } from '../context/TenantContext';
import { api } from '../lib/api';
import { useNotification } from '../context/NotificationProvider';
import { format, differenceInYears } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const FichaClienteCRM = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showError } = useNotification();
  const { tenant, session } = useTenant();

  const [client, setClient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ visits: 0, ltv: 0, favoriteService: '-', nextAppt: null });
  const [notes, setNotes] = useState([]);
  const [newNote, setNewNote] = useState('');
  const [savingNote, setSavingNote] = useState(false);

  useEffect(() => {
    if (!tenant || !id) return;
    fetchClientData();
  }, [tenant, id]);

  const fetchClientData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Client info + appointments via API
      const clientData = await api.clients.get(id);
      const apptsData = await api.appointments.list({ client_id: id });
      
      const cData = {
        ...clientData,
        cap_appointments: apptsData
      };

      setClient(cData);

      // 2. Calculate Stats
      if (cData && cData.cap_appointments) {
        const appts = cData.cap_appointments;
        const completed = appts.filter(a => a.status === 'completed');
        const ltv = completed.reduce((sum, a) => sum + Number(a.total_price), 0);
        
        // Favorite Service
        const srvCounts = {};
        completed.forEach(a => {
          const srvName = a.service_name || 'Serviço';
          srvCounts[srvName] = (srvCounts[srvName] || 0) + 1;
        });
        let fav = '-';
        let maxC = 0;
        Object.keys(srvCounts).forEach(k => {
          if (srvCounts[k] > maxC) { maxC = srvCounts[k]; fav = k; }
        });

        // Next Appt
        const now = new Date();
        const future = appts
           .filter(a => new Date(a.start_time) > now && a.status === 'scheduled')
           .sort((a,b) => new Date(a.start_time) - new Date(b.start_time));

        setStats({
          visits: completed.length,
          ltv,
          favoriteService: fav,
          nextAppt: future.length > 0 ? future[0] : null
        });
      }

      // 3. Fetch Timeline Notes via API
      try {
        const nData = await api.clients.getTimeline(id);
        if (nData) {
          setNotes(nData);
        }
      } catch (nErr) {
        console.error("Erro ao carregar notas:", nErr);
      }

    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const handleAddNote = async () => {
    if (!newNote.trim()) return;
    setSavingNote(true);
    try {
       await api.clients.addTimelineNote(client.id, newNote);
       setNewNote('');
       fetchClientData(); // reload notes
    } catch (err) {
       console.error(err);
       showError("Erro ao salvar anotação.");
    }
    setSavingNote(false);
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><span className="material-symbols-outlined animate-spin text-primary text-4xl">progress_activity</span></div>;
  if (!client) return <div className="p-10 text-center">Cliente não encontrado.</div>;

  const age = client.birth_date ? differenceInYears(new Date(), new Date(client.birth_date)) : null;

  return (
    <div className="flex flex-col gap-lg animate-fade-in-up w-full">
      
      {/* Header com botão de voltar */}
      <div className="flex items-center gap-4 mb-xl">
        <button 
          onClick={() => navigate(-1)}
          className="p-2 rounded-full hover:bg-surface-variant text-on-surface transition-colors flex items-center justify-center"
        >
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <div>
          <h1 className="font-headline-md text-headline-md text-primary">Ficha do Cliente</h1>
          <p className="font-body-md text-body-md text-secondary">Detalhes e histórico do cliente</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-lg">
        
        {/* Left Column: Client Profile Card */}
        <div className="lg:col-span-1 flex flex-col gap-lg">
          
          {/* Client Info Bento */}
          <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-2xl shadow-sm p-lg flex flex-col items-center text-center relative overflow-hidden">
            <div className="w-24 h-24 rounded-full overflow-hidden mb-4 bg-primary-container text-primary font-headline-lg flex items-center justify-center uppercase shadow-inner">
              {client.name.charAt(0)}
            </div>
            <h2 className="font-headline-md text-headline-md text-on-surface mb-1">{client.name}</h2>
            
            <div className="flex items-center gap-2 mb-1">
              <p className="font-body-md text-body-md text-secondary flex items-center gap-1">
                <span className="material-symbols-outlined text-[16px]">phone_iphone</span> {client.phone}
              </p>
              <a 
                href={`https://wa.me/${client.phone.replace(/\D/g, '').startsWith('55') ? client.phone.replace(/\D/g, '') : '55' + client.phone.replace(/\D/g, '')}`}
                target="_blank"
                rel="noreferrer"
                title="Conversar no WhatsApp"
                className="w-7 h-7 rounded-full bg-[#25D366]/10 text-[#25D366] flex items-center justify-center hover:bg-[#25D366]/20 transition-colors"
              >
                <span className="material-symbols-outlined text-[14px]">forum</span>
              </a>
            </div>
            
            <p className="font-body-sm text-body-sm text-secondary flex items-center gap-1 mb-4">
              <span className="material-symbols-outlined text-[16px]">cake</span> 
              {client.birth_date ? `${format(new Date(client.birth_date), "dd 'de' MMM, yyyy", { locale: ptBR })} (${age} anos)` : 'Data de nasc. não informada'}
            </p>
            
            <div className="w-full grid grid-cols-2 gap-3 mt-2">
              <div className="bg-surface-container-low p-3 rounded-xl flex flex-col items-center border border-outline-variant/50">
                <span className="font-label-sm text-label-sm text-secondary uppercase tracking-wider mb-1">Visitas</span>
                <span className="font-headline-md text-headline-md text-primary">{stats.visits}</span>
              </div>
              <div className="bg-surface-container-low p-3 rounded-xl flex flex-col items-center border border-outline-variant/50">
                <span className="font-label-sm text-label-sm text-secondary uppercase tracking-wider mb-1">Total Gasto</span>
                <span className="font-headline-sm text-headline-sm text-primary font-bold mt-1">R$ {stats.ltv.toFixed(2).replace('.',',')}</span>
              </div>
            </div>
            <div className="w-full mt-3 bg-surface-container-low p-3 rounded-xl flex flex-col items-center border border-outline-variant/50">
                <span className="font-label-sm text-label-sm text-secondary uppercase tracking-wider mb-1">Serviço Favorito</span>
                <span className="font-label-md text-label-md text-on-surface">{stats.favoriteService}</span>
            </div>
          </div>

          {/* Next Service Card */}
          {stats.nextAppt && (
            <div className="bg-primary/5 rounded-xl border border-primary/20 p-md flex flex-col gap-3">
              <h3 className="font-label-md text-label-md text-primary uppercase tracking-wider flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px]">event</span> Próximo Agendamento
              </h3>
              <div className="bg-white rounded-lg p-3 flex justify-between items-center shadow-sm">
                <div>
                  <h4 className="font-label-md text-label-md text-on-surface">{stats.nextAppt.cap_services?.name}</h4>
                  <p className="font-label-sm text-label-sm text-secondary">
                    {format(new Date(stats.nextAppt.start_time), "dd/MM, HH:mm")}
                  </p>
                </div>
                <span className="bg-primary-container text-on-primary-container font-label-sm text-label-sm px-2 py-1 rounded-full">Confirmado</span>
              </div>
            </div>
          )}
          
        </div>

        {/* Right Column: CRM Timeline */}
        <div className="lg:col-span-2 flex flex-col gap-lg">
          <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-2xl shadow-sm p-lg flex flex-col h-full">
            <h3 className="font-headline-md text-headline-md text-on-surface mb-6 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">history_edu</span> CRM da Equipe (Linha do Tempo)
            </h3>
            
            {/* Add Note Area */}
            <div className="mb-8 bg-surface-container-low p-4 rounded-xl relative border border-outline-variant/50">
              <div className="flex gap-3">
                <div className="w-10 h-10 rounded-full bg-primary-container text-primary flex items-center justify-center shrink-0 uppercase font-bold text-sm">
                  {session?.name ? session.name.charAt(0) : 'S'}
                </div>
                <div className="w-full">
                  <textarea 
                    className="w-full bg-white border border-outline-variant focus:border-primary focus:ring-1 focus:ring-primary rounded-xl p-3 font-body-md text-body-md text-on-surface placeholder:text-secondary resize-none outline-none transition-all shadow-inner" 
                    placeholder="Adicionar nova observação sobre preferências, misturas, alertas..." 
                    rows="3"
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                  ></textarea>
                  <div className="flex justify-end items-center mt-3">
                    <button 
                      onClick={handleAddNote}
                      disabled={savingNote || !newNote.trim()}
                      className="bg-primary text-on-primary font-label-md text-label-md px-5 py-2 rounded-xl hover:bg-on-primary-container transition-colors disabled:opacity-50 shadow-sm"
                    >
                      {savingNote ? 'Salvando...' : 'Salvar Observação'}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Timeline Comments */}
            <div className="flex flex-col gap-6 relative">
              {/* Connecting Line */}
              <div className="absolute left-[19px] top-4 bottom-4 w-px bg-surface-variant z-0 hidden sm:block"></div>
              
              {notes.length === 0 ? (
                 <div className="text-center py-8 text-secondary">Nenhuma observação registrada ainda.</div>
              ) : (
                notes.map((note) => (
                  <div key={note.id} className="flex gap-4 relative z-10 group">
                    <div className="w-10 h-10 rounded-full bg-surface-container-high text-on-surface flex items-center justify-center shrink-0 shadow-sm border border-surface-variant uppercase font-bold text-sm z-10">
                       {note.cap_staff?.name ? note.cap_staff.name.charAt(0) : 'P'}
                    </div>
                    <div className="bg-white border border-outline-variant/30 rounded-xl rounded-tl-sm p-4 shadow-sm w-full group-hover:shadow-md transition-shadow">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <span className="font-label-md text-label-md text-on-surface">{note.cap_staff?.name || 'Profissional'}</span>
                          <span className="font-label-sm text-label-sm text-secondary ml-2">
                             {format(new Date(note.created_at), "dd 'de' MMM, yyyy 'às' HH:mm", { locale: ptBR })}
                          </span>
                        </div>
                      </div>
                      <p className="font-body-md text-body-md text-on-surface-variant whitespace-pre-wrap">
                        {note.content}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FichaClienteCRM;
