'use client';

import React, { useState } from 'react';
import { X, UserPlus, Loader2 } from 'lucide-react';

interface Categoria {
  _id: string;
  nome: string;
}

interface Bateria {
  _id: string;
  nome: string;
  categoriaId?: any;
}

interface Piloto {
  _id: string;
  nome: string;
  numeral: string;
  transponder: string;
  categoriasIds: string[] | Categoria[] | any;
  voltas?: number;
  tempoTotalMs?: number;
  melhorVoltaMs?: number;
  ultimaPassagemMs?: number;
  ultimaVoltaMs?: number;     
  historicoVoltas?: number[]; 
}

interface ModalIncluirPilotoProps {
  isOpen: boolean;
  onClose: () => void;
  eventoId: string | null;
  bateriaId: string | null;
  categoriasBateria: Categoria[];
  onPilotoAdicionado: (piloto: Piloto) => void;
  transponderInicial?: string;
}

function ModalIncluirPiloto({ 
  isOpen, 
  onClose, 
  eventoId, 
  bateriaId, 
  categoriasBateria, 
  onPilotoAdicionado 
}: ModalIncluirPilotoProps) {
  const [nome, setNome] = useState('');
  const [numeral, setNumeral] = useState('');
  const [transponder, setTransponder] = useState('');
  const [categoriaId, setCategoriaId] = useState('');
  const [salvando, setSalvando] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome || !numeral) {
      alert("Preencha ao menos o nome e o numeral do piloto.");
      return;
    }

    try {
      setSalvando(true);
      
      const payload = {
        nome,
        numeral,
        transponder: transponder || `TAG-${numeral}`,
        eventoId,
        bateriaId,
        categoriasIds: categoriaId ? [categoriaId] : []
      };

      const res = await fetch('/api/piloto', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error("Erro ao salvar piloto no banco.");

      const pilotoSalvo = await res.json();

      // Envia o novo piloto de volta para a tela principal (sem refresh)
      onPilotoAdicionado(pilotoSalvo);
      onClose();
    } catch (err: any) {
      alert(err.message || "Falha ao cadastrar piloto.");
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#0b0b0c] border border-zinc-800 w-full max-w-md rounded-2xl p-6 flex flex-col gap-4 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
        
        <div className="flex justify-between items-center border-b border-zinc-900 pb-3">
          <h2 className="text-lg font-black font-sans text-white uppercase tracking-wide">
            + Incluir Novo Piloto
          </h2>
          <button 
            onClick={onClose}
            className="text-zinc-500 hover:text-white font-mono text-sm px-2"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3 font-sans text-xs">
          <div>
            <label className="text-zinc-400 font-mono text-[10px] uppercase font-bold block mb-1">
              Nome do Piloto *
            </label>
            <input 
              type="text"
              required
              placeholder="Ex: Léo Silva"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className="w-full bg-black border border-zinc-800 rounded-xl px-3 py-2.5 text-white outline-none focus:border-blue-600 font-bold"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-zinc-400 font-mono text-[10px] uppercase font-bold block mb-1">
                Numeral (#) *
              </label>
              <input 
                type="text"
                required
                placeholder="Ex: 99"
                value={numeral}
                onChange={(e) => setNumeral(e.target.value)}
                className="w-full bg-black border border-zinc-800 rounded-xl px-3 py-2.5 text-white outline-none focus:border-blue-600 font-mono font-bold text-center"
              />
            </div>

            <div>
              <label className="text-zinc-400 font-mono text-[10px] uppercase font-bold block mb-1">
                Transponder / Tag RFID
              </label>
              <input 
                type="text"
                placeholder="Ex: E200..."
                value={transponder}
                onChange={(e) => setTransponder(e.target.value)}
                className="w-full bg-black border border-zinc-800 rounded-xl px-3 py-2.5 text-white outline-none focus:border-blue-600 font-mono"
              />
            </div>
          </div>

          <div>
            <label className="text-zinc-400 font-mono text-[10px] uppercase font-bold block mb-1">
              Categoria
            </label>
            <select
              value={categoriaId}
              onChange={(e) => setCategoriaId(e.target.value)}
              className="w-full bg-black border border-zinc-800 rounded-xl px-3 py-2.5 text-zinc-300 outline-none focus:border-blue-600"
            >
              <option value="">-- Selecione a Categoria --</option>
              {categoriasBateria.map((cat) => (
                <option key={cat._id} value={cat._id}>
                  {cat.nome}
                </option>
              ))}
            </select>
          </div>

          <div className="flex gap-2 justify-end mt-4 pt-3 border-t border-zinc-900">
            <button
              type="button"
              onClick={onClose}
              className="bg-[#141417] hover:bg-zinc-800 text-zinc-400 font-bold px-4 py-2.5 rounded-xl uppercase tracking-wider"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={salvando}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-5 py-2.5 rounded-xl uppercase tracking-wider disabled:opacity-50"
            >
              {salvando ? "Salvando..." : "Adicionar Piloto"}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
export default ModalIncluirPiloto;