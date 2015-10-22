'use strict';
var config = require('./config'),
  AV = require('..'),
  should = require('should'), // jshint ignore:line
  assert = require('assert');

var appId = config.appId;
var appKey = config.appKey;
var masterKey = config.masterKey;

AV.initialize(appId, appKey, masterKey);

AV.Cloud.beforeSave("TestClass", function(request, response) {
  if (request.user) {
    assert.equal(request.user.className, '_User');
    assert.equal(request.user, AV.User.current());
  }
  assert.equal(request.object.className, 'TestClass');
  request.object.set('user', request.user);
  response.success();
});

AV.Cloud.beforeSave("TestReview", function(request, response){
  if (request.object.get("stars") < 1) {
    response.error("you cannot give less than one star");
  } else if (request.object.get("stars") > 5) {
    response.error("you cannot give more than five stars");
  } else {
    var comment = request.object.get("comment");
    if (comment && comment.length > 140) {
      // Truncate and add a ...
      request.object.set("comment", comment.substring(0, 137) + "...");
    }
    response.success();
  }
});

AV.Cloud.beforeUpdate("TestReview", function(request, response) {
  if (request.object.updatedKeys.indexOf('comment') != -1) {
    if (request.object.get('comment').length <= 50) {
      response.success();
    } else {
      response.error('comment must short than 50');
    }
  } else {
    response.success();
  }
});

AV.Cloud.beforeSave("ErrorObject", function(request, response) {
  var a = {};
  a.noThisMethod();
  response.success();
});

AV.Cloud.beforeSave('ContainsFile', function(request, response) {
  request.object.get('file').url().should.be.equal('http://ac-4h2h4okw.clouddn.com/4qSbLMO866Tf4YtT9QEwJwysTlHGC9sMl7bpTwhQ.jpg')
  response.success();
});

AV.Cloud.afterSave("TestReview", function(request) {
  assert.equal(request.object.className, 'TestReview');
  assert.equal(request.object.id, '5403e36be4b0b77b5746b292');
});

AV.Cloud.afterSave("TestError", function() {
  noThisMethod(); // jshint ignore:line
});

AV.Cloud.afterUpdate("TestClass", function(request) {
  var bizTime = new Date();
  request.object.set('bizTime', bizTime);
  request.object.save(null, {
    success: function(obj) {
      assert.equal(bizTime, obj.get('bizTime'));
    }
  });
});

AV.Cloud.beforeDelete("TestClass", function(request, response) {
  assert.equal(request.object.className, 'TestClass');
  if (request.object.get('foo') === 'important') {
    return response.error('important note');
  }
  response.success();
});

AV.Cloud.onVerified('sms', function(request) {
  assert.equal(request.object.id, '54fd6a03e4b06c41e00b1f40');
});

AV.Cloud.onLogin(function(request, response) {
  // 因为此时用户还没有登录，所以用户信息是保存在 request.object 对象中
  assert(request.object);
  if (request.object.get('username') == 'noLogin') {
    // 如果是 error 回调，则用户无法登录
    response.error('Forbidden');
  } else {
    // 如果是 success 回调，则用户可以登录
    response.success();
  }
});

var request = require('supertest');

describe('hook', function() {
  it('beforeSave', function(done) {
    request(AV.Cloud)
      .post('/1/functions/TestReview/beforeSave')
      .set('X-AVOSCloud-Application-Id', appId)
      .set('X-AVOSCloud-Application-Key', appKey)
      .set('Content-Type', 'application/json')
      .send({
          "object": {
            "comment": "123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890",
            "stars": 1
          }
      })
      .expect(200)
      .expect({
        "stars": 1,
        "comment": "12345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567..."
      }, done);
  });

  it('beforeSave_ContainsFile', function(done) {
    request(AV.Cloud)
      .post('/1/functions/ContainsFile/beforeSave')
      .set('X-AVOSCloud-Application-Id', appId)
      .set('X-AVOSCloud-Application-Key', appKey)
      .set('Content-Type', 'application/json')
      .send({
          object: {
            file: {
              __type: 'File',
              id: '55543fc2e4b0846760bd92f3',
              url: 'http://ac-4h2h4okw.clouddn.com/4qSbLMO866Tf4YtT9QEwJwysTlHGC9sMl7bpTwhQ.jpg'
            }
          }
      })
      .expect(200, done)
  });

  it('beforeSave_error', function(done) {
    request(AV.Cloud)
      .post('/1/functions/TestReview/beforeSave')
      .set('X-AVOSCloud-Application-Id', appId)
      .set('X-AVOSCloud-Application-Key', appKey)
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
    request(AV.Cloud)
      .post('/1/functions/TestClass/beforeSave')
      .set('X-AVOSCloud-Application-Id', appId)
      .set('X-AVOSCloud-Application-Key', appKey)
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
      .expect({
        "user": {
          "__type": "Pointer",
          "className": "_User",
          "objectId": "52aebbdee4b0c8b6fa455aa7"
        }
      }, done);
  });

  it("beforeSave_throw_error", function(done) {
    var ori = console.warn;
    var warnLogs = [];
    console.warn = function() {
      warnLogs.push(arguments);
    };
    request(AV.Cloud)
      .post("/1.1/functions/ErrorObject/beforeSave")
      .set('X-AVOSCloud-Application-Id', appId)
      .set('X-AVOSCloud-Application-Key', appKey)
      .send({
        object: {
          foo: 'bar'
        }
      })
      .expect(500, function(err, res) {
        res.body.code.should.be.equal(1);
        res.body.error.should.be.match(/(undefined|a\.noThisMethod) is not a function/);
        console.warn = ori;
        warnLogs.length.should.equal(1);
        warnLogs[0][0].split('\n')[0].should.match(/Execute '__before_save_for_ErrorObject' failed with error: TypeError: (undefined|a\.noThisMethod) is not a function/);
        done();
      });
  });

  it("beforeSave_not_found", function(done) {
    request(AV.Cloud)
      .post("/1.1/functions/NoThisObject/beforeSave")
      .set('X-AVOSCloud-Application-Id', appId)
      .set('X-AVOSCloud-Application-Key', appKey)
      .send({
        object: {
          foo: 'bar'
        }
      })
      .expect(404)
      .expect({ code: 1, error: "LeanEngine not found hook '__before_save_for_NoThisObject' for app '" + appId + "' on development." }, done);
  });

  it('beforeUpdate', function(done) {
    request(AV.Cloud)
      .post('/1/functions/TestReview/beforeUpdate')
      .set('X-AVOSCloud-Application-Id', appId)
      .set('X-AVOSCloud-Application-Key', appKey)
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
    request(AV.Cloud)
      .post('/1/functions/TestReview/beforeUpdate')
      .set('X-AVOSCloud-Application-Id', appId)
      .set('X-AVOSCloud-Application-Key', appKey)
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
    request(AV.Cloud)
      .post('/1/functions/TestReview/beforeUpdate')
      .set('X-AVOSCloud-Application-Id', appId)
      .set('X-AVOSCloud-Application-Key', appKey)
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
    request(AV.Cloud)
      .post('/1/functions/TestReview/afterSave')
      .set('X-AVOSCloud-Application-Id', appId)
      .set('X-AVOSCloud-Application-Key', appKey)
      .set('Content-Type', 'application/json')
      .send({
        "object": {
          "id": "5403e36be4b0b77b5746b292",
          "post": {
            "id": "5403e36be4b0b77b5746b291"
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
    request(AV.Cloud)
      .post('/1/functions/TestError/afterSave')
      .set('X-AVOSCloud-Application-Id', appId)
      .set('X-AVOSCloud-Application-Key', appKey)
      .set('Content-Type', 'application/json')
      .send({
        "object": {
          "post": {
            "id": "5403e36be4b0b77b5746b291"
          }
        }
      })
      .expect(200)
      .expect({result: 'ok'}, function() {
        assert.deepEqual('Execute \'__after_save_for_TestError\' failed with error: ReferenceError: noThisMethod is not defined', strings[0].split('\n')[0]);
        assert.equal(1, strings.length);
        global.process.stderr.write = stderr_write;
        done();
      });
  });

  it('hook_not_found', function(done) {
    request(AV.Cloud)
    .post('/1/functions/NoThisClass/afterSave')
    .set('X-AVOSCloud-Application-Id', appId)
    .set('X-AVOSCloud-Application-Key', appKey)
    .set('Content-Type', 'application/json')
    .send({
      "object": {
        "post": {
          "id": "5403e36be4b0b77b5746b291"
        }
      }
    })
    .expect(404)
    .expect({ code: 1, error: "LeanEngine not found hook \'__after_save_for_NoThisClass\' for app \'" + appId + "\' on development." }, done);
  });

  it('afterUpdate', function(done) {
    request(AV.Cloud)
    .post('/1/functions/TestClass/afterUpdate')
    .set('X-AVOSCloud-Application-Id', appId)
    .set('X-AVOSCloud-Application-Key', appKey)
    .set('Content-Type', 'application/json')
    .send({
      object: {
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
    request(AV.Cloud)
    .post('/1/functions/TestClass/beforeDelete')
    .set('X-AVOSCloud-Application-Id', appId)
    .set('X-AVOSCloud-Application-Key', appKey)
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
    request(AV.Cloud)
    .post('/1/functions/TestClass/beforeDelete')
    .set('X-AVOSCloud-Application-Id', appId)
    .set('X-AVOSCloud-Application-Key', appKey)
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
    request(AV.Cloud)
      .post('/1/functions/onVerified/sms')
      .set('X-AVOSCloud-Application-Id', appId)
      .set('X-AVOSCloud-Application-Key', appKey)
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
    request(AV.Cloud)
      .post('/1/functions/_User/onLogin')
      .set('X-AVOSCloud-Application-Id', appId)
      .set('X-AVOSCloud-Application-Key', appKey)
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
    request(AV.Cloud)
      .post('/1/functions/_User/onLogin')
      .set('X-AVOSCloud-Application-Id', appId)
      .set('X-AVOSCloud-Application-Key', appKey)
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
    request(AV.Cloud)
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

});
