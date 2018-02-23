'use strict';

module.exports = function(sequelize, DataTypes) {
    var Bloco = sequelize.define('Bloco', {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true
        },
        // Id attributed to it in camara.leg.br services
        idCamara: DataTypes.INTEGER,
        nome: DataTypes.STRING,
        criacao: DataTypes.DATEONLY,
        extincao: DataTypes.DATEONLY
    });

    var BlocoPartido = sequelize.define('BlocoPartido', {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true
        },
        adesao: DataTypes.DATEONLY,
        desligamento: DataTypes.DATEONLY
    });

    Bloco.associate = function(model) {
        model.Bloco.belongsToMany(model.Partido, {
            through: {
                model: model.BlocoPartido,
                unique: false
            }
        });
    };

    return [Bloco, BlocoPartido];
};