import mongoose, { Schema, model, models } from 'mongoose';

// 1. NOVO ESQUEMA: MODALIDADE (Para cadastrar Motocross, Veloterra, Kart, etc.)
const ModalidadeSchema = new Schema({
  nome: { type: String, required: true, unique: true }
}, { collection: 'modalidades' });

// 2. ESQUEMA DE EVENTO ATUALIZADO (Apontando para o ID da modalidade)
const EventoSchema = new Schema({
  nome: { type: String, required: true },
  data: { type: Date, required: true },
  local: { type: String, required: true },
  modalidadeId: { type: Schema.Types.ObjectId, ref: 'Modalidade', required: true }, // 🌟 Garanta o "Id" no final
  status: { type: String, default: 'Pendente' }
}, { collection: 'eventos', timestamps: true });

// 2. CATEGORIA (Vinculada ao Evento)
const CategoriaSchema = new Schema({
  nome: { type: String, required: true }, // Ex: FPMX 1
  eventoId: { type: Schema.Types.ObjectId, ref: 'Evento', required: true }
}, { timestamps: true });

// 3. PILOTO (Inscrito no Evento)
const PilotoSchema = new Schema({
  nome: { type: String, required: true },
  numeral: { type: String, required: true }, // Número da Moto/Carro
  transponder: { type: String, default: '' }, // Tag RFID se houver
 categoriasIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Categoria' }], // Permite múltiplas categorias
  eventoId: { type: Schema.Types.ObjectId, ref: 'Evento', required: true }
}, { timestamps: true });

// 4. BATERIA / GRID (Configuração da Corrida na Pista)
const BateriaSchema = new Schema({
  nome: { type: String, required: true }, // Ex: 1ª Bateria - FPMX1
  categoriaId: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Categoria' }],
  eventoId: { type: Schema.Types.ObjectId, ref: 'Evento', required: true },
  status: { type: String, enum: ['Agendada', 'Na_Pista', 'Finalizada'], default: 'Agendada' },
  tempoProvaMinutos: { type: Number, default: 15 },
  voltasExtras: { type: Number, default: 0 }
}, { timestamps: true });

// Exportação dos Modelos
export const Evento = models.Evento || model('Evento', EventoSchema);
export const Categoria = models.Categoria || model('Categoria', CategoriaSchema);
export const Piloto = models.Piloto || model('Piloto', PilotoSchema);
export const Bateria = models.Bateria || model('Bateria', BateriaSchema);
export const Modalidade = models.Modalidade || model('Modalidade', ModalidadeSchema);