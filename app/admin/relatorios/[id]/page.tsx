'use client';
import React, { useState, useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { 
  ArrowLeft, Edit2, Printer, Save, Loader2, 
  Flag, Users, FileText, Settings, LogOut, BarChart3, Filter
} from 'lucide-react';

interface PilotoResultado {
  pilotoId: string;
  nome: string;
  numeral: string;
  categoriaNome: string;
  posicao: number;
  voltas: number;
  tempoTotalMs: number;
  melhorVoltaMs: number;
  pontosGanhos: number;
}

interface RelatorioData {
  _id: string;
  eventoId: string;
  bateriaId: string;
  nomeBateria: string;
  tempoTotalProvaMs: number;
  melhorVoltaDaProvaMs: number;
  idPilotoMelhorVolta: string | null;
  gridFinal: PilotoResultado[];
}

export default function PaginaRelatorio() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();

  const tipoRelatorio = searchParams.get('tipo') || 'geral'; // 'geral' ou 'categoria'
  const resultadoId = params.id as string;
  const origem = searchParams.get('origem');

  // Controle de Abas principais do Menu Lateral
    const [activeTab, setActiveTab] = useState<'dashboard' | 'pilotos' | 'relatorios' | 'configuracoes'>('relatorios');

  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [modoEdicao, setModoEdicao] = useState(false);
  
  const [dados, setDados] = useState<RelatorioData | null>(null);
  const [gridEditavel, setGridEditavel] = useState<PilotoResultado[]>([]);
  
  // Estado para controlar qual categoria filtrar na tela/impressão
  const [categoriaSelecionada, setCategoriaSelecionada] = useState<string>('TODAS');

  useEffect(() => {
    if (resultadoId) {
      buscarRelatorio();
    }
  }, [resultadoId]);

  const buscarRelatorio = async () => {
    try {
      setCarregando(true);
      const res = await fetch(`/api/resultados?id=${resultadoId}`);
      if (!res.ok) {
        const resAlternativa = await fetch(`/api/resultados/${resultadoId}`);
        if (!resAlternativa.ok) throw new Error("Não foi possível carregar o relatório.");
        const json = await resAlternativa.json();
        setDados(json);
        setGridEditavel(json.gridFinal || []);
        return;
      }
      const json = await res.json();
      setDados(json);
      setGridEditavel(json.gridFinal || []);
    } catch (err) {
      console.error(err);
      alert("Erro ao buscar dados do relatório no banco de dados.");
    } finally {
      setCarregando(false);
    }
  };

  const lidarMudancaInput = (index: number, campo: keyof PilotoResultado, valor: any) => {
    const novoGrid = [...gridEditavel];
    novoGrid[index] = {
      ...novoGrid[index],
      [campo]: campo === 'posicao' || campo === 'voltas' || campo === 'pontosGanhos' ? Number(valor) : valor
    };
    setGridEditavel(novoGrid);
  };

  const salvarAlteracoes = async () => {
    try {
      setSalvando(true);
      const res = await fetch('/api/resultados', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resultadoId,
          gridFinal: gridEditavel
        })
      });

      if (!res.ok) throw new Error("Erro ao atualizar dados.");
      
      alert("Relatório retificado e salvo com sucesso!");
      setModoEdicao(false);
      buscarRelatorio();
    } catch (err: any) {
      alert(`Falha ao salvar: ${err.message}`);
    } finally {
      setSalvando(false);
    }
  };

  const acionarImpressao = () => {
    window.print();
  };

  const lidarVoltar = () => {
    if (origem) {
      router.push(origem);
    } else {
      router.push('/admin/painel');
    }
  };

  const formatarTempo = (ms: number) => {
    if (!ms || ms === 0) return "00:00.000";
    const minutos = Math.floor(ms / 60000);
    const segundos = Math.floor((ms % 60000) / 1000);
    const milis = ms % 1000;
    return `${minutos.toString().padStart(2, '0')}:${segundos.toString().padStart(2, '0')}.${milis.toString().padStart(3, '0')}`;
  };

  const extrairCategoriasUnicas = () => {
    const categorias = gridEditavel.map(p => p.categoriaNome).filter(Boolean);
    return Array.from(new Set(categorias));
  };

  if (carregando) {
    return (
      <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center font-mono text-xs text-zinc-600 gap-2 animate-pulse">
        <Loader2 className="animate-spin text-red-600" size={24} />
        CONSTRUINDO PLANILHA HISTÓRICA...
      </div>
    );
  }

  const categoriasUnicas = extrairCategoriasUnicas();

  // Filtragem das categorias baseado no select do usuário
  const categoriasParaRenderizar = categoriaSelecionada === 'TODAS' 
    ? categoriasUnicas 
    : categoriasUnicas.filter(c => c === categoriaSelecionada);

    //ir para o painel principal
  const irParaPainelPrincipal = () => {
    router.push('/admin/painel');
  };

  return (
    <div className="min-h-screen w-screen bg-[#050505] text-zinc-100 font-sans antialiased flex p-0 overflow-x-hidden select-none print:bg-white print:text-black">
      
      <style jsx global>{`
        @media print {
          body, html { background-color: #ffffff !important; color: #000000 !important; }
          .no-print { display: none !important; }
          .print-clean-table { width: 100% !important; border-collapse: collapse !important; color: #000000 !important; }
          .print-clean-table th { background-color: #f4f4f5 !important; color: #000000 !important; border: 1px solid #d4d4d8 !important; padding: 6px !important; }
          .print-clean-table td { border: 1px solid #e4e4e7 !important; color: #000000 !important; padding: 6px !important; font-family: monospace !important; }
          
          /* FORÇA CADA CATEGORIA A COMEÇAR EM UMA PÁGINA NOVA E COMPLETA */
          .print-page-break { page-break-before: always !important; break-before: page !important; }
          /* Evita que a primeira categoria pule uma página em branco desnecessária */
          .print-page-break:first-of-type { page-break-before: avoid !important; break-before: avoid !important; }
        }
      `}</style>

      {/* MENU LATERAL */}
                 <aside className="w-64 bg-[#0c0c0e] border-r border-zinc-900 flex flex-col shrink-0 print:hidden">
                   <div className="p-6 border-b border-zinc-900 flex items-center gap-3">
                     <img src="/FPMX-logo.png" alt="Logo Cronoka" className="w-12 h-12 object-contain" />     
                     <div>
                       <h2 className="text-xs font-black tracking-wider uppercase text-white">CRONOKA</h2>
                       <p className="text-[9px] font-mono font-bold text-zinc-500 uppercase tracking-widest">Painel de controle</p>
                     </div>
                   </div>
           
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
      <div className="flex-1 flex p-6 gap-6 overflow-y-auto h-screen print:p-0 print:overflow-visible print:h-auto">
        
        <main className="flex-1 flex flex-col gap-4 print:w-full print:block">
          
          {/* Cabeçalho do Relatório */}
          <div className="text-center py-2 relative border-b border-zinc-900/80 pb-4 print:border-b-2 print:border-black print:mb-6">
            <img src="/FPMX-logo.png" alt="Logo Cronoka" className="w-12 h-12 object-contain mx-auto mb-2" />
            <h1 className="text-3xl font-black tracking-widest text-white uppercase print:text-black print:text-2xl">
              RELATÓRIO OFICIAL DE PROVA
            </h1>
            <p className="text-sm font-mono font-bold tracking-widest text-red-500 mt-1 uppercase print:text-black print:font-sans">
              {dados?.nomeBateria} {tipoRelatorio === 'categoria' && '— POR CATEGORIAS'}
            </p>
            <div className="mt-2 text-[11px] font-mono text-zinc-500 flex justify-center gap-6 print:text-black">
              <span>Duração Prova: <strong className="text-zinc-300 print:text-black">{formatarTempo(dados?.tempoTotalProvaMs || 0)}</strong></span>
              <span>Melhor Volta Geral: <strong className="text-zinc-300 print:text-black">{formatarTempo(dados?.melhorVoltaDaProvaMs || 0)}</strong></span>
            </div>
          </div>

          {/* RENDERIZAÇÃO CONDICIONAL */}
          {tipoRelatorio === 'categoria' ? (
            <div className="space-y-8 print:space-y-0">
              {categoriasParaRenderizar.map((catNome) => {
                const pilotosDaCategoria = gridEditavel
                  .filter(p => p.categoriaNome === catNome)
                  .sort((a, b) => a.posicao - b.posicao);

                return (
                  /* A classe print-page-break força o gerenciador de impressão a criar um novo documento/folha para cada bloco */
                  <div key={catNome} className="bg-[#0b0b0c] border border-zinc-900/60 rounded-xl overflow-hidden flex flex-col print:border-none print:bg-white print:print-page-break print:pb-12">
                    
                    
                    {/* Repetição de mini cabeçalho na impressão para identificar a folha solta */}
                    <div className="hidden print:block text-center pb-4 mb-2 border-b border-zinc-200">
                      <span className="text-[10px] font-mono tracking-widest text-zinc-400 block">SISTEMA CRONOKA — RELATÓRIO INDIVIDUAL DE CLASSE</span>
                      <h2 className="text-lg font-black uppercase">{dados?.nomeBateria}</h2>
                    </div>

                    <div className="bg-zinc-900/40 border-b border-zinc-900 px-4 py-3 print:bg-transparent print:border-b-2 print:border-black print:px-0 print:mb-2">
                      <h3 className="text-sm font-black uppercase text-red-500 font-sans tracking-wide print:text-black print:text-lg">
                        🏁 Categoria: {catNome || 'Sem Categoria'}
                      </h3>
                    </div>

                    <table className="w-full text-left border-collapse print-clean-table">
                      <thead>
                        <tr className="bg-[#080809] border-b border-zinc-900/80 text-[10px] font-mono font-bold text-zinc-500 uppercase tracking-wider text-center print:bg-zinc-100">
                          <th className="py-2.5 px-4 text-left w-14">POS</th>
                          <th className="py-2.5 px-4 text-left">PILOTO</th>
                          <th className="py-2.5 px-4 w-16">NÚM</th>
                          <th className="py-2.5 px-4 w-20">VOLTAS</th>
                          <th className="py-2.5 px-4">TEMPO TOTAL</th>
                          <th className="py-2.5 px-4">MELHOR VOLTA</th>
                          <th className="py-2.5 px-4 text-right pr-6 w-24">PONTOS</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-900/40 text-xs font-mono font-bold text-zinc-300 print:divide-zinc-200 print:text-black">
                        {pilotosDaCategoria.map((p, idx) => (
                          <tr key={idx} className="text-center">
                            <td className="py-2.5 px-4 text-left text-zinc-500 font-sans text-sm print:text-black">{idx + 1}º</td>
                            <td className="py-2.5 px-4 text-left text-white font-sans text-sm uppercase tracking-wide print:text-black">{p.nome}</td>
                            <td className="py-2.5 px-4">
                              <span className="px-2 py-0.5 rounded border border-zinc-800 bg-zinc-900/40 text-zinc-400 print:border-none print:bg-transparent print:text-black">
                                {p.numeral}
                              </span>
                            </td>
                            <td className="py-2.5 px-4 text-white print:text-black">{p.voltas}</td>
                            <td className="py-2.5 px-4 text-zinc-400 print:text-black">{formatarTempo(p.tempoTotalMs)}</td>
                            <td className="py-2.5 px-4 text-zinc-300 font-black print:text-black">{formatarTempo(p.melhorVoltaMs)}</td>
                            <td className="py-2.5 px-4 text-right pr-6 font-black text-emerald-500 print:text-black">{p.pontosGanhos}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>

                    {/* Assinatura individual por folha impressa */}
                    <div className="hidden print:flex justify-between items-center text-[8px] font-mono text-zinc-500 border-t border-zinc-300 pt-4 mt-8 w-full">
                      <span>CATEGORIA: {catNome}</span>
                      <span>ASSINATURA DO JUIZ DE PROVA: _______________________</span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            // MODO GERAL (Sem alterações)
            <div className="flex-1 bg-[#0b0b0c] border border-zinc-900/60 rounded-xl overflow-hidden flex flex-col print:border-none print:bg-white">
              <table className="w-full text-left border-collapse print-clean-table">
                <thead>
                  <tr className="bg-[#080809] border-b border-zinc-900/80 text-[10px] font-mono font-bold text-zinc-500 uppercase tracking-wider text-center print:bg-zinc-100">
                    <th className="py-3 px-4 text-left w-14">POS</th>
                    <th className="py-3 px-4 text-left">PILOTO</th>
                    <th className="py-3 px-4 w-16">NÚM</th>
                    <th className="py-3 px-4 text-left">CATEGORIA</th>
                    <th className="py-3 px-4 w-20">VOLTAS</th>
                    <th className="py-3 px-4">TEMPO TOTAL</th>
                    <th className="py-3 px-4">MELHOR VOLTA</th>
                    <th className="py-3 px-4 text-right pr-6 w-24">PONTOS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-900/40 text-xs font-mono font-bold text-zinc-300 print:divide-zinc-200">
                  {gridEditavel.map((p, index) => (
                    <tr key={index} className="hover:bg-zinc-900/10 transition-colors text-center print:hover:bg-transparent">
                      <td className="py-3 px-4 text-left text-zinc-500 font-sans text-sm">
                        {modoEdicao ? (
                          <input 
                            type="number" 
                            value={p.posicao} 
                            onChange={(e) => lidarMudancaInput(index, 'posicao', e.target.value)}
                            className="w-12 bg-black border border-zinc-800 rounded px-1.5 py-1 text-white text-center font-bold font-mono outline-none focus:border-red-600"
                          />
                        ) : p.posicao}
                      </td>
                      <td className="py-3 px-4 text-left text-white font-sans text-sm tracking-wide uppercase">
                        {modoEdicao ? (
                          <input 
                            type="text" 
                            value={p.nome} 
                            onChange={(e) => lidarMudancaInput(index, 'nome', e.target.value)}
                            className="w-full bg-black border border-zinc-800 rounded px-2 py-1 text-white font-sans outline-none focus:border-red-600 uppercase"
                          />
                        ) : p.nome}
                      </td>
                      <td className="py-3 px-4">
                        {modoEdicao ? (
                          <input 
                            type="text" 
                            value={p.numeral} 
                            onChange={(e) => lidarMudancaInput(index, 'numeral', e.target.value)}
                            className="w-12 bg-black border border-zinc-800 rounded px-1 py-1 text-white text-center font-bold font-mono outline-none focus:border-red-600 uppercase"
                          />
                        ) : (
                          <span className="px-2 py-0.5 rounded border border-zinc-800 bg-zinc-900/40 text-zinc-400 print:border-none print:bg-transparent print:text-black">
                            {p.numeral}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-left text-zinc-400 uppercase font-sans text-[11px]">
                        {modoEdicao ? (
                          <input 
                            type="text" 
                            value={p.categoriaNome} 
                            onChange={(e) => lidarMudancaInput(index, 'categoriaNome', e.target.value)}
                            className="w-full bg-black border border-zinc-800 rounded px-2 py-1 text-white font-sans text-xs outline-none focus:border-red-600 uppercase"
                          />
                        ) : p.categoriaNome}
                      </td>
                      <td className="py-3 px-4 text-white text-sm">
                        {modoEdicao ? (
                          <input 
                            type="number" 
                            value={p.voltas} 
                            onChange={(e) => lidarMudancaInput(index, 'voltas', e.target.value)}
                            className="w-12 bg-black border border-zinc-800 rounded px-1 py-1 text-white text-center font-bold font-mono outline-none focus:border-red-600"
                          />
                        ) : p.voltas}
                      </td>
                      <td className="py-3 px-4 text-zinc-400">{formatarTempo(p.tempoTotalMs)}</td>
                      <td className="py-3 px-4 text-zinc-300 font-black">{formatarTempo(p.melhorVoltaMs)}</td>
                      <td className="py-3 px-4 text-right pr-6 font-black text-sm text-emerald-500 print:text-black">
                        {modoEdicao ? (
                          <input 
                            type="number" 
                            value={p.pontosGanhos} 
                            onChange={(e) => lidarMudancaInput(index, 'pontosGanhos', e.target.value)}
                            className="w-16 bg-black border border-zinc-800 rounded px-1.5 py-1 text-emerald-400 text-right font-bold font-mono outline-none focus:border-red-600"
                          />
                        ) : p.pontosGanhos}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          
          {/* Rodapé geral oculto no modo categoria para não encavalar */}
          {tipoRelatorio === 'geral' && (
            <div className="hidden print:flex justify-between items-center text-[9px] font-mono text-zinc-400 border-t border-zinc-300 pt-4 mt-8 w-full">
              <span>DIRETORIA DE PROVA / COMISSÁRIOS FPM</span>
              <span>SISTEMA CRONOKA DE CRONOMETRAGEM IMPRESSO EM 2026</span>
              <span>ASSINATURA CRONOMETRISTA: _______________________</span>
            </div>
          )}

        </main>

        {/* LATERAL DE CONTROLES E OPERAÇÕES */}
        <aside className="w-[280px] bg-[#0b0b0c] border border-zinc-900/80 rounded-xl p-4 flex flex-col gap-2.5 shrink-0 h-fit no-print">
          
          <button 
            onClick={lidarVoltar}
            className="w-full bg-[#161619] hover:bg-zinc-800 text-zinc-300 hover:text-white font-sans font-bold text-xs py-3 px-4 rounded-xl border border-zinc-800/80 transition-all flex items-center justify-center gap-2 uppercase tracking-wide"
          >
            <ArrowLeft size={15} className="text-zinc-400" /> Voltar ao Painel
          </button>

          <div className="h-[1px] bg-zinc-900/60 my-1"></div>

          {/* FILTRO DE SELEÇÃO DE CATEGORIAS (Só aparece se o parâmetro for tipo=categoria) */}
          {tipoRelatorio === 'categoria' && (
            <div className="bg-[#121214] border border-zinc-800/60 rounded-xl p-3 space-y-2">
              <label className="text-[10px] font-mono uppercase font-bold text-zinc-400 flex items-center gap-1.5">
                <Filter size={12} className="text-red-500" /> Filtrar para Impressão:
              </label>
              <select 
                value={categoriaSelecionada} 
                onChange={(e) => setCategoriaSelecionada(e.target.value)}
                className="w-full bg-black border border-zinc-800 rounded-lg p-2 text-xs font-sans font-bold text-white outline-none focus:border-red-600 cursor-pointer uppercase"
              >
                <option value="TODAS">📄 Todas (Separar p/ Página)</option>
                {categoriasUnicas.map(cat => (
                  <option key={cat} value={cat}>🎯 Apenas {cat}</option>
                ))}
              </select>
            </div>
          )}

          {tipoRelatorio === 'geral' && (
            <>
              {modoEdicao ? (
                <button 
                  onClick={salvarAlteracoes}
                  disabled={salvando}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-sans font-black text-sm py-4 px-4 rounded-xl transition-all flex items-center justify-center gap-2 uppercase tracking-wider disabled:opacity-50"
                >
                  {salvando ? (
                    <><Loader2 size={15} className="animate-spin" /> Salvando...</>
                  ) : (
                    <><Save size={15} /> Salvar Retificação</>
                  )}
                </button>
              ) : (
                <button 
                  onClick={() => setModoEdicao(true)}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-sans font-black text-sm py-4 px-4 rounded-xl transition-all flex items-center justify-center gap-2 uppercase tracking-wider"
                >
                  <Edit2 size={15} /> Editar Relatório
                </button>
              )}

              {modoEdicao && (
                <button 
                  onClick={() => { setModoEdicao(false); buscarRelatorio(); }}
                  className="w-full bg-zinc-900 hover:bg-zinc-800 text-zinc-400 font-sans font-bold text-xs py-2.5 px-4 rounded-xl border border-zinc-800 transition-all text-center uppercase tracking-wide"
                >
                  Cancelar Edição
                </button>
              )}
            </>
          )}

          <button 
            onClick={acionarImpressao}
            disabled={modoEdicao}
            className="w-full bg-zinc-100 hover:bg-zinc-200 text-black font-sans font-black text-sm py-4 px-4 rounded-xl transition-all flex items-center justify-center gap-2 uppercase tracking-wider"
          >
            <Printer size={15} /> {categoriaSelecionada === 'TODAS' ? 'Imprimir Todas' : 'Imprimir Selecionada'}
          </button>

          <div className="bg-[#121214] border border-zinc-900 rounded-xl p-3 text-[11px] font-mono text-zinc-500 space-y-1.5">
            <span className="font-bold text-zinc-400 uppercase tracking-wide block mb-1">💡 Dica de Impressão:</span>
            <p>Ao selecionar <strong className="text-zinc-300">"Todas"</strong>, o navegador organizará as quebras de páginas automaticamente, gerando um arquivo PDF limpo com uma classe por folha.</p>
          </div>

        </aside>
      </div>
    </div>
  );
}