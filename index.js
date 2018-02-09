const program = require('commander');
const glob = require('glob');

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
                    require(x)();
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

program.command('*')
    .action(function(env){
        console.log('Não conheço este comando.', env);
    });


program.parse(process.argv);