'use client';
import React, { useState, useEffect } from 'react';
import { Plus, Calendar, Edit2, Trash2, MapPin, CheckCircle2, Clock } from 'lucide-react';
import { ModalCadastroEvento } from './ModalCadastroEvento';

export default function EventosPage() {
  const [eventos, setEventos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalAberto, setModalAberto] = useState(false);
  const [eventoSelecionado, setEventoSelecionado] = useState<any | undefined>(undefined);

  async function carregarEventos() {
    try {
      setLoading(true);
      const res = await fetch('/api/evento');
      const dados = await res.json();
      setEventos(dados);
    } catch (err) {
      console.error("Erro ao carregar eventos", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    carregarEventos();
  }, []);

  async function handleExcluir(id: string, nome: string) {
    if (!confirm(`Deseja excluir permanentemente o evento "${nome}"?`)) return;
    try {
      const res = await fetch(`/api/evento?id=${id}`, { method: 'DELETE' });
      if (res.ok) carregarEventos();
    } catch (err) {
      alert("Erro ao excluir evento.");
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white p-6 md:p-10">
      
      {/* Header Premium */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 border-b border-gray-900 pb-5">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Calendar className="text-red-600" size={28} /> Gestão de Eventos
          </h1>
          <p className="text-sm text-gray-500 mt-1">Configure as etapas, datas e locais do seu campeonato.</p>
        </div>

        <button
          onClick={() => { setEventoSelecionado(undefined); setModalAberto(true); }}
          className="flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white font-bold px-5 py-2.5 rounded-lg transition-all shadow-lg shadow-red-900/20 text-sm"
        >
          <Plus size={18} /> Novo Evento
        </button>
      </div>

      {/* Tabela de Eventos */}
      <div className="bg-[#111] border border-gray-800 rounded-xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-800 bg-[#161616] text-xs font-semibold text-gray-400 uppercase tracking-wider">
                <th className="py-4 px-6">Evento / Etapa</th>
                <th className="py-4 px-6">Data</th>
                <th className="py-4 px-6">Localização</th>
                <th className="py-4 px-6 text-center">Status</th>
                <th className="py-4 px-6 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800 text-sm">
              {loading ? (
                <tr><td colSpan={5} className="py-10 text-center text-gray-500 italic">Carregando eventos...</td></tr>
              ) : eventos.length === 0 ? (
                <tr><td colSpan={5} className="py-10 text-center text-gray-500 italic">Nenhum evento registrado.</td></tr>
              ) : (
                eventos.map((evt) => (
                  <tr key={evt._id} className="hover:bg-white/[0.02] transition-colors group">
                    <td className="py-4 px-6 font-bold text-white uppercase tracking-tight">{evt.nome}</td>
                    <td className="py-4 px-6 text-gray-400 font-mono text-xs">
                      {new Date(evt.data).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
                    </td>
                    <td className="py-4 px-6 text-gray-400 flex items-center gap-2">
                      <MapPin size={14} className="text-red-900" /> {evt.local}
                    </td>
                    <td className="py-4 px-6 text-center">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
                        evt.status === 'Finalizada' ? 'bg-green-500/10 border-green-500/30 text-green-400' :
                        evt.status === 'Em Andamento' ? 'bg-amber-500/10 border-amber-500/30 text-amber-500' :
                        'bg-gray-800 border-gray-700 text-gray-400'
                      }`}>
                        {evt.status}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => { setEventoSelecionado(evt); setModalAberto(true); }} className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-800 rounded transition-colors"><Edit2 size={16} /></button>
                        <button onClick={() => handleExcluir(evt._id, evt.nome)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-950/20 rounded transition-colors"><Trash2 size={16} /></button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Integrado */}
      <ModalCadastroEvento 
        isOpen={modalAberto}
        onClose={() => setModalAberto(false)}
        onSuccess={carregarEventos}
        eventoParaEditar={eventoSelecionado}
      />
    </div>
  );
}