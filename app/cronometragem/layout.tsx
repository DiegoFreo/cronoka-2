'use client';
import React, { useState, ReactNode } from 'react';
import { 
  Home, Users, Trophy, Layers, Flag, Calendar, 
  Tag, BarChart3, ShieldCheck, Settings, Play, Menu, X, LucideIcon
} from 'lucide-react';

// Interface para as propriedades do item do menu
interface SidebarItemProps {
  icon: LucideIcon;
  label: string;
  active?: boolean;
  onClick?: () => void;
}

// Interface para o Layout principal
interface DashboardLayoutProps {
  children: ReactNode;
}

const SidebarItem = ({ icon: Icon, label, active = false, onClick }: SidebarItemProps) => (
  <div className={`
    flex items-center gap-3 px-4 py-3 rounded-lg cursor-pointer transition-all
    ${active 
      ? 'bg-red-600 text-white shadow-lg shadow-red-900/20' 
      : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'}
  `} onClick={onClick}>
    <Icon size={20} />
    <span className="font-medium">{label}</span>
  </div>
);

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="flex h-screen bg-black text-white overflow-hidden">
      {/* Menu Lateral - Desktop & Mobile */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-[#111] border-r border-red-900/30 transform transition-transform duration-300 ease-in-out
        lg:relative lg:translate-x-0
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="flex flex-col h-full p-4">
          {/* Logo Container */}
          <div className="flex items-center justify-center py-8 border-b border-gray-800 mb-6">
            <div className="w-30 h-30 bg-gray-900 border border-red-600 rounded-lg flex items-center justify-center">
              <span className="text-red-600 py-2 px-4 font-bold text-xl"><img src="FPMX-logo.png" alt="Logo" /></span>
            </div>
          </div>

          {/* Nav Links */}
          <nav className="flex-1 space-y-1 overflow-y-auto custom-scrollbar">
            <SidebarItem icon={Home} label="Home" active />
            <SidebarItem icon={Users} label="Competidores" />
            <SidebarItem icon={Layers} label="Categoria" />
            <SidebarItem icon={Flag} label="Bateria" />
            <SidebarItem icon={Calendar} label="Eventos" />
            <SidebarItem icon={Tag} label="TAGs" />
            <SidebarItem icon={BarChart3} label="Relatório" />
            <SidebarItem icon={Settings} label="Configurações" />
            <SidebarItem icon={Play} label="Iniciar Corrida" />
          </nav>

          {/* Footer do Menu / Profile */}
          <div className="mt-auto pt-4 border-t border-gray-800 flex items-center justify-between">
            <button className="bg-gray-800 hover:bg-red-700 px-4 py-2 rounded text-sm transition-colors">
              Sair
            </button>
            <div className="w-10 h-10 rounded-full border-2 border-red-600 overflow-hidden">
               <img src="/api/placeholder/40/40" alt="User" />
            </div>
          </div>
        </div>
      </aside>

      {/* Área Principal */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header Mobile */}
        <header className="lg:hidden flex items-center justify-between p-4 bg-[#111] border-b border-red-900/30">
          <span className="text-red-600 font-bold">ADMINISTRADOR</span>
          <button onClick={() => setIsOpen(!isOpen)} className="text-white">
            {isOpen ? <X /> : <Menu />}
          </button>
        </header>

        {/* Conteúdo Dinâmico */}
        <div className="flex-1 overflow-y-auto p-6 bg-black">
          <div className="max-w-7xl mx-auto">
            {/* Título de exemplo da sua imagem */}
            <div className="w-full border border-red-600 rounded p-2 text-center mb-8">
              <h1 className="text-red-600 uppercase font-bold tracking-widest">Administrador</h1>
            </div>
            
            {children}
          </div>
        </div>
      </main>
      
      {/* Overlay para fechar menu no mobile */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
}