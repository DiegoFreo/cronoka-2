import mongoose from 'mongoose';

const EventoSchema = new mongoose.Schema({
  nome: { type: String, required: true },
  data: { type: Date, required: true },
  local: { type: String, required: true },
  status: { type: String, enum: ['Pendente', 'Em Andamento', 'Finalizada'], default: 'Pendente' }
}, { timestamps: true });

export default mongoose.models.Evento || mongoose.model('Evento', EventoSchema);