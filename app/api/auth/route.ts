import { NextRequest, NextResponse } from "next/server";
import conectDB from '@/app/lib/mongodb';
import { Usuario } from '@/app/model/esquemas';

/**
 * Método GET: Valida a sessão ativa do usuário através do cookie
 * e retorna seus dados de perfil/permissões atualizados.
 */
export async function GET(request: NextRequest) {
  try {
    // 1. Obtém o token salvo nos cookies da requisição
    const sessionToken = request.cookies.get('sc-session-token')?.value;

    if (!sessionToken || !sessionToken.startsWith('tk_sc_')) {
      return NextResponse.json(
        { authenticated: false, error: "Sessão não encontrada ou inválida." },
        { status: 401 }
      );
    }

    // 2. Extrai o ID do usuário contido no token (remove o prefixo 'tk_sc_')
    const userId = sessionToken.replace('tk_sc_', '');

    // 3. Conecta ao banco e busca os dados do usuário
    await conectDB();
    const user = await Usuario.findById(userId).select('-passwordUser').lean();

    if (!user) {
      return NextResponse.json(
        { authenticated: false, error: "Usuário não localizado." },
        { status: 404 }
      );
    }

    // 4. Mapeia o nível de acesso (Role)
    let sistemaRole = '';
    if (user.nivelUser === 'A') sistemaRole = 'admin';
    else if (user.nivelUser === 'C') sistemaRole = 'cronometrista';
    else if (user.nivelUser === 'S') sistemaRole = 'secretaria';

    // 5. Retorna as informações do usuário autenticado
    return NextResponse.json({
      authenticated: true,
      user: {
        idUser: user._id,
        emailUser: user.emailUser,
        role: sistemaRole,
        avatar: user.avatarUser || null,
        eventosPermitidos: user.eventosPermitidos || []
      }
    }, { status: 200 });

  } catch (error: any) {
    console.error("❌ ERRO AO VERIFICAR AUTENTICAÇÃO (GET):", error);
    return NextResponse.json(
      { authenticated: false, error: error.message },
      { status: 500 }
    );
  }
}

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

    // Monta o payload de resposta incluindo os eventos permitidos
    const response = NextResponse.json({ 
      success: true, 
      role: sistemaRole, 
      avatar: user.avatarUser || null,
      idUser: user._id,
      eventosPermitidos: user.eventosPermitidos || []
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