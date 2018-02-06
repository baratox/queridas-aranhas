# Xereta

## Desenvolvimento

Ferramentas usadas para o desenvolvimento:

* [Docker](https://docker.com/)

Crie um contêiner no Docker com:

    $ sudo docker build -t xeretas ./

Execute o aplicativo ou qualquer outro comando dentro do contêiner:

    $ sudo docker run -it --rm --volume=$(pwd):/usr/xeretas/ xeretas
    $ sudo docker run -it --rm --volume=$(pwd):/usr/xeretas/ xeretas bash
