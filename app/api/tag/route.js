import { NextResponse } from "next/server";
import conectDB from '../../lib/mongodb';
import Tag from '../../model/tag';
import { criarTag, listarTags, atualizarTag, deletarTag } from  '../../controller/tagController';

export async function POST(request) {
    try{
    await conectDB();
    const dados = await request.json();
    const result = await criarTag(dados);
    return NextResponse.json(result.data || { error: result.error }, { status: result.status });
}    catch(err){
    console.log(err)
    return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

export async function GET(request) {
  try {
    await conectDB();

    // 1. Pegamos os parâmetros da URL (ex: /api/tag?flag=false&count=true)
    const { searchParams } = new URL(request.url);
    const flagParam = searchParams.get("flag");
    const countParam = searchParams.get("count");

    // 2. Montamos o objeto de busca dinamicamente
    const query = {};
    
    if (flagParam !== null) {
      // Como o parâmetro da URL vem como texto ("true" ou "false"), convertemos para booleano
      query.flag = flagParam === "true";
    }

    // 3. Se o front-end pediu apenas a contagem (?count=true)
    if (countParam === "true") {
      const total = await Tag.countDocuments(query);
      return NextResponse.json({ total });
    }

    // 4. Caso contrário, busca os registros normalmente com base no filtro aplicado
    const tags = await Tag.find(query);
    return NextResponse.json(tags);

  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
/*
export async function GET() {
  try {
    await conectDB();
    const tags = await Tag.find();
    return NextResponse.json(tags); // ✅ retorno obrigatório
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 }); // ✅ retorno no erro também
  }
}*/

export async function PUT(request) {
    try{
    await conectDB();
    const req = await request.json();
    req.params = { id: req.id };
    const res = {
        status: (status) => ({
            json: (data) => NextResponse.json(data, { status }),    
        }),
    };
    const AtTag = atualizarTag(req, res);
    return NextResponse.json(AtTag);
}    catch(err){
    console.log(err)
    return NextResponse.json({ error: err.message }, { status: 500 });
    } 
}

export async function DELETE(request) {
    try{
    await conectDB();
    const req = await request.json();
    req.params = { id: req.id };    
    const res = {
        status: (status) => ({
            json: (data) => NextResponse.json(data, { status }),    
        }),
    };
    return deletarTag(req, res);
}    catch(err){
    console.log(err)
    return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

