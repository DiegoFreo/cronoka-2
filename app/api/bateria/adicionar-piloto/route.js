import { NextResponse } from "next/server";
import conectDB from "@/app/lib/mongodb";
import Piloto from "@/app/model/piloto";
import Categoria from "@/app/model/categoria";
import Tag from "@/app/model/tag";

export async function POST(request) {
  try {
    await conectDB();
    const corpo = await request.json();
    // Recebe um ARRAY de IDs de categorias
    const { nome, numero, tag, categoriasIds } = corpo; 

    if (!nome || !numero || !categoriasIds || categoriasIds.length === 0) {
      return NextResponse.json({ error: "Nome, Número e ao menos uma Categoria são obrigatórios." }, { status: 400 });
    }
    let tagCompletaEncontrada = "";

    if (tag) {
      // Garante que o número digitado tenha zeros à esquerda se necessário (ex: "45" vira "045")
      const sufixoTag = tag.trim().padStart(3, '0'); 
      
      // Busca no banco um piloto ou um documento de controle de tags que termine com esses 3 números
      // O símbolo $ garante que a string termine exatamente com os 3 números
      const regexBusca = new RegExp(`${sufixoTag}$`);
      
      // Aqui você busca na sua coleção onde ficam guardados os chips cadastrados
      // (Substitua 'ModeloDasTags' pelo seu modelo real de inventário de chips, se tiver um, 
      // ou busque em registros de pilotos antigos)
      const tagEncontrada = await Piloto.findOne({ codigoHex: regexBusca });
      
      if (tagEncontrada) {
        tagCompletaEncontrada = tagEncontrada.codigoHex; // Salva o ID cheio (Ex: E200001A...045)
      } else {
        // Se não achar o chip cadastrado no banco, mantém o que o usuário digitou temporariamente
        tagCompletaEncontrada = tag; 
      }
    }

    // Na hora de salvar o competidor na prova:
    const novoPiloto = new Piloto({
      nome: nome.trim().toUpperCase(),
      numero_piloto: numero.toString(),
      tag: tagCompletaEncontrada, // Grava a tag cheia encontrada pelo sufixo
      categoria: categoriasIds
    });

    await novoPiloto.save();

    // 2. Busca os nomes das categorias selecionadas para exibir bonito no grid
    const infosCategorias = await Categoria.find({ _id: { $in: categoriasIds } });
    const nomesCategorias = infosCategorias.map(c => c.nome).join(" / ");

    return NextResponse.json({
      success: true,
      piloto: {
        _id: novoPiloto._id,
        id: novoPiloto._id.toString(),
        nome: novoPiloto.nome,
        numero: novoPiloto.numero_piloto,
        tag: novoPiloto.tag,
        categoriaNome: nomesCategorias || "Geral", // Ex: "MX1 / FORÇA LIVRE"
        voltas: []
      }
    }, { status: 201 });

  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}