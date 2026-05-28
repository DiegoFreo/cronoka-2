import { spawn } from 'child_process';
import { NextResponse } from 'next/server';

// Mantém a referência do processo rodando na memória do servidor do Next.js
let processoBridge = null;

export async function POST(request) {
  const { acao } = await request.json();

  // 🏁 AÇÃO: LIGAR O PÓRTICO
  if (acao === 'START') {
    if (processoBridge) {
      return NextResponse.json({ status: 'Aviso', mensagem: 'O bridge já está rodando.' }, { status: 400 });
    }

    console.log('🚀 Iniciando o ponte RFID (bridge.js)...');
    
    // Altere o caminho abaixo para o local exato onde está o seu bridge.js
    processoBridge = spawn('node', ['c:/zebra-bridge/bridge.js']);

    // Captura os logs do bridge e mostra no terminal do Next.js
    processoBridge.stdout.on('data', (data) => {
      console.log(`[Bridge Log]: ${data.toString().trim()}`);
    });

    processoBridge.stderr.on('data', (data) => {
      console.error(`[Bridge Erro]: ${data.toString().trim()}`);
    });

    processoBridge.on('close', (code) => {
      console.log(`⚠️ Processo do bridge encerrado com código: ${code}`);
      processoBridge = null;
    });

    return NextResponse.json({ status: 'Sucesso', mensagem: 'Pórtico ativado com sucesso!' });
  }

  // 🛑 AÇÃO: DESLIGAR O PÓRTICO
  if (acao === 'STOP') {
    if (!processoBridge) {
      return NextResponse.json({ status: 'Aviso', mensagem: 'O bridge já está desligado.' }, { status: 400 });
    }

    console.log('🛑 Encerrando o processo do bridge...');
    processoBridge.kill('SIGINT'); // Envia o sinal de parada amigável (igual ao Ctrl+C)
    processoBridge = null;

    return NextResponse.json({ status: 'Sucesso', mensagem: 'Pórtico desligado com sucesso!' });
  }

  return NextResponse.json({ error: 'Ação inválida' }, { status: 400 });
}