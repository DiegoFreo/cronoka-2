import { NextRequest, NextResponse } from "next/server";
import conectDB from '@/app/lib/mongodb';
import { Usuario } from '@/app/model/esquemas';
import mongoose, { models, model, Schema } from 'mongoose';

/* 1. Definição do Schema respeitando exatamente a sua tabela existente
const UsuarioSchema = new Schema({
  emailUser: { type: String, required: true, unique: true },
  passwordUser: { type: String, required: true },
  nivelUser: { type: String, enum: ['A', 'C', 'S'], required: true }, // A = Admin, C = Cronometrista, S = Secretaria
  avatarUser: { type: String, default: '' }
}, { 
  collection: 'usuarios' // 🌟 Força o Mongoose a usar exatamente o nome da sua tabela
});

// Garante que o modelo não seja recriado se já existir em cache
const UsuarioModel = models.Usuario || model('Usuario', UsuarioSchema);
*/

export async function POST(request: NextRequest) {
  try {
    await conectDB();
    const { usuario, senha } = await request.json();

    if (!usuario || !senha) {
      return NextResponse.json({ error: "E-mail e senha são obrigatórios." }, { status: 400 });
    }

    // Busca o usuário trazendo também o array de eventos permitidos
    const user = await Usuario.findOne({ emailUser: usuario.trim().toLowerCase() });

    if (!user || user.passwordUser !== senha) {
      return NextResponse.json({ error: "E-mail ou senha operacional inválidos." }, { status: 401 });
    }

    let sistemaRole = '';
    if (user.nivelUser === 'A') sistemaRole = 'admin';
    else if (user.nivelUser === 'C') sistemaRole = 'cronometrista';
    else if (user.nivelUser === 'S') sistemaRole = 'secretaria';

    if (!sistemaRole) {
      return NextResponse.json({ error: "Nível de usuário não reconhecido pelo sistema." }, { status: 403 });
    }

    // 🌟 Monta o payload de resposta incluindo os eventos permitidos
    const response = NextResponse.json({ 
      success: true, 
      role: sistemaRole, 
      avatar: user.avatarUser || null,
      idUser: user._id,
      eventosPermitidos: user.eventosPermitidos || [] // Envia a lista para o front se planejar usar no estado global
    }, { status: 200 });

    const tempoSessao = 60 * 60 * 12; // 12 horas de sessão ativa

    response.cookies.set('sc-session-token', 'tk_sc_' + user._id, { maxAge: tempoSessao, path: '/' });
    response.cookies.set('sc-user-role', sistemaRole, { maxAge: tempoSessao, path: '/' });

    return response;

  } catch (error: any) {
    console.error("❌ ERRO NO LOGIN:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}