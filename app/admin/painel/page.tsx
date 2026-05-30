"use client";

import React, { useState, useEffect, FormEvent } from "react";
import { Flag, Calendar, Layers, Activity, ChevronRight, Loader2, Plus, X, MapPin } from "lucide-react";

// ====================
// INTERFACES (TIPOS)
// ====================
interface IModalidade {
  _id: string;
  nome: string;
  ativo: boolean;
}

interface IEtapa {
  _id: string;
  nome: string;
  data: string;
  local: string;
  status: "Pendente" | "Em Andamento" | "Finalizado";
  modalidade: string | { _id: string; nome: string };
}

interface ICategoria {
  _id: string;
  nome: string;
  cor?: string;
}

interface IBateria {
  _id: string;
  nome: string;
  ordem: number;
  status: "Pendente" | "Em Andamento" | "Finalizada";
  categorias: ICategoria[];
  evento: string | { _id: string; nome: string };
}

export default function PainelCronometragem(): React.JSX.Element {
  // Listas principais vindas do banco
  const [modalidades, setModalidades] = useState<IModalidade[]>([]);
  const [etapas, setEtapas] = useState<IEtapa[]>([]);
  const [baterias, setBaterias] = useState<IBateria[]>([]);
  const [categoriasDisponiveis, setCategoriasDisponiveis] = useState<ICategoria[]>([]);

  // Seleções atuais do usuário
  const [modalidadeSel, setModalidadeSel] = useState<IModalidade | null>(null);
  const [etapaSel, setEtapaSel] = useState<IEtapa | null>(null);

  // Loadings de busca de dados
  const [loadingModalidades, setLoadingModalidades] = useState<boolean>(false);
  const [loadingEtapas, setLoadingEtapas] = useState<boolean>(false);
  const [loadingBaterias, setLoadingBaterias] = useState<boolean>(false);

  // Controles de visibilidade dos 3 Modais
  const [showModalModalidade, setShowModalModalidade] = useState<boolean>(false);
  const [showModalEtapa, setShowModalEtapa] = useState<boolean>(false);
  const [showModalBateria, setShowModalBateria] = useState<boolean>(false);

  // Estados dos formulários de cadastro
  const [novoNomeModalidade, setNovoNomeModalidade] = useState<string>("");
  const [novoNomeEtapa, setNovoNomeEtapa] = useState<string>("");
  const [novaDataEtapa, setNovaDataEtapa] = useState<string>("");
  const [novoLocalEtapa, setNovoLocalEtapa] = useState<string>("");
  const [novaModalidadeIdEtapa, setNovaModalidadeIdEtapa] = useState<string>("");
  
  const [novoNomeBateria, setNovoNomeBateria] = useState<string>("");
  const [novaOrdemBateria, setNovaOrdemBateria] = useState<number>(1);
  const [categoriasSelecionadas, setCategoriasSelecionadas] = useState<string[]>([]);

  const [isEnviandoForm, setIsEnviandoForm] = useState<boolean>(false);

  // 1. Carrega as Modalidades na inicialização
  async function carregarModalidades(): Promise<void> {
    setLoadingModalidades(true);
    try {
      const res = await fetch("/api/modalidade");
      const dados = await res.json();
      if (Array.isArray(dados)) setModalidades(dados);
    } catch (error) {
      console.error("Erro ao carregar modalidades:", error);
    } finally {
      setLoadingModalidades(false);
    }
  }

  useEffect(() => {
    carregarModalidades();
  }, []);

  // 2. Carrega as Etapas por Modalidade
  const carregarEtapasPorModalidade = async (modalidadeId: string): Promise<void> => {
    setLoadingEtapas(true);
    try {
      const res = await fetch(`/api/evento?modalidadeId=${modalidadeId}`);
      const dados = await res.json();
      if (Array.isArray(dados)) setEtapas(dados);
    } catch (error) {
      console.error("Erro ao carregar etapas:", error);
    } finally {
      setLoadingEtapas(false);
    }
  };

  const handleSelecionarModalidade = (modalidade: IModalidade): void => {
    setModalidadeSel(modalidade);
    setEtapaSel(null); 
    setBaterias([]);   
    carregarEtapasPorModalidade(modalidade._id);
  };

  // 3. Carrega as Baterias por Etapa
  const handleSelecionarEtapa = async (etapa: IEtapa): Promise<void> => {
    setEtapaSel(etapa);
    setLoadingBaterias(true);
    try {
      const res = await fetch(`/api/bateria?eventoId=${etapa._id}`);
      const dados = await res.json();
      if (Array.isArray(dados)) setBaterias(dados);
    } catch (error) {
      console.error("Erro ao carregar baterias:", error);
    } finally {
      setLoadingBaterias(false);
    }
  };

  // 4. Carrega as categorias do banco de dados (usado no modal de bateria)
  const carregarCategorias = async (): Promise<void> => {
    try {
      const res = await fetch("/api/categoria");
      const dados = await res.json();
      if (Array.isArray(dados)) setCategoriasDisponiveis(dados);
    } catch (error) {
      console.error("Erro ao carregar categorias:", error);
    }
  };

  // 🛠️ SUBMIT: Cadastrar Modalidade
  const handleSubmitModalidade = async (e: FormEvent): Promise<void> => {
    e.preventDefault();
    if (!novoNomeModalidade.trim()) return;

    setIsEnviandoForm(true);
    try {
      const res = await fetch("/api/modalidade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome: novoNomeModalidade }),
      });

      if (res.ok) {
        setNovoNomeModalidade("");
        setShowModalModalidade(false);
        await carregarModalidades();
      } else {
        const err = await res.json();
        alert(err.error || "Erro ao cadastrar modalidade.");
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsEnviandoForm(false);
    }
  };

  // 🛠️ SUBMIT: Cadastrar Etapa
  const handleSubmitEtapa = async (e: FormEvent): Promise<void> => {
    e.preventDefault();
    if (!novoNomeEtapa.trim() || !novaDataEtapa || !novaModalidadeIdEtapa || !novoLocalEtapa.trim()) return;

    setIsEnviandoForm(true);
    try {
      const res = await fetch("/api/evento", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome: novoNomeEtapa,
          data: novaDataEtapa,
          modalidade: novaModalidadeIdEtapa,
          local: novoLocalEtapa,
        }),
      });

      if (res.ok) {
        setNovoNomeEtapa("");
        setNovaDataEtapa("");
        setNovoLocalEtapa("");
        setShowModalEtapa(false);
        
        if (modalidadeSel && modalidadeSel._id === novaModalidadeIdEtapa) {
          await carregarEtapasPorModalidade(modalidadeSel._id);
        }
      } else {
        const err = await res.json();
        alert(err.error || "Erro ao cadastrar etapa.");
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsEnviandoForm(false);
    }
  };

  // 🛠️ SUBMIT: Cadastrar Bateria
  const handleSubmitBateria = async (e: FormEvent): Promise<void> => {
    e.preventDefault();
    if (!etapaSel || !novoNomeBateria.trim() || categoriasSelecionadas.length === 0) return;

    setIsEnviandoForm(true);
    try {
      const res = await fetch("/api/bateria", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome: novoNomeBateria,
          evento: etapaSel._id,
          categorias: categoriasSelecionadas,
          ordem: novaOrdemBateria,
        }),
      });

      if (res.ok) {
        setNovoNomeBateria("");
        setCategoriasSelecionadas([]);
        setNovaOrdemBateria(baterias.length + 2);
        setShowModalBateria(false);
        await handleSelecionarEtapa(etapaSel);
      } else {
        const err = await res.json();
        alert(err.error || "Erro ao cadastrar bateria.");
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsEnviandoForm(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6">
      {/* Cabeçalho principal */}
      <header className="mb-8 border-b border-slate-800 pb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <Activity className="text-red-500 animate-pulse" /> 
            SISTEMA DE CRONOMETRAGEM INDUSTRIAL
          </h1>
          <p className="text-slate-400 text-sm mt-1">Gerencie a estrutura completa do campeonato em tempo real</p>
        </div>
      </header>

      {/* Grid de 3 Colunas: Funil Dinâmico */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* COLUNA 1: MODALIDADES */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-4">
            <h2 className="text-lg font-semibold text-slate-200 flex items-center gap-2">
              <Layers className="text-blue-400 size-5" /> 1. Modalidades
            </h2>
            <button 
              onClick={() => setShowModalModalidade(true)}
              className="p-1 rounded bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 transition-all border border-blue-500/20"
              title="Nova Modalidade"
            >
              <Plus className="size-4" />
            </button>
          </div>
          
          {loadingModalidades ? (
            <div className="flex justify-center py-8"><Loader2 className="animate-spin text-blue-400" /></div>
          ) : (
            <div className="space-y-2">
              {modalidades.map((m) => (
                <button
                  key={m._id}
                  onClick={() => handleSelecionarModalidade(m)}
                  className={`w-full text-left p-3 rounded-lg border transition-all flex items-center justify-between font-medium ${
                    modalidadeSel?._id === m._id
                      ? "bg-blue-600 border-blue-500 text-white shadow-md shadow-blue-600/20"
                      : "bg-slate-800/50 border-slate-700/60 hover:bg-slate-800 hover:border-slate-600 text-slate-300"
                  }`}
                >
                  <span>{m.nome}</span>
                  <ChevronRight className="size-4 opacity-70" />
                </button>
              ))}
              {modalidades.length === 0 && <p className="text-slate-500 text-sm text-center py-4">Nenhuma modalidade encontrada.</p>}
            </div>
          )}
        </div>

        {/* COLUNA 2: ETAPAS */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-4">
            <h2 className="text-lg font-semibold text-slate-200 flex items-center gap-2">
              <Calendar className="text-green-400 size-5" /> 2. Etapas / Calendário
            </h2>
            <button 
              onClick={() => {
                if (modalidadeSel) setNovaModalidadeIdEtapa(modalidadeSel._id);
                setShowModalEtapa(true);
              }}
              className="p-1 rounded bg-green-600/10 hover:bg-green-600/20 text-green-400 transition-all border border-green-500/20"
              title="Nova Etapa"
            >
              <Plus className="size-4" />
            </button>
          </div>

          {!modalidadeSel ? (
            <div className="text-center py-12 text-slate-500 text-sm">
              Selecione uma modalidade para carregar as etapas.
            </div>
          ) : loadingEtapas ? (
            <div className="flex justify-center py-8"><Loader2 className="animate-spin text-green-400" /></div>
          ) : (
            <div className="space-y-2">
              <div className="text-xs text-blue-400 font-semibold uppercase tracking-wider mb-2">
                Filtro: {modalidadeSel.nome}
              </div>
              {etapas.map((e) => (
                <button
                  key={e._id}
                  onClick={() => handleSelecionarEtapa(e)}
                  className={`w-full text-left p-3 rounded-lg border transition-all flex items-center justify-between font-medium ${
                    etapaSel?._id === e._id
                      ? "bg-green-600 border-green-500 text-white shadow-md shadow-green-600/20"
                      : "bg-slate-800/50 border-slate-700/60 hover:bg-slate-800 hover:border-slate-600 text-slate-300"
                  }`}
                >
                  <div className="flex flex-col text-left">
                    <span>{e.nome}</span>
                    <span className="text-xs opacity-60 font-normal mt-0.5 flex items-center gap-1">
                      <MapPin className="size-3 text-slate-400" /> {e.local}
                    </span>
                    <span className="text-[10px] opacity-40 font-normal mt-0.5">
                      {new Date(e.data).toLocaleDateString('pt-BR')}
                    </span>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full border ${
                    e.status === 'Em Andamento' ? 'bg-amber-500/20 text-amber-400 border-amber-500/40 animate-pulse' :
                    e.status === 'Finalizado' ? 'bg-blue-500/20 text-blue-400 border-blue-500/40' : 'bg-slate-700/40 text-slate-400 border-slate-600/40'
                  }`}>
                    {e.status}
                  </span>
                </button>
              ))}
              {etapas.length === 0 && <p className="text-slate-500 text-sm text-center py-4">Nenhuma etapa cadastrada.</p>}
            </div>
          )}
        </div>

        {/* COLUNA 3: BATERIAS */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-4">
            <h2 className="text-lg font-semibold text-slate-200 flex items-center gap-2">
              <Flag className="text-red-400 size-5" /> 3. Baterias da Etapa
            </h2>
            <button 
              onClick={() => {
                if (!etapaSel) return alert("Selecione uma etapa primeiro!");
                carregarCategorias();
                setNovaOrdemBateria(baterias.length + 1);
                setShowModalBateria(true);
              }}
              className="p-1 rounded bg-red-600/10 hover:bg-red-600/20 text-red-400 transition-all border border-red-500/20"
              title="Nova Bateria"
            >
              <Plus className="size-4" />
            </button>
          </div>

          {!etapaSel ? (
            <div className="text-center py-12 text-slate-500 text-sm">
              Selecione uma etapa para listar as baterias.
            </div>
          ) : loadingBaterias ? (
            <div className="flex justify-center py-8"><Loader2 className="animate-spin text-red-400" /></div>
          ) : (
            <div className="space-y-2">
              <div className="text-xs text-green-400 font-semibold uppercase tracking-wider mb-2">
                Filtro: {etapaSel.nome}
              </div>
              {baterias.map((b) => (
                <div
                  key={b._id}
                  className="p-3 bg-slate-800/40 border border-slate-700/50 rounded-lg flex items-center justify-between hover:border-slate-600 transition-all"
                >
                  <div className="flex flex-col">
                    <span className="font-semibold text-slate-100 flex items-center gap-2">
                      <span className="text-xs text-slate-500 font-mono">#{b.ordem}</span>
                      {b.nome}
                    </span>
                    <div className="flex gap-1 mt-1 flex-wrap">
                      {b.categorias?.map((c) => (
                        <span key={c._id} className="text-[10px] px-1.5 py-0.5 rounded bg-slate-700 text-slate-300 font-medium">
                          {c.nome}
                        </span>
                      ))}
                    </div>
                  </div>

                  <button 
                    onClick={() => window.location.href = `/cronometragem/${b._id}`}
                    className="text-xs font-semibold bg-red-600 hover:bg-red-500 text-white px-3 py-1.5 rounded transition-all shadow-md shadow-red-600/10 active:scale-95"
                  >
                    Iniciar
                  </button>
                </div>
              ))}
              {baterias.length === 0 && <p className="text-slate-500 text-sm text-center py-4">Nenhuma bateria criada nesta etapa.</p>}
            </div>
          )}
        </div>
      </div>

      {/* ==================================================== */}
      {/* MODAL 1: CADASTRO DE MODALIDADE                     */}
      {/* ==================================================== */}
      {showModalModalidade && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-md w-full p-6 shadow-2xl relative">
            <button onClick={() => setShowModalModalidade(false)} className="absolute top-4 right-4 text-slate-400 hover:text-white">
              <X className="size-5" />
            </button>
            <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <Layers className="text-blue-400" /> Nova Modalidade / Esporte
            </h3>
            <form onSubmit={handleSubmitModalidade} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Nome da Modalidade</label>
                <input 
                  type="text" required placeholder="Ex: Motocross, Corrida de Rua" value={novoNomeModalidade}
                  onChange={(e) => setNovoNomeModalidade(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 text-sm"
                />
              </div>
              <div className="flex gap-3 justify-end pt-2">
                <button type="button" onClick={() => setShowModalModalidade(false)} className="px-4 py-2 text-sm bg-slate-800 text-slate-300 rounded-lg">Cancelar</button>
                <button type="submit" disabled={isEnviandoForm} className="px-4 py-2 text-sm font-semibold bg-blue-600 hover:bg-blue-500 text-white rounded-lg flex items-center gap-2 disabled:opacity-50">
                  {isEnviandoForm && <Loader2 className="animate-spin size-4" />} Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* MODAL 2: CADASTRO DE ETAPA                          */}
      {/* ==================================================== */}
      {showModalEtapa && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-md w-full p-6 shadow-2xl relative">
            <button onClick={() => setShowModalEtapa(false)} className="absolute top-4 right-4 text-slate-400 hover:text-white">
              <X className="size-5" />
            </button>
            <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <Calendar className="text-green-400" /> Nova Etapa / Evento
            </h3>
            <form onSubmit={handleSubmitEtapa} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Vincular à Modalidade</label>
                <select 
                  required value={novaModalidadeIdEtapa} onChange={(e) => setNovaModalidadeIdEtapa(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white focus:outline-none focus:border-green-500 text-sm"
                >
                  <option value="" disabled>Escolha a modalidade...</option>
                  {modalidades.map((m) => <option key={m._id} value={m._id}>{m.nome}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Nome da Etapa</label>
                <input 
                  type="text" required placeholder="Ex: Etapa Limeira, Etapa 1" value={novoNomeEtapa}
                  onChange={(e) => setNovoNomeEtapa(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white placeholder-slate-600 focus:outline-none focus:border-green-500 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Local / Pista da Etapa</label>
                <input 
                  type="text" required placeholder="Ex: Motódromo de Limeira, Centro de Eventos" value={novoLocalEtapa}
                  onChange={(e) => setNovoLocalEtapa(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white placeholder-slate-600 focus:outline-none focus:border-green-500 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Data do Evento</label>
                <input 
                  type="date" required value={novaDataEtapa} onChange={(e) => setNovaDataEtapa(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white focus:outline-none focus:border-green-500 text-sm"
                  style={{ colorScheme: "dark" }}
                />
              </div>
              <div className="flex gap-3 justify-end pt-2">
                <button type="button" onClick={() => setShowModalEtapa(false)} className="px-4 py-2 text-sm bg-slate-800 text-slate-300 rounded-lg">Cancelar</button>
                <button type="submit" disabled={isEnviandoForm} className="px-4 py-2 text-sm font-semibold bg-green-600 hover:bg-green-500 text-white rounded-lg flex items-center gap-2 disabled:opacity-50">
                  {isEnviandoForm && <Loader2 className="animate-spin size-4" />} Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* MODAL 3: CADASTRO DE BATERIA                        */}
      {/* ==================================================== */}
      {showModalBateria && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-md w-full p-6 shadow-2xl relative">
            <button onClick={() => setShowModalBateria(false)} className="absolute top-4 right-4 text-slate-400 hover:text-white">
              <X className="size-5" />
            </button>
            <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <Flag className="text-red-400" /> Nova Bateria
            </h3>
            <form onSubmit={handleSubmitBateria} className="space-y-4">
              <div className="p-2 bg-red-500/10 border border-red-500/20 rounded text-[11px] text-red-400 uppercase font-bold">
                Etapa: {etapaSel?.nome}
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Nome da Bateria</label>
                <input 
                  type="text" required placeholder="Ex: 1ª Bateria Oficial" value={novoNomeBateria}
                  onChange={(e) => setNovoNomeBateria(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white text-sm focus:outline-none focus:border-red-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase mb-2">Categorias Participantes</label>
                <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto p-2 bg-slate-950 rounded-lg border border-slate-800 select-none">
                  {categoriasDisponiveis.map(cat => (
                    <label key={cat._id} className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer hover:text-white">
                      <input 
                        type="checkbox" 
                        checked={categoriasSelecionadas.includes(cat._id)}
                        onChange={(e) => {
                          if (e.target.checked) setCategoriasSelecionadas([...categoriasSelecionadas, cat._id]);
                          else setCategoriasSelecionadas(categoriasSelecionadas.filter(id => id !== cat._id));
                        }}
                        className="rounded border-slate-700 bg-slate-800 text-red-600 focus:ring-red-500 size-4" 
                      />
                      {cat.nome}
                    </label>
                  ))}
                  {categoriasDisponiveis.length === 0 && <p className="text-xs text-slate-600 col-span-2 p-2">Nenhuma categoria cadastrada no sistema.</p>}
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Ordem da Prova (Sequência)</label>
                <input 
                  type="number" required value={novaOrdemBateria}
                  onChange={(e) => setNovaOrdemBateria(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white text-sm focus:outline-none focus:border-red-500"
                />
              </div>
              <div className="flex gap-3 justify-end pt-2">
                <button type="button" onClick={() => setShowModalBateria(false)} className="px-4 py-2 text-sm bg-slate-800 text-slate-300 rounded-lg">Cancelar</button>
                <button type="submit" disabled={isEnviandoForm} className="px-4 py-2 text-sm font-semibold bg-red-600 hover:bg-red-500 text-white rounded-lg flex items-center gap-2 disabled:opacity-50">
                  {isEnviandoForm && <Loader2 className="animate-spin size-4" />} Salvar Bateria
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}