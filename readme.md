# Create migration

node_modules/.bin/knex migrate:make create_users --env test
node_modules/.bin/knex migrate:make create_table_accounts --env test
node_modules/.bin/knex migrate:make create_table_transactions --env test
node_modules/.bin/knex migrate:make create_table_transfers --env test

node_modules/.bin/knex seed:make balance --env test
node_modules/.bin/knex seed:run --env test

# you can used

migrate:make (created table)
migrate:latest (update table)
migrate:rollback (delete table)

node_modules/.bin/knex migrate:make --env test
node_modules/.bin/knex migrate:latest --env test
node_modules/.bin/knex migrate:rollback --env test

# Commands

npm start (server)
npm run secure-mode (tests)
npm test (coverage)
