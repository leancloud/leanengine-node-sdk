'use strict';

var AV = require('..'),
  should = require('should'),
  assert = require('assert');

const appInfo = require('./helpers/app-info');

var appId = appInfo.appId;
var appKey = appInfo.appKey;
var masterKey = appInfo.masterKey;
var hookKey = appInfo.hookKey;

var app;

if (process.env.FRAMEWORK == 'koa') {
  var koa = require('koa')();
  koa.use(AV.koa());
  app = koa.listen();
} else {
  app = AV.express();
}

var request = require('supertest');

require('./helpers/hooks');

describe('hook', function() {
  it('beforeSave', function(done) {
    request(app)
      .post('/1/functions/TestReview/beforeSave')
      .set('X-AVOSCloud-Application-Id', appId)
      .set('X-AVOSCloud-Application-Key', appKey)
      .set('X-LC-Hook-Key', hookKey)
      .set('Content-Type', 'application/json')
      .send({
        object: {
          comment: '123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890',
          stars: 1
        },
      })
      .expect(200)
      .end(function(err, res) {
        res.body.stars.should.equal(1);
        res.body.comment.should.equal('12345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567...');
        done();
      });
  });

  it('beforeSave (promise)', done => {
    request(app)
      .post('/1/functions/TestPromise/beforeSave')
      .set('X-AVOSCloud-Application-Id', appId)
      .set('X-AVOSCloud-Application-Key', appKey)
      .set('X-LC-Hook-Key', hookKey)
      .set('Content-Type', 'application/json')
      .send({
        object: {
          stars: 1
        },
      })
      .expect(200)
      .end(function(err, res) {
        res.body.stars.should.equal(1);
        done(err);
      });
  });

  it('client error in beforeSave (promise)', (done) => {
    request(app)
      .post('/1/functions/TestPromiseClientError/beforeSave')
      .set('X-AVOSCloud-Application-Id', appId)
      .set('X-AVOSCloud-Application-Key', appKey)
      .set('X-LC-Hook-Key', hookKey)
      .set('Content-Type', 'application/json')
      .send({
        object: {
          stars: 1
        },
      })
      .expect(400)
      .end(function(err, res) {
        res.body.error.should.equal('OMG...');
        done(err);
      });
  });

  it('server error in beforeSave (promise)', done => {
    request(app)
      .post('/1/functions/TestPromiseServerError/beforeSave')
      .set('X-AVOSCloud-Application-Id', appId)
      .set('X-AVOSCloud-Application-Key', appKey)
      .set('X-LC-Hook-Key', hookKey)
      .set('Content-Type', 'application/json')
      .send({
        object: {
          stars: 1
        },
      })
      .expect(500)
      .end(function(err, res) {
        res.body.error.should.be.match(/noThisMethod is not defined/);
        done(err);
      });
  });

  it('error in afterSave (promise)', done => {
    request(app)
      .post('/1/functions/TestPromiseServerError/afterSave')
      .set('X-AVOSCloud-Application-Id', appId)
      .set('X-AVOSCloud-Application-Key', appKey)
      .set('X-LC-Hook-Key', hookKey)
      .set('Content-Type', 'application/json')
      .send({
        object: {
          stars: 1
        },
      })
      .expect(500)
      .end(done);
  });

  it('beforeSave should fail without sign', function(done) {
    request(app)
      .post('/1/functions/TestReview/beforeSave')
      .set('X-AVOSCloud-Application-Id', appId)
      .set('X-AVOSCloud-Application-Key', appKey)
      .set('Content-Type', 'application/json')
      .send({
        object: {
          comment: '123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890',
          stars: 1
        },
      })
      .expect(401)
      .end(function(err, res) {
        res.body.error.should.match(/Hook key check failed/);
        done();
      });
  });

  it('beforeSave_ContainsFile', function(done) {
    request(app)
      .post('/1/functions/ContainsFile/beforeSave')
      .set('X-AVOSCloud-Application-Id', appId)
      .set('X-AVOSCloud-Application-Key', appKey)
      .set('X-LC-Hook-Key', hookKey)
      .set('Content-Type', 'application/json')
      .send({
        object: {
          file: {
            __type: 'File',
            objectId: '55543fc2e4b0846760bd92f3',
            url: 'http://ac-4h2h4okw.clouddn.com/4qSbLMO866Tf4YtT9QEwJwysTlHGC9sMl7bpTwhQ.jpg'
          }
        }
      })
      .expect(200, done);
  });

  it('beforeSave_error', function(done) {
    request(app)
      .post('/1/functions/TestReview/beforeSave')
      .set('X-AVOSCloud-Application-Id', appId)
      .set('X-AVOSCloud-Application-Key', appKey)
      .set('X-LC-Hook-Key', hookKey)
      .set('Content-Type', 'application/json')
      .send({
        "object": {
          "stars": 0
        }
      })
      .expect(400)
      .expect({ code: 1, error: 'you cannot give less than one star' }, done);
  });

  it('beforeSave_user', function(done) {
    request(app)
      .post('/1/functions/TestClass/beforeSave')
      .set('X-AVOSCloud-Application-Id', appId)
      .set('X-AVOSCloud-Application-Key', appKey)
      .set('X-LC-Hook-Key', hookKey)
      .set('Content-Type', 'application/json')
      .send({
        "user": {
          "username": "admin",
          "importFromParse": true,
          "emailVerified": false,
          "objectId": "52aebbdee4b0c8b6fa455aa7",
          "createdAt": "2013-12-16T16:37:50.059Z",
          "updatedAt": "2013-12-16T16:37:50.059Z"
        },
        "object": {}
      })
      .expect(200)
      .end(function(err, res) {
        res.body.user.should.eql({
          "__type": "Pointer",
          "className": "_User",
          "objectId": "52aebbdee4b0c8b6fa455aa7"
        });
        done();
      });
  });

  it("beforeSave_throw_error", function(done) {
    var ori = console.warn;
    var warnLogs = [];
    console.warn = function() {
      warnLogs.push(arguments);
      ori.apply(console, arguments);
    };
    request(app)
      .post("/1.1/functions/ErrorObject/beforeSave")
      .set('X-AVOSCloud-Application-Id', appId)
      .set('X-AVOSCloud-Application-Key', appKey)
      .set('X-LC-Hook-Key', hookKey)
      .send({
        object: {
          foo: 'bar'
        }
      })
      .expect(500, function(err, res) {
        res.body.code.should.be.equal(1);
        res.body.error.should.be.equal('a.noThisMethod is not a function');
        console.warn = ori;
        warnLogs.some(function(log) {
          return log[0].trim().match(/LeanEngine: \/ErrorObject\/beforeSave: 500: TypeError: a\.noThisMethod is not a function/);
        }).should.equal(true);
        done();
      });
  });

  it("beforeSave_not_found", function(done) {
    request(app)
      .post("/1.1/functions/NoThisObject/beforeSave")
      .set('X-AVOSCloud-Application-Id', appId)
      .set('X-AVOSCloud-Application-Key', appKey)
      .set('X-LC-Hook-Key', hookKey)
      .send({
        object: {
          foo: 'bar'
        }
      })
      .expect(404)
      .expect({ code: 1, error: `No beforeSave hook of 'NoThisObject'` }, done);
  });

  it('beforeUpdate', function(done) {
    request(app)
      .post('/1/functions/TestReview/beforeUpdate')
      .set('X-AVOSCloud-Application-Id', appId)
      .set('X-AVOSCloud-Application-Key', appKey)
      .set('X-LC-Hook-Key', hookKey)
      .set('Content-Type', 'application/json')
      .send({
        "object": {
          "_updatedKeys": ['comment'],
          "comment": "a short comment",
          "stars": 1
        }
      })
      .expect(200, done);
  });

  it('beforeUpdate_didNotUpdateComment', function(done) {
    request(app)
      .post('/1/functions/TestReview/beforeUpdate')
      .set('X-AVOSCloud-Application-Id', appId)
      .set('X-AVOSCloud-Application-Key', appKey)
      .set('X-LC-Hook-Key', hookKey)
      .set('Content-Type', 'application/json')
      .send({
        "object": {
          "_updatedKeys": ['star'],
          "comment": "a short comment",
          "stars": 1
        }
      })
      .expect(200, done);
  });

  it('beforeUpdate_rejected', function(done) {
    request(app)
      .post('/1/functions/TestReview/beforeUpdate')
      .set('X-AVOSCloud-Application-Id', appId)
      .set('X-AVOSCloud-Application-Key', appKey)
      .set('X-LC-Hook-Key', hookKey)
      .set('Content-Type', 'application/json')
      .send({
        "object": {
          "_updatedKeys": ['comment'],
          "comment": "a looooooooooooooooooooooooooooooooooooooog comment",
          "stars": 1
        }
      })
      .expect(400)
      .expect({ code: 1, error: 'comment must short than 50' }, done);
  });

  it('afterSave', function(done) {
    request(app)
      .post('/1/functions/TestReview/afterSave')
      .set('X-AVOSCloud-Application-Id', appId)
      .set('X-AVOSCloud-Application-Key', appKey)
      .set('X-LC-Hook-Key', hookKey)
      .set('Content-Type', 'application/json')
      .send({
        "object": {
          "objectId": "5403e36be4b0b77b5746b292",
          "post": {
            "objectId": "5403e36be4b0b77b5746b291"
          }
        }
      })
      .expect(200)
      .expect({
        "result": "ok"
      }, done);
  });

  it('afterSave_error', function(done) {
    var stderr_write = process.stderr.write;
    var strings = [];
    global.process.stderr.write = function(string) {
      strings.push(string);
    };
    request(app)
      .post('/1/functions/TestError/afterSave')
      .set('X-AVOSCloud-Application-Id', appId)
      .set('X-AVOSCloud-Application-Key', appKey)
      .set('X-LC-Hook-Key', hookKey)
      .set('Content-Type', 'application/json')
      .send({
        "object": {
          "post": {
            "objectId": "5403e36be4b0b77b5746b291"
          }
        }
      })
      .expect(200)
      .expect({result: 'ok'}, function() {
        assert.deepEqual(`LeanEngine: /TestError/afterSave: 500: ReferenceError: noThisMethod is not defined`, strings[0].split('\n')[0]);
        assert.equal(1, strings.length);
        global.process.stderr.write = stderr_write;
        done();
      });
  });

  it('hook_not_found', function(done) {
    request(app)
    .post('/1/functions/NoThisClass/afterSave')
    .set('X-AVOSCloud-Application-Id', appId)
    .set('X-AVOSCloud-Application-Key', appKey)
    .set('X-LC-Hook-Key', hookKey)
    .set('Content-Type', 'application/json')
    .send({
      "object": {
        "post": {
          "objectId": "5403e36be4b0b77b5746b291"
        }
      }
    })
    .expect(404)
    .expect({ code: 1, error: `No afterSave hook of 'NoThisClass'` }, done);
  });

  it('afterUpdate', function(done) {
    request(app)
    .post('/1/functions/TestClass/afterUpdate')
    .set('X-AVOSCloud-Application-Id', appId)
    .set('X-AVOSCloud-Application-Key', appKey)
    .set('X-LC-Hook-Key', hookKey)
    .set('Content-Type', 'application/json')
    .send({
      object: {
        "_updatedKeys": ['foo'],
        objectId: '556904d8e4b09419960c14bd',
        foo: 'bar'
      }
    })
    .expect(200, function(err, res) {
      res.body.should.eql({ result: 'ok' });
      setTimeout(function() { // 等待数据更新
        done();
      }, 1000);
    });
  });

  it('should be deleted', function(done) {
    request(app)
    .post('/1/functions/TestClass/beforeDelete')
    .set('X-AVOSCloud-Application-Id', appId)
    .set('X-AVOSCloud-Application-Key', appKey)
    .set('X-LC-Hook-Key', hookKey)
    .set('Content-Type', 'application/json')
    .send({
      object: {
        objectId: '55690242e4b09419960c01f5',
        foo: 'bar'
      }
    })
    .expect(200)
    .expect({}, done);
  });

  it('should not be deleted', function(done) {
    request(app)
    .post('/1/functions/TestClass/beforeDelete')
    .set('X-AVOSCloud-Application-Id', appId)
    .set('X-AVOSCloud-Application-Key', appKey)
    .set('X-LC-Hook-Key', hookKey)
    .set('Content-Type', 'application/json')
    .send({
      object: {
        objectId: '55690242e4b09419960c01f6',
        foo: 'important'
      }
    })
    .expect(400)
    .expect({ code: 1, error: "important note" }, done);
  });

  it('onVerified', function(done) {
    request(app)
      .post('/1/functions/onVerified/sms')
      .set('X-AVOSCloud-Application-Id', appId)
      .set('X-AVOSCloud-Application-Key', appKey)
      .set('X-LC-Hook-Key', hookKey)
      .set('Content-Type', 'application/json')
      .send({
        "object": {
          "objectId": '54fd6a03e4b06c41e00b1f40',
          "username": 'admin'
        },
      })
      .expect(200)
      .expect({
        'result': 'ok'
      }, done);
  });

  it('on_login', function(done) {
    request(app)
      .post('/1/functions/_User/onLogin')
      .set('X-AVOSCloud-Application-Id', appId)
      .set('X-AVOSCloud-Application-Key', appKey)
      .set('X-LC-Hook-Key', hookKey)
      .set('Content-Type', 'application/json')
      .send({
        "object": {
          "objectId": '54fd6a03e4b06c41e00b1f40',
          "username": 'admin'
        }
      })
      .expect(200)
      .expect({
        'result': 'ok'
      }, done);
  });

  it('on_login_error', function(done) {
    request(app)
      .post('/1/functions/_User/onLogin')
      .set('X-AVOSCloud-Application-Id', appId)
      .set('X-AVOSCloud-Application-Key', appKey)
      .set('X-LC-Hook-Key', hookKey)
      .set('Content-Type', 'application/json')
      .send({
        "object": {
          "objectId": '55068ea4e4b0c93838ece36d',
          "username": 'noLogin'
        }
      })
      .expect(400)
      .expect({
        'code': 1,
        'error': 'Forbidden'
      }, done);
  });

  it('_metadatas', function(done) {
    request(app)
      .get('/1/functions/_ops/metadatas')
      .set('X-AVOSCloud-Application-Id', appId)
      .set('X-AVOSCloud-Master-Key', masterKey)
      .expect(200, function(err, res) {
        res.body.result.sort().should.containDeep([
          "__after_save_for_TestError",
          "__after_save_for_TestReview",
          "__before_save_for_TestClass",
          "__before_save_for_TestReview",
          "__on_login__User",
          "__on_verified_sms"
        ]);
        done();
      });
  });

  it('onCompleteBigqueryJob', function(done) {
    request(app)
      .post('/1.1/functions/BigQuery/onComplete')
      .set('X-AVOSCloud-Application-Id', appId)
      .set('X-AVOSCloud-Application-Key', appKey)
      .set('X-LC-Hook-Key', hookKey)
      .send({
        id : "job id",
        status: "OK/ERROR",
        message: "当 status 为 ERROR 时的错误消息"
      })
      .expect(200, done);
  });
});
