import { NextResponse } from 'next/server';
import { conectDB } from '@/app/lib/mongodb'; // Ajuste o caminho se necessário
import {Bateria} from '@/app/model/esquemas'; // Ajuste o caminho se necessário

export async function POST(request: Request) {
  try {
    await conectDB();
    const body = await request.json();
    const { nome, tempoProva, voltasExtras, categoriasIds, eventoId } = body;

    // Garante que pegamos apenas uma string de ID válida, e não o array
    const IDUnicoCategoria = Array.isArray(categoriasIds) ? categoriasIds[0] : categoriasIds;

    if (!IDUnicoCategoria) {
      return NextResponse.json({ error: 'É necessário selecionar ao menos uma categoria.' }, { status: 400 });
    }

    const dadosParaSalvar = {
      nome: nome ? nome.trim().toUpperCase() : '',
      tempoProva: Number(tempoProva) || 15,
      voltasExtras: Number(voltasExtras) || 2,
      categoriaId: IDUnicoCategoria, // Enviando como uma única String/ObjectId
      eventoId: eventoId
    };

    const novaBateria = await Bateria.create(dadosParaSalvar);
    return NextResponse.json(novaBateria, { status: 201 });
  } catch (error: any) {
    console.error('❌ ERRO DETALHADO AO SALVAR BATERIA:', error);
    return NextResponse.json({ error: 'Erro interno no servidor.', detalhes: error.message }, { status: 500 });
  }
}

// GET: Buscar baterias de um evento específico
export async function GET(request: Request) {
  try {
    await conectDB();
    const { searchParams } = new URL(request.url);
    const eventoId = searchParams.get('evento');

    if (!eventoId) {
      return NextResponse.json({ error: 'O parâmetro eventoId é obrigatório.' }, { status: 400 });
    }

    const baterias = await Bateria.find({ eventoId }).sort({ createdAt: 1 });
    return NextResponse.json(baterias, { status: 200 });
  } catch (error: any) {
    console.error('Erro ao buscar baterias:', error);
    return NextResponse.json({ error: 'Erro interno ao buscar as baterias.' }, { status: 500 });
  }
}