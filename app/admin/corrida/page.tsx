'use client';

import React, { useState, useEffect, Suspense, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import ModalIncluirPiloto from '@/app/components/ModalIncluirPiloto';
import { 
  Volume2, VolumeX, Play, Pause, UserPlus, 
  Settings, FileText, ArrowLeft, Loader2, Radio, AlertTriangle, X,
  Clock, Edit2, Trash2, Check, History
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

interface TagDesconhecida {
  epc: string;
  ultimaLeitura: number;
}

function ConteudoCronometragem() {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const bateriaId = searchParams.get('bateriaId');
  const eventoId = searchParams.get('eventoId');
  const origem = searchParams.get('origem');

  // Estados dos Dados Backend
  const [evento, setEvento] = useState<Evento | null>(null);
  const [todasBaterias, setTodasBaterias] = useState<Bateria[]>([]);
  const [categoriasBateria, setCategoriasBateria] = useState<Categoria[]>([]);
  const [pilotos, setPilotos] = useState<Piloto[]>([]);

  // Estado de Controle dos Modais
  const [modalIncluirPilotoAberto, setModalIncluirPilotoAberto] = useState(false);
  const [pilotoParaEditar, setPilotoParaEditar] = useState<Piloto | null>(null);
  const [voltasEditando, setVoltasEditando] = useState<number[]>([]);

  const [tagsDesconhecidas, setTagsDesconhecidas] = useState<TagDesconhecida[]>([]);
  const [transponderParaVincular, setTransponderParaVincular] = useState<string>('');

  // ENGINE DO CRONÔMETRO PROGRESSIVO
  const [tempoDecorridoMs, setTempoDecorridoMs] = useState<number>(0);
  const [corridaAtiva, setCorridaAtiva] = useState(false);
  const intervaloRef = useRef<NodeJS.Timeout | null>(null);
  const momentoUltimoStartRef = useRef<number>(0);

  // ESTADO E LÓGICA DE AVISO SONORO
  const [avisoSonoroAtivo, setAvisoSonoroAtivo] = useState(false);
  const avisoSonoroRef = useRef<boolean>(false);
  const audioCtxRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    avisoSonoroRef.current = avisoSonoroAtivo;
  }, [avisoSonoroAtivo]);

  const tocarBip = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;

      if (!audioCtxRef.current) {
        audioCtxRef.current = new AudioCtx();
      }

      if (audioCtxRef.current.state === 'suspended') {
        audioCtxRef.current.resume();
      }

      const osc = audioCtxRef.current.createOscillator();
      const gain = audioCtxRef.current.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, audioCtxRef.current.currentTime);

      gain.gain.setValueAtTime(0.3, audioCtxRef.current.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtxRef.current.currentTime + 0.12);

      osc.connect(gain);
      gain.connect(audioCtxRef.current.destination);

      osc.start();
      osc.stop(audioCtxRef.current.currentTime + 0.12);
    } catch (err) {
      console.error("Erro ao emitir aviso sonoro:", err);
    }
  };

  const alternarAvisoSonoro = () => {
    const proximoEstado = !avisoSonoroAtivo;
    setAvisoSonoroAtivo(proximoEstado);
    if (proximoEstado) {
      tocarBip();
    }
  };

  const momentoLargadaRef = useRef<number | null>(null);

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
  
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (bateriaId && eventoId) {
      carregarDadosPista(eventoId, bateriaId);
    }
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

  // 📡 RECEPTOR RFID EM TEMPO REAL
  useEffect(() => {
    let eventSource: EventSource | null = null;

    if (corridaAtiva) {
      eventSource = new EventSource('/api/reader/stream');

      eventSource.onmessage = (event) => {
        try {
          const tagData = JSON.parse(event.data);
          if (tagData && tagData.epc) {
            const epcLido = tagData.epc.toUpperCase();

            const pilotoEncontrado = pilotosRef.current.find(
              p => p.transponder && p.transponder.toUpperCase() === epcLido
            );

            if (pilotoEncontrado) {
              processarPassagemAutomatica(pilotoEncontrado.numeral);
            } else {
              if (avisoSonoroRef.current) {
                tocarBip();
              }

              setTagsDesconhecidas((prev) => {
                const existe = prev.some(t => t.epc === epcLido);
                if (existe) {
                  return prev.map(t => t.epc === epcLido ? { ...t, ultimaLeitura: Date.now() } : t);
                }
                return [{ epc: epcLido, ultimaLeitura: Date.now() }, ...prev];
              });
            }
          }
        } catch (err) {
          console.error("Erro ao processar pacote da leitora RFID:", err);
        }
      };

      eventSource.onerror = (err) => {
        console.error("Erro na conexão EventSource com o leitor RFID:", err);
      };
    }

    return () => {
      if (eventSource) {
        eventSource.close();
      }
    };
  }, [corridaAtiva]);

  // 🔄 SYNC BACKEND: Live-Timing Polling
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

          setPilotos((pilotosAtuais) => {
            const pilotosProntos = pilotosFiltrados.map(p => {
              const pilotoExistente = pilotosAtuais.find(pa => pa._id === p._id);
              return {
                ...p,
                voltas: pilotoExistente ? pilotoExistente.voltas : 0,
                tempoTotalMs: pilotoExistente ? pilotoExistente.tempoTotalMs : 0,
                melhorVoltaMs: pilotoExistente ? pilotoExistente.melhorVoltaMs : 0,
                ultimaPassagemMs: pilotoExistente ? pilotoExistente.ultimaPassagemMs : 0,
                ultimaVoltaMs: pilotoExistente ? pilotoExistente.ultimaVoltaMs : 0,      
                historicoVoltas: pilotoExistente ? pilotoExistente.historicoVoltas : []    
              };
            });
            return updatedSort(pilotosProntos);
          });
        }
      }

    } catch (err) {
      console.error("Erro geral de sincronização:", err);
    }
  };

  const descartarTagDesconhecida = (epcParaRemover: string) => {
    setTagsDesconhecidas(prev => prev.filter(t => t.epc !== epcParaRemover));
  };

  const abrirModalComTransponder = (epc: string) => {
    setTransponderParaVincular(epc);
    setModalIncluirPilotoAberto(true);
  };

  const handlePilotoAdicionado = (novoPiloto?: Piloto) => {
    if (novoPiloto) {
      const pilotoFormatado: Piloto = {
        ...novoPiloto,
        voltas: 0,
        tempoTotalMs: 0,
        melhorVoltaMs: 0,
        ultimaPassagemMs: 0,
        ultimaVoltaMs: 0,
        historicoVoltas: []
      };

      if (novoPiloto.transponder) {
        descartarTagDesconhecida(novoPiloto.transponder.toUpperCase());
      }

      setPilotos(prev => updatedSort([...prev, pilotoFormatado]));
    }

    if (eventoId && bateriaId) {
      carregarDadosPista(eventoId, bateriaId);
    }
  };

  const alternarEstadoCorrida = async () => {
    const proximoEstado = !corridaAtiva;
    setCorridaAtiva(proximoEstado);

    if (proximoEstado) {
      if (!momentoLargadaRef.current) {
        momentoLargadaRef.current = Date.now();
      }

      try {
        await fetch('/api/reader/control', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'start' }),
        });
      } catch (err) {
        console.error("Erro ao enviar comando de start para a Zebra:", err);
      }
    } else {
      try {
        await fetch('/api/reader/control', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'stop' }),
        });
      } catch (err) {
        console.error("Erro ao enviar comando de stop para a Zebra:", err);
      }
    }

    if (bateriaId) {
      try {
        await fetch(`/api/bateria/${bateriaId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: proximoEstado ? 'Na_Pista' : 'Agendada' })
        });
      } catch (err) {
        console.error("Erro ao alterar status da bateria no BD:", err);
      }
    }
  };

  const processarPassagemAutomatica = (numeralMoto: string) => {
    const tempoLeituraNaProvaMs = tempoDecorridoRef.current;
    const motoLimpa = numeralMoto.trim();
    if (!motoLimpa) return;

    const pilotoDono = pilotosRef.current.find(p => String(p.numeral) === motoLimpa);
    if (!pilotoDono) return;

    const tempoMinimoVoltaMs = 5000; 
    if (pilotoDono.ultimaPassagemMs && (tempoLeituraNaProvaMs - pilotoDono.ultimaPassagemMs) < tempoMinimoVoltaMs) {
      return; 
    }

    if (avisoSonoroRef.current) {
      tocarBip();
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

    fetch('/api/cronometragem', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        transponder: pilotoDono.transponder || `TAG-${pilotoDono.numeral}`,
        numeral: pilotoDono.numeral,
        bateriaId: bateriaId,
        ipAntena: "Zebra FX7400 LLRP"
      })
    }).catch(err => console.error("Erro ao salvar passagem no banco de dados:", err));
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

  // 📝 LÓGICA DE EDIÇÃO EM TEMPO DE EXECUÇÃO
  const abrirEdicaoPiloto = (piloto: Piloto) => {
    setPilotoParaEditar(piloto);
    setVoltasEditando([...(piloto.historicoVoltas || [])]);
  };

  const fecharEdicaoPiloto = () => {
    setPilotoParaEditar(null);
    setVoltasEditando([]);
  };

  const atualizarTempoVoltaEmEdicao = (index: number, novoTempoMs: number) => {
    const novas = [...voltasEditando];
    novas[index] = Math.max(0, novoTempoMs);
    setVoltasEditando(novas);
  };

  const removerVoltaEmEdicao = (index: number) => {
    const novas = voltasEditando.filter((_, i) => i !== index);
    setVoltasEditando(novas);
  };

  const salvarEdicaoVoltasPiloto = () => {
    if (!pilotoParaEditar) return;

    setPilotos(pilotosAtuais => {
      const historicoNovo = voltasEditando;
      const novasVoltasCount = historicoNovo.length;
      
      const novoTempoTotal = historicoNovo.reduce((acc, t) => acc + t, 0);
      const novaMelhorVolta = historicoNovo.length > 0 ? Math.min(...historicoNovo) : 0;
      const novaUltimaVolta = historicoNovo.length > 0 ? historicoNovo[historicoNovo.length - 1] : 0;

      const atualizados = pilotosAtuais.map(p => {
        if (p._id === pilotoParaEditar._id) {
          return {
            ...p,
            voltas: novasVoltasCount,
            tempoTotalMs: novoTempoTotal,
            melhorVoltaMs: novaMelhorVolta,
            ultimaVoltaMs: novaUltimaVolta,
            historicoVoltas: historicoNovo
          };
        }
        return p;
      });

      // Recalcular recordista da prova
      let recordistaId: string | null = null;
      let menorTempoProva: number | null = null;

      atualizados.forEach(p => {
        if (p.melhorVoltaMs && p.melhorVoltaMs > 0) {
          if (menorTempoProva === null || p.melhorVoltaMs < menorTempoProva) {
            menorTempoProva = p.melhorVoltaMs;
            recordistaId = p._id;
          }
        }
      });

      setIdPilotoMelhorVolta(recordistaId);
      setTempoMelhorVoltaMs(menorTempoProva);

      return updatedSort(atualizados);
    });

    fecharEdicaoPiloto();
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

      // 1. Envia o stop do leitor via POST no mesmo endpoint padronizado
      await fetch('/api/reader/control', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'stop' })
      }).catch(() => {});

      // 2. Atualização do status da bateria
      try {
        await fetch(`/api/bateria/${bateriaId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'Finalizada' })
        });
      } catch (e) {
        console.warn("Aviso ao atualizar status da bateria:", e);
      }

      const batteryObj = todasBaterias.find(b => String(b._id) === String(bateriaId));
      const nomeBateriaFinal = batteryObj?.nome || "BATERIA FINALIZADA";

      // 3. Mapeamento higienizado dos dados do Grid
      const gridFinalMapeado = pilotos.map((p, index) => {
        const pontosGanhos = index === 0 ? 25 : index === 1 ? 22 : index === 2 ? 20 : index === 3 ? 18 : 15;
        
        const pCatsDoMapeamento = p.categoriasIds || [];
        const pCatIdsLimpos = (Array.isArray(pCatsDoMapeamento) ? pCatsDoMapeamento : []).map((id: any) => 
          typeof id === 'object' ? String(id._id || id.id || '') : String(id)
        );
        const categoriaDoPiloto = categoriasBateria.find(c => pCatIdsLimpos.includes(String(c._id)));

        return {
          pilotoId: String(p._id),
          nome: String(p.nome || 'Piloto sem nome'),
          numeral: String(p.numeral || '0'),
          categoriaId: categoriaDoPiloto?._id ? String(categoriaDoPiloto._id) : "",
          categoriaNome: categoriaDoPiloto?.nome || "Geral",
          posicao: index + 1,
          voltas: Number(p.voltas) || 0,
          tempoTotalMs: Number(p.tempoTotalMs) || 0,
          melhorVoltaMs: Number(p.melhorVoltaMs) || 0,
          pontosGanhos: (p.voltas && p.voltas > 0) ? pontosGanhos : 0,
          historicoVoltas: Array.isArray(p.historicoVoltas) ? p.historicoVoltas : [] 
        };
      });

      // 4. Payload com tratamento contra nulos/undefineds
      const payload = {
        eventoId: String(eventoId),
        bateriaId: String(bateriaId),
        nomeBateria: String(nomeBateriaFinal),
        tempoTotalProvaMs: Number(tempoDecorridoMs) || 0,
        melhorVoltaDaProvaMs: Number(tempoMelhorVoltaMs) || 0,
        idPilotoMelhorVolta: idPilotoMelhorVolta ? String(idPilotoMelhorVolta) : null,
        gridFinal: gridFinalMapeado
      };

      // 5. Envio dos resultados
      const resposta = await fetch('/api/resultados', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const dadosRetorno = await resposta.json().catch(() => ({}));

      if (!resposta.ok) {
        throw new Error(dadosRetorno.error || dadosRetorno.message || `Erro ${resposta.status} na API de Resultados`);
      }

      const resultadoId = dadosRetorno._id || dadosRetorno.resultadoId;
      if (!resultadoId) {
        throw new Error("API gravou mas não retornou o ID do resultado gerado.");
      }

      const urlRetorno = origem ? `&origem=${encodeURIComponent(origem)}` : '';
      const urlRelatorio = `/admin/relatorios/${resultadoId}?novaAba=true${urlRetorno}`;
      
      window.open(urlRelatorio, '_blank');

    } catch (err: any) {
      console.error("Erro ao finalizar prova:", err);
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
                  <div 
                    key={p._id || `piloto-${index}`} 
                    onClick={() => abrirEdicaoPiloto(p)}
                    className="grid grid-cols-12 items-center py-3 text-xs font-mono font-bold text-center text-zinc-300 hover:bg-zinc-800/40 cursor-pointer transition-colors relative group hover:z-50"
                    title="Clique para editar as voltas deste piloto"
                  >
                    <div className="col-span-1 text-left text-zinc-500 text-sm pl-1">{index + 1}</div>
                    
                    <div className="col-span-2 text-left flex items-center gap-2 relative">
                      <div className={`w-[3px] h-4 ${index === 0 ? 'bg-cyan-500' : 'bg-purple-500'}`}></div>
                      <span className="text-white font-sans text-sm tracking-wide uppercase truncate">{p.nome}</span>

                      <div className={`absolute left-0 ${index === 0 ? 'top-full mt-2' : 'bottom-full mb-2'} hidden group-hover:flex flex-col bg-zinc-950 border border-zinc-800 p-3 rounded-lg shadow-2xl z-[100] min-w-[200px] pointer-events-none drop-shadow-xl`}>
                        <div className="flex items-center justify-between border-b border-zinc-800 pb-1.5 mb-2">
                          <span className="text-[11px] font-sans font-bold text-white uppercase flex items-center gap-1">
                            <History size={12} className="text-red-500" /> Histórico de Voltas
                          </span>
                          <span className="text-[10px] text-zinc-500">#{p.numeral}</span>
                        </div>

                        {(!p.historicoVoltas || p.historicoVoltas.length === 0) ? (
                          <span className="text-[10px] text-zinc-600 italic">Nenhuma volta registrada</span>
                        ) : (
                          <div className="space-y-1 max-h-[160px] overflow-y-auto">
                            {p.historicoVoltas.map((tempoVolta, iVolta) => (
                              <div key={iVolta} className="flex justify-between items-center text-[10px]">
                                <span className="text-zinc-500">Volta {iVolta + 1}:</span>
                                <span className={`font-mono ${tempoVolta === p.melhorVoltaMs ? 'text-emerald-400 font-black' : 'text-zinc-300'}`}>
                                  {formatarVoltaTabela(tempoVolta)}
                                  {tempoVolta === p.melhorVoltaMs && " ⚡"}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
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
            • {corridaAtiva ? 'PROVA EM ANDAMENTO (RECEPTOR RFID ATIVO)' : 'PROVA PAUSADA'}
          </span>
        </div>
      </main>

      <aside className="w-[280px] bg-[#0b0b0c] border border-zinc-900/80 rounded-xl p-4 flex flex-col gap-2 shrink-0 overflow-y-auto custom-scrollbar">
        
        <button 
          onClick={lidarVoltarPainel}
          disabled={salvando}
          className="w-full bg-[#161619] hover:bg-zinc-800 text-zinc-300 hover:text-white font-sans font-bold text-xs py-2.5 px-4 rounded-xl border border-zinc-800/80 transition-all flex items-center justify-center gap-2 uppercase tracking-wide disabled:opacity-50"
        >
          <ArrowLeft size={15} className="text-zinc-400" /> Voltar ao Painel
        </button>

        <button 
          onClick={alternarAvisoSonoro}
          className={`w-full font-mono font-bold text-xs py-2.5 px-4 rounded-xl border transition-all flex items-center justify-center gap-2 uppercase tracking-wide ${
            avisoSonoroAtivo
              ? 'bg-emerald-950/60 border-emerald-500/80 text-emerald-400 hover:bg-emerald-900/60'
              : 'bg-[#121214] border-zinc-900 text-zinc-400 hover:bg-zinc-800 hover:text-white'
          }`}
        >
          {avisoSonoroAtivo ? (
            <>
              <Volume2 size={15} className="text-emerald-400 animate-pulse" /> AVISO SONORO: ATIVO
            </>
          ) : (
            <>
              <VolumeX size={15} className="text-zinc-500" /> ATIVAR AVISO SONORO
            </>
          )}
        </button>

        <button 
          onClick={alternarEstadoCorrida}
          disabled={salvando}
          className={`w-full font-sans font-black text-sm py-3 px-4 rounded-xl transition-all flex items-center justify-center gap-2 uppercase tracking-wider disabled:opacity-50 ${
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
          className="w-full bg-red-600 hover:bg-red-700 text-white font-sans font-black text-sm py-3 px-4 rounded-xl transition-all flex items-center justify-center gap-2 uppercase tracking-wider disabled:bg-zinc-800 disabled:text-zinc-500"
        >
          {salvando ? (
            <><Loader2 size={15} className="animate-spin" /> Gravando...</>
          ) : (
            "Finalizar Prova"
          )}
        </button>

        <div className="h-[1px] bg-zinc-900 my-0.5"></div>

        <button 
          onClick={() => {
            setTransponderParaVincular('');
            setModalIncluirPilotoAberto(true);
          }}
          className="w-full bg-[#121214] hover:bg-[#181a20] text-zinc-300 font-sans font-bold text-xs py-2.5 px-4 rounded-xl border border-zinc-900 hover:border-blue-900/50 transition-all flex items-center justify-center gap-2 uppercase tracking-wide"
        >
          <UserPlus size={15} className="text-blue-500" /> + Incluir Piloto
        </button>

        <button className="w-full bg-[#121214] hover:bg-zinc-900 text-zinc-400 font-sans font-bold text-[11px] py-2.5 px-4 rounded-xl border border-zinc-900 transition-all text-center uppercase tracking-wide">
          Alterar Informações do Piloto
        </button>

        <button className="w-full bg-[#121214] hover:bg-[#1c1712] text-zinc-300 font-sans font-bold text-xs py-2.5 px-4 rounded-xl border border-zinc-900 hover:border-amber-900/50 transition-all flex items-center justify-center gap-2 uppercase tracking-wide">
          <Settings size={15} className="text-amber-500" /> Editar Bateria
        </button>

        <button className="w-full bg-[#121214] hover:bg-zinc-900 text-zinc-300 font-sans font-bold text-xs py-2.5 px-4 rounded-xl border border-zinc-900 transition-all flex items-center justify-center gap-2 uppercase tracking-wide">
          <FileText size={15} className="text-zinc-500" /> Relatório
        </button>

        <div className="h-[1px] bg-zinc-900/60 my-0.5"></div>

        {tagsDesconhecidas.length > 0 && (
          <div className="bg-amber-950/40 border border-amber-600/60 rounded-xl p-3 flex flex-col gap-2 animate-pulse">
            <div className="flex items-center justify-between text-amber-400 font-mono font-black text-[10px] uppercase tracking-wider">
              <span className="flex items-center gap-1.5">
                <AlertTriangle size={13} className="text-amber-400" /> CHIP NÃO CADASTRADO ({tagsDesconhecidas.length})
              </span>
            </div>

            <div className="max-h-[140px] overflow-y-auto space-y-1.5 custom-scrollbar">
              {tagsDesconhecidas.map((tag) => (
                <div 
                  key={tag.epc} 
                  className="bg-black/90 border border-amber-900/60 rounded-lg p-2 flex items-center justify-between font-mono text-xs"
                >
                  <div className="flex flex-col">
                    <span className="text-white font-bold text-[10px] tracking-wider truncate max-w-[100px]" title={tag.epc}>
                      {tag.epc}
                    </span>
                    <span className="text-[9px] text-zinc-500">
                      {new Date(tag.ultimaLeitura).toLocaleTimeString('pt-BR')}
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => abrirModalComTransponder(tag.epc)}
                      title="Vincular a um piloto"
                      className="bg-blue-600 hover:bg-blue-700 text-white font-sans text-[9px] font-bold px-2 py-1 rounded uppercase tracking-wider"
                    >
                      + VINCULAR
                    </button>
                    
                    <button
                      onClick={() => descartarTagDesconhecida(tag.epc)}
                      title="Descartar Tag"
                      className="bg-zinc-800 hover:bg-red-950 hover:text-red-400 text-zinc-400 p-1 rounded"
                    >
                      <X size={12} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-auto pt-2 border-t border-zinc-900 space-y-1.5">
          <label className="text-[10px] font-mono font-black text-zinc-500 tracking-wider uppercase block">
            Passagem Manual (# Moto + Enter)
          </label>
          <input 
            type="text" 
            placeholder="# MOTO" 
            value={numeroMotoInput}
            onChange={(e) => setNumeroMotoInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && registrarPassagemPiloto(numeroMotoInput)}
            className="w-full bg-black border border-zinc-900 rounded-xl px-3 py-2.5 text-white text-center font-black placeholder-zinc-800 outline-none focus:border-zinc-700 uppercase"
          />
        </div>

        <div className="space-y-1">
          <select 
            onChange={(e) => lidarMudancaBateria(e.target.value)}
            value={bateriaId || ''}
            className="w-full bg-black border border-zinc-900 text-zinc-300 font-sans font-medium text-xs rounded-xl p-2.5 outline-none cursor-pointer focus:border-zinc-700"
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

      {/* MODAL DE EDIÇÃO DE VOLTAS DO PILOTO (TEMPO REAL) */}
      {pilotoParaEditar && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0c0c0e] border border-zinc-800 rounded-2xl w-full max-w-lg overflow-hidden flex flex-col shadow-2xl">
            <div className="p-4 border-b border-zinc-800/80 flex items-center justify-between bg-[#080809]">
              <div className="flex items-center gap-2">
                <Edit2 size={16} className="text-red-500" />
                <h3 className="font-sans font-black text-sm text-white uppercase tracking-wider">
                  Editar Voltas - {pilotoParaEditar.nome} (#{pilotoParaEditar.numeral})
                </h3>
              </div>
              <button 
                onClick={fecharEdicaoPiloto}
                className="text-zinc-500 hover:text-white p-1 rounded-lg hover:bg-zinc-800 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-4 max-h-[350px] overflow-y-auto space-y-2 custom-scrollbar">
              {voltasEditando.length === 0 ? (
                <div className="text-center py-8 text-xs font-mono text-zinc-500 italic">
                  Este piloto ainda não possui voltas registradas.
                </div>
              ) : (
                voltasEditando.map((tempoMs, index) => (
                  <div key={index} className="bg-zinc-900/60 border border-zinc-800/80 p-2.5 rounded-xl flex items-center justify-between gap-3">
                    <span className="text-xs font-mono font-bold text-zinc-400">Volta {index + 1}:</span>
                    
                    <div className="flex items-center gap-2 flex-1 justify-end">
                      <input 
                        type="number" 
                        value={tempoMs}
                        onChange={(e) => atualizarTempoVoltaEmEdicao(index, parseInt(e.target.value) || 0)}
                        className="bg-black border border-zinc-800 rounded-lg px-2 py-1 text-xs font-mono font-bold text-amber-400 w-28 text-center outline-none focus:border-amber-500"
                      />
                      <span className="text-[10px] font-mono text-zinc-500">ms ({formatarVoltaTabela(tempoMs)})</span>
                    </div>

                    <button 
                      onClick={() => removerVoltaEmEdicao(index)}
                      className="text-zinc-500 hover:text-red-400 p-1.5 rounded-lg hover:bg-red-950/40 transition-colors"
                      title="Excluir Volta"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))
              )}
            </div>

            <div className="p-4 border-t border-zinc-800/80 bg-[#080809] flex justify-end gap-2">
              <button
                onClick={fecharEdicaoPiloto}
                className="px-4 py-2 rounded-xl border border-zinc-800 text-xs font-sans font-bold text-zinc-400 hover:bg-zinc-800 hover:text-white uppercase tracking-wider"
              >
                Cancelar
              </button>
              <button
                onClick={salvarEdicaoVoltasPiloto}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-xs font-sans font-black text-white uppercase tracking-wider flex items-center gap-1.5"
              >
                <Check size={14} /> Salvar Alterações
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE INCLUIR PILOTO */}
      {modalIncluirPilotoAberto && (
        <ModalIncluirPiloto 
          isOpen={modalIncluirPilotoAberto}
          onClose={() => {
            setModalIncluirPilotoAberto(false);
            setTransponderParaVincular('');
          }}
          eventoId={eventoId}
          bateriaId={bateriaId}
          categoriasBateria={categoriasBateria}
          transponderInicial={transponderParaVincular}
          onPilotoAdicionado={handlePilotoAdicionado}
        />
      )}
    </div>
  );
}

export default function TelaCronometragem() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center font-mono text-xs text-zinc-600 gap-2 animate-pulse">
        CONECTANDO AO RECEPTOR RFID...
      </div>
    }>
      <ConteudoCronometragem />
    </Suspense>
  );
}