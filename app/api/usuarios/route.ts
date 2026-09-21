import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
// Importe aqui a conexão com o seu banco de dados e o Model de Usuário
// Exemplo com Mongoose/MongoDB:
import { conectDB } from '@/app/lib/mongodb'; // Ajuste o caminho do seu DB
import { Usuario } from '@/app/model/esquemas';             // Ajuste o caminho do seu Model

// ----------------------------------------------------------------------
// GET: Lista todos os usuários ou busca um específico por ID
// ----------------------------------------------------------------------
export async function GET(request: NextRequest) {
  try {
    await conectDB();

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (id) {
      const usuario = await Usuario.findById(id).select('-senha');
      if (!usuario) {
        return NextResponse.json({ message: 'Usuário não encontrado' }, { status: 404 });
      }
      return NextResponse.json(usuario, { status: 200 });
    }

    // Retorna todos os usuários ocultando o campo de senha por segurança
    const usuarios = await Usuario.find({}).select('-senha').sort({ createdAt: -1 });
    return NextResponse.json(usuarios, { status: 200 });
  } catch (error: any) {
    console.error('Erro ao buscar usuários:', error);
    return NextResponse.json({ message: 'Erro interno no servidor', error: error.message }, { status: 500 });
  }
}

// ----------------------------------------------------------------------
// POST: Cadastra um novo usuário
// ----------------------------------------------------------------------
export async function POST(request: NextRequest) {
  try {
    await conectDB();

    const body = await request.json();
    const { nome, email, senha, role } = body;

    // Validações básicas
    if (!nome || !email || !senha) {
      return NextResponse.json({ message: 'Nome, e-mail e senha são obrigatórios.' }, { status: 400 });
    }

    // Verifica se o e-mail já está cadastrado
    const usuarioExistente = await Usuario.findOne({ email: email.toLowerCase().trim() });
    if (usuarioExistente) {
      return NextResponse.json({ message: 'Já existe um usuário com este e-mail.' }, { status: 400 });
    }

    // Criptografa a senha
    const salt = await bcrypt.genSalt(10);
    const senhaHash = await bcrypt.hash(senha, salt);

    // Cria o novo usuário
    const novoUsuario = await Usuario.create({
      nome: nome.trim(),
      email: email.toLowerCase().trim(),
      senha: senhaHash,
      role: role || 'Secretaria',
    });

    // Converte para objeto e remove a senha antes de retornar
    const resposta = novoUsuario.toObject();
    delete resposta.senha;

    return NextResponse.json(resposta, { status: 201 });
  } catch (error: any) {
    console.error('Erro ao criar usuário:', error);
    return NextResponse.json({ message: 'Erro interno ao criar usuário', error: error.message }, { status: 500 });
  }
}

// ----------------------------------------------------------------------
// PUT: Atualiza dados de um usuário existente
// ----------------------------------------------------------------------
export async function PUT(request: NextRequest) {
  try {
    await conectDB();

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const body = await request.json();

    const usuarioId = id || body._id;

    if (!usuarioId) {
      return NextResponse.json({ message: 'ID do usuário não fornecido.' }, { status: 400 });
    }

    const { nome, email, senha, role } = body;

    const usuario = await Usuario.findById(usuarioId);
    if (!usuario) {
      return NextResponse.json({ message: 'Usuário não encontrado.' }, { status: 404 });
    }

    // Atualiza os campos fornecidos
    if (nome) usuario.nome = nome.trim();
    if (email) usuario.email = email.toLowerCase().trim();
    if (role) usuario.role = role;

    // Se uma nova senha for informada, faz o re-hash
    if (senha && senha.trim() !== '') {
      const salt = await bcrypt.genSalt(10);
      usuario.senha = await bcrypt.hash(senha, salt);
    }

    await usuario.save();

    const resposta = usuario.toObject();
    delete resposta.senha;

    return NextResponse.json(resposta, { status: 200 });
  } catch (error: any) {
    console.error('Erro ao atualizar usuário:', error);
    return NextResponse.json({ message: 'Erro interno ao atualizar usuário', error: error.message }, { status: 500 });
  }
}

// ----------------------------------------------------------------------
// DELETE: Remove um usuário
// ----------------------------------------------------------------------
export async function DELETE(request: NextRequest) {
  try {
    await conectDB();

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ message: 'ID do usuário não informado.' }, { status: 400 });
    }

    const usuarioDeletado = await Usuario.findByIdAndDelete(id);

    if (!usuarioDeletado) {
      return NextResponse.json({ message: 'Usuário não encontrado para exclusão.' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Usuário removido com sucesso.' }, { status: 200 });
  } catch (error: any) {
    console.error('Erro ao excluir usuário:', error);
    return NextResponse.json({ message: 'Erro interno ao excluir usuário', error: error.message }, { status: 500 });
  }
}