const app = require('express')();
const consign = require('consign');
const knex = require('knex');
const winston = require("winston");
const uuid = require("uuidv4");
const knexfile = require('../knexfile');
//const { query } = require('express');
//const knexLogger = require('knex-logger');

// TODO create dynamic switching
//app.db = knex(knexfile[process.env.NODE_ENV]);
//app.db = knex(knexfile.test);

//app.use(knexLogger(app.db));

app.log = winston.createLogger({
  level: "debug",
  transports: [
    new winston.transports.Console({
      format: winston.format.json({ space: 1 }),
    }),
    new winston.transports.File({
      filename: "logs/error.log",
      level: "warn",
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json({ space: 1 })
      ),
    }),
  ],
});

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
app.use((err, req, res, next) => {
  const { name, message, stack } = err;
  if (name === "ValidationError") res.status(400).json({ error: message });
  else if (name === "RecursoIndevidoError")
    res.status(403).json({ error: message });
  else {
    const id = uuid();
    // console.log(message);
    app.log.error({ id, name, message, stack });
    res.status(500).json({ id, error: "Falha interna" });
  }
  next(err);
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
