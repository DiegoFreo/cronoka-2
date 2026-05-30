import { NextResponse } from "next/server";
import conectDB from '../../lib/mongodb';
import Piloto from '../../model/piloto';
import Categoria from '../../model/categoria';
import Tag from "@/app/model/tag";

// Auxiliar para quebrar o texto da planilha "MX1; MX2" em uma lista de IDs do banco
async function mapearCategoriasPorTexto(texto) {
  if (!texto) return [];
  const nomes = texto.split(';').map(c => c.trim()).filter(c => c !== '');
  const mapeadosIds = [];

  for (const nome of nomes) {
    const catBco = await Categoria.findOne({ nome: { $regex: new RegExp(`^${nome}$`, "i") } });
    if (catBco) {
      mapeadosIds.push(catBco._id);
    }
  }
  return mapeadosIds;
}

// CADASTRAR / IMPORTAR
export async function POST(request) {
  try {
    await conectDB();
    const corpo = await request.json();

    // FLUXO: Planilha em Lote
    if (corpo.lote && Array.isArray(corpo.lote)) {
      const resultadosInseridos = [];

      for (const item of corpo.lote) {
        const { numero_piloto, nome, tagId, categoriaTexto, patrocinador } = item;
        if (!nome || !numero_piloto) continue;

        // Mapeia todas as categorias da célula separadas por ";"
        const idsCategorias = await mapearCategoriasPorTexto(categoriaTexto);
        if (idsCategorias.length === 0) {
          // Se não achou nenhuma, vincula a primeira cadastrada apenas para não ficar vazio
          const padrão = await Categoria.findOne();
          if (padrão) idsCategorias.push(padrão._id);
        }

        if (tagId) {
          const tagExiste = await Piloto.findOne({ tagId });
          if (tagExiste) continue; 
        }
        const numeroExiste = await Piloto.findOne({ numero_piloto: Number(numero_piloto) });
        if (numeroExiste) continue;

        const novoP = new Piloto({
          nome: nome.trim().toUpperCase(),
          numero_piloto: Number(numero_piloto),
          tagId: tagId ? tagId.trim().toUpperCase() : `SEM-TAG-${Date.now()}-${Math.random()}`,
          categorias: idsCategorias,
          patrocinador: patrocinador || ""
        });

        await novoP.save();
        if (tagId) await Tag.findOneAndUpdate({ num: tagId }, { flag: true });
        resultadosInseridos.push(novoP);
      }

      return NextResponse.json({ success: true, count: resultadosInseridos.length }, { status: 201 });
    }

    // FLUXO: Cadastro Manual Individual
    const { numero_piloto, nome, tagId, categorias, patrocinador } = corpo;

    if (!tagId) return NextResponse.json({ error: "O código do Chip é obrigatório." }, { status: 400 });
    if (!categorias || categorias.length === 0) return NextResponse.json({ error: "Selecione ao menos uma categoria." }, { status: 400 });

    const tagOcupada = await Piloto.findOne({ tagId: tagId.trim().toUpperCase() });
    if (tagOcupada) return NextResponse.json({ error: "Este chip já está atribuído a outro competidor!" }, { status: 400 });

    const numeroOcupado = await Piloto.findOne({ numero_piloto: Number(numero_piloto) });
    if (numeroOcupado) return NextResponse.json({ error: "Este número de piloto já está em uso!" }, { status: 400 });

    const novoCompetidor = new Piloto({
      numero_piloto: Number(numero_piloto),
      nome: nome.trim().toUpperCase(),
      tagId: tagId.trim().toUpperCase(), 
      categorias, // Salva o array de IDs
      patrocinador: patrocinador || ""
    });
    
    await novoCompetidor.save();
    await Tag.findOneAndUpdate({ num: tagId.trim().toUpperCase() }, { flag: true });

    return NextResponse.json(novoCompetidor, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// LISTAR
export async function GET() {
  try {
    await conectDB();
    const pilotos = await Piloto.find().populate('categorias', 'nome cor'); 
    return NextResponse.json(pilotos);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 }); 
  }
}

// EDITAR
export async function PUT(request) {
  try {
    await conectDB();
    const corpo = await request.json();
    const { id, numero_piloto, nome, tagId, categorias, patrocinador } = corpo;

    const pilotoAntigo = await Piloto.findById(id);
    if (!pilotoAntigo) return NextResponse.json({ error: "Piloto não encontrado" }, { status: 404 });

    if (tagId && tagId.toUpperCase() !== pilotoAntigo.tagId.toUpperCase()) {
      const tagOcupada = await Piloto.findOne({ tagId: tagId.trim().toUpperCase() });
      if (tagOcupada) return NextResponse.json({ error: "O novo chip já está ocupado!" }, { status: 400 });
    }

    const pilotoAtualizado = await Piloto.findByIdAndUpdate(
      id,
      { 
        numero_piloto: Number(numero_piloto), 
        nome: nome.trim().toUpperCase(), 
        tagId: tagId.trim().toUpperCase(), 
        categorias, // atualiza o array inteiro
        patrocinador 
      },
      { new: true }
    );

    if (pilotoAntigo.tagId.toUpperCase() !== tagId.toUpperCase()) {
      await Tag.findOneAndUpdate({ num: pilotoAntigo.tagId }, { flag: false });
      await Tag.findOneAndUpdate({ num: tagId }, { flag: true });
    }

    return NextResponse.json(pilotoAtualizado);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETAR (Permanece igual)
export async function DELETE(request) {
  try {
    await conectDB();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const piloto = await Piloto.findById(id);
    if (!piloto) return NextResponse.json({ error: "Piloto não encontrado" }, { status: 404 });

    if (piloto.tagId) await Tag.findOneAndUpdate({ num: piloto.tagId }, { flag: false });
    await Piloto.findByIdAndDelete(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}