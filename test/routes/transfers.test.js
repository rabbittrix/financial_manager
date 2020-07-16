const request = require('supertest');
const app = require('../../src/app');

const MAIN_ROUTE = '/v1/transfers';
const TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MTAwMDAsIm5hbWUiOiJVc2VyICMxIiwibWFpbCI6InVzZXIxQG1haWwuY29tIn0.QMgvo_lPe0Rdxpx7cay_hIkDAbjCK_--VD2fP0NTTqk';

beforeAll(async () => {
  // await app.db.migrate.rollback();
  // await app.db.migrate.latest();
  await app.db.seed.run();
});

test('Only list the users transfers', () => {
  return request(app).get(MAIN_ROUTE)
    .set('authorization', `bearer ${TOKEN}`)
    .then((res) => {
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].description).toBe('Transfer #1');
    });
});

test('You must insert a transfer successfully', () => {
  return request(app).post(MAIN_ROUTE)
    .set('authorization', `bearer ${TOKEN}`)
    .send({ description: 'Regular Transfer', user_id: 10000, acc_ori_id: 10000, acc_dest_id: 10001, amount: 100, date: new Date() })
    .then(async (res) => {
      expect(res.status).toBe(201);
      expect(res.body.description).toBe('Regular Transfer');

      const transactions = await app.db('transactions').where({ transfer_id: res.body.id });
      expect(transactions).toHaveLength(2);
      expect(transactions[0].description).toBe('Transfer to acc #10001');
      expect(transactions[1].description).toBe('Transfer from acc #10000');
      expect(transactions[0].amount).toBe('-100.00');
      expect(transactions[1].amount).toBe('100.00');
      expect(transactions[0].acc_id).toBe(10000);
      expect(transactions[1].acc_id).toBe(10001);
    });
});

describe('When saving a valid transfer...', () => {
  let transferId;
  let income;
  let outcome;

  test('The status 201 and the transfer data must be returned', () => {
    return request(app).post(MAIN_ROUTE)
      .set('authorization', `bearer ${TOKEN}`)
      .send({ description: 'Regular Transfer', user_id: 10000, acc_ori_id: 10000, acc_dest_id: 10001, amount: 100, date: new Date() })
      .then(async (res) => {
        expect(res.status).toBe(201);
        expect(res.body.description).toBe('Regular Transfer');
        transferId = res.body.id;
      });
  });

  test('Equivalent transactions must have been generated', async () => {
    const transactions = await app.db('transactions').where({ transfer_id: transferId }).orderBy('amount');
    expect(transactions).toHaveLength(2);
    [outcome, income] = transactions;
  });

  test('The outbound transaction must be negative', () => {
    expect(outcome.description).toBe('Transfer to acc #10001');
    expect(outcome.amount).toBe('-100.00');
    expect(outcome.acc_id).toBe(10000);
    expect(outcome.type).toBe('O');
  });

  test('Incoming transaction must be positive', () => {
    expect(income.description).toBe('Transfer from acc #10000');
    expect(income.amount).toBe('100.00');
    expect(income.acc_id).toBe(10001);
    expect(income.type).toBe('I');
  });

  test('Both must reference the transfer that originated them', () => {
    expect(income.transfer_id).toBe(transferId);
    expect(outcome.transfer_id).toBe(transferId);
  });

  test('Both must be in status', () => {
    expect(income.status).toBe(true);
    expect(outcome.status).toBe(true);
  });
});

describe('When trying to save an invalid transfer...', () => {
  const validTransfer = { description: 'Regular Transfer', user_id: 10000, acc_ori_id: 10000, acc_dest_id: 10001, amount: 100, date: new Date() };

  const template = (newData, errorMessage) => {
    return request(app).post(MAIN_ROUTE)
      .set('authorization', `bearer ${TOKEN}`)
      .send({ ...validTransfer, ...newData })
      .then((res) => {
        expect(res.status).toBe(400);
        expect(res.body.error).toBe(errorMessage);
      });
  };

  test('Should not insert without description', () => template({ description: null }, 'Description is a required attribute'));
  test('Must not insert worthless', () => template({ amount: null }, 'Value is a required attribute'));
  test('You must not insert without a date', () => template({ date: null }, 'Date is a required attribute'));
  test('You should not enter without a source account', () => template({ acc_ori_id: null }, 'Source Account is a required attribute'));
  test('You must not enter without a target account', () => template({ acc_dest_id: null }, 'Target Account is a required attribute'));
  test('You should not enter if the source and destination accounts are the same', () => template({ acc_dest_id: 10000 }, 'It is not possible to transfer from an account to itself'));
  test('You should not enter if the accounts belong to another user', () => template({ acc_ori_id: 10002 }, 'Account # 10002 does not belong to the user'));
});

test('You must return a transfer by Id', () => {
  return request(app).get(`${MAIN_ROUTE}/10000`)
    .set('authorization', `bearer ${TOKEN}`)
    .then((res) => {
      expect(res.status).toBe(200);
      expect(res.body.description).toBe('Transfer #1');
    });
});

describe('When changing a valid transfer...', () => {
  let transferId;
  let income;
  let outcome;

  test('Status 200 and transfer data must be returned', () => {
    return request(app).put(`${MAIN_ROUTE}/10000`)
      .set('authorization', `bearer ${TOKEN}`)
      .send({ description: 'Transfer Updated', user_id: 10000, acc_ori_id: 10000, acc_dest_id: 10001, amount: 500, date: new Date() })
      .then(async (res) => {
        expect(res.status).toBe(200);
        expect(res.body.description).toBe('Transfer Updated');
        expect(res.body.amount).toBe('500.00');
        transferId = res.body.id;
      });
  });

  test('Equivalent transactions must have been generated', async () => {
    const transactions = await app.db('transactions').where({ transfer_id: transferId }).orderBy('amount');
    expect(transactions).toHaveLength(2);
    [outcome, income] = transactions;
  });

  test('The outbound transaction must be negative', () => {
    expect(outcome.description).toBe('Transfer to acc #10001');
    expect(outcome.amount).toBe('-500.00');
    expect(outcome.acc_id).toBe(10000);
    expect(outcome.type).toBe('O');
  });

  test('Incoming transaction must be positive', () => {
    expect(income.description).toBe('Transfer from acc #10000');
    expect(income.amount).toBe('500.00');
    expect(income.acc_id).toBe(10001);
    expect(income.type).toBe('I');
  });

  test('Both must reference the transfer that originated them', () => {
    expect(income.transfer_id).toBe(transferId);
    expect(outcome.transfer_id).toBe(transferId);
  });
});

describe('When trying to change an invalid transfer...', () => {
  const validTransfer = { description: 'Regular Transfer', user_id: 10000, acc_ori_id: 10000, acc_dest_id: 10001, amount: 100, date: new Date() };

  const template = (newData, errorMessage) => {
    return request(app).put(`${MAIN_ROUTE}/10000`)
      .set('authorization', `bearer ${TOKEN}`)
      .send({ ...validTransfer, ...newData })
      .then((res) => {
        expect(res.status).toBe(400);
        expect(res.body.error).toBe(errorMessage);
      });
  };

  test('Should not insert without description', () => template({ description: null }, 'Description is a required attribute'));
  test('Must not insert worthless', () => template({ amount: null }, 'Value is a required attribute'));
  test('You must not insert without a date', () => template({ date: null }, 'Date is a required attribute'));
  test('You should not enter without a source account', () => template({ acc_ori_id: null }, 'Source Account is a required attribute'));
  test('You must not enter without a target account', () => template({ acc_dest_id: null }, 'Target Account is a required attribute'));
  test('You should not enter if the source and destination accounts are the same', () => template({ acc_dest_id: 10000 }, 'It is not possible to transfer from an account to itself'));
  test('You should not enter if the accounts belong to another user', () => template({ acc_ori_id: 10002 }, 'Account # 10002 does not belong to the user'));
});

describe('When removing a transfer', () => {
  test('Must return status 204', () => {
    return request(app).delete(`${MAIN_ROUTE}/10000`)
      .set('authorization', `bearer ${TOKEN}`)
      .then((res) => {
        expect(res.status).toBe(204);
      });
  });

  test('The record must have been removed from the bank', () => {
    return app.db('transfers').where({ id: 10000 })
      .then((result) => {
        expect(result).toHaveLength(0);
      });
  });

  test('The associated terms must have been removed', () => {
    return app.db('transactions').where({ transfer_id: 10000 })
      .then((result) => {
        expect(result).toHaveLength(0);
      });
  });
});

test('Should not return transfer from another user', () => {
  return request(app).get(`${MAIN_ROUTE}/10001`)
    .set('authorization', `bearer ${TOKEN}`)
    .then((res) => {
      expect(res.status).toBe(403);
      expect(res.body.error).toBe('This resource does not belong of user');
    });
});
