import { NextResponse } from "next/server";
import conectDB from "@/app/lib/mongodb";
import PassagemVolta from "@/app/model/corrida_registro"; // Aquele model que criamos na Fase 2
import Bateria from "@/app/model/bateria";

export async function POST(request) {
  try {
    await conectDB();
    const corpo = await request.json();
    const { bateriaId, gridPilotos, tempoTotalCorrida } = corpo;

    if (!bateriaId) {
      return NextResponse.json({ error: "O ID da bateria é obrigatório." }, { status: 400 });
    }

    // 1. Limpa registros anteriores dessa bateria se você reiniciou ou re-salvou a corrida
    await PassagemVolta.deleteMany({ bateriaId });

    // 2. Prepara o lote de registros de voltas para inserção massiva (Bulk Insert)
    const registrosParaSalvar = [];

    gridPilotos.forEach(piloto => {
      piloto.voltas.forEach((tempoMs, index) => {
        registrosParaSalvar.push({
          bateriaId,
          competidorId: piloto.id,
          numeroPiloto: piloto.numero,
          nomePiloto: piloto.nome,
          numeroVolta: index + 1,
          tempoVoltaMs: tempoMs,
          timestampPassagem: Date.now(), // Registro histórico de auditoria
          origem: 'RFID' // Ou mapear dinamicamente se foi manual
        });
      });
    });

    if (registrosParaSalvar.length > 0) {
      await PassagemVolta.insertMany(registrosParaSalvar);
    }

    // 3. Atualiza o status da bateria para "Finalizada" e grava o tempo total dela
    await Bateria.findByIdAndUpdate(bateriaId, {
      status: 'Finalizada',
      horaFim: new Date()
    });

    return NextResponse.json({ success: true, message: "Resultado da corrida salvo com sucesso!" });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}