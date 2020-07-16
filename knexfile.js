module.exports = {
  test: {
    client: "pg",
    version: "8.2.1",
    connection: {
      host: "localhost",
      user: "postgres",
      password: "admin",
      database: "financial",
    },
    migrations: {
      directory: "src/migrations",
    },
  },
};
