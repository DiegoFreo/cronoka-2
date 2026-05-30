// app/api/bateria/[id]/route.ts
import { NextResponse } from "next/server";
import conectDB from "@/app/lib/mongodb";
import Bateria from "@/app/model/bateria";
import Piloto from "@/app/model/piloto";

export async function GET( request, { params }) {
  try {
    await conectDB();
    
    // Aguarda o params resolver (necessário nas versões mais recentes do Next.js)
    const { id } = await params; 

    // 1. Busca a bateria e popula as categorias vinculadas a ela
    const bateria = await Bateria.findById(id).populate('categorias');
    if (!bateria) {
      return NextResponse.json({ error: "Bateria não encontrada" }, { status: 404 });
    }

    // Extrai os IDs das categorias desta bateria
    const idsCategoriasBateria = bateria.categorias.map((c) => c._id);

    // 2. Busca os pilotos que pertencem a QUALQUER uma dessas categorias
    const pilotosDaCorrida = await Piloto.find({
      categorias: { $in: idsCategoriasBateria }
    }).populate('categorias');

    // Retorna exatamente a estrutura que o Front-end espera
    return NextResponse.json({
      bateria,
      pilotos: pilotosDaCorrida
    });

  } catch (error) {
    console.error("Erro interno na API de bateria:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}