'use client';
import React, { useEffect, useState } from 'react';
import { Volume2, Play, Square, UserPlus, UserCheck, FileText, Check, Layers } from 'lucide-react';
import { useCorridaStore } from '@/app/store/useCorridaStore';

export default function TelaCronometragem() {
  const store = useCorridaStore();
  const [inputMoto, setInputMoto] = useState('');
  const [avisoSonoro, setAvisoSonoro] = useState(true);

  // Efeito do Cronômetro Principal (Precisão de 10ms)
  useEffect(() => {
    let intervalo: any = null;
    if (store.corridaAtiva) {
      intervalo = setInterval(() => {
        store.incrementarTempo(10);
      }, 10);
    } else {
      clearInterval(intervalo);
    }
    return () => clearInterval(intervalo);
  }, [store.corridaAtiva]);

  // Formata milissegundos brutos para String padrão de pista: 00:00:00.000
  const formatarTempoGeral = (ms: number) => {
    const horas = Math.floor(ms / 3600000).toString().padStart(2, '0');
    const minutos = Math.floor((ms % 3600000) / 60000).toString().padStart(2, '0');
    const segundos = Math.floor((ms % 60000) / 1000).toString().padStart(2, '0');
    const milis = (ms % 1000).toString().padStart(3, '0');
    return `${horas}:${minutos}:${segundos}.${milis}`;
  };

  const handleEntradaManualMoto = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMoto.trim()) return;
    store.registrarVoltaPiloto(inputMoto.trim());
    if (avisoSonoro) {
      const audio = new Audio('/beep.mp3'); // Alerta sonoro de passagem
      audio.play().catch(() => {});
    }
    setInputMoto('');
  };

  // Dados mocados iniciais simulando a captura da imagem enviada
  useEffect(() => {
    if (store.gridCorrida.length === 0) {
      useCorridaStore.setState({
        gridCorrida: [
          { posicao: 1, piloto: 'Raul FERNANDEZ', numeral: '25', categoria: 'FPMX1', voltas: 5, tempoTotal: '00:00:00.000', melhorVolta: '00:00.000', ultimaVolta: '00:00.000', diferenca: '0.00', pontos: 10 },
          { posicao: 2, piloto: 'Jorge MARTIN', numeral: '89', categoria: 'FPMX1', voltas: 5, tempoTotal: '00:00:00.000', melhorVolta: '00:00.000', ultimaVolta: '00:00.000', diferenca: '0.00', pontos: 8 }
        ],
        pilotoMelhorVoltaGeral: 'DIEGO'
      });
    }
  }, []);

  return (
    <div className="min-h-screen bg-black text-white p-4 font-sans select-none">
      
      {/* CORPO DO PAINEL (Layout Split: Tabela Esquerda / Controle Direita) */}
      <div className="flex flex-col lg:flex-row gap-4 w-full items-stretch">
        
        {/* BLOCO DA ESQUERDA: QUADRO DE TEMPOS E TABELA */}
        <div className="flex-1 bg-[#050505] border border-zinc-900 rounded-lg p-4 flex flex-col justify-between">
          
          <div>
            {/* Header com Nome da Prova */}
            <div className="text-center space-y-1 mb-4">
              <div className="flex items-center justify-center gap-4">
                <div className="h-[2px] w-16 bg-red-600"></div>
                <h1 className="text-2xl font-black tracking-wider uppercase">Nome da Prova</h1>
                <div className="h-[2px] w-16 bg-red-600"></div>
              </div>
              <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">FPMX 1 - FPMX 2 - FPMX 3</p>
            </div>

            {/* BARRA DE DASHBOARD DE CORRIDA */}
            <div className="grid grid-cols-1 md:grid-cols-3 border border-red-950/40 bg-[#0c0c0c] rounded-lg p-3 mb-4 divide-y md:divide-y-0 md:divide-x divide-zinc-900 text-center items-center">
              <div>
                <span className="text-[10px] uppercase font-black tracking-wider text-zinc-500 block">⏱️ Tempo de Prova:</span>
                <span className="text-xl font-mono font-black text-red-600 tracking-tight">{formatarTempoGeral(store.tempoProva)}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-black tracking-wider text-zinc-500 block">🏎️ Melhor Volta:</span>
                <span className="text-xl font-mono font-black text-red-600 tracking-tight">{store.melhorVoltaGeral}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-black tracking-wider text-zinc-500 block">🚩 Piloto com a Melhor Volta:</span>
                <span className="text-lg font-black text-white uppercase tracking-wide block">{store.pilotoMelhorVoltaGeral}</span>
              </div>
            </div>

            {/* TABELA DE OPERAÇÃO EM TEMPO REAL */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse font-mono text-xs">
                <thead>
                  <tr className="bg-[#121212] border-b border-zinc-800 text-zinc-400 font-bold uppercase text-[10px] tracking-wider">
                    <th className="py-2.5 px-3 text-center">Pos.</th>
                    <th className="py-2.5 px-4">Piloto</th>
                    <th className="py-2.5 px-3 text-center">#</th>
                    <th className="py-2.5 px-4 text-center">Categoria</th>
                    <th className="py-2.5 px-3 text-center">Volta</th>
                    <th className="py-2.5 px-4 text-center">Tempo</th>
                    <th className="py-2.5 px-4 text-center">Tempo Volta</th>
                    <th className="py-2.5 px-3 text-center">Diferença</th>
                    <th className="py-2.5 px-3 text-center">Pontos</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-900">
                  {store.gridCorrida.map((row, idx) => (
                    <tr key={idx} className="hover:bg-zinc-950 transition-colors bg-[#080808]">
                      <td className="py-3 px-3 text-center font-bold text-zinc-400">{row.posicao}</td>
                      <td className="py-3 px-4 font-black uppercase text-white flex items-center gap-2">
                        <div className={`w-1 h-4 ${idx === 0 ? 'bg-blue-500' : 'bg-purple-600'}`}></div>
                        {row.piloto}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className={`px-2 py-0.5 rounded text-[11px] font-black ${idx === 0 ? 'bg-cyan-500 text-black' : 'bg-purple-600 text-white'}`}>
                          {row.numeral}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center font-bold text-zinc-400">{row.categoria}</td>
                      <td className="py-3 px-3 text-center font-black text-white">{row.voltas}</td>
                      <td className="py-3 px-4 text-center text-zinc-300">{row.tempoTotal}</td>
                      <td className="py-3 px-4 text-center text-zinc-400">{row.melhorVolta}</td>
                      <td className="py-3 px-3 text-center text-zinc-500">{row.diferenca}</td>
                      <td className="py-3 px-3 text-center font-black text-emerald-400">{row.pontos}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Rodapé indicador de status de conexão Offline/Online */}
          <div className="pt-4 flex items-center justify-between text-[10px] uppercase font-black tracking-widest font-mono text-zinc-600 border-t border-zinc-900 mt-6">
            <span>Sistema de Cronometragem SC</span>
            <span className={store.isOnline ? "text-emerald-500" : "text-amber-500 animate-pulse"}>
              ● {store.isOnline ? "Modo Online Sincronizado" : "Modo Offline Ativo (Salvo no Navegador)"}
            </span>
          </div>
        </div>

        {/* BLOCO DA DIREITA: PAINEL LATERAL DE COMANDOS INDUSTRIAIS */}
        <div className="w-full lg:w-[320px] bg-[#07070a] border border-zinc-950 rounded-lg p-4 flex flex-col gap-3 justify-between">
          
          <div className="space-y-3">
            {/* Ativar Aviso Sonoro */}
            <button 
              onClick={() => setAvisoSonoro(!avisoSonoro)}
              className="w-full flex items-center justify-center gap-2 bg-[#121214] border border-zinc-800 hover:border-zinc-700 text-zinc-300 py-2 px-4 rounded font-bold uppercase tracking-wider text-xs transition-colors"
            >
              <Volume2 size={16} className={avisoSonoro ? "text-green-500" : "text-zinc-600"} />
              Ativar aviso sonoro
            </button>

            {/* DAR LARGADA / CONTROLAR CORRIDA */}
            {!store.corridaAtiva ? (
              <button 
                onClick={() => store.iniciarCorrida()}
                className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase tracking-wider text-sm py-3 px-4 rounded transition-all shadow-lg shadow-emerald-950/30"
              >
                <Play size={18} fill="white" /> Dar Largada
              </button>
            ) : (
              <button 
                onClick={() => store.pararCorrida()}
                className="w-full flex items-center justify-center gap-2 bg-amber-600 hover:bg-amber-700 text-white font-black uppercase tracking-wider text-sm py-3 px-4 rounded transition-all"
              >
                <Square size={18} fill="white" /> Pausar Prova
              </button>
            )}

            {/* FINALIZAR PROVA */}
            <button 
              onClick={() => {
                if(confirm("Deseja encerrar a bateria oficial e gerar as posições finais?")) {
                  store.resetarCorrida();
                }
              }}
              className="w-full flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white font-black uppercase tracking-wider text-xs py-3 px-4 rounded transition-all shadow-lg shadow-red-950/20"
            >
              Finalizar Prova
            </button>

            <div className="h-[1px] bg-zinc-900 my-2"></div>

            {/* + INCLUIR PILOTO */}
            <button className="w-full flex items-center justify-center gap-2 bg-[#0d2342] hover:bg-[#122e54] border border-blue-900/60 text-blue-400 font-black uppercase tracking-wider text-xs py-2.5 px-4 rounded transition-colors">
              <UserPlus size={15} /> + Incluir Piloto
            </button>

            {/* ALTERAR INFORMAÇÕES DO PILOTO */}
            <button className="w-full flex items-center justify-center gap-2 bg-[#121214] border border-zinc-900 hover:border-zinc-800 text-zinc-400 hover:text-white font-black uppercase tracking-wider text-[10px] py-2.5 px-4 rounded transition-all">
              Alterar Informações do Piloto
            </button>

            {/* EDITAR BATERIA */}
            <button className="w-full flex items-center justify-center gap-2 bg-[#0d2342] hover:bg-[#122e54] border border-blue-900/60 text-blue-400 font-black uppercase tracking-wider text-xs py-2.5 px-4 rounded transition-colors">
              <Layers size={15} /> Editar Bateria
            </button>

            {/* RELATÓRIO */}
            <button className="w-full flex items-center justify-center gap-2 bg-[#121214] border border-zinc-900 hover:border-zinc-800 text-zinc-400 hover:text-white font-black uppercase tracking-wider text-xs py-2.5 px-4 rounded transition-all">
              <FileText size={15} /> Relatório
            </button>
          </div>

          {/* INPUT INDUSTRIAL DO NÚMERO DA MOTO (ENTRADA RÁPIDA DE VOLTAS) */}
          <div className="space-y-2 pt-4 border-t border-zinc-900">
            <div className="flex items-center gap-1.5 text-zinc-400 font-bold uppercase text-[10px] tracking-wider">
              <span>⌨️ Digite o número da moto</span>
            </div>
            
            <form onSubmit={handleEntradaManualMoto} className="flex gap-2">
              <input 
                type="text"
                value={inputMoto}
                onChange={(e) => setInputMoto(e.target.value)}
                placeholder="# Moto"
                disabled={!store.corridaAtiva}
                className="flex-1 bg-black border border-zinc-800 rounded px-3 py-2 text-white font-mono font-black text-center focus:border-red-600 outline-none uppercase placeholder:text-zinc-700 disabled:opacity-30 transition-colors"
              />
              <button 
                type="submit"
                disabled={!store.corridaAtiva}
                className="bg-red-600 hover:bg-red-700 disabled:bg-zinc-900 disabled:text-zinc-700 text-white font-black font-mono px-4 rounded text-xs transition-colors"
              >
                OK
              </button>
            </form>

            {/* FILTRO SELECT DA BATERIA ATUAL */}
            <div className="pt-2">
              <select className="w-full bg-black border border-zinc-900 text-zinc-400 font-bold text-xs py-2 px-3 rounded outline-none focus:border-zinc-700 cursor-pointer text-center">
                <option>-- Escolha a Bateria --</option>
                <option>1ª Bateria - FPMX1</option>
                <option>2ª Bateria - FPMX2</option>
              </select>
            </div>
          </div>

        </div>
      </div>

    </div>
  );
}