'use client';
import React, { useState, useEffect } from 'react';
import { X, CheckCircle, Edit3, Calendar } from 'lucide-react';

interface ModalEventoProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  eventoParaEditar?: any;
  idModalidadePadrao?: string; // 🌟 Nova propriedade injetada a partir do clique da modalidade
}

export function ModalCadastroEvento({ isOpen, onClose, onSuccess, eventoParaEditar, idModalidadePadrao }: ModalEventoProps) {
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState<string | null>(null);

  // Estado para armazenar as modalidades vindas do banco
  const [modalidadesDisponiveis, setModalidadesDisponiveis] = useState<any[]>([]);

  // Estados do formulário
  const [nome, setNome] = useState('');
  const [data, setData] = useState('');
  const [local, setLocal] = useState('');
  const [status, setStatus] = useState('Pendente');
  const [modalidadeId, setModalidadeId] = useState(''); // 🌟 Controla o ID da modalidade do evento

  const isEditing = !!eventoParaEditar;

  // Carrega a lista de modalidades cadastradas para popular o select
  async function buscarModalidades() {
    try {
      const res = await fetch('/api/modalidade');
      if (res.ok) {
        const dados = await res.json();
        if (Array.isArray(dados)) setModalidadesDisponiveis(dados);
      }
    } catch (err) {
      console.error("Erro ao carregar lista de modalidades no modal:", err);
    }
  }

  useEffect(() => {
    if (isOpen) {
      buscarModalidades();
    }
  }, [isOpen]);

  useEffect(() => {
    if (eventoParaEditar && isOpen) {
      setNome(eventoParaEditar.nome || '');
      setLocal(eventoParaEditar.local || '');
      setStatus(eventoParaEditar.status || 'Pendente');
      
      // Captura o ID da modalidade se ela for um objeto populado ou uma string direta
      const idMod = typeof eventoParaEditar.modalidade === 'object' 
        ? eventoParaEditar.modalidade?._id 
        : eventoParaEditar.modalidade;
      setModalidadeId(idMod || '');
      
      // Formata a data do banco (ISO) para o input yyyy-MM-dd
      if (eventoParaEditar.data) {
        const dataFormatada = new Date(eventoParaEditar.data).toISOString().split('T')[0];
        setData(dataFormatada);
      } else {
        setData('');
      }
    } else if (isOpen) {
      limparCampos();
      // 🌟 Se não for edição e houver uma modalidade padrão passada pelo clique, pré-seleciona ela
      if (idModalidadePadrao) {
        setModalidadeId(idModalidadePadrao);
      }
    }
  }, [eventoParaEditar, idModalidadePadrao, isOpen]);

  if (!isOpen) return null;

  const handleSalvar = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!nome.trim() || !data || !local.trim() || !modalidadeId) {
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
        modalidade: modalidadeId, // 🌟 Enviando o ID selecionado/vinculado para o banco
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
    setModalidadeId('');
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
          <h2 className="text-sm font-black uppercase tracking-widest text-white flex items-center gap-2">
            {isEditing ? (
              <><Edit3 className="text-red-600" size={16} /> Editar Evento</>
            ) : (
              <><Calendar className="text-red-600" size={16} /> Incluir Evento</>
            )}
          </h2>
          <button onClick={fecharLimpar} className="text-gray-400 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Conteúdo */}
        <div className="p-6 flex-1">
          {erro && <div className="p-3 mb-4 text-xs bg-red-950/40 border border-red-500/30 text-red-400 rounded-lg">{erro}</div>}
          {sucesso && (
            <div className="p-4 mb-4 text-xs bg-green-950/40 border border-green-500/30 text-green-400 rounded-lg flex items-center gap-2">
              <CheckCircle size={16} /> {sucesso}
            </div>
          )}

          <form onSubmit={handleSalvar} className="space-y-4">
            
            {/* Nome do Evento */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wide">Nome do Evento *</label>
              <input 
                type="text" value={nome} onChange={e => setNome(e.target.value)}
                placeholder="Ex: 3ª Etapa FPMX - Vinhedo"
                className="bg-black border border-gray-800 rounded-lg px-3 py-2.5 text-white focus:border-red-600 outline-none w-full text-xs transition-all"
                disabled={loading}
              />
            </div>

            {/* 🌟 Campo de Seleção da Modalidade Vinculada */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wide">Modalidade Esportiva *</label>
              <select
                value={modalidadeId}
                onChange={e => setModalidadeId(e.target.value)}
                className="bg-black border border-gray-800 rounded-lg px-3 py-2.5 text-white focus:border-red-600 outline-none w-full text-xs transition-all uppercase tracking-wide disabled:opacity-60 disabled:cursor-not-allowed"
                disabled={loading || !!idModalidadePadrao} // Trava a seleção caso venha do fluxo direcionado
              >
                <option value="" className="text-zinc-600">-- SELECIONE A MODALIDADE --</option>
                {modalidadesDisponiveis.map((mod) => (
                  <option key={mod._id} value={mod._id}>
                    {mod.nome}
                  </option>
                ))}
              </select>
              {idModalidadePadrao && (
                <p className="text-[10px] text-zinc-500 italic mt-0.5">Vínculo automático ativo com a modalidade selecionada.</p>
              )}
            </div>

            {/* Grid de Data e Local */}
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wide">Data *</label>
                <input 
                  type="date" value={data} onChange={e => setData(e.target.value)}
                  className="bg-black border border-gray-800 rounded-lg px-3 py-2.5 text-white focus:border-red-600 outline-none w-full text-xs scheme-dark transition-all"
                  disabled={loading}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wide">Local / Pista *</label>
                <input 
                  type="text" value={local} onChange={e => setLocal(e.target.value)}
                  placeholder="Ex: Pista do Jacaré"
                  className="bg-black border border-gray-800 rounded-lg px-3 py-2.5 text-white focus:border-red-600 outline-none w-full text-xs transition-all"
                  disabled={loading}
                />
              </div>
            </div>

            {/* Status (Exibido apenas na Edição) */}
            {isEditing && (
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wide">Status do Evento</label>
                <select 
                  value={status} 
                  onChange={e => setStatus(e.target.value)}
                  className="bg-black border border-gray-800 rounded-lg px-3 py-2.5 text-white focus:border-red-600 outline-none w-full text-xs transition-all uppercase tracking-wide"
                  disabled={loading}
                >
                  <option value="Pendente">Pendente</option>
                  <option value="Em Andamento">Em Andamento</option>
                  <option value="Finalizada">Finalizado</option>
                </select>
              </div>
            )}

            <button 
              type="submit" disabled={loading}
              className="w-full mt-6 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-black py-2.5 rounded-lg transition-colors text-xs uppercase tracking-wider shadow-md shadow-red-900/20"
            >
              {loading ? 'Salvando...' : isEditing ? 'Atualizar Evento' : 'Cadastrar Evento'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}