'use client';
import React, { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation"; // 🌟 Hooks para navegação e parâmetros da URL
import { Piloto } from "@/app/types/types-corrida";
import { Edit2, Trash2, Plus, Users, ArrowLeft } from "lucide-react"
import { ModalCadastroPiloto } from "./ModalCadastroPiloto";

const CompetidoresPage = () => {
    const router = useRouter();
    const searchParams = useSearchParams();
    
    // 🌟 Captura o ID do evento vindo da URL (?evento=ID_DO_EVENTO)
    const eventoId = searchParams.get('evento');

    const [competidores, setCompetidores] = useState<Piloto[]>([]);
    const [modalAberto, setModalAberto] = useState(false);
    const [pilotoSelecionado, setPilotoSelecionado] = useState<any | undefined>(undefined);

    // 🌟 Define a rota inteligente para o botão de voltar
    const rotaVoltar = eventoId ? `/admin/painel/${eventoId}` : '/admin/painel';

    useEffect(() => {
        fetchCompetidores();
    }, [eventoId]); // Recarrega se o ID do evento mudar

    const fetchCompetidores = async () => {
        try {
            // 🌟 Injeta o filtro do eventoId na requisição da API se ele existir
            const url = eventoId ? `/api/piloto?eventoId=${eventoId}` : "/api/piloto";
            const response = await fetch(url);
            const data = await response.json();
            setCompetidores(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error("Erro ao buscar competidores:", error);
        }
    };

    // 1. DISPARA A EXCLUSÃO
    const handleExcluir = async (id: string, nome: string) => {
        const confirmou = confirm(`Tem certeza que deseja excluir o piloto ${nome}? Esta ação não pode ser desfeita.`);
        if (!confirmou) return;

        try {
            const response = await fetch(`/api/piloto?id=${id}`, { method: 'DELETE' });
            const resultado = await response.json();

            if (!response.ok) throw new Error(resultado.error || "Erro ao excluir piloto.");
            
            alert("Piloto removido com sucesso!");
            fetchCompetidores(); // Atualiza a tabela na hora
        } catch (error: any) {
            alert(error.message);
        }
    };

    // 2. ABRE PARA EDICAO
    const abrirEdicao = (piloto: any) => {
        setPilotoSelecionado(piloto);
        setModalAberto(true);
    };

    return (
        <div className="space-y-4">
            
            {/* 🌟 BOTÃO DE VOLTAR INTELIGENTE NO PADRÃO INDUSTRIAL */}
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
                            <Users className="text-red-600" size={20} /> Competidores Cadastrados
                        </h2>
                        <p className="text-xs text-gray-500 mt-0.5">Gerencie os pilotos, numerações e chips de telemetria.</p>
                    </div>
                    
                    <button 
                        onClick={() => { setPilotoSelecionado(undefined); setModalAberto(true); }}
                        className="flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white font-medium px-4 py-2 rounded-lg transition-all shadow-lg shadow-red-900/20 text-sm"
                    >
                        <Plus size={16} /> Adicionar Competidor
                    </button>
                </div>            

                {/* Tabela no Padrão Premium Dark */}
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-gray-800 bg-[#161616] text-xs font-semibold text-gray-400 uppercase tracking-wider">
                                <th className="py-4 px-6 w-24 text-center">Nº</th>
                                <th className="py-4 px-6">Nome do Piloto</th>
                                <th className="py-4 px-6 w-40">Código do Chip</th>
                                <th className="py-4 px-6 text-right w-28">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-800 text-sm">
                            {competidores.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="text-center py-8 text-gray-500 text-xs italic">
                                        Nenhum competidor cadastrado para este contexto...
                                    </td>
                                </tr>
                            ) : (
                                competidores.map((competidor) => (
                                    <tr 
                                        key={competidor._id} 
                                        className="group relative hover:bg-white/[0.02] transition-colors text-gray-200 cursor-help"
                                    > 
                                        {/* Número centralizado com destaque em Badge */}
                                        <td className="py-4 px-6 text-center font-mono font-bold text-red-500">
                                            {competidor.numero_piloto}
                                        </td>                                    
                                        
                                        {/* Nome alinhado à esquerda com o Tooltip inteligente */}
                                        <td className="py-4 px-6 font-medium text-white relative">
                                            {competidor.nome}
                                            
                                            {/* BALÃO FLUTUANTE (TOOLTIP) - Totalmente integrado ao novo layout */}
                                            {competidor.categorias && competidor.categorias.length > 0 && (
                                                <div className="absolute left-6 z-50 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-200 bottom-full mb-1 bg-[#161616] border border-red-600/50 text-white text-xs rounded-lg p-3 shadow-2xl max-w-xs">
                                                    <p className="font-bold text-red-500 mb-1.5 uppercase tracking-wider text-[10px]">
                                                        Categorias Inscritas:
                                                    </p>
                                                    <div className="flex flex-wrap gap-1">
                                                        {competidor.categorias.map((cat: any) => (
                                                            <span 
                                                                key={cat._id} 
                                                                className="bg-red-600/10 border border-red-600/30 text-red-400 px-2 py-0.5 rounded text-[10px] font-semibold"
                                                            >
                                                                {cat.nome}
                                                            </span>
                                                        ))}
                                                    </div>
                                                    {/* Pequena setinha apontando para baixo */}
                                                    <div className="w-2 h-2 bg-[#161616] border-r border-b border-red-600/50 absolute bottom-[-5px] left-6 rotate-45"></div>
                                                </div>
                                            )}
                                        </td>

                                        {/* Tag/Chip no padrão mono */}
                                        <td className="py-4 px-6 font-mono text-gray-400 text-xs">
                                            {competidor.tag || <span className="text-gray-700">Sem chip</span>}
                                        </td>

                                        {/* Botões de Ação elegantes no canto direito */}
                                        <td className="py-4 px-6 text-right">
                                            <div className="flex items-center justify-end gap-1.5">
                                                <button
                                                    onClick={() => abrirEdicao(competidor)}
                                                    className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-800 rounded transition-colors"
                                                    title="Editar Competidor"
                                                > 
                                                    <Edit2 size={16} />
                                                </button>
                                                <button 
                                                    onClick={() => handleExcluir(competidor._id, competidor.nome)}
                                                    className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-950/20 rounded transition-colors"
                                                    title="Excluir Piloto"
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

                {/* O INSTANCIAMENTO DO MODAL UNIFICADO NO FINAL DA PÁGINA */}
                <ModalCadastroPiloto 
                    isOpen={modalAberto}
                    onClose={() => setModalAberto(false)}
                    onSuccess={fetchCompetidores}
                    pilotoParaEditar={pilotoSelecionado}
                />
            </div>
        </div>
    );
};

export default CompetidoresPage;