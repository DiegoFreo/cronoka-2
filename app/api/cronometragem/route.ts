import { NextResponse } from 'next/server';
import { conectDB } from '@/app/lib/mongodb'; // Ajuste o caminho do seu arquivo de conexão
import { Antena, Piloto, Bateria, ResultadoCorrida } from '@/app/model/esquemas'; // Ajuste o caminho do seu arquivo de esquemas

export async function POST(request: Request) {
  try {
    await conectDB();

    // 1. Recebe a TAG (transponder) e o IP da antena que mandou a leitura
    const { transponder, ipAntena } = await request.json();

    if (!transponder) {
      return NextResponse.json({ error: 'Código do transponder não enviado.' }, { status: 400 });
    }

    // [Opcional] Atualiza o timestamp da última leitura na tabela de Antenas para sabermos que ela está viva
    if (ipAntena) {
      await Antena.updateOne({ ip: ipAntena }, { ultimaLeitura: new Date(), status: 'online' });
    }

    // 2. Busca a bateria que está rolando agora ("Na_Pista")
    // Se não tiver nenhuma bateria iniciada, ignora o bipe para não registrar voltas fora de hora
    const bateriaAtiva = await Bateria.findOne({ status: 'Na_Pista' });
    if (!bateriaAtiva) {
      return NextResponse.json({ message: 'Leitura ignorada: nenhuma bateria está com o status "Na_Pista".' }, { status: 200 });
    }

    // 3. Identifica quem é o piloto dono desse transponder neste evento específico
    const piloto = await Piloto.findOne({ 
      transponder: transponder.trim(),
      eventoId: bateriaAtiva.eventoId 
    }).populate('categoriasIds'); // Traz as categorias para sabermos o nome correto

    if (!piloto) {
      return NextResponse.json({ message: `Aviso: Transponder ${transponder} passou, mas não está vinculado a nenhum piloto deste evento.` }, { status: 200 });
    }

    // 4. Busca ou Cria o documento de resultado geral desta bateria
    let resultado = await ResultadoCorrida.findOne({ bateriaId: bateriaAtiva._id });
    
    if (!resultado) {
      resultado = new ResultadoCorrida({
        eventoId: bateriaAtiva.eventoId,
        bateriaId: bateriaAtiva._id,
        nomeBateria: bateriaAtiva.nome,
        tempoTotalProvaMs: 0,
        melhorVoltaDaProvaMs: 0,
        historicoVoltas: [],
        gridFinal: []
      });
    }

    // 5. Lógica de Tempo da Volta
    const agoraMs = Date.now();
    
    // Pegamos a última volta registrada na prova inteira para calcular o intervalo (tempo de volta)
    // Em um cenário real mais complexo, você pode rastrear a passagem anterior específica DESSE piloto
    const ultimaVoltaGeral = resultado.historicoVoltas.length > 0 
      ? resultado.historicoVoltas[resultado.historicoVoltas.length - 1] 
      : null;

    let tempoDestaVoltaMs = 0;
    if (ultimaVoltaGeral) {
      tempoDestaVoltaMs = agoraMs - ultimaVoltaGeral;
    } else {
      // Se for a primeiríssima passagem da prova (largada/primeira volta), conta o tempo desde a criação do resultado
      const inicioBateriaMs = new Date(resultado.createdAt || agoraMs).getTime();
      tempoDestaVoltaMs = agoraMs - inicioBateriaMs;
    }

    // Anti-Spam / Filtro de Linha de Chegada:
    // Evita registrar 2 voltas seguidas se a antena bipar a mesma tag duas vezes em menos de 10 segundos
    const pilotoNoGridIdx = resultado.gridFinal.findIndex((p: any) => p.pilotoId.toString() === piloto._id.toString());
    
    if (pilotoNoGridIdx !== -1) {
      const dadosAtuaisPiloto = resultado.gridFinal[pilotoNoGridIdx];
      // Se passou muito rápido (ex: menos de 8000ms), provavelmente é o mesmo bipe repetido na antena
      if (tempoDestaVoltaMs < 8000) { 
        return NextResponse.json({ message: 'Bipe duplicado/muito rápido ignorado para proteção.' });
      }
    }

    // Adiciona o timestamp absoluto no histórico geral de registros da prova
    resultado.historicoVoltas.push(agoraMs);

    // 6. Atualiza as estatísticas do Piloto no Grid Final
    const nomeCategoria = piloto.categoriasIds?.[0]?.nome || 'Sem Categoria';

    if (pilotoNoGridIdx === -1) {
      // Primeira volta do piloto na corrida! Adiciona ele no array
      resultado.gridFinal.push({
        pilotoId: piloto._id,
        nome: piloto.nome,
        numeral: piloto.numeral,
        categoriaNome: nomeCategoria,
        posicao: resultado.gridFinal.length + 1, // Provisório, vamos ordenar abaixo
        voltas: 1,
        tempoTotalMs: tempoDestaVoltaMs,
        melhorVoltaMs: tempoDestaVoltaMs,
        pontosGanhos: 0
      });
    } else {
      // Piloto já tinha voltas, vamos somar e atualizar
      const p = resultado.gridFinal[pilotoNoGridIdx];
      p.voltas += 1;
      p.tempoTotalMs += tempoDestaVoltaMs;
      
      if (p.melhorVoltaMs === 0 || tempoDestaVoltaMs < p.melhorVoltaMs) {
        p.melhorVoltaMs = tempoDestaVoltaMs;
      }
    }

    // 7. Reordenar o Grid (Quem tem MAIS voltas fica na frente. Se tiverem o mesmo número de voltas, quem terminou em MENOS tempo total fica na frente)
    resultado.gridFinal.sort((a: any, b: any) => {
      if (b.voltas !== a.voltas) {
        return b.voltas - a.voltas; // Mais voltas primeiro
      }
      return a.tempoTotalMs - b.tempoTotalMs; // Menor tempo primeiro
    });

    // Atualiza o index da posição de cada um após a ordenação
    resultado.gridFinal.forEach((piloto: any, index: number) => {
      piloto.posicao = index + 1;
    });

    // 8. Verifica se foi a melhor volta de toda a prova (Geral)
    if (resultado.melhorVoltaDaProvaMs === 0 || tempoDestaVoltaMs < resultado.melhorVoltaDaProvaMs) {
      resultado.melhorVoltaDaProvaMs = tempoDestaVoltaMs;
      resultado.idPilotoMelhorVolta = piloto._id;
    }

    // Salva tudo de forma atômica no MongoDB
    await resultado.save();

    return NextResponse.json({
      console: `✅ Volta computada para o piloto ${piloto.nome} (${piloto.numeral})! Tempo desta volta: ${(tempoDestaVoltaMs / 1000).toFixed(3)}s. Total de voltas: ${resultado.gridFinal.find((p: any) => p.pilotoId.toString() === piloto._id.toString())?.voltas}`,
      message: `Volta computada para o piloto ${piloto.nome} (${piloto.numeral})!`,
      posicaoAtual: resultado.gridFinal.find((p: any) => p.pilotoId.toString() === piloto._id.toString())?.posicao
    }, { status: 200 });

  } catch (error: any) {
    console.error('❌ Erro na cronometragem:', error);
    return NextResponse.json({ error: 'Erro interno ao processar passagem de tag.', detalhes: error.message }, { status: 500 });
  }
}