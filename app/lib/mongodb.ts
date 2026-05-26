import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error('Please define the MONGODB_URI environment variable inside .env.local');
}
let cached = (global as any).mongoose;

if (!cached) {
  cached = (global as any).mongoose = { conn: null, promise: null };
}

export async function conectDB() {
  if (cached.conn) {
    return cached.conn;
  }
    if (!cached.promise) {
    const opts = {
      bufferCommands: false,
      // 👉 FORÇA O NODE A USAR IPV4 (Evita falhas de resolução DNS intermitentes)
      family: 4, 
      // 👉 Se o banco não responder em 5 segundos, ele aborta a tentativa em vez de travar a linha
      serverSelectionTimeoutMS: 5000, 
      // 👉 Tempo limite de inatividade do socket para evitar conexões presas ou fantasmas
      socketTimeoutMS: 45000, 
    };

    cached.promise = mongoose.connect(MONGODB_URI as string, opts).then((mongoose) => {
      console.log("===> [MongoDB] Conexão reestabelecida com sucesso!");
      return mongoose;
    });
  }
    cached.conn = await cached.promise;
    return cached.conn;
}
export default conectDB;
