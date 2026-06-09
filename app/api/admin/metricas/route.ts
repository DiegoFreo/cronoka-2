import { NextRequest, NextResponse } from "next/server";
import conectDB from '@/app/lib/mongodb';
import { Evento, Piloto } from "@/app/model/esquemas";

export async function GET() {
  try {
    await conectDB();

    const agora = new Date();
    const anoAtual = agora.getFullYear();
    const mesAtual = agora.getMonth(); // 0 = Janeiro, 5 = Junho, etc.

    // 1. Conta todos os eventos cadastrados no ano corrente
    const inicioAno = new Date(anoAtual, 0, 1);
    const fimAno = new Date(anoAtual, 11, 31, 23, 59, 59);
    const eventosNoAno = await Evento.countDocuments({
      data: { $gte: inicioAno, $lte: fimAno }
    });

    // 2. Conta os eventos específicos do mês atual
    const inicioMes = new Date(anoAtual, mesAtual, 1);
    const fimMes = new Date(anoAtual, mesAtual + 1, 0, 23, 59, 59);
    const eventosNoMes = await Evento.countDocuments({
      data: { $gte: inicioMes, $lte: fimMes }
    });

    // 3. Simulação/Contagem de estoque de transponders (exemplo base)
    // Se você tiver uma coleção separada de chips cadastrados, pode usar um .countDocuments() nela
    const chipsLivres = 493; 

    return NextResponse.json({
      eventosNoAno,
      eventosNoMes,
      chipsLivres
    }, { status: 200 });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}