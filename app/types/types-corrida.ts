export interface Bateria {
  _id: string;
  nome: string;
  categorias: string[];
  eventoId: string;
  status: 'AGUARDANDO' | 'FINALIZADA' | 'EM_ANDAMENTO';
  tempoProvaMinutos: number;
  voltasExtras: number;
  createdAt?: Date;
  updatedAt?: Date;
  horaInicio: string | null;
  horaFim: string | null;
  resultadoCorridaId?: string;
}

