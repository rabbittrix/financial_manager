const supertest = require("supertest");
const request = require('supertest');
const app = require('../src/app');

test('Must answer at the root', () => {
  return request(app).get('/')
    .then((res) => {
      expect(res.status).toBe(200);
     });
 });
