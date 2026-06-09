'use client';
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, User, AlertTriangle, Radio, WifiOff, Wifi } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [usuario, setUsuario] = useState('');
  const [senha, setSenha] = useState('');
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [modoOffline, setModoOffline] = useState(false);

  // Função auxiliar para gravar os cookies simulados no Client-Side quando estiver offline
  const definirCookieClientSide = (nome: string, valor: string) => {
    const data = new Date();
    data.setTime(data.getTime() + (12 * 60 * 60 * 1000)); // 12 horas
    document.cookie = `${nome}=${valor}; expires=${data.toUTCString()}; path=/`;
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const userLimpo = usuario.trim().toLowerCase();
    const senhaLimpa = senha.trim();

    if (!userLimpo || !senhaLimpa) {
      setErro("Insira o usuário e a senha operacional.");
      return;
    }

    setLoading(true);
    setErro(null);
    setModoOffline(false);

   // Substitua o trecho de dentro do handleLogin na page de login por este:
try {
  const response = await fetch('/api/auth', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ usuario: userLimpo, senha: senhaLimpa }) // envia e-mail e senha
  });

  const dados = await response.json();

  if (response.ok) {
    // Grava o backup offline casado com a nova estrutura e trazendo o avatar
    const dadosContingencia = {
      usuario: userLimpo,
      senhaHex: btoa(senhaLimpa), 
      role: dados.role,
      avatar: dados.avatar
    };
    localStorage.setItem(`sc_auth_cache_${userLimpo}`, JSON.stringify(dadosContingencia));

    redirecionarPorCargo(dados.role);
    return;
  }
  
  throw new Error(dados.error || "Falha na autenticação.");
} catch (err: any) {
      console.warn("API Indisponível ou erro de credenciais. Tentando contingência offline...", err);

      // 2. SE A API FALHOU (REDE QUEDOU), ENTRA EM MODO DE CONTINGÊNCIA OFFLINE
      const cacheLocal = localStorage.getItem(`sc_auth_cache_${userLimpo}`);

      if (cacheLocal) {
        const dadosLocais = JSON.parse(cacheLocal);

        // Valida se a senha bate com o cache local
        if (dadosLocais.usuario === userLimpo && btoa(senhaLimpa) === dadosLocais.senhaHex) {
          setModoOffline(true);
          
          // Injeta os cookies via javascript para o Middleware não bloquear as páginas
          definirCookieClientSide('sc-session-token', `token-offline-sc-${userLimpo}`);
          definirCookieClientSide('sc-user-role', dadosLocais.role);

          // Aguarda 1 segundo para o operador ver o aviso de "Login Offline"
          setTimeout(() => {
            redirecionarPorCargo(dadosLocais.role);
          }, 1200);
          return;
        }
      }

      // Se não achou cache ou a senha local não bate
      setErro(err.message === "Failed to fetch" || err.message.includes("NetworkError")
        ? "Sem conexão com a internet e nenhum operador registrado localmente neste computador."
        : err.message || "Usuário ou senha inválidos."
      );
      setLoading(false);
    }
  };

  const redirecionarPorCargo = (role: string) => {
    if (role === 'admin') router.push('/admin/painel');
    else if (role === 'secretaria') router.push('/secretaria/painel');
    else if (role === 'cronometrista') router.push('/cronometrista/painel');
    else setErro("Cargo não configurado no sistema.");
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4 font-sans select-none">
      <div className="w-full max-w-sm bg-[#050505] border border-zinc-900 rounded-xl p-6 shadow-2xl space-y-6">
        
        {/* Identidade visual */}
        <div className="text-center space-y-2">
          <div className={`inline-flex items-center justify-center w-12 h-12 rounded-lg bg-red-950/40 border border-red-900/60 text-red-500 mb-1`}>
            <Radio size={24} className={loading ? "animate-spin" : "animate-pulse"} />
          </div>
          <h1 className="text-xl font-black uppercase tracking-wider text-white">
            CRONOKA
          </h1>
          <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
            Central de Autenticação Operacional
          </p>
        </div>

        {/* Banner informativo de Login Offline com Sucesso */}
        {modoOffline && (
          <div className="flex items-start gap-2 p-3 bg-amber-950/40 border border-amber-600/40 text-amber-400 rounded-lg text-xs font-mono animate-pulse">
            <WifiOff size={16} className="shrink-0 mt-0.5" />
            <div>
              <span className="font-bold block uppercase text-[9px]">Aviso de Contingência</span>
              <span>Modo Offline ativado. Credenciais locais validadas com sucesso!</span>
            </div>
          </div>
        )}

        {/* Alerta de erro operacional */}
        {erro && !modoOffline && (
          <div className="flex items-start gap-2 p-3 bg-red-950/30 border border-red-900/50 text-red-400 rounded-lg text-xs font-mono">
            <AlertTriangle size={16} className="shrink-0 mt-0.5" />
            <span>{erro}</span>
          </div>
        )}

        {/* Formulário */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase tracking-wider text-zinc-400 font-mono">
              Operador / Usuário
            </label>
            <div className="relative flex items-center">
              <User size={16} className="absolute left-3 text-zinc-600" />
              <input 
                type="text"
                autoFocus
                value={usuario}
                onChange={(e) => setUsuario(e.target.value)}
                placeholder="Ex: crono_mario"
                disabled={loading}
                className="w-full bg-black border border-zinc-800 focus:border-red-600 rounded pl-10 pr-3 py-2 text-white font-mono text-sm outline-none transition-colors disabled:opacity-50 placeholder:text-zinc-700"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase tracking-wider text-zinc-400 font-mono">
              Chave de Segurança
            </label>
            <div className="relative flex items-center">
              <Lock size={16} className="absolute left-3 text-zinc-600" />
              <input 
                type="password"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                placeholder="••••••••"
                disabled={loading}
                className="w-full bg-black border border-zinc-800 focus:border-red-600 rounded pl-10 pr-3 py-2 text-white font-mono text-sm outline-none transition-colors disabled:opacity-50 placeholder:text-zinc-700"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-red-600 hover:bg-red-700 disabled:bg-zinc-900 disabled:text-zinc-600 text-white font-black uppercase tracking-wider text-xs py-3 rounded transition-all shadow-lg shadow-red-950/20 mt-2 flex items-center justify-center gap-2"
          >
            {loading ? 'Processando Autenticação...' : 'Acessar Central'}
          </button>
        </form>

        <div className="text-center pt-2">
          <span className="text-[9px] font-mono font-bold text-zinc-600 uppercase tracking-widest">
            V1.0.0 • Hybrid Online/Offline Access
          </span>
        </div>

      </div>
    </div>
  );
}