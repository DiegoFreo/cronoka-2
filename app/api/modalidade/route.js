import { NextResponse } from "next/server";
import conectDB from "@/app/lib/mongodb";
import Modalidade from "@/app/model/modalidade";

// 1. LISTAR TODAS AS MODALIDADES ATIVAS
export async function GET() {
  try {
    await conectDB();

    // Traz apenas as modalidades que estão marcadas como ativas
    const modalidades = await Modalidade.find({ ativo: true })
      .sort({ nome: 1 }) // Organiza em ordem alfabética (A-Z)
      .lean(); // Retorna JSON puro para máxima velocidade na pista

    return NextResponse.json(modalidades);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// 2. CADASTRAR NOVA MODALIDADE
export async function POST(request) {
  try {
    await conectDB();
    const corpo = await request.json();
    const { nome } = corpo;

    if (!nome) {
      return NextResponse.json(
        { error: "O nome da modalidade é obrigatório (Ex: Motocross)." }, 
        { status: 400 }
      );
    }

    // Evita cadastrar modalidades duplicadas com o mesmo nome
    const modalidadeExistente = await Modalidade.findOne({ 
      nome: { $regex: new RegExp(`^${nome.trim()}$`, "i") } 
    });

    if (modalidadeExistente) {
      return NextResponse.json(
        { error: "Esta modalidade já está cadastrada no sistema." }, 
        { status: 400 }
      );
    }

    const novaModalidade = new Modalidade({
      nome: nome.trim()
    });

    await novaModalidade.save();
    return NextResponse.json(novaModalidade, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// 3. EDITAR OU DESATIVAR MODALIDADE
export async function PUT(request) {
  try {
    await conectDB();
    const corpo = await request.json();
    const { id, nome, ativo } = corpo;

    if (!id) return NextResponse.json({ error: "O ID da modalidade é obrigatório." }, { status: 400 });

    const dadosAtualizados = {};
    if (nome) dadosAtualizados.nome = nome.trim();
    if (ativo !== undefined) dadosAtualizados.ativo = ativo;

    const modalidadeModificada = await Modalidade.findByIdAndUpdate(
      id, 
      dadosAtualizados, 
      { new: true }
    );

    if (!modalidadeModificada) {
      return NextResponse.json({ error: "Modalidade não encontrada." }, { status: 404 });
    }

    return NextResponse.json(modalidadeModificada);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// 4. EXCLUIR MODALIDADE
export async function DELETE(request) {
  try {
    await conectDB();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) return NextResponse.json({ error: "O ID da modalidade é obrigatório." }, { status: 400 });

    const modalidadeDeletada = await Modalidade.findByIdAndDelete(id);
    if (!modalidadeDeletada) {
      return NextResponse.json({ error: "Modalidade não encontrada." }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: "Modalidade excluída com sucesso!" });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}