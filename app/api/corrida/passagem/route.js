import { NextResponse } from "next/server";
import conectDB from "@/app/lib/mongodb";
import Competidor from "@/app/model/piloto";

export async function POST(request) {
  try {
    await conectDB();
    const { tagRfid, origem } = await request.json();

    if (!tagRfid) {
      return NextResponse.json({ error: "Tag RFID não fornecida." }, { status: 400 });
    }

    // Busca qual piloto é o dono dessa tag/chip no banco
    const piloto = await Competidor.findOne({ tag: tagRfid });

    if (!piloto) {
      console.warn(`[Hardware] Tag desconhecida passou no pórtico: ${tagRfid}`);
      return NextResponse.json({ success: false, message: "Tag não vinculada a nenhum piloto." });
    }

    console.log(`[Pista] Passagem detectada para: ${piloto.nome} (Moto #${piloto.numero_piloto})`);

    // RETORNA OS DADOS DO PILOTO E A CONFIRMAÇÃO
    // O seu front-end (via WebSocket ou Server-Sent Events) vai escutar isso para atualizar a tabela na hora
    return NextResponse.json({
      success: true,
      pilotoId: piloto._id.toString(),
      numero: piloto.numero_piloto,
      nome: piloto.nome,
      tagRfid,
      origem
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}