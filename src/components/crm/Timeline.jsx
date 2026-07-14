import React, { useState, useEffect } from 'react';
import imageCompression from 'browser-image-compression';
import { api } from '../../lib/api';

import { 
  Send, 
  Image as ImageIcon, 
  X, 
  MessageSquare, 
  User, 
  Clock, 
  Loader2,
  Trash2
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useNotification } from '../../context/NotificationProvider';

const Timeline = ({ clientId }) => {
  const { showSuccess, showError, confirm } = useNotification();
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (clientId) fetchNotes();
  }, [clientId]);

  const fetchNotes = async () => {
    setLoading(true);
    try {
      const data = await api.clients.getTimeline(clientId);
      setNotes(data || []);
    } catch (error) {
      console.error('Error fetching notes:', error);
      showError('Erro ao carregar timeline');
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const clearImage = () => {
    setImageFile(null);
    setImagePreview(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!content.trim() && !imageFile) return;

    setUploading(true);

    try {
      const formData = new FormData();
      if (content.trim()) formData.append('content', content.trim());
      
      if (imageFile) {
        const options = {
          maxSizeMB: 0.2,
          maxWidthOrHeight: 1024,
          useWebWorker: true
        };
        const compressedFile = await imageCompression(imageFile, options);
        formData.append('image', compressedFile, compressedFile.name);
      }

      await api.clients.addTimelineNote(clientId, formData);

      setContent('');
      clearImage();
      showSuccess('Publicação enviada para a timeline!');
      fetchNotes();
    } catch (error) {
      showError('Erro ao postar na timeline: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  const deleteNote = async (id) => {
    if (await confirm('Deseja excluir esta publicação definitivamente? Esta ação não pode ser desfeita.')) {
      try {
        await api.clients.deleteTimelineNote(clientId, id);
        showSuccess('Publicação removida com sucesso!');
        fetchNotes();
      } catch (error) {
        showError('Erro ao excluir nota');
      }
    }
  };

  const getPublicUrl = (path) => {
    if (!path) return null;
    const backendUrl = import.meta.env.VITE_API_BASE_URL ? import.meta.env.VITE_API_BASE_URL.replace('/api', '') : 'http://localhost:5000';
    return `${backendUrl}${path}`;
  };

  return (
    <div className="space-y-8 max-w-[672px] mx-auto">
      {/* New Post Box */}
      <div className="card-base p-4 bg-white border-slate-200">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex gap-3">
             <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 shrink-0">
                <User size={20} />
             </div>
             <div className="flex-1 space-y-3">
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Escreva algo sobre o atendimento ou anexe uma foto..."
                  className="w-full bg-slate-50 border-none rounded-lg p-3 text-sm focus:ring-1 focus:ring-accent/30 outline-none min-h-[80px] resize-none"
                />
                
                {imagePreview && (
                  <div className="relative inline-block mt-2 group">
                    <img src={imagePreview} alt="Preview" className="h-32 rounded-lg border border-slate-200 object-cover" />
                    <button 
                      type="button"
                      onClick={clearImage}
                      className="absolute -top-2 -right-2 bg-rose-500 text-white rounded-full p-1 shadow-lg hover:bg-rose-600 transition-colors"
                    >
                      <X size={12} />
                    </button>
                  </div>
                )}
             </div>
          </div>
          
          <div className="flex items-center justify-between pt-3 border-t border-slate-50">
             <label className="flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-accent cursor-pointer transition-colors px-2 py-1.5 rounded-md hover:bg-slate-50">
                <ImageIcon size={16} />
                <span>Anexar Foto</span>
                <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
             </label>
             
             <button 
                type="submit" 
                disabled={uploading || (!content.trim() && !imageFile)}
                className="btn-accent text-xs px-6 py-2 flex items-center gap-2 disabled:opacity-50"
             >
                {uploading ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                Publicar
             </button>
          </div>
        </form>
      </div>

      {/* Timeline Feed */}
      <div className="space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-200 before:to-transparent">
        {loading ? (
          <div className="text-center py-10 text-slate-400">Carregando timeline...</div>
        ) : notes.length === 0 ? (
          <div className="text-center py-10 text-slate-400 italic text-sm">Nenhuma nota registrada nesta timeline.</div>
        ) : (
          notes.map((note) => (
            <div key={note.id} className="relative pl-12 group">
              {/* Dot on line */}
              <div className="absolute left-0 w-10 h-10 flex items-center justify-center">
                 <div className="w-2 h-2 rounded-full bg-slate-300 ring-4 ring-white group-hover:bg-accent transition-colors"></div>
              </div>
              
              <div className="card-base p-5 bg-white border-slate-100 hover:border-slate-200 transition-all">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-slate-900">{note.cap_staff?.name || 'Profissional'}</span>
                    <span className="text-[10px] text-slate-400">•</span>
                    <span className="text-[10px] font-medium text-slate-400 flex items-center gap-1">
                      <Clock size={10} /> {formatDistanceToNow(new Date(note.created_at), { addSuffix: true, locale: ptBR })}
                    </span>
                  </div>
                  <button 
                    onClick={() => deleteNote(note.id)}
                    className="text-slate-300 hover:text-rose-500 transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
                
                {note.content && (
                  <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">{note.content}</p>
                )}
                
                {note.image_path && (
                  <div className="mt-4 rounded-lg overflow-hidden border border-slate-100">
                    <img src={getPublicUrl(note.image_path)} alt="Procedimento" className="w-full h-auto max-h-[400px] object-cover" />
                  </div>
                )}
                

              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Timeline;

