import { NextResponse } from "next/server";
import conectDB from '../../lib/mongodb';
import Usuario from '../../model/usuario';
import { criarUsuario, listarUsuarios, atualizarUsuario, deletarUsuario, loginUsuario } from  '../../controller/usuarioController';

// 1. CADASTRAR USUÁRIO
export async function POST(request) {
  try {
    await conectDB();
    const corpo = await request.json();
    const { nome, email, senha, nivelAcesso } = corpo;

    if (!nome || !email || !senha) {
      return NextResponse.json({ error: "Nome, e-mail e senha são obrigatórios." }, { status: 400 });
    }

    const novoUsuario = new Usuario({
      nome,
      email: email.toLowerCase().trim(),
      senha, // Se estiver usando criptografia, faça o hash aqui (ex: bcrypt)
      nivelAcesso: nivelAcesso || "operador"
    });

    await novoUsuario.save();
    return NextResponse.json(novoUsuario, { status: 201 });
  } catch (error) {
    console.error("Erro ao criar usuário:", error);
    if (error.code === 11000) {
      return NextResponse.json({ error: "Este e-mail já está cadastrado no sistema." }, { status: 400 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET() {
  try {
    await conectDB();
    const usuarios = await Usuario.find();
    return NextResponse.json(usuarios); // ✅ retorno obrigatório
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 }); // ✅ retorno no erro também
  }
}
   
// 2. EDITAR USUÁRIO
export async function PUT(request) {
  try {
    await conectDB();
    const corpo = await request.json();
    const { _id, nameUser, emailUser, passworUser, nivelUser } = corpo;
    // CHECAGEM DE SEGURANÇA: Só roda toLowerCase se a string existir de fato
    const emailTratado = emailUser ? emailUser.toLowerCase().trim() : "";   

    if (!_id) {
      return NextResponse.json({ error: "O ID do usuário é obrigatório para edição." }, { status: 400 });
    }
    if (!nameUser || !emailTratado) {
      return NextResponse.json({ error: "Nome e e-mail são obrigatórios para edição." }, { status: 400 });
    }

    const dadosAtualizados = {
      nomeUser: nameUser,
      emailUser: emailTratado,
      nivelUser: nivelUser
    };

    // Só atualiza a senha se o administrador digitou uma nova no campo
    if (passworUser && passworUser.trim() !== "") {
      dadosAtualizados.senha = passworUser; // Se usar criptografia, faça o hash aqui também
    }

    const usuarioAtualizado = await Usuario.findByIdAndUpdate(_id, dadosAtualizados, { new: true });

    if (!usuarioAtualizado) {
      return NextResponse.json({ error: "Usuário não encontrado." }, { status: 404 });
    }

    return NextResponse.json(usuarioAtualizado);
  } catch (error) {
    if (error.code === 11000) {
      return NextResponse.json({ error: "Este e-mail já está sendo usado por outro usuário." }, { status: 400 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
// 3. EXCLUIR USUÁRIO
export async function DELETE(request) {
  try {
    await conectDB();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "O ID do usuário é obrigatório para exclusão." }, { status: 400 });
    }

    const usuarioDeletado = await Usuario.findByIdAndDelete(id);

    if (!usuarioDeletado) {
      return NextResponse.json({ error: "Usuário não encontrado." }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: "Usuário excluído com sucesso!" });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function login(request) {
    try {
        await conectDB();
        const dados = await request.json();
        const result = await loginUsuario(dados);
        return NextResponse.json(result.data || { error: result.error }, { status: result.status });
    } catch (err) {
        console.log(err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}