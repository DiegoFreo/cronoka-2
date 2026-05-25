'use client';
import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, Keyboard, Trash2, Edit2, Check, ShieldAlert, Layers } from 'lucide-react';

interface BateriaSelect {
  id: string;
  nome: string; // Ex: "Bateria 1 - MX1 / MX2"
  categorias: string[]; // IDs ou nomes das categorias vinculadas
}

interface PilotoCorrida {
  id: string;
  numero: string;
  nome: string;
  tagRfid: string;
  categoria: string;
  voltas: number[];
  tempoUltimaPassagem: number;
  statusPista: 'NORMAL' | 'PREVISTO' | 'ATRASADO';
}

export default function CronometragemPage() {
  // Estados de Controle de Baterias
  const [listaBaterias, setListaBaterias] = useState<BateriaSelect[]>([]);
  const [bateriaSelecionada, setBateriaSelecionada] = useState<string>('');
  const [loadingPilotos, setLoadingPilotos] = useState(false);

  // Estados do Cronômetro Principal
  const [tempoDecorrido, setTempoDecorrido] = useState(0);
  const [cronometroAtivo, setCronometroAtivo] = useState(false);
  
  // Grid Dinâmico de Pilotos na Pista
  const [pilotos, setPilotos] = useState<PilotoCorrida[]>([]);

  const [inputManual, setInputManual] = useState('');
  const [editingVolta, setEditingVolta] = useState<{ pilotoId: string; index: number; valor: string } | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // 1. CARREGA AS BATERIAS DISPONÍVEIS AO ABRIR A TELA
useEffect(() => {
  async function carregarBaterias() {
    try {
      const res = await fetch('/api/bateria'); 
      const dados = await res.json();
      if (res.ok && Array.isArray(dados)) {
        setListaBaterias(dados);
        // Pré-seleciona a primeira bateria encontrada se houver
        if (dados.length > 0) {
          const primeiroId = dados[0]._id || dados[0].id;
          setBateriaSelecionada(primeiroId);
        }
      }
    } catch (err) {
      console.error("Erro ao carregar lista de baterias no seletor:", err);
    }
  }
  carregarBaterias();
}, []);

// 2. BUSCA OS PILOTOS ATUALIZADOS SEMPRE QUE A BATERIA SELECIONADA MUDAR
useEffect(() => {
  if (!bateriaSelecionada) {
    setPilotos([]);
    return;
  }

  async function buscarPilotosDaBateria() {
    setLoadingPilotos(true);
    setTempoDecorrido(0); // Zera o cronômetro para evitar carregar tempos da prova anterior
    setCronometroAtivo(false);
    
    try {
      // Consome a rota dinâmica que criamos no Passo 1
      const res = await fetch(`/api/bateria/${bateriaSelecionada}/pilotos`);
      const dados = await res.json();
      
      if (res.ok && Array.isArray(dados)) {
        const pilotosFormatados: PilotoCorrida[] = dados.map((p: any) => ({
          id: p._id,
          numero: p.numero,
          nome: p.nome,
          tagRfid: p.tagRfid,
          categoria: p.categoriaNome,
          voltas: [],
          tempoUltimaPassagem: 0,
          statusPista: 'NORMAL'
        }));
        setPilotos(pilotosFormatados);
      } else {
        setPilotos([]);
      }
    } catch (err) {
      console.error("Erro ao carregar pilotos do grid:", err);
      setPilotos([]);
    } finally {
      setLoadingPilotos(false);
    }
  }

  buscarPilotosDaBateria();
}, [bateriaSelecionada]);

  // 3. GERENCIADOR DO CRONÔMETRO
  useEffect(() => {
    if (cronometroAtivo) {
      const startTime = Date.now() - tempoDecorrido;
      timerRef.current = setInterval(() => {
        setTempoDecorrido(Date.now() - startTime);
      }, 10);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [cronometroAtivo]);

  // 4. MONITOR DE STATUS PREDITIVO (PISCA LARANJA / VERMELHO)
  useEffect(() => {
    const interval = setInterval(() => {
      setPilotos(prevPilotos => 
        prevPilotos.map(piloto => {
          if (piloto.voltas.length === 0) return { ...piloto, statusPista: 'NORMAL' };
          
          const melhorVolta = Math.min(...piloto.voltas);
          const tempoDesdeUltimaPassagem = Date.now() - piloto.tempoUltimaPassagem;

          if (tempoDesdeUltimaPassagem >= melhorVolta - 10000 && tempoDesdeUltimaPassagem < melhorVolta + 15000) {
            return { ...piloto, statusPista: 'PREVISTO' }; // Alerta Laranja (Chegando)
          }
          if (tempoDesdeUltimaPassagem >= melhorVolta + 15000) {
            return { ...piloto, statusPista: 'ATRASADO' }; // Alerta Vermelho (Atrasado)
          }
          return { ...piloto, statusPista: 'NORMAL' };
        })
      );
    }, 1000);

    return () => clearInterval(interval);
  }, [tempoDecorrido]);

  /* Lógica de computar voltas
  const registrarVoltaPiloto = (numeroPiloto: number, origem: 'RFID' | 'MANUAL' = 'MANUAL') => {
    if (!cronometroAtivo) return;

    setPilotos(prevPilotos => 
      prevPilotos.map(piloto => {
        if (piloto.numero === numeroPiloto || piloto.tagRfid === numeroPiloto.toString()) {
          const agora = Date.now();
          const tempoVolta = piloto.tempoUltimaPassagem === 0 ? tempoDecorrido : agora - piloto.tempoUltimaPassagem;

          return {
            ...piloto,
            voltas: [...piloto.voltas, tempoVolta],
            tempoUltimaPassagem: agora,
            statusPista: 'NORMAL'
          };
        }
        return piloto;
      })
    );
    setInputManual('');
  };*/

  const registrarVoltaPiloto = (valorInserido: string, origem: 'RFID' | 'MANUAL' = 'MANUAL') => {
  // Se o cronômetro não estiver ativo, ignora a digitação
  if (!cronometroAtivo) return;

  const termoBusca = valorInserido.trim();
  if (!termoBusca) return;

  // Atualiza o estado dos pilotos garantindo o escopo correto da função de seta
  setPilotos((prevPilotos) => {
    let pilotoEncontrado = false;

    const gridAtualizado = prevPilotos.map((piloto) => {
      const numeroMotoBate = String(piloto.numero).trim() === termoBusca;
      const tagRfidBate = piloto.tagRfid && String(piloto.tagRfid).trim() === termoBusca;

      if (numeroMotoBate || tagRfidBate) {
        pilotoEncontrado = true;
        const agora = Date.now();
        
        // Calcula tempo da volta
        const tempoVolta = piloto.tempoUltimaPassagem === 0 
          ? tempoDecorrido 
          : agora - piloto.tempoUltimaPassagem;

        return {
          ...piloto,
          voltas: [...piloto.voltas, tempoVolta],
          tempoUltimaPassagem: agora,
          statusPista: 'NORMAL' as const
        };
      }
      return piloto;
    });

    if (!pilotoEncontrado) {
      console.warn(`[Aviso] Piloto ou Chip "${termoBusca}" não localizado.`);
    }

    return gridAtualizado;
  });

  // Limpa o input após computar
  setInputManual('');
};

const finalizarCorridaOficial = async () => {
  if (pilotos.length === 0) return;
  if (!confirm("Deseja realmente encerrar a cronometragem e salvar o resultado oficial desta bateria?")) return;

  setCronometroAtivo(false); // Garante que para o tempo

  try {
    const resposta = await fetch('/api/corrida/salvar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        bateriaId: bateriaSelecionada,
        gridPilotos: pilotos.map(p => ({
          id: p.id,
          numero: p.numero,
          nome: p.nome,
          voltas: p.voltas // Envia o array de milissegundos brutos
        })),
        tempoTotalCorrida: tempoDecorrido
      })
    });

    const resultado = await resposta.json();

    if (resposta.ok) {
      alert("Corrida finalizada com sucesso! Redirecionando para os relatórios...");
      // Opcional: Redirecionar direto para a página de relatórios que criamos
      window.location.href = '/relatorios';
    } else {
      alert("Erro ao salvar corrida: " + resultado.error);
    }
  } catch (err) {
    console.error("Erro na requisição de salvamento:", err);
    alert("Erro interno ao salvar os dados da prova.");
  }
};


  const excluirPrimeiraVolta = (pilotoId: string) => {
    if (!confirm("Deseja realmente remover a primeira volta deste piloto?")) return;
    setPilotos(prev => prev.map(p => p.id === pilotoId ? { ...p, voltas: p.voltas.slice(1) } : p));
  };

  const salvarEdicaoVolta = () => {
    if (!editingVolta) return;
    const novosMs = parseFloat(editingVolta.valor) * 1000;
    setPilotos(prev => prev.map(p => {
      if (p.id === editingVolta.pilotoId) {
        const novasVoltas = [...p.voltas];
        novasVoltas[editingVolta.index] = novosMs;
        return { ...p, voltas: novasVoltas };
      }
      return p;
    }));
    setEditingVolta(null);
  };

  const formatarTempoCrono = (ms: number) => {
    const minutos = Math.floor(ms / 60000);
    const segundos = Math.floor((ms % 60000) / 1000);
    const milis = Math.floor(ms % 1000);
    return `${minutos.toString().padStart(2, '0')}:${segundos.toString().padStart(2, '0')}.${milis.toString().padStart(3, '0')}`;
  };

  const formatarSegundos = (ms: number) => (ms / 1000).toFixed(3) + 's';

  return (
    <div className="space-y-6 font-sans bg-[#070707] min-h-screen text-white">
      
      {/* SELETOR DE BATERIA ATIVA (PREMIUM DARK) */}
      <div className="bg-[#111] border border-gray-800 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Layers className="text-red-500 shrink-0" size={22} />
          <div className="flex flex-col">
            <span className="text-xs uppercase font-bold text-gray-400">Controle de Corrida Ativa</span>
            <span className="text-[11px] text-gray-500">Selecione a bateria do cronograma para alinhar o grid automaticamente</span>
          </div>
        </div>

        <div className="w-full sm:w-72">
            <select
                value={bateriaSelecionada}
                onChange={(e) => setBateriaSelecionada(e.target.value)}
                className="w-full bg-black border border-gray-800 hover:border-gray-700 rounded px-3 py-2 text-sm text-white font-semibold outline-none focus:border-red-600 cursor-pointer transition-colors"
                >
                <option value="" disabled>-- Escolha a Bateria --</option>
                {listaBaterias.map((bat: any) => (
                    <option key={bat._id || bat.id} value={bat._id || bat.id} className="bg-[#111] text-white">
                    {bat.nome}
                    </option>
                ))}
            </select>
        </div>
      </div>

      {/* Painel do Cronômetro */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-[#111] border border-gray-800 rounded-xl p-6 items-center">
        <div className="flex flex-col">
          <span className="text-xs uppercase tracking-wider text-gray-500 font-bold">Status da Bateria</span>
          <div className="flex items-center gap-2 mt-1">
            <span className={`w-2.5 h-2.5 rounded-full ${cronometroAtivo ? 'bg-green-500 animate-ping' : 'bg-amber-500'}`} />
            <h2 className="text-sm font-bold tracking-wide">{cronometroAtivo ? 'CORRIDA EM ANDAMENTO' : 'PISTA EM PAUSA'}</h2>
          </div>
        </div>

        <div className="text-center">
          <h1 className="text-5xl font-black font-mono tracking-tight text-red-500 bg-black py-2 px-4 rounded-lg border border-gray-900 inline-block">
            {formatarTempoCrono(tempoDecorrido)}
          </h1>
        </div>

        <div className="flex justify-end gap-3">
            <button 
                onClick={() => setCronometroAtivo(!cronometroAtivo)}
                disabled={pilotos.length === 0}
                className={`flex items-center gap-2 px-5 py-3 rounded-lg text-xs font-bold uppercase tracking-wider transition-all shadow-lg disabled:opacity-20 disabled:pointer-events-none ${
                cronometroAtivo ? 'bg-amber-600 hover:bg-amber-700 text-white' : 'bg-green-600 hover:bg-green-700 text-white'
                }`}
            >
                {cronometroAtivo ? <Pause size={16} /> : <Play size={16} />}
                {cronometroAtivo ? 'Pausar' : 'Dar Largada'}
            </button>
            {/* NOVO BOTÃO: SALVAR E FINALIZAR */}
            <button
                onClick={finalizarCorridaOficial}
                disabled={pilotos.length === 0 || tempoDecorrido === 0}
                className="bg-red-600 hover:bg-red-700 text-white font-bold px-4 py-3 rounded-lg text-xs uppercase tracking-wider disabled:opacity-20 transition-all shadow-lg"
            >
                Finalizar Prova
            </button>
          
            <button 
                onClick={() => { if(confirm('Zerar cronômetro atual?')) setTempoDecorrido(0); setCronometroAtivo(false); }}
                className="p-3 bg-gray-900 border border-gray-800 hover:text-red-500 rounded-lg text-gray-400 transition-colors"
            >
                <RotateCcw size={16} />
            </button>
        </div>
      </div>

      {/* Contingência Manual */}
      <div className="bg-[#111] border border-gray-800 rounded-xl p-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 text-gray-400">
          <Keyboard size={20} className="text-red-500" />
          <div className="flex flex-col">
            <span className="text-xs text-white font-bold uppercase">Contingência Manual</span>
            <span className="text-[11px] text-gray-500">Digite o número da moto caso o transponder falhe na antena</span>
          </div>
        </div>
        <div className="flex gap-2 max-w-xs w-full">
          <input 
            type="text"
            value={inputManual}
            disabled={!cronometroAtivo}
            onChange={e => setInputManual(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && registrarVoltaPiloto(inputManual, 'MANUAL')}
            placeholder="Nº Moto"
            className="bg-black border border-gray-800 disabled:opacity-30 rounded px-3 py-1.5 text-white font-mono font-bold focus:border-red-600 outline-none w-full text-center text-base"
          />
          <button 
            onClick={() => registrarVoltaPiloto(inputManual, 'MANUAL')}
            disabled={!cronometroAtivo}
            className="bg-red-600 hover:bg-red-700 disabled:opacity-30 text-white font-bold px-4 rounded text-xs tracking-wider uppercase"
          >
            Ok
          </button>
        </div>
      </div>

      {/* Grid Principal ou Estado Vazio */}
      {loadingPilotos ? (
        <div className="p-12 text-center text-sm text-gray-500 font-medium">Alinhando grid de pilotos da bateria...</div>
      ) : pilotos.length === 0 ? (
        <div className="p-12 text-center border border-dashed border-gray-800 rounded-xl bg-[#111] text-gray-500 text-sm font-medium flex flex-col items-center gap-2">
          <ShieldAlert size={24} className="text-gray-600" />
          Nenhum competidor vinculado às categorias desta bateria ou nenhuma bateria selecionada.
        </div>
      ) : (
        <div className="bg-[#111] border border-gray-800 rounded-xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-800 bg-[#161616] text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  <th className="py-4 px-6 text-center w-24">Nº Moto</th>
                  <th className="py-4 px-6">Piloto / Categoria</th>
                  <th className="py-4 px-6 text-center w-28">Voltas</th>
                  <th className="py-4 px-6 text-center w-40">Melhor Volta</th>
                  <th className="py-4 px-6">Histórico Passo a Passo (3 Casas Decimais)</th>
                  <th className="py-4 px-6 text-right w-24">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800 text-sm font-mono">
                {pilotos.map((piloto) => {
                  const totalVoltas = piloto.voltas.length;
                  const melhorVolta = totalVoltas > 0 ? Math.min(...piloto.voltas) : 0;

                  let rowStyle = "hover:bg-white/[0.01]";
                  if (piloto.statusPista === 'PREVISTO') rowStyle = "bg-amber-600/10 border-l-4 border-amber-500 animate-pulse";
                  if (piloto.statusPista === 'ATRASADO') rowStyle = "bg-red-600/10 border-l-4 border-red-500 animate-pulse";

                  return (
                    <tr key={piloto.id} className={`transition-colors ${rowStyle}`}>
                      <td className="py-4 px-6 text-center text-lg font-black text-red-500 bg-black/20">{piloto.numero}</td>
                      <td className="py-4 px-6 font-sans">
                        <div className="flex flex-col">
                          <span className="font-bold text-white uppercase">{piloto.nome}</span>
                          <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mt-0.5">{piloto.categoria}</span>
                        </div>
                      </td>
                      <td className="py-4 px-6 text-center text-base font-bold text-gray-300">{totalVoltas}</td>
                      <td className="py-4 px-6 text-center font-bold text-green-400">
                        {melhorVolta > 0 ? formatarTempoCrono(melhorVolta) : '--:--.---'}
                      </td>
                      
                      <td className="py-4 px-6 font-sans">
                        <div className="flex flex-wrap gap-1.5 max-w-xl">
                          {piloto.voltas.map((tempo, index) => (
                            <div key={index} className="flex items-center gap-1 bg-black/60 border border-gray-800 px-2 py-1 rounded text-xs">
                              <span className="text-[10px] text-gray-500 font-bold">V{index + 1}:</span>
                              {editingVolta?.pilotoId === piloto.id && editingVolta?.index === index ? (
                                <input 
                                  type="text"
                                  value={editingVolta.valor}
                                  onChange={e => setEditingVolta({ ...editingVolta, valor: e.target.value })}
                                  onKeyDown={e => e.key === 'Enter' && salvarEdicaoVolta()}
                                  className="w-14 bg-gray-900 border border-red-500 rounded text-center text-white font-mono text-xs"
                                />
                              ) : (
                                <span className="text-gray-300 font-mono font-medium">{formatarSegundos(tempo)}</span>
                              )}
                              
                              <button 
                                onClick={() => editingVolta ? salvarEdicaoVolta() : setEditingVolta({ pilotoId: piloto.id, index, valor: (tempo / 1000).toFixed(3) })}
                                className="text-gray-600 hover:text-red-400 ml-1"
                              >
                                {editingVolta?.pilotoId === piloto.id && editingVolta?.index === index ? <Check size={12} /> : <Edit2 size={10} />}
                              </button>
                            </div>
                          ))}
                        </div>
                      </td>

                      <td className="py-4 px-6 text-right font-sans">
                        <button 
                          onClick={() => excluirPrimeiraVolta(piloto.id)}
                          disabled={totalVoltas === 0}
                          className="flex items-center gap-1 text-[10px] bg-red-950/20 hover:bg-red-600 border border-red-900/40 hover:border-red-600 text-red-400 hover:text-white px-2 py-1 rounded transition-all disabled:opacity-10 disabled:pointer-events-none uppercase font-bold"
                        >
                          <Trash2 size={11} /> V1
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}