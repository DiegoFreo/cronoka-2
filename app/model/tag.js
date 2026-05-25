import mongoose from 'mongoose';

const TagSchema = new mongoose.Schema({
    num: { type: String, required: true, unique: true }, // os três últimos dígitos do número do chip
    tag: { type: String, required: true, unique: true },
    flag: { type: Boolean, required: true, default: false }, // TRUE = Vinculado a um piloto (Ocupado) | FALSE = Livre
}, { timestamps: true });

export default mongoose.models.Tag || mongoose.model('Tag', TagSchema);