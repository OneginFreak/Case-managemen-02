// backend/src/utils/audit.js
const { knex } = require('../db');

const logAction = async (userId, action, entityType, entityId, details) => {
  await knex('audit_logs').insert({
    user_id: userId,
    action,
    entity_type: entityType,
    entity_id: entityId,
    details,
    timestamp: new Date(),
  });
};

module.exports = { logAction };