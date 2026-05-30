'use client';
import React, { useState, ReactNode } from 'react';
import Link from 'next/link'; 
import { usePathname } from 'next/navigation';
import { 
  Home, Users, UserCheck, Layers, Flag, Calendar, 
  Tag, BarChart3, ShieldCheck, Settings, Play, Menu, X, LucideIcon, LogOut
} from 'lucide-react';

interface SidebarItemProps {
  icon: LucideIcon;
  label: string;
  active?: boolean;
  href: string;
  onClick?: () => void;
  isCritical?: boolean;
}

interface DashboardLayoutProps {
  children: ReactNode;
}

// Componente de Item do Menu Otimizado
const SidebarItem: React.FC<SidebarItemProps> = ({ icon: Icon, label, active = false, onClick, href, isCritical = false }) => (
  <Link href={href} onClick={onClick} className="block no-underline">
    <div className={`
      flex items-center gap-3 px-4 py-3 rounded-lg cursor-pointer transition-all font-sans text-sm font-medium
      ${isCritical 
        ? 'bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-900/30 animate-pulse-subtle font-bold' 
        : active 
          ? 'bg-white/[0.04] border border-gray-800 text-red-500 shadow-md' 
          : 'text-gray-400 hover:bg-white/[0.02] hover:text-gray-200 border border-transparent'}
    `}>
      <Icon size={18} className={active && !isCritical ? "text-red-500" : ""} />
      <span>{label}</span>
    </div>
  </Link>
);

const menuItems = [
  { id: 1, icon: Home, label: 'Painel Principal', href: '/admin' },
  { id: 2, icon: Users, label: 'Competidores', href: '/admin/competidor' },
  { id: 3, icon: UserCheck, label: 'Usuários / Staff', href: '/admin/usuario' },
  { id: 4, icon: Layers, label: 'Categorias', href: '/admin/categorias' },
  { id: 5, icon: Flag, label: 'Baterias', href: '/admin/baterias' },
  { id: 6, icon: Calendar, label: 'Eventos', href: '/admin/eventos' },
  { id: 7, icon: Tag, label: 'TAGs / Chips', href: '/admin/tags' },
  { id: 8, icon: BarChart3, label: 'Relatórios', href: '/relatorios' },
  { id: 9, icon: ShieldCheck, label: 'Licenças', href: '/admin/licencas' },
  { id: 10, icon: Settings, label: 'Configurações', href: '/admin/antenas' },
  { id: 11, icon: Play, label: 'Iniciar Corrida', href: '/corrida', isCritical: true },
];

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  const itemAtivo = menuItems.find((item) => item.href === pathname) || { label: 'Administração', description: 'Painel de controle técnico' };

  // Dicionário de descrições dinâmicas para os títulos da página
  const getDescricaoPagina = (label: string) => {
    switch (label) {
      case 'Painel Principal': return 'Visão geral das estatísticas e métricas da temporada.';
      case 'Competidores': return 'Gerenciamento de pilotos inscritos, numeração e históricos.';
      case 'Usuários / Staff': return 'Controle de acessos e usuários do painel administrativo.';
      case 'Categorias': return 'Configuração de classes de motores e níveis de competição.';
      case 'Baterias': return 'Organização e definição das ordens de largadas na pista.';
      case 'Eventos': return 'Planejamento de etapas, datas e locais de corrida.';
      case 'TAGs / Chips': return 'Controle e atribuição dos transponders RFID de telemetria.';
      case 'Relatórios': return 'Exportação de resultados oficiais e planilhas da federação.';
      case 'Licenças': return 'Validação de permissões e alvarás dos pilotos ativos.';
      case 'Configurações': return 'Ajustes globais do sistema de cronometragem e infraestrutura.';
      case 'Iniciar Corrida': return 'Painel de controle em tempo real da antena de pista.';
      default: return 'Gerenciamento e configurações do sistema.';
    }
  };

  return (
    <div className="flex h-screen bg-[#070707] text-white overflow-hidden font-sans">
      
      {/* Menu Lateral */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-[#0d0d0d] border-r border-gray-900 transform transition-transform duration-300 ease-in-out flex flex-col
        lg:relative lg:translate-x-0
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* Logo Container Otimizado */}
        <div className="flex items-center justify-center py-6 border-b border-gray-900 px-4">
          <div className="h-16 w-full relative flex items-center justify-center bg-black/20 rounded-xl p-2 border border-gray-900/50">
            <img src="/FPMX-logo.png" alt="FPMX Logo" className="h-full object-contain max-w-full" />
          </div>
        </div>

        {/* Links de Navegação */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto custom-scrollbar">
          {menuItems.map((item) => (
            <SidebarItem 
              key={item.id} 
              href={item.href}
              icon={item.icon}
              label={item.label}            
              active={pathname === item.href}
              isCritical={item.isCritical}
              onClick={() => setIsOpen(false)} 
            />
          ))}
        </nav>

        {/* Perfil / Footer do Menu */}
        <div className="p-4 border-t border-gray-900 bg-[#0a0a0a] flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full border border-red-600/50 overflow-hidden shrink-0 shadow-inner">
               <img src="https://avatars.githubusercontent.com/u/130919749?v=4" alt="Mário Alexandre" />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-bold text-gray-200 truncate block">Mário Alexandre</span>
              <span className="text-[10px] text-gray-500 font-medium tracking-wide uppercase">Admin</span>
            </div>
          </div>
          
          <button 
            title="Sair do painel"
            className="p-2 text-gray-500 hover:text-red-500 hover:bg-red-950/20 rounded-lg transition-all"
          >
            <LogOut size={16} />
          </button>
        </div>
      </aside>

      {/* Área de Conteúdo Principal */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        
        {/* Header de Barra Superior Mobile */}
        <header className="lg:hidden flex items-center justify-between p-4 bg-[#0d0d0d] border-b border-gray-900">
          <div className="h-8 flex items-center">
            <img src="/FPMX-logo.png" alt="FPMX" className="h-full object-contain" />
          </div>
          <button 
            onClick={() => setIsOpen(!isOpen)} 
            className="p-1.5 text-gray-400 hover:text-white bg-gray-900 border border-gray-800 rounded-md transition-colors"
          >
            {isOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </header>

        {/* Scroll Interno do Conteúdo */}
        <div className="flex-1 overflow-y-auto bg-[#070707] custom-scrollbar">
          <div className="max-w-7xl mx-auto p-6 md:p-10">
            
            {/* Título de Página Executivo - Integrado no Topo */}
            <div className="mb-8 border-b border-gray-900 pb-5 hidden lg:block">
              <h1 className="text-2xl font-black text-white tracking-tight uppercase">
                {itemAtivo.label}
              </h1>
              <p className="text-xs text-gray-500 mt-1">
                {getDescricaoPagina(itemAtivo.label)}
              </p>
            </div>
            
            {/* Renderização das Subpáginas */}
            <div className="w-full">
              {children}
            </div>
            
          </div>
        </div>
      </main>

      {/* Sombra de Fundo Mobile */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/70 z-40 lg:hidden backdrop-blur-xs transition-opacity"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
}