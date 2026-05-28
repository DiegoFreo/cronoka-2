import { NextResponse } from "next/server";
import conectDB from '../../lib/mongodb';
import Piloto from '../../model/piloto';
import Categoria from '../../model/categoria';
import Tag from "@/app/model/tag";
import { criarPiloto, listarPilotos, atualizarPiloto, deletarPiloto } from  '../../controller/pilotoController';

// Função auxiliar para quebrar o texto da planilha "FPMX 1; FPMX 2" em uma lista limpa
const obterNomesCategorias = (texto) => {
  if (!texto) return [];
  return texto
    .split(';')
    .map(cat => cat.trim())
    .filter(cat => cat !== '');
};

// CADASTRAR COMPETIDOR
export async function POST(request) {
  try {
    await conectDB();
    const corpo = await request.json();
    // Captura tagId se o front enviar como tagId, e joga para a variável tag
    const { numero_piloto, nome, tag: tagDireta, tagId, categorias } = corpo;
    const tag = tagDireta || tagId; 

    // 1. Valida se a tag escolhida já não está ocupada por outro piloto
    if (tag) {
      const tagOcupada = await Tag.findOne({ num: tag, flag: true });
      if (tagOcupada) {
        return NextResponse.json({ error: "Este chip (Tag) já está atribuído a outro competidor!" }, { status: 400 });
      }
    }

    const novoCompetidor = new Piloto({
      numero_piloto,
      nome,
      tag, // Agora salva corretamente no banco de dados
      categorias
    });
    await novoCompetidor.save();

    // 2. SE deu certo, marca a tag como Ocupada (flag: true)
    if (tag) {
      await Tag.findOneAndUpdate({ num: tag }, { flag: true });
    }

    return NextResponse.json(novoCompetidor, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET() {
  try {
    await conectDB();
    const pilotos = await Piloto.find().populate('categorias'); // Popula apenas o campo 'nome' das categorias relacionadas
    return NextResponse.json(pilotos); // ✅ retorno obrigatório
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 }); // ✅ retorno no erro também
  }
}

// EDITAR COMPETIDOR
export async function PUT(request) {
  try {
    await conectDB();
    const corpo = await request.json();
    const { id, numero_piloto, nome, tag: tagDireta, tagId, categorias } = corpo;
    const tag = tagDireta || tagId;

    // 1. Busca o piloto antes da alteração para saber se ele tinha uma tag antiga
    const pilotoAntigo = await Piloto.findById(id);
    if (!pilotoAntigo) return NextResponse.json({ error: "Piloto não encontrado" }, { status: 404 });

    // 2. Se a tag mudou, verifica se a nova tag já está sendo usada por outra pessoa
    if (tag && tag !== pilotoAntigo.tag) {
      const tagOcupada = await Tag.findOne({ tag: tag, flag: true });
      if (tagOcupada) {
        return NextResponse.json({ error: "O novo chip escolhido já está ocupado por outro piloto!" }, { status: 400 });
      }
    }

    // 3. Atualiza o piloto
    const pilotoAtualizado = await Piloto.findByIdAndUpdate(
      id,
      { numero_piloto, nome, tag, categorias },
      { new: true }
    );

    // 4. LÓGICA DE LIBERAÇÃO/OCUPAÇÃO DE CHIPS
    if (pilotoAntigo.tag !== tag) {
      // Se ele tinha tag antiga, libera ela (flag: false)
      if (pilotoAntigo.tag) {
        await Tag.findOneAndUpdate({ tag: pilotoAntigo.tag }, { flag: false });
      }
      // Ocupa a nova tag (flag: true)
      if (tag) {
        await Tag.findOneAndUpdate({ tag: tag }, { flag: true });
      }
    }

    return NextResponse.json(pilotoAtualizado);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// EXCLUIR COMPETIDOR
export async function DELETE(request) {
  try {
    await conectDB();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    const piloto = await Piloto.findById(id);
    if (!piloto) return NextResponse.json({ error: "Piloto não encontrado" }, { status: 404 });

    /* Se o piloto que vai ser deletado usava um chip, libera o chip!
    if (piloto.tag) {
      await Tag.findOneAndUpdate({ tag: piloto.tag }, { flag: false });
    }
      */

    await Piloto.findByIdAndDelete(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}