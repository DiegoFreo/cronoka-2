'use client';
import React, { useState, useEffect } from 'react';
import { voltas, Piloto, PilotoDB } from '@/app/types/types-corrida';

// Tipagem simples para o Piloto
interface Pilot {
  id: string;
  posicao: number;
  nome: string;
  numero_piloto: string;
  gap: string;
  ultimaVolta: string;
  melhorVolta: string;
  tempoTotal: string;
}

const RaceOverlay = () => {
  const [pilots, setPilots] = useState<Pilot[]>([]);
  
  // Estados de configuração (podem vir da URL)
  const [config, setConfig] = useState({
    limit: 10,
    showGap: true,
    themeColor: '#eab308', // Amarelo padrão
  });

  useEffect(() => {
    // Aqui você conectaria seu WebSocket para receber dados do RFID/Node.js
    // Ex: socket.on('updateRank', (data) => setPilots(data));
    
    // Captura parâmetros da URL para o OBS
    const params = new URLSearchParams(window.location.search);
    setConfig({
      limit: parseInt(params.get('limit') || '10'),
      showGap: params.get('mode') !== 'lap',
      themeColor: params.get('color') || '#eab308',
    });
  }, []);

  return (
    <div className="h-screen w-screen bg-transparent p-10 font-sans overflow-hidden">
      {/* Cabeçalho da Corrida */}
      <div className="w-80 bg-black/90 text-white p-2 border-b-2 border-yellow-500 italic font-black uppercase tracking-tighter">
        <span className="text-yellow-500">Volta</span> {pilots[0]?.posicao || 0} - {pilots[0]?.nome || 'Aguardando...'}
      </div>

      {/* Lista de Ranking */}
      <div className="flex flex-col gap-1 w-80">
        {pilots.slice(0, config.limit).map((pilot) => (
          <div key={pilot.id} className="flex h-10 animate-fade-in-left">
            
            {/* Posição */}
            <div 
              className="w-12 flex items-center justify-center font-bold italic text-black"
              style={{ backgroundColor: pilot.posicao === 1 ? config.themeColor : '#fff' }}
            >
              P{pilot.posicao}
            </div>

            {/* Nome e Info */}
            <div className="flex-1 flex items-center bg-black/80 text-white px-3 justify-between border-r border-white/10">
              <div className="flex gap-2 items-baseline">
                <span className="text-[10px] text-gray-400 font-mono">#{pilot.numero_piloto}</span>
                <span className="font-bold uppercase italic tracking-tight text-sm">
                  {pilot.nome.substring(0, 12)}
                </span>
              </div>

              {/* Dado Configurável (Gap ou Última Volta) */}
              <div className={`text-[11px] font-mono ${pilot.melhorVolta ? 'text-purple-400' : 'text-gray-300'}`}>
                {config.showGap ? `+${pilot.tempoTotal}` : pilot.ultimaVolta}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default RaceOverlay;