const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { knex } = require('../server');
const router = express.Router();

router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const user = await knex('users').where({ username }).first();
  if (!user || !(await bcrypt.compare(password, user.password))) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1h' });
  res.json({ token });
});

router.post('/register', async (req, res) => {
  const { username, password, role } = req.body;
  const hashedPassword = await bcrypt.hash(password, 10);
  const [user] = await knex('users')
    .insert({ username, password: hashedPassword, role })
    .returning('*');
  res.json(user);
});

module.exports = router;