'use strict';

module.exports = function(sequelize, DataTypes) {
    var Proposicao = sequelize.define('Proposicao', {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true
        },
        // Id attributed to it in camara.leg.br services
        idCamara: DataTypes.INTEGER,
    });

    return Proposicao;
};