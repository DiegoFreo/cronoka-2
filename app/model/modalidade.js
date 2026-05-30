import mongoose from "mongoose";

const ModalidadeSchema = new mongoose.Schema({
  nome: { 
    type: String, 
    required: true, 
    trim: true // Ex: "Motocross", "Corrida de Rua", "Motovelocidade"
  },
  ativo: { 
    type: Boolean, 
    default: true 
  }
}, { timestamps: true });

export default mongoose.models.Modalidade || mongoose.model("Modalidade", ModalidadeSchema);