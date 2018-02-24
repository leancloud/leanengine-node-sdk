const request = require('supertest');
const should = require('should');

require('./fixtures/functions');

const {appId, appKey} = require('./fixtures/app-info');

describe('onError option', function() {
  it('should be called with error', function(done) {
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
});
