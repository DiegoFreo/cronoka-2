import mongoose from 'mongoose';

const CategoriaSchema = new mongoose.Schema({
    nome: { type: String, required: true },   
}, { timestamps: true });

const Categoria = mongoose.models.Categoria || mongoose.model('Categoria', CategoriaSchema);
 
export default Categoria;