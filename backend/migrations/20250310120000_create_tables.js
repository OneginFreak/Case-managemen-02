exports.up = function (knex) {
    return Promise.all([
      knex.schema.createTable('users', (table) => {
        table.increments('id').primary();
        table.string('username').notNullable().unique();
        table.string('password').notNullable();
        table.string('role').notNullable();
        table.timestamp('created_at').defaultTo(knex.fn.now());
      }),
      knex.schema.createTable('cases', (table) => {
        table.increments('id').primary();
        table.string('title').notNullable();
        table.text('description');
        table.integer('created_by').references('id').inTable('users');
        table.timestamp('created_at').defaultTo(knex.fn.now());
        table.timestamp('updated_at').defaultTo(knex.fn.now());
      }),
      knex.schema.createTable('files', (table) => {
        table.increments('id').primary();
        table.string('filename').notNullable();
        table.string('file_url').notNullable();
        table.string('file_type');
        table.bigint('file_size');
        table.json('metadata');
        table.timestamp('uploaded_at').defaultTo(knex.fn.now());
        table.integer('case_id').references('id').inTable('cases');
        table.integer('uploaded_by').references('id').inTable('users');
      }),
      knex.schema.createTable('user_case_access', (table) => {
        table.increments('id').primary();
        table.integer('user_id').references('id').inTable('users');
        table.integer('case_id').references('id').inTable('cases');
        table.string('access_level').notNullable();
        table.timestamp('created_at').defaultTo(knex.fn.now());
      }),
      knex.schema.createTable('internal_external_case_mapping', (table) => {
        table.increments('id').primary();
        table.integer('internal_case_id').references('id').inTable('cases');
        table.string('external_case_id').notNullable();
        table.string('external_system').notNullable();
        table.timestamp('created_at').defaultTo(knex.fn.now());
        table.timestamp('updated_at').defaultTo(knex.fn.now());
      }),
    ]);
  };
  
  exports.down = function (knex) {
    return Promise.all([
      knex.schema.dropTable('internal_external_case_mapping'),
      knex.schema.dropTable('user_case_access'),
      knex.schema.dropTable('files'),
      knex.schema.dropTable('cases'),
      knex.schema.dropTable('users'),
    ]);
  };