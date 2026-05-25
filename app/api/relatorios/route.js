import { NextRequest, NextResponse } from "next/server";
import conectDB from '../../lib/mongodb';
// Importe seus models aqui (ex: Leitura, Piloto, Bateria)
// Supondo que você tenha um Model "Leitura" que grava: { tagId, timestamp, bateriaId }

export async function GET(request) {
  try {
    await conectDB();
    const { searchParams } = new URL(request.url);
    const bateriaId = searchParams.get("bateriaId");

    if (!bateriaId) {
      return NextResponse.json({ error: "bateriaId é obrigatório" }, { status: 400 });
    }

    // 1. Aqui você buscaria as leituras do banco de dados
    // const leituras = await Leitura.find({ bateriaId }).populate('pilotoId').sort({ timestamp: 1 });

    // SIMULAÇÃO DE DADOS PROCESSADOS PARA O SEU LAYOUT:
    // O servidor processa os milissegundos e monta o Grid final.
    const classificaçãoSimulada = [
      {
        posicao: 1,
        numero: "45",
        nome: "Mário Alexandre",
        voltas: 8,
        tempoTotal: "12:45.320",
        melhorVolta: "01:32.110",
        diferenca: "LÍDER"
      },
      {
        posicao: 2,
        numero: "12",
        nome: "Estevam Silva",
        voltas: 8,
        tempoTotal: "12:52.450",
        melhorVolta: "01:33.050",
        diferenca: "+7.130s"
      },
      {
        posicao: 3,
        numero: "99",
        nome: "Vini Costa",
        voltas: 8,
        tempoTotal: "13:05.110",
        melhorVolta: "01:35.420",
        diferenca: "+19.790s"
      },
      {
        posicao: 4,
        numero: "7",
        nome: "Léo Santos",
        voltas: 7,
        tempoTotal: "11:58.000",
        melhorVolta: "01:38.900",
        diferenca: "+1 Volta"
      }
    ];

    return NextResponse.json(classificaçãoSimulada);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}