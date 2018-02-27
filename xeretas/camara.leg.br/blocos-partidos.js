const crawlXml = require('../crawl-xml.js');

const { Bloco, Partido } = require('../../model');


// Identifies a Bloco and/or Partido in log messages.
function id(bloco, partido) {
    var id = "";
    if (bloco != null) {
        id += bloco.constructor.name + "[" + bloco.id + "," + bloco.nome + "] ";
    }
    if (partido != null) {
        id += partido.constructor.name + "[" + partido.id + "," + partido.sigla + "] ";
    }
    return id;
}

module.exports = {
    name: "Blocos Partidários",
    describe: "Blocos de Partidos com representação na Câmara dos Deputados.",

    command: crawlXml({
        request: {
            url: 'http://www.camara.leg.br/SitCamaraWS/Deputados.asmx/ObterPartidosBlocoCD',
            qs: { idBloco: '', numLegislatura: '' }
        },

        select: 'bloco',

        schema: (scrape) => ({
            idCamara: scrape('idBloco').as.number(),
            nome: scrape('nomeBloco').as.text(),
            sigla: scrape('siglaBloco').as.text(),
            criacao: scrape('dataCriacaoBloco').as.date(),
            extincao: scrape('dataExtincaoBloco').as.date(),
            partidos: scrape('partido').as((scrape) => ({
                sigla: scrape('siglaPartido').as.text(),
                nome: scrape('nomePartido').as.text(),
                adesao: scrape('dataAdesaoPartido').as.date(),
                desligamento: scrape('dataDesligamentoPartido').as.date(),
            }))
        }),

        findOrCreate: function(bloco) {
            return Bloco.findOrCreate({
                where: { 'idCamara': bloco.idCamara },
                defaults: bloco,
                include: [ Partido ]
            });
        },

        spread: function(bloco, parsed) {
            var siglas = parsed.partidos.map((p) => p.sigla);
            return Partido.findAll({
                where: { sigla: siglas },
                attributes: ['id', 'sigla', 'nome']
            }).then((partidos) => {
                var promises = [];
                parsed.partidos.forEach((p) => {
                    var partido = partidos.find(x => x.sigla == p.sigla);
                    if (partido) {
                        var promise = bloco.addPartido(partido, { through: p })
                        .then(() => {
                            console.debug("Associated", id(bloco, partido));
                            return [bloco, partido];
                        }).catch((e) => {
                            console.error("Failed to associate", id(bloco, partido), "\n", e);
                        });

                        promises.push(promise);

                    } else {
                        console.error("Partido", p, "não existe no banco de dados.");
                    }
                });

                return Promise.all(promises);
            });
        }
    })
}
