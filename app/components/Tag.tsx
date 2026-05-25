'use client';
import React, { useState, useEffect } from 'react';
import { Cpu, Plus, Trash2, Check, AlertCircle } from 'lucide-react';
import { ModalImportarTag } from './ModalImportarTag';

export default function TagsPage() {
  const [tags, setTags] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalAberto, setModalAberto] = useState(false);

  async function carregarTags() {
    try {
      setLoading(true);
      const res = await fetch('/api/tag');
      const dados = await res.json();
      setTags(dados);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    carregarTags();
  }, []);

  async function handleExcluir(id: string, num: string) {
    if (!confirm(`Deseja excluir a Tag de final [${num}]?`)) return;
    try {
      const res = await fetch(`/api/tag?id=${id}`, { method: 'DELETE' });
      if (res.ok) carregarTags();
    } catch (err) {
      alert("Erro ao remover tag.");
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white p-6 md:p-10">
      
      {/* Topo / Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 border-b border-gray-900 pb-5">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Cpu className="text-red-600" size={28} /> Hardware / Chips de Corrida (Tags)
          </h1>
          <p className="text-sm text-gray-500 mt-1">Gerencie os transponders RFID e chips ativos fixados nas motos.</p>
        </div>

        <button
          onClick={() => setModalAberto(true)}
          className="flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white font-bold px-5 py-2.5 rounded-lg transition-all shadow-lg shadow-red-900/20 text-sm"
        >
          <Plus size={18} /> Importar Tags
        </button>
      </div>

      {/* Grid de Dados */}
      <div className="bg-[#111] border border-gray-800 rounded-xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-800 bg-[#161616] text-xs font-semibold text-gray-400 uppercase tracking-wider">
                <th className="py-4 px-6 w-32 text-center">Final (Num)</th>
                <th className="py-4 px-6">Código Completo do Transponder (RFID/Tag)</th>
                <th className="py-4 px-6 text-center w-40">Status Pista</th>
                <th className="py-4 px-6 text-right w-24">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800 text-sm">
              {loading ? (
                <tr><td colSpan={4} className="py-10 text-center text-gray-500 italic">Carregando lote de transponders...</td></tr>
              ) : tags.length === 0 ? (
                <tr><td colSpan={4} className="py-10 text-center text-gray-500 italic">Nenhum transponder importado no sistema.</td></tr>
              ) : (
                tags.map((item) => (
                  <tr key={item._id} className="hover:bg-white/[0.02] transition-colors">
                    {/* Exibe o final do chip destacado */}
                    <td className="py-4 px-6 text-center font-mono font-bold text-red-500 bg-red-500/[0.01]">
                      {item.num}
                    </td>
                    
                    {/* Código Bruto da TAG */}
                    <td className="py-4 px-6 font-mono text-gray-300 tracking-wider text-xs uppercase">
                      {item.tag}
                    </td>

                    <td className="py-4 px-6 text-center">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-[10px] font-bold uppercase border ${
                            item.flag 
                            ? 'bg-red-500/10 border-red-500/30 text-red-500' // Ocupado
                            : 'bg-green-500/10 border-green-500/30 text-green-400' // Disponível para uso
                        }`}>
                            {item.flag ? 'Em Uso / Piloto' : 'Disponível'}
                        </span>
                    </td>

                    {/* Excluir */}
                    <td className="py-4 px-6 text-right">
                      <button 
                        onClick={() => handleExcluir(item._id, item.num)}
                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-950/20 rounded transition-colors"
                        title="Deletar Tag"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Importador */}
      <ModalImportarTag 
        isOpen={modalAberto}
        onClose={() => setModalAberto(false)}
        onSuccess={carregarTags}
      />
    </div>
  );
}