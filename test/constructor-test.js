const request = require('supertest');
const should = require('should');

require('./fixtures/functions');

const {appId, appKey} = require('./fixtures/app-info');

describe('constructor', function() {
  it('onError option', function(done) {
    const app = require('./fixtures/app')({
      onError: (err) => {
        err.message.should.be.equal('some message');
        err.status.should.be.equal(400);
        done();
      }
    });

    request(app)
      .post('/1.1/functions/clientErrorPromise')
      .set('X-AVOSCloud-Application-Id', appId)
      .set('X-AVOSCloud-Application-Key', appKey)
      .expect(400, (err) => {
        if (err) {
          done(err);
        }
      });
  });

  it('ignoreInvalidSessionToken option', function(done) {
    const app = require('./fixtures/app')({
      ignoreInvalidSessionToken: true
    });

    request(app)
      .post('/1.1/functions/whoami')
      .set('X-AVOSCloud-Application-Id', appId)
      .set('X-AVOSCloud-Application-Key', appKey)
      .set('X-LC-Session', '00000000000000000000')
      .expect(200, done);
  });
});
