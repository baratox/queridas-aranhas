'use strict';

module.exports = function(sequelize, DataTypes) {
    var Partido = sequelize.define('Partido', {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true
        },
        sigla: DataTypes.STRING,
        nome: DataTypes.STRING,
        dataCriacao: DataTypes.DATEONLY,
        dataExtincao: DataTypes.DATEONLY
    });

    Partido.associate = function(models) {
        models.Partido.belongsToMany(models.Bloco, { through: 'PartidosBloco' });
    };

    return Partido;
};