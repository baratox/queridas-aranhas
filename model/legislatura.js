'use strict';

module.exports = function(sequelize, DataTypes) {
    var Legislatura = sequelize.define('Legislatura', {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true
        },
        // Id attributed to it in camara.leg.br services
        idCamara: DataTypes.INTEGER,
        uri: DataTypes.STRING,
        inicio: DataTypes.DATEONLY,
        fim: DataTypes.DATEONLY
    });

    return Legislatura;
};