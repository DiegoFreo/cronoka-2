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

export async function GET(request: Request) {
  try {
    await conectarBanco();
    
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const bateriaId = searchParams.get('bateriaId');

    // 1. Busca por ID do Resultado OU por bateriaId vindo pelo parâmetro 'id' (Tela de Relatórios)
    if (id) {
      let resultado = null;

      // Tenta buscar por _id do Resultado (caso seja um ObjectId válido)
      if (mongoose.Types.ObjectId.isValid(id)) {
        resultado = await ResultadoCorrida.findById(id);
      }

      // Se não encontrou por _id, tenta buscar considerando que o 'id' passado é o 'bateriaId'
      if (!resultado) {
        resultado = await ResultadoCorrida.findOne({ bateriaId: id });
      }

      if (!resultado) {
        return NextResponse.json({ error: 'Relatório de corrida não encontrado.' }, { status: 404 });
      }
      return NextResponse.json(resultado, { status: 200 });
    }

    // 2. Busca por bateriaId direto (Chamado pelo Polling de 1.5s da Tela de Corrida)
    if (bateriaId) {
      const resultadoLive = await ResultadoCorrida.findOne({ bateriaId });
      
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

    // 1. Higienização e adequação dos tipos no gridFinal
    const gridFinalTratado = gridFinal.map((piloto: any) => {
      const pTratado = { ...piloto };

      // Se o Schema esperar historicoVoltas como objetos em vez de numbers simples:
      if (Array.isArray(pTratado.historicoVoltas)) {
        pTratado.historicoVoltas = pTratado.historicoVoltas.map((item: any, index: number) => {
          if (typeof item === 'number') {
            return { volta: index + 1, tempoMs: item }; // Converte number para Object se necessário
          }
          return item;
        });
      }
      
      // Limpa categoriaId vazia
      if (!pTratado.categoriaId || pTratado.categoriaId === "") {
        delete pTratado.categoriaId;
      } else {
        pTratado.categoriaId = String(pTratado.categoriaId);
      }

      if (pTratado.pilotoId) {
        pTratado.pilotoId = String(pTratado.pilotoId);
      }

      return pTratado;
    });

    // 2. Trata o ID da melhor volta
    const melhorVoltaPilotoId = (idPilotoMelhorVolta && mongoose.Types.ObjectId.isValid(idPilotoMelhorVolta))
      ? String(idPilotoMelhorVolta)
      : null;

    // 3. Upsert no Resultado com returnDocument: 'after' (sem warnings)
    const resultadoConsolidado = await ResultadoCorrida.findOneAndUpdate(
      { bateriaId: String(bateriaId) },
      {
        $set: {
          eventoId: String(eventoId),
          nomeBateria: String(nomeBateria),
          tempoTotalProvaMs: Number(tempoTotalProvaMs) || 0,
          melhorVoltaDaProvaMs: Number(melhorVoltaDaProvaMs) || 0,
          idPilotoMelhorVolta: melhorVoltaPilotoId,
          gridFinal: gridFinalTratado
        }
      },
      { returnDocument: 'after', upsert: true }
    );

    // 4. Atualiza o status da bateria
    if (mongoose.Types.ObjectId.isValid(bateriaId)) {
      await Bateria.findByIdAndUpdate(bateriaId, { status: 'Finalizada' });
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Corrida finalizada e gravada com sucesso!', 
      resultadoId: resultadoConsolidado._id 
    }, { status: 201 });

  } catch (error: any) {
    console.error('Erro detalhado no POST /api/resultados:', error);
    
    return NextResponse.json({ 
      error: 'Erro interno no servidor.', 
      detalhes: error.message 
    }, { status: 500 });
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