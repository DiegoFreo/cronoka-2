import mongoose from 'mongoose';

const UsuarioSchema = new mongoose.Schema({
    nameUser: { type: String, required: true },
    emailUser: { type: String, required: true, unique: true },
    passworUser: { type: String, required: true },
    nivelUser: { type: String, enum: ['A', 'C', 'S'], default: 'C' },
    avatarUser: { type: String, required: false},
}, { timestamps: true });

export default mongoose.models.Usuario || mongoose.model('Usuario', UsuarioSchema);