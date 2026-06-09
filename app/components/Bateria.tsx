'use client';
import React, { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation"; // 🌟 Hooks para navegação e parâmetros da URL
import { Edit, Trash2, Flag, Clock, CheckCircle2, Play, ArrowLeft } from "lucide-react";
import { Bateria } from "@/app/types/types-corrida";
import { ModalCadastroBateria } from "./ModalCadastroBateria";

export default function Baterias() {
    const router = useRouter();
    const searchParams = useSearchParams();
    
    // 🌟 Captura o ID do evento vindo da URL (?evento=ID_DO_EVENTO)
    const eventoId = searchParams.get('evento');

    const [baterias, setBaterias] = useState<Bateria[]>([]);
    const [loading, setLoading] = useState(true);
    const [modalAberto, setModalAberto] = useState(false);
    const [bateriaSelecionada, setBateriaSelecionada] = useState<any | undefined>(undefined);

    // 🌟 Define a rota inteligente para o botão de voltar
    const rotaVoltar = eventoId ? `/admin/painel/${eventoId}` : '/admin/painel';

    useEffect(() => {
        carregarBaterias();
    }, [eventoId]); // Recarrega se o ID do evento mudar

    // 1. CARREGAR BATERIAS DO BANCO
    async function carregarBaterias() {
        try {
            setLoading(true);
            // 🌟 Injeta o filtro do eventoId na requisição da API se ele existir
            const url = eventoId ? `/api/bateria?eventoId=${eventoId}` : '/api/bateria';
            const res = await fetch(url);
            if (!res.ok) throw new Error();
            const dados = await res.json();
            setBaterias(Array.isArray(dados) ? dados : []);
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

            {/* CONTAINER PRINCIPAL */}
            <div className="border border-gray-800 rounded-xl bg-black p-5 shadow-xl">    
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="text-xl font-black text-white uppercase tracking-wider flex items-center gap-2">
                            <Flag className="text-red-600" size={22} /> Baterias Cadastradas
                        </h1>
                        <p className="text-xs text-zinc-500 mt-0.5">Gerencie os grupos de largada e horários da pista.</p>
                    </div>
                    
                    <button 
                        onClick={() => {
                            setBateriaSelecionada(undefined); // Garante que o modal venha limpo para inclusão
                            setModalAberto(true);
                        }}
                        className="flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white font-black px-4 py-2.5 rounded-lg transition-all shadow-lg shadow-red-900/20 text-xs uppercase tracking-wider"
                    >
                        Adicionar Bateria
                    </button>
                </div>            
                
                {/* Conteúdo Principal / Tabela */}
                {loading ? (
                    <div className="text-center py-12 text-zinc-500 text-xs italic font-mono">Carregando baterias...</div>
                ) : baterias.length === 0 ? (
                    <div className="text-center py-16 border border-dashed border-zinc-800 rounded-xl bg-[#0b0e14]/50">
                        <Flag size={40} className="text-zinc-800 mx-auto mb-3" />
                        <p className="text-zinc-500 text-xs italic">Nenhuma bateria cadastrada para este contexto.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto bg-[#0b0e14] border border-zinc-900 rounded-xl shadow-inner">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-zinc-900 bg-black text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                                    <th className="py-4 px-6">Bateria / Corrida</th>
                                    <th className="py-4 px-6">Categorias Integradas</th>
                                    <th className="py-4 px-6 text-center">Status</th>
                                    <th className="py-4 px-6"><Clock size={14} className="inline mr-1 text-zinc-600" /> Largada</th>
                                    <th className="py-4 px-6"><Clock size={14} className="inline mr-1 text-zinc-600" /> Chegada</th>
                                    <th className="py-4 px-6 text-right">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-900 text-xs font-medium">
                                {baterias.map((bateria) => (
                                    <tr key={bateria._id} className="hover:bg-white/[0.01] transition-colors">
                                        {/* Nome */}
                                        <td className="py-4 px-6 font-bold text-white uppercase tracking-wide">{bateria.nome}</td>
                                        
                                        {/* Categorias Vinculadas */}
                                        <td className="py-4 px-6">
                                            <div className="flex flex-wrap gap-1.5">
                                                {bateria.categorias?.map((cat: any) => (
                                                    <span 
                                                        key={cat._id} 
                                                        className="bg-black border border-zinc-800 text-zinc-400 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide"
                                                    >
                                                        {cat.nome}
                                                    </span>
                                                ))}
                                            </div>
                                        </td>

                                        {/* Status com Badge de Cor */}
                                        <td className="py-4 px-6 text-center">
                                            <span className={`
                                                inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black tracking-wider uppercase border
                                                ${bateria.status === 'EM_ANDAMENTO' && 'bg-amber-950/40 border-amber-800 text-amber-500'}
                                                ${bateria.status === 'FINALIZADA' && 'bg-emerald-950/40 border-emerald-800 text-emerald-400'}
                                                ${bateria.status === 'AGUARDANDO' && 'bg-zinc-900 border-zinc-800 text-zinc-500'}
                                            `}>
                                                {bateria.status === 'EM_ANDAMENTO' && <Play size={10} className="fill-amber-500 text-amber-500" />}
                                                {bateria.status === 'FINALIZADA' && <CheckCircle2 size={10} />}
                                                {bateria.status}
                                            </span>
                                        </td>

                                        {/* Hora Início */}
                                        <td className="py-4 px-6 font-mono text-zinc-400">{formatarHora(bateria.horaInicio)}</td>

                                        {/* Hora Fim */}
                                        <td className="py-4 px-6 font-mono text-zinc-400">{formatarHora(bateria.horaFim)}</td>

                                        {/* Ações (Editar / Excluir) */}
                                        <td className="py-4 px-6 text-right">
                                            <div className="flex items-center justify-end gap-1">
                                                <button
                                                    onClick={() => {
                                                        setBateriaSelecionada(bateria);
                                                        setModalAberto(true);
                                                    }}
                                                    className="p-1.5 text-zinc-500 hover:text-white hover:bg-zinc-900 rounded transition-colors"
                                                    title="Editar Bateria"
                                                >
                                                    <Edit size={14} />
                                                </button>
                                                <button
                                                    onClick={() => handleExcluirBateria(bateria._id, bateria.nome)}
                                                    className="p-1.5 text-zinc-500 hover:text-red-500 hover:bg-red-950/20 rounded transition-colors"
                                                    title="Excluir Bateria"
                                                >
                                                    <Trash2 size={14} />
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
                    onSuccess={carregarBaterias}
                    bateriaParaEditar={bateriaSelecionada}
                />
            </div>
        </div>
    );
}