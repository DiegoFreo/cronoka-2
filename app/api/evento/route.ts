import { NextRequest, NextResponse } from "next/server";
import conectDB from '@/app/lib/mongodb';
import { Evento } from "@/app/model/esquemas";

export async function GET(request: NextRequest) {
  try {
    await conectDB();
    const { searchParams } = new URL(request.url);
    const filtroStatus = searchParams.get('status');

    let query = {};
    
    // Se o front-end pedir especificamente os "ativos", filtramos removendo os finalizados
    if (filtroStatus === 'ativos') {
      query = { status: { $ne: 'Finalizado' } };
    }

    const eventos = await Evento.find(query).populate('modalidadeId').sort({ data: -1 });
    return NextResponse.json(eventos, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await conectDB();
    const body = await request.json();
    const { nome, data, local, modalidadeId } = body; // Recebe modalidadeId do front-end

    if (!nome || !data || !local || !modalidadeId) {
      return NextResponse.json({ error: "Todos os campos são obrigatórios." }, { status: 400 });
    }

    const novoEvento = await Evento.create({
      nome: nome.trim(),
      data: new Date(data),
      local: local.trim(),
      modalidadeId, // 🌟 Salva no banco com o nome unificado
      status: 'Pendente'
    });

    return NextResponse.json({ success: true, data: novoEvento }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}