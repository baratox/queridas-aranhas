var program = require('commander');

program.version('1');

program.command('*')
  .action(function(env){
      console.log('Não conheço este comando.', env);
  });


program.parse(process.argv);