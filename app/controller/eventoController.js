import conectDB from '../lib/mongodb';
import Evento from '../model/evento.js';

// Criar um novo evento
export async function criarEvento(request) {
    try {
        await conectDB();
        const novoEvento = new Evento(request);
        await novoEvento.save();
        return{ status:201, data: novoEvento};
    } catch (err) {
       return { status: 400, error: err.message };
    }
}
// Listar todos os eventos
export async function listarEventos() {
    try {
        const eventos = await Evento.find();
        return eventos;
    } catch (err) {
        return {status: 500, error: err.message};
    }
}
// Atualizar um evento
export async function atualizarEvento(id, dados) {
  try {
    await conectDB();
    // Busca o evento existente
    const evento = await Evento.findById(id);
    if (!evento) {
      return {
        status: 404,
        data: { message: "Evento não encontrado" },
      };
    }   
    // Atualiza apenas os campos enviados
    Object.assign(evento, dados);

    await evento.save();

    return {
      status: 200,
      data: { message: "Evento atualizado com sucesso!", evento },
    };
  } catch (err) {
    console.error("Erro ao atualizar evento:", err);
    return {
      status: 500,
      data: { message: err.message },
    };
  }
}

/*
export async function atualizarEvento(req, res) {
    try {
        const eventoAtualizado = await Evento.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!eventoAtualizado) {
            return res.status(404).json({ erro: 'Evento não encontrado' });
        }
        res.status(200).json(eventoAtualizado);
    } catch (err) {
        res.status(500).json({ erro: err.message });
    }
}
    */
// Deletar um evento
export async function deletarEvento(req, res) {
    try {
        const eventoDeletado = await Evento.findByIdAndDelete(req.params.id);
        if (!eventoDeletado) {
            return res.status(404).json({ erro: 'Evento não encontrado' });
        }
        res.status(200).json({ mensagem: 'Evento deletado com sucesso' });
    } catch (err) {
        res.status(500).json({ erro: err.message });
    }
}