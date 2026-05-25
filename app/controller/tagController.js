import tag from "../model/tag";
import conectDB from "../lib/mongodb";

export const criarTag = async (dados) => {
    try {
        await conectDB();
        const novaTag = new tag(dados);
        const result = await novaTag.save();
        return { status: 201, data: result };
    } catch (error) {
        return { status: 500, error: error.message };
    }
};

export const listarTags = async () => {
    try {
        await conectDB();
        const tags = await tag.find();
        return { status: 200, data: tags };
    } catch (error) {
        return { status: 500, error: error.message };
    }
};

export const atualizarTag = async (req, res) => {
    try {
        await conectDB();
        const { id } = req.params;
        const dados = req.body;
        const tagAtualizada = await tag.findByIdAndUpdate(id, dados, { new: true });
        if (!tagAtualizada) {
            return res.status(404).json({ error: 'Tag não encontrada' });
        }
        return res.status(200).json(tagAtualizada);
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
};

export const deletarTag = async (req, res) => {
    try {
        await conectDB();
        const { id } = req.params;
        const tagDeletada = await tag.findByIdAndDelete(id);
        if (!tagDeletada) {
            return res.status(404).json({ error: 'Tag não encontrada' });
        }
        return res.status(200).json({ message: 'Tag deletada com sucesso' });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
};
