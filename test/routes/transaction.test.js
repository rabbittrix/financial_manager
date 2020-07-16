const request = require('supertest');
const jwt = require('jwt-simple');
const app = require('../../src/app');

const MAIN_ROUTE = '/v1/transactions';
let user;
let user2;
let accUser;
let accUser2;

beforeAll(async () => {
  await app.db('transactions').del();
  await app.db('transfers').del();
  await app.db('accounts').del();
  await app.db('users').del();
  const users = await app.db('users').insert([
    { name: 'User #1', mail: 'user@mail.com', password: '$2a$10$g/pUCawzXIWyptihgHMU2u1nYc/3ucEhTTue7S4/GG2hRZ1km/1FS' },
    { name: 'User #2', mail: 'user2@mail.com', password: '$2a$10$g/pUCawzXIWyptihgHMU2u1nYc/3ucEhTTue7S4/GG2hRZ1km/1FS' },
  ], '*');
  [user, user2] = users;
  delete user.password;
  user.token = jwt.encode(user, 'SecretKey!');
  const accs = await app.db('accounts').insert([
    { name: 'Acc #1', user_id: user.id },
    { name: 'Acc #2', user_id: user2.id },
  ], '*');
  [accUser, accUser2] = accs;
});

test('List only the users transactions', () => {
  return app.db('transactions').insert([
    { description: 'T1', date: new Date(), amount: 100, type: 'I', acc_id: accUser.id },
    { description: 'T2', date: new Date(), amount: 300, type: 'O', acc_id: accUser2.id },
  ]).then(() => request(app).get(MAIN_ROUTE)
    .set('authorization', `bearer ${user.token}`)
    .then((res) => {
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].description).toBe('T1');
    }));
});

test('You must enter a transaction successfully', () => {
  return request(app).post(MAIN_ROUTE)
    .set('authorization', `bearer ${user.token}`)
    .send({ description: 'New T', date: new Date(), amount: 100, type: 'I', acc_id: accUser.id })
    .then((res) => {
      expect(res.status).toBe(201);
      expect(res.body.acc_id).toBe(accUser.id);
      expect(res.body.amount).toBe('100.00');
    });
});

test('Inbound transactions must be positive', () => {
  return request(app).post(MAIN_ROUTE)
    .set('authorization', `bearer ${user.token}`)
    .send({ description: 'New T', date: new Date(), amount: -100, type: 'I', acc_id: accUser.id })
    .then((res) => {
      expect(res.status).toBe(201);
      expect(res.body.acc_id).toBe(accUser.id);
      expect(res.body.amount).toBe('100.00');
    });
});

test('Saddle transactions must be negative', () => {
  return request(app).post(MAIN_ROUTE)
    .set('authorization', `bearer ${user.token}`)
    .send({ description: 'New T', date: new Date(), amount: 100, type: 'O', acc_id: accUser.id })
    .then((res) => {
      expect(res.status).toBe(201);
      expect(res.body.acc_id).toBe(accUser.id);
      expect(res.body.amount).toBe('-100.00');
    });
});

describe('When trying to enter an invalid transaction', () => {
  const testTemplate = (newData, errorMessage) => {
    return request(app).post(MAIN_ROUTE)
      .set('authorization', `bearer ${user.token}`)
      .send({ description: 'New T', date: new Date(), amount: 100, type: 'I', acc_id: accUser.id, ...newData })
      .then((res) => {
        expect(res.status).toBe(400);
        expect(res.body.error).toBe(errorMessage);
      });
  };

  test('Should not insert without description', () => testTemplate({ description: null }, 'Description is a required attribute'));
  test('Must not insert worthless', () => testTemplate({ amount: null }, 'Value is a required attribute'));
  test('You must not enter a transaction without a date', () => testTemplate({ date: null }, 'Date is a required attribute'));
  test('You must not enter a transaction without an account', () => testTemplate({ acc_id: null }, 'Account is a required attribute'));
  test('You must not enter a transaction without type', () => testTemplate({ type: null }, 'Type is a required attribute'));
  test('You must not enter a transaction with an invalid type', () => testTemplate({ type: 'A' }, 'Invalid type'));
});

test('Must return a transaction by ID', () => {
  return app.db('transactions').insert(
    { description: 'T ID', date: new Date(), amount: 100, type: 'I', acc_id: accUser.id }, ['id'],
  ).then(trans => request(app).get(`${MAIN_ROUTE}/${trans[0].id}`)
    .set('authorization', `bearer ${user.token}`)
    .then((res) => {
      expect(res.status).toBe(200);
      expect(res.body.id).toBe(trans[0].id);
      expect(res.body.description).toBe('T ID');
    }));
});

test('You must change a transaction', () => {
  return app.db('transactions').insert(
    { description: 'to Update', date: new Date(), amount: 100, type: 'I', acc_id: accUser.id }, ['id'],
  ).then(trans => request(app).put(`${MAIN_ROUTE}/${trans[0].id}`)
    .set('authorization', `bearer ${user.token}`)
    .send({ description: 'Updated' })
    .then((res) => {
      expect(res.status).toBe(200);
      expect(res.body.description).toBe('Updated');
    }));
});

test('You must remove a transaction', () => {
  return app.db('transactions').insert(
    { description: 'To delete', date: new Date(), amount: 100, type: 'I', acc_id: accUser.id }, ['id'],
  ).then(trans => request(app).delete(`${MAIN_ROUTE}/${trans[0].id}`)
    .set('authorization', `bearer ${user.token}`)
    .then((res) => {
      expect(res.status).toBe(204);
    }));
});

test('You must not remove a transaction from another user', () => {
  return app.db('transactions').insert(
    { description: 'To delete', date: new Date(), amount: 100, type: 'I', acc_id: accUser2.id }, ['id'],
  ).then(trans => request(app).delete(`${MAIN_ROUTE}/${trans[0].id}`)
    .set('authorization', `bearer ${user.token}`)
    .then((res) => {
      expect(res.status).toBe(403);
      expect(res.body.error).toBe('This resource does not belong of user');
    }));
});

test('You must not remove account with transaction', () => {
  return app.db('transactions').insert(
    { description: 'To delete', date: new Date(), amount: 100, type: 'I', acc_id: accUser.id }, ['id'],
  ).then(() => request(app).delete(`/v1/accounts/${accUser.id}`)
    .set('authorization', `bearer ${user.token}`)
    .then((res) => {
      expect(res.status).toBe(400);
      expect(res.body.error).toBe('This account has associated transactions');
    }));
});
