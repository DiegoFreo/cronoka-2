'use client';
import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { 
  FileText, Calendar, MapPin, ChevronRight, Loader2,
  BarChart3, Flag, Users, Settings, FlagTriangleRight, X, Layers, Globe
} from 'lucide-react';

interface Bateria {
  _id: string;
  nome: string;
  status: 'agendada' | 'finalizada' | 'Na_Pista';
  resultadoId?: string; // ID da tabela resultados_corridas
}

interface Evento {
  _id: string;
  nome: string;
  data: string;
  local: string;
  baterias?: Bateria[];
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

export default function CentralRelatoriosAdmin() {
  const router = useRouter();
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [bateriasPorEvento, setBateriasPorEvento] = useState<{ [key: string]: Bateria[] }>({});
  const [loading, setLoading] = useState(true);
  const [eventoAberto, setEventoAberto] = useState<string | null>(null);
  // Controle de Abas principais do Menu Lateral
  const [activeTab, setActiveTab] = useState<'dashboard' | 'pilotos' | 'relatorios' | 'configuracoes'>('relatorios');
  // Estado para armazenar os últimos chips lidos para teste na tela de engenharia
  const [ultimasTagsLidas, setUltimasTagsLidas] = useState<{ tag: string; dataHora: string; antena: string }[]>([]);
  
  // Estados para o Modal de Seleção de Formato de Impressão
  const [modalAberto, setModalAberto] = useState(false);
  const [bateriaSelecionada, setBateriaSelecionada] = useState<Bateria | null>(null);

  // Estados de Hardware (RFID Redundância)
    const [leitoras, setLeitoras] = useState<LeitoraConfig[]>([]);


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
    async function carregarDados() {
      try {
        setLoading(true);
        const res = await fetch('/api/bateria'); 
        if (!res.ok) throw new Error("Erro ao carregar relatórios");
        
        const dadosBaterias = await res.json();
        
        const mapaEventos: { [key: string]: any } = {};
        const mapaBaterias: { [key: string]: any[] } = {};
        
        dadosBaterias.forEach((bat: any) => {
          const evento = bat.eventoId; 
          if (evento && evento._id) {
            mapaEventos[evento._id] = {
              _id: evento._id,
              nome: evento.nome,
              local: evento.local,
              data: evento.data
            };
            
            if (!mapaBaterias[evento._id]) {
              mapaBaterias[evento._id] = [];
            }

            mapaBaterias[evento._id].push({
              _id: bat._id,
              nome: bat.nome,
              status: bat.status,
              resultadoId: bat.resultadoId
            });
          }
        });
        
        setEventos(Object.values(mapaEventos));
        setBateriasPorEvento(mapaBaterias);

      } catch (err) {
        console.error("Erro na carga da central de relatórios:", err);
      } finally {
        setLoading(false);
      }
    }
    carregarDados();
  }, []);

  // Abre as opções ao clicar na bateria
  const lidarCliqueBateria = (bateria: Bateria) => {
    setBateriaSelecionada(bateria);
    setModalAberto(true);
  };

  // Redireciona aplicando a Query String correta para a página de visualização tratar
  const redirecionarParaRelatorio = (tipo: 'geral' | 'categoria') => {
    if (!bateriaSelecionada || !bateriaSelecionada.resultadoId) return;
    
    router.push(`/admin/relatorios/${bateriaSelecionada.resultadoId}?tipo=${tipo}&origem=/admin/relatorios`);
    setModalAberto(false);
    setBateriaSelecionada(null);
  };

  //ir para o painel principal
  const irParaPainelPrincipal = () => {
    router.push('/admin/painel');
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

  return (
    <div className="min-h-screen w-screen bg-[#050505] text-zinc-100 font-sans antialiased flex p-0 overflow-x-hidden select-none">
      
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
                 onClick={() => { irParaPainelPrincipal(); }} 
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
               onClick={()=>{setActiveTab('relatorios')}}
                 className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors font-sans uppercase tracking-wide ${activeTab === 'relatorios' ? 'bg-zinc-900 text-white font-bold border-l-2 border-red-600' : 'hover:bg-zinc-900 hover:text-zinc-200'}`}
               >
                 <FileText size={16} className={activeTab === 'relatorios' ? 'text-red-500' : 'text-zinc-500'} /> Relatórios
               </button>
             </nav>
           </aside>

      {/* CONTEÚDO PRINCIPAL */}
      <main className="flex-1 p-8 space-y-6 overflow-y-auto h-screen">
        <div className="border-b border-zinc-900 pb-5">
          <h1 className="text-2xl font-black uppercase tracking-tight text-white flex items-center gap-3">
            <FileText className="text-red-500" size={26} /> Relatórios de Baterias Finalizadas
          </h1>
          <p className="text-xs text-zinc-500 font-mono mt-1">
            Selecione uma bateria concluída para definir as configurações de ordenação e emissão do relatório.
          </p>
        </div>

        {loading ? (
          <div className="p-12 text-center text-zinc-600 font-mono text-xs flex flex-col items-center justify-center gap-3 animate-pulse">
            <Loader2 className="animate-spin text-red-500" size={20} />
            FILTRANDO BATERIAS FINALIZADAS...
          </div>
        ) : (
          <div className="space-y-4">
            {eventos.map(ev => {
              const bateriasFinalizadas = bateriasPorEvento[ev._id] || [];
              if (bateriasFinalizadas.length === 0) return null;

              return (
                <div key={ev._id} className="bg-[#0b0b0c] border border-zinc-900 rounded-xl p-4 space-y-3">
                  <div 
                    onClick={() => setEventoAberto(eventoAberto === ev._id ? null : ev._id)}
                    className="flex justify-between items-center cursor-pointer group"
                  >
                    <div>
                      <h3 className="text-sm font-black text-white uppercase tracking-wide group-hover:text-red-500 transition-colors">
                        {ev.nome}
                      </h3>
                      <p className="text-[11px] text-zinc-500 font-mono flex items-center gap-3 mt-0.5">
                        <span className="flex items-center gap-1"><MapPin size={11} /> {ev.local}</span>
                        <span className="flex items-center gap-1"><Calendar size={11} /> {ev.data ? new Date(ev.data).toLocaleDateString('pt-BR') : ''}</span>
                        <span className="text-emerald-500 font-bold">({bateriasFinalizadas.length} prontas)</span>
                      </p>
                    </div>
                    <ChevronRight size={16} className={`text-zinc-500 transition-transform ${eventoAberto === ev._id ? 'rotate-90 text-white' : ''}`} />
                  </div>

                  {/* Sublista de Baterias Finalizadas */}
                  {eventoAberto === ev._id && (
                    <div className="pt-2 border-t border-zinc-900 grid grid-cols-1 sm:grid-cols-2 gap-2 animate-fadeIn">
                      {bateriasFinalizadas.map(bateria => (
                        <div
                          key={bateria._id}
                          onClick={() => lidarCliqueBateria(bateria)}
                          className="bg-[#111113] border border-zinc-800 p-3 rounded-lg flex items-center justify-between hover:border-red-600/50 cursor-pointer transition-all group/item"
                        >
                          <div className="flex items-center gap-2.5">
                            <FlagTriangleRight size={14} className="text-red-500" />
                            <span className="text-xs font-bold text-zinc-300 group-hover/item:text-white uppercase font-mono">
                              {bateria.nome}
                            </span>
                          </div>
                          <span className="text-[9px] font-mono font-bold bg-zinc-900 border border-zinc-800 group-hover/item:border-red-600/40 text-zinc-400 group-hover/item:text-white px-2 py-0.5 rounded uppercase transition-colors">
                            Configurar Emissão
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* MODAL DE SELEÇÃO DO FORMATO DO RELATÓRIO */}
      {modalAberto && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-[#09090a] border border-zinc-900 w-full max-w-md rounded-2xl p-6 relative shadow-2xl space-y-5">
            
            <button 
              onClick={() => { setModalAberto(false); setBateriaSelecionada(null); }}
              className="absolute top-4 right-4 text-zinc-500 hover:text-white transition-colors"
            >
              <X size={18} />
            </button>

            <div>
              <span className="text-[10px] font-mono text-red-500 uppercase tracking-widest font-bold">Emissão de Resultado</span>
              <h2 className="text-lg font-black text-white uppercase tracking-tight mt-0.5">
                {bateriaSelecionada?.nome}
              </h2>
              <p className="text-xs text-zinc-500 mt-1 font-sans">
                Como deseja estruturar e imprimir as paradas e tempos dos pilotos desta bateria?
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3">
              {/* Opção 1: Relatório Geral */}
              <button
                onClick={() => redirecionarParaRelatorio('geral')}
                className="flex items-start gap-4 p-4 rounded-xl border border-zinc-800 bg-[#111113] hover:border-red-600/50 transition-all text-left group"
              >
                <div className="bg-zinc-900 border border-zinc-800 p-2.5 rounded-lg group-hover:border-red-600/30 transition-colors mt-0.5">
                  <Globe size={18} className="text-zinc-400 group-hover:text-red-500 transition-colors" />
                </div>
                <div>
                  <h4 className="text-xs font-black uppercase text-white tracking-wide">Relatório Geral</h4>
                  <p className="text-[11px] text-zinc-500 font-sans mt-0.5 leading-relaxed">
                    Lista unificada com todas as categorias juntas. Agrupa todos os pilotos e seus respectivos tempos em uma única listagem geral.
                  </p>
                </div>
              </button>

              {/* Opção 2: Relatório por Categoria */}
              <button
                onClick={() => redirecionarParaRelatorio('categoria')}
                className="flex items-start gap-4 p-4 rounded-xl border border-zinc-800 bg-[#111113] hover:border-red-600/50 transition-all text-left group"
              >
                <div className="bg-zinc-900 border border-zinc-800 p-2.5 rounded-lg group-hover:border-red-600/30 transition-colors mt-0.5">
                  <Layers size={18} className="text-zinc-400 group-hover:text-red-500 transition-colors" />
                </div>
                <div>
                  <h4 className="text-xs font-black uppercase text-white tracking-wide">Por Categoria</h4>
                  <p className="text-[11px] text-zinc-500 font-sans mt-0.5 leading-relaxed">
                    Separa os resultados estritamente por suas categorias internas. Ideal para realizar e imprimir premiações individuais.
                  </p>
                </div>
              </button>
            </div>

            <div className="pt-2 border-t border-zinc-900 text-center">
              <button 
                onClick={() => { setModalAberto(false); setBateriaSelecionada(null); }}
                className="text-[10px] font-mono text-zinc-500 hover:text-zinc-300 uppercase tracking-wide transition-colors"
              >
                Cancelar Operação
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}