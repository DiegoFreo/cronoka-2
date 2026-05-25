import mongoose from 'mongoose';

const BateriaSchema = new mongoose.Schema({
  nome: { type: String, required: true },
  categorias: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Categoria', required: true }],
  status: { type: String, enum: ['Pendente', 'Em Andamento', 'Finalizada'], default: 'Pendente' },
  ordem: { type: Number, default: 0 },
  horaInicio: { type: Date, default: null },
  horaFim: { type: Date, default: null },
  // NOVO CAMPO: Vinculação com o Evento correspondente
  evento: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Evento', required: true }]
}, { timestamps: true });

export default mongoose.models.Bateria || mongoose.model('Bateria', BateriaSchema);