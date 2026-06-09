'use client';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Users, Timer, Layers, Calendar, MapPin, 
  Zap, FileText, Cpu, BarChart3, ChevronRight, ArrowLeft 
} from 'lucide-react';

interface Evento { 
  _id: string; 
  nome: string; 
  data: string; 
  local: string; 
  status: string;
  modalidadeId?: { _id: string; nome: string; } | string; 
}
interface Categoria { _id: string; nome: string; }
interface Bateria { _id: string; nome: string; tempoProva: number; voltasExtras: number; categoriesIds: string[]; }

interface Piloto { 
  _id: string; 
  nome: string; 
  numeral: string; 
  transponder: string; 
  categoriasIds: string[]; 
  eventoId: string; 
}

export default function PainelAdmin() {
  // Controle de Abas principais do Menu Lateral
  const [activeTab, setActiveTab] = useState<'dashboard' | 'relatorios_global'>('dashboard');
  const [bateriaAtivaId, setBateriaAtivaId] = useState<string>(''); 
  const router = useRouter();
  
  // Controle de Sub-view dentro de um evento específico
  const [view, setView] = useState<'lista' | 'detalhes_evento'>('lista');

  // Métricas rápidas para o topo do painel
  const [metricas, setMetricas] = useState({ eventosNoAno: 0, eventosNoMes: 0, chipsLivres: 493 });
  
  // Estados de Dados
  const [eventosAtivos, setEventosAtivos] = useState<Evento[]>([]);
  const [todosEventosHistorico, setTodosEventosHistorico] = useState<Evento[]>([]);
  const [eventoAtivo, setEventoAtivo] = useState<Evento | null>(null);
  const [modalidades, setModalidades] = useState<{ _id: string; nome: string }[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [baterias, setBaterias] = useState<Bateria[]>([]);
  const [pilotos, setPilotos] = useState<Piloto[]>([]);
  
  // Estados de Carregamento (Loadings)
  const [loadingEvento, setLoadingEvento] = useState(false);
  const [loadingCategoria, setLoadingCategoria] = useState(false);
  const [loadingBateria, setLoadingBateria] = useState(false);
  const [loadingPiloto, setLoadingPiloto] = useState(false);

  // Estados de Formulários
  const [novaModalidadeNome, setNovaModalidadeNome] = useState('');
  const [modalidadeEvId, setModalidadeEvId] = useState('');
  const [nomeEv, setNomeEv] = useState('');
  const [localEv, setLocalEv] = useState('');
  const [dataEv, setDataEv] = useState('');

  // Estados para montagem de nova bateria
  const [nomeBat, setNomeBat] = useState('');
  const [tempoBat, setTempoBat] = useState('15');
  const [voltasBat, setVoltasBat] = useState('2');
  const [catsSelecionadas, setCatsSelecionadas] = useState<string[]>([]);

  // Estados do formulário de piloto
  const [nomePiloto, setNomePiloto] = useState('');
  const [numeralPiloto, setNumeralPiloto] = useState('');
  const [transponderPiloto, setTransponderPiloto] = useState('');
  const [catsPilotoSelecionadas, setCatsPilotoSelecionadas] = useState<string[]>([]);

  useEffect(() => {
    carregarPainelInicial();
  }, []);

  const carregarPainelInicial = async () => {
    try {
      const resEv = await fetch('/api/evento?status=ativos');
      if (resEv.ok) setEventosAtivos(await resEv.json());

      const resMod = await fetch('/api/modalidade');
      if (resMod.ok) {
        const dadosMod = await resMod.json();
        setModalidades(dadosMod || []);
        if (dadosMod && dadosMod.length > 0) setModalidadeEvId(dadosMod[0]._id);
      }

      const resMetricas = await fetch('/api/admin/metricas');
      if (resMetricas.ok) {
        setMetricas(await resMetricas.json());
      }
    } catch (err) { 
      console.error("Erro ao carregar dados iniciais:", err); 
    }
  };

  const entrarNoEvento = async (ev: Evento) => {
    setEventoAtivo(ev);
    setView('detalhes_evento');
    
    setNomePiloto(''); 
    setNumeralPiloto(''); 
    setTransponderPiloto(''); 
    setCatsPilotoSelecionadas([]);
    
    try {
      const [resCat, resBat, resPil] = await Promise.all([
        fetch(`/api/categoria?evento=${ev._id}`),
        fetch(`/api/bateria?evento=${ev._id}`),
        fetch(`/api/piloto?evento=${ev._id}`)
      ]);
      
      if (resCat.ok) setCategorias(await resCat.json());
      if (resBat.ok) setBaterias(await resBat.json());
      if (resPil.ok) setPilotos(await resPil.json());
    } catch (err) { console.error(err); }
  };

  const handleCriarEvento = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nomeEv.trim() || !localEv.trim() || !dataEv || !modalidadeEvId) {
      alert("Por favor, preencha todos os campos.");
      return;
    }

    setLoadingEvento(true);
    try {
      const res = await fetch('/api/evento', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome: nomeEv, local: localEv, data: dataEv, modalidadeId: modalidadeEvId })
      });
      if (res.ok) {
        setNomeEv(''); setLocalEv(''); setDataEv('');
        await carregarPainelInicial();
      } else {
        alert("Erro ao criar o evento.");
      }
    } catch (err) { console.error(err); }
    setLoadingEvento(false);
  };

  const handleCriarModalidade = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!novaModalidadeNome.trim()) return;
    const res = await fetch('/api/modalidade', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nome: novaModalidadeNome })
    });
    if (res.ok) {
      setNovaModalidadeNome('');
      carregarPainelInicial();
    }
  };

  const handleCriarBateria = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nomeBat.trim() || !eventoAtivo || catsSelecionadas.length === 0) {
      alert("Informe o nome da bateria e selecione pelo menos uma categoria.");
      return;
    }

    setLoadingBateria(true);
    try {
      const res = await fetch('/api/bateria', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome: nomeBat,
          tempoProva: Number(tempoBat),
          voltasExtras: Number(voltasBat),
          categoriasIds: catsSelecionadas,
          eventoId: eventoAtivo._id
        })
      });

      if (res.ok) {
        setNomeBat('');
        setCatsSelecionadas([]);
        await entrarNoEvento(eventoAtivo);
      } else {
        alert("Erro ao criar bateria.");
      }
    } catch (err) { console.error(err); }
    setLoadingBateria(false);
  };

  const handleCriarPiloto = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nomePiloto.trim() || !numeralPiloto.trim() || catsPilotoSelecionadas.length === 0 || !eventoAtivo) {
        alert("Preencha Nome, Numeral e marque ao menos uma Categoria.");
        return;
    }

    setLoadingPiloto(true);
    try {
        const res = await fetch('/api/piloto', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
              nome: nomePiloto,
              numeral: numeralPiloto,
              transponder: transponderPiloto,
              categoriasIds: catsPilotoSelecionadas, 
              eventoId: eventoAtivo._id
          })
        });

        if (res.ok) {
          setTransponderPiloto('');
          setCatsPilotoSelecionadas([]); 
          await entrarNoEvento(eventoAtivo);
        } else {
          alert("Erro ao cadastrar o piloto.");
        }
    } catch (err) { console.error(err); }
    setLoadingPiloto(false);
  };

  const handleToggleCategoriaPiloto = (id: string) => {
    setCatsPilotoSelecionadas(prev => 
      prev.includes(id) ? prev.filter(catId => catId !== id) : [...prev, id]
    );
  };

  const obterNomesCategorias = (ids: string[]) => {
    return ids
      .map(id => categorias.find(c => c._id === id)?.nome)
      .filter(Boolean)
      .join(', ');
  };

  return (
    // AJUSTE: h-screen e max-h-screen travam o tamanho da janela inteira no monitor
    <div className="flex h-screen max-h-screen bg-[#070708] text-zinc-100 font-sans antialiased overflow-hidden print:bg-white print:text-black">
      
      {/* MENU LATERAL */}
      <aside className="w-64 bg-[#0c0c0e] border-r border-zinc-900 flex flex-col shrink-0 print:hidden">
        <div className="p-6 border-b border-zinc-900 flex items-center gap-3">
          <img src="/FPMX-logo.png" alt="Logo Cronoka" className="w-12 h-12 object-contain" />     
          <div>
            <h2 className="text-xs font-black tracking-wider uppercase text-white">CRONOKA</h2>
            <p className="text-[9px] font-mono font-bold text-zinc-500 uppercase tracking-widest">Controle de Corrida</p>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1 text-xs font-medium text-zinc-400">
          <button 
            onClick={() => { setActiveTab('dashboard'); setView('lista'); }} 
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${activeTab === 'dashboard' ? 'bg-zinc-900 text-white font-bold border-l-2 border-red-600' : 'hover:bg-zinc-950 hover:text-zinc-200'}`}
          >
            <BarChart3 size={16} className={activeTab === 'dashboard' ? 'text-red-500' : ''} /> Painel Principal
          </button>
        </nav>
      </aside>

      {/* CONTEÚDO CENTRAL */}
      {/* AJUSTE: O main agora tem h-full e overflow-y-auto controlado */}
      <main className="flex-1 h-full overflow-y-auto p-8 pr-6 print:p-0">
        
        {activeTab === 'dashboard' && (
          <div className="space-y-6 max-w-7xl mx-auto">
            {view === 'lista' ? (
              <>
                <div>
                  <h1 className="text-2xl font-black uppercase tracking-tight text-white">Painel Operacional</h1>
                  <p className="text-xs text-zinc-500 font-mono">Exibindo apenas cronogramas ativos e etapas não finalizadas da temporada.</p>
                </div>

                {/* MÉTRICAS */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-[#0c0c0e] border border-zinc-900 p-4 rounded-xl flex justify-between items-center">
                    <div>
                      <p className="text-[10px] font-mono font-bold text-zinc-500 uppercase tracking-wider">Transponders Livres</p>
                      <p className="text-2xl font-black mt-1 text-emerald-500">{metricas.chipsLivres}</p>
                    </div>
                    <div className="p-2.5 bg-emerald-950/20 border border-emerald-900/40 rounded-lg text-emerald-500"><Cpu size={20} /></div>
                  </div>

                  <div className="bg-[#0c0c0e] border border-zinc-900 p-4 rounded-xl flex justify-between items-center">
                    <div>
                      <p className="text-[10px] font-mono font-bold text-zinc-500 uppercase tracking-wider">Provas no Mês</p>
                      <p className="text-2xl font-black mt-1 text-amber-500">{metricas.eventosNoMes}</p>
                    </div>
                    <div className="p-2.5 bg-amber-950/20 border border-amber-900/40 rounded-lg text-amber-500"><Calendar size={20} /></div>
                  </div>

                  <div className="bg-[#0c0c0e] border border-zinc-900 p-4 rounded-xl flex justify-between items-center">
                    <div>
                      <p className="text-[10px] font-mono font-bold text-zinc-500 uppercase tracking-wider">Temporada Completa</p>
                      <p className="text-2xl font-black mt-1 text-red-500">{metricas.eventosNoAno}</p>
                    </div>
                    <div className="p-2.5 bg-red-950/20 border border-red-900/40 rounded-lg text-red-500"><Zap size={20} /></div>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                  {/* CADASTROS */}
                  <div className="bg-[#0c0c0e] border border-zinc-900 p-5 rounded-xl space-y-4">
                    <div className="space-y-2 pb-3 border-b border-zinc-900">
                      <label className="text-[10px] font-mono font-bold uppercase text-zinc-500">Nova Modalidade</label>
                      <div className="flex gap-1 font-mono text-xs">
                        <input type="text" placeholder="EX: VELOCROSS" value={novaModalidadeNome} onChange={e => setNovaModalidadeNome(e.target.value)} className="flex-1 bg-black border border-zinc-800 rounded p-2 text-white outline-none uppercase" />
                        <button type="button" onClick={handleCriarModalidade} className="bg-zinc-900 border border-zinc-800 text-white px-3 rounded font-bold">+</button>
                      </div>
                    </div>

                    <h2 className="text-xs font-black uppercase tracking-wider text-zinc-300">Novo Evento</h2>
                    <form onSubmit={handleCriarEvento} className="space-y-3 font-mono text-xs">
                      <input type="text" placeholder="Nome da Prova" value={nomeEv} onChange={e => setNomeEv(e.target.value)} className="w-full bg-black border border-zinc-800 rounded p-2 text-white outline-none uppercase" required />
                      <input type="text" placeholder="Local / Motódromo" value={localEv} onChange={e => setLocalEv(e.target.value)} className="w-full bg-black border border-zinc-800 rounded p-2 text-white outline-none uppercase" required />
                      <div className="grid grid-cols-2 gap-2">
                        <input type="date" value={dataEv} onChange={e => setDataEv(e.target.value)} className="w-full bg-black border border-zinc-800 rounded p-2 text-zinc-300 outline-none uppercase" required />
                        <select value={modalidadeEvId} onChange={e => setModalidadeEvId(e.target.value)} className="w-full bg-black border border-zinc-800 rounded p-2 text-zinc-300 outline-none uppercase">
                          {modalidades?.map(mod => <option key={mod._id} value={mod._id}>{mod.nome}</option>)}
                        </select>
                      </div>
                      <button type="submit" disabled={loadingEvento} className={`w-full font-black py-2.5 rounded text-[11px] transition-all ${loadingEvento ? 'bg-zinc-800 text-zinc-500 animate-pulse cursor-not-allowed' : 'bg-red-600 hover:bg-red-700 text-white'}`}>
                        {loadingEvento ? "PROCESSANDO GRID..." : "ABRIR EVENTO OFICIAL"}
                      </button>
                    </form>
                  </div>

                  {/* LISTA DE EVENTOS ATIVOS */}
                  <div className="lg:col-span-2 space-y-2">
                    <h2 className="text-xs font-black uppercase tracking-wider text-zinc-500 font-mono">Etapas Ativas em Execução</h2>
                    {!eventosAtivos || eventosAtivos.length === 0 ? (
                      <div className="p-8 text-center text-zinc-600 bg-[#0c0c0e] rounded-xl border border-zinc-900 italic font-mono text-xs">Nenhum evento ativo no momento.</div>
                    ) : (
                      eventosAtivos.map(ev => (
                        <div key={ev._id} onClick={() => entrarNoEvento(ev)} className="bg-[#0c0c0e] border border-zinc-900 p-4 rounded-xl flex justify-between items-center hover:border-zinc-700 cursor-pointer transition-all group">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="text-[9px] font-mono bg-black text-red-500 border border-zinc-800 px-1.5 py-0.5 rounded uppercase font-bold">
                                {typeof ev.modalidadeId === 'object' ? ev.modalidadeId?.nome : 'Outros'}
                              </span>
                              <h3 className="text-sm font-black text-white uppercase">{ev.nome}</h3>
                            </div>
                            <p className="text-xs text-zinc-500 font-mono flex items-center gap-3">
                              <span>{ev.data ? new Date(ev.data).toLocaleDateString('pt-BR') : ''}</span>
                              <span>•</span>
                              <span>{ev.local}</span>
                            </p>
                          </div>
                          <ChevronRight size={16} className="text-zinc-600 group-hover:text-white" />
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </>
            ) : (
              /* DENTRO DO CONFIGURADOR DO EVENTO */
              <div className="space-y-6 pb-6">
                <button onClick={() => { setView('lista'); }} className="flex items-center gap-2 text-xs font-bold text-zinc-500 hover:text-white font-mono uppercase transition-colors">
                  <ArrowLeft size={14} className="text-red-600" /> Voltar à lista de Ativos
                </button>

                <div className="bg-[#0c0c0e] border border-zinc-900 p-5 rounded-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div>
                    <span className="text-[9px] font-mono bg-black text-red-500 border border-zinc-800 px-2 py-0.5 rounded font-bold uppercase">
                      {typeof eventoAtivo?.modalidadeId === 'object' ? eventoAtivo?.modalidadeId?.nome : 'Grid'}
                    </span>
                    <h1 className="text-xl font-black text-white uppercase mt-1">{eventoAtivo?.nome}</h1>
                    <p className="text-xs text-zinc-500 font-mono">{eventoAtivo?.local} — {eventoAtivo?.data ? new Date(eventoAtivo.data).toLocaleDateString('pt-BR') : ''}</p>
                  </div>
                  
                  <button 
                    onClick={async () => {
                      if(confirm("Deseja realmente finalizar este evento?")) {
                        await fetch(`/api/evento/${eventoAtivo?._id}`, { method: 'PUT', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ status: 'Finalizado' }) });
                        setView('lista');
                        carregarPainelInicial();
                      }
                    }}
                    className="px-3 py-2 bg-zinc-900 hover:bg-red-950/30 border border-zinc-800 hover:border-red-900 text-xs font-black uppercase text-zinc-400 hover:text-red-500 rounded-lg transition-all font-mono"
                  >
                    Finalizar Etapa
                  </button>
                </div>

                {/* BLOCO SUPERIOR: CATEGORIAS, NOVA BATERIA, BATERIAS AGENDADAS */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                  
                  {/* FORM CATEGORIA */}
                  <div className="bg-[#0c0c0e] border border-zinc-900 p-5 rounded-xl space-y-4">
                    <h2 className="text-xs font-black uppercase tracking-wider text-white flex items-center gap-2">
                      <Layers size={14} className="text-red-500" /> Criar Categoria
                    </h2>
                    <form 
                      onSubmit={async (e) => {
                        e.preventDefault();
                        const form = e.currentTarget;
                        const formData = new FormData(form);
                        const nomeCategoria = formData.get('nomeCat') as string;
                        if (!nomeCategoria?.trim() || !eventoAtivo) return;

                        setLoadingCategoria(true);
                        try {
                          const res = await fetch('/api/categoria', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ nome: nomeCategoria.toUpperCase(), eventoId: eventoAtivo._id })
                          });
                          if (res.ok) {
                            form.reset();
                            await entrarNoEvento(eventoAtivo);
                          }
                        } catch (err) { console.error(err); }
                        setLoadingCategoria(false);
                      }} 
                      className="space-y-3 font-mono text-xs"
                    >
                      <input type="text" name="nomeCat" placeholder="EX: MX1 PRO" className="w-full bg-black border border-zinc-800 rounded p-2 text-white outline-none uppercase" required disabled={loadingCategoria} />
                      <button type="submit" disabled={loadingCategoria} className="w-full font-black uppercase bg-red-600 hover:bg-red-700 text-white py-2 rounded tracking-wider text-[11px] transition-all">
                        {loadingCategoria ? "SALVANDO..." : "Adicionar Classe"}
                      </button>
                    </form>

                    <div>
                      <p className="text-[10px] text-zinc-500 font-bold uppercase mb-2 font-mono">Categorias no Grid:</p>
                      {/* AJUSTE: Altura máxima controlada com scroll para evitar esticar o bloco */}
                      <div className="space-y-1 max-h-[140px] overflow-y-auto pr-1 custom-scrollbar">
                        {!categorias || categorias.length === 0 ? (
                          <p className="text-[11px] text-zinc-600 italic">Nenhuma classe criada.</p>
                        ) : (
                          categorias.map(cat => (
                            <div key={cat._id} className="bg-black border border-zinc-900 p-2 rounded text-xs uppercase font-bold text-zinc-300">
                              {cat.nome}
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>

                  {/* FORM BATERIA */}
                  <div className="bg-[#0c0c0e] border border-zinc-900 p-5 rounded-xl space-y-4">
                    <h2 className="text-xs font-black uppercase tracking-wider text-white flex items-center gap-2">
                      <Zap size={14} className="text-amber-500" /> Nova Bateria / Grid
                    </h2>
                    <form onSubmit={handleCriarBateria} className="space-y-3 font-mono text-xs">
                      <input type="text" placeholder="Nome (Ex: 1ª Bateria)" value={nomeBat} onChange={e => setNomeBat(e.target.value)} className="w-full bg-black border border-zinc-800 rounded p-2 text-white outline-none uppercase" required />
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[9px] text-zinc-500 font-bold block mb-1">TEMPO (MIN)</label>
                          <input type="number" value={tempoBat} onChange={e => setTempoBat(e.target.value)} className="w-full bg-black border border-zinc-800 rounded p-2 text-white text-center font-bold" />
                        </div>
                        <div>
                          <label className="text-[9px] text-zinc-500 font-bold block mb-1">VOLTAS EXTRA</label>
                          <input type="number" value={voltasBat} onChange={e => setVoltasBat(e.target.value)} className="w-full bg-black border border-zinc-800 rounded p-2 text-white text-center font-bold" />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] text-zinc-500 font-bold uppercase">Selecione as Classes Coletivas:</label>
                        {/* AJUSTE: Scroll interno para a listagem de checkboxes das categorias */}
                        <div className="bg-black border border-zinc-900 rounded p-2 max-h-[100px] overflow-y-auto space-y-2 custom-scrollbar">
                          {!categorias || categorias.length === 0 ? (
                            <p className="text-[11px] text-zinc-600 italic p-1">Cadastre as categorias primeiro...</p>
                          ) : (
                            categorias.map(cat => (
                              <label key={cat._id} className="flex items-center gap-2 text-xs text-zinc-300 font-sans uppercase cursor-pointer select-none">
                                <input 
                                  type="checkbox" 
                                  checked={catsSelecionadas.includes(cat._id)} 
                                  onChange={() => setCatsSelecionadas(prev => prev.includes(cat._id) ? prev.filter(id => id !== cat._id) : [...prev, cat._id])} 
                                  className="accent-red-600" 
                                />
                                {cat.nome}
                              </label>
                            ))
                          )}
                        </div>
                      </div>

                      <button type="submit" disabled={loadingBateria} className="w-full font-black uppercase bg-amber-600 hover:bg-amber-700 text-white py-2 rounded tracking-wider text-[11px] transition-all">
                        {loadingBateria ? "AGENDANDO..." : "Agendar Bateria"}
                      </button>
                    </form>
                  </div>

                  {/* LISTA DE BATERIAS */}
                  <div className="bg-[#0c0c0e] border border-zinc-900 p-5 rounded-xl space-y-4">
                    <h2 className="text-xs font-black uppercase tracking-wider text-white flex items-center gap-2">
                      <Timer size={14} className="text-blue-500" /> Baterias Agendadas
                    </h2>
                    {/* AJUSTE: max-h igualado para manter simetria visual das três colunas no topo */}
                    <div className="space-y-2 max-h-[295px] overflow-y-auto pr-1 custom-scrollbar">
                      {!baterias || baterias.length === 0 ? (
                        <div className="text-center py-6 text-zinc-600 italic font-mono text-xs">Nenhuma bateria montada.</div>
                      ) : (
                        baterias.map(b => (
                          <div key={b._id} className="bg-black border border-zinc-900 p-3 rounded-xl font-mono text-xs space-y-3 flex flex-col justify-between group hover:border-zinc-800 transition-all">
                            <div className="space-y-1">
                              <div className="flex justify-between items-center">
                                <strong className="text-white uppercase text-[13px]">{b.nome}</strong>
                                <span className="text-[10px] text-amber-500 font-bold bg-amber-950/20 px-1.5 py-0.5 rounded border border-amber-900/30">
                                  {b.tempoProva}min + {b.voltasExtras}V
                                </span>
                              </div>
                              <p className="text-[10px] text-zinc-500 uppercase">{b.categoriesIds?.length || 0} Classe(s) vinculada(s)</p>
                            </div>

                            <button
                              onClick={() => {
                                setBateriaAtivaId(b._id);
                                router.push(`/admin/corrida?bateriaId=${b._id}&eventoId=${eventoAtivo?._id}`);
                              }}
                              className="w-full bg-zinc-900 hover:bg-emerald-600 border border-zinc-800 hover:border-emerald-500 text-zinc-300 hover:text-white py-1.5 px-3 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2"
                            >
                              <Zap size={12} className="text-emerald-500 group-hover:text-white" /> Iniciar Corrida
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                </div>

                {/* BLOCO INFERIOR: INSCRIÇÃO DE PILOTO E PILOTOS CONFIRMADOS */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                  
                  {/* FORMULÁRIO DE INSCRIÇÃO */}
                  <div className="bg-[#0c0c0e] border border-zinc-900 p-5 rounded-xl space-y-4">
                    <h2 className="text-xs font-black uppercase tracking-wider text-white flex items-center gap-2">
                      <Users size={14} className="text-emerald-500" /> Inscrever Piloto
                    </h2>
                    <form onSubmit={handleCriarPiloto} className="space-y-3 font-mono text-xs">
                      <input type="text" placeholder="Nome do Competidor" value={nomePiloto} onChange={e => setNomePiloto(e.target.value)} className="w-full bg-black border border-zinc-800 rounded p-2 text-white outline-none uppercase" required disabled={loadingPiloto} />
                      <div className="grid grid-cols-2 gap-2">
                        <input type="text" placeholder="Nº Moto/Carro" value={numeralPiloto} onChange={e => setNumeralPiloto(e.target.value)} className="w-full bg-black border border-zinc-800 rounded p-2 text-white outline-none uppercase" required disabled={loadingPiloto} />
                        <input type="text" placeholder="Nº Transponder" value={transponderPiloto} onChange={e => setTransponderPiloto(e.target.value)} className="w-full bg-black border border-zinc-800 rounded p-2 text-white outline-none uppercase" disabled={loadingPiloto} />
                      </div>
                      
                      <div className="space-y-1.5">
                        <label className="text-[10px] text-zinc-500 font-bold block uppercase">Categorias de Inscrição:</label>
                        {/* AJUSTE: Adicionado scroll no seletor de categorias do piloto */}
                        <div className="bg-black border border-zinc-900 rounded p-3 max-h-[115px] overflow-y-auto grid grid-cols-2 gap-2 custom-scrollbar">
                          {categorias.map(cat => (
                            <label key={cat._id} className="flex items-center gap-2 text-xs text-zinc-300 font-sans uppercase cursor-pointer select-none">
                              <input type="checkbox" checked={catsPilotoSelecionadas.includes(cat._id)} onChange={() => handleToggleCategoriaPiloto(cat._id)} className="accent-emerald-500" disabled={loadingPiloto} />
                              {cat.nome}
                            </label>
                          ))}
                        </div>
                      </div>

                      <button type="submit" disabled={loadingPiloto} className="w-full font-black uppercase bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 rounded tracking-wider text-[11px] transition-all">
                        {loadingPiloto ? "PROCESSANDO MATRÍCULA..." : "Confirmar Inscrição"}
                      </button>
                    </form>
                  </div>

                  {/* LISTA DE PILOTOS CADASTRADOS NO EVENTO */}
                  <div className="bg-[#0c0c0e] border border-zinc-900 p-5 rounded-xl space-y-4">
                    <div className="flex justify-between items-center border-b border-zinc-900 pb-2">
                      <h2 className="text-xs font-black uppercase tracking-wider text-white flex items-center gap-2">
                        <Users size={14} className="text-zinc-400" /> Pilotos Confirmados
                      </h2>
                      <span className="text-[10px] font-mono font-bold bg-zinc-900 text-zinc-400 px-2 py-0.5 rounded border border-zinc-800">
                        {pilotos.length} INSCRITOS
                      </span>
                    </div>

                    {/* AJUSTE: max-h calibrado perfeitamente para bater a altura do formulário de inscrição do lado esquerdo */}
                    <div className="space-y-2 max-h-[255px] overflow-y-auto pr-1 font-mono text-xs custom-scrollbar">
                      {!pilotos || pilotos.length === 0 ? (
                        <div className="text-center py-12 text-zinc-600 italic text-xs">Nenhum competidor inscrito neste evento.</div>
                      ) : (
                        pilotos.map(p => (
                          <div key={p._id} className="bg-black border border-zinc-900 p-2.5 rounded-lg flex items-center justify-between gap-3 hover:border-zinc-800 transition-all">
                            <div className="space-y-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-[11px] font-black text-emerald-500 bg-emerald-950/20 px-1.5 py-0.5 rounded border border-emerald-900/30 shrink-0">#{p.numeral}</span>
                                <p className="text-white font-bold truncate uppercase text-[13px]">{p.nome}</p>
                              </div>
                              <p className="text-[10px] text-zinc-500 uppercase truncate">{obterNomesCategorias(p.categoriasIds) || 'Sem Categoria'}</p>
                            </div>
                            <div className="text-right shrink-0">
                              <span className="text-[9px] block text-zinc-600 font-bold uppercase">RFID / CHIP</span>
                              <span className="text-[10px] text-zinc-400 font-bold">{p.transponder || 'N/A'}</span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                </div>

              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}