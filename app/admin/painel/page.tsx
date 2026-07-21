'use client';
import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Users, Timer, Layers, Calendar, MapPin, 
  Zap, FileText, Cpu, BarChart3, ChevronRight, ArrowLeft, Flag, Settings, LogOut, CheckCircle2, FlagTriangleRight,
  AirVent, Loader2, FileCode2, Play, Square, Folder
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
  categoriaId: string[] | any;
  categoriasIds?: string[] | any;
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
  const [ultimasTagsLidas, setUltimasTagsLidas] = useState<{ tag: string; dataHora: string; antena: string }[]>([]);

  // 📂 ESTADOS DE LEITURA POR ARQUIVO DE LOG (NOVO)
  const [caminhoArquivoLog, setCaminhoArquivoLog] = useState<string>('C:/cronometragem/Dados.txt');
  const [arquivoLendo, setArquivoLendo] = useState<boolean>(false);
  const [statusLeituraArquivo, setStatusLeituraArquivo] = useState<string>('Aguardando inicialização...');

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

  // Estados para montagem de bateria
  const [nomeBat, setNomeBat] = useState('');
  const [tempoBat, setTempoBat] = useState('15');
  const [voltasBat, setVoltasBat] = useState('2');
  const [catsSelecionadas, setCatsSelecionadas] = useState<string[]>([]);
  
  const [bateriaEmEdicao, setBateriaEmEdicao] = useState<Bateria | null>(null);

  // Estados do formulário de piloto
  const [nomePiloto, setNomePiloto] = useState('');
  const [numeralPiloto, setNumeralPiloto] = useState('');
  const [transponderPiloto, setTransponderPiloto] = useState('');
  const [catsPilotoSelecionadas, setCatsPilotoSelecionadas] = useState<string[]>([]);
  
  const [pilotoEmEdicao, setPilotoEmEdicao] = useState<Piloto | null>(null);

  // Estados do formulário de leitoras
  const [nomeLeitora, setNomeLeitora] = useState('');
  const [ipLeitora, setIpLeitora] = useState('');
  const [portaLeitora, setPortaLeitora] = useState('5084');
  const [modoLeitora, setModoLeitora] = useState<'SERVER' | 'CLIENT'>('CLIENT');

  // Referência para manter as leitoras sempre atualizadas sem disparar efeitos
  const leitorasRef = useRef(leitoras);
  useEffect(() => {
    leitorasRef.current = leitoras;
  }, [leitoras]);

  useEffect(() => {
    if (leitorasRef.current.length === 0) return;

    const checarStatusEHardware = async () => {
      let todasAsTagsDessaRodada: { tag: string; dataHora: string; antena: string }[] = [];
      
      const updatedLeitoras = await Promise.all(
        leitorasRef.current.map(async (leitora) => {
          if (leitora.status === 'desconectado' && !leitora.ativa) return leitora;

          try {
            const url = `/api/leitora?ip=${encodeURIComponent(leitora.ip)}&id=${encodeURIComponent(leitora._id)}`;
            const res = await fetch(url, { method: 'GET' });
            
            if (res.ok) {
              const dados = await res.json();
              
              if (dados.tagsRecentes && dados.tagsRecentes.length > 0) {
                const tagsComNomeOrigem = dados.tagsRecentes.map((t: { tag: string; dataHora: string }) => ({
                  ...t,
                  antena: leitora.nome 
                }));
                todasAsTagsDessaRodada = [...todasAsTagsDessaRodada, ...tagsComNomeOrigem];
              }

              return { 
                ...leitora, 
                status: dados.status, 
                ativa: dados.status === 'conectado' 
              };
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

  // 📁 EFEITO DE POLLING EM TEMPO REAL PARA O ARQUIVO DE LOG (NOVO)
  useEffect(() => {
    if (!arquivoLendo) return;

    const lerArquivoEmTempoReal = async () => {
      try {
        const res = await fetch(`/api/leitora-arquivo?caminho=${encodeURIComponent(caminhoArquivoLog)}`);
        if (res.ok) {
          const dados = await res.json();
          setStatusLeituraArquivo(`Lendo arquivo ativo (${dados.totalLido || 0} linhas processadas)`);

          if (dados.tagsRecentes && dados.tagsRecentes.length > 0) {
            const novastags = dados.tagsRecentes.map((t: any) => ({
              tag: t.tag,
              dataHora: t.dataHora || new Date().toISOString(),
              antena: 'LOG_ARQUIVO'
            }));

            setUltimasTagsLidas((prev) => {
              const listaMesclada = [...novastags, ...prev];
              const idsUnicos = new Set();
              const listaFiltrada = listaMesclada.filter((item) => {
                const chave = `${item.tag}-${item.dataHora}`;
                if (idsUnicos.has(chave)) return false;
                idsUnicos.add(chave);
                return true;
              });
              return listaFiltrada.slice(0, 20);
            });
          }
        } else {
          setStatusLeituraArquivo('Erro ao acessar o arquivo especificado.');
        }
      } catch (error) {
        setStatusLeituraArquivo('Falha de conexão com a API de arquivo.');
      }
    };

    const intervaloArquivo = setInterval(lerArquivoEmTempoReal, 200);
    return () => clearInterval(intervaloArquivo);
  }, [arquivoLendo, caminhoArquivoLog]);

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
    setPilotoEmEdicao(null); 
    setNomeBat(''); 
    setTempoBat('15');
    setVoltasBat('2');
    setCatsSelecionadas([]); 
    setBateriaEmEdicao(null);
    
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
      const URL_ALVO = bateriaEmEdicao ? `/api/bateria?id=${bateriaEmEdicao._id}` : '/api/bateria';
      const METODO = bateriaEmEdicao ? 'PUT' : 'POST';

      const res = await fetch(URL_ALVO, {
        method: METODO,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          _id: bateriaEmEdicao?._id,
          nome: nomeBat.toUpperCase(),
          tempoProva: Number(tempoBat),
          voltasExtras: Number(voltasBat),
          categoriaId: catsSelecionadas,
          eventoId: eventoAtivo._id
        })
      });

      if (res.ok) {
        setNomeBat('');
        setTempoBat('15');
        setVoltasBat('2');
        setCatsSelecionadas([]);
        setBateriaEmEdicao(null);
        await entrarNoEvento(eventoAtivo);
      } else {
        alert(bateriaEmEdicao ? "Erro ao atualizar a bateria." : "Erro ao criar bateria.");
      }
    } catch (err) { console.error(err); }
    setLoadingBateria(false);
  };

  const handleEditarBateria = (bateria: Bateria) => {
    setBateriaEmEdicao(bateria);
    setNomeBat(bateria.nome);
    setTempoBat(String(bateria.tempoProva || '15'));
    setVoltasBat(String(bateria.voltasExtras || '2'));
    
    const origemCategorias = bateria.categoriaId || bateria.categoriaId || [];
    const idsTratados = origemCategorias.map((cat: any) => {
      return typeof cat === 'object' && cat !== null ? cat._id : cat;
    });

    setCatsSelecionadas(idsTratados);
  };

  const handleToggleCategoriaBateria = (id: string) => {
    setCatsSelecionadas(prev => 
      prev.includes(id) ? prev.filter(catId => catId !== id) : [...prev, id]
    );
  };

  const handleCriarPiloto = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nomePiloto.trim() || !numeralPiloto.trim() || catsPilotoSelecionadas.length === 0 || !eventoAtivo) {
        alert("Preencha Nome, Numeral e marque ao menos uma Categoria.");
        return;
    }

    setLoadingPiloto(true);
    try {
        const URL_ALVO = pilotoEmEdicao ? `/api/piloto?id=${pilotoEmEdicao._id}` : '/api/piloto';
        const METODO = pilotoEmEdicao ? 'PUT' : 'POST';

        const res = await fetch(URL_ALVO, {
          method: METODO,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
              _id: pilotoEmEdicao?._id,
              nome: nomePiloto,
              numeral: numeralPiloto,
              transponder: transponderPiloto,
              categoriasIds: catsPilotoSelecionadas, 
              eventoId: eventoAtivo._id
          })
        });

        if (res.ok) {
          setNomePiloto('');
          setNumeralPiloto('');
          setTransponderPiloto('');
          setCatsPilotoSelecionadas([]); 
          setPilotoEmEdicao(null); 
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

  const handleEditarPiloto = (piloto: Piloto) => {
    setPilotoEmEdicao(piloto);
    setNomePiloto(piloto.nome);
    setNumeralPiloto(piloto.numeral);
    setTransponderPiloto(piloto.transponder || '');
    
    const idsTratados = piloto.categoriasIds.map((cat: any) => {
      return typeof cat === 'object' && cat !== null ? cat._id : cat;
    });

    setCatsPilotoSelecionadas(idsTratados);
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
      if (typeof cat === 'object' && cat !== null) return cat.nome;
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
                      <input type="text" name="nomeCat" placeholder="EX: MX1, FORÇA LIVRE" className="w-full bg-black border border-zinc-800 rounded p-2 text-white outline-none uppercase" required />
                      <button type="submit" disabled={loadingCategoria} className="w-full bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 font-bold py-2 rounded text-[11px] uppercase tracking-wider text-zinc-300">
                        {loadingCategoria ? "Salvando..." : "Adicionar Categoria"}
                      </button>
                    </form>

                    <div className="pt-2 border-t border-zinc-900 space-y-1 max-h-[140px] overflow-y-auto custom-scrollbar">
                      <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1">Categorias Criadas</p>
                      {categorias.map(c => (
                        <div key={c._id} className="text-xs bg-black px-2 py-1.5 rounded border border-zinc-900 text-zinc-400 font-bold uppercase">
                          {c.nome}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* FORMULÁRIO DE BATERIA */}
                  <div className="bg-[#0c0c0e] border border-zinc-900 p-5 rounded-xl space-y-4">
                    <div className="flex justify-between items-center">
                      <h2 className="text-xs font-black uppercase tracking-wider text-white flex items-center gap-2">
                        <Timer size={14} className="text-red-500" /> 
                        {bateriaEmEdicao ? "Alterar Bateria" : "Configurar Bateria"}
                      </h2>
                      {bateriaEmEdicao && (
                        <button 
                          onClick={() => {
                            setBateriaEmEdicao(null);
                            setNomeBat('');
                            setTempoBat('15');
                            setVoltasBat('2');
                            setCatsSelecionadas([]);
                          }} 
                          className="text-[10px] font-mono text-zinc-500 hover:text-white uppercase underline"
                        >
                          Cancelar
                        </button>
                      )}
                    </div>

                    <form onSubmit={handleCriarBateria} className="space-y-3 font-mono text-xs">
                      <input 
                        type="text" 
                        placeholder="EX: 1ª BATERIA MX1/MX2" 
                        value={nomeBat} 
                        onChange={e => setNomeBat(e.target.value)} 
                        className="w-full bg-black border border-zinc-800 rounded p-2 text-white outline-none uppercase" 
                        required 
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[9px] text-zinc-500 font-bold uppercase block mb-1">Minutos de Prova</label>
                          <input type="number" placeholder="Minutos" value={tempoBat} onChange={e => setTempoBat(e.target.value)} className="w-full bg-black border border-zinc-800 rounded p-2 text-white outline-none" required />
                        </div>
                        <div>
                          <label className="text-[9px] text-zinc-500 font-bold uppercase block mb-1">Voltas Extras</label>
                          <input type="number" placeholder="Voltas" value={voltasBat} onChange={e => setVoltasBat(e.target.value)} className="w-full bg-black border border-zinc-800 rounded p-2 text-white outline-none" required />
                        </div>
                      </div>

                      <div className="space-y-1.5 pt-1">
                        <label className="text-[10px] text-zinc-500 font-bold uppercase block">Classes que correm juntas:</label>
                        <div className="grid grid-cols-2 gap-1.5 max-h-[100px] overflow-y-auto p-1 bg-black rounded border border-zinc-900 custom-scrollbar">
                          {categorias.map(cat => {
                            const marcado = catsSelecionadas.includes(cat._id);
                            return (
                              <button
                                key={cat._id}
                                type="button"
                                onClick={() => handleToggleCategoriaBateria(cat._id)}
                                className={`p-1.5 rounded text-left truncate text-[10px] font-bold uppercase transition-all border ${
                                  marcado ? 'bg-red-950/20 text-red-400 border-red-900/60' : 'bg-zinc-900/40 text-zinc-400 border-transparent hover:border-zinc-800'
                                }`}
                              >
                                {cat.nome}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <button 
                        type="submit" 
                        disabled={loadingBateria} 
                        className={`w-full font-black py-2.5 rounded text-[11px] uppercase tracking-wider text-white transition-all ${
                          bateriaEmEdicao ? 'bg-amber-600 hover:bg-amber-700' : 'bg-red-600 hover:bg-red-700'
                        }`}
                      >
                        {loadingBateria ? "Gravando..." : bateriaEmEdicao ? "Salvar Alterações" : "Lançar Cronograma"}
                      </button>
                    </form>
                  </div>

                  {/* LISTA DE BATERIAS LANÇADAS */}
                  <div className="space-y-2">
                    <h2 className="text-xs font-black uppercase tracking-wider text-zinc-500 font-mono">Cronogramas de Corrida</h2>
                    {!baterias || baterias.length === 0 ? (
                      <div className="p-6 text-center text-zinc-600 bg-[#0c0c0e] rounded-xl border border-zinc-900 italic font-mono text-xs">Nenhum cronograma montado.</div>
                    ) : (
                      baterias.map(bat => (
                        <div key={bat._id} className="bg-[#0c0c0e] border border-zinc-900 p-4 rounded-xl flex justify-between items-center hover:border-zinc-800 transition-all">
                          <div className="space-y-1 pr-2 truncate">
                            <h3 className="text-sm font-black text-white uppercase truncate">{bat.nome}</h3>
                            <p className="text-[10px] text-zinc-500 font-mono">
                              ⏱️ {bat.tempoProva} min + {bat.voltasExtras} Voltas
                            </p>
                            <p className="text-[10px] text-zinc-400 font-sans font-bold uppercase truncate">
                              Classes: <span className="text-red-500">{obterNomesCategorias(bat.categoriasIds || bat.categoriaId)}</span>
                            </p>
                          </div>
                          
                          <div className="flex items-center gap-2 shrink-0">
                            <button 
                              onClick={() => handleEditarBateria(bat)}
                              className="p-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-lg text-zinc-400 hover:text-amber-500 transition-colors"
                              title="Editar Configurações da Bateria"
                            >
                              <Settings size={14} />
                            </button>

                            <button 
                              onClick={() => {
                                router.push(`/admin/corrida?eventoId=${eventoAtivo?._id}&bateriaId=${bat._id}&origem=/admin`);
                              }}
                              className="px-3 py-2 bg-red-600 hover:bg-red-700 font-black text-[10px] font-sans uppercase tracking-wider text-white rounded-lg transition-all"
                            >
                              Ir para pista
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                </div>
              </div>
            )}
          </div>
        )}

        {/* ABA CADASTRO PILOTOS */}
        {activeTab === 'pilotos' && (
          <div className="max-w-7xl mx-auto space-y-6">
             <div>
                <h1 className="text-2xl font-black uppercase tracking-tight text-white">Inscrição Unificada de Competidores</h1>
                <p className="text-xs text-zinc-500 font-mono">
                  {eventoAtivo ? `Gerenciando grid oficial para: ${eventoAtivo.nome}` : 'Selecione um evento no Painel Principal primeiro.'}
                </p>
             </div>

             {eventoAtivo ? (
               <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                  <div className="bg-[#0c0c0e] border border-zinc-900 p-5 rounded-xl space-y-4">
                     <div className="flex justify-between items-center">
                       <h2 className="text-xs font-black uppercase tracking-wider text-white">
                         {pilotoEmEdicao ? "Modo Alteração de Piloto" : "Ficha de Inscrição"}
                       </h2>
                       {pilotoEmEdicao && (
                         <button onClick={() => { setPilotoEmEdicao(null); setNomePiloto(''); setNumeralPiloto(''); setTransponderPiloto(''); setCatsPilotoSelecionadas([]); }} className="text-[10px] font-mono text-zinc-500 hover:text-white uppercase underline">Cancelar</button>
                       )}
                     </div>

                     <form onSubmit={handleCriarPiloto} className="space-y-3 font-mono text-xs">
                        <input type="text" placeholder="Nome Completo" value={nomePiloto} onChange={e => setNomePiloto(e.target.value)} className="w-full bg-black border border-zinc-800 rounded p-2 text-white outline-none uppercase" required />
                        <div className="grid grid-cols-3 gap-2">
                           <input type="text" placeholder="# MOTO" value={numeralPiloto} onChange={e => setNumeralPiloto(e.target.value)} className="col-span-1 bg-black border border-zinc-800 rounded p-2 text-white text-center font-black outline-none uppercase" required />
                           <input type="text" placeholder="Nº TRANSPONDER (CHIP)" value={transponderPiloto} onChange={e => setTransponderPiloto(e.target.value)} className="col-span-2 bg-black border border-zinc-800 rounded p-2 text-white outline-none uppercase" />
                        </div>

                        <div className="space-y-1.5 pt-1">
                           <label className="text-[10px] text-zinc-500 font-bold uppercase block">Inscrições em Categorias:</label>
                           <div className="grid grid-cols-2 gap-1.5 max-h-[140px] overflow-y-auto p-1 bg-black rounded border border-zinc-900 custom-scrollbar">
                             {categorias.map(cat => {
                               const marcado = catsPilotoSelecionadas.includes(cat._id);
                               return (
                                 <button key={cat._id} type="button" onClick={() => handleToggleCategoriaPiloto(cat._id)} className={`p-1.5 rounded text-left truncate text-[10px] font-bold uppercase transition-all border ${marcado ? 'bg-red-950/20 text-red-400 border-red-900/60' : 'bg-zinc-900/40 text-zinc-400 border-transparent hover:border-zinc-800'}`}>
                                   {cat.nome}
                                 </button>
                               );
                             })}
                           </div>
                        </div>

                        <button type="submit" disabled={loadingPiloto} className={`w-full font-black py-2.5 rounded text-[11px] uppercase tracking-wider text-white transition-all ${pilotoEmEdicao ? 'bg-amber-600 hover:bg-amber-700' : 'bg-red-600 hover:bg-red-700'}`}>
                          {loadingPiloto ? "PROCESSANDO..." : pilotoEmEdicao ? "Salvar Alterações" : "Confirmar Inscrição"}
                        </button>
                     </form>
                  </div>

                  <div className="lg:col-span-2 bg-[#0c0c0e] border border-zinc-900 rounded-xl overflow-hidden flex flex-col">
                     <div className="p-4 border-b border-zinc-900/80 bg-black/20 text-xs font-mono font-bold text-zinc-500 uppercase tracking-wider">
                       Pilotos Inscritos nesta Etapa ({pilotos.length})
                     </div>
                     <div className="divide-y divide-zinc-900/60 max-h-[480px] overflow-y-auto custom-scrollbar">
                        {pilotos.length === 0 ? (
                          <div className="p-8 text-center text-zinc-600 font-mono text-xs italic">Nenhum piloto inscrito na etapa.</div>
                        ) : (
                          pilotos.map(p => (
                            <div key={p._id} className="p-3 font-mono text-xs flex justify-between items-center hover:bg-zinc-900/20 transition-all">
                               <div>
                                  <p className="text-white font-sans font-black uppercase text-sm tracking-wide">{p.nome}</p>
                                  <p className="text-zinc-500 text-[11px] mt-0.5">
                                    Numeral: <span className="text-zinc-300 font-black">#{p.numeral}</span> — Chip: <span className="text-cyan-500 font-bold">{p.transponder || 'MANUAL'}</span>
                                  </p>
                                  <p className="text-[10px] text-zinc-400 uppercase font-sans font-bold mt-0.5 truncate max-w-[400px]">
                                    Categorias: <span className="text-red-500">{obterNomesCategorias(p.categoriasIds)}</span>
                                  </p>
                               </div>
                               <button onClick={() => handleEditarPiloto(p)} className="px-2.5 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-800 rounded font-bold font-sans uppercase text-[10px] tracking-wider transition-colors">
                                 Editar
                               </button>
                            </div>
                          ))
                        )}
                     </div>
                  </div>
               </div>
             ) : (
               <div className="p-12 text-center text-zinc-500 bg-[#0c0c0e] border border-zinc-900 rounded-xl italic font-mono text-xs">
                 Por favor, acesse o <b>Painel Principal</b>, clique sobre a Etapa operacional desejada e depois retorne aqui para inscrever e modificar os pilotos da prova.
               </div>
             )}
          </div>
        )}

        {/* ⚙️ ABA CONFIGURAÇÕES (INCLUI HARDWARE IP E A NOVA LEITURA DE ARQUIVO LOG) */}
        {activeTab === 'configuracoes' && (
          <div className="max-w-7xl mx-auto space-y-6">
            <div>
              <h1 className="text-2xl font-black uppercase tracking-tight text-white">Engenharia de Hardware & Redes</h1>
              <p className="text-xs text-zinc-500 font-mono">Cadastre leitoras IP ou utilize o modo de leitura contingencial através de arquivo texto gerado por software externo.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
              
              {/* CADASTRO DE LEITORAS IP & CONFIGURAÇÃO DE ARQUIVO */}
              <div className="space-y-6">
                
                {/* 1. CONFIGURAÇÃO LEITORA IP */}
                <div className="bg-[#0c0c0e] border border-zinc-900 p-5 rounded-xl space-y-4">
                  <h2 className="text-xs font-black uppercase tracking-wider text-white flex items-center gap-2">
                    <Cpu size={15} className="text-red-500" /> Nova Antena/Leitora IP
                  </h2>
                  <form onSubmit={handleSalvarLeitora} className="space-y-3 font-mono text-xs">
                    <input type="text" placeholder="NOME IDENTIFICADOR (EX: ANTENA LARGADA)" value={nomeLeitora} onChange={e => setNomeLeitora(e.target.value)} className="w-full bg-black border border-zinc-800 rounded p-2 text-white outline-none uppercase" required />
                    <input type="text" placeholder="IP DA DISPOSITIVO (EX: 192.168.1.100)" value={ipLeitora} onChange={e => setIpLeitora(e.target.value)} className="w-full bg-black border border-zinc-800 rounded p-2 text-white outline-none" required />
                    <div className="grid grid-cols-2 gap-2">
                      <input type="number" placeholder="PORTA TCP" value={portaLeitora} onChange={e => setPortaLeitora(e.target.value)} className="w-full bg-black border border-zinc-800 rounded p-2 text-white outline-none" required />
                      <select value={modoLeitora} onChange={e => setModoLeitora(e.target.value as any)} className="w-full bg-black border border-zinc-800 rounded p-2 text-zinc-300 outline-none">
                        <option value="SERVER">TCP SERVER</option>
                        <option value="CLIENT">TCP CLIENT</option>
                      </select>
                    </div>
                    <button type="submit" className="w-full bg-red-600 hover:bg-red-700 font-black py-2.5 rounded text-[11px] uppercase tracking-wider text-white transition-all">
                      Registrar Dispositivo
                    </button>
                  </form>
                </div>

                {/* 2. 🔥 NOVO: MÓDULO DE LEITURA CONTINGENCIAL VIA ARQUIVO TXT */}
                <div className="bg-[#0c0c0e] border border-zinc-900 p-5 rounded-xl space-y-4">
                  <div className="flex items-center gap-2">
                    <FileCode2 size={16} className="text-cyan-500" />
                    <h2 className="text-xs font-black uppercase tracking-wider text-white">Leitura de Arquivo (Contingência)</h2>
                  </div>
                  <p className="text-[11px] text-zinc-500 font-mono">
                    Monitore em tempo real um arquivo .txt gerado por outro software para processar as passagens.
                  </p>

                  <div className="space-y-3 font-mono text-xs">
                    <div>
                      <label className="text-[10px] text-zinc-500 font-bold uppercase block mb-1">Caminho do Arquivo Local (.txt):</label>
                      <div className="flex items-center gap-2">
                        <input 
                          type="text" 
                          value={caminhoArquivoLog} 
                          onChange={(e) => setCaminhoArquivoLog(e.target.value)} 
                          placeholder="C:/caminho/do/arquivo/Dados.txt"
                          className="flex-1 bg-black border border-zinc-800 rounded p-2 text-cyan-400 font-mono outline-none text-[11px]" 
                          disabled={arquivoLendo}
                        />
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setArquivoLendo(!arquivoLendo)}
                      className={`w-full font-black py-2.5 rounded text-[11px] uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
                        arquivoLendo 
                          ? 'bg-amber-600 hover:bg-amber-700 text-white' 
                          : 'bg-cyan-600 hover:bg-cyan-700 text-white'
                      }`}
                    >
                      {arquivoLendo ? (
                        <>
                          <Square size={14} fill="currentColor" /> Parar Leitura de Arquivo
                        </>
                      ) : (
                        <>
                          <Play size={14} fill="currentColor" /> Iniciar Leitura do Arquivo
                        </>
                      )}
                    </button>

                    <div className="p-2 bg-black/60 border border-zinc-900 rounded text-[10px] font-mono text-zinc-400">
                      <span className="font-bold uppercase text-zinc-500 block mb-0.5">Status da Contingência:</span>
                      <span className={arquivoLendo ? 'text-emerald-400 font-bold' : 'text-zinc-600'}>
                        {statusLeituraArquivo}
                      </span>
                    </div>
                  </div>
                </div>

              </div>

              {/* BARRAMENTO E LOG DE LEITURAS DA PISTA */}
              <div className="lg:col-span-2 space-y-6">
                
                {/* BARRAMENTO DE DISPOSITIVOS IP */}
                <div className="bg-[#0c0c0e] border border-zinc-900 rounded-xl overflow-hidden">
                  <div className="p-4 border-b border-zinc-900 bg-black/20 text-xs font-mono font-bold text-zinc-500 uppercase tracking-wider">
                    Barramento de Conexões de Antena
                  </div>
                  <div className="divide-y divide-zinc-900/60 font-mono text-xs">
                    {leitoras.length === 0 ? (
                      <div className="p-6 text-center text-zinc-600 italic">Nenhum dispositivo IP registrado no barramento local.</div>
                    ) : (
                      leitoras.map(l => (
                        <div key={l._id} className="p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 hover:bg-zinc-900/10">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-white uppercase text-sm tracking-wide">{l.nome}</span>
                              <span className="text-[9px] bg-black border border-zinc-800 px-1 py-0.2 rounded text-zinc-500">{l.modo}</span>
                            </div>
                            <p className="text-zinc-500 text-[11px] mt-0.5">Socket IP: <span className="text-zinc-300 font-bold">{l.ip}:{l.porta}</span></p>
                          </div>
                          
                          <div className="flex items-center gap-4">
                            <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded border ${
                              l.status === 'conectado' ? 'border-emerald-900 text-emerald-500 bg-emerald-950/20' :
                              l.status === 'tentando' ? 'border-amber-900 text-amber-500 bg-amber-950/20 animate-pulse' :
                              'border-red-900 text-red-500 bg-red-950/20'
                            }`}>
                              {l.status}
                            </span>
                            <button
                              onClick={() => handleToggleLeitoraHardware(l)}
                              disabled={l.status === 'tentando' || l.status === 'iniciada'}
                              className={`px-3 py-1.5 rounded text-[10px] font-black uppercase tracking-wider font-sans transition-all border ${
                                l.status === 'conectado' ? 'bg-zinc-900 text-red-500 border-zinc-800 hover:bg-red-950/20 hover:border-red-900' : 'bg-emerald-600 text-white border-transparent hover:bg-emerald-700'
                              }`}
                            >
                              {l.status === 'conectado' ? 'Derrubar' : 'Ativar'}
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* LOG DAS LEITURAS EM TEMPO REAL (TESTE EM PISTA OU ARQUIVO) */}
                <div className="bg-[#0c0c0e] border border-zinc-900 rounded-xl overflow-hidden">
                  <div className="p-4 border-b border-zinc-900 bg-black/20 text-xs font-mono font-bold text-zinc-500 uppercase tracking-wider flex justify-between items-center">
                    <span>Console RFID — Log de Leitura Direta (Live Test / Arquivo)</span>
                    <button onClick={() => setUltimasTagsLidas([])} className="text-[9px] text-zinc-500 hover:text-white uppercase underline font-normal">Limpar Buffer</button>
                  </div>
                  <div className="p-4 max-h-[260px] overflow-y-auto font-mono text-[11px] space-y-1 custom-scrollbar bg-black/40">
                    {ultimasTagsLidas.length === 0 ? (
                      <div className="text-zinc-700 text-center italic py-4">Aguardando passagem de tags pelas antenas ativas ou arquivo...</div>
                    ) : (
                      ultimasTagsLidas.map((item, index) => (
                        <div key={index} className="flex justify-between text-zinc-400 py-1 border-b border-zinc-900/30 hover:bg-zinc-900/10">
                          <span>⏱️ {new Date(item.dataHora).toLocaleTimeString('pt-BR')}.{new Date(item.dataHora).getMilliseconds()} — RFID TAG: <strong className="text-cyan-400 font-bold">{item.tag}</strong></span>
                          <span className={`text-[10px] font-bold uppercase ${item.antena === 'LOG_ARQUIVO' ? 'text-amber-500' : 'text-zinc-600'}`}>
                            Origem: {item.antena}
                          </span>
                        </div>
                      ))
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