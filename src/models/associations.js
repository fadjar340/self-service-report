const AdminUser = require('./adminUser');
const SybaseDatabase = require('./sybaseDatabase');
const DatabaseQuery = require('./databaseQuery');

// Associations for SybaseDatabase
SybaseDatabase.belongsTo(AdminUser, { as: 'creator', foreignKey: 'createdBy' });
SybaseDatabase.belongsTo(AdminUser, { as: 'updater', foreignKey: 'updatedBy' });
SybaseDatabase.belongsTo(AdminUser, { as: 'deleter', foreignKey: 'deletedBy' });
SybaseDatabase.hasMany(DatabaseQuery, {
    foreignKey: 'databaseId',
    as: 'databaseQueries'
});

// Associations for AdminUser
AdminUser.hasMany(SybaseDatabase, { as: 'createdDatabases', foreignKey: 'createdBy' });
AdminUser.hasMany(SybaseDatabase, { as: 'updatedDatabases', foreignKey: 'updatedBy' });
AdminUser.hasMany(SybaseDatabase, { as: 'deletedDatabases', foreignKey: 'deletedBy' });
AdminUser.hasMany(DatabaseQuery, { as: 'createdQueries', foreignKey: 'createdBy' });
AdminUser.hasMany(DatabaseQuery, { as: 'updatedQueries', foreignKey: 'updatedBy' });

// Associations for DatabaseQuery
DatabaseQuery.belongsTo(AdminUser, { as: 'creator', foreignKey: 'createdBy' });
DatabaseQuery.belongsTo(AdminUser, { as: 'updater', foreignKey: 'updatedBy' });
DatabaseQuery.belongsTo(AdminUser, { as: 'deleter', foreignKey: 'deletedBy' });
DatabaseQuery.belongsTo(SybaseDatabase, { foreignKey: 'databaseId', as: 'sybaseDatabase' });