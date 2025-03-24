const express = require('express');
const { knex, s3 } = require('../db');  // Updated import
const { logAction } = require('../utils/audit');  // Updated import
const router = express.Router();

// Add external mapping
router.post('/cases/:id/external-case-mapping', async (req, res) => {
  const { external_case_id, external_system } = req.body;
  const caseId = req.params.id;

  const access = await knex('user_case_access')
    .where({ user_id: req.user.id, case_id: caseId, access_level: 'admin' })
    .first();
  if (!access) return res.status(403).json({ error: 'No admin access' });

  const [mapping] = await knex('internal_external_case_mapping')
    .insert({ internal_case_id: caseId, external_case_id, external_system })
    .returning('*');
  await logAction(req.user.id, 'add_external_mapping', 'case', caseId, { external_case_id });
  res.json(mapping);
});

// Get external mapping
router.get('/cases/:id/external-case-mapping', async (req, res) => {
  const caseId = req.params.id;
  const access = await knex('user_case_access')
    .where({ user_id: req.user.id, case_id: caseId })
    .first();
  if (!access) return res.status(403).json({ error: 'No access' });

  const mapping = await knex('internal_external_case_mapping')
    .where({ internal_case_id: caseId })
    .first();
  res.json(mapping || {});
});

module.exports = router;