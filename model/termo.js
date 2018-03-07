'use strict';

module.exports = function(sequelize, DataTypes) {
    var Termo = sequelize.define('Termo', {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true
        },
        tipo: DataTypes.STRING,
        idCamara: DataTypes.STRING,
        sigla: DataTypes.STRING,
        nome: DataTypes.STRING,
        descricao: DataTypes.STRING
    });

    return Termo;
};