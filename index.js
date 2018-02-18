const program = require('commander');
const glob = require('glob');

const Bottleneck = require("bottleneck");

const model = require('./model');

const limiter = new Bottleneck({
    maxConcurrent: 1,
    minTime: 5000
}).on('error', function(error) {
    console.error("Job failed.", error);
}).on('idle', function() {
    console.info("All jobs finished.");
    process.exit(0);
});

program.version('1')
    .action(function(env){
        console.log("Queridas amigas que fazem o trabalho pesado de entender esse " +
                    "mundo da política através dos dados disponíveis.");
    });

program.command('xeretem [alvo]').alias('x')
    .description("Executa um xereta ou todos os xeretas, se [alvo] for um diretório.\n" +
                 "Se não especificado, todos são executados.")
    .action(function(alvo, options){
        try {
            if (!alvo) { alvo = "" };
            // Matches any .js, in any subdirectory of "alvo".
            glob.sync('./xeretas/' + alvo + '{,*.js,**/*.js}', { nodir: true })
                .forEach(function(x) {
                    console.log("[", x, "]");
                    var crawler = require(x);
                    if (crawler.command) {
                        console.info("Scheduling", crawler.name);
                        // Schedule as a rate-limitted job
                        limiter.schedule(crawler.command);

                    } else {
                        // Run as a function
                        crawler();
                    }
                });

            return limiter;

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