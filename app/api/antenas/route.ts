import { NextResponse } from 'next/server';
import { conectDB } from '@/app/lib/mongodb'; 
import { Antena } from '@/app/model/esquemas'; 

// 💡 Força a rota a sempre rodar no servidor em cada requisição (sem cache estático)
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    await conectDB();
    const body = await req.json();

    const novaAntena = await Antena.create({
      nome: body.nome,
      ip: body.ip,
      porta: body.porta || 5084,
      modo: body.modo || 'CLIENT',
      potenciaAntena: body.potenciaAntena ?? 30,
      tempoRetardoMs: body.tempoRetardoMs ?? 3000,
      status: 'desconectado',
      ativa: false
    });

    return NextResponse.json({ success: true, data: novaAntena }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao cadastrar leitora' }, { status: 500 });
  }
}

export async function GET() {
  try {
    await conectDB();
    const antenas = await Antena.find({}).lean();
    return NextResponse.json(antenas); // Retorna [ { _id, nome, ip, ... }, ... ]
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao buscar antenas' }, { status: 500 });
  }
}