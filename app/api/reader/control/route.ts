// app/api/reader/control/route.ts
import { NextResponse } from 'next/server';
import { zebraManager } from '@/app/lib/zebraReader';

export async function POST(req: Request) {
  const { action } = await req.json();

  if (action === 'start') {
    zebraManager.startReading();
    return NextResponse.json({ message: 'Leitura iniciada' });
  } 
  
  if (action === 'stop') {
    zebraManager.stopReading();
    return NextResponse.json({ message: 'Leitura parada' });
  }

  return NextResponse.json({ error: 'Ação inválida' }, { status: 400 });
}