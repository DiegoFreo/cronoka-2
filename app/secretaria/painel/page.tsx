'use client';
import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Users, Timer, Layers, Calendar, MapPin, 
  Zap, FileText, Cpu, BarChart3, ChevronRight, ArrowLeft, Flag, Settings, LogOut, CheckCircle2, FlagTriangleRight,
  AirVent
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

interface Bateria { 
  _id: string; 
  nome: string; 
  tempoProva: number; 
  voltasExtras: number; 
  categoriaId: string[]; 
}

interface Piloto { 
  _id: string; 
  nome: string; 
  numeral: string; 
  transponder: string; 
  categoriasIds: string[]; 
  eventoId: string; 
}

interface LeitoraConfig {
  _id: string;
  nome: string;
  ip: string;
  porta: number;
  modo: 'SERVER' | 'CLIENT';
  ativa: boolean;
  status: 'conectado' | 'desconectado' | 'iniciada' | 'tentando';
}

export default function PainelAdmin() {
  // Controle de Abas principais do Menu Lateral
  const [activeTab, setActiveTab] = useState<'dashboard' | 'pilotos' | 'relatorios' | 'configuracoes'>('dashboard');
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
  
  // Estados de Hardware (RFID Redundância)
  const [leitoras, setLeitoras] = useState<LeitoraConfig[]>([]);
  // Estado para armazenar os últimos chips lidos para teste na tela de engenharia
  const [ultimasTagsLidas, setUltimasTagsLidas] = useState<{ tag: string; dataHora: string; antena: string }[]>([]);

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
  
  // Controle de estado para edição do piloto selecionado
  const [pilotoEmEdicao, setPilotoEmEdicao] = useState<Piloto | null>(null);

  // Estados do formulário de leitoras
  const [nomeLeitora, setNomeLeitora] = useState('');
  const [ipLeitora, setIpLeitora] = useState('');
  const [portaLeitora, setPortaLeitora] = useState('5084');
  const [modoLeitora, setModoLeitora] = useState<'SERVER' | 'CLIENT'>('SERVER');

  // Referência para manter as leitoras sempre atualizadas sem disparar efeitos
  const leitorasRef = useRef(leitoras);
  useEffect(() => {
    leitorasRef.current = leitoras;
  }, [leitoras]);

  // Efeito para monitorar status e acumular tags em tempo real
  useEffect(() => {
    if (leitorasRef.current.length === 0) return;

    const checarStatusEHardware = async () => {
      let todasAsTagsDessaRodada: { tag: string; dataHora: string; antena: string }[] = [];
      
      const updatedLeitoras = await Promise.all(
        leitorasRef.current.map(async (leitora) => {
          if (leitora.status === 'desconectado' && !leitora.ativa) return leitora;

          try {
            const res = await fetch('/api/leitora', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ action: 'STATUS', id: leitora._id, ip: leitora.ip })
            });
            
            if (res.ok) {
              const dados = await res.json();
              
              if (dados.tagsRecentes && dados.tagsRecentes.length > 0) {
                const tagsComNomeOrigem = dados.tagsRecentes.map((t: any) => ({
                  ...t,
                  antena: leitora.nome 
                }));
                todasAsTagsDessaRodada = [...todasAsTagsDessaRodada, ...tagsComNomeOrigem];
              }

              return { ...leitora, status: dados.status, ativa: dados.status === 'conectado' };
            }
          } catch (err) {
            console.error(`Erro ao checar leitora ${leitora.nome}:`, err);
          }
          return leitora;
        })
      );

      setLeitoras(updatedLeitoras);

      if (todasAsTagsDessaRodada.length > 0) {
        setUltimasTagsLidas((prevAcumulado) => {
          const listaMesclada = [...todasAsTagsDessaRodada, ...prevAcumulado];
          
          const idsUnicos = new Set();
          const listaFiltrada = listaMesclada.filter((item) => {
            const chaveUnica = `${item.tag}-${item.dataHora}`;
            if (idsUnicos.has(chaveUnica)) return false;
            idsUnicos.add(chaveUnica);
            return true;
          });

          return listaFiltrada
            .sort((a, b) => b.dataHora.localeCompare(a.dataHora))
            .slice(0, 20);
        });
      }
    };

    checarStatusEHardware();
    const intervalo = setInterval(checarStatusEHardware, 5000);

    return () => clearInterval(intervalo);
  }, []);

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
      
      const resAntenas = await fetch('/api/antenas');
      if (resAntenas.ok) {
        const dadosAntenas = await resAntenas.json();
        const antennasWithStatus = dadosAntenas.map((a: any) => ({ ...a, status: 'desconectado' }));
        setLeitoras(antennasWithStatus);
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
    setPilotoEmEdicao(null); // Reseta a edição caso troque de evento
    setNomeBat(''); 
    setCatsSelecionadas([]); 
    
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

  /**
   * 🏎️ ATUALIZAÇÃO: Gerenciamento Unificado de Pilotos (Cadastro e Atualização)
   */
  const handleCriarPiloto = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nomePiloto.trim() || !numeralPiloto.trim() || catsPilotoSelecionadas.length === 0 || !eventoAtivo) {
        alert("Preencha Nome, Numeral e marque ao menos uma Categoria.");
        return;
    }

    setLoadingPiloto(true);
    try {
        // Se houver piloto em edição, mudamos para PUT (ou mantemos a rota de atualização adequada)
        const URL_ALVO = pilotoEmEdicao ? `/api/piloto?id=${pilotoEmEdicao._id}` : '/api/piloto';
        const METODO = pilotoEmEdicao ? 'PUT' : 'POST';

        const res = await fetch(URL_ALVO, {
          method: METODO,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
              _id: pilotoEmEdicao?._id, // Envia o ID caso seja edição
              nome: nomePiloto,
              numeral: numeralPiloto,
              transponder: transponderPiloto,
              categoriasIds: catsPilotoSelecionadas, 
              eventoId: eventoAtivo._id
          })
        });

        if (res.ok) {
          // Limpa todos os estados do formulário após processar
          setNomePiloto('');
          setNumeralPiloto('');
          setTransponderPiloto('');
          setCatsPilotoSelecionadas([]); 
          setPilotoEmEdicao(null); // Sai do modo de edição
          await entrarNoEvento(eventoAtivo);
        } else {
          alert(pilotoEmEdicao ? "Erro ao atualizar o piloto." : "Erro ao cadastrar o piloto.");
        }
    } catch (err) { 
      console.error(err); 
    } finally {
      setLoadingPiloto(false);
    }
  };

  /**
   * 🎯 INTERCEPTA CLIQUE DA TABELA E POPULA O FORMULÁRIO DE EDIÇÃO
   */
  const handleEditarPiloto = (piloto: Piloto) => {
    setPilotoEmEdicao(piloto);
    
    // Alimenta os campos de texto normalmente
    setNomePiloto(piloto.nome);
    setNumeralPiloto(piloto.numeral);
    setTransponderPiloto(piloto.transponder || '');
    
    // Tratamento crucial aqui: Se categoriasIds veio populado como objeto da API,
    // nós extraímos apenas o string do ID. Se já for string, mantém.
    const idsTratados = piloto.categoriasIds.map((cat: any) => {
      return typeof cat === 'object' && cat !== null ? cat._id : cat;
    });

    // Agora o estado recebe apenas strings ['ID1', 'ID2'], fazendo as caixinhas marcarem na tela!
    setCatsPilotoSelecionadas(idsTratados);
    
    // Rola a tela até o topo para visualizar o formulário aberto
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSalvarLeitora = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nomeLeitora || !ipLeitora) {
      alert("Preencha o nome e o IP da leitora.");
      return;
    }

    const novaLeitoraDados = {
      nome: nomeLeitora.toUpperCase(),
      ip: ipLeitora.trim(),
      porta: Number(portaLeitora),
      modo: modoLeitora,
      status: 'desconectado'
    };

    try {
      const res = await fetch('/api/antenas', { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(novaLeitoraDados)
      });

      if (res.ok) {
        const respostaPost = await res.json();
        const antenaSalva = respostaPost.data; 

        const leitoraComStatus: LeitoraConfig = {
          ...antenaSalva,
          status: 'desconectado'
        };

        setLeitoras(prev => {
          const existe = prev.some(l => l.ip === leitoraComStatus.ip);
          if (existe) {
            return prev.map(l => l.ip === leitoraComStatus.ip ? leitoraComStatus : l);
          }
          return [...prev, leitoraComStatus];
        });
        
        setNomeLeitora(''); 
        setIpLeitora(''); 
        setPortaLeitora('5084');
      } else {
        const errDados = await res.json();
        alert(`Erro: ${errDados.error || 'Falha ao salvar no banco.'}`);
      }
    } catch (err) {
      console.error("Erro na requisição:", err);
      alert("Falha de conexão com a API do banco.");
    }
  };

  const handleToggleLeitoraHardware = async (leitora: LeitoraConfig) => {
    const novaAcao = leitora.status === 'conectado' ? 'STOP' : 'START';
    
    setLeitoras(prev => prev.map(l => l.ip === leitora.ip ? { ...l, status: novaAcao === 'START' ? 'iniciada' : 'desconectado' } : l));

    try {
      const res = await fetch('/api/leitora', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: novaAcao,
          id: leitora._id,
          ip: leitora.ip,
          porta: leitora.porta,
          modo: leitora.modo
        })
      });

      if (res.ok) {
        const dados = await res.json();
        
        setLeitoras(prev => prev.map(l => l.ip === leitora.ip ? { ...l, status: dados.status, ativa: dados.status === 'conectado' } : l));
      } else {
        setLeitoras(prev => prev.map(l => l.ip === leitora.ip ? { ...l, status: 'desconectado', ativa: false } : l));
      }
    } catch (error) {
      console.error(error);
      setLeitoras(prev => prev.map(l => l.ip === leitora.ip ? { ...l, status: 'desconectado', ativa: false } : l));
    }
  };

  const handleToggleCategoriaPiloto = (id: string) => {
    setCatsPilotoSelecionadas(prev => 
      prev.includes(id) ? prev.filter(catId => catId !== id) : [...prev, id]
    );
  };

  const obterNomesCategorias = (ids: any[]) => {
    if (!ids) return '';
    return ids.map(cat => {
      // Se já estiver populado pela API, usa o nome direto do objeto
      if (typeof cat === 'object' && cat !== null) return cat.nome;
      // Caso contrário, busca no estado local de categorias pelo ID
      return categorias.find(c => c._id === cat)?.nome;
    }).filter(Boolean).join(', ');
  };

  const irParaPaginaRelatorios = () => {
    setActiveTab('relatorios');
    if (eventoAtivo) {
      router.push(`/admin/relatorios?eventoId=${eventoAtivo._id}`);
    } else {
      router.push('/admin/relatorios');
    }
  };

  return (
    <div className="flex h-screen max-h-screen bg-[#070708] text-zinc-100 font-sans antialiased overflow-hidden print:bg-white print:text-black">
      
      {/* MENU LATERAL */}
      <aside className="w-64 bg-[#0c0c0e] border-r border-zinc-900 flex flex-col shrink-0 print:hidden">
        <div className="p-6 border-b border-zinc-900 flex items-center gap-3">
          <img src="/FPMX-logo.png" alt="Logo Cronoka" className="w-12 h-12 object-contain" />     
          <div>
            <h2 className="text-xs font-black tracking-wider uppercase text-white">CRONOKA</h2>
            <p className="text-[9px] font-mono font-bold text-zinc-500 uppercase tracking-widest">Painel de controle</p>
          </div>
        </div>

        {/* STATUS DAS LEITORAS EM TEMPO REAL */}
        {leitoras.length > 0 && (
          <div className="px-6 py-3 bg-black/40 border-b border-zinc-900/60 space-y-1.5">
            <p className="text-[9px] font-mono font-bold text-zinc-500 uppercase tracking-wider">📡 Hardware em Campo</p>
            <div className="space-y-1 max-h-[80px] overflow-y-auto custom-scrollbar">
              {leitoras.map(l => (
                <div key={l._id} className="flex items-center justify-between text-[10px] font-mono bg-zinc-950/40 px-2 py-1 rounded border border-zinc-900">
                  <span className="text-zinc-400 truncate max-w-[120px] uppercase font-bold">{l.nome}</span>
                  <div className="flex items-center gap-1.5">
                    <span className={`w-1.5 h-1.5 rounded-full ${
                      l.status === 'conectado' ? 'bg-emerald-500 animate-pulse' :
                      l.status === 'tentando' ? 'bg-amber-500 animate-spin' : 'bg-red-500'
                    }`} />
                    <span className={`text-[9px] font-black uppercase ${
                      l.status === 'conectado' ? 'text-emerald-500' :
                      l.status === 'tentando' ? 'text-amber-500' : 'text-red-500'
                    }`}>
                      {l.status === 'conectado' ? 'ONLINE' : l.status === 'tentando' ? 'CONECTANDO' : 'OFFLINE'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* NAVEGAÇÃO DO MENU */}
        <nav className="flex-1 p-4 space-y-1 text-xs font-medium text-zinc-400">
          <button 
            onClick={() => { setActiveTab('dashboard'); }} 
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors font-sans uppercase tracking-wide ${activeTab === 'dashboard' ? 'bg-zinc-900 text-white font-bold border-l-2 border-red-600' : 'hover:bg-zinc-900 hover:text-zinc-200'}`}
          >
            <BarChart3 size={16} className={activeTab === 'dashboard' ? 'text-red-500' : 'text-zinc-500'} /> Painel Principal
          </button>
          
          <button 
            onClick={() => { setActiveTab('pilotos'); }} 
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors font-sans uppercase tracking-wide ${activeTab === 'pilotos' ? 'bg-zinc-900 text-white font-bold border-l-2 border-red-600' : 'hover:bg-zinc-900 hover:text-zinc-200'}`}
          >
            <Users size={16} className={activeTab === 'pilotos' ? 'text-red-500' : 'text-zinc-500'} /> Cadastro Pilotos
          </button>
          
          <button 
            onClick={irParaPaginaRelatorios} 
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors font-sans uppercase tracking-wide ${activeTab === 'relatorios' ? 'bg-zinc-900 text-white font-bold border-l-2 border-red-600' : 'hover:bg-zinc-900 hover:text-zinc-200'}`}
          >
            <FileText size={16} className={activeTab === 'relatorios' ? 'text-red-500' : 'text-zinc-500'} /> Relatórios
          </button>

          <button 
            onClick={() => { setActiveTab('configuracoes'); }} 
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors font-sans uppercase tracking-wide ${activeTab === 'configuracoes' ? 'bg-zinc-900 text-white font-bold border-l-2 border-red-600' : 'hover:bg-zinc-900 hover:text-zinc-200'}`}
          >
            <Settings size={16} className={activeTab === 'configuracoes' ? 'text-red-500' : 'text-zinc-500'} /> Configurações
          </button>
        </nav>
      </aside>

      {/* CONTEÚDO CENTRAL */}
      <main className="flex-1 h-full overflow-y-auto p-8 pr-6 print:p-0">
        
        {/* ABA 1: PAINEL PRINCIPAL (DASHBOARD) */}
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
                  {/* CADASTROS DE MODALIDADE E EVENTO */}
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
                                {typeof ev.modalidadeId === 'object' ? (ev.modalidadeId as any)?.nome : 'Outros'}
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
              /* DETALHES DO EVENTO ATIVO */
              <div className="space-y-6 pb-6">
                <div className="flex justify-between items-center">
                  <button onClick={() => { setView('lista'); }} className="flex items-center gap-2 text-xs font-bold text-zinc-500 hover:text-white font-mono uppercase transition-colors">
                    <ArrowLeft size={14} className="text-red-600" /> Voltar ao painel Operacional
                  </button>
                  <span className="text-xs font-mono text-zinc-500">Para gerenciar competidores clique em <b className="text-red-500">Cadastro Pilotos</b> no menu.</span>
                </div>

                <div className="bg-[#0c0c0e] border border-zinc-900 p-5 rounded-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div>
                    <span className="text-[9px] font-mono bg-black text-red-500 border border-zinc-800 px-2 py-0.5 rounded font-bold uppercase">
                      {typeof eventoAtivo?.modalidadeId === 'object' ? (eventoAtivo?.modalidadeId as any)?.nome : 'Grid'}
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
                      <div className="space-y-1 max-h-[140px] overflow-y-auto pr-1 custom-scrollbar">
                        {categorias.length === 0 ? (
                          <p className="text-xs text-zinc-600 italic font-mono">Nenhuma cadastrada.</p>
                        ) : (
                          categorias.map(c => (
                            <div key={c._id} className="text-xs bg-black p-2 border border-zinc-900 rounded text-zinc-300 font-mono uppercase">
                              {c.nome}
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>

                  {/* FORM BATERIAS / PROGRAMAÇÃO DA ETAPA */}
                  <div className="lg:col-span-2 bg-[#0c0c0e] border border-zinc-900 p-5 rounded-xl space-y-4">
                    <h2 className="text-xs font-black uppercase tracking-wider text-white flex items-center gap-2">
                      <Timer size={14} className="text-red-500" /> Cronograma de Baterias (Provas)
                    </h2>
                    
                    <form onSubmit={handleCriarBateria} className="grid grid-cols-1 md:grid-cols-3 gap-3 font-mono text-xs items-end border-b border-zinc-900 pb-4">
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-zinc-500 uppercase">Nome da Bateria</label>
                        <input type="text" placeholder="EX: 1ª BATERIA - MX1 / MX2" value={nomeBat} onChange={e => setNomeBat(e.target.value)} className="w-full bg-black border border-zinc-800 rounded p-2 text-white outline-none uppercase" required />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-zinc-500 uppercase">Tempo de Prova (Minutos)</label>
                        <input type="number" value={tempoBat} onChange={e => setTempoBat(e.target.value)} className="w-full bg-black border border-zinc-800 rounded p-2 text-white outline-none" required />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-zinc-500 uppercase">Voltas Extras</label>
                        <input type="number" value={voltasBat} onChange={e => setVoltasBat(e.target.value)} className="w-full bg-black border border-zinc-800 rounded p-2 text-white outline-none" required />
                      </div>

                      <div className="md:col-span-3 space-y-1.5">
                        <label className="text-[9px] font-bold text-zinc-500 uppercase">Classes Participantes (Gate Compartilhado):</label>
                        <div className="flex flex-wrap gap-1.5">
                          {categorias.map(c => {
                            const selecionada = catsSelecionadas.includes(c._id);
                            return (
                              <button
                                type="button"
                                key={c._id}
                                onClick={() => setCatsSelecionadas(prev => prev.includes(c._id) ? prev.filter(id => id !== c._id) : [...prev, c._id])}
                                className={`px-2 py-1 text-[10px] rounded border font-bold uppercase transition-all ${selecionada ? 'bg-red-600/20 border-red-500 text-red-400' : 'bg-zinc-950 border-zinc-800 text-zinc-500 hover:text-zinc-300'}`}
                              >
                                {c.nome}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <div className="md:col-span-3 pt-2">
                        <button type="submit" disabled={loadingBateria} className="w-full bg-zinc-100 hover:bg-white text-zinc-950 font-black uppercase py-2 rounded tracking-wider text-[11px] transition-all">
                          {loadingBateria ? "AGENDANDO PROVA..." : "Inserir Bateria no Cronograma"}
                        </button>
                      </div>
                    </form>

                    {/* LISTA DE BATERIAS */}
                  <div className="bg-[#0c0c0e] border border-zinc-900 p-5 rounded-xl space-y-4">
                    <h2 className="text-xs font-black uppercase tracking-wider text-white flex items-center gap-2">
                      <Timer size={14} className="text-blue-500" /> Baterias Agendadas
                    </h2>
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
                              <p className="text-[10px] text-zinc-500 uppercase">{b.categoriaId?.length || 0} Classe(s) vinculada(s)</p>
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
                </div>
              </div>
            )}
          </div>
        )}

        {/* ABA 2: CADASTRO DE PILOTOS */}
        {activeTab === 'pilotos' && (
          <div className="space-y-6 max-w-7xl mx-auto font-mono text-xs">
            <div>
              <h1 className="text-2xl font-black uppercase tracking-tight text-white font-sans">Secretaria de Prova</h1>
              <p className="text-xs text-zinc-500">Inscrição de atletas, amarração de transponders e enturmação por categoria.</p>
            </div>

            {!eventoAtivo ? (
              <div className="p-8 text-center text-zinc-500 bg-[#0c0c0e] rounded-xl border border-zinc-900 italic">
                Selecione ou abra uma etapa ativa no <b className="text-red-500 font-sans uppercase">Painel Principal</b> para gerenciar os pilotos.
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                {/* FORM PILOTO */}
                <div className="bg-[#0c0c0e] border border-zinc-900 p-5 rounded-xl space-y-4">
                  <h2 className="text-xs font-black uppercase tracking-wider text-white font-sans flex items-center gap-2">
                    <Users size={14} className="text-red-500" /> Nova Ficha de Inscrição
                  </h2>
                  <form onSubmit={handleCriarPiloto} className="space-y-3">
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-zinc-500 uppercase">Nome Completo do Piloto</label>
                      <input type="text" placeholder="EX: MÁRIO ALEXANDRE" value={nomePiloto} onChange={e => setNomePiloto(e.target.value)} className="w-full bg-black border border-zinc-800 rounded p-2 text-white outline-none uppercase" required />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-zinc-500 uppercase">Numeral da Moto</label>
                        <input type="text" placeholder="EX: 49" value={numeralPiloto} onChange={e => setNumeralPiloto(e.target.value)} className="w-full bg-black border border-zinc-800 rounded p-2 text-white outline-none uppercase" required />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-zinc-500 uppercase">Nº Transponder / RFID</label>
                        <input type="text" placeholder="EX: E20041..." value={transponderPiloto} onChange={e => setTransponderPiloto(e.target.value)} className="w-full bg-black border border-zinc-800 rounded p-2 text-white outline-none uppercase" />
                      </div>
                    </div>

                    <div className="space-y-1.5 border-t border-zinc-900 pt-3">
                      <label className="text-[9px] font-bold text-zinc-500 uppercase">Categorias Confirmadas para o Atleta:</label>
                      {categorias.length === 0 ? (
                        <p className="text-[11px] text-amber-500 italic">Nenhuma categoria aberta neste evento ainda.</p>
                      ) : (
                        <div className="grid grid-cols-2 gap-1.5 max-h-[140px] overflow-y-auto pr-1 custom-scrollbar">
                          {categorias.map(c => {
                            const check = catsPilotoSelecionadas.includes(c._id);
                            return (
                              <button
                                type="button"
                                key={c._id}
                                onClick={() => handleToggleCategoriaPiloto(c._id)}
                                className={`p-2 text-left text-[10px] rounded border font-bold uppercase transition-all flex items-center justify-between ${check ? 'bg-red-600/10 border-red-500 text-red-400' : 'bg-black border-zinc-800 text-zinc-400 hover:text-zinc-200'}`}
                              >
                                <span className="truncate mr-1">{c.nome}</span>
                                {check && <span className="text-red-500 font-sans font-black">✓</span>}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    <button type="submit" disabled={loadingPiloto || categorias.length === 0} className="w-full font-black uppercase bg-red-600 hover:bg-red-700 text-white py-2.5 rounded tracking-wider text-[11px] transition-all pt-2">
                      {loadingPiloto ? "VALIDANDO CHIP..." : "Confirmar Inscrição Atleta"}
                    </button>
                  </form>
                </div>

               {/* LISTA COMPLETA DE PILOTOS INSCRITOS */}
                <div className="lg:col-span-2 bg-[#0c0c0e] border border-zinc-900 p-5 rounded-xl space-y-3">
                  <div className="flex justify-between items-center border-b border-zinc-900 pb-3">
                    <h2 className="text-xs font-black uppercase tracking-wider text-white font-sans flex items-center gap-2">
                      <Flag size={14} className="text-red-500" /> Grid Cadastrado ({pilotos?.length || 0} Pilotos)
                    </h2>
                    <span className="text-[10px] text-zinc-500 uppercase">
                      Evento: <b className="text-zinc-300 font-bold">{eventoAtivo.nome}</b>
                    </span>
                  </div>

                  {pilotos.length === 0 ? (
                    <div className="p-8 text-center text-zinc-600 italic">Nenhum competidor inscrito nesta etapa até o momento.</div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left font-mono text-xs border-collapse">
                        <thead>
                          <tr className="border-b border-zinc-900 text-zinc-500 font-bold uppercase text-[10px]">
                            <th className="pb-2">Nº Moto</th>
                            <th className="pb-2">Piloto</th>
                            <th className="pb-2">Classes Inscritas</th>
                            <th className="pb-2 text-right">ID Transponder</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-900/60 text-zinc-300">
                          {pilotos.map(p => {
                            const listaCategorias = obterNomesCategorias(p.categoriasIds);
                            
                            return (
                              <tr 
                                key={p._id} 
                                // 1. EVENTO DE CLIQUE PARA EDITAÇÃO
                                onClick={() => handleEditarPiloto(p)}
                                // Estilos para destacar que a linha inteira é clicável ao passar o mouse
                                className="hover:bg-zinc-900/60 hover:text-white cursor-pointer group transition-all"
                                // 2. COMPORTAMENTO HOVER: Mostra um balão com as categorias pertencentes na linha inteira
                                title={`Piloto: ${p.nome} \nCategorias: ${listaCategorias || 'Nenhuma categoria vinculada'}`}
                              >
                                <td className="py-2.5 font-black text-red-500 text-sm">
                                  #{p.numeral}
                                </td>
                                
                                <td className="py-2.5 font-sans font-bold text-white uppercase group-hover:text-red-400 transition-colors">
                                  {p.nome}
                                </td>
                                
                                <td className="py-2.5 uppercase text-zinc-400 font-bold">
                                  {/* Atalho visual de hover interno usando tailwind: destaca em vermelho no hover */}
                                  <span className="group-hover:text-zinc-200 transition-colors">
                                    {listaCategorias}
                                  </span>
                                </td>
                                
                                <td className="py-2.5 text-right font-bold text-zinc-500 group-hover:text-zinc-400">
                                  {p.transponder || 'SEM CHIP'}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ABA 3: CONFIGURAÇÕES & TELEMETRIA HARDWARE */}
        {activeTab === 'configuracoes' && (
          <div className="space-y-6 max-w-7xl mx-auto font-mono text-xs">
            <div>
              <h1 className="text-2xl font-black uppercase tracking-tight text-white font-sans">Engenharia de Hardware</h1>
              <p className="text-xs text-zinc-500">Mapeamento de antenas RFID Zebra FX7400, testes de bancada e monitoramento raw de tags.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
              {/* CADASTRO DE ANTENA */}
              <div className="bg-[#0c0c0e] border border-zinc-900 p-5 rounded-xl space-y-4">
                <h2 className="text-xs font-black uppercase tracking-wider text-white font-sans flex items-center gap-2">
                  <Settings size={14} className="text-red-500" /> Registrar Nova Leitora
                </h2>
                <form onSubmit={handleSalvarLeitora} className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-zinc-500 uppercase">Apelido/Identificação da Antena</label>
                    <input type="text" placeholder="EX: ANTENA PORTAL CHEGADA" value={nomeLeitora} onChange={e => setNomeLeitora(e.target.value)} className="w-full bg-black border border-zinc-800 rounded p-2 text-white outline-none uppercase" required />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-zinc-500 uppercase">Endereço IP Local</label>
                    <input type="text" placeholder="EX: 192.168.1.102" value={ipLeitora} onChange={e => setIpLeitora(e.target.value)} className="w-full bg-black border border-zinc-800 rounded p-2 text-white outline-none" required />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-zinc-500 uppercase">Porta TCP</label>
                      <input type="number" placeholder="5084" value={portaLeitora} onChange={e => setPortaLeitora(e.target.value)} className="w-full bg-black border border-zinc-800 rounded p-2 text-white outline-none" required />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-zinc-500 uppercase">Modo de Operação</label>
                      <select value={modoLeitora} onChange={e => setModoLeitora(e.target.value as 'SERVER' | 'CLIENT')} className="w-full bg-black border border-zinc-800 rounded p-2 text-zinc-300 outline-none">
                        <option value="SERVER">SERVER (TCP)</option>
                        <option value="CLIENT">CLIENT (TCP)</option>
                      </select>
                    </div>
                  </div>
                  <button type="submit" className="w-full bg-red-600 hover:bg-red-700 text-white font-black uppercase py-2.5 rounded tracking-wider text-[11px] transition-all pt-2">
                    Salvar Dispositivo
                  </button>
                </form>
              </div>

              {/* LISTA DETALHADA E CONTROLE MANUAL DE COMANDO */}
              <div className="lg:col-span-2 space-y-4">
                <div className="bg-[#0c0c0e] border border-zinc-900 p-5 rounded-xl space-y-3">
                  <h2 className="text-xs font-black uppercase tracking-wider text-white font-sans">Módulos Conectados e Comandos Manuais</h2>
                  {leitoras.length === 0 ? (
                    <p className="text-zinc-600 italic p-4 text-center">Nenhuma leitora ou antena configurada no banco de dados.</p>
                  ) : (
                    <div className="space-y-2">
                      {leitoras.map(l => (
                        <div key={l._id} className="bg-black border border-zinc-900 p-4 rounded-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                          <div>
                            <h3 className="font-bold text-white uppercase text-sm">{l.nome}</h3>
                            <p className="text-zinc-500 font-mono text-[11px] mt-0.5">Socket: <span className="text-zinc-300 font-bold">{l.ip}:{l.porta}</span> — Modo: <span className="text-zinc-300 font-bold">{l.modo}</span></p>
                          </div>
                          <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end">
                            <div className="flex items-center gap-1.5 bg-zinc-950 px-2 py-1.5 rounded border border-zinc-900">
                              <span className={`w-2 h-2 rounded-full ${
                                l.status === 'conectado' ? 'bg-emerald-500 animate-pulse' :
                                l.status === 'tentando' ? 'bg-amber-500 animate-spin' : 'bg-red-500'
                              }`} />
                              <span className={`text-[10px] font-black uppercase ${
                                l.status === 'conectado' ? 'text-emerald-500' :
                                l.status === 'tentando' ? 'text-amber-500' : 'text-red-500'
                              }`}>
                                {l.status === 'conectado' ? 'ONLINE' : l.status === 'tentando' ? 'CONECTANDO' : 'OFFLINE'}
                              </span>
                            </div>
                            <button
                              onClick={() => handleToggleLeitoraHardware(l)}
                              className={`px-3 py-1.5 rounded text-[10px] font-black uppercase transition-all border ${
                                l.status === 'conectado'
                                  ? 'bg-red-950/20 text-red-500 border-red-900 hover:bg-red-600 hover:text-white'
                                  : 'bg-emerald-950/20 text-emerald-500 border-emerald-900 hover:bg-emerald-600 hover:text-white'
                              }`}
                            >
                              {l.status === 'conectado' ? 'Desligar RF' : 'Disparar RF'}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* MONITOR DE TAGS RAW EM TEMPO REAL */}
                <div className="bg-[#0c0c0e] border border-zinc-900 p-5 rounded-xl space-y-3">
                  <div className="flex justify-between items-center">
                    <h2 className="text-xs font-black uppercase tracking-wider text-white font-sans flex items-center gap-2">
                      <AirVent size={14} className="text-red-500 animate-pulse" /> Console de Teste de Captura (Últimas 20)
                    </h2>
                    <button onClick={() => setUltimasTagsLidas([])} className="text-[10px] text-zinc-500 hover:text-zinc-300 font-bold uppercase transition-colors">Limpar Buffer</button>
                  </div>
                  
                  <div className="bg-black rounded-lg border border-zinc-900 p-2 max-h-[220px] overflow-y-auto custom-scrollbar font-mono text-[11px] text-zinc-400 space-y-1">
                    {ultimasTagsLidas.length === 0 ? (
                      <p className="text-zinc-700 italic p-4 text-center">Aguardando leituras de transponders em campo...</p>
                    ) : (
                      <div className="divide-y divide-zinc-900/40">
                        {ultimasTagsLidas.map((item, index) => (
                          <div key={index} className="py-1.5 flex flex-col md:flex-row justify-between md:items-center gap-1 hover:bg-zinc-950 px-1 rounded">
                            <div className="flex items-center gap-3">
                              <span className="text-emerald-500 font-bold">📡 {item.antena}</span>
                              <span className="text-white font-bold tracking-wider font-sans bg-zinc-900 px-1.5 py-0.5 rounded border border-zinc-800">{item.tag}</span>
                            </div>
                            <span className="text-zinc-500 text-[10px] font-bold">⏱️ {item.dataHora ? new Date(item.dataHora).toLocaleTimeString('pt-BR', { hour12: false }) : ''}.{item.dataHora ? new Date(item.dataHora).getMilliseconds() : ''}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}