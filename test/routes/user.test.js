const request = require('supertest');
const jwt = require('jwt-simple');
const app = require('../../src/app');

const MAIN_ROUTE = '/v1/users';
const mail = `${Date.now()}@gmail.com`;
let user;

beforeAll(async () => {
  const res = await app.services.user.save({
    name: 'User Account',
    mail: `${Date.now()}@mail.com`,
    passwd: '123456'
  });
  user = { ...res[0]};
  user.token = jwt.encode(user, 'SecretKey!');
});

test('Must list all users', () => {
  return request(app).get(MAIN_ROUTE)
    .set('authorization', `bearer ${user.token}`)
    .then((res) => {
      expect(res.status).toBe(200);
      expect(res.body.length).toBeGreaterThan(0);
    });
});

test('You must insert user successfully', () => {
  return request(app).post(MAIN_ROUTE)
    .send({ name: 'Jessica Karoline', mail, password: '123456' })
    .set('authorization', `bearer ${user.token}`)
    .then((res) => {
      expect(res.status).toBe(201);
      expect(res.body.name).toBe('Jessica Karoline');
      expect(res.body).not.toHaveProperty('password');
    });
});

test('Must store encrypted password', async () => {
  const res = await request(app).post(MAIN_ROUTE)
    .send({ name: 'Roberto de Souza', mail: `${Date.now()}@gmail.com`, password: '123456' })
    .set('authorization', `bearer ${user.token}`);
  expect(res.status).toBe(201);

  const {id} = res.body;
  const userDB = await app.services.user
    .findOne({id});
  expect(userDB.password).not.toBeUndefined();
  expect(userDB.password).not.toBe('123456');
});

test('You must not enter an unnamed user', () => {
  return request(app).post(MAIN_ROUTE)
    .send({ name: 'Roberto de Souza', mail: `${Date.now()}@gmail.com`, password: '123456' })
    .set('authorization', `bearer ${user.token}`)
    .then((res) => {
      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Name is a required attribute');
    });
});

test('You must not enter a user without an email', async () => {
  const result = await request(app).post(MAIN_ROUTE)
    .send({ name: 'Roberto de Souza', password: '123456' })
    .set('authorization', `bearer ${user.token}`);
  expect(result.status).toBe(400);
  expect(result.body.error).toBe('E-mail is a required attribute')
});

test('You must not enter a user without a password', (done) => {
  request(app).post(MAIN_ROUTE)
    .send({
      name: 'Jassica Karoline',
      mail: 'test@gmail.com'
    })
    .set('authorization', `bearer ${user.token}`)
    .then((res) => {
      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Password is a required attribute');
      done();
    }).catch(err => done.fail(err));
});

test('You must not insert a user with an existing email', () => {
  return request(app).post(MAIN_ROUTE)
    .send({
      name: 'Jessica Karoline',
      mail,
      password: '123456'
    })
    .set('authorization', `bearer ${user.token}`)
    .then((res) => {
      expect(res.status).toBe(400);
      expect(res.body.error).toBe('There is already a user with this email');
    });
});
