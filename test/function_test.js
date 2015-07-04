'use strict';
var config = require('./config'),
  AV = require('..'),
  should = require('should'),
  fs = require('fs'),
  request = require('supertest'),
  assert = require('assert');

var appId = config.appId;
var appKey = config.appKey;
var masterKey = config.masterKey;

AV.initialize(appId, appKey, masterKey);

var TestObject = AV.Object.extend('TestObject');

AV.Cloud.define('foo', function(request, response) {
  assert.ok(request.meta.remoteAddress);
  response.success("bar");
});

AV.Cloud.define('hello', function(request, response) {
  response.success({action: "hello", name: request.params.name});
});

AV.Cloud.define('choice', function(req, res) {
  if (req.params.choice) {
    res.success('OK~');
  } else {
    res.error('OMG...');
  }
});

// TODO 该特性待后续 rpc 方法时再支持
//AV.Cloud.define('complexObject', function(request, response) {
//  var query = new AV.Query(ComplexObject);
//  query.include('fileColumn');
//  query.ascending('createdAt');
//  query.find({
//    success: function(results) {
//      response.success({
//        foo: 'bar',
//        i: 123,
//        obj: {
//          a: 'b',
//          as: [1,2,3],
//        },
//        t: new Date('2015-05-14T09:21:18.273Z'),
//        avObject: results[0],
//        avObjects: results,
//      });
//    }
//  })
//})

AV.Cloud.define('testUser', function(request, response) {
  assert.equal(request.user.className, '_User');
  assert.equal(request.user.id, '54fd6a03e4b06c41e00b1f40');
  assert.equal(request.user.get('username'), 'admin');
  assert.equal(request.user, AV.User.current());
  response.success("ok");
});

AV.Cloud.define('testRun', function(request, response) {
  AV.Cloud.run('hello', {name: '李四'}, {
    success: function(data) {
      assert.deepEqual(data, {action: "hello", name: '李四'});
      response.success();
    }
  });
});

AV.Cloud.define('testRun_options_callback', function(request, response) {
  AV.Cloud.run('choice', {choice: true}, {
    success: function(data) {
      assert.equal('OK~', data);
      AV.Cloud.run('choice', {choice: false}, {
        success: function(data) {
          assert.ifError(data);
        },
        error: function(err) {
          assert.equal('OMG...', err);
          response.success();
        }
      });
    },
    error: function(err) {
      assert.ifError(err);
    }
  });
});

AV.Cloud.define('testRun_promise', function(request, response) {
  AV.Cloud.run('choice', {choice: true}).then(function(data) {
    assert.equal('OK~', data);
    AV.Cloud.run('choice', {choice: false}).then(function(data) {
      assert.ifError(data);
    }, function(err) {
      assert.equal('OMG...', err);
      response.success();
    });
  },
  function(err) {
    assert.ifError(err);
  });
});

AV.Cloud.define('testRunWithUser', function(request, response) {
  AV.Cloud.run('testUser', {}, {
    success: function(data) {
      assert.equal('ok', data);
      response.success();
    }
  });
});

// TODO 该特性待后续 rpc 方法时再支持
//AV.Cloud.define('testRunWithAVObject', function(request, response) {
//  AV.Cloud.run('complexObjects', {}, {
//    success: function(datas) {
//      response.success(datas);
//    }
//  });
//})

AV.Cloud.define('readDir', function(request, response) {
  fs.readdir('.', function(err, dir) {
    dir.should.containEql('package.json');
    response.success(dir);
  });
});

AV.Cloud.onVerified('sms', function(request) {
  assert.equal(request.object.className, '_User');
  assert.equal(request.object.id, '54fd6a03e4b06c41e00b1f40');
  assert.equal(request.object.get('username'), 'admin');
});

AV.Cloud.define('testThrowError', function(request, response) {
  /* jshint ignore:start */
  noThisMethod();
  /* jshint ignore:end */
  response.success();
});

AV.Cloud.define("userMatching", function(req, res) {
  setTimeout(function() {
    // 为了更加靠谱的验证串号问题，走一次网络 IO
    var query = new AV.Query(TestObject);
    query.get('55069f5be4b0c93838ed9b17', {
      success: function(obj) {
        assert.equal(obj.get('foo'), 'bar');
        res.success({reqUser: req.user, currentUser: AV.User.current()});
      }, error: function() {
        res.success({reqUser: req.user, currentUser: AV.User.current()});
      }
    });
  }, Math.floor((Math.random() * 2000) + 1));
});

AV.BigQuery.on('end', function(err, result) {
  assert.deepEqual({
    "id" : "job id",
    "status": "OK/ERROR",
    "message": "当 status 为 ERROR 时的错误消息"
  }, result);
});

var sessionToken_admin = config.sessionToken_admin;

describe('functions', function() {

  it('ping', function(done) {
    request(AV.Cloud)
      .get('/__engine/1/ping')
      .expect(200)
      .expect('{"runtime":"nodejs-' + process.version + '","version":"' + require('../package.json').version + '"}', done);
  });

  // 测试最基本方法的有效性
  it('foo', function(done) {
    request(AV.Cloud)
      .post('/1/functions/foo')
      .set('X-AVOSCloud-Application-Id', appId)
      .set('X-AVOSCloud-Application-Key', appKey)
      .expect(200)
      .expect({result: "bar"}, done);
  });

  // 测试 api version 1.1 的有效性 
  it('version_1.1', function(done) {
    request(AV.Cloud)
      .post('/1.1/functions/foo')
      .set('X-AVOSCloud-Application-Id', appId)
      .set('X-AVOSCloud-Application-Key', appKey)
      .expect(200)
      .expect({result: "bar"}, done);
  });

  // 测试 `/__engine` URL namespace  的有效性 
  it('urlNamespace', function(done) {
    request(AV.Cloud)
      .post('/__engine/1.1/functions/foo')
      .set('X-AVOSCloud-Application-Id', appId)
      .set('X-AVOSCloud-Application-Key', appKey)
      .expect(200)
      .expect({result: "bar"}, done);
  });

  // 测试参数的正确解析
  it('hello', function(done) {
    request(AV.Cloud)
      .post('/1/functions/hello')
      .set('X-AVOSCloud-Application-Id', appId)
      .set('X-AVOSCloud-Application-Key', appKey)
      .send({name: "张三"})
      .expect(200)
      .expect({result: {action: "hello", name: "张三"}}, done);
  });

  // TODO 该特性待后续 rpc 方法时再支持
  //it('return_complexObject', function(done) {
  //  request(AV.Cloud)
  //    .post('/1/functions/complexObject')
  //    .set('X-AVOSCloud-Application-Id', appId)
  //    .set('X-AVOSCloud-Application-Key', appKey)
  //    .expect(200, function(err, res) {
  //      var result = res.body.result;
  //      result.foo.should.equal('bar');
  //      result.t.should.eql({ __type: 'Date', iso: '2015-05-14T09:21:18.273Z' });
  //      result.avObject.numberColumn.should.equal(1.23);
  //      result.avObject.__type.should.equal('Object');
  //      result.avObject.className.should.equal('ComplexObject');
  //      result.avObject.fileColumn.should.eql({ __type: 'File',
  //                                             id: '55543fc2e4b0846760bd92f3',
  //                                             name: 'ttt.jpg',
  //                                             url: 'http://ac-4h2h4okw.clouddn.com/4qSbLMO866Tf4YtT9QEwJwysTlHGC9sMl7bpTwhQ.jpg' });
  //      done();
  //    })
  //});
  //
  //it('return_AVObjects', function(done) {
  //  request(AV.Cloud)
  //    .post('/1/functions/complexObjects')
  //    .set('X-AVOSCloud-Application-Id', appId)
  //    .set('X-AVOSCloud-Application-Key', appKey)
  //    .expect(200, function(err, res) {
  //      res.body.result[0].__type.should.equal('Object');
  //      res.body.result[0].className.should.equal('ComplexObject');
  //      done();
  //    })
  //});

  // 测试 run 方法的有效性
  it('testRun', function(done) {
    request(AV.Cloud)
      .post('/1/functions/testRun')
      .set('X-AVOSCloud-Application-Id', appId)
      .set('X-AVOSCloud-Application-Key', appKey)
      .expect(200)
      .expect({}, done);
  });

  // TODO 该特性待后续 rpc 方法时再支持
  //it('testRun_AVObjects', function(done) {
  //  request(AV.Cloud)
  //    .post('/1/functions/testRunWithAVObject')
  //    .set('X-AVOSCloud-Application-Id', appId)
  //    .set('X-AVOSCloud-Application-Key', appKey)
  //    .expect(200, function(err, res) {
  //      res.body.result[0].__type.should.equal('Object');
  //      res.body.result[0].className.should.equal('ComplexObject');
  //      done();
  //    })
  //});

  it('testRun_text_plain', function(done) {
    request(AV.Cloud)
      .post('/1/functions/testRun')
      .set('Content-Type', 'text/plain; charset=utf-8')
      .send(JSON.stringify({
        '_ApplicationId': appId,
        '_ApplicationKey': appKey,
        '_OtherParams': 'asdfg'
      }))
      .expect(200)
      .expect({}, done);
  });

  it('no_this_method', function(done) {
    request(AV.Cloud)
      .post('/1/functions/noThisMethod')
      .set('X-AVOSCloud-Application-Id', appId)
      .set('X-AVOSCloud-Application-Key', appKey)
      .expect(404)
      .expect({
        "code": 1,
        "error": "LeanEngine not found function named 'noThisMethod' for app '" + appId + "' on development."
      }, done);
  });

  // 测试带有 sessionToken 时，user 对象的正确解析
  it('testUser', function(done) {
    this.timeout(5000);
    request(AV.Cloud)
      .post('/1/functions/testUser')
      .set('X-AVOSCloud-Application-Id', appId)
      .set('X-AVOSCloud-Application-Key', appKey)
      .set('x-avoscloud-session-token', sessionToken_admin)
      .expect(200, done);
  });

  // 无效 sessionToken 测试
  it('testUser_invalid_sessionToken', function(done) {
    this.timeout(5000);
    request(AV.Cloud)
      .post('/1/functions/testUser')
      .set('X-AVOSCloud-Application-Id', appId)
      .set('X-AVOSCloud-Application-Key', appKey)
      .set('x-avoscloud-session-token', '00000000000000000000')
      .expect(400)
      .end(function(err, res) {
        res.body.should.eql({ code: 1, error: '找不到有效用户。' });
        done();
      });
  });

  // 测试调用 run 方法时，传递 user 对象的有效性
  it('testRunWithUser', function(done) {
    this.timeout(5000);
    request(AV.Cloud)
      .post('/1/functions/testRunWithUser')
      .set('X-AVOSCloud-Application-Id', appId)
      .set('X-AVOSCloud-Application-Key', appKey)
      .set('x-avoscloud-session-token', sessionToken_admin)
      .expect(200, done);
  });

  // 测试调用 run 方法 options callback
  it('testRun_options_callback', function(done) {
    this.timeout(5000);
    request(AV.Cloud)
      .post('/1/functions/testRun_options_callback')
      .set('X-AVOSCloud-Application-Id', appId)
      .set('X-AVOSCloud-Application-Key', appKey)
      .set('x-avoscloud-session-token', sessionToken_admin)
      .expect(200, done);
  });

  // 测试调用 run 方法，返回值是 promise 类型
  it('testRun_promise', function(done) {
    this.timeout(5000);
    request(AV.Cloud)
      .post('/1/functions/testRun_promise')
      .set('X-AVOSCloud-Application-Id', appId)
      .set('X-AVOSCloud-Application-Key', appKey)
      .set('x-avoscloud-session-token', sessionToken_admin)
      .expect(200, done);
  });

  // 测试 fs 模块的有效性
  it('io', function(done) {
    request(AV.Cloud)
      .post('/1/functions/readDir')
      .set('X-AVOSCloud-Application-Id', appId)
      .set('X-AVOSCloud-Application-Key', appKey)
      .expect(200, done);
  });

  // 测试 onVerified hook 的有效性
  it('onVerified', function(done) {
    request(AV.Cloud)
      .post("/1/functions/onVerified/sms")
      .set('X-Uluru-Application-Id', appId)
      .set('X-Uluru-Application-Key', appKey)
      .send({
        object: {
          objectId: '54fd6a03e4b06c41e00b1f40',
          username: 'admin'
        }
      })
      .expect(200)
      .expect({ result: 'ok'}, done);
  });

  // 测试抛出异常时的处理
  it('throw Error', function(done) {
    var stderr_write = process.stderr.write;
    var strings = [];
    global.process.stderr.write = function(string) {
      strings.push(string);
    };
    request(AV.Cloud)
      .post('/1/functions/testThrowError')
      .set('X-AVOSCloud-Application-Id', appId)
      .set('X-AVOSCloud-Application-Key', appKey)
      .expect(500)
      .expect({result: 'ok'}, function() {
        assert.deepEqual('Execute \'testThrowError\' failed with error: ReferenceError: noThisMethod is not defined', strings[0].split('\n')[0]);
        assert.equal(1, strings.length);
        global.process.stderr.write = stderr_write;
        done();
      });
  });
 
  // 用户串号测试 
  it('user_matching_func', function(done) {
    this.timeout(30000);
    var count = 0;
    var cb = function(err) {
      if (err) {
        throw err;
      }
      count++;
      if (count === 10) {
        return done();
      }
    };
    for (var i = 0; i <= 4; i++) {
      request(AV.Cloud)
        .post('/1.1/functions/userMatching')
        .set('X-AVOSCloud-Application-Id', appId)
        .set('X-AVOSCloud-Application-Key', appKey)
        .set('X-AVOSCloud-session-token', sessionToken_admin)
        .expect(200, function(err, res) {
          res.body.result.reqUser.username.should.equal('admin');
          res.body.result.currentUser.username.should.equal('admin');
          return cb(err);
      });
      request(AV.Cloud)
        .post('/1.1/functions/userMatching')
        .set('X-AVOSCloud-Application-Id', appId)
        .set('X-AVOSCloud-Application-Key', appKey)
        .set('X-AVOSCloud-session-token', '3267fscy0q4g3i4yc9uq9rqqv')
        .expect(200, function(err, res) {
          res.body.result.reqUser.username.should.equal('zhangsan');
          res.body.result.currentUser.username.should.equal('zhangsan');
          return cb(err);
      });
      request(AV.Cloud)
        .post('/1.1/functions/userMatching')
        .set('X-AVOSCloud-Application-Id', appId)
        .set('X-AVOSCloud-Application-Key', appKey)
        .expect(200, function(err, res) {
          should.not.exist(res.body.reqUser);
          should.not.exist(res.body.currentUser);
          return cb(err);
      });
    }
  });

  it('_metadatas', function(done) {
    request(AV.Cloud)
      .get('/1/functions/_ops/metadatas')
      .set('X-AVOSCloud-Application-Id', appId)
      .set('X-AVOSCloud-Master-Key', masterKey)
      .expect(200, function(err, res) {
        res.body.result.should.containDeep([
          'foo',
          'hello',
          'testUser',
          'testRun',
          'testRunWithUser',
          'readDir',
          '__on_verified_sms',
          'testThrowError',
          'userMatching' ]);
        done();
      });
  });

  it('CORS', function(done) {
    request(AV.Cloud)
      .options('/1/functions')
      .set('Origin', 'http://foo.bar')
      .set('Access-Control-Request-Method', 'POST')
      .set('Access-Control-Request-Headers', 'X-AVOSCloud-Application-Id, X-AVOSCloud-Application-Key')
      .expect('access-control-allow-origin', 'http://foo.bar')
      .expect(200, done);
  });

  it('onCompleteBigqueryJob', function(done) {
    request(AV.Cloud)
      .post('/1.1/functions/BigQuery/onComplete')
      .set('X-AVOSCloud-Application-Id', appId)
      .set('X-AVOSCloud-Application-Key', appKey)
      .send({
        id : "job id",
        status: "OK/ERROR",
        message: "当 status 为 ERROR 时的错误消息"
      })
      .expect(200, done);
  });

});
