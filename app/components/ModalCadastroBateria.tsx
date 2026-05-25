'use client';
import React, { useState, useEffect } from 'react';
import { X, CheckCircle, Edit3, Flag, ListChecks, Calendar } from 'lucide-react';

interface ModalBateriaProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  bateriaParaEditar?: any;
}

export function ModalCadastroBateria({ isOpen, onClose, onSuccess, bateriaParaEditar }: ModalBateriaProps) {
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState<string | null>(null);

  // Estados do formulário
  const [nome, setNome] = useState('');
  const [eventoSelecionado, setEventoSelecionado] = useState(''); // ID do evento
  const [categoriasSelecionadas, setCategoriasSelecionadas] = useState<string[]>([]);
  
  // Listas vindas do banco
  const [categoriasBanco, setCategoriasBanco] = useState<any[]>([]);
  const [eventosBanco, setEventosBanco] = useState<any[]>([]); // Lista de eventos

  const isEditing = !!bateriaParaEditar;

  // 1. Carrega dados necessários do banco
  useEffect(() => {
    async function carregarDados() {
      try {
        const [resCat, resEvt] = await Promise.all([
          fetch('/api/categoria'),
          fetch('/api/evento')
        ]);
        
        const dadosCat = await resCat.json();
        const dadosEvt = await resEvt.json();
        
        setCategoriasBanco(dadosCat);
        setEventosBanco(dadosEvt);
      } catch (err) {
        console.error("Erro ao carregar dados auxiliares.", err);
      }
    }
    if (isOpen) carregarDados();
  }, [isOpen]);

  // 2. Preenche se for edição
  useEffect(() => {
    if (bateriaParaEditar && isOpen) {
      setNome(bateriaParaEditar.nome || '');
      setEventoSelecionado(bateriaParaEditar.evento?._id || bateriaParaEditar.evento || '');
      const ids = bateriaParaEditar.categorias?.map((c: any) => typeof c === 'string' ? c : c._id) || [];
      setCategoriasSelecionadas(ids);
    } else {
      limparCampos();
    }
  }, [bateriaParaEditar, isOpen]);

  if (!isOpen) return null;

  function toggleCategoria(id: string) {
    if (categoriasSelecionadas.includes(id)) {
      setCategoriasSelecionadas(categoriasSelecionadas.filter(item => item !== id));
    } else {
      setCategoriasSelecionadas([...categoriasSelecionadas, id]);
    }
  }

  async function handleSalvar(e: React.FormEvent) {
    e.preventDefault();
    if (!nome) return setErro("O nome da bateria é obrigatório.");
    if (!eventoSelecionado) return setErro("Selecione um evento para esta bateria.");
    if (categoriasSelecionadas.length === 0) return setErro("Selecione ao menos uma categoria.");

    setLoading(true);
    setErro(null);

    try {
      const url = '/api/bateria';
      const method = isEditing ? 'PUT' : 'POST';
      const payload = {
        id: bateriaParaEditar?._id,
        nome: nome.trim(),
        evento: eventoSelecionado, // Envia o ID do evento
        categorias: categoriasSelecionadas,
      };

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const resultado = await res.json();
      if (!res.ok) throw new Error(resultado.error || "Erro ao salvar bateria.");

      setSucesso(isEditing ? "Bateria atualizada!" : "Bateria criada!");
      onSuccess();
      setTimeout(() => fecharLimpar(), 1500);
    } catch (err: any) {
      setErro(err.message);
    } finally {
      setLoading(false);
    }
  }

  function limparCampos() {
    setNome('');
    setEventoSelecionado('');
    setCategoriasSelecionadas([]);
    setErro(null);
    setSucesso(null);
  }

  function fecharLimpar() {
    limparCampos();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-[#111] border border-gray-800 rounded-xl overflow-hidden shadow-2xl flex flex-col">
        
        <div className="flex items-center justify-between p-4 border-b border-gray-800 bg-[#161616]">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            {isEditing ? <Edit3 className="text-red-600" size={20} /> : <Flag className="text-red-600" size={20} />}
            {isEditing ? "Editar Bateria" : "Nova Bateria"}
          </h2>
          <button onClick={fecharLimpar} className="text-gray-400 hover:text-white transition-colors"><X size={20} /></button>
        </div>

        <div className="p-6">
          {erro && <div className="p-3 mb-4 text-xs bg-red-950/40 border border-red-500/30 text-red-400 rounded-lg">{erro}</div>}
          {sucesso && <div className="p-4 mb-4 text-xs bg-green-950/40 border border-green-500/30 text-green-400 rounded-lg flex items-center gap-2"><CheckCircle size={18} /> {sucesso}</div>}

          <form onSubmit={handleSalvar} className="space-y-4">
            
            {/* Nome da Bateria */}
            <div className="flex flex-col gap-1">
              <label className="text-sm text-gray-400">Nome da Bateria *</label>
              <input 
                type="text" value={nome} onChange={e => setNome(e.target.value)}
                placeholder="Ex: 1ª Corrida - Força Livre"
                className="bg-black border border-gray-800 rounded px-3 py-2 text-white focus:border-red-600 outline-none w-full text-sm"
              />
            </div>

            {/* SELETOR DE EVENTO VINCULADO */}
            <div className="flex flex-col gap-1">
              <label className="text-sm text-gray-400 flex items-center gap-1">
                <Calendar size={14} /> Vincular ao Evento *
              </label>
              <select
                value={eventoSelecionado}
                onChange={e => setEventoSelecionado(e.target.value)}
                className="bg-black border border-gray-800 rounded px-3 py-2 text-white focus:border-red-600 outline-none w-full text-sm"
              >
                <option value="">-- Selecione o Evento --</option>
                {eventosBanco.map(evt => (
                  <option key={evt._id} value={evt._id}>
                    {evt.nome} ({new Date(evt.data).toLocaleDateString('pt-BR')})
                  </option>
                ))}
              </select>
            </div>

            {/* Grid de Categorias */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm text-gray-400 flex items-center gap-2">
                <ListChecks size={16} /> Categorias participantes nesta largada
              </label>
              <div className="bg-black/50 border border-gray-800 rounded-lg p-3 max-h-40 overflow-y-auto grid grid-cols-2 gap-2 custom-scrollbar">
                {categoriasBanco.map((cat) => {
                  const selecionada = categoriasSelecionadas.includes(cat._id);
                  return (
                    <div 
                      key={cat._id} onClick={() => toggleCategoria(cat._id)}
                      className={`cursor-pointer px-3 py-2 rounded border text-xs font-medium transition-all flex items-center justify-between
                        ${selecionada ? 'bg-red-600/10 border-red-600 text-red-500' : 'bg-gray-900 border-gray-800 text-gray-400 hover:border-gray-600'}`}
                    >
                      {cat.nome}
                      {selecionada && <CheckCircle size={14} />}
                    </div>
                  );
                })}
              </div>
            </div>

            <button 
              type="submit" disabled={loading}
              className="w-full mt-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-bold py-2.5 rounded-lg transition-all text-sm"
            >
              {loading ? 'Processando...' : isEditing ? 'Atualizar Bateria' : 'Criar Bateria'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}