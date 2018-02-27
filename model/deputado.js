'use strict';

module.exports = function(sequelize, DataTypes) {
    var Deputado = sequelize.define('Deputado', {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true
        },
        // Id attributed to it in camara.leg.br services
        idCamara: DataTypes.INTEGER,
        idParlamentar: DataTypes.INTEGER,
        matricula: DataTypes.INTEGER,
        condicao: DataTypes.STRING,
        // Personal
        nome: DataTypes.STRING,
        nomeParlamentar: DataTypes.STRING,
        genero: DataTypes.STRING,
        foto: DataTypes.STRING,
        // Location
        uf: DataTypes.STRING,
        gabinete: DataTypes.INTEGER,
        anexo: DataTypes.INTEGER,
        // Contact
        fone: DataTypes.STRING,
        email: DataTypes.STRING
    });

    Deputado.associate = function(model) {
        model.Deputado.belongsTo(model.Partido);
    };

    return [Deputado];
};