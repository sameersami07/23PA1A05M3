const test = require('node:test');
const assert = require('node:assert/strict');
const { credentialsValid } = require('../index');

test('credentialsValid returns false when env vars missing', () => {
  assert.equal(
    credentialsValid({
      email: '',
      name: 'Test',
      rollNo: '23PA1A05M3',
      clientID: 'id',
      clientSecret: 'secret',
    }),
    false
  );
});

test('credentialsValid returns true when all fields present', () => {
  assert.equal(
    credentialsValid({
      email: 'a@b.com',
      name: 'Test',
      rollNo: '23PA1A05M3',
      clientID: 'id',
      clientSecret: 'secret',
    }),
    true
  );
});
