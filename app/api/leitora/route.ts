import { NextResponse } from 'next/server';
import net from 'net';
import axios from 'axios';

interface TagLog {
  tag: string;
  dataHora: string;
  antena: string;
}

interface GlobalLeitoras {
  [key: string]: {
    socketServer?: net.Server;
    socketClient?: net.Socket;
    status: 'conectado' | 'desconectado' | 'tentando';
    tagsRecentes: TagLog[];
  };
}

const globalForLeitoras = global as unknown as { leitorasAtivas: GlobalLeitoras };
if (!globalForLeitoras.leitorasAtivas) {
  globalForLeitoras.leitorasAtivas = {};
}

const leitorasAtivas = globalForLeitoras.leitorasAtivas;

function obterHoraAtual(): string {
  const agora = new Date();
  return agora.toTimeString().split(' ')[0];
}

/**
 * 📦 BUFFERS HEXADECIMAIS PADRÃO DO LLRP PARA CONFIGURAÇÃO DE INVENTÁRIO
 */
const BUFFER_ADD_ROSPEC = Buffer.from(
  '0414000000540000000100b1004a00000001000000b200120000000000000000000000000000b3002a00010000000000b600120100000000000000000000000000b7000e0000000000000000', 
  'hex'
);

const BUFFER_ENABLE_ROSPEC = Buffer.from(
  '04180000000a0000000200000001', 
  'hex'
);

const BUFFER_START_ROSPEC = Buffer.from(
  '04160000000a0000000300000001', 
  'hex'
);

const BUFFER_STOP_ROSPEC = Buffer.from(
  '04170000000a0000000400000001', 
  'hex'
);

/**
 * 🚀 DECODIFICADOR BINÁRIO LLRP NATIVO CORRIGIDO
 */
function extrairTagsDoBufferLLRP(buffer: Buffer): string[] {
  const tagsEncontradas: string[] = [];

  if (buffer.length > 0) {
    console.log(`📦 Buffer TCP recebido. Tamanho: ${buffer.length} bytes.`);
  }

  let index = 0;
  while (index < buffer.length - 14) {
    const byteAtual = buffer[index];

    // Varre procurando o Type ID de estruturas EPC comuns (13, 140 ou 141)
    if (byteAtual === 13 || byteAtual === 140 || byteAtual === 141) {
      const epcLength = 12; // 96 bits padrão de cronometragem esportiva

      if (index + 1 + epcLength <= buffer.length) {
        const epcBytes = buffer.slice(index + 1, index + 1 + epcLength);
        const epcHex = epcBytes.toString('hex').toUpperCase();

        if (
          epcHex.length === 24 && 
          epcHex !== '000000000000000000000000' && 
          !tagsEncontradas.includes(epcHex)
        ) {
          tagsEncontradas.push(epcHex);
          index += epcLength;
          continue;
        }
      }
    }
    index++;
  }

  return tagsEncontradas;
}

/**
 * 📥 MÉTODO GET
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const ip = searchParams.get('ip');
    const id = searchParams.get('id');
    
    const chaveMemoria = ip ? ip.trim() : id;

     

    if (!chaveMemoria) {
      return NextResponse.json({ error: 'IP ou ID não fornecido na URL' }, { status: 400 });
    }

    const leitora = leitorasAtivas[chaveMemoria];

    if (!leitora) {
      return NextResponse.json({ status: 'desconectado', tagsRecentes: [] });
    }

    return NextResponse.json({ 
      status: leitora.status, 
      tagsRecentes: [...leitora.tagsRecentes] 
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * 📤 MÉTODO POST
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, id, ip, porta, modo } = body;

    const chaveMemoria = ip ? ip.trim() : id;

    if (!chaveMemoria) {
      return NextResponse.json({ error: 'IP ou ID do equipamento não fornecido.' }, { status: 400 });
    }

    if (action === 'STATUS') {
      const leitora = leitorasAtivas[chaveMemoria];
      if (!leitora) return NextResponse.json({ status: 'desconectado', tagsRecentes: [] });
      return NextResponse.json({ status: leitora.status, tagsRecentes: [...leitora.tagsRecentes] });
    }

    if (action === 'START') {
      pararConexao(chaveMemoria);

      leitorasAtivas[chaveMemoria] = { 
        status: 'tentando',
        tagsRecentes: [] 
      };

      if (modo === 'SERVER') {
        const server = net.createServer((socket) => {
          console.log(`🔌 [Zebra LLRP] Conexão TCP recebida de: ${socket.remoteAddress}`);
          
          if (leitorasAtivas[chaveMemoria]) leitorasAtivas[chaveMemoria].status = 'conectado';

          socket.on('data', async (data) => {
            const tags = extrairTagsDoBufferLLRP(data);

            if (tags && tags.length > 0) {
              for (const tagFormatada of tags) {
                console.log(`🎯 Tag LLRP Detectada (Server): ${tagFormatada}`);

                if (leitorasAtivas[chaveMemoria]) {
                  leitorasAtivas[chaveMemoria].tagsRecentes.unshift({
                    tag: tagFormatada,
                    dataHora: obterHoraAtual(),
                    antena: 'PORTAL LLRP (S)'
                  });
                  if (leitorasAtivas[chaveMemoria].tagsRecentes.length > 15) leitorasAtivas[chaveMemoria].tagsRecentes.pop();
                }

                await axios.post('http://localhost:3000/api/cronometragem', {
                  transponder: tagFormatada,
                  ipAntena: socket.remoteAddress || ip
                }).catch(() => console.error("Erro ao enviar tag para cronometragem"));
              }
            }
          });

          socket.on('end', () => { if(leitorasAtivas[chaveMemoria]) leitorasAtivas[chaveMemoria].status = 'desconectado'; });
          socket.on('error', () => { if(leitorasAtivas[chaveMemoria]) leitorasAtivas[chaveMemoria].status = 'desconectado'; });
        });

        server.listen(porta, () => {
          console.log(`🚀 Servidor aguardando LLRP na porta ${porta}`);
        });

        leitorasAtivas[chaveMemoria].socketServer = server;

      } else {
        // 📡 MODO CLIENT CORRIGIDO COM SEQUÊNCIA ROSPEC
        console.log(`📡 Tentando conectar no Servidor LLRP da Zebra em ${ip}:${porta}...`);
        
        const client = net.createConnection({ host: ip, port: Number(porta)}, () => {
          console.log(`✅ Conexão LLRP Estabelecida com sucesso no IP ${ip}`);
          if (leitorasAtivas[chaveMemoria]) leitorasAtivas[chaveMemoria].status = 'conectado';

          // Executa a carga sequencial de comandos de leitura na Zebra
          setTimeout(() => {
            console.log("📤 Enviando: ADD_ROSPEC...");
            client.write(BUFFER_ADD_ROSPEC);
          }, 200);
          
          setTimeout(() => {
            console.log("📤 Enviando: ENABLE_ROSPEC...");
            client.write(BUFFER_ENABLE_ROSPEC);
          }, 500);

          setTimeout(() => {
            console.log("📤 Enviando: START_ROSPEC...");
            client.write(BUFFER_START_ROSPEC);
            console.log("🏁 Comando START_ROSPEC enviado com sucesso!");
          }, 800);
        });

        client.on('data', async (data) => {
          const tags = extrairTagsDoBufferLLRP(data);

          console.log(`📥 Dados recebidos do LLRP. Tamanho: ${data.length} bytes. Tags extraídas: ${tags.length}`);

          if (tags && tags.length > 0) {
            for (const tagFormatada of tags) {
              console.log(`🎯 Tag LLRP Detectada (Client): ${tagFormatada}`);

              if (leitorasAtivas[chaveMemoria]) {
                leitorasAtivas[chaveMemoria].tagsRecentes.unshift({
                  tag: tagFormatada,
                  dataHora: obterHoraAtual(),
                  antena: 'LEITORA LLRP (C)'
                });
                if (leitorasAtivas[chaveMemoria].tagsRecentes.length > 15) leitorasAtivas[chaveMemoria].tagsRecentes.pop();
              }

              await axios.post('http://localhost:3000/api/cronometragem', {
                transponder: tagFormatada,
                ipAntena: ip
              }).catch(() => console.error("Erro ao enviar tag para backend de cronometragem"));
            }
          }
        });

        client.on('error', (err) => { 
          console.error(`❌ Erro na conexão com a leitora:`, err.message);
          if(leitorasAtivas[chaveMemoria]) leitorasAtivas[chaveMemoria].status = 'desconectado'; 
        });
        
        client.on('end', () => { if(leitorasAtivas[chaveMemoria]) leitorasAtivas[chaveMemoria].status = 'desconectado'; });

        leitorasAtivas[chaveMemoria].socketClient = client;
      }
      
      await new Promise(resolve => setTimeout(resolve, 300));
      return NextResponse.json({ success: true, status: leitorasAtivas[chaveMemoria]?.status || 'tentando' });
    }

    if (action === 'STOP') {
      pararConexao(chaveMemoria);
      return NextResponse.json({ success: true, status: 'desconectado' });
    }

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

function pararConexao(chave: string) {
  if (leitorasAtivas[chave]) {
    if (leitorasAtivas[chave].socketClient) {
      try { 
        console.log("🛑 Desligando irradiadores das antenas (STOP_ROSPEC)...");
        leitorasAtivas[chave].socketClient?.write(BUFFER_STOP_ROSPEC);
      } catch(e){}
      
      // Pequeno delay controlado para o hardware desligar antes do descarte do socket
      setTimeout(() => {
        try { leitorasAtivas[chave].socketClient?.destroy(); } catch(e){}
      }, 250);
    }
    
    if (leitorasAtivas[chave].socketServer) {
      try { leitorasAtivas[chave].socketServer?.close(); } catch(e){}
    }
    leitorasAtivas[chave].status = 'desconectado';
    leitorasAtivas[chave].tagsRecentes = [];
  }
}