import { NextResponse } from 'next/server';
import { conectDB } from '@/app/lib/mongodb'; // Ajuste o caminho do seu arquivo de conexão se for diferente
import {Categoria} from '@/app/model/esquemas'; // Ajuste o caminho do seu modelo se for diferente

// POST: Criar uma nova categoria
export async function POST(request: Request) {
  try {
    await conectDB();

    const body = await request.json();
    const { nome, eventoId } = body;

    // Validação simples dos dados obrigatórios
    if (!nome || !eventoId) {
      return NextResponse.json(
        { error: 'Nome da categoria e eventoId são obrigatórios.' },
        { status: 400 }
      );
    }

    // Cria a categoria no banco de dados
    const novaCategoria = await Categoria.create({
      nome: nome.trim().toUpperCase(),
      eventoId
    });

    return NextResponse.json(novaCategoria, { status: 201 });
  } catch (error: any) {
    console.error('Erro ao salvar categoria:', error);
    return NextResponse.json(
      { error: 'Erro interno ao salvar a categoria no banco de dados.' },
      { status: 500 }
    );
  }
}

// GET: Buscar categorias (geral ou filtrado por evento)
export async function GET(request: Request) {
  try {
    await conectDB();

    const { searchParams } = new URL(request.url);
    const eventoId = searchParams.get('evento');

    // Se passar ?evento=ID na URL, filtra por ele. Se não, traz todas.
    const filtro = eventoId ? { eventoId } : {};
    const categorias = await Categoria.find(filtro).sort({ nome: 1 });

    return NextResponse.json(categorias, { status: 200 });
  } catch (error: any) {
    console.error('Erro ao buscar categorias:', error);
    return NextResponse.json(
      { error: 'Erro interno ao buscar as categorias.' },
      { status: 500 }
    );
  }
}