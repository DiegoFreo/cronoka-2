import { NextResponse } from 'next/server';
import { conectDB } from '@/app/lib/mongodb'; 
import { Antena } from '@/app/model/esquemas'; 

export async function POST(request: Request) {
  try {
    await conectDB();
    // Adicionamos o 'modo' que vem do formulário do painel
    const { nome, ip, porta, modo, status } = await request.json();

    if (!ip || !porta) {
      return NextResponse.json({ error: 'IP e Porta são obrigatórios.' }, { status: 400 });
    }

    const antenaAtualizada = await Antena.findOneAndUpdate(
      { ip: ip.trim() },
      { 
        nome: nome || 'Antena Zebra FX7400', 
        porta: Number(porta), 
        modo: modo || 'SERVER', // Salva se o notebook é Server ou Client
        status: status || 'desconectado' 
      },
      { new: true, upsert: true }
    );

    return NextResponse.json({ message: 'Salvo com sucesso!', data: antenaAtualizada });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// 💡 ADICIONE ISSO AQUI: Rota GET para listar as antenas salvas quando o painel carregar
export async function GET() {
  try {
    await conectDB();
    const antenas = await Antena.find({});
    return NextResponse.json(antenas);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}