import { NextResponse } from 'next/server';
import { conectDB } from '@/app/lib/mongodb'; // Ajuste o caminho se necessário
import{ Piloto} from '@/app/model/esquemas'; // Ajuste o caminho do seu modelo de Piloto se necessário

// POST: Cadastrar um novo piloto no evento e categoria
export async function POST(request: Request) {
  try {
    await conectDB();

    const body = await request.json();
    const { nome, numeral, transponder, categoriasIds, eventoId } = body;

    // Validação estrita baseada no seu Schema
    if (!nome || !numeral || !categoriasIds || !eventoId) {
      return NextResponse.json(
        { error: 'Nome, Numeral, Categoria e Evento são obrigatórios.' },
        { status: 400 }
      );
    }
   
    const novoPiloto = await Piloto.create({
      nome: nome.trim().toUpperCase(),
      numeral: numeral.trim(),
      transponder: transponder ? transponder.trim().toUpperCase() : '',
      categoriasIds,
      eventoId
    });

    return NextResponse.json(novoPiloto, { status: 201 });
  } catch (error: any) {
    console.error('❌ ERRO AO SALVAR PILOTO:', error);
    return NextResponse.json(
      { error: 'Erro interno ao salvar o piloto.', detalhes: error.message },
      { status: 500 }
    );
  }
}

// GET: Buscar pilotos filtrados por evento ou por categoria
export async function GET(request: Request) {
  try {
    await conectDB();

    const { searchParams } = new URL(request.url);
    const eventoId = searchParams.get('evento');
    const categoriaId = searchParams.get('categoria');

    const filtro: any = {};
    if (eventoId) filtro.eventoId = eventoId;
    if (categoriaId) filtro.categoriaId = categoriaId;

    if (!eventoId && !categoriaId) {
      return NextResponse.json({ error: 'Informe ao menos um filtro (evento ou categoria).' }, { status: 400 });
    }

    const pilotos = await Piloto.find(filtro).sort({ nome: 1 });
    return NextResponse.json(pilotos, { status: 200 });
  } catch (error: any) {
    console.error('Erro ao buscar pilotos:', error);
    return NextResponse.json({ error: 'Erro interno ao buscar pilotos.' }, { status: 500 });
  }
}