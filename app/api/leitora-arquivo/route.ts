import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

let ultimaPosicaoLida = 0;
let caminhoAtual = '';

// Função para separar a tag do horário e extrair o número exato
function processarLinhaTag(linhaBruta: string) {
  const regexHorario = /(\d{2}:\d{2}:\d{2}\.\d+)/;
  const matchHorario = linhaBruta.match(regexHorario);
  
  const horarioTexto = matchHorario ? matchHorario[1] : null;
  const tagApenas = linhaBruta.replace(regexHorario, '').trim();

  // Converte o horário do log (HH:mm:ss.SSS) para timestamp em milissegundos do dia atual
  let timestampLeituraMs = Date.now();

  if (horarioTexto) {
    const [horas, minutos, segundosComMilis] = horarioTexto.split(':');
    const [segundos, milis] = segundosComMilis.split('.');

    const agora = new Date();
    agora.setHours(parseInt(horas, 10), parseInt(minutos, 10), parseInt(segundos, 10), parseInt(milis, 10));
    timestampLeituraMs = agora.getTime();
  }

  // Extração da tag
  const matchNumero = tagApenas.match(/1111000(\d+?)0*$/);
  let numeroFormatado = tagApenas;

  if (matchNumero) {
    numeroFormatado = parseInt(matchNumero[1], 10).toString();
  } else {
    const matchGenerico = tagApenas.match(/([1-9]\d*?)0*$/);
    if (matchGenerico) numeroFormatado = matchGenerico[1];
  }

  return {
    tagCompleta: tagApenas,
    tag: numeroFormatado,
    timestampMs: timestampLeituraMs // 👈 Timestamp real de quando a foto/antena registrou!
  };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const caminho = searchParams.get('caminho');

    if (!caminho) {
      return NextResponse.json({ error: 'Caminho do arquivo não informado.' }, { status: 400 });
    }

    const caminhoAbsoluto = path.normalize(caminho);

    if (!fs.existsSync(caminhoAbsoluto)) {
      return NextResponse.json({ 
        error: `Arquivo não encontrado no caminho: ${caminhoAbsoluto}` 
      }, { status: 404 });
    }

    if (caminhoAtual !== caminhoAbsoluto) {
      caminhoAtual = caminhoAbsoluto;
      ultimaPosicaoLida = 0;
    }

    const stats = fs.statSync(caminhoAbsoluto);
    const tamanhoArquivo = stats.size;

    if (tamanhoArquivo < ultimaPosicaoLida) {
      ultimaPosicaoLida = 0;
    }

    if (tamanhoArquivo === ultimaPosicaoLida) {
      return NextResponse.json({ tagsRecentes: [], totalLido: 0 });
    }

    const stream = fs.createReadStream(caminhoAbsoluto, {
      start: ultimaPosicaoLida,
      end: tamanhoArquivo,
      encoding: 'utf-8'
    });

    let novosDados = '';
    for await (const chunk of stream) {
      novosDados += chunk;
    }

    ultimaPosicaoLida = tamanhoArquivo;

    const linhas = novosDados.split(/\r?\n/).filter((linha) => linha.trim() !== '');

    // Processa cada linha separando a tag do timestamp e limpando o número
    const tagsRecentes = linhas.map((linha) => processarLinhaTag(linha));

    return NextResponse.json({
      tagsRecentes,
      totalLido: linhas.length
    });

  } catch (error: any) {
    console.error('Erro ao ler arquivo de log:', error);
    return NextResponse.json({ error: 'Falha ao ler arquivo local.', details: error.message }, { status: 500 });
  }
}