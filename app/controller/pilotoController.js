import conectDB from "../lib/mongodb";
import Piloto from "../model/piloto";
// Criar um novo piloto
export async function criarPiloto(request) {
    try {
        await conectDB();
        const novoPiloto = new Piloto(request);
        await novoPiloto.save();
        return{ status:201, data: novoPiloto};
    } catch (err) {
       return { status: 400, error: err.message };
    }
}
// Listar todos os pilotos
export async function listarPilotos() {
    try {
        const pilotos = await Piloto.find();
        return pilotos;
    } catch (err) {
        return {status: 500, error: err.message};
    }
}
// Atualizar um piloto
export async function atualizarPiloto(id, dados) {
  try {
    await conectDB();
    // Busca o piloto existente
    const piloto = await Piloto.findById(id);
    if (!piloto) {
      return {
        status: 404,
        data: { message: "Piloto não encontrado" },
      };
    }
    // Atualiza apenas os campos enviados
    Object.assign(piloto, dados);
    await piloto.save();
    return { status: 200, data: piloto };
  } catch (err) {
    return { status: 400, error: err.message };
  }
}
// Deletar um piloto
export async function deletarPiloto(id) {
    try {
        await conectDB();
        const pilotoDeletado = await Piloto.findByIdAndDelete(id);
        if (!pilotoDeletado) {
            return { status: 404, data: { message: "Piloto não encontrado" } };
        }
        return { status: 200, data: { message: "Piloto deletado com sucesso!" } };
    } catch (err) {
        return { status: 400, error: err.message };
    }
}
