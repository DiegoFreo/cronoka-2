import { NextResponse } from "next/server";
import conectDB from "@/app/lib/mongodb"; 
import Bateria from "@/app/model/bateria";
import Competidor from "@/app/model/piloto"; 
import Categoria from "@/app/model/categoria"; 

export async function GET(request, { params }) {
  try {
    await conectDB();
    const resolvidoParams = await params;
    const id = resolvidoParams.id || resolvidoParams.bateriaId;

    const bateria = await Bateria.findById(id);
    if (!bateria) {
      return NextResponse.json({ error: "Bateria não encontrada." }, { status: 404 });
    }

    // AJUSTE NA QUERY:
    // Mudamos o campo para 'categorias' (plural) que é como está salvo no seu piloto.
    // O MongoDB é inteligente: passando o operador $in com a lista de IDs da bateria,
    // ele vai trazer qualquer piloto que possua uma ou mais daquelas categorias.
    const competidores = await Competidor.find({ 
      categorias: { $in: bateria.categorias } 
    }).populate('categorias'); // Faz o populate no array de categorias do piloto

    // Formata os dados exatamente como a nossa tela de pista espera receber
    const pilotosFormatados = competidores.map(p => {
      // Como o piloto pode ter várias categorias, pegamos o nome da primeira encontrada para exibir na tabela
      const nomeCategoria = p.categorias && p.categorias.length > 0 
        ? p.categorias[0].nome 
        : "Geral";

      // Pega o primeiro chip/tag do array se houver, caso contrário, deixa vazio
      const tagChip = p.tag && p.tag.length > 0 ? p.tag[0] : '';

      return {
        _id: p._id.toString(),
        numero: p.numero_piloto || p.numero || p.num || '0', // Ajustado para ler 'numero_piloto' do seu banco
        nome: p.nome,
        tagRfid: tagChip, // Vincula a tag para as antenas Zebra/Motorola
        categoriaNome: nomeCategoria
      };
    });

    console.log(`===> SUCESSO: Foram carregados ${pilotosFormatados.length} pilotos para o grid.`);

    return NextResponse.json(pilotosFormatados);
  } catch (error) {
    console.error("===> ERRO NA API:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}