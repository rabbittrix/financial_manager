const request = require('supertest')
const app = require('../../src/app')

test('Must create user via signup', () => {
  return request(app).post('/auth/signup')
    .send({
      name: 'Roberto',
      mail: `${Date.now()}@mail.com`,
      password: '123456'
    })
    .then((res) => {
      expect(res.status).toBe(201);
      expect(res.body.name).toBe('Roberto');
      expect(res.body).toHaveProperty('mail');
      expect(res.body).not.toHaveProperty('password');
    });
});

test('Must receive token when logging', () => {
  const mail = `${Date.now()}@gmail.com`;
  return app.services.user.save({ name: 'Roberto', mail, password: '123456' })
    .then(() => request(app).post('/auth/signin')
      .send({ mail, password: '123456' }))
    .then((res) => {
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('token');
    });
});

test('Must not authenticate user with wrong password', () => {
  const mail = `${Date.now()}@gmail.com`;
  return app.services.user.save({ name: 'Roberto', mail, password: '123456' })
    .then(() => request(app).post('/auth/signin')
        .send({ mail, password: '654787' })
    ).then((res) => {
      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Wrong username or password');
    });
});

test('Must not authenticate user with wrong password', () => {
  return request(app).post('/auth/signin')
      .send({ mail: 'test@gmail.com', password: '654787'})
      .then((res) => {
      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Wrong username or password');
    });
});

test('You must not access a tokenless route', () => {
  return request(app).get('/v1/users')
    .then((res) => {
      expect(res.status).toBe(401);
    });
});
