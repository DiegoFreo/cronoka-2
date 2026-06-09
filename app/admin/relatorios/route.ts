import { NextRequest, NextResponse } from "next/server";
import conectDB from '@/app/lib/mongodb';
import mongoose, { models, model, Schema } from 'mongoose';

// Garante o mapeamento das coleções necessárias para o cruzamento
const Bateria = models.Bateria || model('Bateria', new Schema({}, { collection: 'baterias' }));
const Categoria = models.Categoria || model('Categoria', new Schema({}, { collection: 'categorias' }));
const Piloto = models.Piloto || model('Piloto', new Schema({}, { collection: 'pilotos' }));

export async function GET(request: NextRequest) {
  try {
    await conectDB();
    const { searchParams } = new URL(request.url);
    const bateriaId = searchParams.get('bateria');

    if (!bateriaId) {
      return NextResponse.json({ error: "O parâmetro 'bateria' é requerido." }, { status: 400 });
    }

    // 1. Busca a bateria para descobrir quais categorias correram nela
    const bateriaDoc = await Bateria.findById(bateriaId);
    if (!bateriaDoc) {
      return NextResponse.json({ error: "Bateria não localizada." }, { status: 404 });
    }

    // 2. Traz o nome textual de todas as categorias vinculadas a esse grid
    const categoriasDoGrid = await Categoria.find({ _id: { $in: bateriaDoc.categoriasIds } });

    // 3. Traz todos os pilotos cujas categorias batem com as do grid desta bateria
    const pilotosInscritos = await Piloto.find({ categoriaId: { $in: bateriaDoc.categoriasIds } });

    // 4. Monta a lista cruzando os dados e injetando o nome da categoria real de cada piloto
    const gridResultados = pilotosInscritos.map(piloto => {
      const catDoPiloto = categoriasDoGrid.find(c => c._id.toString() === piloto.categoriaId.toString());
      return {
        _id: piloto._id,
        nome: piloto.nome,
        numeral: piloto.numeral,
        transponder: piloto.transponder,
        categoriaNome: catDoPiloto ? catDoPiloto.nome : "Desconhecida"
      };
    });

    return NextResponse.json({
      bateria: {
        nome: bateriaDoc.nome,
        tempoProva: bateriaDoc.tempoProva,
        voltasExtras: bateriaDoc.voltasExtras
      },
      gridResultados
    }, { status: 200 });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}