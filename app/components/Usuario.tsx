'use client';
import { de } from "zod/locales";
import React, {useState, useEffect} from "react";
import { Edit2, Trash2, Plus, UserCheck } from "lucide-react";
import { ModalCadastroUsuario } from "./ModalCadastroUsuario";
import { Usuario } from "@/app/types/types-corrida";

export default function Usuarios() {
    const [usuario, setUsuario] = useState<Usuario[]>([]);
    const [modalAberto, setModalAberto] = useState(false);
    const [usuarioSelecionado, setUsuarioSelecionado] = useState<any | undefined>(undefined);   

    useEffect(()=>{
        fetchUsuario();
    },[]);

    const fetchUsuario = async () =>{
        try{
            const response = await fetch("/api/usuario");
            const data = await response.json();
            setUsuario(data);
        }
        catch(err){
            console.log(err)
        }
    };
    const handleExcluirUsuario = async (id: string, nome: string) => {
        if (!confirm(`Deseja mesmo remover o usuário ${nome}?`)) return;
        
        try {
            const res = await fetch(`/api/usuario?id=${id}`, { method: 'DELETE' });
            if (!res.ok) throw new Error("Erro ao excluir");
            alert("Usuário removido!");
            fetchUsuario();
        } catch (err) {
            alert("Erro ao excluir usuário.");
        }
    };

    return (
                <div className="bg-[#111] border border-gray-800 rounded-xl overflow-hidden shadow-xl">
  
  {/* Topo / Header do Bloco */}
  <div className="flex items-center justify-between p-5 border-b border-gray-800 bg-[#161616]">
    <div>
      <h2 className="text-lg font-bold text-white flex items-center gap-2">
        <UserCheck className="text-red-600" size={20} /> Usuários da Plataforma
      </h2>
      <p className="text-xs text-gray-500 mt-0.5">Gerencie a equipe de cronometragem, secretaria e administradores.</p>
    </div>
    
    <button 
      onClick={() => {
        setUsuarioSelecionado(undefined);
        setModalAberto(true);
      }}
      className="flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white font-medium px-4 py-2 rounded-lg transition-all shadow-lg shadow-red-900/20 text-sm"
    >
      <Plus size={16} /> Adicionar Usuário
    </button>
  </div>            

  {/* Tabela Modificada no Padrão Premium Dark */}
  <div className="overflow-x-auto">
    <table className="w-full text-left border-collapse">
      <thead>
        <tr className="border-b border-gray-800 bg-[#161616] text-xs font-semibold text-gray-400 uppercase tracking-wider">
          <th className="py-4 px-6">Nome Completo</th>
          <th className="py-4 px-6">E-mail de Acesso</th>
          <th className="py-4 px-6 text-center w-40">Permissão</th>
          <th className="py-4 px-6 text-right w-28">Ações</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-800 text-sm">
        {usuario.length === 0 ? (
          <tr>
            <td colSpan={4} className="text-center py-8 text-gray-500 text-xs italic">
              Nenhum usuário cadastrado...
            </td>
          </tr>
        ) : (
          usuario.map((user) => (
            <tr key={user._id} className="hover:bg-white/[0.02] transition-colors">
              {/* Nome do Usuário */}
              <td className="py-4 px-6 font-medium text-white">{user.nameUser}</td>  
              
              {/* E-mail de Acesso */}
              <td className="py-4 px-6 text-gray-400 font-mono text-xs">{user.emailUser}</td>
              
              {/* Nível de Permissão Formatado com Inteligência */}
              <td className="py-4 px-6 text-center">
                <span className={`
                  inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border
                  ${user.nivelUser === 'A' && 'bg-red-600/10 border-red-600/30 text-red-500'}
                  ${user.nivelUser === 'S' && 'bg-blue-600/10 border-blue-600/30 text-blue-400'}
                  ${user.nivelUser === 'C' && 'bg-gray-800 border-gray-700 text-gray-400'}
                `}>
                  {user.nivelUser === 'A' && 'Admin'}
                  {user.nivelUser === 'S' && 'Secretaria'}
                  {user.nivelUser === 'C' && 'Cronometrista'}
                  {/* Fallback caso use string completa no banco */}
                  {user.nivelUser !== 'A' && user.nivelUser !== 'S' && user.nivelUser !== 'C' && user.nivelUser}
                </span>
              </td>

              {/* Ações Alinhadas no Canto Direito */}
              <td className="py-4 px-6 text-right">
                <div className="flex items-center justify-end gap-1.5">
                  <button 
                    onClick={() => { setUsuarioSelecionado(user); setModalAberto(true); }}
                    className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-800 rounded transition-colors"
                    title="Editar Usuário"
                  > 
                    <Edit2 size={16} />
                  </button>
                  <button 
                    onClick={() => handleExcluirUsuario(user._id, user.nameUser)}
                    className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-950/20 rounded transition-colors"
                    title="Excluir Usuário"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </td>
            </tr>
          ))
        )}                        
      </tbody>    
    </table>
  </div>

  {/* Chamada do Modal de Cadastro */}
  <ModalCadastroUsuario 
    isOpen={modalAberto}
    onClose={() => setModalAberto(false)}
    onSuccess={fetchUsuario}
    usuarioParaEditar={usuarioSelecionado}
  />
</div>
    );
}