import Bateria from '../model/bateria.js';
import conectDB from '../lib/mongodb';

// Criar uma nova bateria
export async function criarBateria(data) {
    try {
        await conectDB();
        const novaBateria = new Bateria(data);
        await novaBateria.save();
        return {status: 201, data: novaBateria}
    } catch (err) {
        return {status: 400, erro: err.message}
    }
}
// Listar todas as baterias
export async function listarBaterias() {
    try {
        await conectDB();
        const bateria = await Bateria.find();
        return bateria;
    } catch (err) {
        return {status: 400, erro: err.message}
    }
}   
//atualizar bateria
export async function atualizarBateria(req, res) {
    try {
        await conectDB()
        const bateriaAtualizada = await Bateria.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!bateriaAtualizada) {
            return res.status(404).json({ erro: 'Bateria não encontrada' });
        }
        res.status(200).json(bateriaAtualizada);
    } catch (err) {
        res.status(500).json({ erro: err.message });
    }
}
//deletar bateria
export async function deletarBateria(req, res) {
    try {
        const bateriaDeletada = await Bateria.findByIdAndDelete(req.params.id);
        if (!bateriaDeletada) {
            return res.status(404).json({ erro: 'Bateria não encontrada' });
        }
        res.status(200).json({ mensagem: 'Bateria deletada com sucesso' });
    } catch (err) {
        res.status(500).json({ erro: err.message });
    }
}

