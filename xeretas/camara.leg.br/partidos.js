const Partido = require('../../model').Partido;
const crawlXml = require('../crawl-xml.js');

const S = require('string');
const date = require('date-and-time');

module.exports = {
    name: "Partidos",
    describe: "Partidos com representação na Câmara dos Deputados.",

    command: crawlXml({
        request: 'http://www.camara.leg.br/SitCamaraWS/Deputados.asmx/ObterPartidosCD',

        select: 'partidos partido',

        // Parses a XML record into an object with Partido data
        parse: function($) {
            var t = (selector) => S($(selector).text()).collapseWhitespace();
            var d = (selector) => {
                var parsed = date.parse(t(selector).s, 'DD/MM/YYYY');
                return isNaN(parsed) ? null : parsed;
            }

            var p = {};
            p['sigla'] = t('siglaPartido').s;
            p['nome'] = t('nomePartido').s;
            p['dataCriacao'] = d('dataCriacao');
            p['dataExtincao'] = d('dataExtincao');
            return p;
        },

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
