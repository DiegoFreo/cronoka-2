'use client';
import React, { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Edit2, Trash2, Plus, Layers, ArrowLeft } from "lucide-react";
import { ModalCadastroCategoria } from "@/app/components/ModalCadastroCategoria";
export const dynamic = 'force-dynamic';

// 🌟 Tipagem inline para eliminar dependências de pastas de tipos deletadas
interface Categoria {
  _id: string;
  nome: string;
  eventoId: string;
}

export default function Categorias() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Captura o ID do evento vindo da URL (?evento=ID_DO_EVENTO)
  const eventoId = searchParams.get('evento');

  const [categoria, setCategoria] = useState<Categoria[]>([]);
  const [modalAberto, setModalAberto] = useState(false);
  const [categoriaSelecionada, setCategoriaSelecionada] = useState<Categoria | undefined>(undefined);

  // Retorna para o painel principal do administrador
  const rotaVoltar = '/admin/painel';

  useEffect(() => {
    fetchCategoria();
  }, [eventoId]);

  const fetchCategoria = async () => {
    try {
      const url = eventoId ? `/api/categoria?evento=${eventoId}` : "/api/categoria";
      const response = await fetch(url);
      const data = await response.json();
      setCategoria(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Erro ao buscar categorias:", err);
    }
  };

  const handleExcluirCategoria = async (id: string, nome: string) => {
    if (!confirm(`Deseja mesmo remover a categoria ${nome}?`)) return;
    
    try {
      const res = await fetch(`/api/categoria?id=${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error("Erro ao excluir");
      
      fetchCategoria();
    } catch (err) {
      alert("Erro ao excluir categoria.");
    }
  };
   
  return (
    <div className="min-h-screen bg-black text-white p-4 font-sans select-none">
        
      {/* BOTÃO DE VOLTAR NO PADRÃO INDUSTRIAL */}
      <div className="flex items-center justify-between pb-3">
        <button 
          onClick={() => router.push(rotaVoltar)}
          className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-zinc-500 hover:text-white transition-colors group bg-transparent border-none outline-none cursor-pointer"
        >
          <ArrowLeft size={14} className="text-red-600 group-hover:-translate-x-0.5 transition-transform" />
          Voltar ao Painel Geral
        </button>
      </div>

      {/* CARD PRINCIPAL */}
      <div className="bg-[#050505] border border-zinc-900 rounded-xl overflow-hidden shadow-2xl">
  
        {/* Topo / Header do Bloco */}
        <div className="flex items-center justify-between p-5 border-b border-zinc-900 bg-[#080808]">
          <div>
            <h2 className="text-sm font-black uppercase tracking-wider text-white flex items-center gap-2">
              <Layers className="text-red-600" size={18} /> Categorias Cadastradas
            </h2>
            <p className="text-[10px] font-mono font-bold text-zinc-500 uppercase tracking-widest mt-0.5">
              Gerencie as classes e divisões de pista dos competidores.
            </p>
          </div>
          
          <button 
            onClick={() => { setCategoriaSelecionada(undefined); setModalAberto(true); }}
            className="flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white font-black uppercase tracking-wider text-xs px-4 py-2.5 rounded transition-all shadow-lg shadow-red-950/20"
          >
            <Plus size={14} /> Adicionar Categoria
          </button>
        </div>          

        {/* Tabela de Classes */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse font-mono text-xs">
            <thead>
              <tr className="border-b border-zinc-900 bg-[#0c0c0c] text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                <th className="py-3 px-6">Nome da Categoria / Divisão</th>
                <th className="py-3 px-6 text-right">Ações Operacionais</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-900">
              {categoria.length === 0 ? (
                <tr>
                  <td colSpan={2} className="text-center py-8 text-zinc-600 italic text-[11px]">
                    Nenhuma categoria cadastrada para este contexto de evento...
                  </td>
                </tr>
              ) : (
                categoria.map((cat) => (
                  <tr key={cat._id} className="hover:bg-zinc-950/40 bg-[#050505] transition-colors">
                    <td className="py-3 px-6 font-bold text-white uppercase">{cat.nome}</td>
                    
                    <td className="py-3 px-6 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => { setCategoriaSelecionada(cat); setModalAberto(true); }}
                          className="p-1.5 text-zinc-500 hover:text-white hover:bg-zinc-900 rounded transition-colors"
                          title="Editar Categoria"
                        > 
                          <Edit2 size={14} />
                        </button>
                        <button 
                          onClick={() => handleExcluirCategoria(cat._id, cat.nome)}
                          className="p-1.5 text-zinc-500 hover:text-red-500 hover:bg-red-950/20 rounded transition-colors"
                          title="Excluir Categoria"
                        > 
                          <Trash2 size={14} /> 
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}         
            </tbody>    
          </table>
        </div>

        {/* Modal de Cadastro/Edição */}
        <ModalCadastroCategoria 
          isOpen={modalAberto}
          onClose={() => setModalAberto(false)}
          onSuccess={fetchCategoria}
          categoriaParaEditar={categoriaSelecionada}
          eventoId={eventoId} 
        />
      </div>
    </div>
  );
}