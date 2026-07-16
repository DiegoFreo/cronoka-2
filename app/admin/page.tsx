'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Radio } from 'lucide-react';

export default function HomePrincipal() {
  const router = useRouter();

  useEffect(() => {
    // Função rápida para ler os cookies do navegador pelo lado do cliente
    const obterCookie = (nome: string) => {
      const valor = `; ${document.cookie}`;
      const partes = valor.split(`; ${nome}=`);
      if (partes.length === 2) return partes.pop()?.split(';').shift();
      return null;
    };

    const token = obterCookie('sc-session-token');
    const role = obterCookie('sc-user-role');

    // Timer de 800ms apenas para dar um efeito visual de checagem de segurança
    const timer = setTimeout(() => {
      if (token && role) {
        // Se já estiver logado, joga para o painel correspondente ao cargo
        if (role === 'admin') router.push('/admin/painel');
        else if (role === 'secretaria') router.push('/secretaria/painel');
        else if (role === 'cronometrista') router.push('/cronometrista/painel');
        else router.push('/login');
      } else {
        // Se não tiver sessão, vai para a tela de Login
        router.push('/login');
      }
    }, 800);

    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4 select-none">
      <div className="text-center space-y-4">
        {/* Ícone de rádio simulando a checagem das antenas RFID/Sinal */}
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-red-950/20 border border-red-600/30 text-red-600 animate-pulse">
          <Radio size={28} />
        </div>
        
        <div className="space-y-1">
          <h2 className="text-sm font-black uppercase tracking-widest text-white font-mono">
            Iniciando Módulo CRONOKA...
          </h2>
          <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest font-mono animate-bounce">
            Verificando credenciais de pista...
          </p>
        </div>
      </div>
    </div>
  );
}