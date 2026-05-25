'use client';
import React, {useState, useEffect} from "react";
import { Edit, Trash2, Flag, Clock, CheckCircle2, Play } from "lucide-react"
import { Bateria } from "@/app/types/types-corrida";
import { ModalCadastroBateria } from "./ModalCadastroBateria";

export default function Baterias() {
    const [baterias, setBaterias] = useState<Bateria[]>([]);
    const [loading, setLoading] = useState(true);
    const [modalAberto, setModalAberto] = useState(false);
    const [bateriaSelecionada, setBateriaSelecionada] = useState<any | undefined>(undefined);

    useEffect(()=>{
        carregarBaterias();
    },[]);

   // 1. CARREGAR BATERIAS DO BANCO
  async function carregarBaterias() {
    try {
      setLoading(true);
      const res = await fetch('/api/bateria');
      if (!res.ok) throw new Error();
      const dados = await res.json();
      setBaterias(dados);
    } catch (err) {
      alert("Erro ao carregar a lista de baterias.");
    } finally {
      setLoading(false);
    }
  }
  // 2. EXCLUIR BATERIA
  async function handleExcluirBateria(id: string, nome: string) {
    if (!confirm(`Deseja realmente excluir a bateria "${nome}"?`)) return;

    try {
      const res = await fetch(`/api/bateria?id=${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      alert("Bateria excluída com sucesso!");
      carregarBaterias();
    } catch (err) {
      alert("Erro ao excluir bateria.");
    }
  }

  // 3. AUXILIAR PARA FORMATAR HORA (HH:MM:SS)
  function formatarHora(dataIso: string | null) {
    if (!dataIso) return '--:--';
    return new Date(dataIso).toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  }

  useEffect(() => {
    carregarBaterias();
  }, []);

    return (
                <div className="border border-gray-800 rounded bg-gray-950 p-4" >    
                    <div className="flex items-center justify-between mb-4">
                        <h1 className="text-2xl font-bold">Baterias</h1>
                        <button onClick={() => {
                                setBateriaSelecionada(undefined); // Garante que o modal venha limpo para inclusão
                                setModalAberto(true);
                            }}
                            className="flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white font-medium px-4 py-2.5 rounded-lg transition-all shadow-lg shadow-red-900/20 text-sm"
                        >
                            Adicionar Bateria
                        </button>
                    </div>            
                    {/* Conteúdo Principal / Tabela */}
      {loading ? (
        <div className="text-center py-12 text-gray-500 text-sm">Carregando baterias...</div>
      ) : baterias.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-gray-800 rounded-xl bg-[#111]/30">
          <Flag size={40} className="text-gray-700 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">Nenhuma bateria cadastrada para este evento.</p>
        </div>
      ) : (
        <div className="overflow-x-auto bg-[#111] border border-gray-800 rounded-xl shadow-xl">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-800 bg-[#161616] text-xs font-semibold text-gray-400 uppercase tracking-wider">
                <th className="py-4 px-6">Bateria / Corrida</th>
                <th className="py-4 px-6">Categorias Integradas</th>
                <th className="py-4 px-6 text-center">Status</th>
                <th className="py-4 px-6"><Clock size={14} className="inline mr-1" /> Largada</th>
                <th className="py-4 px-6"><Clock size={14} className="inline mr-1" /> Chegada</th>
                <th className="py-4 px-6 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800 text-sm">
              {baterias.map((bateria) => (
                <tr key={bateria._id} className="hover:bg-white/[0.02] transition-colors">
                  {/* Nome */}
                  <td className="py-4 px-6 font-medium text-white">{bateria.nome}</td>
                  
                  {/* Categorias Vinculadas */}
                  <td className="py-4 px-6">
                    <div className="flex flex-wrap gap-1.5">
                      {bateria.categorias?.map((cat: any) => (
                        <span 
                          key={cat._id} 
                          className="bg-gray-900 border border-gray-800 text-gray-300 px-2 py-0.5 rounded text-xs"
                        >
                          {cat.nome}
                        </span>
                      ))}
                    </div>
                  </td>

                  {/* Status com Badge de Cor */}
                  <td className="py-4 px-6 text-center">
                    <span className={`
                      inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium
                      ${bateria.status === 'EM_ANDAMENTO' && 'bg-amber-500/10 border border-amber-500/30 text-amber-500'}
                      ${bateria.status === 'FINALIZADA' && 'bg-green-500/10 border border-green-500/30 text-green-400'}
                      ${bateria.status === 'AGUARDANDO' && 'bg-gray-800 border border-gray-700 text-gray-400'}
                    `}>
                      {bateria.status === 'EM_ANDAMENTO' && <Play size={10} className="fill-amber-500" />}
                      {bateria.status === 'FINALIZADA' && <CheckCircle2 size={10} />}
                      {bateria.status}
                    </span>
                  </td>

                  {/* Hora Início */}
                  <td className="py-4 px-6 font-mono text-gray-400 text-xs">{formatarHora(bateria.horaInicio)}</td>

                  {/* Hora Fim */}
                  <td className="py-4 px-6 font-mono text-gray-400 text-xs">{formatarHora(bateria.horaFim)}</td>

                  {/* Ações (Editar / Excluir) */}
                  <td className="py-4 px-6 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => {
                          setBateriaSelecionada(bateria); // Passa os dados da bateria para o modal saber que é EDIÇÃO
                          setModalAberto(true);
                        }}
                        className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-800 rounded transition-colors"
                        title="Editar Bateria"
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        onClick={() => handleExcluirBateria(bateria._id, bateria.nome)}
                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-950/20 rounded transition-colors"
                        title="Excluir"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* RENDERIZAÇÃO DO MODAL DE BATERIAS */}
      <ModalCadastroBateria
        isOpen={modalAberto}
        onClose={() => setModalAberto(false)}
        onSuccess={carregarBaterias} // Recarrega a tabela automaticamente após salvar
        bateriaParaEditar={bateriaSelecionada}
      />
                </div>
    );
}