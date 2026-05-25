export interface voltas{
    qtVoltas: number; //quantidade de voltas em milesegundos
    tempo: number; //em milesegundos
    tempoAtual: number; //tempo atual em milesegundos
    VoltaCompleta:number; //Tempo que a voltas completada
}

export type StatusPiloto = "NORMAL" | "PASSOU" | "ALERTA" | "SAIU" | "BURLOU";

export interface PilotoDB{
    id_piloto: number;
    nome: string;
    numero_piloto: string;
    cpf: string;
    tag_rfid_1: string;
    tag_rfid_2?: string;
    tag_rfid_3?: string;
    tag_rfid_4?: string;
};

export interface Competidor{
    id: string;
    nome: string;
    numero_piloto: string;
    status: StatusPiloto;
    voltas: voltas[];
    steutusUltamaVolta: number; //status da ultama alteração da volta
    melhorVolta: number | null; //melhor volta em milesegundos
    ultimaVolta: number | null; //ultima volta em milesegundos
    tempoTotal: number ; //tempo total em milesegundos
    ultimaVoltaCompleta: number | null; //ultima volta completa em milesegundos
    posicao: number; //posição do piloto na corrida
    cor: string; //cor do piloto

}
export interface Corrida{
    id: string;
    nome: string;
    data: string; //data da corrida
    competidores: Competidor[]; //lista de competidores na corrida
    status: "AGUARDANDO" | "EM_ANDAMENTO" | "FINALIZADA"; //status da corrida
}
export interface Categoria{
    _id: string,
    nome: string,
    descricao: string,
}
export interface Tag{
    _id:string,
    num: string,
    tag: string,
    flag: boolean,
}

export interface Piloto{
        _id: string,
        nome:  string,
        numero_piloto: number, 
        nome_equipe: string,
        filiacao: string, 
        patrocinador:string, 
        cpf: string, 
        dataNascimento: Date, 
        telefone: string,
        responsavel:string, 
        tipoSanguineo:string,
        categorias: [],
        tag: string[],
}
export interface Usuario{
    _id: string,
    nameUser: string,
    emailUser: string,
    passworUser: string,
    nivelUser: 'A' | 'C' | 'S',
    avatarUser: string,
}
export interface Bateria{
    _id: string,
    nome:string, 
    categorias: [],
    horaInicio: string,
    horaFim: string,
    status: "AGUARDANDO" | "EM_ANDAMENTO" | "FINALIZADA",
    ordem: number,
}
export interface Evento{
    _id: string,
    nome_evento: string,
    data_inicio: Date,
    data_fim: Date,
    hora_evento: string,
    local_evento: string,
    descricao_evento: string,
    baterias: [],
}