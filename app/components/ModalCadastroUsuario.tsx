'use client';
import React, { useState, useEffect } from 'react';
import { X, UserPlus, CheckCircle, Edit3, Shield } from 'lucide-react';

interface ModalUsuarioProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  usuarioParaEditar?: any; 
}

export function ModalCadastroUsuario({ isOpen, onClose, onSuccess, usuarioParaEditar }: ModalUsuarioProps) {
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState<string | null>(null);
  
  // Estados do formulário
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [nivelAcesso, setNivelAcesso] = useState('operador');

  const isEditing = !!usuarioParaEditar; 

  // Monitora a abertura e preenche caso seja edição
  useEffect(() => {
    if (usuarioParaEditar && isOpen) {
      setNome(usuarioParaEditar.nameUser || '');
      setEmail(usuarioParaEditar.emailUser || '');
      setNivelAcesso(usuarioParaEditar.nivelUser || 'Cronometrista');
      setSenha(''); // Deixa a senha em branco na edição (só muda se digitar)
    } else {
      limparCampos();
    }
  }, [usuarioParaEditar, isOpen]);

  if (!isOpen) return null;

  const handleSalvar = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Remove espaços extras antes de validar
    const emailLimpo = email ? email.trim() : "";
    const nomeLimpo = nome ? nome.trim() : "";

    if (!nomeLimpo || !emailLimpo) {
      setErro("Nome e E-mail são obrigatórios.");
      return;
    }
    
    if (!isEditing && !senha) {
      setErro("A senha é obrigatória para novos usuários.");
      return;
    }

    setLoading(true);
    setErro(null);

    try {
      const url = '/api/usuario';
      const method = isEditing ? 'PUT' : 'POST';
      
      // Monta o payload garantindo valores padrão seguros
      const payload: any = {
        _id: usuarioParaEditar?._id,
        nameUser: nomeLimpo,
        emailUser: emailLimpo.toLowerCase(), // Normaliza no front com segurança
        nivelUser: nivelAcesso
      };

      // Só anexa a propriedade de senha se ela realmente foi digitada
      if (senha && senha.trim() !== "") {
        payload.passworUser = senha;
      } else if (!isEditing) {
        payload.passworUser = senha;
      }

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const resultado = await response.json();
      if (!response.ok) throw new Error(resultado.error || "Erro ao salvar usuário.");

      setSucesso(isEditing ? "Usuário atualizado com sucesso!" : "Usuário cadastrado com sucesso!");
      onSuccess();
      setTimeout(() => fecharLimpar(), 1500);

    } catch (err: any) {
      setErro(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Funções declaradas de forma tradicional para evitar erros de hoisting
  function limparCampos() {
    setNome('');
    setEmail('');
    setSenha('');
    setNivelAcesso('C');
    setErro(null);
    setSucesso(null);
  }

  function fecharLimpar() {
    limparCampos();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-md bg-[#111] border border-gray-800 rounded-xl overflow-hidden shadow-2xl flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-800 bg-[#161616]">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            {isEditing ? (
              <><Edit3 className="text-red-600" size={20} /> Editar Usuário</>
            ) : (
              <><UserPlus className="text-red-600" size={20} /> Incluir Usuário</>
            )}
          </h2>
          <button onClick={fecharLimpar} className="text-gray-400 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Conteúdo do Formulário */}
        <div className="p-6 flex-1">
          {erro && <div className="p-3 mb-4 text-sm bg-red-950/40 border border-red-500/30 text-red-400 rounded-lg">{erro}</div>}
          {sucesso && (
            <div className="p-4 mb-4 text-sm bg-green-950/40 border border-green-500/30 text-green-400 rounded-lg flex items-center gap-2">
              <CheckCircle size={18} /> {sucesso}
            </div>
          )}

          <form onSubmit={handleSalvar} className="space-y-4">
            {/* Nome */}
            <div className="flex flex-col gap-1">
              <label className="text-sm text-gray-400">Nome Completo *</label>
              <input 
                type="text" value={nome} onChange={e => setNome(e.target.value)}
                placeholder="Ex: João Silva"
                className="bg-black border border-gray-800 rounded px-3 py-2 text-white focus:border-red-600 outline-none w-full"
              />
            </div>

            {/* E-mail */}
            <div className="flex flex-col gap-1">
              <label className="text-sm text-gray-400">E-mail de Acesso *</label>
              <input 
                type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="Ex: joao@evento.com"
                className="bg-black border border-gray-800 rounded px-3 py-2 text-white focus:border-red-600 outline-none w-full"
              />
            </div>

            {/* Senha */}
            <div className="flex flex-col gap-1">
              <label className="text-sm text-gray-400">
                {isEditing ? "Nova Senha (Deixe em branco para manter)" : "Senha de Acesso *"}
              </label>
              <input 
                type="password" value={senha} onChange={e => setSenha(e.target.value)}
                placeholder={isEditing ? "••••••••" : "Digite uma senha forte"}
                className="bg-black border border-gray-800 rounded px-3 py-2 text-white focus:border-red-600 outline-none w-full"
              />
            </div>

            {/* Nível de Acesso */}
            <div className="flex flex-col gap-1">
              <label className="text-sm text-gray-400 flex items-center gap-1">
                <Shield size={14} className="text-gray-500" /> Nível de Permissão
              </label>
              <select 
                value={nivelAcesso} 
                onChange={e => setNivelAcesso(e.target.value)}
                className="bg-black border border-gray-800 rounded px-3 py-2 text-white focus:border-red-600 outline-none w-full cursor-pointer"
              >
                <option value="C">Cronometrista</option>
                <option value="S">Secretaria</option>
                <option value="A">Administrador Geral</option>
              </select>
            </div>

            <button 
              type="submit" disabled={loading}
              className="w-full mt-6 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-medium py-2 rounded transition-colors"
            >
              {loading ? 'Salvando...' : isEditing ? 'Atualizar Usuário' : 'Criar Conta'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}