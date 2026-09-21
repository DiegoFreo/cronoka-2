import mongoose, { Schema, model, models } from 'mongoose';

// 📡 1. ANTENA / LEITORA RFID (Atualizada com parâmetros operacionais da Zebra/LLRP)
const AntenaSchema = new Schema({
  nome: { type: String, required: true },
  ip: { type: String, required: true },
  porta: { type: Number, default: 5084 },
  modo: { type: String, enum: ['SERVER', 'CLIENT'], default: 'CLIENT' },
  potenciaAntena: { type: Number, default: 30 },
  tempoRetardoMs: { type: Number, default: 3000 },
  status: { type: String, default: 'desconectado' },
  ativa: { type: Boolean, default: false },
  ultimaLeitura: { type: Date }
}, { timestamps: true });

// 2. MODALIDADE
const ModalidadeSchema = new Schema({
  nome: { type: String, required: true, unique: true }
}, { collection: 'modalidades' });

// 3. EVENTO (Atualizado com controle da Série de Tags Válidas)
const EventoSchema = new Schema({
  nome: { type: String, required: true },
  data: { type: Date, required: true },
  local: { type: String, required: true },
  modalidadeId: { type: Schema.Types.ObjectId, ref: 'Modalidade', required: true },
  status: { type: String, default: 'Pendente' },

  // 🏷️ Faixa / Série de Tags oficiais autorizadas para este evento
  tagSerieInicial: { type: String, default: '' }, // Ex: "000000000000000000000100" ou numeral "100"
  tagSerieFinal: { type: String, default: '' }    // Ex: "000000000000000000000500" ou numeral "500"
}, { collection: 'eventos', timestamps: true });

// 4. CATEGORIA
const CategoriaSchema = new Schema({
  nome: { type: String, required: true },
  eventoId: { type: Schema.Types.ObjectId, ref: 'Evento', required: true }
}, { collection: 'categorias', timestamps: true });

// 5. PILOTO
const PilotoSchema = new Schema({
  nome: { type: String, required: true },
  numeral: { type: String, required: true },
  transponder: { type: String, default: '' }, // EPC / Tag RFID
  categoriasIds: [{ type: Schema.Types.ObjectId, ref: 'Categoria' }],
  eventoId: { type: Schema.Types.ObjectId, ref: 'Evento', required: true }
}, { collection: 'pilotos', timestamps: true });

// 6. BATERIA / GRID
const BateriaSchema = new Schema({
  nome: { type: String, required: true },
  categoriaId: [{ type: Schema.Types.ObjectId, ref: 'Categoria' }],
  eventoId: { type: Schema.Types.ObjectId, ref: 'Evento', required: true },
  status: { type: String, enum: ['Agendada', 'Na_Pista', 'Finalizada'], default: 'Agendada' },
  tempoProvaMinutos: { type: Number, default: 15 },
  voltasExtras: { type: Number, default: 0 }
}, { collection: 'baterias', timestamps: true });

// ⏱️ SUB-ESQUEMA: REGISTRO DE VOLTA INDIVIDUAL
const VoltaDetalheSchema = new Schema({
  numeroVolta: { type: Number, required: true },
  tempoVoltaMs: { type: Number, required: true },
  timestampPassagem: { type: Date, default: Date.now }
}, { _id: false });

// 7. HISTÓRICO / RESULTADO DA CORRIDA
const PilotoResultadoSchema = new Schema({
  pilotoId: { type: Schema.Types.ObjectId, ref: 'Piloto', required: true },
  nome: { type: String, required: true },
  numeral: { type: String, required: true },
  categoriaNome: { type: String, default: '' },
  posicao: { type: Number, required: true },
  voltas: { type: Number, default: 0 },
  tempoTotalMs: { type: Number, default: 0 },
  melhorVoltaMs: { type: Number, default: 0 },
  pontosGanhos: { type: Number, default: 0 },
  historicoVoltas: [VoltaDetalheSchema]
}, { _id: false });

const ResultadoCorridaSchema = new Schema({
  eventoId: { type: Schema.Types.ObjectId, ref: 'Evento', required: true },
  bateriaId: { type: Schema.Types.ObjectId, ref: 'Bateria', required: true },
  nomeBateria: { type: String, required: true },
  tempoTotalProvaMs: { type: Number, default: 0 },
  melhorVoltaDaProvaMs: { type: Number, default: 0 },
  idPilotoMelhorVolta: { type: Schema.Types.ObjectId, ref: 'Piloto', default: null },
  gridFinal: [PilotoResultadoSchema]
}, { collection: 'resultados_corridas', timestamps: true });

// ⚠️ 8. NOVO ESQUEMA: LEITURAS NÃO ASSOCIADAS
// Guarda as leituras de tags válidas da série que passaram na pista, mas ainda não pertencem a nenhum piloto da bateria
const LeituraNaoAssociadaSchema = new Schema({
  eventoId: { type: Schema.Types.ObjectId, ref: 'Evento', required: true },
  bateriaId: { type: Schema.Types.ObjectId, ref: 'Bateria', required: true },
  transponder: { type: String, required: true },  // Tag EPC capturada
  antenaIp: { type: String, default: '' },
  timestampPassagem: { type: Date, default: Date.now },
  tempoDecorridoMs: { type: Number, required: true }, // Tempo de corrida em que a tag passou
  processada: { type: Boolean, default: false }       // vira true quando o cronometrista associa ao piloto
}, { collection: 'leituras_nao_associadas', timestamps: true });

// 9. USUÁRIO
const UsuarioSchema = new Schema({
  nameUser: { type: String, required: true },
  emailUser: { type: String, required: true, unique: true },
  passwordUser: { type: String, required: true },
  nivelUser: { type: String, enum: ['A', 'C', 'S'], required: true },
  avatarUser: { type: String, default: '' },
  eventosPermitidos: [{ type: Schema.Types.ObjectId, ref: 'Evento' }]
}, { collection: 'usuarios', timestamps: true });

const SerieTagSchema = new Schema({
  nome: { type: String, required: true },       // Ex: "Série Oficial Bateria MX"
  prefixo: { type: String, required: true },    // Ex: "1125D0"
  tamanhoNumeral: { type: Number, default: 5 }, // Quantidade de dígitos do número
  ativa: { type: Boolean, default: true }
}, { timestamps: true });

// Exportação unificada dos Modelos (Trata re-compilação de modelos no Next.js)
export const Antena = models.Antena || model('Antena', AntenaSchema);
export const Evento = models.Evento || model('Evento', EventoSchema);
export const Categoria = models.Categoria || model('Categoria', CategoriaSchema);
export const Piloto = models.Piloto || model('Piloto', PilotoSchema);
export const Bateria = models.Bateria || model('Bateria', BateriaSchema);
export const Modalidade = models.Modalidade || model('Modalidade', ModalidadeSchema);
export const ResultadoCorrida = models.ResultadoCorrida || model('ResultadoCorrida', ResultadoCorridaSchema);
export const LeituraNaoAssociada = models.LeituraNaoAssociada || model('LeituraNaoAssociada', LeituraNaoAssociadaSchema);
export const Usuario = models.Usuario || model('Usuario', UsuarioSchema);
export const SerieTag = models.SerieTag || model('SerieTag', SerieTagSchema);