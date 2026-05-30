import mongoose from "mongoose";

const EventoSchema = new mongoose.Schema({
  nome: { 
    type: String, 
    required: true, 
    trim: true // Ex: "Etapa Limeira", "Etapa Campinas"
  },
  data: { 
    type: Date, 
    required: true 
  },
  status: { 
    type: String, 
    enum: ['Pendente', 'Em Andamento', 'Finalizado'], 
    default: 'Pendente' 
  },
  // 🔗 O SEGREDO ESTÁ AQUI: Vincula o evento à sua modalidade pai
  modalidade: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "Modalidade", 
    required: true 
  }
}, { timestamps: true });

export default mongoose.models.Evento || mongoose.model("Evento", EventoSchema);