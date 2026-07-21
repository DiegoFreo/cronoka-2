'use client';
import React, { useState, useEffect, Suspense, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { 
  Volume2, Play, Pause, UserPlus, 
  Settings, FileText, ArrowLeft, Loader2, Radio 
} from 'lucide-react';

interface Evento {
  _id: string;
  nome: string;
  local: string;
}

interface Categoria {
  _id: string;
  nome: string;
}

interface Bateria {
  _id: string;
  nome: string;
  tempoProva: number;
  voltasExtras: number;
  categoriaId?: string[] | Categoria[] | any;
}

interface Piloto {
  _id: string;
  nome: string;
  numeral: string;
  transponder: string;
  categoriasIds: string[] | Categoria[] | any;
  voltas?: number;
  tempoTotalMs?: number;
  melhorVoltaMs?: number;
  ultimaPassagemMs?: number;
  ultimaVoltaMs?: number;     
  historicoVoltas?: number[]; 
}

function ConteudoCronometragem() {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const bateriaId = searchParams.get('bateriaId');
  const eventoId = searchParams.get('eventoId');
  const origem = searchParams.get('origem');

  // Ajuste o caminho padrão do arquivo do leitor aqui (ou via parâmetro de busca se preferir)
  const caminhoLogRfid = searchParams.get('caminhoLog') || 'C:\\TagFX7400\\Dados.txt';

  // Estados dos Dados Backend
  const [evento, setEvento] = useState<Evento | null>(null);
  const [todasBaterias, setTodasBaterias] = useState<Bateria[]>([]);
  const [categoriasBateria, setCategoriasBateria] = useState<Categoria[]>([]);
  const [pilotos, setPilotos] = useState<Piloto[]>([]);

  // ENGINE DO CRONÔMETRO PROGRESSIVO
  const [tempoDecorridoMs, setTempoDecorridoMs] = useState<number>(0);
  const [corridaAtiva, setCorridaAtiva] = useState(false);
  const intervaloRef = useRef<NodeJS.Timeout | null>(null);
  const momentoUltimoStartRef = useRef<number>(0);

  // MOMENTO REAL DA LARGADA (Para sincronizar o horário individual das tags do arquivo)
  const momentoLargadaRef = useRef<number | null>(null);

  // Ref para garantir que os handlers sempre acessem a lista e estado mais recentes sem problemas de closure
  const pilotosRef = useRef<Piloto[]>([]);
  const tempoDecorridoRef = useRef<number>(0);

  useEffect(() => {
    pilotosRef.current = pilotos;
  }, [pilotos]);

  useEffect(() => {
    tempoDecorridoRef.current = tempoDecorridoMs;
  }, [tempoDecorridoMs]);

  // ESTADOS DE DESEMPENHO DA PISTA
  const [idPilotoMelhorVolta, setIdPilotoMelhorVolta] = useState<string | null>(null);
  const [tempoMelhorVoltaMs, setTempoMelhorVoltaMs] = useState<number | null>(null);
  const [numeroMotoInput, setNumeroMotoInput] = useState<string>('');
  
  // Estado para travar o clique duplo ao salvar
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (bateriaId && eventoId) {
      carregarDadosPista(eventoId, bateriaId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bateriaId, eventoId]);

  // Motor do Cronômetro Local (Frontend)
  useEffect(() => {
    if (corridaAtiva) {
      momentoUltimoStartRef.current = Date.now() - tempoDecorridoMs;

      intervaloRef.current = setInterval(() => {
        const tempoAtual = Date.now() - momentoUltimoStartRef.current;
        setTempoDecorridoMs(tempoAtual);
      }, 10);
    } else {
      if (intervaloRef.current) clearInterval(intervaloRef.current);
    }

    return () => {
      if (intervaloRef.current) clearInterval(intervaloRef.current);
    };
  }, [corridaAtiva, tempoDecorridoMs]);

  // 📡 LEITURA AUTOMÁTICA CONTINUA DO ARQUIVO RFID (Zebra FX7400)
  useEffect(() => {
    let rfidInterval: NodeJS.Timeout | null = null;

    if (corridaAtiva) {
      rfidInterval = setInterval(async () => {
        try {
          const res = await fetch(`/api/leitora-arquivo?caminho=${encodeURIComponent(caminhoLogRfid)}`);
          if (res.ok) {
            const data = await res.json();
            
            // Se encontrou novas leituras no arquivo
            if (data.tagsRecentes && data.tagsRecentes.length > 0) {
              data.tagsRecentes.forEach((itemTag: { tag: string; tagCompleta?: string; timestampMs?: number }) => {
                const tagIdentificada = itemTag.tag;
                
                // Busca o piloto correspondente pelo transponder ou numeral extraído
                const pilotoEncontrado = pilotosRef.current.find(
                  p => p.transponder === tagIdentificada || 
                       p.transponder === itemTag.tagCompleta ||
                       p.numeral === tagIdentificada
                );

                if (pilotoEncontrado) {
                  // Passa o numeral do piloto E o timestamp gravado na tag do arquivo
                  processarPassagemAutomatica(pilotoEncontrado.numeral, itemTag.timestampMs);
                }
              });
            }
          }
        } catch (error) {
          console.error("Erro ao ler log do leitor RFID:", error);
        }
      }, 100); // Executa a leitura a cada 100ms
    }

    return () => {
      if (rfidInterval) clearInterval(rfidInterval);
    };
  }, [corridaAtiva, caminhoLogRfid]);

  // 🔄 1. SYNC BACKEND: Polling com mesclagem inteligente de dados locais
  useEffect(() => {
    let pollingInterval: NodeJS.Timeout | null = null;

    if (corridaAtiva && bateriaId) {
      pollingInterval = setInterval(async () => {
        try {
          const res = await fetch(`/api/resultados?bateriaId=${bateriaId}`);
          if (res.ok) {
            const dadosCorrida = await res.json();
            
            if (dadosCorrida && dadosCorrida.gridFinal && dadosCorrida.gridFinal.length > 0) {
              
              if (dadosCorrida.melhorVoltaDaProvaMs) setTempoMelhorVoltaMs(dadosCorrida.melhorVoltaDaProvaMs);
              if (dadosCorrida.idPilotoMelhorVolta) setIdPilotoMelhorVolta(dadosCorrida.idPilotoMelhorVolta);

              setPilotos((pilotosLocais) => {
                const atualizados = dadosCorrida.gridFinal.map((pRemoto: any) => {
                  const localMatch = pilotosLocais.find(pl => pl._id === pRemoto.pilotoId);
                  const usaLocal = localMatch && (localMatch.voltas || 0) > (pRemoto.voltas || 0);

                  return {
                    ...localMatch,
                    _id: pRemoto.pilotoId,
                    nome: pRemoto.nome,
                    numeral: pRemoto.numeral,
                    voltas: usaLocal ? localMatch.voltas : pRemoto.voltas,
                    tempoTotalMs: usaLocal ? localMatch.tempoTotalMs : pRemoto.tempoTotalMs,
                    melhorVoltaMs: usaLocal ? localMatch.melhorVoltaMs : pRemoto.melhorVoltaMs,
                    historicoVoltas: usaLocal ? localMatch.historicoVoltas : (pRemoto.historicoVoltas || []),
                    categoriasIds: localMatch?.categoriasIds || []
                  };
                });

                pilotosLocais.forEach(pl => {
                  const existeNoRemoto = dadosCorrida.gridFinal.some((pr: any) => pr.pilotoId === pl._id);
                  if (!existeNoRemoto) {
                    atualizados.push(pl);
                  }
                });

                return updatedSort(atualizados);
              });
            }
          }
        } catch (error) {
          console.error("Erro no sincronismo do live-timing:", error);
        }
      }, 1500);
    }

    return () => {
      if (pollingInterval) clearInterval(pollingInterval);
    };
  }, [corridaAtiva, bateriaId]);

  const updatedSort = (lista: Piloto[]) => {
    return [...lista].sort((a, b) => {
      const vA = a.voltas || 0;
      const vB = b.voltas || 0;
      if (vB !== vA) return vB - vA;
      return (a.tempoTotalMs || 0) - (b.tempoTotalMs || 0);
    });
  };

  const carregarDadosPista = async (idEv: string, idBat: string) => {
    try {
      const [resEvGeral, resBatGeral] = await Promise.all([
        fetch('/api/evento'),
        fetch(`/api/bateria?evento=${idEv}`)
      ]);

      let listaEventos = resEvGeral.ok ? await resEvGeral.json() : [];
      let listaBaterias = resBatGeral.ok ? await resBatGeral.json() : [];

      if (!Array.isArray(listaBaterias) || listaBaterias.length === 0) {
        const resBatLivre = await fetch('/api/bateria');
        if (resBatLivre.ok) {
          const todas = await resBatLivre.json();
          listaBaterias = Array.isArray(todas) ? todas.filter((b: any) => String(b.evento || b.eventoId) === String(idEv)) : [];
        }
      }

      setTodasBaterias(Array.isArray(listaBaterias) ? listaBaterias : []);

      let dadosEv = Array.isArray(listaEventos) ? listaEventos.find((e: any) => String(e._id) === String(idEv)) : null;
      let dadosBat = Array.isArray(listaBaterias) ? listaBaterias.find((b: any) => String(b._id) === String(idBat)) : null;

      if (!dadosEv) {
        const resEvUnico = await fetch(`/api/evento/${idEv}`);
        if (resEvUnico.ok) dadosEv = await resEvUnico.json();
      }
      if (!dadosBat) {
        const resBatUnico = await fetch(`/api/bateria/${idBat}`);
        if (resBatUnico.ok) dadosBat = await resBatUnico.json();
      }

      if (!dadosEv) dadosEv = { _id: idEv, nome: "GP MOTOCROSS", local: "Pista Oficial" };
      if (!dadosBat) dadosBat = { _id: idBat, nome: "1ª BATERIA", tempoProva: 15, voltasExtras: 2 };

      if (typeof dadosBat.tempoProva !== 'number') dadosBat.tempoProva = 15; 

      setEvento(dadosEv);
      setTempoDecorridoMs(0);
      setIdPilotoMelhorVolta(null);
      setTempoMelhorVoltaMs(null);
      momentoLargadaRef.current = null; // Reinicia momento da largada

      const arrayCategoriasBruto = dadosBat.categoriasIds || dadosBat.categoriesIds || dadosBat.categoriaId || [];
      const catIdsBateria = (Array.isArray(arrayCategoriasBruto) ? arrayCategoriasBruto : [])
        .map((id: any) => {
          if (!id) return '';
          return typeof id === 'object' ? String(id._id || id.id || '') : String(id);
        })
        .filter((id: string) => id !== '');

      const resCat = await fetch(`/api/categoria?evento=${idEv}`);
      let listaCategorias: Categoria[] = [];
      if (resCat.ok) {
        const jsonCat = await resCat.json();
        if (Array.isArray(jsonCat)) {
          listaCategorias = jsonCat.filter((c: any) => catIdsBateria.includes(String(c._id)));
        }
      }
      setCategoriasBateria(listaCategorias);

      const resPil = await fetch(`/api/piloto?evento=${idEv}`);
      if (resPil.ok) {
        const todosPilotos = await resPil.json();
        if (Array.isArray(todosPilotos)) {
          const pilotosFiltrados = todosPilotos.filter((piloto: any) => {
            const arrayPilotoCats = piloto.categoriasIds || piloto.categoriaId || [];
            const pCatIds = (Array.isArray(arrayPilotoCats) ? arrayPilotoCats : [])
              .map((id: any) => {
                if (!id) return '';
                return typeof id === 'object' ? String(id._id || id.id || '') : String(id);
              });
            
            return pCatIds.some((idStr: string) => catIdsBateria.includes(idStr));
          });

          const pilotosProntos = pilotosFiltrados.map(p => ({
            ...p,
            voltas: 0,
            tempoTotalMs: 0,
            melhorVoltaMs: 0,
            ultimaPassagemMs: 0,
            ultimaVoltaMs: 0,      
            historicoVoltas: []    
          }));

          setPilotos(pilotosProntos);
        }
      }

    } catch (err) {
      console.error("Erro geral de sincronização:", err);
    }
  };

  const alternarEstadoCorrida = async () => {
    const proximoEstado = !corridaAtiva;
    setCorridaAtiva(proximoEstado);

    // Se estiver dando a largada pela primeira vez, grava a hora de início exata do relógio
    if (proximoEstado && !momentoLargadaRef.current) {
      momentoLargadaRef.current = Date.now();
    }

    if (bateriaId) {
      try {
        await fetch(`/api/bateria/${bateriaId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: proximoEstado ? 'Na_Pista' : 'Agendada' })
        });
      } catch (err) {
        console.error("Erro ao alterar status da bateria no MongoDB:", err);
      }
    }
  };

  // Função interna para computar a passagem (usada tanto no manual quanto nas tags automáticas)
  const processarPassagemAutomatica = (numeralMoto: string, timestampTagMs?: number) => {
    // Se a tag veio com o timestamp do arquivo de log, calcula a diferença em relação à largada
    // Se não veio (ex: inserção manual), utiliza o tempo decorrido do relógio
    let tempoLeituraNaProvaMs = tempoDecorridoRef.current;

    if (timestampTagMs && momentoLargadaRef.current) {
      tempoLeituraNaProvaMs = Math.max(0, timestampTagMs - momentoLargadaRef.current);
    }

    const motoLimpa = numeralMoto.trim();
    if (!motoLimpa) return;

    const pilotoDono = pilotosRef.current.find(p => String(p.numeral) === motoLimpa);
    if (!pilotoDono) return;

    // Trava de passagem mínima (ex: ignora leituras duplicadas dentro de 5 segundos)
    const tempoMinimoVoltaMs = 5000; 
    if (pilotoDono.ultimaPassagemMs && (tempoLeituraNaProvaMs - pilotoDono.ultimaPassagemMs) < tempoMinimoVoltaMs) {
      return; 
    }

    setPilotos(pilotosAtuais => {
      let novaMelhorVoltaMundial = tempoMelhorVoltaMs;
      let idDonoDaMelhorVolta = idPilotoMelhorVolta;

      const listaGridAtualizado = pilotosAtuais.map(p => {
        if (String(p.numeral) === motoLimpa) {
          const voltasAtuais = (p.voltas || 0) + 1;
          const momentoAnterior = p.ultimaPassagemMs || 0;
          const tempoDestaVolta = tempoLeituraNaProvaMs - momentoAnterior;

          const menorVoltaAnterior = p.melhorVoltaMs || 0;
          const novaMelhorVoltaPiloto = (menorVoltaAnterior === 0 || tempoDestaVolta < menorVoltaAnterior) 
            ? tempoDestaVolta 
            : menorVoltaAnterior;

          if (novaMelhorVoltaMundial === null || tempoDestaVolta < novaMelhorVoltaMundial) {
            novaMelhorVoltaMundial = tempoDestaVolta;
            idDonoDaMelhorVolta = p._id;
          }

          const historicoAtual = p.historicoVoltas || [];

          return {
            ...p,
            voltas: voltasAtuais,
            tempoTotalMs: tempoLeituraNaProvaMs,
            melhorVoltaMs: novaMelhorVoltaPiloto,
            ultimaPassagemMs: tempoLeituraNaProvaMs,
            ultimaVoltaMs: tempoDestaVolta, 
            historicoVoltas: [...historicoAtual, tempoDestaVolta] 
          };
        }
        return p;
      });

      if (idDonoDaMelhorVolta) setIdPilotoMelhorVolta(idDonoDaMelhorVolta);
      if (novaMelhorVoltaMundial) setTempoMelhorVoltaMs(novaMelhorVoltaMundial);

      return updatedSort(listaGridAtualizado);
    });

    // Envia ao banco a passagem registrada
    fetch('/api/cronometragem', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        transponder: pilotoDono.transponder || `ANTENA-${pilotoDono.numeral}`,
        numeral: pilotoDono.numeral,
        bateriaId: bateriaId,
        ipAntena: "Zebra FX7400 Log Reader"
      })
    }).catch(err => console.error("Erro ao registrar passagem via tag no BD:", err));
  };

  const registrarPassagemPiloto = async (numeralMoto: string) => {
    if (!corridaAtiva) {
      alert("Dê a largada na prova antes de passar as motos!");
      return;
    }

    const motoLimpa = numeralMoto.trim();
    if (!motoLimpa) return;

    const pilotoDono = pilotos.find(p => String(p.numeral) === motoLimpa);
    
    if (!pilotoDono) {
      alert(`Piloto com o numeral #${motoLimpa} não foi encontrado nesta bateria.`);
      return;
    }

    processarPassagemAutomatica(motoLimpa);
    setNumeroMotoInput('');
  };

  const finalizarProvaERegistrar = async () => {
    if (!eventoId || !bateriaId) {
      alert("Dados da prova incompletos para finalização.");
      return;
    }

    if (!confirm("Deseja fechar e finalizar a prova atual? O relatório será gerado em uma nova aba para comparação.")) {
      return;
    }

    try {
      setSalvando(true);
      setCorridaAtiva(false); 

      await fetch(`/api/bateria/${bateriaId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'Finalizada' })
      });

      const batteryObj = todasBaterias.find(b => String(b._id) === String(bateriaId));
      const nomeBateriaFinal = batteryObj?.nome || "BATERIA FINALIZADA";

      const gridFinalMapeado = pilotos.map((p, index) => {
        const pontosGanhos = index === 0 ? 25 : index === 1 ? 22 : index === 2 ? 20 : index === 3 ? 18 : 15;
        
        const pCatsDoMapeamento = p.categoriasIds || [];
        const pCatIdsLimpos = (Array.isArray(pCatsDoMapeamento) ? pCatsDoMapeamento : []).map((id: any) => 
          typeof id === 'object' ? String(id._id || id.id || '') : String(id)
        );
        const categoriaDoPiloto = categoriasBateria.find(c => pCatIdsLimpos.includes(String(c._id)));

        return {
          pilotoId: p._id,
          nome: p.nome,
          numeral: p.numeral,
          categoriaId: categoriaDoPiloto?._id || "",
          categoriaNome: categoriaDoPiloto?.nome || "Geral",
          posicao: index + 1,
          voltas: p.voltas || 0,
          tempoTotalMs: p.tempoTotalMs || 0,
          melhorVoltaMs: p.melhorVoltaMs || 0,
          pontosGanhos: p.voltas && p.voltas > 0 ? pontosGanhos : 0,
          historicoVoltas: p.historicoVoltas || [] 
        };
      });

      const resposta = await fetch('/api/resultados', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventoId,
          bateriaId,
          nomeBateria: nomeBateriaFinal,
          tempoTotalProvaMs: tempoDecorridoMs,
          melhorVoltaDaProvaMs: tempoMelhorVoltaMs || 0,
          idPilotoMelhorVolta: idPilotoMelhorVolta,
          gridFinal: gridFinalMapeado
        })
      });

      const dadosRetorno = await resposta.json();

      if (!resposta.ok) {
        throw new Error(dadosRetorno.error || "Erro desconhecido ao registrar corrida.");
      }

      const urlRetorno = origem ? `&origem=${encodeURIComponent(origem)}` : '';
      const urlRelatorio = `/admin/relatorios/${dadosRetorno.resultadoId}?novaAba=true${urlRetorno}`;
      
      window.open(urlRelatorio, '_blank');

    } catch (err: any) {
      console.error(err);
      alert(`Falha ao salvar relatório: ${err.message}`);
    } finally {
      setSalvando(false);
    }
  };

  const formatarMilenios = (totalMs: number) => {
    const minutes = Math.floor(totalMs / 60000);
    const segundos = Math.floor((totalMs % 60000) / 1000);
    const milissegundos = totalMs % 1000;
    return `${minutes.toString().padStart(2, '0')}:${segundos.toString().padStart(2, '0')}.${milissegundos.toString().padStart(3, '0')}`;
  };

  const formatarVoltaTabela = (ms?: number) => {
    if (!ms || ms === 0) return "00:00.000";
    const minutos = Math.floor(ms / 60000);
    const segundos = Math.floor((ms % 60000) / 1000);
    const milis = ms % 1000;
    return `${minutos.toString().padStart(2, '0')}:${segundos.toString().padStart(2, '0')}.${milis.toString().padStart(3, '0')}`;
  };

  const lidarMudancaBateria = (novaBateriaId: string) => {
    if (!novaBateriaId || novaBateriaId.startsWith('--')) return;
    setCorridaAtiva(false);
    
    const urlRetorno = origem ? `&origem=${encodeURIComponent(origem)}` : '';
    router.push(`/admin/corrida?eventoId=${eventoId}&bateriaId=${novaBateriaId}${urlRetorno}`);
  };

  const lidarVoltarPainel = () => {
    if (origem) {
      router.push(origem);
    } else {
      router.push('/admin/painel'); 
    }
  };

  const pilotoRecordista = pilotos.find(p => p._id === idPilotoMelhorVolta);

  const obterNomeRecordistaFormatado = () => {
    if (!pilotoRecordista || !pilotoRecordista.nome) return "---";
    const partes = pilotoRecordista.nome.split(' ');
    return `${partes[0]} ${partes[1] || ''}`.trim();
  };

  const textoCategoriasTopo = categoriasBateria.length > 0 
    ? categoriasBateria.map(c => c.nome).join(' - ')
    : "NENHUMA CLASSE SELECIONADA";

  return (
    <div className="h-screen w-screen bg-[#050505] text-zinc-100 font-sans antialiased flex p-4 gap-4 overflow-hidden select-none">
      
      <main className="flex-1 flex flex-col gap-4">
        
        <div className="text-center py-2 relative">
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-24 h-[2px] bg-gradient-to-r from-transparent to-red-600"></div>
          <h1 className="text-3xl font-black tracking-widest text-white uppercase font-sans">
            {evento?.nome || "NOME DA PROVA"}
          </h1>
          <p className="text-[11px] font-mono font-bold tracking-widest text-zinc-500 mt-1 uppercase">
            {textoCategoriasTopo}
          </p>
          <div className="absolute right-0 top-1/2 -translate-y-1/2 w-24 h-[2px] bg-gradient-to-l from-transparent to-red-600"></div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="bg-[#0b0b0c] border border-zinc-900/60 rounded-xl p-4 text-center flex flex-col justify-center min-h-[90px]">
            <p className="text-[10px] font-mono font-black text-zinc-500 tracking-wider uppercase flex items-center justify-center gap-1.5">
              ⏱️ TEMPO DE PROVA:
            </p>
            <p className="text-2xl font-black font-mono text-red-600 mt-1 tracking-tight">
              {formatarMilenios(tempoDecorridoMs)}
            </p>
          </div>

          <div className="bg-[#0b0b0c] border border-zinc-900/60 rounded-xl p-4 text-center flex flex-col justify-center min-h-[90px]">
            <p className="text-[10px] font-mono font-black text-zinc-500 tracking-wider uppercase flex items-center justify-center gap-1.5">
              🏎️ MELHOR VOLTA:
            </p>
            <p className="text-2xl font-black font-mono text-red-600 mt-1 tracking-tight">
              {tempoMelhorVoltaMs ? formatarVoltaTabela(tempoMelhorVoltaMs) : "00:00.000"}
            </p>
          </div>

          <div className="bg-[#0b0b0c] border border-zinc-900/60 rounded-xl p-4 text-center flex flex-col justify-center min-h-[90px]">
            <p className="text-[10px] font-mono font-black text-zinc-500 tracking-wider uppercase flex items-center justify-center gap-1.5">
              🚩 PILOTO COM A MELHOR VOLTA:
            </p>
            <p className="text-xl font-black font-sans text-white mt-1 tracking-wide uppercase">
              {obterNomeRecordistaFormatado()}
            </p>
          </div>
        </div>

        <div className="flex-1 bg-[#0b0b0c] border border-zinc-900/60 rounded-xl overflow-hidden flex flex-col">
          <div className="grid grid-cols-12 bg-[#080809] border-b border-zinc-900/80 px-4 py-2.5 text-[10px] font-mono font-bold text-zinc-500 uppercase tracking-wider text-center">
            <div className="col-span-1 text-left">POS.</div>
            <div className="col-span-2 text-left">PILOTO</div>
            <div className="col-span-1">#</div>
            <div className="col-span-2">CATEGORIA</div>
            <div className="col-span-1">VOLTA</div>
            <div className="col-span-1">ÚLTIMA VOLTA</div>
            <div className="col-span-1">TEMPO TOTAL</div>
            <div className="col-span-1">MELHOR VOLTA</div>
            <div className="col-span-1">DIFERENÇA</div>
            <div className="col-span-1 text-right">PONTOS</div>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-zinc-900/40 px-4 custom-scrollbar">
            {pilotos.length === 0 ? (
              <div className="text-center py-20 text-xs font-mono text-zinc-600 italic">
                Nenhum competidor cadastrado ou vinculado a esta bateria.
              </div>
            ) : (
              pilotos.map((p, index) => {
                const pontosGanhos = index === 0 ? 25 : index === 1 ? 22 : index === 2 ? 20 : index === 3 ? 18 : 15;
                const corBordaNumeral = index === 0 ? 'border-cyan-500 text-cyan-400 bg-cyan-950/20' : 'border-purple-500 text-purple-400 bg-purple-950/20';
                const corPontos = index === 0 || index === 1 ? 'text-emerald-500' : 'text-zinc-400';

                let diferencaTexto = "0.00";
                if (index > 0 && p.tempoTotalMs && pilotos[0].tempoTotalMs) {
                  const diff = (p.tempoTotalMs - pilotos[0].tempoTotalMs) / 1000;
                  diferencaTexto = `+${diff.toFixed(3)}`;
                }

                const pCatsDoMapeamento = p.categoriasIds || [];
                const pCatIdsLimpos = (Array.isArray(pCatsDoMapeamento) ? pCatsDoMapeamento : []).map((id: any) => 
                  typeof id === 'object' ? String(id._id || id.id || '') : String(id)
                );
                const categoriaDoPiloto = categoriasBateria.find(c => pCatIdsLimpos.includes(String(c._id)));

                return (
                  <div key={p._id || `piloto-${index}`} className="grid grid-cols-12 items-center py-3 text-xs font-mono font-bold text-center text-zinc-300 hover:bg-zinc-900/20 transition-colors">
                    <div className="col-span-1 text-left text-zinc-500 text-sm pl-1">{index + 1}</div>
                    
                    <div className="col-span-2 text-left flex items-center gap-2">
                      <div className={`w-[3px] h-4 ${index === 0 ? 'bg-cyan-500' : 'bg-purple-500'}`}></div>
                      <span className="text-white font-sans text-sm tracking-wide uppercase truncate">{p.nome}</span>
                    </div>
                    
                    <div className="col-span-1 flex justify-center">
                      <span className={`px-2 py-0.5 rounded text-xs font-black border ${corBordaNumeral} min-w-[32px]`}>
                        {p.numeral}
                      </span>
                    </div>
                    
                    <div className="col-span-2 text-zinc-400 uppercase font-sans text-[11px] truncate px-1">
                      {categoriaDoPiloto?.nome || "CONCURSO"}
                    </div>
                    
                    <div className="col-span-1 text-white text-sm">{p.voltas || 0}</div>
                    
                    <div className="col-span-1 text-cyan-400 font-medium">
                      {p.ultimaVoltaMs && p.ultimaVoltaMs > 0 ? formatarVoltaTabela(p.ultimaVoltaMs) : "00:00.000"}
                    </div>
                    
                    <div className="col-span-1 text-zinc-400">
                      {p.tempoTotalMs && p.tempoTotalMs > 0 ? formatarVoltaTabela(p.tempoTotalMs) : "00:00.000"}
                    </div>
                    
                    <div className="col-span-1 text-zinc-300 font-black">
                      {p.melhorVoltaMs && p.melhorVoltaMs > 0 ? formatarVoltaTabela(p.melhorVoltaMs) : "00:00.000"}
                    </div>
                    <div className="col-span-1 text-zinc-500">{p.voltas && p.voltas > 0 ? diferencaTexto : "---"}</div>
                    
                    <div className={`col-span-1 text-right pr-1 font-black text-sm ${corPontos}`}>
                      {p.voltas && p.voltas > 0 ? pontosGanhos : 0}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="flex justify-between items-center text-[10px] font-mono font-bold text-zinc-600 tracking-wider uppercase shrink-0 px-1">
          <span>SISTEMA DE CRONOMETRAGEM SC</span>
          <span className={`${corridaAtiva ? 'text-emerald-500' : 'text-amber-500'} flex items-center gap-1.5`}>
            <Radio size={12} className={corridaAtiva ? 'animate-pulse text-emerald-500' : 'text-amber-500'} />
            • {corridaAtiva ? 'MODO ONLINE (RECEPTOR RFID ATIVO)' : 'PROVA PAUSADA'}
          </span>
        </div>
      </main>

      <aside className="w-[280px] bg-[#0b0b0c] border border-zinc-900/80 rounded-xl p-4 flex flex-col gap-2.5 shrink-0">
        
        <button 
          onClick={lidarVoltarPainel}
          disabled={salvando}
          className="w-full bg-[#161619] hover:bg-zinc-800 text-zinc-300 hover:text-white font-sans font-bold text-xs py-3 px-4 rounded-xl border border-zinc-800/80 transition-all flex items-center justify-center gap-2 uppercase tracking-wide disabled:opacity-50"
        >
          <ArrowLeft size={15} className="text-zinc-400" /> Voltar ao Painel
        </button>

        <div className="h-[1px] bg-zinc-900/60 my-0.5"></div>

        <button className="w-full bg-[#121214] hover:bg-zinc-800 text-zinc-400 hover:text-white font-mono font-bold text-xs py-3 px-4 rounded-xl border border-zinc-900 transition-all flex items-center justify-center gap-2 uppercase tracking-wide">
          <Volume2 size={15} className="text-emerald-500" /> Ativar Aviso Sonoro
        </button>

        <button 
          onClick={alternarEstadoCorrida}
          disabled={salvando}
          className={`w-full font-sans font-black text-sm py-4 px-4 rounded-xl transition-all flex items-center justify-center gap-2 uppercase tracking-wider disabled:opacity-50 ${
            corridaAtiva ? 'bg-amber-600 hover:bg-amber-700 text-white' : 'bg-[#00a86b] hover:bg-emerald-600 text-white'
          }`}
        >
          {corridaAtiva ? (
            <><Pause size={15} fill="white" /> Pausar Prova</>
          ) : (
            <><Play size={15} fill="white" /> Dar Largada</>
          )}
        </button>

        <button 
          onClick={finalizarProvaERegistrar}
          disabled={salvando}
          className="w-full bg-red-600 hover:bg-red-700 text-white font-sans font-black text-sm py-4 px-4 rounded-xl transition-all flex items-center justify-center gap-2 uppercase tracking-wider disabled:bg-zinc-800 disabled:text-zinc-500"
        >
          {salvando ? (
            <><Loader2 size={15} className="animate-spin" /> Gravando...</>
          ) : (
            "Finalizar Prova"
          )}
        </button>

        <div className="h-[1px] bg-zinc-900 my-1"></div>

        <button className="w-full bg-[#121214] hover:bg-[#181a20] text-zinc-300 font-sans font-bold text-xs py-3 px-4 rounded-xl border border-zinc-900 hover:border-blue-900/50 transition-all flex items-center justify-center gap-2 uppercase tracking-wide">
          <UserPlus size={15} className="text-blue-500" /> + Incluir Piloto
        </button>

        <button className="w-full bg-[#121214] hover:bg-zinc-900 text-zinc-400 font-sans font-bold text-[11px] py-3 px-4 rounded-xl border border-zinc-900 transition-all text-center uppercase tracking-wide">
          Alterar Informações do Piloto
        </button>

        <button className="w-full bg-[#121214] hover:bg-[#1c1712] text-zinc-300 font-sans font-bold text-xs py-3 px-4 rounded-xl border border-zinc-900 hover:border-amber-900/50 transition-all flex items-center justify-center gap-2 uppercase tracking-wide">
          <Settings size={15} className="text-amber-500" /> Editar Bateria
        </button>

        <button className="w-full bg-[#121214] hover:bg-zinc-900 text-zinc-300 font-sans font-bold text-xs py-3 px-4 rounded-xl border border-zinc-900 transition-all flex items-center justify-center gap-2 uppercase tracking-wide">
          <FileText size={15} className="text-zinc-500" /> Relatório
        </button>

        <div className="mt-auto pt-4 border-t border-zinc-900 space-y-2">
          <label className="text-[10px] font-mono font-black text-zinc-500 tracking-wider uppercase block">
            Substituir/Passagem Manual de Moto
          </label>
          <div className="flex gap-1.5 font-mono">
            <input 
              type="text" 
              placeholder="# MOTO" 
              value={numeroMotoInput}
              onChange={(e) => setNumeroMotoInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && registrarPassagemPiloto(numeroMotoInput)}
              className="flex-1 bg-black border border-zinc-900 rounded-xl px-3 py-3 text-white text-center font-black placeholder-zinc-800 outline-none focus:border-zinc-700 uppercase"
            />
            <button 
              onClick={() => registrarPassagemPiloto(numeroMotoInput)}
              className="bg-[#121214] border border-zinc-900 text-zinc-400 font-black px-4 rounded-xl text-xs hover:text-white transition-all"
            >
              OK
            </button>
          </div>
        </div>

        <div className="space-y-1">
          <select 
            onChange={(e) => lidarMudancaBateria(e.target.value)}
            value={bateriaId || ''}
            className="w-full bg-black border border-zinc-900 text-zinc-300 font-sans font-medium text-xs rounded-xl p-3 outline-none cursor-pointer focus:border-zinc-700"
          >
            <option value="">-- Escolha a Bateria --</option>
            {todasBaterias.map((b) => (
              <option key={b._id} value={b._id}>
                {b.nome}
              </option>
            ))}
          </select>
        </div>

      </aside>
    </div>
  );
}

export default function TelaCronometragem() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center font-mono text-xs text-zinc-600 gap-2 animate-pulse">
        SINTONIZANDO RECEPTOR RFID...
      </div>
    }>
      <ConteudoCronometragem />
    </Suspense>
  );
}