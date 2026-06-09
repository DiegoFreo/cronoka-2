import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface RegistroVolta {
  posicao: number;
  piloto: string;
  numeral: string;
  categoria: string;
  voltas: number;
  tempoTotal: string;
  melhorVolta: string;
  ultimaVolta: string;
  diferenca: string;
  pontos: number;
}

interface CorridaState {
  isOnline: boolean;
  tempoProva: number; // em milissegundos
  corridaAtiva: boolean;
  gridCorrida: RegistroVolta[];
  melhorVoltaGeral: string;
  pilotoMelhorVoltaGeral: string;
  
  setOnlineStatus: (status: boolean) => void;
  iniciarCorrida: () => void;
  pararCorrida: () => void;
  resetarCorrida: () => void;
  incrementarTempo: (ms: number) => void;
  registrarVoltaPiloto: (numeralMoto: string) => void;
}

export const useCorridaStore = create<CorridaState>()(
  persist(
    (set, get) => ({
      isOnline: true,
      tempoProva: 0,
      corridaAtiva: false,
      gridCorrida: [],
      melhorVoltaGeral: "00:00.000",
      pilotoMelhorVoltaGeral: "---",

      setOnlineStatus: (status) => set({ isOnline: status }),

      iniciarCorrida: () => set({ corridaAtiva: true }),
      
      pararCorrida: () => set({ corridaAtiva: false }),

      resetarCorrida: () => set({ 
        tempoProva: 0, 
        corridaAtiva: false, 
        gridCorrida: get().gridCorrida.map(p => ({ ...p, voltas: 0, tempoTotal: "00:00.000", melhorVolta: "00:00.000", ultimaVolta: "00:00.000" })),
        melhorVoltaGeral: "00:00.000",
        pilotoMelhorVoltaGeral: "---"
      }),

      incrementarTempo: (ms) => set((state) => ({ tempoProva: state.tempoProva + ms })),

      registrarVoltaPiloto: (numeralMoto) => {
        const { gridCorrida, tempoProva } = get();
        // Lógica de cálculo de voltas baseada no carimbo de tempo (tempoProva)
        const novoGrid = gridCorrida.map((p) => {
          if (p.numeral === numeralMoto) {
            const novasVoltas = p.voltas + 1;
            // Cálculo simulado de tempo para exibição visual imediata
            return { ...p, voltas: novasVoltas, tempoTotal: new Date(tempoProva).toISOString().substr(11, 8) };
          }
          return p;
        });

        // Ordena o grid baseado no maior número de voltas completadas
        novoGrid.sort((a, b) => b.voltas - a.voltas);
        
        // Reatribui as posições na tabela de classificação
        const gridOrdenado = novoGrid.map((item, idx) => ({ ...item, posicao: idx + 1 }));

        set({ gridCorrida: gridOrdenado });
      }
    }),
    {
      name: 'sc-cronometragem-local',
      storage: createJSONStorage(() => localStorage), // Persistência automática no navegador contra quedas de energia
    }
  )
);