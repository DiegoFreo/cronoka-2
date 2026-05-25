'use client';
import React, { useState, useRef, useEffect } from 'react';
import { X, Upload, UserPlus, FileSpreadsheet, CheckCircle, Edit3 } from 'lucide-react';
import * as XLSX from 'xlsx';

interface ModalCadastroProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
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
  const [tagId, setTagId] = useState('');
  const [categoria, setCategoria] = useState(''); 
  const [patrocinador, setPatrocinador] = useState(''); // Estado mantido e agora visível
  const [tagsBanco, setTagsBanco] = useState<any[]>([]); // Para carregar as tags disponíveiss

  const fileInputRef = useRef<HTMLInputElement>(null);
  const isEditing = !!pilotoParaEditar; 


  // Exemplo de como carregar as tags dentro do Modal de Pilotos
useEffect(() => {
  async function buscarTagsDisponiveis() {
    const res = await fetch('/api/tag');
    const todasAsTags = await res.json();
    
    // Filtra para mostrar apenas as tags que NÃO estão ocupadas (flag: false)
    // Mas mantém a tag que já pertence a este piloto se for uma edição
    const filtradas = todasAsTags.filter((t: any) => 
      t.flag === false || t.tag === pilotoParaEditar?.tag
    );
    
    setTagsBanco(filtradas);
  }
  if (isOpen) buscarTagsDisponiveis();
}, [isOpen, pilotoParaEditar]);

  // Monitora se foi passado um piloto para carregar os dados na tela
  useEffect(() => {
    if (pilotoParaEditar && isOpen) {
      
      setNome(pilotoParaEditar.nome || '');
      setNumero(pilotoParaEditar.numero_piloto || '');
      setTagId(pilotoParaEditar.tag?.[0] || '');
      setPatrocinador(pilotoParaEditar.patrocinador || '');
      
      // Converte a lista de objetos categoria de volta para texto separado por ";"
      if (pilotoParaEditar.categorias && Array.isArray(pilotoParaEditar.categorias)) {
        const textoCategorias = pilotoParaEditar.categorias.map((c: any) => c.nome).join('; ');
        setCategoria(textoCategorias);
      } else {
        setCategoria('');
      }
      setAbaAtiva('manual'); 
    } else {
      limparCampos();
    }
  }, [pilotoParaEditar, isOpen]);

  if (!isOpen) return null;

  // Lógica unificada de envio (POST ou PUT)
  const handleSalvar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome || !numero) {
      setErro("Nome e Número do piloto são obrigatórios.");
      return;
    }

    setLoading(true);
    setErro(null);

    try {
      const url = '/api/piloto';
      const method = isEditing ? 'PUT' : 'POST';
      
      const payload = {
        id: pilotoParaEditar?._id, 
        nome,
        numero_piloto: numero,
        tagId,
        categoriaTexto: categoria,
        patrocinador // Enviando patrocinador no envio manual
      };

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const resultado = await response.json();
      if (!response.ok) throw new Error(resultado.error || "Erro ao salvar piloto.");

      setSucesso(isEditing ? "Piloto atualizado com sucesso!" : "Piloto cadastrado com sucesso!");
      onSuccess();
      setTimeout(() => fecharLimpar(), 1500);

    } catch (err: any) {
      setErro(err.message);
    } finally {
      setLoading(false);
    }
  };

  // 1. PROCESSAR IMPORTAÇÃO DO EXCEL/CSV
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
          nome: linha['Nome'] || '',
          numero_piloto: linha['Nº'], 
          tagId: linha['Chip'],      
          categoriaTexto: WebHeaderStringFix(linha['Categoria'] || ''), 
          patrocinador: linha['PATROCINADORES'] || '' 
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

  // Função auxiliar para remover espaços duplicados ocultos que vêm de planilhas
  const WebHeaderStringFix = (str: string) => str.replace(/\s+/g, ' ');

  function limparCampos() {
    setNome(''); setNumero(''); setTagId(''); setCategoria(''); setPatrocinador('');
    setErro(null); setSucesso(null);
  };

  function fecharLimpar() {
    limparCampos();
    setAbaAtiva('manual');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-[#111] border border-gray-800 rounded-xl overflow-hidden shadow-2xl flex flex-col">
        
        {/* Header muda o título se for edição */}
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

        {/* Oculta as abas se for edição */}
        {!isEditing && (
          <div className="flex border-b border-gray-800 text-sm">
            <button onClick={() => setAbaAtiva('manual')} className={`flex-1 py-3 font-medium border-b-2 text-center transition-all ${abaAtiva === 'manual' ? 'border-red-600 text-red-500 bg-red-950/5' : 'border-transparent text-gray-400 hover:text-gray-200'}`}>Cadastro Manual</button>
            <button onClick={() => setAbaAtiva('planilha')} className={`flex-1 py-3 font-medium border-b-2 text-center transition-all ${abaAtiva === 'planilha' ? 'border-red-600 text-red-500 bg-red-950/5' : 'border-transparent text-gray-400 hover:text-gray-200'}`}>Importar Planilha Real</button>
          </div>
        )}

        {/* Conteúdo */}
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
                  className="bg-black border border-gray-800 rounded px-3 py-2 text-white focus:border-red-600 outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-sm text-gray-400">Número (Nº) *</label>
                  <input 
                    type="text" value={numero} onChange={e => setNumero(e.target.value)}
                    placeholder="Ex: 3"
                    className="bg-black border border-gray-800 rounded px-3 py-2 text-white focus:border-red-600 outline-none"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-sm text-gray-400">Chip / TAG</label>
                  <input 
                    type="text" value={tagId} onChange={e => setTagId(e.target.value)}
                    placeholder="Ex: 802"
                    className="bg-black border border-gray-800 rounded px-3 py-2 text-white focus:border-red-600 outline-none"
                  />
                </div>
              </div>
              
              {/* Campo Patrocinador adicionado no Formulário Manual */}
              <div className="flex flex-col gap-1">
                <label className="text-sm text-gray-400">Patrocinadores</label>
                <input 
                  type="text" value={patrocinador} onChange={e => setPatrocinador(e.target.value)}
                  placeholder="Ex: Itts distribuidora; I9 Yamaha"
                  className="bg-black border border-gray-800 rounded px-3 py-2 text-white focus:border-red-600 outline-none"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-sm text-gray-400">Categorias (Separadas por ponto e vírgula)</label>
                <input 
                  type="text" value={categoria} onChange={e => setCategoria(e.target.value)}
                  placeholder="Ex: FPMX 5; FPMX 1"
                  className="bg-black border border-gray-800 rounded px-3 py-2 text-white focus:border-red-600 outline-none"
                />
              </div>
              <button 
                type="submit" disabled={loading}
                className="w-full mt-6 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-medium py-2 rounded transition-colors"
              >
                {loading ? 'Salvando...' : isEditing ? 'Atualizar Dados' : 'Salvar Piloto'}
              </button>
            </form>
          ) : (
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