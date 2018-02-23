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

    Partido.associate = function(model) {
        model.Partido.belongsToMany(model.Bloco, {
            through: {
                model: model.BlocoPartido,
                unique: false
            }
        });
    };

    return Partido;
};