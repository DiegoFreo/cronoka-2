import { NextResponse } from 'next/server';
import { conectDB } from '@/app/lib/mongodb'; 
import { Bateria } from '@/app/model/esquemas'; 
import mongoose from 'mongoose';

// ==========================================
// METODO POST: CRIAR BATERIA
// ==========================================
export async function POST(request: Request) {
  try {
    await conectDB();
    const body = await request.json();
    const { nome, tempoProva, voltasExtras, categoriaId, eventoId } = body;

    if (!categoriaId || !Array.isArray(categoriaId) || categoriaId.length === 0) {
      return NextResponse.json({ error: 'É necessário selecionar ao menos uma categoria.' }, { status: 400 });
    }

    const dadosParaSalvar = {
      nome: nome ? nome.trim().toUpperCase() : '',
      tempoProva: Number(tempoProva) || 15,
      voltasExtras: Number(voltasExtras) || 2,
      categoriaId: categoriaId,
      eventoId: eventoId
    };

    const novaBateria = await Bateria.create(dadosParaSalvar);
    return NextResponse.json(novaBateria, { status: 201 });
  } catch (error: any) {
    console.error('❌ ERRO DETALHADO AO SALVAR BATERIA:', error);
    return NextResponse.json({ error: 'Erro interno no servidor.', detalhes: error.message }, { status: 500 });
  }
}

// ==========================================
// METODO GET: LISTAR BATERIAS / RELATÓRIOS
// ==========================================
export async function GET(request: Request) {
  try {
    await conectDB();
    const { searchParams } = new URL(request.url);
    const eventoId = searchParams.get('evento');

    if (eventoId) {
      const baterias = await Bateria.find({ eventoId })
        .sort({ createdAt: 1 })
        .populate('categoriaId');
      
      return NextResponse.json(baterias, { status: 200 });
    }

    const bateriasFinalizadas = await Bateria.find({ status: 'Finalizada' })
      .populate('categoriaId')
      .populate('eventoId');

    const ResultadoCorridaModel = mongoose.models.ResultadoCorrida || mongoose.model('ResultadoCorrida', new mongoose.Schema({}));
    
    const resultados = await ResultadoCorridaModel.find({
      bateriaId: { $in: bateriasFinalizadas.map(b => b._id) }
    }).lean();

    const dadosMesclados = bateriasFinalizadas.map(bateria => {
      const resultadoCorrespondente = resultados.find(
        (r: any) => r.bateriaId.toString() === bateria._id.toString()
      );

      return {
        _id: bateria._id,
        nome: bateria.nome,
        status: bateria.status,
        eventoId: bateria.eventoId,
        categoriaId: bateria.categoriaId,
        resultadoId: resultadoCorrespondente ? resultadoCorrespondente._id.toString() : null
      };
    }).filter(b => b.resultadoId !== null);

    return NextResponse.json(dadosMesclados, { status: 200 });

  } catch (error: any) {
    console.error('Erro ao buscar baterias e resultados:', error);
    return NextResponse.json({ error: 'Erro interno ao processar dados de relatórios.' }, { status: 500 });
  }
}

// ==========================================
// NOVO MÉTODO PUT: ATUALIZAR BATERIA
// ==========================================
export async function PUT(request: Request) {
  try {
    await conectDB();
    const body = await request.json();
    
    // Pegamos o ID da bateria e as propriedades que podem ser atualizadas (incluindo o status da corrida)
    const { id, _id, nome, tempoProva, voltasExtras, categoriaId, eventoId, status } = body;
    
    // Garante que temos um ID válido para buscar no banco
    const bateriaId = id || _id;

    if (!bateriaId) {
      return NextResponse.json({ error: 'O ID da bateria é obrigatório para atualização.' }, { status: 400 });
    }

    // Monta o objeto com os dados tratados, aplicando as mesmas regras do POST se os campos existirem
    const dadosParaAtualizar: any = {};
    
    if (nome !== undefined) dadosParaAtualizar.nome = nome.trim().toUpperCase();
    if (tempoProva !== undefined) dadosParaAtualizar.tempoProva = Number(tempoProva);
    if (voltasExtras !== undefined) dadosParaAtualizar.voltasExtras = Number(voltasExtras);
    if (categoriaId !== undefined) {
      if (!Array.isArray(categoriaId) || categoriaId.length === 0) {
        return NextResponse.json({ error: 'É necessário selecionar ao menos uma categoria.' }, { status: 400 });
      }
      dadosParaAtualizar.categoriaId = categoriaId;
    }
    if (eventoId !== undefined) dadosParaAtualizar.eventoId = eventoId;
    if (status !== undefined) dadosParaAtualizar.status = status; // Útil para quando mudar para "Finalizada", etc.

    // Atualiza no banco de dados e retorna o documento já atualizado ({ new: true })
    const bateriaAtualizada = await Bateria.findByIdAndUpdate(
      bateriaId,
      { $set: dadosParaAtualizar },
      { new: true, runValidators: true }
    );

    if (!bateriaAtualizada) {
      return NextResponse.json({ error: 'Bateria não encontrada.' }, { status: 404 });
    }

    return NextResponse.json(bateriaAtualizada, { status: 200 });
  } catch (error: any) {
    console.error('❌ ERRO AO ATUALIZAR BATERIA:', error);
    return NextResponse.json({ error: 'Erro interno ao atualizar bateria.', detalhes: error.message }, { status: 500 });
  }
}