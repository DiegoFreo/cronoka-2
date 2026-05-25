import Usuario from '../model/usuario';
import jwt from 'jsonwebtoken';
import conectDb from '../lib/mongodb';

const jwtSecret = process.env.JWT_SECRET; // defina no .env


// Criar um novo usuário
export async function criarUsuario(dados) {
    await conectDb();
    try {
        const novoUsuario = new Usuario(dados);
        await novoUsuario.save();
        return { status: 201, data: novoUsuario };
    } catch (err) {
        return { status: 400, error: err.message };
    }
}
// Listar todos os usuários
export async function listarUsuarios(req, res) {
    try {
        await conectDb();
        const usuarios = await Usuario.find();
        res.status(200).json(usuarios);
    } catch (err) {
        res.status(500).json({ error: err.message });
    } 
}
// Atualizar um usuário
export async function atualizarUsuario(req, res) {
    try {
        await conectDb();
        const usuarioAtualizado = await Usuario.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!usuarioAtualizado) {
            return {status:404, error: 'Usuário não encontrado' };
        }
        res.status(200).json(usuarioAtualizado);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
}
// Deletar um usuário
export async function deletarUsuario(req, res) {
    try {
        await conectDb();
        const usuarioDeletado = await Usuario.findByIdAndDelete(req.params.id);
        if (!usuarioDeletado) {
            return res.status(404).json({ error: 'Usuário não encontrado' });
        }
        res.status(200).json({ message: 'Usuário deletado com sucesso' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}
export async function loginUsuario(dados) {
    try {
        await conectDb();
        const {emailUser, passworUser } = dados;
        
        const usuario = await Usuario.findOne({emailUser, passworUser});
        if (!usuario) {
            return {status:401,  error: 'Credenciais inválidas' };
        }
        
        // Gerar um token JWT
        const token = jwt.sign({ id: usuario._id, nivelUser: usuario.nivelUser }, jwtSecret, { expiresIn: '6h' });
        
        // Você pode retornar o token se estiver usando autenticação baseada em token
        //return {status:200, message: 'Login bem-sucedido', usuario, token };
        return {
            status: 200,
            data: {
                message: 'Login bem-sucedido',
                usuario: {
                    idUser: usuario._id,
                    nameUser: usuario.nameUser,
                    emailUser: usuario.emailUser,
                    nivelUser: usuario.nivelUser,
                    avatarUser: usuario.avatarUser,
                    },
                token,
            },
        };
        
    } catch (err) {
        return {status:500, error: err.message };
    }
}

