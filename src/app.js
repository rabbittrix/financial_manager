const app = require('express')();
const consign = require('consign');
const knex = require('knex');
const knexfile = require('../knexfile');
const { query } = require('express');
//const knexLogger = require('knex-logger');

// TODO create dynamic switching
app.db = knex(knexfile.test);

//app.use(knexLogger(app.db));

consign({
    cwd: 'src',
    verbose: false
  })
  .include('./config/passport.js')
  .then('./config/middlewares.js')
  .then('./services')
  .then('./routes')
  .then('./config/router.js')
  .into(app);

app.get('/', (req, res) => {
  res.status(200).send();
});
/*
// show querys on console
app.db.on('query', (query) => {
  console.log({
    sql: query.sql,
    bindings: query.bindings ? query.bindings.join(',') : ''
  });
    
    }).on('query-response', (response) => {
          console.log(response);;
});
*/
module.exports = app;
