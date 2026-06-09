'use client';
import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';

interface ModalCadastroModalidadeProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  modalidadeParaEditar?: any;
}

export function ModalCadastroModalidade({ isOpen, onClose, onSuccess, modalidadeParaEditar }: ModalCadastroModalidadeProps) {
  const [nome, setNome] = useState('');
  const [enviando, setEnviando] = useState(false);

  // Se houver uma modalidade selecionada para editar, popula o campo de texto
  useEffect(() => {
    if (modalidadeParaEditar) {
      setNome(modalidadeParaEditar.nome || '');
    } else {
      setNome('');
    }
  }, [modalidadeParaEditar, isOpen]);

  if (!isOpen) return null;

  async function handleSalvar(e: React.FormEvent) {
    e.preventDefault();
    if (!nome.trim()) return alert("Digite o nome da modalidade.");

    try {
      setEnviando(true);
      
      const modoEdicao = !!modalidadeParaEditar;
      const url = modoEdicao ? `/api/modalidade?id=${modalidadeParaEditar._id}` : '/api/modalidade';
      const method = modoEdicao ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome: nome.toUpperCase().trim() }) // Força caixa alta no banco
      });

      if (res.ok) {
        onSuccess(); // Recarrega a tabela de modalidades
        onClose();   // Fecha o modal
      } else {
        alert("Erro ao salvar dados da modalidade.");
      }
    } catch (err) {
      console.error("Erro no envio:", err);
      alert("Erro interno na requisição.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-md bg-[#0d0d0d] border border-zinc-800 rounded-xl overflow-hidden shadow-2xl">
        
        {/* Header do Modal */}
        <div className="flex items-center justify-between p-4 border-b border-zinc-900 bg-black">
          <h2 className="text-xs font-black uppercase tracking-widest text-white">
            {modalidadeParaEditar ? 'Editar Modalidade' : 'Nova Modalidade'}
          </h2>
          <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Formulário */}
        <form onSubmit={handleSalvar} className="p-4 space-y-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-black text-zinc-400 uppercase tracking-wider">
              Nome da Modalidade
            </label>
            <input
              type="text"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex: MOTOVELOCIDADE, KART, MOTOCROSS"
              className="w-full bg-black border border-zinc-800 focus:border-red-600 rounded-lg p-3 text-xs text-white uppercase tracking-wide font-medium placeholder-zinc-700 outline-none transition-all"
              disabled={enviando}
              autoFocus
            />
          </div>

          {/* Rodapé / Botões de Ação */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-900">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider text-zinc-400 hover:bg-zinc-900 border border-transparent hover:border-zinc-800 transition-all"
              disabled={enviando}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-lg text-xs font-black uppercase tracking-wider bg-red-600 hover:bg-red-700 text-white shadow-md shadow-red-900/20 transition-all"
              disabled={enviando}
            >
              {enviando ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}