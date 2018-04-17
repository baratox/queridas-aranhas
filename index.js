const program = require('commander');
const glob = require('glob');
const path = require('path');
const _ = require('lodash');

// Mounted by docker-compose, from memoria-politica
const model = require.main.require('./model');

program.version('1')
    .action(function(env){
        console.log("Queridas amigas que fazem o trabalho pesado de entender esse " +
                    "mundo da política através dos dados disponíveis.");
    });



function runAsync(crawler) {
    var promise = Promise.resolve();
    if (crawler.command) {
        // console.info("Starting crawler", crawler.name);
        promise = promise.then(crawler.command);

    } else if (typeof crawler === 'function') {
        // console.info("Starting function", crawler.name);
        promise = promise.then(crawler);

    } else {
        promise = Promise.reject(new TypeError(
            "Unsupporte crawler type " +
            _.get(crawler, 'name', '(no .name attribute).')
        ));
    }

    promise = promise.then(result => {
        crawler.result = result;
        crawler.successful = 0;
        crawler.failed = 0;

        if (_.isArray(result)) {
            _.flatten(result).forEach(r => {
                if (_.isError(r)) {
                    crawler.failed++;
                } else {
                    crawler.successful++;
                }
            });
        } else {
            crawler.successful = 1;
        }

        console.info("[x]", crawler.name, "done:", crawler.successful, "operations succeded,",
                     crawler.failed, "failed.");

        return Promise.resolve(crawler);
    }).catch(error => {
        crawler.successful = 0;
        crawler.error = error;
        console.error("[x]", crawler.name, "failed:", error.name);
        return Promise.resolve(crawler);
    }).then(crawler => {
        if (crawler.successful) {
            return Promise.resolve(crawler);
        } else {
            return Promise.reject(crawler);
        }
    });

    return promise;
}

function runAllAsync(tasks) {
    var promises = Promise.resolve();
    var orderedWeights = _.sortBy(Array.from(tasks.keys()));
    orderedWeights.forEach((weight, i) => {
        var crawlers = tasks.get(weight);

        console.log(" " + String.fromCharCode(65 + i) + ".", "Found",
                    crawlers.length, "crawler(s) at", weight);
        crawlers.forEach(crawler => console.log("    -", crawler.name));

        promises = promises.then(function() {
            console.log("\n---------------");
            console.log(" " + String.fromCharCode(65 + i) + ".", "Starting",
                        crawlers.length, "crawler(s) at", weight);
            return Promise.all(crawlers.map(crawler => runAsync(crawler)));
        });
    });

    return promises;
}

function crawl(name = "") {
    var tasks = new Map();

    // Matches any .js, in any subdirectory of "name".
    glob.sync(name + '{,*.js}', {
        cwd: path.join(__dirname, '/xeretas/'),
        nodir: true,
        matchBase:true,
        ignore: ['*/index.js'],
    }).forEach(function(x) {
        var crawler = require(path.join(__dirname, '/xeretas/', x));
        var weight = _.get(crawler, 'weight', 0);

        if (!tasks.has(weight)) {
            tasks.set(weight, []);
        }

        // Tasks with same weight run in parallel
        tasks.get(weight).push(crawler);
    });

    return runAllAsync(tasks);
}

function verbose(crawler) {
    // So that JSON.stringify will print Error types
    if (!('toJSON' in Error.prototype))
    Object.defineProperty(Error.prototype, 'toJSON', {
        value: function () {
            var alt = {};
            Object.getOwnPropertyNames(this).forEach(function (key) {
                alt[key] = this[key];
            }, this);
            return alt;
        },
        configurable: true,
        writable: true
    });

    console.debug(JSON.stringify(crawler, 5, 3));
}

program.command('xeretem [alvo]').alias('x')
    .description("Executa um xereta ou todos os xeretas, se [alvo] for um diretório.\n" +
                 "Se não especificado, todos são executados.")
    .option('-v, --verbose', "Põe na roda tudo o que se passa.")
    .action(function(alvo, options){
        return crawl(alvo).then(function(crawler) {
            if (options.verbose) {
                console.info("Final context for", _.get(crawler, 'name', 'anonymous'));
                verbose(crawler);
            }

            console.info("All jobs should have finished. Will exit in 3s.");
            console.info("Any activity log below this line indicates an error.");

            setTimeout(() => { process.exit(0); }, 3000);
        }).catch(function(crawler) {
            console.error("Execution failed for", crawler.name);
            if (options.verbose) {
                verbose(crawler);
            }

            console.info("Will exit after 3s.");
            setTimeout(() => { process.exit(-1); }, 3000);
        });

    }).on('--help', function() {
        console.log('  Examplos:');
        console.log();
        console.log('    $ aranhas x camara.leg.br/passaportes');
        console.log('    $ aranhas x camara');
        console.log();
    });

function mergeSeen(s1, s2) {
    function customizer(value) {
      if (_.isSet(value)) {
        return new Set(value);
      }
    }

    var seen = {};
    if (s1 === undefined) {
        seen = _.cloneDeepWith(s2, customizer);
    } else if (s2 === undefined) {
        seen = _.cloneDeepWith(s1, customizer);
    } else {
        seen = _.cloneDeepWith(s1, customizer);
        Object.keys(s2).forEach(type => {
            var t2 = s2[type];
            var t = seen[type];
            if (t === undefined) {
                seen[type] = _.cloneDeepWith(t2, customizer);
                if (t2['format']) {
                    seen[type]['format'] = new Set(t2['format'])
                }
            } else {
                if (t['count'] === undefined) {
                    t['count'] = t2['count'];
                } else if (t2['count'] !== undefined) {
                    t['count'] += t2['count'];
                }

                if (t['length'] === undefined) {
                    t['length'] = _.cloneDeep(t2['length']);
                } else if (t2['length'] !== undefined) {
                    t['length'].min = Math.min(t['length'].min, t2['length'].min);
                    t['length'].max = Math.max(t['length'].max, t2['length'].max);
                }

                if (t2['format'] !== undefined) {
                    if (t['format'] === undefined) {
                        t['format'] = new Set(t2['format']);
                    } else {
                        t2['format'].forEach(f => { t['format'].add(f) });
                    }
                }
            }
        })
    }

    return seen;
}

function mergeSchemas(s1, s2) {
    if (s1 === undefined) {
        return s2;
    } else if (s2 === undefined) {
        return s1;
    }

    var schema = _.cloneDeep(s1);
    Object.keys(s2).forEach(k => {
        if (k === '#seen') {
            schema[k] = mergeSeen(schema[k], s2[k]);
        } else {
            schema[k] = mergeSchemas(schema[k], s2[k]);
        }
    })

    return schema;
}

function printSchemaAsCode(schema, comment = false, indent = '') {
    var fields = Object.keys(schema).filter(f => f !== '#seen');
    console.log(indent + '(scrape) => ({')
    fields.forEach(f => {
        var nNull = _.get(schema, [f, '#seen', 'null', 'count'], 0);
        var nText = _.get(schema, [f, '#seen', 'string', 'count'], 0) + _.get(schema, [f, '#seen', 'url', 'count'], 0);
        var nNumber = _.get(schema, [f, '#seen', 'number', 'count'], 0);
        var nDate = _.get(schema, [f, '#seen', 'date', 'count'], 0);
        var nObject = _.get(schema, [f, '#seen', 'object', 'count'], 0);

        if (nNull > 0) {
            if (comment) console.log(indent + '    ' + '// Seen null', nNull, 'times')
            if (nText + nNumber + nDate + nObject === 0) {
                console.log(indent + '    ' + f + ':', 'null,')
            }
        }

        if (nText > 0) {
            if (comment) console.log(indent + '    ' + '// Seen text', nText, 'times')
            console.log(indent + '    ' + f + ':', "scrape('" + f + "').as.text(),")
        }

        if (nNumber > 0) {
            if (comment) console.log(indent + '    ' + '// Seen number', nNumber, 'times')
            console.log(indent + '    ' + f + ':', "scrape('" + f + "').as.number(),")
        }

        if (nDate > 0) {
            if (comment) console.log(indent + '    ' + '// Seen date', nDate, 'times')
            console.log(indent + '    ' + f + ':', "scrape('" + f + "').as.date('" +
                _.get(schema, [f, '#seen', 'date', 'format'], new Set('')).values().next().value + "'),")
        }

        if (nObject) {
            if (comment) console.log(indent + '    ' + '// Seen object', nObject, 'times')
            console.log(indent + '    ' + f + ':', "scrape('" + f + "').as(")
            printSchemaAsCode(schema[f], comment, indent + '        ')
            console.log(indent + '    ' + '),')
        }
    })
    console.log(indent + '})')
}

program.command('descrevam [alvo]').alias('d')
    .description("Descreve as ações de um ou mais xeretas.")
    .action(function(alvo, options){
        try {
            return crawl(alvo, (crawler, context) => {
                if (!context.error) {
                    if (context.responses) {
                        for (let step of context.responses.entries()) {
                            console.log("Crawler", crawler.name, "did", step[1].length,
                                "requests for step", step[0]);

                            let schema = undefined
                            for (let response of step[1]) {
                                schema = mergeSchemas(schema, response.schema)
                            }

                            console.debug("\nSchema --------------------------------------------")
                            // console.log(JSON.stringify(schema, null, 3))
                            printSchemaAsCode(schema, false)
                            console.debug("---------------------------------------------------\n")
                        }
                    }

                } else {
                    console.log("Crawler", crawler.name, "failed with:", context.error);
                }
            });

        } catch(error) {
            console.error(error);
        }

    }).on('--help', function() {
        console.log('  Examplos:');
        console.log();
        console.log('    $ queridas x camara.leg.br/passaportes');
        console.log('    $ queridas x camara');
        console.log();
    });


program.command('db:sync')
    .description("Cria as tabelas no banco de dados, de acordo com o modelo.")
    .action(function(options) {
        return model.sequelize.sync( { force: true })
            .then(function() {
                console.log("Banco de Dados criado.");
                process.exit(0);
            }).catch(function(error) {
                console.error("Falha ao criar BD.", error);
                process.exit(-1);
            });
    });

program.command('db:drop')
    .description("Remove todas as tabelas do banco de dados.")
    .action(function(options) {
        return model.sequelize.drop()
            .then(function() {
                console.log("Banco de Dados excluído.");
                process.exit(0);
            }).catch(function(error) {
                console.error("Falha ao excluir tabelas.", error);
                process.exit(-1);
            });
    });


program.command('*')
    .action(function(env){
        console.log('Não conheço este comando.', env);
    });


program.parse(process.argv);
