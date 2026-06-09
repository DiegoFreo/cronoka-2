import { NextRequest, NextResponse } from "next/server";
import conectDB from '@/app/lib/mongodb';
import { Modalidade } from "@/app/model/esquemas";

/**
 * GET: Lista todas as modalidades cadastradas em ordem alfabética.
 */
export async function GET() {
  try {
    await conectDB();
    const modalidades = await Modalidade.find({}).sort({ nome: 1 });
    return NextResponse.json(modalidades, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * POST: Cadastra uma nova modalidade de pista.
 */
export async function POST(request: NextRequest) {
  try {
    await conectDB();
    const body = await request.json();
    const { nome } = body;

    if (!nome || !nome.trim()) {
      return NextResponse.json({ error: "O nome da modalidade é obrigatório." }, { status: 400 });
    }

    // Evita duplicados (Ex: Cadastrar "Motocross" duas vezes)
    const existe = await Modalidade.findOne({ nome: nome.trim().toUpperCase() });
    if (existe) {
      return NextResponse.json({ error: "Esta modalidade já está cadastrada." }, { status: 400 });
    }

    const novaModalidade = await Modalidade.create({
      nome: nome.trim().toUpperCase() // Salva padronizado em Caixa Alta
    });

    return NextResponse.json({ success: true, data: novaModalidade }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}