'use client';
import React, { useState, useRef } from 'react';
import { X, CheckCircle, Cpu, FileSpreadsheet, UploadCloud, AlertCircle } from 'lucide-react';

interface ModalImportarTagProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function ModalImportarTag({ isOpen, onClose, onSuccess }: ModalImportarTagProps) {
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState<string | null>(null);
  const [arquivoSelecionado, setArquivoSelecionado] = useState<File | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      
      // ALTERAÇÃO: Aceita .xlsx, .xls e .csv
      if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls') || file.name.endsWith('.csv')) {
        setArquivoSelecionado(file);
        setErro(null);
      } else {
        setErro("Selecione uma planilha válida do Excel (.xlsx) ou arquivo .CSV");
        setArquivoSelecionado(null);
      }
    }
  }

  async function handleEnviarArquivo(e: React.FormEvent) {
    e.preventDefault();
    if (!arquivoSelecionado) return setErro("Selecione um arquivo de carga antes de prosseguir.");

    setLoading(true);
    setErro(null);
    setSucesso(null);

    try {
      const formData = new FormData();
      formData.append("file", arquivoSelecionado);

      const res = await fetch('/api/tag/importar', {
        method: 'POST',
        body: formData
      });

      const resultado = await res.json();
      if (!res.ok) throw new Error(resultado.error || "Erro ao processar planilha.");

      setSucesso(resultado.message);
      onSuccess();
      setTimeout(() => fecharLimpar(), 3000);
    } catch (err: any) {
      setErro(err.message);
    } finally {
      setLoading(false);
    }
  }

  function fecharLimpar() {
    setArquivoSelecionado(null);
    setErro(null);
    setSucesso(null);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-md bg-[#111] border border-gray-800 rounded-xl overflow-hidden shadow-2xl flex flex-col">
        
        <div className="flex items-center justify-between p-4 border-b border-gray-800 bg-[#161616]">
          <h2 className="text-sm font-bold text-white flex items-center gap-2 tracking-wide uppercase">
            <Cpu className="text-red-600" size={18} /> Carga de Chips via Planilha
          </h2>
          <button onClick={fecharLimpar} className="text-gray-400 hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="p-6">
          {erro && (
            <div className="p-3 mb-4 text-xs bg-red-950/40 border border-red-500/30 text-red-400 rounded-lg flex items-center gap-2">
              <AlertCircle size={14} className="shrink-0" /> {erro}
            </div>
          )}
          {sucesso && (
            <div className="p-4 mb-4 text-xs bg-green-950/40 border border-green-500/30 text-green-400 rounded-lg flex items-start gap-2.5">
              <CheckCircle size={16} className="text-green-500 shrink-0 mt-0.5" />
              <p className="leading-normal">{sucesso}</p>
            </div>
          )}

          <form onSubmit={handleEnviarArquivo} className="space-y-5">
            
            <div 
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-3
                ${arquivoSelecionado 
                  ? 'border-red-600/50 bg-red-950/5' 
                  : 'border-gray-800 bg-black/30 hover:border-gray-700 hover:bg-black/50'}`}
            >
              {/* ALTERAÇÃO: Mimes e extensões liberadas no accept */}
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                accept=".xlsx, .xls, .csv" 
                className="hidden" 
              />
              
              {arquivoSelecionado ? (
                <>
                  <FileSpreadsheet className="text-red-500 animate-bounce" size={40} />
                  <div className="flex flex-col gap-0.5">
                    <span className="text-xs font-bold text-white truncate max-w-xs">{arquivoSelecionado.name}</span>
                    <span className="text-[10px] text-gray-500 font-mono">{(arquivoSelecionado.size / 1024).toFixed(1)} KB</span>
                  </div>
                </>
              ) : (
                <>
                  <UploadCloud className="text-gray-600" size={40} />
                  <div className="flex flex-col gap-1">
                    <span className="text-xs font-semibold text-gray-300">Selecione o arquivo de chips</span>
                    <span className="text-[10px] text-gray-500">Aceita formatos Excel (.xlsx) ou (.csv)</span>
                  </div>
                </>
              )}
            </div>

            <div className="bg-white/[0.01] border border-gray-900 rounded-lg p-3 flex flex-col gap-1.5">
              <span className="text-[10px] uppercase tracking-wider text-gray-500 font-bold">Colunas Obrigatórias (Linha 1):</span>
              <div className="grid grid-cols-2 gap-2 text-center text-xs font-mono">
                <div className="bg-black p-2 rounded border border-gray-900 text-gray-400">Coluna A: <b className="text-white">Num</b></div>
                <div className="bg-black p-2 rounded border border-gray-900 text-gray-400">Coluna B: <b className="text-white">Tag</b></div>
              </div>
            </div>

            <button 
              type="submit" 
              disabled={loading || !arquivoSelecionado}
              className="w-full bg-red-600 hover:bg-red-700 disabled:opacity-30 disabled:pointer-events-none text-white font-bold py-2.5 rounded-lg transition-all text-sm shadow-md shadow-red-900/10"
            >
              {loading ? 'Processando Planilha...' : 'Processar e Importar Planilha'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}