'use client';
import React, { useState, useEffect } from 'react';
import { X, CheckCircle, Edit3, Layers } from 'lucide-react';

interface ModalCategoriaProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  categoriaParaEditar?: any;
}

export function ModalCadastroCategoria({ isOpen, onClose, onSuccess, categoriaParaEditar }: ModalCategoriaProps) {
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState<string | null>(null);

  // Estados do formulário (Apenas o Nome agora)
  const [nome, setNome] = useState('');

  const isEditing = !!categoriaParaEditar;

  useEffect(() => {
    if (categoriaParaEditar && isOpen) {
      setNome(categoriaParaEditar.nome || '');
    } else {
      limparCampos();
    }
  }, [categoriaParaEditar, isOpen]);

  if (!isOpen) return null;

  const handleSalvar = async (e: React.FormEvent) => {
    e.preventDefault();

    const nomeLimpo = nome ? nome.trim() : "";

    if (!nomeLimpo) {
      setErro("O nome da categoria é obrigatório.");
      return;
    }

    setLoading(true);
    setErro(null);

    try {
      const url = '/api/categoria';
      const method = isEditing ? 'PUT' : 'POST';

      const payload = {
        id: categoriaParaEditar?._id,
        nome: nomeLimpo
      };

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const resultado = await response.json();
      if (!response.ok) throw new Error(resultado.error || "Erro ao salvar categoria.");

      setSucesso(isEditing ? "Categoria atualizada com sucesso!" : "Categoria cadastrada com sucesso!");
      onSuccess();
      setTimeout(() => fecharLimpar(), 1500);

    } catch (err: any) {
      setErro(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Funções tradicionais para evitar erros de hoisting
  function limparCampos() {
    setNome('');
    setErro(null);
    setSucesso(null);
  }

  function fecharLimpar() {
    limparCampos();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-sm bg-[#111] border border-gray-800 rounded-xl overflow-hidden shadow-2xl flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-800 bg-[#161616]">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            {isEditing ? (
              <><Edit3 className="text-red-600" size={20} /> Editar Categoria</>
            ) : (
              <><Layers className="text-red-600" size={20} /> Incluir Categoria</>
            )}
          </h2>
          <button onClick={fecharLimpar} className="text-gray-400 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Conteúdo do Formulário */}
        <div className="p-6 flex-1">
          {erro && <div className="p-3 mb-4 text-sm bg-red-950/40 border border-red-500/30 text-red-400 rounded-lg">{erro}</div>}
          {sucesso && (
            <div className="p-4 mb-4 text-sm bg-green-950/40 border border-green-500/30 text-green-400 rounded-lg flex items-center gap-2">
              <CheckCircle size={18} /> {sucesso}
            </div>
          )}

          <form onSubmit={handleSalvar} className="space-y-4">
            {/* Nome da Categoria */}
            <div className="flex flex-col gap-1">
              <label className="text-sm text-gray-400">Nome da Categoria *</label>
              <input 
                type="text" value={nome} onChange={e => setNome(e.target.value)}
                placeholder="Ex: FPMX 1"
                className="bg-black border border-gray-800 rounded px-3 py-2 text-white focus:border-red-600 outline-none w-full"
              />
            </div>

            <button 
              type="submit" disabled={loading}
              className="w-full mt-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-medium py-2 rounded transition-colors"
            >
              {loading ? 'Salvando...' : isEditing ? 'Atualizar Categoria' : 'Cadastrar Categoria'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}