import mongoose from 'mongoose';

const PilotoSchema = new mongoose.Schema({
    nome: { type: String, required: true },
    numero_piloto: { type: Number, required: true, unique: true },
    nome_equipe: { type: String, required: false},
    filiacao: { type: String, required: false },
    patrocinador: { type: String, required: false },
    cpf: { type: String, required: false, unique: false },
    dataNascimento: { type: Date, required: false },
    telefone: { type: String, required: false },
    responsavel: { type: String, required: false },
    tipoSanguineo: { type: String, required: false },
    tagId: { type: String, required: true, unique: true }, // ID da Tag RFID (Hexa)
    categorias: [{ type: mongoose.Schema.Types.ObjectId, ref: "Categoria", required: true }], // Agora é um ARRAY
}, { timestamps: true });

export default mongoose.models.Piloto || mongoose.model('Piloto', PilotoSchema);