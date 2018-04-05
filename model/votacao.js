'use strict';

module.exports = function(sequelize, DataTypes) {
    var Votacao = sequelize.define('Votacao', {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true
        },
        // Id attributed to it in camara.leg.br services
        idCamara: DataTypes.INTEGER,
    });

    return Votacao;
};