const express = require('express');
const { knex, logAction } = require('../server');
const router = express.Router();

// List cases for user
router.get('/', async (req, res) => {
  const cases = await knex('cases')
    .join('user_case_access', 'cases.id', 'user_case_access.case_id')
    .where('user_case_access.user_id', req.user.id)
    .select('cases.*', 'user_case_access.access_level');
  res.json(cases);
});

// Create case
router.post('/', async (req, res) => {
  const { title, description } = req.body;
  const [newCase] = await knex('cases')  // Renamed 'case' to 'newCase'
    .insert({ title, description, created_by: req.user.id })
    .returning('*');
  await knex('user_case_access').insert({
    user_id: req.user.id,
    case_id: newCase.id,
    access_level: 'admin',
  });
  await logAction(req.user.id, 'create_case', 'case', newCase.id, { title });
  res.json(newCase);
});

// Add user to case
router.post('/:id/add-user', async (req, res) => {
  const { userId, accessLevel } = req.body;
  const caseId = req.params.id;

  const access = await knex('user_case_access')
    .where({ user_id: req.user.id, case_id: caseId, access_level: 'admin' })
    .first();
  if (!access) return res.status(403).json({ error: 'No admin access' });

  await knex('user_case_access')
    .insert({ user_id: userId, case_id: caseId, access_level: accessLevel })
    .onConflict(['user_id', 'case_id'])
    .merge();
  await logAction(req.user.id, 'grant_access', 'case', caseId, { userId, accessLevel });
  res.json({ message: 'User added' });
});

// Remove user from case
router.delete('/:id/remove-user/:userId', async (req, res) => {
  const caseId = req.params.id;
  const userId = req.params.userId;

  const access = await knex('user_case_access')
    .where({ user_id: req.user.id, case_id: caseId, access_level: 'admin' })
    .first();
  if (!access) return res.status(403).json({ error: 'No admin access' });

  await knex('user_case_access')
    .where({ user_id: userId, case_id: caseId })
    .delete();
  await logAction(req.user.id, 'revoke_access', 'case', caseId, { userId });
  res.json({ message: 'User removed' });
});

// List case users
router.get('/:id/users', async (req, res) => {
  const caseId = req.params.id;
  const access = await knex('user_case_access')
    .where({ user_id: req.user.id, case_id: caseId })
    .first();
  if (!access) return res.status(403).json({ error: 'No access' });

  const users = await knex('user_case_access')
    .join('users', 'user_case_access.user_id', 'users.id')
    .where('user_case_access.case_id', caseId)
    .select('users.id', 'users.username', 'user_case_access.access_level');
  res.json(users);
});

module.exports = router;