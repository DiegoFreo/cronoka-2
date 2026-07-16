import { NextResponse } from 'next/server';
import { ResultadoCorrida, Bateria } from '@/app/model/esquemas'; 
import mongoose from 'mongoose';

// Função auxiliar para garantir a conexão com o banco de dados
async function conectarBanco() {
  if (mongoose.connection.readyState >= 1) return;
  if (process.env.MONGODB_URI) {
    await mongoose.connect(process.env.MONGODB_URI);
  }
}

// 🌟 ATUALIZADO: Suporta busca por ID, bateriaId (Live-Timing) ou filtro por evento
export async function GET(request: Request) {
  try {
    await conectarBanco();
    
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const bateriaId = searchParams.get('bateriaId');

    // 1. Busca por ID específico (Ex: Tela de Relatórios)
    if (id) {
      const resultado = await ResultadoCorrida.findById(id);
      if (!resultado) {
        return NextResponse.json({ error: 'Relatório de corrida não encontrado.' }, { status: 404 });
      }
      return NextResponse.json(resultado, { status: 200 });
    }

    // 2. 🚀 NOVO: Busca por bateriaId (Chamado pelo Polling de 1.5s da Tela de Corrida)
    if (bateriaId) {
      const resultadoLive = await ResultadoCorrida.findOne({ bateriaId });
      
      // Se a prova começou mas nenhum piloto cruzou a linha ainda, evita erro 404 na tela
      if (!resultadoLive) {
        return NextResponse.json({
          bateriaId,
          melhorVoltaDaProvaMs: 0,
          idPilotoMelhorVolta: null,
          gridFinal: []
        }, { status: 200 });
      }
      
      return NextResponse.json(resultadoLive, { status: 200 });
    }

    // 3. Busca genérica / Filtro por evento
    const eventoId = searchParams.get('eventoId');
    const filtro = eventoId ? { eventoId } : {};
    
    const resultados = await ResultadoCorrida.find(filtro).sort({ createdAt: -1 });
    return NextResponse.json(resultados, { status: 200 });

  } catch (error: any) {
    console.error('Erro na API ao buscar resultado:', error);
    return NextResponse.json({ error: 'Erro interno ao buscar dados.', detalhes: error.message }, { status: 500 });
  }
}

// 🌟 ATUALIZADO: Usa findOneAndUpdate com upsert para evitar duplicidade com as antenas rfid
export async function POST(request: Request) {
  try {
    await conectarBanco();
    const body = await request.json();

    const { 
      eventoId, 
      bateriaId, 
      nomeBateria, 
      tempoTotalProvaMs, 
      melhorVoltaDaProvaMs, 
      idPilotoMelhorVolta, 
      gridFinal 
    } = body;

    if (!eventoId || !bateriaId || !gridFinal || !Array.isArray(gridFinal)) {
      return NextResponse.json({ error: 'Dados insuficientes para salvar o resultado.' }, { status: 400 });
    }

    // 🔄 Em vez de .create(), fazemos um "save ou update" atômico baseado na bateriaId
    const resultadoConsolidado = await ResultadoCorrida.findOneAndUpdate(
      { bateriaId },
      {
        $set: {
          eventoId,
          nomeBateria,
          tempoTotalProvaMs,
          melhorVoltaDaProvaMs,
          idPilotoMelhorVolta: idPilotoMelhorVolta || null,
          gridFinal
        }
      },
      { new: true, upsert: true } // Se já existir o live-timing criado pela antena, ele substitui/salva o final. Se não, cria do zero.
    );

    // Mantém a sua regra original de fechar o status da bateria no banco
    await Bateria.findByIdAndUpdate(bateriaId, { status: 'Finalizada' });

    return NextResponse.json({ 
      success: true, 
      message: 'Corrida finalizada e gravada com sucesso!', 
      resultadoId: resultadoConsolidado._id 
    }, { status: 201 });

  } catch (error: any) {
    console.error('Erro na API ao salvar resultado:', error);
    return NextResponse.json({ error: 'Erro interno no servidor.', detalhes: error.message }, { status: 500 });
  }
}

// 2. ATUALIZAR UM RELATÓRIO EXISTENTE (Mantido exatamente como o seu original)
export async function PUT(request: Request) {
  try {
    await conectarBanco();
    const body = await request.json();

    const { resultadoId, gridFinal, nomeBateria, tempoTotalProvaMs, melhorVoltaDaProvaMs, idPilotoMelhorVolta } = body;

    if (!resultadoId || !gridFinal || !Array.isArray(gridFinal)) {
      return NextResponse.json({ error: 'Id do resultado e grid final são obrigatórios para edição.' }, { status: 400 });
    }

    const resultadoAtualizado = await ResultadoCorrida.findByIdAndUpdate(
      resultadoId,
      {
        $set: {
          gridFinal,
          ...(nomeBateria && { nomeBateria }),
          ...(tempoTotalProvaMs !== undefined && { tempoTotalProvaMs }),
          ...(melhorVoltaDaProvaMs !== undefined && { melhorVoltaDaProvaMs }),
          ...(idPilotoMelhorVolta !== undefined && { idPilotoMelhorVolta })
        }
      },
      { new: true }
    );

    if (!resultadoAtualizado) {
      return NextResponse.json({ error: 'Relatório não encontrado.' }, { status: 404 });
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Relatório de corrida alterado com sucesso!', 
      data: resultadoAtualizado 
    }, { status: 200 });

  } catch (error: any) {
    console.error('Erro na API ao editar resultado:', error);
    return NextResponse.json({ error: 'Erro interno ao salvar edição.', detalhes: error.message }, { status: 500 });
  }
}