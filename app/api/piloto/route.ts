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
    
    // Filtra dentro do array 'categoriasIds' se for fornecido
    if (categoriaId) filtro.categoriasIds = categoriaId; 

    // REMOVIDO: A trava que exigia eventoId ou categoriaId.
    // Se nenhum filtro for passado, 'filtro' será {} e o MongoDB retornará TODOS os pilotos.

    const pilotos = await Piloto.find(filtro)
      .sort({ nome: 1 })
      .populate('categoriasIds', 'nome'); 

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

export async function PUT(req: Request) {
  try {
    await conectDB();
    const { searchParams } = new URL(req.url);
    const idQuery = searchParams.get('id');
    const body = await req.json();

    const pilotoId = idQuery || body._id;

    if (!pilotoId) {
      return NextResponse.json({ message: 'ID do piloto não fornecido' }, { status: 400 });
    }

    // Atualiza garantindo retorno do documento novo
    const pilotoAtualizado = await Piloto.findByIdAndUpdate(
      pilotoId,
      {
        $set: {
          nome: body.nome,
          numeral: body.numeral,
          transponder: body.transponder,
          categoriasIds: body.categoriasIds,
          eventoId: body.eventoId
        }
      },
      { new: true, runValidators: true }
    );

    if (!pilotoAtualizado) {
      return NextResponse.json({ message: 'Piloto não encontrado' }, { status: 404 });
    }

    return NextResponse.json(pilotoAtualizado, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}