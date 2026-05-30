'use client';
import React, { useState, useRef, useEffect } from 'react';
import { X, Upload, UserPlus, FileSpreadsheet, CheckCircle, Edit3, ListChecks } from 'lucide-react';
import * as XLSX from 'xlsx';

interface ModalCadastroProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (novoPiloto?: any) => void; 
  pilotoParaEditar?: any; 
}

export function ModalCadastroPiloto({ isOpen, onClose, onSuccess, pilotoParaEditar }: ModalCadastroProps) {
  const [abaAtiva, setAbaAtiva] = useState<'manual' | 'planilha'>('manual');
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState<string | null>(null);
  
  // Estados do formulário manual
  const [nome, setNome] = useState('');
  const [numero, setNumero] = useState('');
  const [tagId, setTagId] = useState(''); // Guardará a TAG selecionada
  const [patrocinador, setPatrocinador] = useState(''); 
  const [categoriasSelecionadas, setCategoriasSelecionadas] = useState<string[]>([]);
  
  // Listas vindas do banco
  const [tagsBanco, setTagsBanco] = useState<any[]>([]); 
  const [categoriasBanco, setCategoriasBanco] = useState<any[]>([]); 

  const fileInputRef = useRef<HTMLInputElement>(null);
  const isEditing = !!pilotoParaEditar; 

  // Carrega as tags e as categorias dentro do Modal de Pilotos
  useEffect(() => {
    async function carregarDadosBanco() {
      try {
        const [resTags, resCats] = await Promise.all([
          fetch('/api/tag'),
          fetch('/api/categoria')
        ]);
        
        const todasAsTags = await resTags.json();
        const todasAsCategorias = await resCats.json();
        
        if (Array.isArray(todasAsTags)) {
          const tagAtualPiloto = pilotoParaEditar?.tagId || pilotoParaEditar?.tagRfid || pilotoParaEditar?.tag?.[0] || pilotoParaEditar?.tag;

          // Filtra mantendo apenas as livres (flag === false) OU a que o piloto já está usando
          const filtradas = todasAsTags.filter((t: any) => 
            t.flag === false || t.num === tagAtualPiloto || t.tag === tagAtualPiloto || t._id === tagAtualPiloto
          );
          
          setTagsBanco(filtradas);

          // ✨ GARANTE QUE SELECIONA O VALOR QUE VAI PRO SELECT
          if (!isEditing && filtradas.length > 0) {
            const proximaLivre = filtradas[0].num || filtradas[0].tag || filtradas[0]._id || '';
            setTagId(proximaLivre);
          }
        }

        if (Array.isArray(todasAsCategorias)) {
          setCategoriasBanco(todasAsCategorias);
        }
      } catch (err) {
        console.error("Erro ao buscar dados do banco:", err);
      }
    }
    if (isOpen) carregarDadosBanco();
  }, [isOpen, pilotoParaEditar, isEditing]);

  // Monitora se foi passado um piloto para carregar os dados na tela
  useEffect(() => {
    if (pilotoParaEditar && isOpen) {
      setNome(pilotoParaEditar.nome || '');
      setNumero(pilotoParaEditar.numero_piloto?.toString() || pilotoParaEditar.numero?.toString() || '');
      
      const tagAtual = pilotoParaEditar.tagId || pilotoParaEditar.tagRfid || (Array.isArray(pilotoParaEditar.tag) ? pilotoParaEditar.tag[0] : pilotoParaEditar.tag) || '';
      setTagId(tagAtual);
      
      setPatrocinador(pilotoParaEditar.patrocinador || '');
      
      if (pilotoParaEditar.categorias && Array.isArray(pilotoParaEditar.categorias)) {
        const ids = pilotoParaEditar.categorias.map((c: any) => typeof c === 'object' ? c._id : c);
        setCategoriasSelecionadas(ids);
      } else if (pilotoParaEditar.categoriaId) {
        setCategoriasSelecionadas([pilotoParaEditar.categoriaId]);
      } else if (pilotoParaEditar.categoria) {
        setCategoriasSelecionadas([typeof pilotoParaEditar.categoria === 'object' ? pilotoParaEditar.categoria._id : pilotoParaEditar.categoria]);
      } else {
        setCategoriasSelecionadas([]);
      }
      
      setAbaAtiva('manual'); 
    } else if (!isOpen) {
      limparCampos();
    }
  }, [pilotoParaEditar, isOpen]);

  if (!isOpen) return null;

  function toggleCategoria(id: string) {
    if (categoriasSelecionadas.includes(id)) {
      setCategoriasSelecionadas(categoriasSelecionadas.filter(item => item !== id));
    } else {
      setCategoriasSelecionadas([...categoriasSelecionadas, id]);
    }
  }

  // Lógica unificada de envio (POST ou PUT)
  const handleSalvar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim() || !numero.trim()) {
      setErro("Nome e Número do piloto são obrigatórios.");
      return;
    }
    if (categoriasSelecionadas.length === 0) {
      setErro("Selecione ao menos uma categoria para o piloto.");
      return;
    }

    setLoading(true);
    setErro(null);

    try {
      const url = '/api/piloto';
      const method = isEditing ? 'PUT' : 'POST';
      
      const payload = {
        id: pilotoParaEditar?._id || pilotoParaEditar?.id, 
        nome: nome.trim(),
        numero_piloto: Number(numero),
        tagId, // Envia a Tag selecionada no select
        categorias: categoriasSelecionadas, 
        patrocinador: patrocinador.trim()
      };

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const resultado = await response.json();
      if (!response.ok) throw new Error(resultado.error || "Erro ao salvar piloto.");

      setSucesso(isEditing ? "Piloto atualizado com sucesso!" : "Piloto cadastrado com sucesso!");
      
      const primeiraCatId = categoriasSelecionadas[0];
      const nomeCategoriaFallback = categoriasBanco.find(c => c._id === primeiraCatId)?.nome || 'Geral';

      const pilotoRetorno = resultado.piloto || { 
        id: pilotoParaEditar?._id || resultado.id || Date.now().toString(),
        nome, 
        numero, 
        tagRfid: tagId, 
        categoriaNome: nomeCategoriaFallback
      };
      
      onSuccess(pilotoRetorno);
      setTimeout(() => fecharLimpar(), 1500);

    } catch (err: any) {
      setErro(err.message);
    } finally {
      setLoading(false);
    }
  };

  // PROCESSAR IMPORTAÇÃO DO EXCEL/CSV
  const handleImportarExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setErro(null);

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        
        const dadosPlanilha = XLSX.utils.sheet_to_json(ws);

        if (dadosPlanilha.length === 0) {
          throw new Error("A planilha está vazia.");
        }

        const loteFormatado = dadosPlanilha.map((linha: any) => ({
          nome: String(linha['Nome'] || '').trim(),
          numero_piloto: linha['Nº'] || linha['Numero'], 
          tagId: String(linha['Chip'] || linha['Tag'] || '').trim(),      
          categoriaTexto: WebHeaderStringFix(String(linha['Categoria'] || '').trim()), 
          patrocinador: String(linha['PATROCINADORES'] || '').trim() 
        }));

        const response = await fetch('/api/piloto', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ lote: loteFormatado })
        });

        const resultado = await response.json();

        if (!response.ok) throw new Error(resultado.error || "Erro ao salvar lote de pilotos.");

        setSucesso(`${loteFormatado.length} pilotos importados e vinculados às suas categorias!`);
        onSuccess(); 
        setTimeout(() => fecharLimpar(), 2000);

      } catch (err: any) {
        setErro(err.message || "Erro ao ler o arquivo. Verifique o padrão das colunas.");
      } finally {
        setLoading(false);
      }
    };

    reader.readAsBinaryString(file);
  };

  const WebHeaderStringFix = (str: string) => str.replace(/\s+/g, ' ');

  function limparCampos() {
    setNome(''); setNumero(''); setTagId(''); setPatrocinador('');
    setCategoriasSelecionadas([]); 
    setErro(null); setSucesso(null);
  }

  function fecharLimpar() {
    limparCampos();
    setAbaAtiva('manual');
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-[#111] border border-gray-800 rounded-xl overflow-hidden shadow-2xl flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-800 bg-[#161616]">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            {isEditing ? (
              <><Edit3 className="text-red-600" size={20} /> Editar Piloto</>
            ) : (
              <><UserPlus className="text-red-600" size={20} /> Incluir Piloto</>
            )}
          </h2>
          <button onClick={fecharLimpar} className="text-gray-400 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Abas Alternáveis */}
        {!isEditing && (
          <div className="flex border-b border-gray-800 text-sm">
            <button type="button" onClick={() => setAbaAtiva('manual')} className={`flex-1 py-3 font-medium border-b-2 text-center transition-all ${abaAtiva === 'manual' ? 'border-red-600 text-red-500 bg-red-950/5' : 'border-transparent text-gray-400 hover:text-gray-200'}`}>Cadastro Manual</button>
            <button type="button" onClick={() => setAbaAtiva('planilha')} className={`flex-1 py-3 font-medium border-b-2 text-center transition-all ${abaAtiva === 'planilha' ? 'border-red-600 text-red-500 bg-red-950/5' : 'border-transparent text-gray-400 hover:text-gray-200'}`}>Importar Planilha Real</button>
          </div>
        )}

        {/* Conteúdo do Modal */}
        <div className="p-6 flex-1 overflow-y-auto">
          {erro && <div className="p-3 mb-4 text-sm bg-red-950/40 border border-red-500/30 text-red-400 rounded-lg">{erro}</div>}
          {sucesso && (
            <div className="p-4 mb-4 text-sm bg-green-950/40 border border-green-500/30 text-green-400 rounded-lg flex items-center gap-2">
              <CheckCircle size={18} /> {sucesso}
            </div>
          )}

          {abaAtiva === 'manual' ? (
            <form onSubmit={handleSalvar} className="space-y-4">
              <div className="flex flex-col gap-1">
                <label className="text-sm text-gray-400">Nome do Piloto *</label>
                <input 
                  type="text" value={nome} onChange={e => setNome(e.target.value)}
                  placeholder="Ex: OTAVIO AMÂNCIO"
                  className="bg-black border border-gray-800 rounded px-3 py-2 text-white focus:border-red-600 outline-none text-sm"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-sm text-gray-400">Número (Nº) *</label>
                  <input 
                    type="text" value={numero} onChange={e => setNumero(e.target.value)}
                    placeholder="Ex: 3"
                    className="bg-black border border-gray-800 rounded px-3 py-2 text-white focus:border-red-600 outline-none text-sm"
                  />
                </div>
                
                {/* Selector de Chip / TAG */}
                <div className="flex flex-col gap-1">
                  <label className="text-sm text-gray-400">Chip / TAG Sugerido</label>
                  <select
                    value={tagId}
                    onChange={e => setTagId(e.target.value)}
                    className="bg-black border border-gray-800 rounded px-3 py-2 text-white focus:border-red-600 outline-none text-sm h-[38px]"
                  >
                    <option value="">-- Sem TAG / Nenhum --</option>
                    {tagsBanco.map((t) => (
                      <option key={t.num} value={t.num}>
                        {t.num} {t.flag ? '(Atual do Piloto)' : '(Livre)'}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div className="flex flex-col gap-1">
                <label className="text-sm text-gray-400">Patrocinadores</label>
                <input 
                  type="text" value={patrocinador} onChange={e => setPatrocinador(e.target.value)}
                  placeholder="Ex: Itts distribuidora; I9 Yamaha"
                  className="bg-black border border-gray-800 rounded px-3 py-2 text-white focus:border-red-600 outline-none text-sm"
                />
              </div>

              {/* Grid de Categorias */}
              <div className="flex flex-col gap-1.5">
                <label className="text-sm text-gray-400 flex items-center gap-2">
                  <ListChecks size={16} /> Categorias Vinculadas *
                </label>
                <div className="bg-black/50 border border-gray-800 rounded-lg p-3 max-h-40 overflow-y-auto grid grid-cols-2 gap-2 custom-scrollbar">
                  {categoriasBanco.map((cat) => {
                    const selecionada = categoriasSelecionadas.includes(cat._id);
                    return (
                      <div 
                        key={cat._id} onClick={() => toggleCategoria(cat._id)}
                        className={`cursor-pointer px-3 py-2 rounded border text-xs font-medium transition-all flex items-center justify-between
                          ${selecionada ? 'bg-red-600/10 border-red-600 text-red-500' : 'bg-gray-900 border-gray-800 text-gray-400 hover:border-gray-600'}`}
                      >
                        {cat.nome}
                        {selecionada && <CheckCircle size={14} className="text-red-500" />}
                      </div>
                    );
                  })}
                </div>
              </div>

              <button 
                type="submit" disabled={loading}
                className="w-full mt-6 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-medium py-2.5 rounded-lg transition-colors text-sm"
              >
                {loading ? 'Salvando...' : isEditing ? 'Atualizar Dados' : 'Salvar Piloto'}
              </button>
            </form>
          ) : (
            /* Aba Planilha */
            <div className="space-y-4">
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-gray-800 hover:border-red-600/50 rounded-xl p-8 flex flex-col items-center justify-center gap-3 cursor-pointer bg-black/30 hover:bg-black/50 transition-all text-center"
              >
                <div className="p-4 bg-red-950/20 text-red-500 rounded-full">
                  <FileSpreadsheet size={32} />
                </div>
                <div>
                  <p className="text-white font-medium">Clique para subir seu arquivo Excel/CSV</p>
                  <p className="text-xs text-gray-500 mt-1">Carregue diretamente a planilha testada</p>
                </div>
                <input 
                  type="file" ref={fileInputRef} onChange={handleImportarExcel} accept=".xlsx, .xls, .csv" className="hidden" 
                />
              </div>

              <div className="p-3 bg-gray-900/50 border border-gray-800 rounded-lg">
                <h4 className="text-xs font-bold text-gray-300 uppercase tracking-wider mb-2">Estrutura mapeada da sua planilha:</h4>
                <div className="grid grid-cols-4 gap-1 text-center text-[10px] font-mono">
                  <span className="p-1 bg-black rounded border border-gray-800 text-gray-400">Nº</span>
                  <span className="p-1 bg-black rounded border border-gray-800 text-gray-400">Chip</span>
                  <span className="p-1 bg-black rounded border border-gray-800 text-gray-400">Nome</span>
                  <span className="p-1 bg-black rounded border border-gray-800 text-gray-400">Categoria</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}