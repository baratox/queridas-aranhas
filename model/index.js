const fs = require('fs');
const path = require('path');
const Sequelize = require('sequelize');

const sequelize = new Sequelize('fatos', 'postgres', 'must be changed.', {
    host: 'db',
    dialect: 'postgres',
    operatorsAliases: false,
    logging: false
});

const BASENAME = path.basename(__filename);

var model = {};
model.sequelize = sequelize;
model.Sequelize = Sequelize;

// Sequelize.import each model definition in the same directory
// as this file.
fs.readdirSync(__dirname)
    .filter(function(file) {
        return (file.indexOf('.') !== 0) && (file !== BASENAME) && (file.slice(-3) === '.js');
    }).forEach(function(file) {
        var m = sequelize.import(path.join(__dirname, file));
        if (!Array.isArray(m)) {
            m = [m];
        }
        m.forEach((m) => model[m.name] = m);
    });

// Gives the schemas a chance to register relationships that depend on
// other schemas.
Object.keys(model).forEach(function(modelName) {
    if (model[modelName].associate) {
        model[modelName].associate(model);
    }
});

module.exports = model;