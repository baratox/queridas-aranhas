'use strict';

module.exports = function(sequelize, DataTypes) {
    var Bloco = sequelize.define('Bloco', {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true
        },
        nome: DataTypes.STRING,
        dataCriacao: DataTypes.DATEONLY,
        dataExtincao: DataTypes.DATEONLY
    });

    return Bloco;
};