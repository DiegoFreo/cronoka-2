'use client';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
// Se estiver usando NextAuth:
// import { useSession } from 'next-auth/react';
import { 
  Users, Timer, Layers, Calendar, Cpu, BarChart3, ChevronRight, ArrowLeft, 
  Settings, Zap, FileText, UserPlus, X, Edit2, RotateCcw, PlusCircle, Search, ShieldCheck 
} from 'lucide-react';

// --- INTERFACES ---
type TipoUsuario = 'Administrador' | 'Cronometrista' | 'Secretaria';

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
interface TagRead {
  id: string;
  epc: string;
  antenna: string;
  timestamp: string;
  count: number;
}

const formatarDataHoraSegura = (timestampRaw: string | number) => {
  if (!timestampRaw) return '--:--:--';
  if (typeof timestampRaw === 'string' && /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]/.test(timestampRaw)) {
    return timestampRaw.split('.')[0];
  }
  const num = Number(timestampRaw);
  if (!isNaN(num)) {
    const d = new Date(num > 1e11 ? num : num * 1000);
    if (!isNaN(d.getTime())) return d.toLocaleTimeString('pt-BR');
  }
  const d = new Date(timestampRaw);
  if (!isNaN(d.getTime())) {
    return d.toLocaleTimeString('pt-BR');
  }
  return String(timestampRaw);
};

export default function PainelAdmin() {
  const router = useRouter();

  const [usuarioLogado, setUsuarioLogado] = useState<{ nome: string; role: TipoUsuario } | null>(null);

  useEffect(() => {
    async function obterUsuarioAutenticado() {
      try {
        const res = await fetch('/api/auth/me');
        if (res.ok) {
          const data = await res.json();
          setUsuarioLogado({
            nome: data.nome || 'Usuário',
            role: data.role || 'Secretaria'
          });
        }
      } catch (err) {
        console.error("Erro ao obter dados do usuário logado:", err);
      }
    }
    obterUsuarioAutenticado();
  }, []);
  

  const tipoUsuario = usuarioLogado?.role || 'Administrador';

  // Estados de Navegação
  const [activeTab, setActiveTab] = useState<'dashboard' | 'cadastro_eventos' | 'pilotos' | 'relatorios' | 'configuracoes' | 'usuarios'>('dashboard');
  const [view, setView] = useState<'lista' | 'detalhes_evento'>('lista');
  const [modalPilotosAberto, setModalPilotosAberto] = useState(false);
  const [buscaPiloto, setBuscaPiloto] = useState('');

  // Métricas
  const [metricas, setMetricas] = useState({ 
    eventosNoAno: 0, 
    eventosNoMes: 0, 
    chipsLivres: 493,
    temporadasProximas: 2,
    quantidadeEventosCriados: 0 
  });
  
  // Entidades
  const [eventosAtivos, setEventosAtivos] = useState<Evento[]>([]);
  const [eventoAtivo, setEventoAtivo] = useState<Evento | null>(null);
  const [modalidades, setModalidades] = useState<{ _id: string; nome: string }[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [baterias, setBaterias] = useState<Bateria[]>([]);
  
  // Listas de Pilotos Separação (Pilotos do Evento vs Todos os Pilotos)
  const [pilotosEtapa, setPilotosEtapa] = useState<Piloto[]>([]);
  const [todosPilotos, setTodosPilotos] = useState<Piloto[]>([]);

  // RFID SSE
  const [leitoras, setLeitoras] = useState<LeitoraConfig[]>([]);
  const [tags, setTags] = useState<Map<string, TagRead>>(new Map());
  const [isReading, setIsReading] = useState(false);

  // Loadings
  const [loadingEvento, setLoadingEvento] = useState(false);
  const [loadingCategoria, setLoadingCategoria] = useState(false);
  const [loadingBateria, setLoadingBateria] = useState(false);
  const [loadingPiloto, setLoadingPiloto] = useState(false);

  // Formulários
  const [novaModalidadeNome, setNovaModalidadeNome] = useState('');
  const [modalidadeEvId, setModalidadeEvId] = useState('');
  const [nomeEv, setNomeEv] = useState('');
  const [localEv, setLocalEv] = useState('');
  const [dataEv, setDataEv] = useState('');

  const [nomeBat, setNomeBat] = useState('');
  const [tempoBat, setTempoBat] = useState('15');
  const [voltasBat, setVoltasBat] = useState('2');
  const [catsSelecionadas, setCatsSelecionadas] = useState<string[]>([]);
  const [bateriaEmEdicao, setBateriaEmEdicao] = useState<Bateria | null>(null);

  const [nomePiloto, setNomePiloto] = useState('');
  const [numeralPiloto, setNumeralPiloto] = useState('');
  const [transponderPiloto, setTransponderPiloto] = useState('');
  const [catsPilotoSelecionadas, setCatsPilotoSelecionadas] = useState<string[]>([]);
  const [pilotoEmEdicao, setPilotoEmEdicao] = useState<Piloto | null>(null);

  const [nomeLeitora, setNomeLeitora] = useState('');
  const [ipLeitora, setIpLeitora] = useState('');
  const [portaLeitora, setPortaLeitora] = useState('5084');
  const [modoLeitora, setModoLeitora] = useState<'SERVER' | 'CLIENT'>('CLIENT');

  useEffect(() => {
    carregarPainelInicial();
  }, []);

  const carregarPainelInicial = async () => {
    try {
      const [resEv, resMod, resAntenas, resMetricas] = await Promise.all([
        fetch('/api/evento?status=ativos'),
        fetch('/api/modalidade'),
        fetch('/api/antenas'),
        fetch('/api/admin/metricas')
      ]);

      if (resEv.ok) {
        const evs = await resEv.json();
        setEventosAtivos(evs || []);
        setMetricas(prev => ({ ...prev, quantidadeEventosCriados: evs?.length || 0 }));
      }
      if (resMod.ok) {
        const dadosMod = await resMod.json();
        setModalidades(dadosMod || []);
        if (dadosMod?.length > 0) setModalidadeEvId(dadosMod[0]._id);
      }
      if (resAntenas.ok) {
        const dados = await resAntenas.json();
        setLeitoras(dados.map((a: any) => ({ ...a, status: 'desconectado' })));
      }
      if (resMetricas.ok) {
        const mData = await resMetricas.json();
        setMetricas(prev => ({ ...prev, ...mData }));
      }
    } catch (err) {
      console.error("Erro ao carregar dados iniciais:", err);
    }
  };

  const carregarTodosPilotos = async () => {
    try {
      const res = await fetch('/api/piloto');
      if (res.ok) {
        const dados = await res.json();
        setTodosPilotos(dados || []);
      }
    } catch (err) {
      console.error("Erro ao carregar todos os pilotos:", err);
    }
  };

  const alternarAba = (aba: typeof activeTab) => {
    setActiveTab(aba);
    if (aba === 'pilotos') {
      carregarTodosPilotos();
    }
  };

  useEffect(() => {
    if (!isReading) return;
    const eventSource = new EventSource('/api/reader/stream');

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        setTags((prevTags) => {
          const updated = new Map(prevTags);
          const existing = updated.get(data.epc);
          updated.set(data.epc, {
            id: data.epc,
            epc: data.epc,
            timestamp: data.timestamp || new Date().toISOString(),
            count: existing ? existing.count + 1 : 1,
            antenna: data.antenna || 'ANTENA_PRINCIPAL'
          });
          return updated;
        });
      } catch (err) {
        console.error("Erro SSE:", err);
      }
    };

    eventSource.onerror = () => {
      eventSource.close();
    };

    return () => eventSource.close();
  }, [isReading]);

  const toggleReading = async (start: boolean) => {
    try {
      await fetch('/api/reader/control', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: start ? 'start' : 'stop' }),
      });
      setIsReading(start);
    } catch (err) {
      console.error("Erro ao alternar leitor:", err);
    }
  };

  const entrarNoEvento = async (ev: Evento) => {
    setEventoAtivo(ev);
    setView('detalhes_evento');
    limparFormularioPiloto();
    setBateriaEmEdicao(null);

    try {
      const [resCat, resBat, resPil] = await Promise.all([
        fetch(`/api/categoria?evento=${ev._id}`),
        fetch(`/api/bateria?evento=${ev._id}`),
        fetch(`/api/piloto?evento=${ev._id}`)
      ]);
      if (resCat.ok) setCategorias(await resCat.json());
      if (resBat.ok) setBaterias(await resBat.json());
      if (resPil.ok) setPilotosEtapa(await resPil.json());
    } catch (err) {
      console.error(err);
    }
  };

  const handleCriarEvento = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nomeEv.trim() || !localEv.trim() || !dataEv || !modalidadeEvId) return;

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
      }
    } catch (err) { console.error(err); }
    setLoadingEvento(false);
  };

  const handleCriarModalidade = async () => {
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
    if (!nomeBat.trim() || !eventoAtivo || catsSelecionadas.length === 0) return;

    setLoadingBateria(true);
    try {
      const res = await fetch(bateriaEmEdicao ? `/api/bateria?id=${bateriaEmEdicao._id}` : '/api/bateria', {
        method: bateriaEmEdicao ? 'PUT' : 'POST',
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
        setNomeBat(''); setTempoBat('15'); setVoltasBat('2'); setCatsSelecionadas([]);
        setBateriaEmEdicao(null);
        await entrarNoEvento(eventoAtivo);
      }
    } catch (err) { console.error(err); }
    setLoadingBateria(false);
  };

  const iniciarEdicaoPiloto = (piloto: Piloto) => {
    setPilotoEmEdicao(piloto);
    setNomePiloto(piloto.nome);
    setNumeralPiloto(piloto.numeral);
    setTransponderPiloto(piloto.transponder || '');
    const catsIds = (piloto.categoriasIds || []).map(cat => typeof cat === 'object' ? (cat as any)._id : cat);
    setCatsPilotoSelecionadas(catsIds);
  };

  const limparFormularioPiloto = () => {
    setNomePiloto('');
    setNumeralPiloto('');
    setTransponderPiloto('');
    setCatsPilotoSelecionadas([]);
    setPilotoEmEdicao(null);
  };

 const vincularPilotoAoEvento = async (piloto: Piloto) => {
  if (!eventoAtivo?._id) {
    alert("Nenhum evento ativo selecionado.");
    return;
  }

  // 1. Extrai APENAS as strings de IDs, descartando objetos populados
  const extrairStringId = (item: any): string => {
    if (!item) return '';
    if (typeof item === 'string') return item;
    if (typeof item === 'object' && item._id) return String(item._id);
    return String(item);
  };

  const categoriasExistentes = (piloto.categoriasIds || [])
    .map(extrairStringId)
    .filter(Boolean);

  let categoriasParaVincular: string[] = [];

  if (catsPilotoSelecionadas.length > 0) {
    categoriasParaVincular = catsPilotoSelecionadas.map(extrairStringId);
  } else if (categoriasExistentes.length > 0) {
    categoriasParaVincular = categoriasExistentes;
  } else if (categorias.length > 0) {
    categoriasParaVincular = categorias.map(c => extrairStringId(c._id));
  }

  // 2. Monta um payload limpo sem metadados
  const payload = {
    _id: piloto._id,
    nome: piloto.nome,
    numeral: piloto.numeral,
    transponder: piloto.transponder || '',
    categoriasIds: categoriasParaVincular,
    eventoId: String(eventoAtivo._id)
  };

  setLoadingPiloto(true);

  try {
    // Teste enviando tanto query param quanto id no body para garantir compatibilidade com a rota
    const res = await fetch(`/api/piloto?id=${piloto._id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const resData = await res.json().catch(() => ({}));

    if (res.ok) {
      // Recarrega os dados atualizados do servidor
      await entrarNoEvento(eventoAtivo);
      await carregarTodosPilotos();
      limparFormularioPiloto();
    } else {
      console.error("Erro retornado pela API:", resData);
      alert(`Erro ${res.status}: ${resData.message || resData.error || 'Falha ao vincular no banco.'}`);
    }
  } catch (err) {
    console.error("Erro na requisição de vínculo:", err);
    alert("Falha de rede ao tentar vincular o piloto.");
  } finally {
    setLoadingPiloto(false);
  }
};

  const handleCriarOuAtualizarPiloto = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nomePiloto.trim() || !numeralPiloto.trim() || !eventoAtivo) return;

    if (catsPilotoSelecionadas.length === 0) {
      alert("Selecione pelo menos uma categoria.");
      return;
    }

    setLoadingPiloto(true);
    try {
      const res = await fetch(pilotoEmEdicao ? `/api/piloto?id=${pilotoEmEdicao._id}` : '/api/piloto', {
        method: pilotoEmEdicao ? 'PUT' : 'POST',
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
        limparFormularioPiloto();
        if (eventoAtivo) {
          await entrarNoEvento(eventoAtivo);
        }
        if (activeTab === 'pilotos') {
          await carregarTodosPilotos();
        }
      }
    } catch (err) { console.error(err); }
    setLoadingPiloto(false);
  };

  const handleSalvarLeitora = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nomeLeitora || !ipLeitora) return;

    try {
      const res = await fetch('/api/antenas', { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome: nomeLeitora.toUpperCase(),
          ip: ipLeitora.trim(),
          porta: Number(portaLeitora),
          modo: modoLeitora
        })
      });

      if (res.ok) {
        const data = await res.json();
        setLeitoras(prev => [...prev, { ...data.data, status: 'desconectado' }]);
        setNomeLeitora(''); setIpLeitora('');
      }
    } catch (err) { console.error(err); }
  };

  const obterNomesCategorias = (ids: any[]) => {
    if (!ids) return '';
    return ids.map(cat => (typeof cat === 'object' ? cat.nome : categorias.find(c => c._id === cat)?.nome)).filter(Boolean).join(', ');
  };

  const tagList = Array.from(tags.values()).sort((a, b) => b.timestamp.localeCompare(a.timestamp));

  // Regras de Visualização conforme o Tipo de Usuário
  const podeAcessarCadastroEventos = tipoUsuario === 'Administrador' || tipoUsuario === 'Cronometrista';
  const podeAcessarPilotos = tipoUsuario === 'Administrador' || tipoUsuario === 'Cronometrista';
  const podeAcessarConfiguracoes = tipoUsuario === 'Administrador' || tipoUsuario === 'Cronometrista';
  const podeAcessarUsuarios = tipoUsuario === 'Administrador';

  // Lista dinamicamente alternada: Se na aba geral 'pilotos' usa todosPilotos, senão usa pilotosEtapa
  const listaExibicaoPilotos = activeTab === 'pilotos' ? todosPilotos : pilotosEtapa;

  const pilotosFiltrados = listaExibicaoPilotos.filter(p => 
    p.nome.toLowerCase().includes(buscaPiloto.toLowerCase()) || 
    p.numeral.includes(buscaPiloto) ||
    p.transponder?.toLowerCase().includes(buscaPiloto.toLowerCase())
  );

  // Carrega a base geral de pilotos automaticamente ao abrir o modal
  useEffect(() => {
    if (modalPilotosAberto) {
      carregarTodosPilotos();
    }
  }, [modalPilotosAberto]);

  return (
    <div className="flex h-screen bg-[#070708] text-zinc-100 font-sans overflow-hidden">
      
      {/* MENU LATERAL */}
      <aside className="w-64 bg-[#0c0c0e] border-r border-zinc-900 flex flex-col shrink-0">
        <div className="p-6 border-b border-zinc-900 flex items-center gap-3">
          <img src="/FPMX-logo.png" alt="Logo Cronoka" className="w-12 h-12 object-contain" />     
          <div>
            <h2 className="text-xs font-black uppercase text-white">CRONOKA</h2>
            <p className="text-[9px] font-mono text-zinc-500 font-bold uppercase">Painel de Controle</p>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1 text-xs font-medium text-zinc-400">
          <button 
            onClick={() => alternarAba('dashboard')} 
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg uppercase tracking-wide ${activeTab === 'dashboard' ? 'bg-zinc-900 text-white font-bold border-l-2 border-red-600' : 'hover:bg-zinc-900 hover:text-zinc-200'}`}
          >
            <BarChart3 size={16} className={activeTab === 'dashboard' ? 'text-red-500' : 'text-zinc-500'} /> Painel Principal
          </button>
          
          {podeAcessarCadastroEventos && (
            <button 
              onClick={() => alternarAba('cadastro_eventos')} 
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg uppercase tracking-wide ${activeTab === 'cadastro_eventos' ? 'bg-zinc-900 text-white font-bold border-l-2 border-red-600' : 'hover:bg-zinc-900 hover:text-zinc-200'}`}
            >
              <PlusCircle size={16} className={activeTab === 'cadastro_eventos' ? 'text-red-500' : 'text-zinc-500'} /> Cadastro de Eventos
            </button>
          )}

          {podeAcessarPilotos && (
            <button 
              onClick={() => alternarAba('pilotos')} 
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg uppercase tracking-wide ${activeTab === 'pilotos' ? 'bg-zinc-900 text-white font-bold border-l-2 border-red-600' : 'hover:bg-zinc-900 hover:text-zinc-200'}`}
            >
              <Users size={16} className={activeTab === 'pilotos' ? 'text-red-500' : 'text-zinc-500'} /> Pilotos Cadastrados
            </button>
          )}

          <button 
            onClick={() => router.push(eventoAtivo ? `/admin/relatorios?eventoId=${eventoAtivo._id}` : '/admin/relatorios')} 
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg uppercase tracking-wide hover:bg-zinc-900 hover:text-zinc-200"
          >
            <FileText size={16} className="text-zinc-500" /> Relatórios
          </button>

          {podeAcessarConfiguracoes && (
            <button 
              onClick={() => alternarAba('configuracoes')} 
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg uppercase tracking-wide ${activeTab === 'configuracoes' ? 'bg-zinc-900 text-white font-bold border-l-2 border-red-600' : 'hover:bg-zinc-900 hover:text-zinc-200'}`}
            >
              <Settings size={16} className={activeTab === 'configuracoes' ? 'text-red-500' : 'text-zinc-500'} /> Configurações
            </button>
          )}

          {podeAcessarUsuarios && (
            <button 
              onClick={() => alternarAba('usuarios')} 
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg uppercase tracking-wide ${activeTab === 'usuarios' ? 'bg-zinc-900 text-white font-bold border-l-2 border-red-600' : 'hover:bg-zinc-900 hover:text-zinc-200'}`}
            >
              <ShieldCheck size={16} className={activeTab === 'usuarios' ? 'text-red-500' : 'text-zinc-500'} /> Usuários
            </button>
          )}
        </nav>

        {/* INFORMAÇÃO DO USUÁRIO LOGADO */}
        <div className="p-4 border-t border-zinc-900 bg-black/40 text-[10px] font-mono flex items-center justify-between">
          <div>
            <p className="text-white font-bold truncate max-w-[120px]">
              {usuarioLogado?.nome || 'Operador'}
            </p>
            <span className="text-red-500 font-bold uppercase block text-[9px]">
              {tipoUsuario}
            </span>
          </div>
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" title="Sessão Ativa" />
        </div>
      </aside>

      {/* CONTEÚDO CENTRAL */}
      <main className="flex-1 h-full overflow-y-auto p-8 relative">
        
        {/* ABA PAINEL PRINCIPAL */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6 max-w-7xl mx-auto">
            <div>
              <h1 className="text-2xl font-black uppercase text-white">Painel Principal</h1>
              <p className="text-xs text-zinc-500 font-mono">Visão consolidada das métricas da operação.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
              <MetricaCard titulo="Transponders" valor={metricas.chipsLivres} cor="emerald" icon={<Cpu size={20} />} />
              <MetricaCard titulo="Provas no Mês" valor={metricas.eventosNoMes} cor="amber" icon={<Calendar size={20} />} />
              <MetricaCard titulo="Temporadas Completas" valor={metricas.eventosNoAno} cor="red" icon={<Zap size={20} />} />
              <MetricaCard titulo="Temporadas Próximas" valor={metricas.temporadasProximas} cor="blue" icon={<BarChart3 size={20} />} />
              <MetricaCard titulo="Eventos Criados" valor={metricas.quantidadeEventosCriados} cor="purple" icon={<Layers size={20} />} />
            </div>
          </div>
        )}

        {/* ABA CADASTRO DE EVENTOS */}
        {activeTab === 'cadastro_eventos' && podeAcessarCadastroEventos && (
          <div className="space-y-6 max-w-7xl mx-auto">
            {view === 'lista' ? (
              <>
                <div>
                  <h1 className="text-2xl font-black uppercase text-white">Cadastro e Gestão de Eventos</h1>
                  <p className="text-xs text-zinc-500 font-mono">Cadastre novos eventos e selecione a etapa em andamento.</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                  <div className="bg-[#0c0c0e] border border-zinc-900 p-5 rounded-xl space-y-4">
                    <div className="space-y-2 pb-3 border-b border-zinc-900">
                      <label className="text-[10px] font-mono font-bold uppercase text-zinc-500">Nova Modalidade</label>
                      <div className="flex gap-1 font-mono text-xs">
                        <input type="text" placeholder="EX: VELOCROSS" value={novaModalidadeNome} onChange={e => setNovaModalidadeNome(e.target.value)} className="flex-1 bg-black border border-zinc-800 rounded p-2 text-white uppercase outline-none" />
                        <button type="button" onClick={handleCriarModalidade} className="bg-zinc-900 border border-zinc-800 text-white px-3 rounded font-bold">+</button>
                      </div>
                    </div>

                    <h2 className="text-xs font-black uppercase text-zinc-300">Novo Evento</h2>
                    <form onSubmit={handleCriarEvento} className="space-y-3 font-mono text-xs">
                      <input type="text" placeholder="Nome da Prova" value={nomeEv} onChange={e => setNomeEv(e.target.value)} className="w-full bg-black border border-zinc-800 rounded p-2 text-white uppercase outline-none" required />
                      <input type="text" placeholder="Local / Motódromo" value={localEv} onChange={e => setLocalEv(e.target.value)} className="w-full bg-black border border-zinc-800 rounded p-2 text-white uppercase outline-none" required />
                      <div className="grid grid-cols-2 gap-2">
                        <input type="date" value={dataEv} onChange={e => setDataEv(e.target.value)} className="w-full bg-black border border-zinc-800 rounded p-2 text-zinc-300 outline-none" required />
                        <select value={modalidadeEvId} onChange={e => setModalidadeEvId(e.target.value)} className="w-full bg-black border border-zinc-800 rounded p-2 text-zinc-300 uppercase outline-none">
                          {modalidades?.map(m => <option key={m._id} value={m._id}>{m.nome}</option>)}
                        </select>
                      </div>
                      <button type="submit" disabled={loadingEvento} className="w-full bg-red-600 hover:bg-red-700 font-black py-2.5 rounded text-[11px] text-white uppercase">
                        {loadingEvento ? "PROCESSANDO..." : "ABRIR EVENTO OFICIAL"}
                      </button>
                    </form>
                  </div>

                  <div className="lg:col-span-2 space-y-2">
                    <h2 className="text-xs font-black uppercase text-zinc-500 font-mono">Etapas Ativas</h2>
                    {eventosAtivos.length === 0 ? (
                      <div className="p-8 text-center text-zinc-600 bg-[#0c0c0e] rounded-xl border border-zinc-900 italic font-mono text-xs">Nenhum evento ativo.</div>
                    ) : (
                      eventosAtivos.map(ev => (
                        <div key={ev._id} onClick={() => entrarNoEvento(ev)} className="bg-[#0c0c0e] border border-zinc-900 p-4 rounded-xl flex justify-between items-center hover:border-zinc-700 cursor-pointer transition-all group">
                          <div className="space-y-1">
                            <span className="text-[9px] font-mono bg-black text-red-500 border border-zinc-800 px-1.5 py-0.5 rounded font-bold uppercase">
                              {typeof ev.modalidadeId === 'object' ? (ev.modalidadeId as any)?.nome : 'GRID'}
                            </span>
                            <h3 className="text-sm font-black text-white uppercase">{ev.nome}</h3>
                            <p className="text-xs text-zinc-500 font-mono">{ev.local} — {new Date(ev.data).toLocaleDateString('pt-BR')}</p>
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
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <button onClick={() => setView('lista')} className="flex items-center gap-2 text-xs font-bold text-zinc-500 hover:text-white font-mono uppercase">
                    <ArrowLeft size={14} className="text-red-600" /> Voltar à Lista de Eventos
                  </button>

                  <button 
                    onClick={() => {
                      limparFormularioPiloto();
                      carregarTodosPilotos();
                      setModalPilotosAberto(true);
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 font-black text-xs uppercase text-white rounded-lg shadow-lg shadow-red-600/20 transition-all font-mono"
                  >
                    <UserPlus size={16} /> Inscrever Pilotos ({pilotosEtapa.length})
                  </button>
                </div>

                <div className="bg-[#0c0c0e] border border-zinc-900 p-5 rounded-xl flex justify-between items-center">
                  <div>
                    <h1 className="text-xl font-black text-white uppercase">{eventoAtivo?.nome}</h1>
                    <p className="text-xs text-zinc-500 font-mono">{eventoAtivo?.local}</p>
                  </div>
                  <button 
                    onClick={async () => {
                      if(confirm("Finalizar este evento?")) {
                        await fetch(`/api/evento/${eventoAtivo?._id}`, { method: 'PUT', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ status: 'Finalizado' }) });
                        setView('lista');
                        carregarPainelInicial();
                      }
                    }}
                    className="px-3 py-2 bg-zinc-900 hover:bg-red-950/30 border border-zinc-800 text-xs font-black uppercase text-red-500 rounded-lg font-mono"
                  >
                    Finalizar Etapa
                  </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                  
                  {/* CATEGORIAS */}
                  <div className="bg-[#0c0c0e] border border-zinc-900 p-5 rounded-xl space-y-4">
                    <h2 className="text-xs font-black uppercase text-white flex items-center gap-2"><Layers size={14} className="text-red-500" /> Adicionar Categoria</h2>
                    <form onSubmit={async (e) => {
                      e.preventDefault();
                      const form = e.currentTarget;
                      const nomeCat = (new FormData(form)).get('nomeCat') as string;
                      if (!nomeCat?.trim() || !eventoAtivo) return;

                      setLoadingCategoria(true);
                      await fetch('/api/categoria', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ nome: nomeCat.toUpperCase(), eventoId: eventoAtivo._id })
                      });
                      form.reset();
                      await entrarNoEvento(eventoAtivo);
                      setLoadingCategoria(false);
                    }} className="space-y-3 font-mono text-xs">
                      <input type="text" name="nomeCat" placeholder="EX: MX1, FORÇA LIVRE" className="w-full bg-black border border-zinc-800 rounded p-2 text-white outline-none uppercase" required />
                      <button type="submit" disabled={loadingCategoria} className="w-full bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 font-bold py-2 rounded text-[11px] uppercase text-zinc-300">
                        {loadingCategoria ? "Salvando..." : "Criar Categoria"}
                      </button>
                    </form>

                    <div className="pt-2 border-t border-zinc-900 space-y-1 max-h-[140px] overflow-y-auto">
                      {categorias.map(c => (
                        <div key={c._id} className="text-xs bg-black px-2 py-1.5 rounded border border-zinc-900 text-zinc-400 font-bold uppercase">{c.nome}</div>
                      ))}
                    </div>
                  </div>

                  {/* FORM BATERIA */}
                  <div className="bg-[#0c0c0e] border border-zinc-900 p-5 rounded-xl space-y-4">
                    <h2 className="text-xs font-black uppercase text-white flex items-center gap-2"><Timer size={14} className="text-red-500" /> Bateria / Cronograma</h2>
                    <form onSubmit={handleCriarBateria} className="space-y-3 font-mono text-xs">
                      <input type="text" placeholder="EX: 1ª BATERIA MX1" value={nomeBat} onChange={e => setNomeBat(e.target.value)} className="w-full bg-black border border-zinc-800 rounded p-2 text-white outline-none uppercase" required />
                      <div className="grid grid-cols-2 gap-2">
                        <input type="number" placeholder="Minutos" value={tempoBat} onChange={e => setTempoBat(e.target.value)} className="w-full bg-black border border-zinc-800 rounded p-2 text-white outline-none" required />
                        <input type="number" placeholder="Voltas" value={voltasBat} onChange={e => setVoltasBat(e.target.value)} className="w-full bg-black border border-zinc-800 rounded p-2 text-white outline-none" required />
                      </div>

                      <div className="grid grid-cols-2 gap-1.5 max-h-[100px] overflow-y-auto p-1 bg-black rounded border border-zinc-900">
                        {categorias.map(cat => (
                          <button
                            key={cat._id}
                            type="button"
                            onClick={() => setCatsSelecionadas(prev => prev.includes(cat._id) ? prev.filter(i => i !== cat._id) : [...prev, cat._id])}
                            className={`p-1.5 rounded text-left truncate text-[10px] font-bold uppercase border ${catsSelecionadas.includes(cat._id) ? 'bg-red-950/20 text-red-400 border-red-900' : 'bg-zinc-900/40 text-zinc-400 border-transparent'}`}
                          >
                            {cat.nome}
                          </button>
                        ))}
                      </div>

                      <button type="submit" disabled={loadingBateria} className="w-full bg-red-600 hover:bg-red-700 font-black py-2.5 rounded text-[11px] uppercase text-white">
                        {loadingBateria ? "Gravando..." : "Lançar Cronograma"}
                      </button>
                    </form>
                  </div>

                  {/* BATERIAS DA ETAPA */}
                  <div className="space-y-2">
                    <h2 className="text-xs font-black uppercase text-zinc-500 font-mono">Baterias Agendadas</h2>
                    {baterias.map(bat => (
                      <div key={bat._id} className="bg-[#0c0c0e] border border-zinc-900 p-4 rounded-xl flex justify-between items-center">
                        <div>
                          <h3 className="text-sm font-black text-white uppercase">{bat.nome}</h3>
                          <p className="text-[10px] text-zinc-500 font-mono">⏱️ {bat.tempoProva} min + {bat.voltasExtras} Voltas</p>
                          <p className="text-[10px] text-zinc-400 uppercase font-bold">Classes: <span className="text-red-500">{obterNomesCategorias(bat.categoriasIds || bat.categoriaId)}</span></p>
                        </div>
                        <button 
                          onClick={() => router.push(`/admin/corrida?eventoId=${eventoAtivo?._id}&bateriaId=${bat._id}&origem=/admin`)}
                          className="px-3 py-2 bg-red-600 hover:bg-red-700 font-black text-[10px] uppercase text-white rounded-lg"
                        >
                          Ir Para Pista
                        </button>
                      </div>
                    ))}
                  </div>

                </div>
              </div>
            )}
          </div>
        )}

        {/* ABA PILOTOS CADASTRADOS */}
        {activeTab === 'pilotos' && podeAcessarPilotos && (
          <div className="space-y-6 max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <h1 className="text-2xl font-black uppercase text-white">Pilotos Cadastrados (Geral)</h1>
                <p className="text-xs text-zinc-500 font-mono">Listagem completa de todos os pilotos registrados na base de dados.</p>
              </div>

              <div className="flex items-center gap-2 w-full md:w-auto">
                <div className="relative flex-1 md:w-64">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                  <input 
                    type="text" 
                    placeholder="Buscar por nome, numeral ou chip..." 
                    value={buscaPiloto}
                    onChange={(e) => setBuscaPiloto(e.target.value)}
                    className="w-full bg-black border border-zinc-800 rounded-lg pl-9 pr-3 py-2 text-xs text-white outline-none font-mono"
                  />
                </div>
                {eventoAtivo && (
                  <button 
                    onClick={() => {
                      limparFormularioPiloto();
                      setModalPilotosAberto(true);
                    }}
                    className="px-3 py-2 bg-red-600 hover:bg-red-700 font-black text-xs uppercase text-white rounded-lg flex items-center gap-1 font-mono shrink-0"
                  >
                    <UserPlus size={14} /> Novo Piloto na Etapa
                  </button>
                )}
              </div>
            </div>

            <div className="bg-[#0c0c0e] border border-zinc-900 rounded-xl overflow-hidden">
              <div className="p-4 border-b border-zinc-900 bg-black/40 flex justify-between items-center text-xs font-mono font-bold text-zinc-400 uppercase">
                <span>Piloto / Numeral</span>
                <span>Transponder</span>
                <span>Categorias Vinculadas</span>
                <span>Ações</span>
              </div>

              <div className="divide-y divide-zinc-900/60">
                {pilotosFiltrados.length === 0 ? (
                  <div className="p-12 text-center text-zinc-600 font-mono text-xs italic">
                    Nenhum piloto localizado com o termo pesquisado.
                  </div>
                ) : (
                  pilotosFiltrados.map(p => (
                    <div key={p._id} className="p-4 font-mono text-xs grid grid-cols-1 md:grid-cols-4 items-center gap-4 hover:bg-zinc-900/30 transition-colors">
                      <div>
                        <p className="text-white font-black uppercase text-sm">{p.nome}</p>
                        <p className="text-zinc-500 font-bold text-[11px]">#{p.numeral}</p>
                      </div>

                      <div>
                        <span className="text-cyan-400 font-bold bg-cyan-950/30 border border-cyan-900/50 px-2 py-1 rounded text-[10px]">
                          {p.transponder || 'SEM TRANSPONDER'}
                        </span>
                      </div>

                      <div>
                        <p className="text-red-500 font-bold uppercase text-[11px]">
                          {obterNomesCategorias(p.categoriasIds) || 'Sem Categoria'}
                        </p>
                      </div>

                      <div>
                        <button
                          type="button"
                          onClick={() => {
                            iniciarEdicaoPiloto(p);
                            setModalPilotosAberto(true);
                          }}
                          className="px-3 py-1.5 bg-zinc-900 hover:bg-amber-600/20 hover:text-amber-400 border border-zinc-800 text-zinc-400 rounded-lg transition-colors flex items-center gap-1 text-[10px] font-bold uppercase w-fit"
                        >
                          <Edit2 size={12} /> Editar
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* ABA CONFIGURAÇÕES E TESTE RFID */}
        {activeTab === 'configuracoes' && podeAcessarConfiguracoes && (
          <div className="max-w-7xl mx-auto space-y-6">
            <div>
              <h1 className="text-2xl font-black uppercase text-white">Engenharia de Hardware & RFID</h1>
              <p className="text-xs text-zinc-500 font-mono">Gerenciador de Antenas IP e Monitoramento SSE.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
              <div className="space-y-6">
                <div className="bg-[#0c0c0e] border border-zinc-900 p-5 rounded-xl space-y-4">
                  <h2 className="text-xs font-black uppercase text-white flex items-center gap-2"><Cpu size={15} className="text-red-500" /> Nova Antena IP</h2>
                  <form onSubmit={handleSalvarLeitora} className="space-y-3 font-mono text-xs">
                    <input type="text" placeholder="Nome Identificador" value={nomeLeitora} onChange={e => setNomeLeitora(e.target.value)} className="w-full bg-black border border-zinc-800 rounded p-2 text-white uppercase outline-none" required />
                    <input type="text" placeholder="IP (EX: 192.168.1.121)" value={ipLeitora} onChange={e => setIpLeitora(e.target.value)} className="w-full bg-black border border-zinc-800 rounded p-2 text-white outline-none" required />
                    <button type="submit" className="w-full bg-red-600 hover:bg-red-700 font-black py-2.5 rounded text-[11px] uppercase text-white">
                      Salvar Hardware
                    </button>
                  </form>
                </div>
              </div>

              <div className="lg:col-span-2 space-y-6">
                <div className="bg-[#0c0c0e] border border-zinc-900 rounded-xl overflow-hidden">
                  <div className="p-4 border-b border-zinc-900 bg-black/20 text-xs font-mono font-bold text-zinc-500 uppercase flex justify-between items-center">
                    <span>Barramento do Leitor RFID</span>
                    <button
                      onClick={() => toggleReading(!isReading)}
                      className={`px-6 py-2 rounded-md font-semibold text-white transition-colors ${
                        isReading ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'
                      }`}
                    >
                      {isReading ? 'Parar Leitora' : 'Iniciar Leitura'}
                    </button>
                  </div>
                  <div className="p-4 font-mono text-xs text-zinc-400">
                    Status do Stream de Antenas: <span className={isReading ? "text-emerald-400 font-bold" : "text-red-500 font-bold"}>{isReading ? "CONECTADO E LENDO (LIVE)" : "STANDBY (PARADO)"}</span>
                  </div>
                </div>

                <div className="bg-[#0c0c0e] border border-zinc-900 rounded-xl overflow-hidden">
                  <div className="p-4 border-b border-zinc-900 bg-black/20 text-xs font-mono font-bold text-zinc-500 uppercase flex justify-between items-center">
                    <span>Console RFID — Tags em Tempo Real ({tagList.length})</span>
                    <button onClick={() => setTags(new Map())} className="text-[9px] text-zinc-500 hover:text-white uppercase underline">Limpar Buffer</button>
                  </div>
                  
                  <div className="p-4 max-h-[300px] overflow-y-auto font-mono text-[11px] space-y-1 bg-black/40">
                    {tagList.length === 0 ? (
                      <div className="text-zinc-700 text-center italic py-6">Nenhuma tag RFID detectada no momento. Ative a leitura RF...</div>
                    ) : (
                      tagList.map((item) => (
                        <div key={item.id} className="flex justify-between items-center text-zinc-300 py-1 border-b border-zinc-900/40">
                          <div>
                            <span className="text-zinc-500">⏱️ {formatarDataHoraSegura(item.timestamp)}</span>
                            <span className="ml-3">TAG EPC: <strong className="text-cyan-400 font-bold">{item.epc}</strong></span>
                            <span className="ml-2 text-[10px] bg-zinc-900 px-1.5 py-0.5 rounded text-zinc-400 font-bold">Lida: {item.count}x</span>
                          </div>
                          <span className="text-[10px] font-bold uppercase text-emerald-500">
                            {item.antenna}
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

        {/* ABA USUÁRIOS */}
        {activeTab === 'usuarios' && podeAcessarUsuarios && (
          <div className="max-w-7xl mx-auto space-y-6">
            <div>
              <h1 className="text-2xl font-black uppercase text-white">Controle de Usuários e Acessos</h1>
              <p className="text-xs text-zinc-500 font-mono">Gerenciamento de credenciais e privilégios da plataforma (Área Restrita do Administrador).</p>
            </div>
            <div className="bg-[#0c0c0e] border border-zinc-900 p-8 rounded-xl text-center font-mono text-xs text-zinc-500">
              Módulo de gerenciamento de usuários operacionais pronto para integração de banco de dados.
            </div>
          </div>
        )}

        {/* MODAL DE INSCRIÇÃO E EDIÇÃO DE PILOTOS */}
        {modalPilotosAberto && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-[#0c0c0e] border border-zinc-900 w-full max-w-5xl rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
              
              {/* HEADER DO MODAL */}
              <div className="p-5 border-b border-zinc-900 flex justify-between items-center bg-black/40">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg border ${pilotoEmEdicao ? 'bg-amber-950/40 border-amber-900/50 text-amber-500' : 'bg-red-950/40 border-red-900/50 text-red-500'}`}>
                    {pilotoEmEdicao ? <Edit2 size={18} /> : <UserPlus size={18} />}
                  </div>
                  <div>
                    <h2 className="text-sm font-black uppercase text-white">
                      {pilotoEmEdicao ? `Editando Piloto: ${pilotoEmEdicao.nome}` : 'Gerenciador de Inscrições do Evento'}
                    </h2>
                    <p className="text-[11px] text-zinc-500 font-mono">
                      Etapa Atual: <span className="text-red-500 font-bold uppercase">{eventoAtivo?.nome || 'Não Selecionada'}</span>
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => {
                    setModalPilotosAberto(false);
                    limparFormularioPiloto();
                  }}
                  className="p-2 text-zinc-500 hover:text-white hover:bg-zinc-900 rounded-lg transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              {/* CORPO DO MODAL */}
              <div className="p-6 overflow-y-auto grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                
                {/* COLUNA 1: FORMULÁRIO (NOVO OU EDIÇÃO DE EXISTENTE) */}
                <div className="lg:col-span-5 bg-[#08080a] p-4 rounded-xl border border-zinc-900 space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-xs font-black uppercase text-zinc-300 flex items-center gap-2">
                      {pilotoEmEdicao ? '✏️ Alterar Piloto' : '➕ Novo Cadastro Geral'}
                    </h3>
                    {pilotoEmEdicao && (
                      <button 
                        type="button" 
                        onClick={limparFormularioPiloto}
                        className="text-[10px] font-mono text-amber-500 hover:underline flex items-center gap-1 uppercase"
                      >
                        <RotateCcw size={10} /> Novo Cadastro
                      </button>
                    )}
                  </div>

                  <form onSubmit={handleCriarOuAtualizarPiloto} className="space-y-3 font-mono text-xs">
                    <div>
                      <label className="text-[10px] text-zinc-500 font-bold uppercase">Nome do Piloto</label>
                      <input 
                        type="text" 
                        placeholder="Nome Completo" 
                        value={nomePiloto} 
                        onChange={e => setNomePiloto(e.target.value)} 
                        className="w-full bg-black border border-zinc-800 rounded p-2 text-white uppercase outline-none mt-1 focus:border-red-600" 
                        required 
                      />
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="text-[10px] text-zinc-500 font-bold uppercase">Numeral</label>
                        <input 
                          type="text" 
                          placeholder="# MOTO" 
                          value={numeralPiloto} 
                          onChange={e => setNumeralPiloto(e.target.value)} 
                          className="w-full bg-black border border-zinc-800 rounded p-2 text-white text-center font-black uppercase outline-none mt-1 focus:border-red-600" 
                          required 
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="text-[10px] text-zinc-500 font-bold uppercase">Transponder (EPC)</label>
                        <input 
                          type="text" 
                          placeholder="EPC CHIP" 
                          value={transponderPiloto} 
                          onChange={e => setTransponderPiloto(e.target.value)} 
                          className="w-full bg-black border border-zinc-800 rounded p-2 text-cyan-400 font-bold uppercase outline-none mt-1 focus:border-red-600" 
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] text-zinc-500 font-bold uppercase mb-1 block">Categorias no Evento</label>
                      <div className="grid grid-cols-2 gap-1.5 max-h-[110px] overflow-y-auto p-1 bg-black rounded border border-zinc-900">
                        {categorias.map(cat => (
                          <button
                            key={cat._id}
                            type="button"
                            onClick={() => setCatsPilotoSelecionadas(prev => prev.includes(cat._id) ? prev.filter(i => i !== cat._id) : [...prev, cat._id])}
                            className={`p-1.5 rounded text-left truncate text-[10px] font-bold uppercase border ${catsPilotoSelecionadas.includes(cat._id) ? 'bg-red-950/20 text-red-400 border-red-900' : 'bg-zinc-900/40 text-zinc-400 border-transparent'}`}
                          >
                            {cat.nome}
                          </button>
                        ))}
                      </div>
                    </div>

                    <button 
                      type="submit" 
                      disabled={loadingPiloto} 
                      className={`w-full font-black py-2.5 rounded text-[11px] uppercase text-white shadow-lg transition-all ${
                        pilotoEmEdicao ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-600/10' : 'bg-red-600 hover:bg-red-700 shadow-red-600/10'
                      }`}
                    >
                      {loadingPiloto ? "PROCESSANDO..." : pilotoEmEdicao ? "Salvar Alterações" : "Cadastrar e Inscrever"}
                    </button>
                  </form>
                </div>

                {/* COLUNA 2: BUSCA GLOBAL E SELEÇÃO DE PILOTOS JÁ CADASTRADOS */}
                <div className="lg:col-span-7 space-y-4">
                  <div className="bg-[#08080a] border border-zinc-900 rounded-xl overflow-hidden flex flex-col h-[400px]">
                    <div className="p-3 border-b border-zinc-900 bg-black/40 flex justify-between items-center gap-2">
                      <span className="text-xs font-mono font-bold text-zinc-400 uppercase">Base Geral de Pilotos</span>
                      <div className="relative flex-1 max-w-xs">
                        <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500" />
                        <input 
                          type="text" 
                          placeholder="Pesquisar para vincular..." 
                          value={buscaPiloto}
                          onChange={(e) => setBuscaPiloto(e.target.value)}
                          className="w-full bg-black border border-zinc-800 rounded pl-8 pr-2 py-1 text-[11px] text-white outline-none font-mono"
                        />
                      </div>
                    </div>

                    <div className="divide-y divide-zinc-900/60 overflow-y-auto flex-1">
                      {(() => {
                        // 1. Filtra pela busca
                        const filtrados = todosPilotos.filter(p => 
                          p.nome.toLowerCase().includes(buscaPiloto.toLowerCase()) || 
                          p.numeral.includes(buscaPiloto)
                        );

                        // 2. Ordena: quem está no evento fica no TOPO
                        const ordenados = [...filtrados].sort((a, b) => {
                          const aNoEvento = a.eventoId === eventoAtivo?._id || pilotosEtapa.some(pe => pe._id === a._id);
                          const bNoEvento = b.eventoId === eventoAtivo?._id || pilotosEtapa.some(pe => pe._id === b._id);

                          if (aNoEvento && !bNoEvento) return -1; // 'a' sobe
                          if (!aNoEvento && bNoEvento) return 1;  // 'b' sobe
                          return a.nome.localeCompare(b.nome);     // desempata por ordem alfabética
                        });

                        if (ordenados.length === 0) {
                          return (
                            <div className="p-12 text-center text-zinc-600 font-mono text-xs italic">
                              Nenhum piloto localizado na base geral.
                            </div>
                          );
                        }

                        return ordenados.map(p => {
                          const estaNoEvento = p.eventoId === eventoAtivo?._id || pilotosEtapa.some(pe => pe._id === p._id);
                          
                          return (
                            <div 
                              key={p._id} 
                              className={`p-3 font-mono text-xs flex justify-between items-center transition-colors ${
                                estaNoEvento ? 'bg-emerald-950/10 hover:bg-emerald-950/20' : 'hover:bg-zinc-900/30'
                              }`}
                            >
                              <div>
                                <div className="flex items-center gap-2">
                                  <p className="text-white font-black uppercase text-xs">{p.nome}</p>
                                  {estaNoEvento && (
                                    <span className="text-[9px] bg-emerald-950 border border-emerald-800 text-emerald-400 px-1.5 py-0.5 rounded font-bold uppercase">
                                      Inscrito
                                    </span>
                                  )}
                                </div>
                                <p className="text-zinc-500 text-[10px]">
                                  #{p.numeral} — Chip: <span className="text-cyan-400 font-bold">{p.transponder || 'SEM CHIP'}</span>
                                </p>
                              </div>

                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => iniciarEdicaoPiloto(p)}
                                  className="p-1.5 bg-zinc-900 hover:bg-amber-600/20 hover:text-amber-400 border border-zinc-800 text-zinc-400 rounded transition-colors text-[10px] font-bold uppercase"
                                  title="Editar Dados"
                                >
                                  <Edit2 size={12} />
                                </button>

                                <button
                                  type="button"
                                  disabled={loadingPiloto || estaNoEvento}
                                  onClick={() => vincularPilotoAoEvento(p)}
                                  className={`px-2.5 py-1.5 rounded text-[10px] font-bold uppercase transition-colors ${
                                    estaNoEvento 
                                      ? 'bg-zinc-900/80 text-zinc-600 border border-zinc-800/50 cursor-default' 
                                      : 'bg-red-600 hover:bg-red-700 text-white cursor-pointer'
                                  }`}
                                >
                                  {estaNoEvento ? 'Já na Etapa' : 'Vincular ao Evento'}
                                </button>
                              </div>
                            </div>
                          );
                        });
                      })()}
                    </div>
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

function MetricaCard({ titulo, valor, cor, icon }: { titulo: string; valor: number; cor: string; icon: React.ReactNode }) {
  const coresMap: Record<string, string> = {
    emerald: "text-emerald-500 bg-emerald-950/20 border-emerald-900/40",
    amber: "text-amber-500 bg-amber-950/20 border-amber-900/40",
    red: "text-red-500 bg-red-950/20 border-red-900/40",
    blue: "text-blue-500 bg-blue-950/20 border-blue-900/40",
    purple: "text-purple-500 bg-purple-950/20 border-purple-900/40"
  };

  return (
    <div className="bg-[#0c0c0e] border border-zinc-900 p-4 rounded-xl flex justify-between items-center">
      <div>
        <p className="text-[10px] font-mono font-bold text-zinc-500 uppercase">{titulo}</p>
        <p className={`text-2xl font-black mt-1 ${coresMap[cor].split(' ')[0]}`}>{valor}</p>
      </div>
      <div className={`p-2.5 border rounded-lg ${coresMap[cor]}`}>{icon}</div>
    </div>
  );
}