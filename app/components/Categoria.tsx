'use client';
import React, { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation"; // Hook para navegação e parâmetros da URL
import { Edit2, Trash2, Plus, Layers, ArrowLeft } from "lucide-react";
import { Categoria } from "@/app/types/types-corrida";
import { ModalCadastroCategoria } from "./ModalCadastroCategoria";

export default function Categorias() {
    const router = useRouter();
    const searchParams = useSearchParams();
    
    // 🌟 Captura o ID do evento vindo da URL (?evento=ID_DO_EVENTO)
    const eventoId = searchParams.get('evento');

    const [categoria, setCategoria] = useState<Categoria[]>([]);
    const [modalAberto, setModalAberto] = useState(false);
    const [categoriaSelecionada, setCategoriaSelecionada] = useState<any | undefined>(undefined);

    // Define a rota inteligente para o botão de voltar
    const rotaVoltar = eventoId ? `/admin/painel/${eventoId}` : '/admin/painel';

    useEffect(() => {
        fetchCategoria();
    }, [eventoId]); // Recarrega se o ID do evento mudar

    const fetchCategoria = async () => {
        try {
            // 🌟 CORRIGIDO: Modificado de 'eventoId=' para 'evento=' para bater com a rota padrão do seu painel e API
            const url = eventoId ? `/api/categoria?evento=${eventoId}` : "/api/categoria";
            const response = await fetch(url);
            const data = await response.json();
            setCategoria(Array.isArray(data) ? data : []);
        }
        catch (err) {
            console.log(err);
        }
    };

    const handleExcluirCategoria = async (id: string, nome: string) => {
        if (!confirm(`Deseja mesmo remover a categoria ${nome}?`)) return;
        
        try {
            const res = await fetch(`/api/categoria?id=${id}`, { method: 'DELETE' });
            if (!res.ok) throw new Error("Erro ao excluir");
            alert("Categoria removida!");
            fetchCategoria();
        } catch (err) {
            alert("Erro ao excluir categoria.");
        }
    };
   
    return (
        <div className="space-y-4">
            
            {/* BOTÃO DE VOLTAR INTELIGENTE NO PADRÃO INDUSTRIAL */}
            <div className="flex items-center justify-between pb-1">
                <button 
                    onClick={() => router.push(rotaVoltar)}
                    className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-zinc-500 hover:text-white transition-colors group bg-transparent border-none outline-none cursor-pointer"
                >
                    <ArrowLeft size={14} className="text-red-600 group-hover:-translate-x-0.5 transition-transform" />
                    {eventoId ? 'Voltar ao Painel do Evento' : 'Voltar aos Eventos'}
                </button>
            </div>

            {/* CARD PRINCIPAL */}
            <div className="bg-[#111] border border-gray-800 rounded-xl overflow-hidden shadow-xl">
      
                {/* Topo / Header do Bloco */}
                <div className="flex items-center justify-between p-5 border-b border-gray-800 bg-[#161616]">
                    <div>
                        <h2 className="text-lg font-bold text-white flex items-center gap-2">
                            <Layers className="text-red-600" size={20} /> Categorias Cadastradas
                        </h2>
                        <p className="text-xs text-gray-500 mt-0.5">Gerencie as classes e divisões dos competidores.</p>
                    </div>
                    
                    <button 
                        onClick={() => { setCategoriaSelecionada(undefined); setModalAberto(true); }}
                        className="flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white font-medium px-4 py-2 rounded-lg transition-all shadow-lg shadow-red-900/20 text-sm"
                    >
                        <Plus size={16} /> Adicionar Categoria
                    </button>
                </div>            

                {/* Tabela Modificada no Padrão da Bateria */}
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-gray-800 bg-[#161616] text-xs font-semibold text-gray-400 uppercase tracking-wider">
                                <th className="py-4 px-6">Nome da Categoria</th>
                                <th className="py-4 px-6 text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-800 text-sm">
                            {categoria.length === 0 ? (
                                <tr>
                                    <td colSpan={2} className="text-center py-8 text-gray-500 text-xs italic">
                                        Nenhuma categoria cadastrada para este contexto...
                                    </td>
                                </tr>
                            ) : (
                                categoria.map((cat) => (
                                    <tr key={cat._id} className="hover:bg-white/[0.02] transition-colors">
                                        {/* Nome alinhado à esquerda perfeitamente */}
                                        <td className="py-4 px-6 font-medium text-white">{cat.nome}</td>
                                        
                                        {/* Botões de Ação elegantes no canto direito */}
                                        <td className="py-4 px-6 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button 
                                                    onClick={() => { setCategoriaSelecionada(cat); setModalAberto(true); }}
                                                    className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-800 rounded transition-colors"
                                                    title="Editar Categoria"
                                                > 
                                                    <Edit2 size={16} />
                                                </button>
                                                <button 
                                                    onClick={() => handleExcluirCategoria(cat._id, cat.nome)}
                                                    className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-950/20 rounded transition-colors"
                                                    title="Excluir Categoria"
                                                > 
                                                    <Trash2 size={16} /> 
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}         
                        </tbody>    
                    </table>
                </div>

                {/* Modal de Cadastro */}
                <ModalCadastroCategoria 
                    isOpen={modalAberto}
                    onClose={() => setModalAberto(false)}
                    onSuccess={fetchCategoria}
                    categoriaParaEditar={categoriaSelecionada}
                    eventoId={eventoId} // 🌟 Agora o ID do evento desce preenchido corretamente sem ser nulo
                />
            </div>
        </div>
    );
}