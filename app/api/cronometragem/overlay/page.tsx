'use client';
import React, { useState, useEffect } from 'react';

interface PilotoOverlay {
  id: string;
  posicao: number;
  numero: string;
  nome: string;
  categoria: string;
  tempoProva: string;
  melhorVolta: string;
  visivel: boolean; // Controla se o piloto foi selecionado no painel
}

export default function OverlayOBSPage() {
  const [pilotos, setPilotos] = useState<PilotoOverlay[]>([]);
  const [tempoTotal, setTempoTotal] = useState('00:00.000');

  // Conectar com os dados em tempo real (Pode ser via Polling HTTP ou seu WebSocket do Bridge)
  useEffect(() => {
    const intertval = setInterval(async () => {
      try {
        // Rota fictícia que expõe o estado atual da corrida guardado no servidor
        const res = await fetch('/api/corrida/estado-atual');
        const dados = await res.json();
        if (res.ok) {
          setPilotos(dados.pilotos || []);
          setTempoTotal(dados.tempoTotal || '00:00.000');
        }
      } catch (err) {
        console.error("Erro ao sincronizar overlay:", err);
      }
    }, 1000); // Atualiza a cada 1 segundo no OBS

    return () => clearInterval(intertval);
  }, []);

  // Filtra apenas os pilotos que você marcou como "visíveis" no painel de controle
  const pilotosExibidos = pilotos.filter(p => p.visivel);

  return (
    // Fundo totalmente transparente para o OBS
    <div className="bg-transparent w-full h-screen p-6 font-sans text-white select-none overflow-hidden flex flex-col justify-between">
      
      {/* TOPO: Cronômetro Geral da Prova fixado no canto superior direito */}
      <div className="flex justify-end">
        <div className="bg-black/90 border-l-4 border-red-600 px-6 py-2 rounded-r shadow-2xl flex items-center gap-3 backdrop-blur-md">
          <span className="text-xs font-bold tracking-widest text-gray-400 uppercase">TEMPO DE PROVA</span>
          <span className="text-3xl font-black font-mono text-red-500 tracking-tight">{tempoTotal}</span>
        </div>
      </div>

      {/* RODAPÉ/LATERAL: Tabela de Classificação Estilo Transmissão de TV */}
      <div className="w-full max-w-2xl bg-black/85 border border-gray-900 rounded-lg shadow-2xl backdrop-blur-md overflow-hidden animate-fade-in">
        
        {/* Cabeçalho do Leaderboard */}
        <div className="bg-red-600 px-4 py-1.5 flex justify-between items-center text-[11px] font-black tracking-widest uppercase">
          <span>CLASSIFICAÇÃO EM TEMPO REAL</span>
          <span className="text-black/70">FIGUEIRA CRONOMETRAGEM</span>
        </div>

        {/* Linhas dos Pilotos Selecionados */}
        <div className="divide-y divide-gray-900/50">
          {pilotosExibidos.length === 0 ? (
            <div className="p-3 text-center text-xs text-gray-500 italic">
              Nenhum piloto selecionado para exibição...
            </div>
          ) : (
            pilotosExibidos.map((piloto) => (
              <div key={piloto.id} className="flex items-center h-10 px-3 bg-gradient-to-r from-black/40 to-transparent hover:bg-white/[0.02] transition-colors">
                
                {/* Posição */}
                <div className="w-10 font-black font-mono text-yellow-400 text-sm">
                  {piloto.posicao}º
                </div>

                {/* Número da Moto */}
                <div className="w-12 text-center font-black font-mono text-red-500 text-sm bg-black/40 rounded py-0.5 px-1 border border-gray-800">
                  {piloto.numero}
                </div>

                {/* Nome do Piloto */}
                <div className="flex-1 pl-4 font-bold uppercase tracking-wide truncate text-sm">
                  {piloto.nome}
                  <span className="text-[9px] text-gray-500 font-medium block -mt-0.5">{piloto.categoria}</span>
                </div>

                {/* Dados de Tempo (Tempo total e Melhor Volta) */}
                <div className="flex items-center gap-6 font-mono text-xs pr-2">
                  <div className="flex flex-col items-end">
                    <span className="text-[9px] text-gray-500 font-sans font-bold">ÚLTIMA</span>
                    <span className="text-gray-300">{piloto.tempoProva}</span>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-[9px] text-green-500 font-sans font-bold">MELHOR</span>
                    <span className="text-green-400 font-bold">{piloto.melhorVolta}</span>
                  </div>
                </div>

              </div>
            ))
          )}
        </div>
      </div>

    </div>
  );
}