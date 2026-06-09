'use client';
import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { UserPlus, Search, ShieldCheck, Layers, ClipboardList, Wifi, WifiOff } from 'lucide-react';
import { useCorridaStore } from '@/app/store/useCorridaStore';

interface Categoria {
  _id: string;
  nome: string;
}

interface Piloto {
  _id: string;
  nome: string;
  numeral: string;
  transponder: string;
  categoriaId: string;
}

export default function PainelSecretaria() {
  const searchParams = useSearchParams();
  const store = useCorridaStore();
  
  // Captura o evento ativo vindo da URL (Ex: ?evento=ID_DO_EVENTO)
  const eventoId = searchParams.get('evento');

  // Estados da página
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [pilotos, setPilotos] = useState<Piloto[]>([]);
  const [busca, setBusca] = useState('');

  // Formulário de novo piloto
  const [nomePiloto, setNomePiloto] = useState('');
  const [numeralPiloto, setNumeralPiloto] = useState('');
  const [transponderPiloto, setTransponderPiloto] = useState('');
  const [categoriaSelecionada, setCategoriaSelecionada] = useState('');
  const [loading, setLoading] = useState(false);
  const [mensagem, setMensagem] = useState<{ tipo: 'sucesso' | 'erro', texto: string } | null>(null);

  // Carrega dados iniciais da secretaria
  useEffect(() => {
    if (eventoId) {
      carregarDadosSecretaria();
    }
  }, [eventoId]);

  const carregarDadosSecretaria = async () => {
    try {
      // Busca categorias atreladas a este evento
      const resCat = await fetch(`/api/categoria?evento=${eventoId}`);
      const dataCat = await resCat.json();
      setCategorias(Array.isArray(dataCat) ? dataCat : []);

      // Busca pilotos inscritos neste evento
      const resPilotos = await fetch(`/api/piloto?evento=${eventoId}`);
      const dataPilotos = await resPilotos.json();
      setPilotos(Array.isArray(dataPilotos) ? dataPilotos : []);
    } catch (err) {
      console.error("Erro ao carregar dados da secretaria:", err);
    }
  };

  const handleInscricaoPiloto = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nomePiloto.trim() || !numeralPiloto.trim() || !categoriaSelecionada) {
      setMensagem({ tipo: 'erro', texto: 'Preencha Nome, Numeral e selecione a Categoria.' });
      return;
    }

    setLoading(true);
    setMensagem(null);

    const payload = {
      nome: nomePiloto.trim(),
      numeral: numeralPiloto.trim(),
      transponder: transponderPiloto.trim(),
      categoriaId: categoriaSelecionada,
      eventoId: eventoId
    };

    try {
      const response = await fetch('/api/piloto', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) throw new Error("Falha ao salvar inscrição do piloto.");

      setMensagem({ tipo: 'sucesso', texto: 'Piloto inscrito e confirmado com sucesso!' });
      
      // Limpa formulário de inscrição
      setNomePiloto('');
      setNumeralPiloto('');
      setTransponderPiloto('');
      setCategoriaSelecionada('');
      
      // Recarrega a tabela de pilotos na tela
      carregarDadosSecretaria();
    } catch (err: any) {
      setMensagem({ tipo: 'erro', texto: err.message || 'Erro operacional ao inscrever.' });
    } finally {
      setLoading(false);
    }
  };

  // Filtro de pesquisa de pilotos em tempo real na tela
  const pilotosFiltrados = pilotos.filter(p => 
    p.nome.toLowerCase().includes(busca.toLowerCase()) || 
    p.numeral.includes(busca) ||
    p.transponder.toLowerCase().includes(busca.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-black text-white p-4 font-sans select-none">
      
      {/* HEADER DA SECRETARIA */}
      <div className="flex flex-col md:flex-row justify-between items-center bg-[#050505] border border-zinc-900 rounded-lg p-4 mb-4 gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded bg-blue-950/40 border border-blue-900/60 flex items-center justify-center text-blue-500">
            <ShieldCheck size={22} />
          </div>
          <div>
            <h1 className="text-lg font-black uppercase tracking-wider">Módulo Secretaria</h1>
            <p className="text-[10px] font-mono font-bold text-zinc-500 uppercase tracking-widest">
              Inscrições de Pilotos & Encaixe de Grids de LARGADA
            </p>
          </div>
        </div>

        {/* Indicador de Status Online/Offline */}
        <div className="flex items-center gap-2 px-3 py-1 bg-zinc-950 border border-zinc-900 rounded text-[10px] font-mono font-bold tracking-wider">
          {store.isOnline ? (
            <>
              <Wifi size={14} className="text-emerald-500" />
              <span className="text-emerald-400 uppercase">Banco Online Conectado</span>
            </>
          ) : (
            <>
              <WifiOff size={14} className="text-amber-500 animate-pulse" />
              <span className="text-amber-400 uppercase">Operando em Contingência Local</span>
            </>
          )}
        </div>
      </div>

      {/* CONTEÚDO PRINCIPAL (SPLIT: CADASTRO / LISTAGEM) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
        
        {/* COLUNA 1: FORMULÁRIO DE INSCRIÇÃO RÁPIDA */}
        <div className="bg-[#050505] border border-zinc-900 rounded-lg p-5 space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-zinc-900">
            <UserPlus size={18} className="text-blue-500" />
            <h2 className="text-sm font-black uppercase tracking-wider text-white">Nova Inscrição</h2>
          </div>

          {mensagem && (
            <div className={`p-3 border rounded text-xs font-mono ${
              mensagem.tipo === 'sucesso' 
                ? 'bg-emerald-950/20 border-emerald-900/50 text-emerald-400' 
                : 'bg-red-950/20 border-red-900/50 text-red-400'
            }`}>
              {mensagem.texto}
            </div>
          )}

          <form onSubmit={handleInscricaoPiloto} className="space-y-3 font-mono text-xs">
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-black tracking-wider text-zinc-500">Nome do Piloto</label>
              <input 
                type="text"
                value={nomePiloto}
                onChange={(e) => setNomePiloto(e.target.value)}
                placeholder="Ex: MARCOS DE SOUZA"
                className="w-full bg-black border border-zinc-800 focus:border-blue-600 rounded px-3 py-2 text-white outline-none uppercase"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-black tracking-wider text-zinc-500">Nº da Moto / Carro</label>
                <input 
                  type="text"
                  value={numeralPiloto}
                  onChange={(e) => setNumeralPiloto(e.target.value)}
                  placeholder="Ex: 412"
                  className="w-full bg-black border border-zinc-800 focus:border-blue-600 rounded px-3 py-2 text-white text-center font-black outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-black tracking-wider text-zinc-500">Transponder (RFID)</label>
                <input 
                  type="text"
                  value={transponderPiloto}
                  onChange={(e) => setTransponderPiloto(e.target.value)}
                  placeholder="Opcional"
                  className="w-full bg-black border border-zinc-800 focus:border-blue-600 rounded px-3 py-2 text-white text-center outline-none uppercase"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] uppercase font-black tracking-wider text-zinc-500">Categoria Vinculada</label>
              <select 
                value={categoriaSelecionada}
                onChange={(e) => setCategoriaSelecionada(e.target.value)}
                className="w-full bg-black border border-zinc-800 focus:border-blue-600 rounded px-3 py-2 text-zinc-300 outline-none cursor-pointer"
              >
                <option value="">-- Selecione a Classe --</option>
                {categorias.map((cat) => (
                  <option key={cat._id} value={cat._id}>{cat.nome}</option>
                ))}
              </select>
            </div>

            <button
              type="submit"
              disabled={loading || !eventoId}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-900 disabled:text-zinc-600 text-white font-black uppercase tracking-wider text-[11px] py-3 rounded transition-all mt-4"
            >
              {loading ? 'Processando Registro...' : 'Confirmar e Salvar Inscrição'}
            </button>
          </form>
        </div>

        {/* COLUNA 2 e 3: LISTAGEM DE PILOTOS INSCRITOS NO EVENTO */}
        <div className="bg-[#050505] border border-zinc-900 rounded-lg p-5 lg:col-span-2 space-y-4">
          
          {/* Topo com Barra de Busca */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-900">
            <div className="flex items-center gap-2">
              <ClipboardList size={18} className="text-zinc-400" />
              <h2 className="text-sm font-black uppercase tracking-wider text-white">
                Pilotos Confirmados ({pilotos.length})
              </h2>
            </div>

            {/* Input de Pesquisa Dinâmica */}
            <div className="relative flex items-center max-w-xs w-full">
              <Search size={14} className="absolute left-3 text-zinc-600" />
              <input 
                type="text"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar por Nome, Nº ou Tag..."
                className="w-full bg-black border border-zinc-800 focus:border-zinc-700 rounded pl-9 pr-3 py-1.5 text-xs text-white font-mono outline-none"
              />
            </div>
          </div>

          {/* TABELA DE PILOTOS */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse font-mono text-xs">
              <thead>
                <tr className="bg-[#121212] border-b border-zinc-800 text-zinc-500 font-bold uppercase text-[10px] tracking-wider">
                  <th className="py-2 px-3">Nº Moto</th>
                  <th className="py-2 px-4">Nome do Piloto</th>
                  <th className="py-2 px-4">Categoria Atribuída</th>
                  <th className="py-2 px-3 text-center">Código RFID</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-900">
                {pilotosFiltrados.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="text-center py-8 text-zinc-600 italic text-[11px]">
                      Nenhum piloto inscrito ou localizado para este contexto...
                    </td>
                  </tr>
                ) : (
                  pilotosFiltrados.map((piloto) => {
                    const minhaCat = categorias.find(c => c._id === piloto.categoriaId);
                    return (
                      <tr key={piloto._id} className="hover:bg-zinc-950/40 bg-[#080808]/50 transition-colors">
                        <td className="py-2.5 px-3">
                          <span className="bg-blue-950/50 text-blue-400 border border-blue-900/40 px-2 py-0.5 rounded font-black text-[11px]">
                            #{piloto.numeral}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 font-bold text-white uppercase">{piloto.nome}</td>
                        <td className="py-2.5 px-4 text-zinc-400 uppercase font-sans font-medium flex items-center gap-1.5">
                          <Layers size={12} className="text-zinc-600" />
                          {minhaCat ? minhaCat.nome : 'Sem Categoria'}
                        </td>
                        <td className="py-2.5 px-3 text-center text-zinc-600 text-[11px]">
                          {piloto.transponder || '---'}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

        </div>

      </div>

    </div>
  );
}