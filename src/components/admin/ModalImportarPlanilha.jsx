import React, { useState, useRef, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { 
  X, Upload, FileSpreadsheet, Check, AlertTriangle, Download, 
  ArrowRight, ArrowLeft, CheckCircle2, XCircle, RefreshCw, 
  FileDown, AlertCircle, Sparkles, User, Scissors
} from 'lucide-react';
import { useNotification } from '../../context/NotificationProvider';
import { api } from '../../lib/api';

/**
 * Modal universal de importação de planilhas (CSV/XLSX)
 * Suporta importação transacional de Clientes ou Serviços
 * 
 * @param {boolean} isOpen - Controle de visibilidade
 * @param {function} onClose - Fechamento do modal
 * @param {'clientes' | 'servicos'} tipo - Tipo de dado a importar
 * @param {function} onSuccess - Callback após importação bem sucedida
 */
export default function ModalImportarPlanilha({ isOpen, onClose, tipo = 'clientes', onSuccess }) {
  const { showSuccess, showError } = useNotification();
  
  // Etapas: 1 = Arquivo, 2 = Mapeamento, 3 = Prévia, 4 = Relatório
  const [etapa, setEtapa] = useState(1);
  const [file, setFile] = useState(null);
  const [rawHeaders, setRawHeaders] = useState([]);
  const [rawRows, setRawRows] = useState([]);
  const [columnMapping, setColumnMapping] = useState({});
  const [activeFilter, setActiveFilter] = useState('all'); // 'all', 'valid', 'error'
  const [allOrNothing, setAllOrNothing] = useState(true);
  const [onDuplicate, setOnDuplicate] = useState('skip'); // 'skip', 'update'
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [reportResult, setReportResult] = useState(null);
  const fileInputRef = useRef(null);

  // Definição dos campos alvo por tipo
  const targetFields = useMemo(() => {
    if (tipo === 'clientes') {
      return [
        { key: 'name', label: 'Nome do Cliente', required: true, aliases: ['nome', 'cliente', 'nome completo', 'client', 'name', 'paciente', 'contato'] },
        { key: 'phone', label: 'Telefone / Celular', required: true, aliases: ['telefone', 'celular', 'whatsapp', 'fone', 'tel', 'phone', 'mobile', 'whats'] },
        { key: 'birth_date', label: 'Data de Nascimento', required: false, aliases: ['nascimento', 'data nascimento', 'dt_nasc', 'aniversario', 'birth', 'birthdate', 'data de nascimento', 'd.nasc'] },
        { key: 'vip_tier', label: 'Nível VIP (Prata/Ouro/VIP/Black)', required: false, aliases: ['nivel', 'nível', 'vip', 'tier', 'categoria', 'plano', 'status'] },
      ];
    } else {
      return [
        { key: 'name', label: 'Nome do Serviço', required: true, aliases: ['serviço', 'servico', 'nome', 'procedimento', 'service', 'item', 'descrição', 'descricao'] },
        { key: 'price', label: 'Preço (R$)', required: true, aliases: ['preço', 'preco', 'valor', 'preço (r$)', 'valor (r$)', 'price', 'r$', 'custo'] },
        { key: 'duration_minutes', label: 'Duração (minutos)', required: false, aliases: ['duração', 'duracao', 'tempo', 'minutos', 'duração (min)', 'duration', 'duracao (minutos)'] },
        { key: 'short_description', label: 'Descrição Curta', required: false, aliases: ['descrição curta', 'descricao curta', 'detalhes', 'observações', 'observacao', 'resumo'] },
        { key: 'maintenance_days', label: 'Dias para Retorno', required: false, aliases: ['retorno', 'dias retorno', 'manutenção', 'manutencao', 'retorno (dias)', 'dias'] },
        { key: 'is_starting_price', label: 'A partir de? (Sim/Não)', required: false, aliases: ['a partir de', 'a partir', 'starting_price', 'partir'] }
      ];
    }
  }, [tipo]);

  // 1. Processar arquivo selecionado
  const handleFile = async (selectedFile) => {
    if (!selectedFile) return;
    setFile(selectedFile);

    try {
      const data = await selectedFile.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array', cellDates: true });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      
      const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
      if (!rows || rows.length <= 1) {
        showError('A planilha selecionada está vazia ou não contém dados suficientes.');
        return;
      }

      const headers = rows[0].map(h => String(h || '').trim()).filter(Boolean);
      const dataRows = rows.slice(1).filter(r => r.some(c => String(c || '').trim() !== ''));

      if (dataRows.length === 0) {
        showError('Nenhuma linha com dados encontrada após o cabeçalho.');
        return;
      }

      setRawHeaders(headers);
      setRawRows(dataRows);

      // Auto-mapeamento por heurística
      const initialMapping = {};
      targetFields.forEach(field => {
        const foundHeader = headers.find(h => {
          const cleanH = h.toLowerCase().trim();
          return field.aliases.some(alias => cleanH === alias || cleanH.includes(alias));
        });
        if (foundHeader) {
          initialMapping[field.key] = foundHeader;
        }
      });
      setColumnMapping(initialMapping);
      setEtapa(2);
    } catch (err) {
      console.error(err);
      showError('Erro ao ler planilha. Certifique-se de enviar um arquivo válido (.xlsx, .xls ou .csv).');
    }
  };

  // 2. Normalizar dados mapeados para a pré-visualização
  const parsedRows = useMemo(() => {
    if (rawRows.length === 0 || !columnMapping) return [];

    const seenKeys = new Map(); // Para rastrear duplicatas no próprio lote

    return rawRows.map((row, idx) => {
      const rowNum = idx + 2; // Linha 1 é o cabeçalho
      const getVal = (fieldKey) => {
        const headerName = columnMapping[fieldKey];
        if (!headerName) return '';
        const headerIdx = rawHeaders.indexOf(headerName);
        if (headerIdx === -1) return '';
        return row[headerIdx] !== undefined ? String(row[headerIdx]).trim() : '';
      };

      const errors = [];
      const warnings = [];
      let item = {};

      if (tipo === 'clientes') {
        const rawName = getVal('name');
        const rawPhone = getVal('phone').replace(/\D/g, '');
        let rawBirth = getVal('birth_date');
        const rawVip = getVal('vip_tier');

        // Formatação de data
        let birthDateFormatted = null;
        if (rawBirth) {
          if (/^\d{4}-\d{2}-\d{2}/.test(rawBirth)) {
            birthDateFormatted = rawBirth.slice(0, 10);
          } else if (/^\d{2}\/\d{2}\/\d{4}/.test(rawBirth)) {
            const [d, m, y] = rawBirth.split('/');
            birthDateFormatted = `${y}-${m}-${d}`;
          }
        }

        const validTiers = ['Prata', 'Ouro', 'VIP', 'Black'];
        const vipTier = validTiers.find(t => t.toLowerCase() === rawVip.toLowerCase()) || 'Prata';

        if (!rawName) errors.push('Nome é obrigatório');
        if (!rawPhone || rawPhone.length < 10) errors.push('Telefone inválido (mínimo 10 dígitos com DDD)');

        // Checar duplicata de telefone no lote
        if (rawPhone) {
          if (seenKeys.has(rawPhone)) {
            const firstSeen = seenKeys.get(rawPhone);
            warnings.push(`Telefone repetido no arquivo (mesmo da linha ${firstSeen})`);
          } else {
            seenKeys.set(rawPhone, rowNum);
          }
        }

        item = {
          name: rawName,
          phone: rawPhone,
          birth_date: birthDateFormatted,
          vip_tier: vipTier
        };
      } else {
        // Serviços
        const rawName = getVal('name');
        const rawPriceStr = getVal('price').replace(/[^0-9.,]/g, '').replace(',', '.');
        const rawPrice = parseFloat(rawPriceStr);
        const rawDurationStr = getVal('duration_minutes').replace(/\D/g, '');
        const rawDuration = rawDurationStr ? parseInt(rawDurationStr, 10) : 30;
        const rawDesc = getVal('short_description');
        const rawRetornoStr = getVal('maintenance_days').replace(/\D/g, '');
        const rawRetorno = rawRetornoStr ? parseInt(rawRetornoStr, 10) : 0;
        const rawStarting = getVal('is_starting_price').toLowerCase();
        const isStarting = rawStarting === 'sim' || rawStarting === 'true' || rawStarting === '1' || rawStarting === 's';

        if (!rawName) errors.push('Nome do serviço é obrigatório');
        if (isNaN(rawPrice) || rawPrice <= 0) errors.push('Preço deve ser um valor numérico positivo');
        if (isNaN(rawDuration) || rawDuration <= 0) errors.push('Duração deve ser maior que 0 minutos');

        const normName = rawName.toLowerCase();
        if (normName) {
          if (seenKeys.has(normName)) {
            const firstSeen = seenKeys.get(normName);
            warnings.push(`Nome repetido no arquivo (mesmo da linha ${firstSeen})`);
          } else {
            seenKeys.set(normName, rowNum);
          }
        }

        item = {
          name: rawName,
          price: isNaN(rawPrice) ? 0 : rawPrice,
          duration_minutes: rawDuration,
          short_description: rawDesc || null,
          maintenance_days: rawRetorno,
          is_starting_price: isStarting,
          is_active: true
        };
      }

      return {
        rowNum,
        item,
        errors,
        warnings,
        isValid: errors.length === 0
      };
    });
  }, [rawRows, columnMapping, rawHeaders, tipo]);

  // Contadores de validação
  const totalCount = parsedRows.length;
  const validCount = parsedRows.filter(r => r.isValid).length;
  const errorCount = parsedRows.filter(r => !r.isValid).length;

  // Linhas filtradas para a tabela de pré-visualização
  const filteredRows = useMemo(() => {
    if (activeFilter === 'valid') return parsedRows.filter(r => r.isValid);
    if (activeFilter === 'error') return parsedRows.filter(r => !r.isValid);
    return parsedRows;
  }, [parsedRows, activeFilter]);

  // Download do modelo em CSV
  const handleDownloadTemplateCsv = () => {
    let content = '';
    let filename = '';
    if (tipo === 'clientes') {
      content = 'nome,telefone,nascimento,nivel\nMaria Silva,11999998888,14/05/1992,Prata\nJuliana Santos,11988887777,20/11/1988,VIP\nBeatriz Alcantara,11977776666,03/09/1995,Black';
      filename = 'modelo_clientes_operabeauty.csv';
    } else {
      content = 'servico,preco,duracao,descricao,retorno\nCorte Feminino,95.00,50,Lavagem e corte editorial,45\nManicure Express,40.00,30,Cutilagem e esmaltação,15\nDesign de Sobrancelha,65.00,40,Mapeamento geométrico e henna,20';
      filename = 'modelo_servicos_operabeauty.csv';
    }
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Download do modelo em XLSX
  const handleDownloadTemplateXlsx = () => {
    const filename = tipo === 'clientes' ? 'modelo_clientes_operabeauty.xlsx' : 'modelo_servicos_operabeauty.xlsx';
    let data = [];
    if (tipo === 'clientes') {
      data = [
        { 'Nome': 'Maria Silva', 'Telefone': '(11) 99999-8888', 'Data Nascimento': '14/05/1992', 'Nível VIP': 'Prata' },
        { 'Nome': 'Juliana Santos', 'Telefone': '(11) 98888-7777', 'Data Nascimento': '20/11/1988', 'Nível VIP': 'VIP' },
        { 'Nome': 'Beatriz Alcantara', 'Telefone': '(11) 97777-6666', 'Data Nascimento': '03/09/1995', 'Nível VIP': 'Black' },
      ];
    } else {
      data = [
        { 'Serviço': 'Corte Feminino', 'Preço': 95.00, 'Duração (min)': 50, 'Descrição': 'Lavagem e corte editorial', 'Dias Retorno': 45 },
        { 'Serviço': 'Manicure Express', 'Preço': 40.00, 'Duração (min)': 30, 'Descrição': 'Cutilagem e esmaltação', 'Dias Retorno': 15 },
        { 'Serviço': 'Design de Sobrancelha', 'Preço': 65.00, 'Duração (min)': 40, 'Descrição': 'Mapeamento e henna', 'Dias Retorno': 20 },
      ];
    }
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Modelo');
    XLSX.writeFile(wb, filename);
  };

  // Submissão da importação
  const handleExecuteImport = async () => {
    const payloadItems = allOrNothing 
      ? parsedRows.map(r => r.item)
      : parsedRows.filter(r => r.isValid).map(r => r.item);

    if (payloadItems.length === 0) {
      showError('Nenhum item válido para importar.');
      return;
    }

    if (allOrNothing && errorCount > 0) {
      showError(`O modo "Tudo ou Nada" está ativado e existem ${errorCount} linha(s) com erros. Corrija o arquivo ou desative a opção.`);
      return;
    }

    setIsProcessing(true);
    try {
      let res;
      if (tipo === 'clientes') {
        res = await api.clients.import(payloadItems, {
          all_or_nothing: allOrNothing,
          on_duplicate: onDuplicate
        });
      } else {
        res = await api.services.import(payloadItems, {
          all_or_nothing: allOrNothing,
          on_duplicate: onDuplicate
        });
      }

      setReportResult(res);
      setEtapa(4);
      if (res.success) {
        showSuccess(res.message || 'Importação realizada com sucesso!');
        if (onSuccess) onSuccess();
      } else {
        showError(res.message || 'Houve falha na importação.');
      }
    } catch (err) {
      console.error(err);
      showError(err.message || 'Erro ao processar importação no servidor.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Exportar linhas rejeitadas para CSV
  const handleDownloadRejectedCsv = () => {
    if (!reportResult || !reportResult.rejected || reportResult.rejected.length === 0) return;
    let csv = 'linha,identificador,motivo_erro\n';
    reportResult.rejected.forEach(r => {
      const id = (r.name || r.phone || '').replace(/"/g, '""');
      const reason = (r.reason || '').replace(/"/g, '""');
      csv += `${r.row},"${id}","${reason}"\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `linhas_rejeitadas_${tipo}_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/50 backdrop-blur-xs animate-fade-in">
      <div className="bg-white border border-line rounded-[24px] shadow-2xl max-w-4xl w-full flex flex-col max-h-[90vh] overflow-hidden relative animate-in zoom-in-95 duration-150">
        
        {/* Cabeçalho Rosé Editorial */}
        <div className="px-6 py-5 border-b border-line flex items-center justify-between bg-stone-50/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-brand-tint flex items-center justify-center text-brand shrink-0">
              {tipo === 'clientes' ? <User className="w-5 h-5" /> : <Scissors className="w-5 h-5" />}
            </div>
            <div>
              <h2 className="font-display text-xl sm:text-2xl font-bold text-ink">
                Importar {tipo === 'clientes' ? 'Clientes' : 'Serviços'} por Planilha
              </h2>
              <p className="text-xs text-ink-soft">
                Upload rápido de arquivos .XLSX ou .CSV com validação e pré-visualização.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full border border-line flex items-center justify-center text-ink-soft hover:text-ink hover:bg-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Stepper Visual */}
        <div className="px-6 py-3 bg-white border-b border-line flex items-center justify-between text-xs font-medium text-ink-soft">
          <div className="flex items-center gap-2">
            <span className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-[11px] ${
              etapa >= 1 ? 'bg-brand text-white' : 'bg-stone-200 text-stone-600'
            }`}>
              1
            </span>
            <span className={etapa === 1 ? 'text-brand font-semibold' : ''}>Arquivo</span>
          </div>

          <div className="h-0.5 flex-1 mx-3 bg-stone-200 max-w-[40px] sm:max-w-[80px]" />

          <div className="flex items-center gap-2">
            <span className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-[11px] ${
              etapa >= 2 ? 'bg-brand text-white' : 'bg-stone-200 text-stone-600'
            }`}>
              2
            </span>
            <span className={etapa === 2 ? 'text-brand font-semibold' : ''}>Mapeamento</span>
          </div>

          <div className="h-0.5 flex-1 mx-3 bg-stone-200 max-w-[40px] sm:max-w-[80px]" />

          <div className="flex items-center gap-2">
            <span className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-[11px] ${
              etapa >= 3 ? 'bg-brand text-white' : 'bg-stone-200 text-stone-600'
            }`}>
              3
            </span>
            <span className={etapa === 3 ? 'text-brand font-semibold' : ''}>Prévia & Erros</span>
          </div>

          <div className="h-0.5 flex-1 mx-3 bg-stone-200 max-w-[40px] sm:max-w-[80px]" />

          <div className="flex items-center gap-2">
            <span className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-[11px] ${
              etapa >= 4 ? 'bg-brand text-white' : 'bg-stone-200 text-stone-600'
            }`}>
              4
            </span>
            <span className={etapa === 4 ? 'text-brand font-semibold' : ''}>Relatório</span>
          </div>
        </div>

        {/* Corpo do Modal */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* ETAPA 1: SELEÇÃO DO ARQUIVO */}
          {etapa === 1 && (
            <div className="space-y-6 max-w-xl mx-auto py-4">
              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  if (e.dataTransfer.files?.[0]) handleFile(e.dataTransfer.files[0]);
                }}
                className="border-2 border-dashed border-brand/40 hover:border-brand rounded-[22px] p-8 sm:p-12 flex flex-col items-center justify-center text-center cursor-pointer transition-all bg-brand-tint/15 hover:bg-brand-tint/25 group"
              >
                <div className="w-16 h-16 rounded-full bg-white shadow-xs flex items-center justify-center text-brand group-hover:scale-105 transition-transform mb-4">
                  <FileSpreadsheet className="w-8 h-8" />
                </div>
                <h3 className="text-base font-bold text-ink">
                  {file ? file.name : 'Clique para selecionar ou arraste sua planilha aqui'}
                </h3>
                <p className="text-xs text-ink-soft mt-1">
                  Formatos aceitos: Microsoft Excel (.xlsx, .xls) ou Texto delimitado (.csv)
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                  onChange={(e) => {
                    if (e.target.files?.[0]) handleFile(e.target.files[0]);
                  }}
                  className="hidden"
                />
              </div>

              {/* Box de Modelos de Exemplo */}
              <div className="bg-stone-50 border border-line rounded-[18px] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <Download className="w-4 h-4 text-brand shrink-0" />
                  <div className="text-xs">
                    <p className="font-semibold text-ink">Precisa de um modelo pronto?</p>
                    <p className="text-ink-soft">Baixe nossa planilha pré-formatada para preenchimento.</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={handleDownloadTemplateCsv}
                    className="px-3 py-1.5 rounded-full border border-line bg-white hover:bg-stone-100 text-[11px] font-semibold text-ink shadow-2xs transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <FileDown className="w-3.5 h-3.5 text-brand" />
                    <span>CSV</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleDownloadTemplateXlsx}
                    className="px-3 py-1.5 rounded-full border border-line bg-white hover:bg-stone-100 text-[11px] font-semibold text-ink shadow-2xs transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-700" />
                    <span>Excel (.xlsx)</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ETAPA 2: MAPEAMENTO DE COLUNAS */}
          {etapa === 2 && (
            <div className="space-y-6">
              <div className="bg-brand-tint/20 border border-brand/20 rounded-[18px] p-4 flex items-start gap-3">
                <Sparkles className="w-5 h-5 text-brand shrink-0 mt-0.5" />
                <div className="text-xs text-ink">
                  <p className="font-bold">Mapeamento Inteligente de Colunas</p>
                  <p className="text-ink-soft mt-0.5">
                    Identificamos {rawHeaders.length} coluna(s) na sua planilha. Verifique se cada campo do OperaBeauty corresponde à coluna correta do seu arquivo.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {targetFields.map(field => {
                  const selectedHeader = columnMapping[field.key] || '';
                  const sampleValue = selectedHeader && rawRows[0] 
                    ? rawRows[0][rawHeaders.indexOf(selectedHeader)] 
                    : '';

                  return (
                    <div key={field.key} className="border border-line rounded-[18px] p-4 bg-white shadow-2xs flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <label className="text-xs font-bold text-ink flex items-center gap-1">
                            {field.label}
                            {field.required && <span className="text-brand">*</span>}
                          </label>
                          {selectedHeader ? (
                            <span className="text-[10px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                              Mapeado ✓
                            </span>
                          ) : field.required ? (
                            <span className="text-[10px] font-medium text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                              Obrigatório
                            </span>
                          ) : (
                            <span className="text-[10px] font-medium text-stone-500 bg-stone-100 px-2 py-0.5 rounded-full">
                              Opcional
                            </span>
                          )}
                        </div>

                        <select
                          value={selectedHeader}
                          onChange={(e) => setColumnMapping({ ...columnMapping, [field.key]: e.target.value })}
                          className="w-full px-3 py-2 rounded-xl border border-line bg-stone-50/50 text-xs text-ink focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand cursor-pointer"
                        >
                          <option value="">-- Não mapear este campo --</option>
                          {rawHeaders.map((header) => (
                            <option key={header} value={header}>
                              Coluna: "{header}"
                            </option>
                          ))}
                        </select>
                      </div>

                      {selectedHeader && (
                        <div className="mt-2.5 pt-2 border-t border-line/60 text-[11px] text-ink-soft flex items-center justify-between">
                          <span>Exemplo (1ª linha):</span>
                          <span className="font-mono text-ink font-medium truncate max-w-[180px]">
                            {sampleValue !== '' ? String(sampleValue) : '(vazio)'}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ETAPA 3: PRÉ-VISUALIZAÇÃO & VALIDAÇÃO COM ERROS */}
          {etapa === 3 && (
            <div className="space-y-5">
              {/* KPIs de Validação */}
              <div className="grid grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => setActiveFilter('all')}
                  className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                    activeFilter === 'all' 
                      ? 'border-brand bg-brand-tint/20 ring-1 ring-brand' 
                      : 'border-line bg-white hover:bg-stone-50'
                  }`}
                >
                  <p className="text-[11px] font-medium text-ink-soft">Total de Linhas</p>
                  <p className="font-display text-xl sm:text-2xl font-bold text-ink mt-0.5 tabular-nums">
                    {totalCount}
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveFilter('valid')}
                  className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                    activeFilter === 'valid' 
                      ? 'border-emerald-600 bg-emerald-50/70 ring-1 ring-emerald-600' 
                      : 'border-line bg-white hover:bg-stone-50'
                  }`}
                >
                  <p className="text-[11px] font-medium text-emerald-800">Prontas para Importar</p>
                  <p className="font-display text-xl sm:text-2xl font-bold text-emerald-800 mt-0.5 tabular-nums">
                    {validCount}
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveFilter('error')}
                  className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                    activeFilter === 'error' 
                      ? 'border-rose-600 bg-rose-50/70 ring-1 ring-rose-600' 
                      : 'border-line bg-white hover:bg-stone-50'
                  }`}
                >
                  <p className="text-[11px] font-medium text-rose-800">Com Erros / Bloqueadas</p>
                  <p className="font-display text-xl sm:text-2xl font-bold text-rose-800 mt-0.5 tabular-nums">
                    {errorCount}
                  </p>
                </button>
              </div>

              {/* Tabela de Prévia */}
              <div className="border border-line rounded-[20px] overflow-hidden bg-white shadow-xs max-h-72 overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-stone-50 border-b border-line text-ink-soft sticky top-0 font-medium">
                    <tr>
                      <th className="py-2.5 px-3 w-12 text-center">Linha</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3">{tipo === 'clientes' ? 'Cliente' : 'Serviço'}</th>
                      <th className="py-2.5 px-3">{tipo === 'clientes' ? 'Telefone' : 'Preço'}</th>
                      <th className="py-2.5 px-3">{tipo === 'clientes' ? 'Nível / Nascimento' : 'Duração'}</th>
                      <th className="py-2.5 px-3">Inconsistências</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line/60">
                    {filteredRows.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-ink-soft">
                          Nenhuma linha encontrada para este filtro.
                        </td>
                      </tr>
                    ) : (
                      filteredRows.map((r) => (
                        <tr key={r.rowNum} className={!r.isValid ? 'bg-rose-50/40' : 'hover:bg-stone-50/50'}>
                          <td className="py-2.5 px-3 text-center font-mono text-ink-soft text-[11px]">
                            #{r.rowNum}
                          </td>
                          <td className="py-2.5 px-3">
                            {r.isValid ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-800 bg-emerald-100/70 px-2 py-0.5 rounded-full">
                                <Check className="w-3 h-3" /> Válido
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-rose-800 bg-rose-100 px-2 py-0.5 rounded-full">
                                <AlertTriangle className="w-3 h-3" /> Erro
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 font-semibold text-ink">
                            {r.item.name || <span className="text-rose-600 italic">Vazio</span>}
                          </td>
                          <td className="py-2.5 px-3 font-mono">
                            {tipo === 'clientes' 
                              ? (r.item.phone || <span className="text-rose-600 italic">Vazio</span>)
                              : (r.item.price ? `R$ ${Number(r.item.price).toFixed(2).replace('.', ',')}` : <span className="text-rose-600 italic">Inválido</span>)}
                          </td>
                          <td className="py-2.5 px-3 text-ink-soft">
                            {tipo === 'clientes' 
                              ? `${r.item.vip_tier} ${r.item.birth_date ? `· ${r.item.birth_date}` : ''}`
                              : `${r.item.duration_minutes} min`}
                          </td>
                          <td className="py-2.5 px-3">
                            {r.errors.length > 0 ? (
                              <span className="text-rose-700 text-[11px] font-medium">
                                {r.errors.join('; ')}
                              </span>
                            ) : r.warnings.length > 0 ? (
                              <span className="text-amber-700 text-[11px]">
                                {r.warnings.join('; ')}
                              </span>
                            ) : (
                              <span className="text-emerald-700 text-[11px]">OK</span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Opções de Lote e Tolerância */}
              <div className="bg-stone-50 border border-line rounded-[18px] p-4 space-y-3">
                <p className="text-xs font-bold text-ink">Opções de Execução do Lote</p>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={allOrNothing}
                      onChange={(e) => setAllOrNothing(e.target.checked)}
                      className="w-4 h-4 rounded border-line text-brand focus:ring-brand cursor-pointer"
                    />
                    <span className="text-ink font-medium">
                      Modo Tudo ou Nada (abortar o lote se houver qualquer erro de validação)
                    </span>
                  </label>

                  <div className="flex items-center gap-2">
                    <span className="text-ink-soft">Registros repetidos:</span>
                    <select
                      value={onDuplicate}
                      onChange={(e) => setOnDuplicate(e.target.value)}
                      className="px-2.5 py-1 rounded-lg border border-line bg-white text-xs text-ink font-medium focus:outline-none focus:border-brand"
                    >
                      <option value="skip">Ignorar (manter existente)</option>
                      <option value="update">Atualizar dados do existente</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ETAPA 4: RELATÓRIO FINAL */}
          {etapa === 4 && reportResult && (
            <div className="space-y-6 max-w-2xl mx-auto py-2">
              <div className={`p-6 rounded-[22px] border text-center ${
                reportResult.success ? 'bg-emerald-50/60 border-emerald-200' : 'bg-rose-50/60 border-rose-200'
              }`}>
                {reportResult.success ? (
                  <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto mb-2" />
                ) : (
                  <XCircle className="w-12 h-12 text-rose-600 mx-auto mb-2" />
                )}
                <h3 className="font-display text-2xl font-bold text-ink">
                  {reportResult.success ? 'Importação Concluída!' : 'Falha na Importação'}
                </h3>
                <p className="text-xs text-ink-soft mt-1">
                  {reportResult.message}
                </p>

                {/* Métricas do relatório */}
                <div className="grid grid-cols-4 gap-2 mt-5 pt-4 border-t border-line/60">
                  <div className="bg-white rounded-xl p-2.5 border border-line/80 shadow-2xs">
                    <p className="text-[10px] text-ink-soft font-medium">Total</p>
                    <p className="text-lg font-bold text-ink tabular-nums">{reportResult.total || 0}</p>
                  </div>
                  <div className="bg-white rounded-xl p-2.5 border border-line/80 shadow-2xs">
                    <p className="text-[10px] text-emerald-700 font-medium">Novos</p>
                    <p className="text-lg font-bold text-emerald-700 tabular-nums">{reportResult.imported || 0}</p>
                  </div>
                  <div className="bg-white rounded-xl p-2.5 border border-line/80 shadow-2xs">
                    <p className="text-[10px] text-amber-700 font-medium">Atualizados</p>
                    <p className="text-lg font-bold text-amber-700 tabular-nums">{reportResult.updated || 0}</p>
                  </div>
                  <div className="bg-white rounded-xl p-2.5 border border-line/80 shadow-2xs">
                    <p className="text-[10px] text-rose-700 font-medium">Rejeitados</p>
                    <p className="text-lg font-bold text-rose-700 tabular-nums">{reportResult.rejected?.length || 0}</p>
                  </div>
                </div>
              </div>

              {/* Tabela de Rejeições (se houver) */}
              {reportResult.rejected && reportResult.rejected.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-ink flex items-center gap-1.5">
                      <AlertCircle className="w-4 h-4 text-rose-600" />
                      Linhas Rejeitadas ({reportResult.rejected.length}):
                    </h4>
                    <button
                      type="button"
                      onClick={handleDownloadRejectedCsv}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-line bg-white hover:bg-stone-50 text-xs font-medium text-ink shadow-2xs transition-colors cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5 text-brand" />
                      <span>Baixar Rejeitados (.CSV)</span>
                    </button>
                  </div>

                  <div className="border border-line rounded-[18px] overflow-hidden max-h-48 overflow-y-auto bg-white">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-stone-50 border-b border-line text-ink-soft sticky top-0">
                        <tr>
                          <th className="py-2 px-3 w-14 text-center">Linha</th>
                          <th className="py-2 px-3">Identificador</th>
                          <th className="py-2 px-3">Motivo da Rejeição</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-line/60">
                        {reportResult.rejected.map((rej, i) => (
                          <tr key={i} className="hover:bg-rose-50/20">
                            <td className="py-2 px-3 text-center font-mono text-[11px] text-ink-soft">
                              #{rej.row}
                            </td>
                            <td className="py-2 px-3 font-semibold text-ink">
                              {rej.name || rej.phone || 'Sem identificador'}
                            </td>
                            <td className="py-2 px-3 text-rose-700">
                              {rej.reason}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

        </div>

        {/* Rodapé com Ações de Navegação */}
        <div className="px-6 py-4 border-t border-line bg-stone-50/60 flex items-center justify-between">
          <div>
            {etapa > 1 && etapa < 4 && (
              <button
                type="button"
                disabled={isProcessing}
                onClick={() => setEtapa(etapa - 1)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full border border-line bg-white hover:bg-stone-100 text-xs font-semibold text-ink transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Voltar</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            {etapa < 4 && (
              <button
                type="button"
                disabled={isProcessing}
                onClick={onClose}
                className="px-4 py-2 rounded-full border border-line text-ink-soft hover:text-ink hover:bg-stone-100 text-xs font-semibold transition-colors cursor-pointer"
              >
                Cancelar
              </button>
            )}

            {etapa === 2 && (
              <button
                type="button"
                onClick={() => {
                  const missingRequired = targetFields
                    .filter(f => f.required && !columnMapping[f.key])
                    .map(f => f.label);
                  if (missingRequired.length > 0) {
                    showError(`Por favor, mapeie os campos obrigatórios: ${missingRequired.join(', ')}`);
                    return;
                  }
                  setEtapa(3);
                }}
                className="inline-flex items-center gap-1.5 px-5 py-2 rounded-full bg-brand hover:bg-brand-hover text-white text-xs font-semibold shadow-2xs transition-all cursor-pointer"
              >
                <span>Avançar para Prévia</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}

            {etapa === 3 && (
              <button
                type="button"
                disabled={isProcessing}
                onClick={handleExecuteImport}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-brand hover:bg-brand-hover text-white text-xs font-semibold shadow-xs hover:shadow-md transition-all active:scale-98 disabled:opacity-50 cursor-pointer"
              >
                {isProcessing ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Importando dados...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Confirmar e Importar</span>
                  </>
                )}
              </button>
            )}

            {etapa === 4 && (
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2.5 rounded-full bg-brand hover:bg-brand-hover text-white text-xs font-semibold shadow-xs hover:shadow-md transition-all cursor-pointer"
              >
                Concluir e Fechar
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
