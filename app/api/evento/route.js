import { NextResponse } from "next/server";
import conectDB from "@/app/lib/mongodb";
import Evento from "@/app/model/evento";
import Modalidade from "@/app/model/modalidade";

// 1. LISTAR ETAPAS (Filtrando por Modalidade/Campeonato)
export async function GET(request) {
  try {
    await conectDB();

    // Captura o ID da modalidade pela URL (Ex: /api/evento?modalidadeId=ID_DA_MODALIDADE)
    const { searchParams } = new URL(request.url);
    const modalidadeId = searchParams.get("modalidadeId");

    // Se passar o modalidadeId, filtra por ele. Se não passar, traz todas as etapas ativas.
    const filtro = modalidadeId ? { modalidade: modalidadeId } : {};

    const etapas = await Evento.find(filtro)
      .populate("modalidade", "nome") // Traz o nome da modalidade pai (ex: Motocross)
      .sort({ data: 1 }) // Organiza as etapas por data (as mais próximas primeiro)
      .lean(); // JSON puro para máxima velocidade

    return NextResponse.json(etapas);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Dentro do método POST da sua api/evento/route.js:
export async function POST(request) {
  try {
    await conectDB();
    const corpo = await request.json();
    // 💡 Adicione o "local" aqui na desestruturação
    const { nome, data, modalidade, status, local } = corpo;

    if (!nome) return NextResponse.json({ error: "O nome da etapa é obrigatório." }, { status: 400 });
    if (!data) return NextResponse.json({ error: "A data da etapa é obrigatória." }, { status: 400 });
    if (!modalidade) return NextResponse.json({ error: "O vínculo com a modalidade é obrigatório." }, { status: 400 });
    if (!local) return NextResponse.json({ error: "O local da etapa é obrigatório." }, { status: 400 }); // Validação técnica

    const novaEtapa = new Evento({
      nome: nome.trim(),
      data: new Date(data),
      modalidade,
      local: local.trim(), // 💡 Salva o local aqui
      status: status || "Pendente"
    });

    await novaEtapa.save();
    return NextResponse.json(novaEtapa, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// 3. EDITAR ETAPA (Para mudar status, nome ou data)
export async function PUT(request) {
  try {
    await conectDB();
    const corpo = await request.json();
    const { id, nome, data, status, modalidade } = corpo;

    if (!id) return NextResponse.json({ error: "O ID da etapa é obrigatório." }, { status: 400 });

    const dadosAtualizados = {};
    if (nome) dadosAtualizados.nome = nome.trim();
    if (data) dadosAtualizados.data = new Date(data);
    if (status) dadosAtualizados.status = status;
    if (modalidade) dadosAtualizados.modalidade = modalidade;

    const etapaModificada = await Evento.findByIdAndUpdate(id, dadosAtualizados, { new: true })
      .populate("modalidade", "nome");

    if (!etapaModificada) {
      return NextResponse.json({ error: "Etapa não encontrada." }, { status: 404 });
    }

    return NextResponse.json(etapaModificada);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// 4. EXCLUIR ETAPA
export async function DELETE(request) {
  try {
    await conectDB();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) return NextResponse.json({ error: "O ID da etapa é obrigatório." }, { status: 400 });

    const etapaDeletada = await Evento.findByIdAndDelete(id);
    if (!etapaDeletada) return NextResponse.json({ error: "Etapa não encontrada." }, { status: 404 });

    return NextResponse.json({ success: true, message: "Etapa excluída com sucesso!" });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}