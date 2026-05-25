import { NextResponse } from "next/server";
import conectDB from "../../../lib/mongodb";
import Tag from "../../../model/tag";
import * as XLSX from "xlsx";

// Força o Next.js a não processar o body automaticamente, liberando o FormData
export const config = {
  api: {
    bodyParser: false,
  },
};

export async function POST(request) {
  try {
    await conectDB();
    const formData = await request.formData();
    const file = formData.get("file");

    if (!file) {
      return NextResponse.json({ error: "Nenhum arquivo enviado para processamento." }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    let dadosParaProcessar = [];

    // 1. VERIFICA SE É EXCEL (.xlsx) OU CSV
    if (file.name.endsWith(".xlsx") || file.name.endsWith(".xls")) {
      // Lê a planilha binária do Excel
      const workbook = XLSX.read(buffer, { type: "buffer" });
      const primeiraAba = workbook.SheetNames[0];
      const planilha = workbook.Sheets[primeiraAba];
      
      // Converte a planilha em um Array de Objetos ou Matriz
      // Usamos header: 1 para retornar uma matriz de linhas e colunas [ [col1, col2], [col1, col2] ]
      const matrizDados = XLSX.utils.sheet_to_json(planilha, { header: 1 }) ;
      
      // Ignora a primeira linha (cabeçalho) e mapeia o resto
      dadosParaProcessar = matrizDados.slice(1).map(linha => ({
        num: String(linha[0] || "").trim(),
        tag: String(linha[1] || "").trim()
      }));
    } else {
      // Trata como CSV convencional caso você suba um futuramente
      const textoArquivo = buffer.toString("utf-8");
      const linhas = textoArquivo.split("\n");
      dadosParaProcessar = linhas.slice(1).map(linha => {
        const colunas = linha.split(",");
        return {
          num: colunas[0]?.trim(),
          tag: colunas[1]?.trim()
        };
      });
    }

    let importadas = 0;
    let duplicadas = 0;

    // 2. PROCESSA OS DADOS NO MONGO
    for (const item of dadosParaProcessar) {
      const numBruto = item.num;
      const tagBruta = item.tag;

      if (!numBruto || !tagBruta) continue;

      // Evita duplicidade usando o índice único do seu Schema
      const tagExiste = await Tag.findOne({ 
        $or: [{ tag: tagBruta }, { num: numBruto }] 
      });

      if (tagExiste) {
        duplicadas++;
      } else {
        const novaTag = new Tag({
          num: numBruto,
          tag: tagBruta,
          flag: false
        });
        await novaTag.save();
        importadas++;
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: `Processamento concluído! ${importadas} novos chips adicionados. ${duplicadas} registros duplicados foram ignorados.` 
    });

  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}