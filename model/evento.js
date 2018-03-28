'use strict';

module.exports = function(sequelize, DataTypes) {
    var Evento = sequelize.define('Evento', {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true
        },
        // Id attributed to it in camara.leg.br services
        idCamara: DataTypes.INTEGER,

        titulo: DataTypes.STRING,

        inicio: DataTypes.DATE,
        fim: DataTypes.DATE,

        localCamaraNome: DataTypes.STRING,
        localCamaraPredio: DataTypes.STRING,
        localCamaraAndar: DataTypes.STRING,
        localCamaraSala: DataTypes.STRING
    });

    Evento.associate = function(model) {
        model.Evento.belongsToMany(model.Orgao, {
            as: 'orgaos',
            through: 'EventosOrgao'
        });

        // Termo.tipo = "tiposEvento"
        model.Evento.belongsTo(model.Termo, {as: 'tipo'});
        // Termo.tipo = "situacoesEvento"
        model.Evento.belongsTo(model.Termo, {as: 'situacao'});
    };

    return [Evento];
};