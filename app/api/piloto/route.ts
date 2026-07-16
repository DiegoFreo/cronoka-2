import { NextResponse } from 'next/server';
import { conectDB } from '@/app/lib/mongodb'; 
import { Piloto } from '@/app/model/esquemas'; 

// GET: Buscar pilotos filtrados por evento ou por categoria
export async function GET(request: Request) {
  try {
    await conectDB();

    const { searchParams } = new URL(request.url);
    const eventoId = searchParams.get('evento');
    const categoriaId = searchParams.get('categoria');

    const filtro: any = {};
    if (eventoId) filtro.eventoId = eventoId;
    
    // Corrigido para verificar dentro do array 'categoriasIds'
    if (categoriaId) filtro.categoriasIds = categoriaId; 

    if (!eventoId && !categoriaId) {
      return NextResponse.json({ error: 'Informe ao menos um filtro (evento ou categoria).' }, { status: 400 });
    }

    // Mantemos o populate para a tabela da listagem exibir os nomes perfeitamente
    const pilotos = await Piloto.find(filtro).sort({ nome: 1 }).populate('categoriasIds', 'nome'); 
    return NextResponse.json(pilotos, { status: 200 });
  } catch (error: any) {
    console.error('Erro ao buscar pilotos:', error);
    return NextResponse.json({ error: 'Erro interno ao buscar pilotos.' }, { status: 500 });
  }
}

// POST: Cadastrar um novo piloto
export async function POST(request: Request) {
  try {
    await conectDB();

    const body = await request.json();
    const { nome, numeral, transponder, categoriasIds, eventoId } = body;

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

// PUT: Atualizar um piloto existente
export async function PUT(request: Request) {
  try {
    await conectDB();

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id'); // Pega o ID passado na URL (?id=...)

    const body = await request.json();
    const { nome, numeral, transponder, categoriasIds } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID do piloto é obrigatório para edição.' }, { status: 400 });
    }

    const pilotoAtualizado = await Piloto.findByIdAndUpdate(
      id,
      {
        nome: nome.trim().toUpperCase(),
        numeral: numeral.trim(),
        transponder: transponder ? transponder.trim().toUpperCase() : '',
        categoriasIds // Salva o array puro de strings/IDs no banco
      },
      { new: true } // Retorna o documento já atualizado
    );

    if (!pilotoAtualizado) {
      return NextResponse.json({ error: 'Piloto não encontrado.' }, { status: 404 });
    }

    return NextResponse.json(pilotoAtualizado, { status: 200 });
  } catch (error: any) {
    console.error('❌ ERRO AO ATUALIZAR PILOTO:', error);
    return NextResponse.json(
      { error: 'Erro interno ao atualizar o piloto.', detalhes: error.message },
      { status: 500 }
    );
  }
}