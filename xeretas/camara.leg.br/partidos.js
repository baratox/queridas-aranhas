const crawl = require('../../util/crawler.js');

const Partido = require('../../model').Partido;


module.exports = {
    name: "Partidos",
    describe: "Partidos com representação na Câmara dos Deputados.",

    command: crawl.xml({
        request: 'http://www.camara.leg.br/SitCamaraWS/Deputados.asmx/ObterPartidosCD',

        select: 'partidos partido',

        // Parses a XML response into an object with Partido data.
        schema: (scrape) => ({
            sigla: scrape('siglaPartido').as.text(),
            nome: scrape('nomePartido').as.text(),
            dataCriacao: scrape('dataCriacao').as.date(),
            dataExtincao: scrape('dataExtincao').as.date()
        }),

        // Finds a Partido object in the database that corresponds to the
        // record under review. If it does not exist, creates and saves it
        // to the database.
        findOrCreate: function(partido) {
            // TODO Validate on Sequelize
            return Partido.findOrCreate({ where: { 'sigla': partido.sigla },
                                          defaults: partido });
        }
    })
}
