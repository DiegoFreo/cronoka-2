'use client';
import React, { useState, useEffect } from 'react';
import { FileText, Printer, Calendar, Trophy, Medal, Layers } from 'lucide-react';

interface BateriaOption {
  _id: string;
  nome: string;
}

interface LinhaRelatorio {
  id: string;
  posicao: number;
  numero: string;
  nome: string;
  categoria: string;
  totalVoltas: number;
  tempoTotalMs: number;
  melhorVoltaMs: number;
  voltas: number[];
}

export default function RelatoriosPage() {
  const [baterias, setBaterias] = useState<BateriaOption[]>([]);
  const [bateriaSelecionada, setBateriaSelecionada] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [resultadoGrid, setResultadoGrid] = useState<LinhaRelatorio[]>([]);

  // 1. CARREGA AS BATERIAS AO ABRIR A TELA
  useEffect(() => {
    async function obterBaterias() {
      try {
        const res = await fetch('/api/bateria');
        const dados = await res.json();
        if (res.ok && Array.isArray(dados)) {
          setBaterias(dados);
          if (dados.length > 0) setBateriaSelecionada(dados[0]._id);
        }
      } catch (err) {
        console.error("Erro ao buscar baterias:", err);
      }
    }
    obterBaterias();
  }, []);

  // 2. BUSCA OS DADOS DA NOVA API DE RELATÓRIOS
  useEffect(() => {
    if (!bateriaSelecionada) return;

    async function gerarRelatorio() {
      setLoading(true);
      try {
        const res = await fetch(`/api/relatorios/${bateriaSelecionada}`);
        
        if (!res.ok) {
          throw new Error(`Erro na rota de relatórios: Status ${res.status}`);
        }

        const dadosPilotos = await res.json();

        if (Array.isArray(dadosPilotos)) {
          const gridProcessado: LinhaRelatorio[] = dadosPilotos.map((p: any) => {
            const listaVoltas: number[] = p.voltas || []; 
            const totalVoltas = listaVoltas.length;
            const tempoTotal = listaVoltas.reduce((acc, t) => acc + t, 0);
            const melhorVolta = totalVoltas > 0 ? Math.min(...listaVoltas) : 0;

            return {
              id: p._id,
              posicao: 0,
              numero: p.numero,
              nome: p.nome,
              categoria: p.categoriaNome || "Geral",
              totalVoltas: totalVoltas,
              tempoTotalMs: tempoTotal,
              melhorVoltaMs: melhorVolta,
              voltas: listaVoltas
            };
          });

          // REGRA DE CLASSFICACAO DO MOTOCROSS
          gridProcessado.sort((a, b) => {
            if (b.totalVoltas !== a.totalVoltas) {
              return b.totalVoltas - a.totalVoltas; // Mais voltas primeiro
            }
            return a.tempoTotalMs - b.tempoTotalMs; // Menor tempo em caso de empate
          });

          const gridClassificado = gridProcessado.map((item, index) => ({
            ...item,
            posicao: index + 1
          }));

          setResultadoGrid(gridClassificado);
        } else {
          setResultadoGrid([]);
        }
      } catch (err) {
        console.error("Erro ao processar relatório:", err);
        setResultadoGrid([]);
      } finally {
        setLoading(false);
      }
    }

    gerarRelatorio();
  }, [bateriaSelecionada]);

  const formatarTempo = (ms: number) => {
    if (ms === 0) return '--:--.---';
    const minutos = Math.floor(ms / 60000);
    const segundos = Math.floor((ms % 60000) / 1000);
    const milis = Math.floor(ms % 1000);
    return `${minutos.toString().padStart(2, '0')}:${segundos.toString().padStart(2, '0')}.${milis.toString().padStart(3, '0')}`;
  };

  return (
    <div className="space-y-6 font-sans bg-[#070707] min-h-screen text-white p-4 sm:p-6 print:bg-white print:text-black print:p-0 print:min-h-screen">
      
      {/* SELETOR DE RELATÓRIO - SOME NA IMPRESSÃO USANDO TAILWIND NATIVO (print:hidden) */}
      <div className="bg-[#111] border border-gray-800 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 print:hidden">
        <div className="flex items-center gap-3">
          <Layers className="text-red-500 shrink-0" size={22} />
          <div className="flex flex-col">
            <span className="text-xs uppercase font-bold text-gray-400">Emissão de Resultados</span>
            <span className="text-[11px] text-gray-500">Escolha a bateria para fechar a sumária dos tempos de volta</span>
          </div>
        </div>

        <div className="flex gap-3 w-full sm:w-auto">
          <select
            value={bateriaSelecionada}
            onChange={(e) => setBateriaSelecionada(e.target.value)}
            className="bg-black border border-gray-800 hover:border-gray-700 rounded px-3 py-2 text-sm text-white font-semibold outline-none focus:border-red-600 cursor-pointer transition-colors w-full sm:w-64"
          >
            <option value="" disabled>-- Selecione a Bateria --</option>
            {baterias.map((bat) => (
              <option key={bat._id} value={bat._id} className="bg-[#111]">{bat.nome}</option>
            ))}
          </select>

          <button
            onClick={() => window.print()}
            disabled={resultadoGrid.length === 0}
            className="flex items-center gap-2 bg-red-600 hover:bg-red-700 disabled:opacity-20 text-white px-4 py-2 rounded text-xs font-bold uppercase tracking-wider transition-colors shrink-0"
          >
            <Printer size={15} /> Imprimir
          </button>
        </div>
      </div>

      {/* DOCUMENTO DO RELATÓRIO - SE ADAPTA PERFEITAMENTE PARA PRETO E BRANCO NO PAPEL */}
      <div className="bg-[#111] border border-gray-800 rounded-xl p-6 shadow-2xl print:border-0 print:bg-white print:shadow-none print:p-0 print:text-black">
        
        {/* Cabeçalho do Relatório */}
        <div className="border-b-2 border-red-600 print:border-black pb-4 flex justify-between items-center">
          <div>
            <h1 className="text-xl font-black tracking-tight text-white print:text-black uppercase">Relatório Oficial de Cronometragem</h1>
            <p className="text-xs text-gray-400 print:text-gray-700 mt-1 flex items-center gap-2">
              <Calendar size={13} /> {new Date().toLocaleDateString('pt-BR')} 
              <span>|</span> 
              <FileText size={13} /> Sistema de Telemetria RFID Zebra/Motorola
            </p>
          </div>
          <div className="text-right">
            <span className="text-xs font-bold bg-red-950/50 border border-red-900/50 text-red-400 px-3 py-1 rounded print:border-black print:bg-gray-100 print:text-black font-mono">
              CLASSIFICAÇÃO FINAL
            </span>
          </div>
        </div>

        {/* Tabela de Resultados */}
        {loading ? (
          <div className="py-12 text-center text-sm text-gray-500 print:text-black">Calculando grid de posições oficiais...</div>
        ) : resultadoGrid.length === 0 ? (
          <div className="py-12 text-center text-sm text-gray-500 print:text-black">Nenhum dado registrado para esta bateria até o momento.</div>
        ) : (
          <div className="mt-6 overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs font-mono">
              <thead>
                <tr className="border-b border-gray-800 bg-[#161616] text-gray-400 font-bold uppercase tracking-wider print:bg-gray-100 print:text-black print:border-b-2 print:border-black">
                  <th className="py-3 px-4 text-center w-14">Pos</th>
                  <th className="py-3 px-4 text-center w-16">Moto</th>
                  <th className="py-3 px-4 font-sans text-sm">Piloto / Categoria</th>
                  <th className="py-3 px-4 text-center w-28">Voltas Concluídas</th>
                  <th className="py-3 px-4 text-center w-36">Tempo Total Acumulado</th>
                  <th className="py-3 px-4 text-center w-36 text-green-400 print:text-black">Melhor Volta Individual</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800 text-gray-300 print:divide-gray-300 print:text-black">
                {resultadoGrid.map((linha) => (
                  <tr key={linha.id} className="hover:bg-white/[0.01] print:border-b print:border-gray-200">
                    <td className="py-3 px-4 text-center font-bold text-sm">
                      {linha.posicao === 1 ? (
                        <span className="text-amber-500 print:text-black flex items-center justify-center gap-1 font-black"><Trophy size={14} /> 1º</span>
                      ) : linha.posicao === 2 ? (
                        <span className="text-gray-400 print:text-black flex items-center justify-center gap-1 font-black"><Medal size={14} /> 2º</span>
                      ) : (
                        `${linha.posicao}º`
                      )}
                    </td>
                    <td className="py-3 px-4 text-center font-black text-red-500 print:text-black text-sm bg-black/10 print:bg-transparent">
                      {linha.numero}
                    </td>
                    <td className="py-3 px-4 font-sans">
                      <div className="flex flex-col">
                        <span className="font-bold text-white print:text-black uppercase">{linha.nome}</span>
                        <span className="text-[10px] text-gray-500 print:text-gray-600 font-semibold uppercase tracking-wider mt-0.5">{linha.categoria}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center text-sm font-bold text-white print:text-black">
                      {linha.totalVoltas} vts
                    </td>
                    <td className="py-3 px-4 text-center font-bold text-gray-400 print:text-black">
                      {formatarTempo(linha.tempoTotalMs)}
                    </td>
                    <td className="py-3 px-4 text-center font-black text-green-400 print:text-black bg-green-950/5 print:bg-transparent">
                      {formatarTempo(linha.melhorVoltaMs)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Assinaturas no Rodapé */}
        <div className="mt-20 pt-8 border-t border-gray-800 print:border-black grid grid-cols-2 text-center text-[10px] text-gray-500 print:text-black">
          <div className="flex flex-col items-center justify-end">
            <div className="w-48 border-b border-gray-700 print:border-black mb-1"></div>
            <span className="font-sans">Diretor de Prova / Comissário FPMX</span>
          </div>
          <div className="flex flex-col items-center justify-end">
            <div className="w-48 border-b border-gray-700 print:border-black mb-1"></div>
            <span className="font-sans">Cronometrista Oficial (Assinatura)</span>
          </div>
        </div>

      </div>
    </div>
  );
}