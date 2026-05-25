import { NextResponse } from "next/server";
import conectDB from '../../lib/mongodb';
import Categoria from '../../model/categoria';
import { criarCategoria, listarCategorias, atualizarCategoria, deletarCategoria } from  '../../controller/categoriaController';

// 1. CADASTRAR CATEGORIA
export async function POST(request) {
  try {
    await conectDB();
    const corpo = await request.json();
    const { nome } = corpo;

    if (!nome) {
      return NextResponse.json({ error: "O nome da categoria é obrigatório." }, { status: 400 });
    }

    const novaCategoria = new Categoria({
      nome: nome.trim()
    });

    await novaCategoria.save();
    return NextResponse.json(novaCategoria, { status: 201 });
  } catch (error) {
    console.error("Erro ao criar categoria:", error);
    if (error.code === 11000) {
      return NextResponse.json({ error: "Esta categoria já está cadastrada." }, { status: 400 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET() {
  try {
    await conectDB();
    const categorias = await Categoria.find();
    return NextResponse.json(categorias); // ✅ retorno obrigatório
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 }); // ✅ retorno no erro também
  }
}

// 2. EDITAR CATEGORIA
export async function PUT(request) {
  try {
    await conectDB();
    const corpo = await request.json();
    const { id, nome } = corpo;

    if (!id) {
      return NextResponse.json({ error: "O ID da categoria é obrigatório para edição." }, { status: 400 });
    }

    if (!nome) {
      return NextResponse.json({ error: "O nome da categoria não pode ficar vazio." }, { status: 400 });
    }

    const categoriaAtualizada = await Categoria.findByIdAndUpdate(
      id,
      {
        nome: nome.trim()
      },
      { new: true }
    );

    if (!categoriaAtualizada) {
      return NextResponse.json({ error: "Categoria não encontrada." }, { status: 404 });
    }

    return NextResponse.json(categoriaAtualizada);
  } catch (error) {
    if (error.code === 11000) {
      return NextResponse.json({ error: "Já existe outra categoria com este mesmo nome." }, { status: 400 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
// 3. EXCLUIR CATEGORIA (Mantém-se igual)
export async function DELETE(request) {
  try {
    await conectDB();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "O ID da categoria é obrigatório." }, { status: 400 });
    }

    const categoriaDeletada = await Categoria.findByIdAndDelete(id);

    if (!categoriaDeletada) {
      return NextResponse.json({ error: "Categoria não encontrada." }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: "Categoria excluída com sucesso!" });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
