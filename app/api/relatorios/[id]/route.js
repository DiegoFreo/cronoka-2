import { NextResponse } from "next/server";
import conectDB from "@/app/lib/mongodb"; 
import Bateria from "@/app/model/bateria";
import CorridaRegistro from "@/app/model/corrida_registro"; 

export async function GET(request, { params }) {
  try {
    await conectDB();
    const resolvidoParams = await params;
    const id = resolvidoParams.id || resolvidoParams.bateriaId;

    if (!id) {
      return NextResponse.json({ error: "ID da bateria não fornecido." }, { status: 400 });
    }

    // 1. Busca todas as voltas gravadas para esta bateria
    const voltasRegistradas = await CorridaRegistro.find({ bateriaId: id }).sort({ numeroVolta: 1 });

    // 2. Se não houver nenhuma volta salva ainda para essa bateria, retorna um array vazio
    if (!voltasRegistradas || voltasRegistradas.length === 0) {
      return NextResponse.json([]);
    }

    // 3. Agrupa as voltas por piloto na memória
    const mapaPilotos = {};

    voltasRegistradas.forEach(registro => {
      const pilotoId = registro.competidorId.toString();

      if (!mapaPilotos[pilotoId]) {
        mapaPilotos[pilotoId] = {
          _id: pilotoId,
          numero: registro.numeroPiloto,
          nome: registro.nomePiloto,
          categoriaNome: "Competidor", // Opcional: buscar do registro se gravado
          voltas: []
        };
      }
      
      // Adiciona o tempo da volta ao array do piloto
      mapaPilotos[pilotoId].voltas.push(registro.tempoVoltaMs);
    });

    // Transforma o objeto agrupado de volta em um Array para o Front-end
    const resultadoFinal = Object.values(mapaPilotos);

    return NextResponse.json(resultadoFinal);
  } catch (error) {
    console.error("===> ERRO NA API DE RELATÓRIO:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}