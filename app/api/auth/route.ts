import { NextRequest, NextResponse } from "next/server";
import conectDB from '@/app/lib/mongodb';
import mongoose, { models, model, Schema } from 'mongoose';

// 1. Definição do Schema respeitando exatamente a sua tabela existente
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

export async function POST(request: NextRequest) {
  try {
    await conectDB();
    const { usuario, senha } = await request.json();

    if (!usuario || !senha) {
      return NextResponse.json({ error: "E-mail e senha são obrigatórios." }, { status: 400 });
    }

    // Busca o usuário pelo e-mail informado (removendo espaços extras)
    const user = await UsuarioModel.findOne({ emailUser: usuario.trim().toLowerCase() });

    // Validação da senha direta contra o campo 'passwordUser'
    if (!user || user.passwordUser !== senha) {
      return NextResponse.json({ error: "E-mail ou senha operacional inválidos." }, { status: 401 });
    }

    // 2. Mapeamento Inteligente do seu padrão ("A", "C", "S") para as rotas do sistema
    let sistemaRole = '';
    if (user.nivelUser === 'A') sistemaRole = 'admin';
    else if (user.nivelUser === 'C') sistemaRole = 'cronometrista';
    else if (user.nivelUser === 'S') sistemaRole = 'secretaria';

    if (!sistemaRole) {
      return NextResponse.json({ error: "Nível de usuário não reconhecido pelo sistema." }, { status: 403 });
    }

    // 3. Monta a resposta de sucesso injetando os cookies para o Middleware
    const response = NextResponse.json({ 
      success: true, 
      role: sistemaRole, 
      avatar: user.avatarUser || null
    }, { status: 200 });

    const tempoSessao = 60 * 60 * 12; // Sessão válida por 12 horas de pista

    // Alimenta os cookies que controlam o Middleware e as travas de rota
    response.cookies.set('sc-session-token', 'tk_sc_' + user._id, { maxAge: tempoSessao, path: '/' });
    response.cookies.set('sc-user-role', sistemaRole, { maxAge: tempoSessao, path: '/' });

    return response;

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}