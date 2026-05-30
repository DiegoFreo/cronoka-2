import { NextResponse } from "next/server";
import conectDB from "@/app/lib/mongodb";
import Bateria from "@/app/model/bateria";
import Evento from "@/app/model/evento";

// 1. LISTAR BATERIAS (Otimizado com filtro por Evento e projeção de dados)
export async function GET(request) {
  try {
    await conectDB();

    // 💡 Captura o ID do evento pela URL (Ex: /api/bateria?eventoId=123)
    const { searchParams } = new URL(request.url);
    const eventoId = searchParams.get("eventoId");

    // Monta o filtro: Se passar o eventoId na URL, traz só as baterias dele. 
    // Se não passar, traz apenas as pendentes/em andamento para não sobrecarregar.
    const filtro = eventoId ? { evento: eventoId } : { status: { $ne: 'Finalizada' } };

    const baterias = await Bateria.find(filtro)
      // Otimização: Traz apenas campos necessários do evento e categorias para economizar banda
      .populate('categorias', 'nome cor') 
      .populate('evento', 'nome data status')
      .sort({ ordem: 1 })
      .lean(); // 💡 O .lean() faz o Mongoose retornar JSON puro, acelerando a busca em até 4x

    return NextResponse.json(baterias);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// 2. CADASTRAR NOVA BATERIA
export async function POST(request) {
  try {
    await conectDB();
    const corpo = await request.json();
    const { nome, categorias, ordem, evento } = corpo;

    if (!nome) return NextResponse.json({ error: "O nome da bateria é obrigatório." }, { status: 400 });
    if (!categorias || categorias.length === 0) return NextResponse.json({ error: "Selecione ao menos uma categoria." }, { status: 400 });
    if (!evento) return NextResponse.json({ error: "O evento vinculado é obrigatório." }, { status: 400 });

    const novaBateria = new Bateria({
      nome: nome.trim(),
      categorias,
      evento,
      ordem: ordem || 0
    });

    await novaBateria.save();
    return NextResponse.json(novaBateria, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// 3. EDITAR BATERIA
export async function PUT(request) {
  try {
    await conectDB();
    const corpo = await request.json();
    const { id, nome, categorias, ordem, status, evento } = corpo;

    if (!id) return NextResponse.json({ error: "O ID da bateria é obrigatório." }, { status: 400 });

    const bateriaAnterior = await Bateria.findById(id);
    if (!bateriaAnterior) return NextResponse.json({ error: "Bateria não encontrada." }, { status: 404 });

    const dadosAtualizados = {};
    if (nome) dadosAtualizados.nome = nome.trim();
    if (categorias) dadosAtualizados.categorias = categorias;
    if (evento) dadosAtualizados.evento = evento;
    if (ordem !== undefined) dadosAtualizados.ordem = ordem;
    if (status) dadosAtualizados.status = status;

    if (status === 'Em Andamento' && !bateriaAnterior.horaInicio) dadosAtualizados.horaInicio = new Date();
    if (status === 'Finalizada' && !bateriaAnterior.horaFim) dadosAtualizados.horaFim = new Date();
    if (status === 'Pendente') { dadosAtualizados.horaInicio = null; dadosAtualizados.horaFim = null; }

    const bateriaModificada = await Bateria.findByIdAndUpdate(id, dadosAtualizados, { new: true })
      .populate('categorias', 'nome cor')
      .populate('evento', 'nome data status');

    return NextResponse.json(bateriaModificada);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// 4. EXCLUIR BATERIA
export async function DELETE(request) {
  try {
    await conectDB();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) return NextResponse.json({ error: "O ID da bateria é obrigatório." }, { status: 400 });

    const bateriaDeletada = await Bateria.findByIdAndDelete(id);
    if (!bateriaDeletada) return NextResponse.json({ error: "Bateria não encontrada." }, { status: 404 });

    return NextResponse.json({ success: true, message: "Bateria excluída com sucesso!" });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}