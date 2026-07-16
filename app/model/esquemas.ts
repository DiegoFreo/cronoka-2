import mongoose, { Schema, model, models } from 'mongoose';

// 📡 NOVO ESQUEMA: ANTENA (Para gerenciar os IPs dos leitores RFID Zebra FX7400 na pista)
const AntenaSchema = new Schema({
  nome: { type: String, required: true },
  ip: { type: String, required: true, unique: true },          // Evita duplicar o mesmo leitor
  porta: { type: Number, required: true, default: 5084 },          // Porta padrão LLRP
  status: { type: String, enum: ['online', 'offline', 'error'], default: 'offline' },
  ultimaLeitura: { type: Date }
}, { collection: 'antenas', timestamps: true });

// 1. MODALIDADE (Para cadastrar Motocross, Veloterra, Kart, etc.)
const ModalidadeSchema = new Schema({
  nome: { type: String, required: true, unique: true }
}, { collection: 'modalidades' });

// 2. ESQUEMA DE EVENTO ATUALIZADO (Apontando para o ID da modalidade)
const EventoSchema = new Schema({
  nome: { type: String, required: true },
  data: { type: Date, required: true },
  local: { type: String, required: true },
  modalidadeId: { type: Schema.Types.ObjectId, ref: 'Modalidade', required: true },
  status: { type: String, default: 'Pendente' }
}, { collection: 'eventos', timestamps: true });

// 3. CATEGORIA (Vinculada ao Evento)
const CategoriaSchema = new Schema({
  nome: { type: String, required: true }, // Ex: FPMX 1
  eventoId: { type: Schema.Types.ObjectId, ref: 'Evento', required: true }
}, { collection: 'categorias', timestamps: true });

// 4. PILOTO (Inscrito no Evento)
const PilotoSchema = new Schema({
  nome: { type: String, required: true },
  numeral: { type: String, required: true }, // Número da Moto/Carro
  transponder: { type: String, default: '' }, // Tag RFID cadastrada
  categoriasIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Categoria' }], // Permite múltiplas categorias
  eventoId: { type: Schema.Types.ObjectId, ref: 'Evento', required: true }
}, { collection: 'pilotos', timestamps: true });

// 5. BATERIA / GRID (Configuração da Corrida na Pista)
const BateriaSchema = new Schema({
  nome: { type: String, required: true }, // Ex: 1ª Bateria - FPMX1
  categoriaId: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Categoria' }],
  eventoId: { type: Schema.Types.ObjectId, ref: 'Evento', required: true },
  status: { type: String, enum: ['Agendada', 'Na_Pista', 'Finalizada'], default: 'Agendada' },
  tempoProvaMinutos: { type: Number, default: 15 },
  voltasExtras: { type: Number, default: 0 }
}, { collection: 'baterias', timestamps: true });


// ⏱️ SUB-ESQUEMA: REGISTRO DE VOLTA INDIVIDUAL (Dinâmico)
const VoltaDetalheSchema = new Schema({
  numeroVolta: { type: Number, required: true },        // Ex: 1, 2, 3...
  tempoVoltaMs: { type: Number, required: true },       // Tempo gasto nesta volta específica
  timestampPassagem: { type: Date, default: Date.now }  // Horário exato que passou na antena
}, { _id: false });


// 🌟 6. HISTÓRICO / RESULTADO DA CORRIDA (Para Relatórios Flexíveis)
const PilotoResultadoSchema = new Schema({
  pilotoId: { type: Schema.Types.ObjectId, ref: 'Piloto', required: true },
  nome: { type: String, required: true },          // Snapshot imutável do nome
  numeral: { type: String, required: true },       // Snapshot imutável do número usado na prova
  categoriaNome: { type: String, default: '' },    // Nome amigável da categoria dele
  posicao: { type: Number, required: true },
  voltas: { type: Number, default: 0 },
  tempoTotalMs: { type: Number, default: 0 },
  melhorVoltaMs: { type: Number, default: 0 },
  pontosGanhos: { type: Number, default: 0 },
  
  // 🔥 ADICIONADO AQUI: Lista dinâmica que guarda o histórico de tempos de cada volta dada por ESSE piloto
  historicoVoltas: [VoltaDetalheSchema]
}, { _id: false }); // Não gera IDs individuais para simplificar a edição do array geral


const ResultadoCorridaSchema = new Schema({
  eventoId: { type: Schema.Types.ObjectId, ref: 'Evento', required: true },
  bateriaId: { type: Schema.Types.ObjectId, ref: 'Bateria', required: true },
  nomeBateria: { type: String, required: true },   // Guarda o nome da bateria no momento (Ex: 1ª Bateria)
  tempoTotalProvaMs: { type: Number, default: 0 },
  melhorVoltaDaProvaMs: { type: Number, default: 0 },
  idPilotoMelhorVolta: { type: Schema.Types.ObjectId, ref: 'Piloto', default: null },
  gridFinal: [PilotoResultadoSchema]                // Lista ordenada dos pilotos da prova
}, { collection: 'resultados_corridas', timestamps: true });

const UsuarioSchema = new Schema({
  emailUser: { type: String, required: true, unique: true },
  passwordUser: { type: String, required: true },
  nivelUser: { type: String, enum: ['A', 'C', 'S'], required: true }, // A = Admin, C = Cronometrista, S = Secretaria
  avatarUser: { type: String, default: '' },
  
  // 🌟 NOVO CAMPO: Array de IDs dos eventos que este usuário pode gerenciar/visualizar
  eventosPermitidos: [{ type: Schema.Types.ObjectId, ref: 'Evento' }]
}, { 
  collection: 'usuarios', // Mantém a coleção exata do seu banco
  timestamps: true       // Adiciona createdAt e updatedAt automaticamente
});


// Exportação unificada dos Modelos
export const Antena = models.Antena || model('Antena', AntenaSchema);
export const Evento = models.Evento || model('Evento', EventoSchema);
export const Categoria = models.Categoria || model('Categoria', CategoriaSchema);
export const Piloto = models.Piloto || model('Piloto', PilotoSchema);
export const Bateria = models.Bateria || model('Bateria', BateriaSchema);
export const Modalidade = models.Modalidade || model('Modalidade', ModalidadeSchema);
export const ResultadoCorrida = models.ResultadoCorrida || model('ResultadoCorrida', ResultadoCorridaSchema);
export const Usuario = models.Usuario || model('Usuario', UsuarioSchema);