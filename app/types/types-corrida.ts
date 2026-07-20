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
export interface Categoria {
    _id: string;
    nome: string;
    eventoId: string;
    createdAt?: Date;
    updatedAt?: Date;
}
export interface Evento {
    _id: string;
    nome: string;
    dataEvento: Date;
    localEvento: string;
    createdAt?: Date;
    updatedAt?: Date;
}
export interface Piloto {
    _id: string;
    nome: string;
    numero_piloto: string;
    categorias: string[];
    tag: string;
    eventoId: string;
    createdAt?: Date;
    updatedAt?: Date;
}
