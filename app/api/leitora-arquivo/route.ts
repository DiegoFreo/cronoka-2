// app/api/leitora-arquivo/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { zebraManager, TagData } from '@/app/lib/zebraReader';

let bufferTagsRecentes: { tag: string; tagCompleta: string; timestampMs: number }[] = [];
const MAX_BUFFER_SIZE = 1000; // Limite de segurança contra estouro de memória

if (!(global as any).hasZebraListener) {
  zebraManager.on('tag', (tagData: TagData) => {
    // Evita estourar a memória do Node se ninguém consumir a API
    if (bufferTagsRecentes.length >= MAX_BUFFER_SIZE) {
      bufferTagsRecentes.shift(); // Remove a leitura mais antiga
    }

    bufferTagsRecentes.push({
      tag: tagData.epc,
      tagCompleta: tagData.epc,
      timestampMs: Date.now()
    });
  });
  (global as any).hasZebraListener = true;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const acao = searchParams.get('acao');

    if (acao === 'start') {
      // Executa sem travar o Response da API
      zebraManager.startReading().catch(console.error);
      return NextResponse.json({ status: 'Comando de leitura enviado para a Zebra' });
    }

    if (acao === 'stop') {
      await zebraManager.stopReading();
      return NextResponse.json({ status: 'Leitura parada' });
    }

    if (acao === 'clearHistory') {
      zebraManager.clearHistory();
      return NextResponse.json({ status: 'Histórico de cooldown zerado' });
    }

    // Retorna e drena a fila acumulada
    const tagsParaEnviar = [...bufferTagsRecentes];
    bufferTagsRecentes = []; 

    return NextResponse.json({ tagsRecentes: tagsParaEnviar });

  } catch (error: any) {
    console.error("Erro na API da leitora Zebra LLRP:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
