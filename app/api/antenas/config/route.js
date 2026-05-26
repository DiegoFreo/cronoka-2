import { NextResponse } from "next/server";
import conectDB from "@/app/lib/mongodb";
import Bateria from "@/app/model/bateria"; // Vamos atrelar a config à bateria ativa

export async function POST(request) {
  try {
    await conectDB();
    const corpo = await request.json();
    const { bateriaId, ipLeitor, portaLeitor, potenciaDbm, antenasAtivas } = corpo;

    if (!bateriaId) {
      return NextResponse.json({ error: "ID da Bateria é obrigatório." }, { status: 400 });
    }

    // Atualiza a bateria com as configurações de hardware para aquela prova
    const bateriaAtualizada = await Bateria.findByIdAndUpdate(
      bateriaId,
      {
        configHardware: {
          ipLeitor,
          portaLeitor: Number(portaLeitor),
          potenciaDbm: Number(potenciaDbm),
          antenasAtivas, // Array de booleans ou números [true, true, false, false]
          atualizadoEm: new Date()
        }
      },
      { new: true }
    );

    return NextResponse.json({ success: true, hardware: bateriaAtualizada.configHardware });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}