import mongoose from 'mongoose';

const VoltaSchema = new mongoose.Schema({
    pilotoId: { type: mongoose.Schema.Types.ObjectId, ref: 'Piloto' },
    bateriaId: { type: mongoose.Schema.Types.ObjectId, ref: 'Bateria' },
    categoriaId: {type: mongoose.Schema.Types.ObjectId, ref: 'Categoria'},
    tempo: { type: Number, required: true }, // Tempo em milissegundos
    numeroVolta: [{ type: Number, required: true }],
}, { timestamps: true });

export default mongoose.models.Volta || mongoose.model('Volta', VoltaSchema);
