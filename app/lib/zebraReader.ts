// app/lib/zebraReader.ts
import { LLRPClient, LLRPCore } from "llrpjs";
import { EventEmitter } from "events";

export interface TagData {
  epc: string;
  rawEpc?: string;
  timestamp: string;
}

const ROSPEC_CONFIG = {
  ROSpecID: 1,
  Priority: 0,
  CurrentState: "Disabled",
  ROBoundarySpec: {
    ROSpecStartTrigger: { ROSpecStartTriggerType: "Null" },
    ROSpecStopTrigger: { ROSpecStopTriggerType: "Null", DurationTriggerValue: 0 }
  },
  AISpec: [
    {
      AntennaIDs: [0], // Altere para [1, 2, 3, 4] se o firmware rejeitar 0
      AISpecStopTrigger: { AISpecStopTriggerType: "Null", DurationTrigger: 0 },
      InventoryParameterSpec: [
        {
          InventoryParameterSpecID: 1,
          ProtocolID: "EPCGlobalClass1Gen2"
        }
      ]
    }
  ],
  ROReportSpec: {
    ROReportTrigger: "Upon_N_Tags_Or_End_Of_ROSpec",
    N: 1,
    TagReportContentSelector: {
      EnableROSpecID: false,
      EnableSpecIndex: false,
      EnableInventoryParameterSpecID: false,
      EnableAntennaID: true,
      EnableChannelIndex: false,
      EnablePeakRSSI: true,
      EnableFirstSeenTimestamp: false,
      EnableLastSeenTimestamp: false,
      EnableTagSeenCount: true,
      C1G2EPCMemorySelector: {
        EnableCRC: false,
        EnablePCBits: false
      }
    }
  }
};

function extractTagNumber(rawEpc: string): string {
  const cleanEpc = String(rawEpc).trim();

  if (cleanEpc.endsWith("000")) {
    const withoutSuffix = cleanEpc.slice(0, -3);
    
    const match = withoutSuffix.match(/0426D1*(\d+?)$/);
    if (match) {
      return String(Number(match[1]));
    }
  }

  const numericMatch = cleanEpc.match(/10*(\d+?)0*$/);
  if (numericMatch && numericMatch[1]) {
    return String(Number(numericMatch[1]));
  }

  return cleanEpc;
}
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

class ZebraReaderManager extends EventEmitter {
  private reader: any = null;
  private isReading: boolean = false;
  private ip: string = "192.168.1.121";
  private port: number = 5084;
  private readHistory: Map<string, number> = new Map();
  private cooldownMs: number = 10000;
  private cleanupInterval: NodeJS.Timeout | null = null;

  // 🔄 CONTROLE DE RECONEXÃO AUTOMÁTICA
  private autoReconnect: boolean = true;
  private isReconnecting: boolean = false;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private reconnectIntervalMs: number = 5000; // Tentativa a cada 5 segundos

  public setCooldown(ms: number) {
    this.cooldownMs = ms;
  }

  public clearHistory() {
    this.readHistory.clear();
  }

  public setAutoReconnect(enabled: boolean) {
    this.autoReconnect = enabled;
  }

  constructor() {
    super();
    this.setMaxListeners(50);
    this.startHistoryCleanup();
  }

  private startHistoryCleanup() {
    if (this.cleanupInterval) clearInterval(this.cleanupInterval);
    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      for (const [epc, lastSeen] of this.readHistory.entries()) {
        if (now - lastSeen > this.cooldownMs * 2) {
          this.readHistory.delete(epc);
        }
      }
    }, 30000);
  }

  async connect(ip?: string, port?: number): Promise<boolean> {
    if (ip) this.ip = ip;
    if (port) this.port = port;

    if (this.reader) return true;

    try {
      // Destrói leitor anterior se houver resquício de socket preso
      this.destroySocket();

      this.reader = new LLRPClient({ host: this.ip, port: this.port });

      this.reader.on("RO_ACCESS_REPORT", (msg: any) => {
        if (!this.isReading) return;

        let tagReportDataList = msg.getTagReportData();
        if (!tagReportDataList) return;

        if (!Array.isArray(tagReportDataList)) {
          tagReportDataList = [tagReportDataList];
        }

        for (const tagReportData of tagReportDataList) {
          try {
            const epcParam = tagReportData.getEPCParameter();
            if (epcParam) {
              const rawEpc = String(epcParam.getEPC()).toUpperCase();
              const parsedEpc = extractTagNumber(rawEpc);

              const lastSeen = this.readHistory.get(parsedEpc);
              const now = Date.now();
              if (lastSeen && now - lastSeen < this.cooldownMs) {
                continue;
              }
              this.readHistory.set(parsedEpc, now);

              const tag: TagData = {
                epc: parsedEpc,
                rawEpc: rawEpc,
                timestamp: new Date().toLocaleString("pt-BR")
              };

              console.log(`[Zebra FX7400] Tag lida: ${tag.epc} (Raw: ${tag.rawEpc})`);
              this.emit("tag", tag);
            }
          } catch (err) {
            console.error("[Zebra FX7400] Erro ao extrair EPC:", err);
          }
        }
      });

      this.reader.on("connect", async () => {
        console.log(`[Zebra FX7400] Conectado via LLRP em ${this.ip}:${this.port}`);
        this.isReconnecting = false;
        if (this.reconnectTimer) {
          clearTimeout(this.reconnectTimer);
          this.reconnectTimer = null;
        }

        this.emit("status", { connected: true, reading: this.isReading });

        // 🔄 Se o leitor caiu durante uma prova/leitura ativa, re-inicia as antenas automaticamente
        if (this.isReading) {
          console.log("[Zebra FX7400] Restabelecendo transmissão RF após reconexão...");
          await this.configureAndStartAntennas();
        }
      });

      this.reader.on("disconnect", () => {
        console.warn("[Zebra FX7400] Conexão LLRP perdida com o leitor.");
        this.reader = null;
        this.emit("status", { connected: false, reading: this.isReading });
        this.scheduleReconnect();
      });

      this.reader.on("error", (err: any) => {
        console.error("[Zebra FX7400] Erro de socket/rede:", err?.message || err);
        // Em erros críticos de rede, força desconexão para disparar o re-try
        this.scheduleReconnect();
      });

      await this.reader.connect();
      return true;

    } catch (err) {
      console.error("[Zebra FX7400] Falha ao tentar conectar no IP:", err);
      this.reader = null;
      this.scheduleReconnect();
      return false;
    }
  }

  // 🔄 AGENDADOR DE RECONEXÃO
  private scheduleReconnect() {
    if (!this.autoReconnect || this.isReconnecting) return;

    this.isReconnecting = true;
    this.destroySocket();

    console.log(`[Zebra FX7400] Tentando reconectar em ${this.reconnectIntervalMs / 1000}s...`);

    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);

    this.reconnectTimer = setTimeout(async () => {
      this.isReconnecting = false;
      await this.connect();
    }, this.reconnectIntervalMs);
  }

  private destroySocket() {
    if (this.reader) {
      try {
        if (typeof this.reader.disconnect === "function") this.reader.disconnect();
        if (typeof this.reader.destroy === "function") this.reader.destroy();
      } catch (e) {
        // Ignora erros ao fechar socket já morto
      }
      this.reader = null;
    }
  }

  async startReading() {
    if (this.isReading && this.reader) {
      console.log("[Zebra FX7400] Leitura já está em andamento.");
      return;
    }

    this.isReading = true;

    if (!this.reader) {
      const ok = await this.connect(this.ip, this.port);
      if (!ok) {
        console.warn("[Zebra FX7400] Leitor indisponível no momento.");
        return;
      }
    } else {
      // Dispara a ativação em background sem travar a thread de execução da API
      this.configureAndStartAntennas().catch((err) =>
        console.error("[Zebra FX7400] Erro ao ativar antenas:", err)
      );
    }
  }

  // Isolado para poder ser chamado tanto no startReading quanto no re-connect automático
  private async configureAndStartAntennas() {
    console.log("[Zebra FX7400] Enviando comandos de ativação LLRP...");
    const Core = LLRPCore as any;

    const sendCmd = async (cmd: any, label: string) => {
      try {
        if (!this.reader) return false;
        
        // Usa send() em vez de transact() se disponível para não travar aguardando ACK
        if (typeof this.reader.send === "function") {
          await this.reader.send(cmd);
        } else if (typeof this.reader.write === "function") {
          await this.reader.write(cmd);
        } else if (typeof this.reader.transact === "function") {
          // Timeout rápido de segurança
          await Promise.race([
            this.reader.transact(cmd),
            new Promise((res) => setTimeout(res, 800))
          ]);
        }
        console.log(`[Zebra FX7400] Comando enviado: ${label}`);
        return true;
      } catch (err: any) {
        console.warn(`[Zebra FX7400] Aviso ao enviar ${label}:`, err?.message || err);
        return false;
      }
    };

    try {
      // 1. Limpa ROSpecs anteriores
      const deleteCmd = Core.DELETE_ROSPEC
        ? new Core.DELETE_ROSPEC({ data: { ROSpecID: 0 } })
        : new Core.deleteROSpec({ ROSpecID: 0 });
      await sendCmd(deleteCmd, "DELETE_ROSPEC");
      await sleep(300); // Pausa crucial para o processador da Zebra FX7400

      // 2. Adiciona a ROSpec
      const addCmd = Core.ADD_ROSPEC
        ? new Core.ADD_ROSPEC({ data: { ROSpec: ROSPEC_CONFIG } })
        : new Core.addROSpec({ ROSpec: ROSPEC_CONFIG });
      await sendCmd(addCmd, "ADD_ROSPEC");
      await sleep(300);

      // 3. Habilita a ROSpec
      const enableCmd = Core.ENABLE_ROSPEC
        ? new Core.ENABLE_ROSPEC({ data: { ROSpecID: 1 } })
        : new Core.enableROSpec({ ROSpecID: 1 });
      await sendCmd(enableCmd, "ENABLE_ROSPEC");
      await sleep(300);

      // 4. Inicia a ROSpec
      const startCmd = Core.START_ROSPEC
        ? new Core.START_ROSPEC({ data: { ROSpecID: 1 } })
        : new Core.startROSpec({ ROSpecID: 1 });
      await sendCmd(startCmd, "START_ROSPEC");

      console.log("[Zebra FX7400] Antenas operacionais! Leitura iniciada.");
    } catch (err: any) {
      console.error("[Zebra FX7400] Falha na sequência de comandos:", err?.message || err);
    }
  }

  // app/lib/zebraReader.ts

async stopReading() {
  this.isReading = false;

  if (!this.reader) return;

  try {
    const Core = LLRPCore as any;
    const stopCmd = Core.STOP_ROSPEC 
      ? new Core.STOP_ROSPEC({ data: { ROSpecID: 1 } })
      : new Core.stopROSpec({ ROSpecID: 1 });

    console.log("[Zebra FX7400] Enviando comando STOP_ROSPEC...");

    // Tenta enviar o comando sem travar a Promise caso a Zebra não responda
    await Promise.race([
      (async () => {
        if (typeof this.reader.send === "function") {
          await this.reader.send(stopCmd);
        } else if (typeof this.reader.write === "function") {
          await this.reader.write(stopCmd);
        } else if (typeof this.reader.transact === "function") {
          await this.reader.transact(stopCmd);
        }
      })(),
      new Promise((res) => setTimeout(res, 600)) // Timeout forçado de 600ms
    ]);

    console.log("[Zebra FX7400] Leitura de RF finalizada.");
  } catch (err: any) {
    console.warn("[Zebra FX7400] Aviso ao parar ROSpec (continuando encerramento):", err?.message || err);
  }
}

  // Método para encerrar intencionalmente a conexão sem disparar re-tentativa
  public disconnect() {
    this.autoReconnect = false;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.destroySocket();
    this.isReading = false;
    console.log("[Zebra FX7400] Desconectado manualmente.");
  }
}

const globalForZebra = global as unknown as { zebraManager: ZebraReaderManager };
export const zebraManager = globalForZebra.zebraManager || new ZebraReaderManager();

if (process.env.NODE_ENV !== "production") {
  globalForZebra.zebraManager = zebraManager;
}