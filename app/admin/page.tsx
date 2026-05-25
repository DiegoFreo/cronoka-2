'use client'
import { Card, CardContent } from "@/app/components/Card";
import { Users, UserCheck, Layers, Flag, Cpu, CalendarDays, Hourglass} from "lucide-react";
import { set } from "mongoose";
import React, {useEffect, useState} from "react";
import { fi } from "zod/locales";

export default function adminPage() {
  const [countUsuario, setCountUsuario] = useState(0);
  const [countCompetidor, setCountCompetidor] = useState(0);
  const [countCategoria, setCountCategoria] = useState(0);
  const [countBateria, setCountBateria] = useState(0);
  const [countChip, setCountChip] = useState(0);
  const [countEvento, setCountEvento] = useState(0);
  const [totalAno, setTotalAno] = useState(0);
  const [totalMes, setTotalMes] = useState(0);
  const [loading, setLoading] = useState(true);

    useEffect(()=>{
    countUser();
    countCompe();
    countCategorias();
    countBaterias();
    countChips();
    fethEventos();
    //countEventos();
  },[]);

  /*

  const countEventos = async () =>{
     try {        
        const response = await fetch("/api/evento");
        const data = await response.json();
        setCountEvento(data.length);
      }catch(err){
         console.log(err)
      }
    }
      */

  const fethEventos = async () =>{
    try {  
        setLoading(false);      
        const response = await fetch("/api/evento?periodo=ano");
        const dataAno = await response.json();
        setTotalAno(dataAno.length);

        const responseMes = await fetch("/api/evento?periodo=mes");
        const dataMes = await responseMes.json();
        setTotalMes(dataMes.length);
        
     }catch(err){
        console.log(err)
     } finally{
        setLoading(false);
     }
    }

  const countChips = async () =>{
     try {        
        const response = await fetch("/api/tag?flag=false&count=true");
        const data = await response.json();
        setCountChip(data.total);
      }catch(err){
         console.log(err)
      }
    }

  const countCategorias = async () =>{
     try {        
        const response = await fetch("/api/categoria");
        const data = await response.json();
        setCountCategoria(data.length);
      }catch(err){
         console.log(err)
      }
    }

  const countBaterias = async () =>{
     try {        
        const response = await fetch("/api/bateria");
        const data = await response.json();
        setCountBateria(data.length);
      }catch(err){
         console.log(err)
      }
    }

  const countUser = async () =>{
     try {        
        const response = await fetch("/api/usuario");
        const data = await response.json();
        setCountUsuario(data.length);
      }catch(err){
         console.log(err)
      }
    }

  const countCompe= async () =>{
     try {        
        const response = await fetch("/api/piloto");
        const data = await response.json();
        setCountCompetidor(data.length);
      }catch(err){
         console.log(err)
      }
    }


    return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 p-1 font-sans bg-[#0a0a0a]">
  
  {/* Card: Competidores */}
  <Card className="bg-[#111] border border-gray-800 rounded-xl hover:border-gray-700 transition-all cursor-pointer group shadow-lg">
    <CardContent className="p-5 flex items-center justify-between">
      <div className="flex flex-col gap-1">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Competidores</span>
        <h2 className="text-3xl font-black text-white font-mono">{countCompetidor}</h2>
        <p className="text-[11px] text-gray-400 mt-1">Pilotos inscritos no total</p>
      </div>
      <div className="p-3 bg-gray-900 rounded-lg group-hover:bg-red-950/20 text-gray-400 group-hover:text-red-500 transition-colors">
        <Users size={24} />
      </div>
    </CardContent>
  </Card>

  {/* Card: Usuários do Painel */}
  <Card className="bg-[#111] border border-gray-800 rounded-xl hover:border-gray-700 transition-all cursor-pointer group shadow-lg">
    <CardContent className="p-5 flex items-center justify-between">
      <div className="flex flex-col gap-1">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Staff / Equipe</span>
        <h2 className="text-3xl font-black text-white font-mono">{countUsuario}</h2>
        <p className="text-[11px] text-gray-400 mt-1">Usuários administrativos</p>
      </div>
      <div className="p-3 bg-gray-900 rounded-lg group-hover:bg-red-950/20 text-gray-400 group-hover:text-red-500 transition-colors">
        <UserCheck size={24} />
      </div>
    </CardContent>
  </Card>

  {/* Card: Categorias */}
  <Card className="bg-[#111] border border-gray-800 rounded-xl hover:border-gray-700 transition-all cursor-pointer group shadow-lg">
    <CardContent className="p-5 flex items-center justify-between">
      <div className="flex flex-col gap-1">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Categorias</span>
        <h2 className="text-3xl font-black text-white font-mono">{countCategoria}</h2>
        <p className="text-[11px] text-gray-400 mt-1">Classes de motores salvas</p>
      </div>
      <div className="p-3 bg-gray-900 rounded-lg group-hover:bg-red-950/20 text-gray-400 group-hover:text-red-500 transition-colors">
        <Layers size={24} />
      </div>
    </CardContent>
  </Card>

  {/* Card: Baterias */}
  <Card className="bg-[#111] border border-gray-800 rounded-xl hover:border-gray-700 transition-all cursor-pointer group shadow-lg">
    <CardContent className="p-5 flex items-center justify-between">
      <div className="flex flex-col gap-1">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Baterias</span>
        <h2 className="text-3xl font-black text-white font-mono">{countBateria}</h2>
        <p className="text-[11px] text-gray-400 mt-1">Cronogramas de largadas</p>
      </div>
      <div className="p-3 bg-gray-900 rounded-lg group-hover:bg-red-950/20 text-gray-400 group-hover:text-red-500 transition-colors">
        <Flag size={24} />
      </div>
    </CardContent>
  </Card>

  {/* Card: Chips (Estoque de Hardware) */}
  <Card className="bg-[#111] border border-gray-800 rounded-xl hover:border-gray-700 transition-all cursor-pointer group shadow-lg">
    <CardContent className="p-5 flex items-center justify-between">
      <div className="flex flex-col gap-1">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Transponders Livres</span>
        <h2 className="text-3xl font-black text-green-500 font-mono">{countChip}</h2>
        <p className="text-[11px] text-gray-400 mt-1">Chips disponíveis em estoque</p>
      </div>
      <div className="p-3 bg-gray-900 rounded-lg group-hover:bg-green-950/20 text-gray-400 group-hover:text-green-400 transition-colors">
        <Cpu size={24} />
      </div>
    </CardContent>
  </Card>

  {/* Card: Eventos do Ano */}
  <Card className="bg-[#111] border border-gray-800 rounded-xl hover:border-gray-700 transition-all cursor-pointer group shadow-lg">
    <CardContent className="p-5 flex items-center justify-between">
      <div className="flex flex-col gap-1">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Etapas no Ano</span>
        {loading ? (
          <div className="h-9 flex items-center"><div className="w-5 h-5 border-2 border-red-600 border-t-transparent rounded-full animate-spin"></div></div>
        ) : (
          <h2 className="text-3xl font-black text-white font-mono">{totalAno}</h2>
        )}
        <p className="text-[11px] text-gray-400 mt-1">Temporada atual</p>
      </div>
      <div className="p-3 bg-gray-900 rounded-lg group-hover:bg-red-950/20 text-gray-400 group-hover:text-red-500 transition-colors">
        <CalendarDays size={24} />
      </div>
    </CardContent>
  </Card>

  {/* Card: Eventos do Mês */}
  <Card className="bg-[#111] border border-gray-800 rounded-xl hover:border-gray-700 transition-all cursor-pointer group shadow-lg">
    <CardContent className="p-5 flex items-center justify-between">
      <div className="flex flex-col gap-1">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Etapas no Mês</span>
        {loading ? (
          <div className="h-9 flex items-center"><div className="w-5 h-5 border-2 border-red-600 border-t-transparent rounded-full animate-spin"></div></div>
        ) : (
          <h2 className="text-3xl font-black text-amber-500 font-mono">{totalMes}</h2>
        )}
        <p className="text-[11px] text-gray-400 mt-1">Corridas agendadas para este mês</p>
      </div>
      <div className="p-3 bg-gray-900 rounded-lg group-hover:bg-amber-950/20 text-gray-400 group-hover:text-amber-500 transition-colors">
        <Hourglass size={24} />
      </div>
    </CardContent>
  </Card>

</div>
  );
}