// app/api/reader/push/route.ts
import { NextResponse } from 'next/server';
import { zebraManager } from '@/app/lib/zebraReader';

/**
 * Função para extrair apenas o número principal da Tag
 * Exemplo: "000000000000111100053000" -> "53"
 */
function extractTagNumber(rawEpc: string): string {
  const cleanEpc = String(rawEpc).trim();

  // Opção 1: Se a tag SEMPRE terminar com '000', removemos os 3 últimos zeros 
  // e pegamos o número resultante eliminando os zeros à esquerda.
  if (cleanEpc.endsWith('000')) {
    const withoutSuffix = cleanEpc.slice(0, -3); // Remove o '000' do final
    
    // Expressão regular para pegar apenas o grupo final de dígitos do número
    const match = withoutSuffix.match(/(\d+)$/);
    if (match) {
      // Number("00053") vira 53 -> String(53) vira "53"
      return String(Number(match[1])); 
    }
  }

  // Opção 2 (Fallback): Remove todos os zeros à esquerda e sulfixos caso o padrão mude
  const numericMatch = cleanEpc.match(/0*(\d+?)0*$/);
  if (numericMatch && numericMatch[1]) {
    return String(Number(numericMatch[1]));
  }

  return cleanEpc; // Retorna original se não casar com nenhum padrão
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // A Zebra envia os dados no body da requisição
    const rawEpc = body.epc || body.tagId || body.data;

    if (rawEpc) {
      // Processa e extrai apenas o numeral (ex: "53")
      const parsedEpc = extractTagNumber(rawEpc);

      zebraManager.emit('tag', {
        epc: parsedEpc,
        rawEpc: String(rawEpc).toUpperCase(), // Dica: mantém o EPC bruto salvo caso precise futuramente
        timestamp: new Date().toLocaleString('pt-BR'),
      });
    }

    return NextResponse.json({ status: 'ok' }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: 'Payload inválido' }, { status: 400 });
  }
}