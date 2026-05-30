"use client";

import React, { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import { 
  Timer, Activity, Wifi, WifiOff, Play, Pause, RotateCcw, 
  Plus, CornerDownLeft, Volume2, Flag, FileText, Settings, UserPlus, Edit3, X 
} from "lucide-react";

interface ICategoria {
  _id: string;
  nome: string;
  cor?: string;
}

interface IPiloto {
  _id: string;
  nome: string;
  numero_piloto: number;
  tagId: string;
  categorias: ICategoria[];
  voltas: number;
  ultimaPassagem: number;
  melhorVoltaMs?: number;
  tempoUltimaVoltaMs?: number;
}

export default function TelaCronometragem() {
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [bateria, setBateria] = useState<any>(null);
  const [pilotos, setPilotos] = useState<IPiloto[]>([]);
  const [wsStatus, setWsStatus] = useState(false);
  const [feed, setFeed] = useState<any[]>([]);

  // Configurações de som e estado da prova
  const [avisoSonoro, setAvisoSonoro] = useState(true);
  const [isModalIncluirAberto, setIsModalIncluirAberto] = useState(false);

  // Estado para a digitação manual do numeral
  const [numeralInput, setNumeralInput] = useState("");
  const [erroInput, setErroInput] = useState("");
  const inputNumeroRef = useRef<HTMLInputElement>(null);

  // Estados do Cronômetro de Alta Precisão
  const [tempoMs, setTempoMs] = useState(0); 
  const [cronometroRodando, setCronometroRodando] = useState(false);
  
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0); 
  const accumulatedTimeRef = useRef<number>(0); 

  const [idsCategoriasBateria, setIdsCategoriasBateria] = useState<string[]>([]);

  // 🔊 Sintetizador Nativo de Áudio (Gera um bip limpo sem precisar de arquivos externos)
  const emitirBip = () => {
    if (!avisoSonoro) return; // Se estiver mutado, não faz nada

    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContext) return;

      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine"; // Tipo de onda suave
      osc.frequency.setValueAtTime(880, ctx.currentTime); // Frequência do Bip (Nota Lá alta)
      
      // Controle do volume e fade-out rápido para evitar estalos
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.1); // Duração de 100 milissegundos
    } catch (e) {
      console.error("Erro ao reproduzir áudio:", e);
    }
  };

  // 1. Carrega dados iniciais da API
  const atualizarListaPilotosERanking = async () => {
    try {
      const res = await fetch(`/api/bateria/${id}`);
      const data = await res.json();
      
      if (data.bateria && data.pilotos) {
        const catsIds = data.bateria.categorias.map((c: any) => typeof c === 'object' ? c._id : c);
        setIdsCategoriasBateria(catsIds);

        setPilotos((pilotosAtuais) => {
          return data.pilotos.map((p: any) => {
            const pilotoExistente = pilotosAtuais.find(pa => pa._id === p._id);
            return {
              _id: p._id,
              nome: p.nome,
              numero_piloto: p.numero_piloto,
              tagId: p.tagId,
              categorias: p.categorias || [],
              voltas: pilotoExistente ? pilotoExistente.voltas : 0,
              ultimaPassagem: pilotoExistente ? pilotoExistente.ultimaPassagem : 0,
              melhorVoltaMs: pilotoExistente ? pilotoExistente.melhorVoltaMs : undefined,
              tempoUltimaVoltaMs: pilotoExistente ? pilotoExistente.tempoUltimaVoltaMs : undefined
            };
          });
        });

        setBateria(data.bateria);
      }
    } catch (e) {
      console.error("Erro ao carregar ou atualizar dados da prova", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    atualizarListaPilotosERanking();
  }, [id]);

  // 2. Controle do Intervalo do Cronômetro
  useEffect(() => {
    if (cronometroRodando) {
      startTimeRef.current = Date.now();
      
      intervalRef.current = setInterval(() => {
        const pularTempo = Date.now() - startTimeRef.current;
        setTempoMs(accumulatedTimeRef.current + pularTempo);
      }, 33); 
      
      setTimeout(() => inputNumeroRef.current?.focus(), 50);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      accumulatedTimeRef.current = tempoMs;
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [cronometroRodando]);

  // 3. Conecta ao Bridge RFID via WebSocket
  useEffect(() => {
    const socket = new WebSocket("ws://localhost:8080");

    socket.onopen = () => setWsStatus(true);
    socket.onclose = () => setWsStatus(false);

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.event === "TAG_READ") {
          processarPassagemGenerica({ rfidTag: data.tagId, tipo: "AUTO" });
        }
      } catch (err) {
        console.error("Erro ao processar mensagem socket:", err);
      }
    };

    return () => socket.close();
  }, []);

  // 4. Central de Processamento de Voltas
  const processarPassagemGenerica = ({ rfidTag, numero, tipo }: { rfidTag?: string, numero?: number, tipo: "AUTO" | "MANUAL" }) => {
    if (!cronometroRodando) return false;

    const agora = Date.now();
    let encontrado = false;
    let computedSucessfully = false;

    setPilotos((prevPilotos) => {
      return prevPilotos.map((p) => {
        const matchTag = rfidTag && p.tagId && p.tagId.toUpperCase() === rfidTag.toUpperCase();
        const matchNumero = numero && p.numero_piloto === numero;

        if (matchTag || matchNumero) {
          encontrado = true;
          const trava = tipo === "AUTO" ? 5000 : 1000;
          
          if (agora - p.ultimaPassagem < trava) return p;

          computedSucessfully = true;
          const tempoVoltaAtual = p.ultimaPassagem === 0 ? tempoMs : tempoMs - (p.ultimaPassagem - (startTimeRef.current - accumulatedTimeRef.current));
          const novaMelhorVolta = !p.melhorVoltaMs || tempoVoltaAtual < p.melhorVoltaMs ? tempoVoltaAtual : p.melhorVoltaMs;

          const novaPassagem = {
            nome: p.nome,
            hora: new Date().toLocaleTimeString(),
            num: p.numero_piloto,
            tipo
          };
          
          setFeed((f) => [novaPassagem, ...f].slice(0, 10)); 

          return { 
            ...p, 
            voltas: p.voltas + 1, 
            ultimaPassagem: agora,
            tempoUltimaVoltaMs: tempoVoltaAtual,
            melhorVoltaMs: novaMelhorVolta
          };
        }
        return p;
      });
    });

    // 🚀 Toca o BIP apenas se a volta foi realmente contabilizada com sucesso
    if (computedSucessfully) {
      emitirBip();
    }

    return encontrado;
  };

  // Envio do formulário do numeral da moto
  const lancarPassagemPorNumeral = (e: React.FormEvent) => {
    e.preventDefault();
    setErroInput("");
    
    if (!cronometroRodando) {
      setErroInput("Inicie a corrida primeiro!");
      setNumeralInput("");
      return;
    }

    const numeroDigitado = parseInt(numeralInput.trim(), 10);

    if (isNaN(numeroDigitado)) {
      setErroInput("Nº Inválido");
      setNumeralInput("");
      inputNumeroRef.current?.focus();
      return;
    }

    const sucesso = processarPassagemGenerica({ numero: numeroDigitado, tipo: "MANUAL" });
    
    setNumeralInput("");
    if (!sucesso) {
      setErroInput(`Piloto #${numeroDigitado} não encontrado`);
    }
    
    setTimeout(() => inputNumeroRef.current?.focus(), 10);
  };

  const aoSalvarNovoPilotoNoModal = async () => {
    await atualizarListaPilotosERanking();
    setIsModalIncluirAberto(false);
  };

  const formatarTempoMilissegundos = (totalMs: number) => {
    if (!totalMs || totalMs <= 0) return "00:00.000";
    const minutos = Math.floor(totalMs / 60000);
    const segundos = Math.floor((totalMs % 60000) / 1000);
    const milissegundos = totalMs % 1000;

    const mm = minutos.toString().padStart(2, "0");
    const ss = segundos.toString().padStart(2, "0");
    const mmm = milissegundos.toString().padStart(3, "0");

    return `${mm}:${ss}.${mmm}`;
  };

  const alternarCronometro = () => {
    setCronometroRodando(!cronometroRodando);
  };

  const finalizarProva = () => {
    if (window.confirm("Deseja realmente encerrar a prova atual?")) {
      setCronometroRodando(false);
    }
  };

  const ranking = [...pilotos].sort((a, b) => {
    if (b.voltas !== a.voltas) return b.voltas - a.voltas;
    return a.ultimaPassagem - b.ultimaPassagem;
  });

  const pilotoMelhorVoltaGeral = [...pilotos]
    .filter(p => p.melhorVoltaMs && p.melhorVoltaMs > 0)
    .sort((a, b) => (a.melhorVoltaMs || 0) - (b.melhorVoltaMs || 0))[0];

  if (loading) return <div className="min-h-screen bg-black flex items-center justify-center text-white font-medium">Carregando Grid...</div>;

  return (
    <div className="min-h-screen bg-[#05070c] text-slate-100 p-4 font-sans select-none">
      
      {/* 1. SEÇÃO DO TOPO */}
      <header className="text-center mb-4">
        <h1 className="text-2xl font-black text-white uppercase tracking-wider">
          {bateria?.nome || "NOME DA PROVA"}
        </h1>
        <p className="text-xs text-zinc-400 font-bold uppercase mt-1 tracking-widest">
          {bateria?.categorias?.map((c: any) => c.nome).join(" - ") || "FPMX 1 - FPMX 2 - FPMX 3"}
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4 max-w-5xl mx-auto">
          {/* TEMPO DE PROVA */}
          <div className="bg-[#0b0e14] border border-red-950/40 rounded-xl p-3 flex items-center gap-4 shadow-inner relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-red-600"></div>
            <div className="bg-red-950/30 p-2.5 rounded-lg text-red-500">
              <Timer size={24} className={cronometroRodando ? "animate-spin [animation-duration:10s]" : ""} />
            </div>
            <div className="text-left font-mono">
              <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Tempo de Prova</p>
              <p className="text-2xl font-black tracking-tight text-amber-500">
                {formatarTempoMilissegundos(tempoMs).split('.')[0]}
                <span className="text-lg font-bold text-amber-600/80">.{formatarTempoMilissegundos(tempoMs).split('.')[1]}</span>
              </p>
            </div>
          </div>

          {/* MELHOR VOLTA DA PROVA */}
          <div className="bg-[#0b0e14] border border-red-950/40 rounded-xl p-3 flex items-center gap-4 shadow-inner relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-red-600"></div>
            <div className="bg-red-950/30 p-2.5 rounded-lg text-red-500">
              <Activity size={24} />
            </div>
            <div className="text-left font-mono">
              <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Melhor Volta</p>
              <p className="text-2xl font-black tracking-tight text-red-500">
                {pilotoMelhorVoltaGeral ? formatarTempoMilissegundos(pilotoMelhorVoltaGeral.melhorVoltaMs || 0) : "00:00.000"}
              </p>
            </div>
          </div>

          {/* PILOTO COM A MELHOR VOLTA */}
          <div className="bg-[#0b0e14] border border-red-950/40 rounded-xl p-3 flex items-center gap-4 shadow-inner relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-red-600"></div>
            <div className="bg-red-950/30 p-2.5 rounded-lg text-red-500">
              <Flag size={24} />
            </div>
            <div className="text-left">
              <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Piloto com a Melhor Volta</p>
              <p className="text-xl font-black text-white uppercase tracking-tight truncate max-w-[200px] mt-0.5">
                {pilotoMelhorVoltaGeral ? pilotoMelhorVoltaGeral.nome.split(" ")[0] : "---"}
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* 2. CORPO PRINCIPAL */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 items-start">
        
        {/* TABELA ESQUERDA */}
        <div className="lg:col-span-4 bg-[#090c12] rounded-xl border border-zinc-900 overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse font-mono">
              <thead>
                <tr className="bg-[#0e121a] border-b border-zinc-800 text-zinc-400 text-[11px] font-bold uppercase tracking-wider">
                  <th className="p-3 w-16 text-center">Pos.</th>
                  <th className="p-3 w-24 text-center">Número</th>
                  <th className="p-3 font-sans">Piloto</th>
                  <th className="p-3 font-sans">Categoria</th>
                  <th className="p-3 text-center w-20">Volta</th>
                  <th className="p-3 text-center">Tempo</th>
                  <th className="p-3 text-center">Tempo Volta</th>
                  <th className="p-3 text-center">Diferença</th>
                  <th className="p-3 text-center w-20">Pontos</th>
                </tr>
              </thead>
              <tbody>
                {ranking.map((p, index) => {
                  const isLeader = index === 0;
                  const diferenca = isLeader ? "-" : p.voltas > 0 && ranking[0].tempoUltimaVoltaMs && p.tempoUltimaVoltaMs 
                    ? `+${((p.tempoUltimaVoltaMs - ranking[0].tempoUltimaVoltaMs) / 1000).toFixed(3)}s` 
                    : "---";

                  return (
                    <tr key={p._id} className="border-b border-zinc-900/60 hover:bg-[#121722]/40 transition-colors">
                      <td className="p-3 text-center font-sans font-black text-lg italic text-zinc-500">#{index + 1}</td>
                      <td className="p-3 text-center">
                        <span className="bg-white text-black px-2.5 py-0.5 rounded font-black text-lg inline-block min-w-10 text-center shadow-md">
                          {p.numero_piloto}
                        </span>
                      </td>
                      <td className="p-3 font-sans">
                        <p className="font-bold text-white uppercase text-sm tracking-tight">{p.nome}</p>
                        <p className="text-[9px] text-zinc-600 tracking-widest">{p.tagId || "SEM TAG"}</p>
                      </td>
                      <td className="p-3 font-sans">
                        <div className="flex flex-wrap gap-1">
                          {p.categorias
                            ?.filter((cat: any) => idsCategoriasBateria.includes(cat._id))
                            .map((cat: any) => (
                              <span key={cat._id} className="text-[10px] font-black px-1.5 py-0.5 rounded text-zinc-300 bg-zinc-800/60 border border-zinc-700/50">
                                {cat.nome}
                              </span>
                            ))}
                        </div>
                      </td>
                      <td className="p-3 text-center"><span className="text-xl font-black text-red-500">{p.voltas}</span></td>
                      <td className="p-3 text-center text-xs font-semibold text-zinc-300">
                        {p.voltas > 0 ? formatarTempoMilissegundos(p.tempoUltimaVoltaMs || 0).split('.')[0] : "--:--"}
                      </td>
                      <td className="p-3 text-center text-xs font-bold text-zinc-100">
                        {p.tempoUltimaVoltaMs ? formatarTempoMilissegundos(p.tempoUltimaVoltaMs) : "00:00.000"}
                      </td>
                      <td className="p-3 text-center text-xs text-zinc-400 font-medium">{diferenca}</td>
                      <td className="p-3 text-center font-bold text-sm text-zinc-500">
                        {p.voltas > 0 ? (25 - index > 0 ? 25 - index : 0) : 0}
                      </td>
                    </tr>
                  );
                })}

                {ranking.length === 0 && (
                  <tr>
                    <td colSpan={9} className="p-12 text-center text-zinc-600 font-sans text-xs">
                      <div className="flex flex-col items-center justify-center gap-3">
                        <div className="border-2 border-dashed border-zinc-800 p-4 rounded-full text-zinc-700">⚠️</div>
                        <p>Nenhum competidor vinculado às categorias desta bateria ou nenhuma bateria selecionada.</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* BARRA LATERAL DIREITA DE CONTROLES */}
        <div className="flex flex-col gap-2.5 w-full">
          
          {/* Botão de Aviso Sonoro Sincronizado */}
          <button 
            onClick={() => setAvisoSonoro(!avisoSonoro)}
            className={`w-full py-2.5 px-4 rounded-xl font-semibold text-xs transition-all border flex items-center justify-between shadow-sm ${
              avisoSonoro ? "bg-zinc-900 border-zinc-800 text-zinc-300 hover:bg-zinc-800" : "bg-zinc-950 border-zinc-900 text-zinc-600"
            }`}
          >
            <span className="flex items-center gap-2"><Volume2 size={14} /> Ativar aviso sonoro</span>
            <span className={`text-[9px] px-1.5 py-0.5 rounded font-black ${avisoSonoro ? "bg-green-500/20 text-green-400" : "bg-zinc-800 text-zinc-500"}`}>
              {avisoSonoro ? "LIGADO" : "MUTADO"}
            </span>
          </button>

          <button
            onClick={alternarCronometro}
            className={`w-full py-3.5 px-4 rounded-xl font-black uppercase text-sm tracking-wider transition-all flex items-center justify-center gap-2 shadow-lg active:scale-[0.98] border ${
              cronometroRodando
                ? "bg-amber-600/10 hover:bg-amber-600/20 border-amber-500 text-amber-500"
                : "bg-[#14532d] hover:bg-[#166534] border-green-600 text-white"
            }`}
          >
            {cronometroRodando ? <><Pause size={18} /> Pausar Cronômetro</> : <><Play size={18} /> Dar Largada</>}
          </button>

          <button 
            onClick={finalizarProva}
            disabled={tempoMs === 0}
            className="w-full bg-[#991b1b] hover:bg-[#b91c1c] disabled:opacity-40 disabled:hover:bg-[#991b1b] text-white py-2.5 px-4 rounded-xl font-black uppercase text-xs tracking-wider border border-red-700 transition-all active:scale-[0.98] shadow-md"
          >
            Finalizar Prova
          </button>

          <div className="grid grid-cols-1 gap-2 mt-1">
            <button 
              onClick={() => setIsModalIncluirAberto(true)}
              className="w-full bg-[#1e3a8a] hover:bg-[#1d4ed8] text-white py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 border border-blue-700 transition-colors"
            >
              <UserPlus size={14} /> + Incluir Piloto
            </button>
            <button className="w-full bg-[#1e3a8a] hover:bg-[#1d4ed8] text-white py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 border border-blue-700 transition-colors">
              <Settings size={14} /> Alterar Informações do Piloto
            </button>
            <button className="w-full bg-[#1e3a8a] hover:bg-[#1d4ed8] text-white py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 border border-blue-700 transition-colors">
              <Edit3 size={14} /> Editar Bateria
            </button>
            <button className="w-full bg-[#1e3a8a] hover:bg-[#1d4ed8] text-white py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 border border-blue-700 transition-colors">
              <FileText size={14} /> Relatório
            </button>
          </div>

          {/* INPUT MANUAL CONDICIONADO */}
          <div className={`border rounded-xl p-3 mt-2 shadow-inner transition-all ${
            cronometroRodando 
              ? "bg-[#0b0e14] border-zinc-900" 
              : "bg-zinc-950/40 border-zinc-950 opacity-40 select-none pointer-events-none"
          }`}>
            <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block mb-2">
              {cronometroRodando ? "⌨️ Digite o número da moto" : "🚫 Aguardando Largada"}
            </label>
            <form onSubmit={lancarPassagemPorNumeral} className="flex gap-1.5">
              <input 
                ref={inputNumeroRef}
                type="text"
                pattern="[0-9]*"
                inputMode="numeric"
                placeholder="Nº Moto"
                disabled={!cronometroRodando}
                value={numeralInput}
                onChange={(e) => {
                  setNumeralInput(e.target.value);
                  if(erroInput) setErroInput("");
                }}
                className="flex-1 bg-black border border-zinc-800 disabled:border-zinc-900 rounded-lg px-3 py-1.5 text-base font-black text-white text-center placeholder-zinc-700 focus:outline-none focus:border-red-600 transition-colors font-mono"
              />
              <button 
                type="submit"
                disabled={!cronometroRodando}
                className="bg-[#991b1b] hover:bg-red-600 disabled:bg-zinc-900 text-white px-4 rounded-lg border border-red-700 hover:border-red-500 disabled:border-zinc-800 transition-all font-black text-sm active:scale-95 shadow-md"
              >
                OK
              </button>
            </form>
            {erroInput && (
              <p className="text-[10px] text-red-500 font-bold mt-1.5 animate-pulse text-center">⚠️ {erroInput}</p>
            )}
          </div>

          {/* Status do Hardware */}
          <div className="bg-[#080a0f] border border-zinc-900/60 p-2.5 rounded-xl flex items-center justify-between mt-1 text-[11px]">
            <span className="text-zinc-500 font-bold uppercase tracking-wider">Antena RFID</span>
            <div className="flex items-center gap-1.5">
              <span className={`font-black tracking-tight ${wsStatus ? "text-green-400" : "text-red-500"}`}>{wsStatus ? "ONLINE" : "OFFLINE"}</span>
              {wsStatus ? <Wifi className="text-green-400 size-3.5" /> : <WifiOff className="text-red-500 size-3.5" />}
            </div>
          </div>

        </div>
      </div>

      {/* MODAL INTEGRADO */}
      {isModalIncluirAberto && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0b0e14] border border-zinc-800 w-full max-w-md rounded-2xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-[#0e121a] p-4 border-b border-zinc-800 flex justify-between items-center">
              <h3 className="font-black text-white uppercase text-sm tracking-wider flex items-center gap-2">
                <UserPlus size={16} className="text-blue-500" /> Vincular Piloto à Bateria
              </h3>
              <button onClick={() => setIsModalIncluirAberto(false)} className="text-zinc-500 hover:text-white transition-colors">
                <X size={18} />
              </button>
            </div>
            
            <div className="p-4">
              <p className="text-xs text-zinc-400 mb-4">Selecione o piloto desejado abaixo para sincronizar no grid em tempo real.</p>
              <div className="h-24 bg-black/40 rounded-xl border border-zinc-900 flex items-center justify-center text-xs text-zinc-600 italic">
                [ Seu componente de select/busca de piloto entra aqui ]
              </div>
              <div className="flex justify-end gap-2 mt-6">
                <button onClick={() => setIsModalIncluirAberto(false)} className="bg-zinc-900 hover:bg-zinc-800 text-zinc-400 px-4 py-2 rounded-xl text-xs font-bold transition-colors">Cancelar</button>
                <button onClick={aoSalvarNovoPilotoNoModal} className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-md transition-colors">Confirmar e Sincronizar</button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}