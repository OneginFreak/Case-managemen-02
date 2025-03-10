const request = require('supertest');
const { app, knex } = require('../src/server');

describe('Case Routes', () => {
  beforeAll(async () => {
    await knex.migrate.latest();
  });

  afterAll(async () => {
    await knex.destroy();
  });

  it('should create a case', async () => {
    const token = 'valid-jwt-token'; // Mock token
    const res = await request(app)
      .post('/api/cases')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Test Case', description: 'Test' });
    expect(res.status).toBe(200);
    expect(res.body.title).toBe('Test Case');
  });
});