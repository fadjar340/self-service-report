// models/index.js
const fs = require('fs');
const path = require('path');
const { Sequelize, DataTypes } = require('sequelize');
const sequelize = require('../config//db'); // Your database configuration

const basename = path.basename(__filename);
const models = {};

// Load all models - filter out non-model files
const modelFiles = fs.readdirSync(__dirname)
  .filter(file => 
    file.indexOf('.') !== 0 && 
    file !== basename && 
    file.slice(-3) === '.js' && 
    !['db.js', 'index.js'].includes(file));

modelFiles.forEach(file => {
  const modelPath = path.join(__dirname, file);
  const modelModule = require(modelPath);
  
  // Check if the model file exports a function
  if (typeof modelModule === 'function') {
      const model = modelModule(sequelize, DataTypes);
      models[model.name] = model;
  } else if (modelModule && modelModule.default) {
      // Handle ES6 default exports
      const model = modelModule.default(sequelize, DataTypes);
      models[model.name] = model;
  } else {
      // If neither, throw an error indicating the model isn't exported correctly
      throw new Error(`Model file ${file} does not export a function or default function`);
  }
});

// Associate models
Object.keys(models).forEach(key => {
  if (models[key].associate) {
    models[key].associate(models);
  }
});

models.sequelize = sequelize;
models.Sequelize = Sequelize;

module.exports = models;