const crawl = require('../../util/crawl.js');

const { Deputado, Partido } = require('../../model');


module.exports = {
    name: "Deputados",
    describe: "Deputados em exercício na Câmara dos Deputados, incluindo os detalhes " +
              "dos deputados com histórico de participação em comissões, períodos de exercício, " +
              "filiações partidárias e lideranças.",

    command: crawl.xml({
        request: {
            url: 'http://www.camara.leg.br/SitCamaraWS/Deputados.asmx/ObterDeputados'
        },

        select: 'deputados deputado',

        schema: (scrape) => ({
            idCamara: scrape('ideCadastro').as.number(),
            idParlamentar: scrape('idParlamentar').as.number(),
            matricula: scrape('matricula').as.number(),
            condicao: scrape('condicao').as.text(),
            nome: scrape('nome').as.text(),
            nomeParlamentar: scrape('nomeParlamentar').as.text(),
            genero: scrape('sexo').as.text(),
            foto: scrape('urlFoto').as.text(),
            uf: scrape('uf').as.text(),
            gabinete: scrape('gabinete').as.number(),
            anexo: scrape('anexo').as.number(),
            fone: scrape('fone').as.text(),
            email: scrape('email').as.text(),
            partido: scrape('partido').as.text()
        }),

        findOrCreate: (deputado) => {
            return Partido.findOne({
                where: { sigla: deputado.partido },
                attributes: ['id']
            }).then((partido) => {
                if (partido) {
                    console.debug("Partido", deputado.partido, "is", partido.id);
                    deputado.PartidoId = partido.id;
                }

                return Deputado.findOrCreate({
                    where: { 'idCamara': deputado.idCamara },
                    defaults: deputado,
                    include: [Partido]
                });
            })

        }
    })
}