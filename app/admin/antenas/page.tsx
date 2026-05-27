'use client';
import React, { useState, useEffect, useRef } from 'react';
import { Radio, Check, RefreshCw, Cpu, Activity, Database, AlertCircle } from 'lucide-react';

export default function AntenasPage() {
  const [baterias, setBaterias] = useState<any>([]);
  const [bateriaSelecionada, setBateriaSelecionada] = useState('');
  
  // Estados do Hardware - 🔥 Atualizado para o IP correto da sua rede
  const [ipLeitor, setIpLeitor] = useState('192.168.1.121');
  const [portaLeitor, setPortaLeitor] = useState('5084');
  const [potenciaDbm, setPotenciaDbm] = useState('30'); 
  const [antenas, setAntenas] = useState({ ant1: true, ant2: true, ant3: false, ant4: false });
  
  // Status de Conexão Real (WebSocket)
  const [statusConexao, setStatusConexao] = useState<'DISCONNECTED' | 'CONNECTING' | 'CONNECTED'>('DISCONNECTED');
  const [logsLeitura, setLogsLeitura] = useState<{ time: string; tag: string; antena: number }[]>([]);
  const [salvando, setSalvando] = useState(false);

  // Referência para guardar a instância do WebSocket e evitar conexões duplicadas
  const socketRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    // Carrega as baterias para vincular o hardware
    async function carregarBaterias() {
      try {
        const res = await fetch('/api/bateria'); // Ajustado para baterias no singular baseado no seu projeto
        const dados = await res.json();
        if (res.ok && Array.isArray(dados)) {
          setBaterias(dados);
          if (dados.length > 0) setBateriaSelecionada(dados[0]._id || dados[0].id);
        }
      } catch (err) {
        console.error("Erro ao carregar baterias:", err);
      }
    }
    carregarBaterias();

    // Cleanup: Garante que fecha a conexão se o usuário mudar de página
    return () => {
      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, []);

  // 🔥 INTEGRAÇÃO REAL: Conecta ao servidor local via WebSocket
  const conectarAoLeitorLocal = () => {
    if (socketRef.current) socketRef.current.close();

    setStatusConexao('CONNECTING');

    // Endereço do seu bridge.js (Ex: se ele roda na porta 8080 ou 4000 do Node)
    // Se o bridge roda na mesma máquina, usamos localhost
    const WS_URL = 'ws://localhost:8080'; 
    
    const ws = new WebSocket(WS_URL);
    socketRef.current = ws;

    ws.onopen = () => {
      setStatusConexao('CONNECTED');
      console.log('Conectado ao bridge de telemetria!');
      
      // Envia os parâmetros de configuração (potência, antenas) assim que conecta
      ws.send(JSON.stringify({
        action: 'CONFIGURE',
        ip: ipLeitor,
        porta: portaLeitor,
        potencia: potenciaDbm,
        antenas
      }));
    };

    ws.onmessage = (event) => {
      try {
        const dadosRfid = JSON.parse(event.data);
        
        // Espera receber um evento do tipo 'TAG_READ' do seu bridge
        if (dadosRfid.event === 'TAG_READ') {
          setLogsLeitura(prev => [
            { 
              time: new Date().toLocaleTimeString('pt-BR'), 
              tag: dadosRfid.tagId, // Código EPC completo (Ex: E28011...)
              antena: dadosRfid.antena || 1
            },
            ...prev.slice(0, 14) // Mantém os últimos 15 logs na tela
          ]);

          // 💡 DICA: Se a tela de cronometragem estiver aberta em outra aba,
          // você pode disparar um CustomEvent ou salvar as passagens direto na API aqui!
        }
      } catch (err) {
        console.error("Erro ao processar dados da leitora:", err);
      }
    };

    ws.onerror = (error) => {
      console.error('Erro no WebSocket:', error);
      setStatusConexao('DISCONNECTED');
    };

    ws.onclose = () => {
      setStatusConexao('DISCONNECTED');
      console.log('Conexão com o bridge encerrada.');
    };
  };

  const desconectarLeitor = () => {
    if (socketRef.current) {
      socketRef.current.close();
      socketRef.current = null;
    }
    setStatusConexao('DISCONNECTED');
  };

  const salvarConfiguracao = async (e: React.FormEvent) => {
    e.preventDefault();
    setSalvando(true);
    try {
      const res = await fetch('/api/antenas/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bateriaId: bateriaSelecionada,
          ipLeitor,
          portaLeitor,
          potenciaDbm,
          antenasAtivas: antenas
        })
      });
      if (res.ok) {
        alert('Parâmetros de hardware sincronizados no banco de dados!');
        
        // Se estiver conectado, envia as novas configurações a quente para o bridge
        if (statusConexao === 'CONNECTED' && socketRef.current) {
          socketRef.current.send(JSON.stringify({
            action: 'RECONFIGURE',
            potencia: potenciaDbm,
            antenas
          }));
        }
      }
    } catch (err) {
      console.error(err);
      alert('Erro ao salvar no banco.');
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="bg-[#070707] min-h-screen text-white p-4 sm:p-6 font-sans space-y-6">
      
      {/* HEADER */}
      <div className="border-b border-gray-800 pb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-black tracking-tight uppercase flex items-center gap-2">
            <Cpu className="text-red-500" /> Painel de Telemetria RFID
          </h1>
          <p className="text-xs text-gray-400 mt-1">Gerenciamento de antenas Zebra FX7400 / Motorola e potência de RF.</p>
        </div>

        {/* STATUS DE CONEXÃO EM TEMPO REAL */}
        <div className="flex items-center gap-3 bg-[#111] border border-gray-800 px-4 py-2 rounded-xl">
          <div className={`w-3 h-3 rounded-full ${
            statusConexao === 'CONNECTED' ? 'bg-green-500 animate-pulse' : statusConexao === 'CONNECTING' ? 'bg-amber-500 animate-spin' : 'bg-red-500'
          }`} />
          <span className="text-xs font-mono font-bold tracking-wider">
            {statusConexao === 'CONNECTED' ? 'LEITOR CONECTADO' : statusConexao === 'CONNECTING' ? 'BUSCANDO SINAL...' : 'LEITOR OFFLINE'}
          </span>
          {statusConexao === 'DISCONNECTED' ? (
            <button onClick={conectarAoLeitorLocal} className="ml-2 p-1 text-gray-400 hover:text-white transition-colors" title="Conectar ao hardware"><RefreshCw size={14} /></button>
          ) : (
            <button onClick={desconectarLeitor} className="ml-2 text-xs text-red-500 hover:underline">Desconectar</button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* COLUNA 1: FORMULÁRIO DE PARÂMETROS */}
        <div className="bg-[#111] border border-gray-800 rounded-xl p-5 space-y-4 h-fit">
          <h2 className="text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center gap-2">
            <Database size={14} /> Ajustes de RF e Rede
          </h2>
          
          <form onSubmit={salvarConfiguracao} className="space-y-4">
            <div>
              <label className="block text-[11px] uppercase font-bold text-gray-400 mb-1">Vincular à Bateria</label>
              <select
                value={bateriaSelecionada}
                onChange={e => setBateriaSelecionada(e.target.value)}
                className="w-full bg-black border border-gray-800 rounded px-3 py-2 text-xs font-bold outline-none focus:border-red-600 text-white"
              >
                {baterias.map((b: any) => <option key={b._id || b.id} value={b._id || b.id}>{b.nome}</option>)}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] uppercase font-bold text-gray-400 mb-1">IP do Leitor</label>
                <input 
                  type="text" value={ipLeitor} onChange={e => setIpLeitor(e.target.value)}
                  className="w-full bg-black border border-gray-800 rounded px-3 py-2 text-xs font-mono font-bold outline-none focus:border-red-600 text-center text-red-400"
                />
              </div>
              <div>
                <label className="block text-[11px] uppercase font-bold text-gray-400 mb-1">Porta TCP</label>
                <input 
                  type="text" value={portaLeitor} onChange={e => setPortaLeitor(e.target.value)}
                  className="w-full bg-black border border-gray-800 rounded px-3 py-2 text-xs font-mono font-bold outline-none focus:border-red-600 text-center"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] uppercase font-bold text-gray-400 mb-1 flex justify-between">
                <span>Potência de Emissão</span>
                <span className="text-red-500 font-mono font-black">{potenciaDbm} dBm</span>
              </label>
              <input 
                type="range" min="15" max="30" value={potenciaDbm} onChange={e => setPotenciaDbm(e.target.value)}
                className="w-full accent-red-600 bg-black cursor-pointer h-1.5 rounded-lg appearance-none mt-2"
              />
              <span className="text-[9px] text-gray-500 block mt-1">Use ~20-25dBm na cheia para evitar o sinal vazar para o box dos mecânicos.</span>
            </div>

            <button
              type="submit" disabled={salvando}
              className="w-full bg-red-600 hover:bg-red-700 disabled:opacity-30 text-white font-bold py-2.5 rounded text-xs uppercase tracking-wider transition-colors"
            >
              {salvando ? 'Sincronizando...' : 'Salvar Configurações'}
            </button>
          </form>
        </div>

        {/* COLUNA 2: SELETOR VISUAL DE ANTENAS */}
        <div className="bg-[#111] border border-gray-800 rounded-xl p-5 space-y-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center gap-2">
            <Radio size={14} /> Mapeamento do Pórtico / Linha de Chegada
          </h2>

          <div className="grid grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((num) => {
              const key = `ant${num}` as keyof typeof antenas;
              const ativa = antenas[key];
              return (
                <div 
                  key={num}
                  onClick={() => setAntenas(prev => ({ ...prev, [key]: !prev[key] }))}
                  className={`border-2 rounded-xl p-4 flex flex-col items-center justify-center gap-3 cursor-pointer transition-all select-none ${
                    ativa ? 'border-red-600 bg-red-950/10' : 'border-gray-800 bg-black/50 opacity-40 hover:opacity-60'
                  }`}
                >
                  <span className={`text-[10px] px-2 py-0.5 rounded font-bold font-mono ${ativa ? 'bg-red-600 text-white' : 'bg-gray-800 text-gray-400'}`}>
                    ANTENA 0{num}
                  </span>
                  <div className={`p-3 rounded-full ${ativa ? 'bg-red-500/20 text-red-500' : 'bg-gray-900 text-gray-600'}`}>
                    <Radio size={24} className={ativa && statusConexao === 'CONNECTED' ? 'animate-pulse' : ''} />
                  </div>
                  <span className="text-[11px] font-bold uppercase tracking-wide">
                    {ativa ? 'Monitorando Pista' : 'Desativada'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* COLUNA 3: FEED DE PASSAGENS EM TEMPO REAL (LOGS REAIS) */}
        <div className="bg-[#111] border border-gray-800 rounded-xl p-5 space-y-4 flex flex-col h-[400px] lg:h-auto">
          <h2 className="text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center justify-between">
            <span className="flex items-center gap-2"><Activity size={14} /> Console de Captura Real</span>
            <span className="text-[10px] font-mono bg-black px-2 py-0.5 text-green-500 rounded border border-green-950">LIVE</span>
          </h2>

          <div className="bg-black rounded-lg border border-gray-900 p-3 flex-1 overflow-y-auto font-mono text-[11px] space-y-2 text-gray-400 scrollbar-thin">
            {logsLeitura.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center text-gray-600 gap-2">
                <AlertCircle size={20} />
                <span>Aguardando motos passarem pela linha de chegada...</span>
              </div>
            ) : (
              logsLeitura.map((log, i) => (
                <div key={i} className="flex justify-between border-b border-gray-900 pb-1.5 last:border-0 items-center animate-fadeIn">
                  <span className="text-gray-600">[{log.time}]</span>
                  <span className="text-green-400 font-bold tracking-tight">{log.tag}</span>
                  <span className="bg-red-950/40 text-red-400 text-[10px] px-1.5 py-0.5 rounded font-bold border border-red-900/30">ANT 0{log.antena}</span>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

    </div>
  );
}