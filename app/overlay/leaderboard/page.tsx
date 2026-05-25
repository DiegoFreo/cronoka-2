const DriverRow = ({ position, name, number, telemetry, config }: any) => {
  return (
    <div className="flex items-center bg-black/80 text-white mb-1 h-10 w-64 border-l-4 border-yellow-500">
      {/* Posição */}
      <div className="w-10 bg-yellow-500 text-black font-bold flex justify-center italic">
        {position}
      </div>
      
      {/* Número e Nome */}
      <div className="flex-grow px-2 flex justify-between items-center">
        <span className="text-xs font-light opacity-70">#{number}</span>
        <span className="font-bold uppercase tracking-tighter">{name}</span>
      </div>

      {/* Info Configurável (Gap, Interval, Last Lap) */}
      <div className="w-20 bg-gray-800 text-[10px] flex justify-center items-center h-full font-mono">
        {config.showGap ? telemetry.gap : telemetry.lastLap}
      </div>
    </div>
  );
};
export default function LeaderboardPage() {
  // Dados de exemplo para os competidores
  const drivers = [
    { position: 1, name: "João Silva", number: 23, telemetry: { gap: "+1.2s", lastLap: "1:45.678" }, config: { showGap: true } },
    { position: 2, name: "Maria Oliveira", number: 45, telemetry: { gap: "+3.4s", lastLap: "1:46.123" }, config: { showGap: true } },
    { position: 3, name: "Carlos Pereira", number: 12, telemetry: { gap: "+5.6s", lastLap: "1:47.890" }, config: { showGap: true } },
    // ... mais competidores
  ];
}
