'use client';
import React, { useState, useEffect } from 'react';
import { X, CheckCircle, Edit3, Calendar } from 'lucide-react';

interface ModalEventoProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  eventoParaEditar?: any;
}

export function ModalCadastroEvento({ isOpen, onClose, onSuccess, eventoParaEditar }: ModalEventoProps) {
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState<string | null>(null);

  // Estados do formulário
  const [nome, setNome] = useState('');
  const [data, setData] = useState('');
  const [local, setLocal] = useState('');
  const [status, setStatus] = useState('Pendente');

  const isEditing = !!eventoParaEditar;

  useEffect(() => {
    if (eventoParaEditar && isOpen) {
      setNome(eventoParaEditar.nome || '');
      setLocal(eventoParaEditar.local || '');
      setStatus(eventoParaEditar.status || 'Pendente');
      
      // Formata a data do banco (ISO) para o input yyyy-MM-dd
      if (eventoParaEditar.data) {
        const dataFormatada = new Date(eventoParaEditar.data).toISOString().split('T')[0];
        setData(dataFormatada);
      } else {
        setData('');
      }
    } else {
      limparCampos();
    }
  }, [eventoParaEditar, isOpen]);

  if (!isOpen) return null;

  const handleSalvar = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!nome.trim() || !data || !local.trim()) {
      setErro("Todos os campos marcados com * são obrigatórios.");
      return;
    }

    setLoading(true);
    setErro(null);

    try {
      const url = '/api/evento';
      const method = isEditing ? 'PUT' : 'POST';

      const payload = {
        id: eventoParaEditar?._id,
        nome: nome.trim(),
        data,
        local: local.trim(),
        status: isEditing ? status : 'Pendente'
      };

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const resultado = await response.json();
      if (!response.ok) throw new Error(resultado.error || "Erro ao salvar o evento.");

      setSucesso(isEditing ? "Evento atualizado com sucesso!" : "Evento cadastrado com sucesso!");
      onSuccess();
      setTimeout(() => fecharLimpar(), 1500);

    } catch (err: any) {
      setErro(err.message);
    } finally {
      setLoading(false);
    }
  };

  function limparCampos() {
    setNome('');
    setData('');
    setLocal('');
    setStatus('Pendente');
    setErro(null);
    setSucesso(null);
  }

  function fecharLimpar() {
    limparCampos();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-md bg-[#111] border border-gray-800 rounded-xl overflow-hidden shadow-2xl flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-800 bg-[#161616]">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            {isEditing ? (
              <><Edit3 className="text-red-600" size={20} /> Editar Evento</>
            ) : (
              <><Calendar className="text-red-600" size={20} /> Incluir Evento</>
            )}
          </h2>
          <button onClick={fecharLimpar} className="text-gray-400 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Conteúdo */}
        <div className="p-6 flex-1">
          {erro && <div className="p-3 mb-4 text-sm bg-red-950/40 border border-red-500/30 text-red-400 rounded-lg">{erro}</div>}
          {sucesso && (
            <div className="p-4 mb-4 text-sm bg-green-950/40 border border-green-500/30 text-green-400 rounded-lg flex items-center gap-2">
              <CheckCircle size={18} /> {sucesso}
            </div>
          )}

          <form onSubmit={handleSalvar} className="space-y-4">
            
            {/* Nome do Evento */}
            <div className="flex flex-col gap-1">
              <label className="text-sm text-gray-400">Nome do Evento *</label>
              <input 
                type="text" value={nome} onChange={e => setNome(e.target.value)}
                placeholder="Ex: 3ª Etapa FPMX - Vinhedo"
                className="bg-black border border-gray-800 rounded px-3 py-2 text-white focus:border-red-600 outline-none w-full text-sm"
              />
            </div>

            {/* Grid de Data e Local */}
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-sm text-gray-400">Data *</label>
                <input 
                  type="date" value={data} onChange={e => setData(e.target.value)}
                  className="bg-black border border-gray-800 rounded px-3 py-2 text-white focus:border-red-600 outline-none w-full text-sm scheme-dark"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-sm text-gray-400">Local / Pista *</label>
                <input 
                  type="text" value={local} onChange={e => setLocal(e.target.value)}
                  placeholder="Ex: Pista do Jacaré"
                  className="bg-black border border-gray-800 rounded px-3 py-2 text-white focus:border-red-600 outline-none w-full text-sm"
                />
              </div>
            </div>

            {/* Status (Exibido apenas na Edição) */}
            {isEditing && (
              <div className="flex flex-col gap-1">
                <label className="text-sm text-gray-400">Status do Evento</label>
                <select 
                  value={status} 
                  onChange={e => setStatus(e.target.value)}
                  className="bg-black border border-gray-800 rounded px-3 py-2 text-white focus:border-red-600 outline-none w-full text-sm"
                >
                  <option value="Pendente">Pendente</option>
                  <option value="Em Andamento">Em Andamento</option>
                  <option value="Finalizada">Finalizado</option>
                </select>
              </div>
            )}

            <button 
              type="submit" disabled={loading}
              className="w-full mt-6 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-medium py-2.5 rounded-lg transition-colors text-sm font-bold"
            >
              {loading ? 'Salvando...' : isEditing ? 'Atualizar Evento' : 'Cadastrar Evento'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}