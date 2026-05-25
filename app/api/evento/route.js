import { NextResponse } from "next/server";
import conectDB from "../../lib/mongodb";
import Evento from "../../model/evento";

// 1. LISTAR EVENTOS
export async function GET() {
  try {
    await conectDB();
    const eventos = await Evento.find().sort({ data: -1 }); // Eventos mais recentes primeiro
    return NextResponse.json(eventos);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// 2. CADASTRAR EVENTO
export async function POST(request) {
  try {
    await conectDB();
    const corpo = await request.json();
    const { nome, data, local } = corpo;

    if (!nome || !data || !local) {
      return NextResponse.json({ error: "Todos os campos obrigatórios (*) devem ser preenchidos." }, { status: 400 });
    }

    const novoEvento = new Evento({
      nome: nome.trim(),
      data: new Date(data),
      local: local.trim(),
      status: 'Pendente'
    });

    await novoEvento.save();
    return NextResponse.json(novoEvento, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// 3. EDITAR EVENTO
export async function PUT(request) {
  try {
    await conectDB();
    const corpo = await request.json();
    const { id, nome, data, local, status } = corpo;

    if (!id) {
      return NextResponse.json({ error: "O ID do evento é obrigatório para edição." }, { status: 400 });
    }

    const eventoAtualizado = await Evento.findByIdAndUpdate(
      id,
      {
        nome: nome?.trim(),
        data: data ? new Date(data) : undefined,
        local: local?.trim(),
        status
      },
      { new: true }
    );

    if (!eventoAtualizado) {
      return NextResponse.json({ error: "Evento não encontrado." }, { status: 404 });
    }

    return NextResponse.json(eventoAtualizado);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// 4. EXCLUIR EVENTO
export async function DELETE(request) {
  try {
    await conectDB();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "O ID do evento é obrigatório." }, { status: 400 });
    }

    const eventoDeletada = await Evento.findByIdAndDelete(id);
    if (!eventoDeletada) {
      return NextResponse.json({ error: "Evento não encontrado." }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: "Evento excluído com sucesso!" });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}