import mongoose from 'mongoose';

const CorridaRegistroSchema = new mongoose.Schema({
  bateriaId: { type: mongoose.Schema.Types.ObjectId, ref: 'Bateria', required: true },
  competidorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Piloto', required: true },
  numeroPiloto: { type: String, required: true },
  nomePiloto: { type: String, required: true },
  numeroVolta: { type: Number, required: true },
  tempoVoltaMs: { type: Number, required: true }, // Tempo exato com os milissegundos (3 casas)
  timestampPassagem: { type: Date, default: Date.now },
  origem: { type: String, enum: ['RFID', 'MANUAL'], default: 'MANUAL' }
}, { timestamps: true });

const CorridaRegistro = mongoose.models.CorridaRegistro || mongoose.model('CorridaRegistro', CorridaRegistroSchema);

export default CorridaRegistro;