'use strict';

module.exports = function(sequelize, DataTypes) {
    var Orgao = sequelize.define('Orgao', {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true
        },
        // Id attributed to it in camara.leg.br services
        idCamara: DataTypes.INTEGER,
        sigla: DataTypes.STRING,
        nome: DataTypes.TEXT,
        apelido: DataTypes.STRING,

        dataInstalacao: DataTypes.DATE,
        dataInicio: DataTypes.DATE,
        dataFim: DataTypes.DATE,
        dataFimOriginal: DataTypes.DATE,

        casa: DataTypes.STRING,
        sala: DataTypes.STRING,
        website: DataTypes.STRING
    });

    Orgao.associate = function(model) {
        model.Orgao.belongsTo(model.Termo, {as: 'tipo'});
    };

    return [Orgao];
};