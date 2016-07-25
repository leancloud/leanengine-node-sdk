'use strict';
var config = require('./config'),
  AV = require('..'),
  should = require('should'),
  fs = require('fs'),
  request = require('supertest'),
  assert = require('assert'),
  _ = require('underscore');

var appId = config.appId;
var appKey = config.appKey;
var masterKey = config.masterKey;

AV.init(config);

var app;

if (process.env.FRAMEWORK == 'koa') {
  var koa = require('koa')();
  koa.use(AV.koa());
  app = koa.listen();
} else {
  app = AV.express();
}

var TestObject = AV.Object.extend('TestObject');
var ComplexObject = AV.Object.extend('ComplexObject');

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

AV.Cloud.define('complexObject', function(request, response) {
  var query = new AV.Query(ComplexObject);
  query.include('fileColumn');
  query.ascending('createdAt');
  query.find({
    success: function(results) {
      response.success({
        foo: 'bar',
        i: 123,
        obj: {
          a: 'b',
          as: [1, 2, 3],
        },
        t: new Date('2015-05-14T09:21:18.273Z'),
        avObject: results[0],
        avObjects: results,
      });
    }
  });
});

AV.Cloud.define('bareAVObject', function(request, response) {
  var query = new AV.Query(ComplexObject);
  query.include('fileColumn');
  query.ascending('createdAt');
  query.find({
    success: function(results) {
      response.success(results[0]);
    }
  });
});

AV.Cloud.define('AVObjects', function(request, response) {
  var query = new AV.Query(ComplexObject);
  query.include('fileColumn');
  query.ascending('createdAt');
  query.find({
    success: function(results) {
      response.success(results);
    }
  });
});

AV.Cloud.define('testAVObjectParams', function(request, response) {
  request.params.avObject.should.be.instanceof(AV.Object);
  request.params.avObject.get('name').should.be.equal('avObject');
  request.params.avObject.get('pointerColumn').should.be.instanceof(AV.User);

  request.params.avFile.should.be.instanceof(AV.File);

  request.params.avObjects.forEach(function(object) {
    object.should.be.instanceof(AV.Object);
    object.get('name').should.be.equal('avObjects');
  });

  response.success();
});

AV.Cloud.define('testBareAVObjectParams', function(request, response) {
  request.params.should.be.instanceof(AV.Object);
  request.params.get('name').should.be.equal('avObject');
  request.params.get('avFile').should.be.instanceof(AV.File);
  request.params.get('avFile').name().should.be.equal('hello.txt');
  response.success();
});

AV.Cloud.define('testAVObjectsArrayParams', function(request, response) {
  request.params.forEach(function(object) {
    object.get('name').should.be.equal('avObject');
    object.get('avFile').should.be.instanceof(AV.File);
    object.get('avFile').name().should.be.equal('hello.txt');
  });
  response.success();
});

AV.Cloud.define('testUser', function(request, response) {
  assert.equal(request.user.className, '_User');
  assert.equal(request.user.id, '54fd6a03e4b06c41e00b1f40');
  assert.equal(request.user.get('username'), 'admin');
  response.success('ok');
});

AV.Cloud.define('dontFetchUser', {fetchUser: false}, function(req, res) {
  should.not.exist(res.user);
  should.not.exist(res.currentUser);
  req.sessionToken.should.be.equal(sessionToken_admin);
  res.success();
});

AV.Cloud.define('testRun', function(request, response) {
  if (request.params.shouldRemote && process.env.NODE_ENV != 'production') {
    return response.error('Should be run on remote');
  }

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
    user: request.user,
    success: function(data) {
      assert.equal('ok', data);
      response.success();
    }
  });
});

AV.Cloud.define('testRunWithAVObject', function(request, response) {
  AV.Cloud.run('complexObject', {}, {
    user: request.user,
    success: function(datas) {
      response.success(datas);
    }
  });
});

AV.Cloud.define('testRunWithSessionToken', function(request, response) {
  AV.Cloud.run('testUser', {}, {
    sessionToken: request.sessionToken,
    success: function(datas) {
      response.success(datas);
    }
  });
});

AV.Cloud.define('testRpcRemote', function(request, response) {
  AV.Cloud.rpc('testRun', {shouldRemote: true}, {
    remote: true,
    success: function(datas) {
      response.success(datas);
    }
  });
});

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

AV.Cloud.define('testTimeout', function(req, res) {
  setTimeout(function() {
    res.success('ok');
  }, req.params.delay);
});

AV.Cloud.define('_messageReceived', function(request, response) {
  response.success('ok');
});

AV.Insight.on('end', function(err, result) {
  assert.deepEqual({
    "id" : "job id",
    "status": "OK/ERROR",
    "message": "当 status 为 ERROR 时的错误消息"
  }, _.omit(result, '__sign'));
});

var sessionToken_admin = config.sessionToken_admin;

describe('functions', function() {
  it('ping', function(done) {
    request(app)
      .get('/__engine/1/ping')
      .expect(200)
      .expect('{"runtime":"nodejs-' + process.version + '","version":"' + require('../package.json').version + '"}', done);
  });

  // 测试最基本方法的有效性
  it('foo', function(done) {
    request(app)
      .post('/1/functions/foo')
      .set('X-AVOSCloud-Application-Id', appId)
      .set('X-AVOSCloud-Application-Key', appKey)
      .expect(200)
      .expect({result: "bar"}, done);
  });

  // 测试 api version 1.1 的有效性
  it('version_1.1', function(done) {
    request(app)
      .post('/1.1/functions/foo')
      .set('X-AVOSCloud-Application-Id', appId)
      .set('X-AVOSCloud-Application-Key', appKey)
      .expect(200)
      .expect({result: "bar"}, done);
  });

  // 测试参数的正确解析
  it('hello', function(done) {
    request(app)
      .post('/1/functions/hello')
      .set('X-AVOSCloud-Application-Id', appId)
      .set('X-AVOSCloud-Application-Key', appKey)
      .send({name: "张三"})
      .expect(200)
      .expect({result: {action: "hello", name: "张三"}}, done);
  });

  // 测试返回包含 AVObject 的复杂对象
  it('return_complexObject', function(done) {
    request(app)
      .post('/1.1/call/complexObject')
      .set('X-AVOSCloud-Application-Id', appId)
      .set('X-AVOSCloud-Application-Key', appKey)
      .expect(200, function(err, res) {
        var result = res.body.result;

        result.foo.should.equal('bar');
        result.t.should.eql({
          __type: 'Date',
          iso: '2015-05-14T09:21:18.273Z'
        });

        result.avObject.__type.should.equal('Object');
        result.avObject.className.should.equal('ComplexObject');
        result.avObject.numberColumn.should.equal(1.23);
        result.avObject.arrayColumn.should.eql([1, 2, 3]);
        result.avObject.objectColumn.should.eql({foo: 'bar'});
        result.avObject.stringColumn.should.equal('testString');
        result.avObject.anyColumn.should.equal('');
        result.avObject.booleanColumn.should.equal(true);
        result.avObject.pointerColumn.should.eql({
          __type: 'Pointer',
          className: '_User',
          objectId: '55069e5be4b0c93838ed8e6c'
        });
        result.avObject.relationColumn.should.be.eql({
          __type: 'Relation',
          className: 'TestObject'
        });
        result.avObject.geopointColumn.should.be.eql({
          __type: 'GeoPoint',
          latitude: 0,
          longitude: 30
        });
        result.avObject.dateColumn.should.be.eql({
          __type: 'Date',
          iso: '2015-05-14T06:24:47.000Z'
        });
        result.avObject.fileColumn.should.eql({
          __type: 'File',
          id: '55543fc2e4b0846760bd92f3',
          name: 'ttt.jpg',
          url: 'http://ac-4h2h4okw.clouddn.com/4qSbLMO866Tf4YtT9QEwJwysTlHGC9sMl7bpTwhQ.jpg'
        });

        result.avObjects.forEach(function(object) {
          object.__type.should.equal('Object');
          object.className.should.equal('ComplexObject');
        });

        done();
      });
  });

  // 返回单个 AVObject
  it('return_bareAVObject', function(done) {
    request(app)
      .post('/1.1/call/bareAVObject')
      .set('X-AVOSCloud-Application-Id', appId)
      .set('X-AVOSCloud-Application-Key', appKey)
      .expect(200, function(err, res) {
        res.body.result.__type.should.be.equal('Object');
        res.body.result.className.should.be.equal('ComplexObject');
        res.body.result.fileColumn.__type.should.be.equal('File');
        done();
      });
  });

  // 返回 AVObject 数组
  it('return_AVObjectsArray', function(done) {
    request(app)
      .post('/1.1/call/AVObjects')
      .set('X-AVOSCloud-Application-Id', appId)
      .set('X-AVOSCloud-Application-Key', appKey)
      .expect(200, function(err, res) {
        res.body.result.forEach(function(object) {
          object.__type.should.be.equal('Object');
          object.className.should.be.equal('ComplexObject');
        });
        done();
      });
  });

  // 测试发送包含 AVObject 的请求
  it('testAVObjectParams', function(done) {
    request(app)
      .post('/1.1/call/testAVObjectParams')
      .set('X-AVOSCloud-Application-Id', appId)
      .set('X-AVOSCloud-Application-Key', appKey)
      .send({
        avObject: {
          __type: 'Object',
          className: 'ComplexObject',
          name: 'avObject',
          pointerColumn: {
            __type: 'Pointer',
            className: '_User',
            objectId: '55069e5be4b0c93838ed8e6c'
          }
        },
        avFile: {
          __type: 'File',
          url: 'http://ac-1qdney6b.qiniudn.com/3zLG4o0d27MsCQ0qHGRg4JUKbaXU2fiE35HdhC8j.txt',
          name: 'hello.txt'
        },
        avObjects: [{
          __type: 'Object',
          className: 'ComplexObject',
          name: 'avObjects'
        }]
      })
      .expect(200, function(err) {
        done(err);
      });
  });

  // 测试发送单个 AVObject 作为请求参数
  it('testBareAVObjectParams', function(done) {
    request(app)
      .post('/1.1/call/testBareAVObjectParams')
      .set('X-AVOSCloud-Application-Id', appId)
      .set('X-AVOSCloud-Application-Key', appKey)
      .send({
        __type: 'Object',
        className: 'ComplexObject',
        name: 'avObject',
        avFile: {
          __type: 'File',
          url: 'http://ac-1qdney6b.qiniudn.com/3zLG4o0d27MsCQ0qHGRg4JUKbaXU2fiE35HdhC8j.txt',
          name: 'hello.txt'
        },
      })
      .expect(200, function(err) {
        done(err);
      });
  });

  // 测试发送 AVObject 数组作为请求参数
  it('testAVObjectsArrayParams', function(done) {
    var object = {
      __type: 'Object',
      className: 'ComplexObject',
      name: 'avObject',
      avFile: {
        __type: 'File',
        url: 'http://ac-1qdney6b.qiniudn.com/3zLG4o0d27MsCQ0qHGRg4JUKbaXU2fiE35HdhC8j.txt',
        name: 'hello.txt'
      }
    };

    request(app)
      .post('/1.1/call/testAVObjectsArrayParams')
      .set('X-AVOSCloud-Application-Id', appId)
      .set('X-AVOSCloud-Application-Key', appKey)
      .send([object, object])
      .expect(200, function(err) {
        done(err);
      });
  });

  // 测试 run 方法的有效性
  it('testRun', function(done) {
    request(app)
      .post('/1/functions/testRun')
      .set('X-AVOSCloud-Application-Id', appId)
      .set('X-AVOSCloud-Application-Key', appKey)
      .expect(200)
      .expect({}, done);
  });

  it('testRun_AVObjects', function(done) {
   request(app)
     .post('/1.1/call/testRunWithAVObject')
     .set('X-AVOSCloud-Application-Id', appId)
     .set('X-AVOSCloud-Application-Key', appKey)
     .expect(200, function(err, res) {
       res.body.result.avObjects[0].__type.should.equal('Object');
       res.body.result.avObjects[0].className.should.equal('ComplexObject');
       done();
     });
  });

  it('testRun_text_plain', function(done) {
    request(app)
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

  it('test realtime hook', function(done) {
    request(app)
      .post('/1/functions/_messageReceived')
      .set('X-AVOSCloud-Application-Id', appId)
      .set('X-AVOSCloud-Application-Key', appKey)
      .send({
        __sign: '1464591343092,6ac315b96655d04e3a49d758f5a8ae55208c98f0'
      })
      .expect(200)
      .end(done);
  });

  it('test realtime hook without sign', function(done) {
    request(app)
      .post('/1/functions/_messageReceived')
      .set('X-AVOSCloud-Application-Id', appId)
      .set('X-AVOSCloud-Application-Key', appKey)
      .expect(401)
      .end(done);
  });

  it('no_this_method', function(done) {
    request(app)
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
    request(app)
      .post('/1/functions/testUser')
      .set('X-AVOSCloud-Application-Id', appId)
      .set('X-AVOSCloud-Application-Key', appKey)
      .set('x-avoscloud-session-token', sessionToken_admin)
      .expect(200, done);
  });

  it('dontFetchUser', function(done) {
    request(app)
      .post('/1/functions/dontFetchUser')
      .set('X-AVOSCloud-Application-Id', appId)
      .set('X-AVOSCloud-Application-Key', appKey)
      .set('x-avoscloud-session-token', sessionToken_admin)
      .expect(200, done);
  });

  // 无效 sessionToken 测试
  it('testUser_invalid_sessionToken', function(done) {
    request(app)
      .post('/1/functions/testUser')
      .set('X-AVOSCloud-Application-Id', appId)
      .set('X-AVOSCloud-Application-Key', appKey)
      .set('x-avoscloud-session-token', '00000000000000000000')
      .expect(400)
      .end(function(err, res) {
        res.body.should.eql({ code: 211, error: 'Could not find user' });
        done();
      });
  });

  // 测试调用 run 方法时，传递 user 对象的有效性
  it('testRunWithUser', function(done) {
    request(app)
      .post('/1/functions/testRunWithUser')
      .set('X-AVOSCloud-Application-Id', appId)
      .set('X-AVOSCloud-Application-Key', appKey)
      .set('x-avoscloud-session-token', sessionToken_admin)
      .expect(200, done);
  });

  // 测试调用 run 方法 options callback
  it('testRun_options_callback', function(done) {
    request(app)
      .post('/1/functions/testRun_options_callback')
      .set('X-AVOSCloud-Application-Id', appId)
      .set('X-AVOSCloud-Application-Key', appKey)
      .set('x-avoscloud-session-token', sessionToken_admin)
      .expect(200, done);
  });

  // 测试调用 run 方法，返回值是 promise 类型
  it('testRun_promise', function(done) {
    request(app)
      .post('/1/functions/testRun_promise')
      .set('X-AVOSCloud-Application-Id', appId)
      .set('X-AVOSCloud-Application-Key', appKey)
      .set('x-avoscloud-session-token', sessionToken_admin)
      .expect(200, done);
  });

  it('testRunWithSessionToken', function(done) {
    request(app)
      .post('/1/functions/testRunWithSessionToken')
      .set('X-AVOSCloud-Application-Id', appId)
      .set('X-AVOSCloud-Application-Key', appKey)
      .set('x-avoscloud-session-token', sessionToken_admin)
      .expect(200, done);
  });

  it('testRpcRemote', function(done) {
    request(app)
      .post('/1/functions/testRpcRemote')
      .set('X-AVOSCloud-Application-Id', appId)
      .set('X-AVOSCloud-Application-Key', appKey)
      .expect(200, done);
  });

  // 测试 fs 模块的有效性
  it('io', function(done) {
    request(app)
      .post('/1/functions/readDir')
      .set('X-AVOSCloud-Application-Id', appId)
      .set('X-AVOSCloud-Application-Key', appKey)
      .expect(200, done);
  });

  // 测试 onVerified hook 的有效性
  it('onVerified', function(done) {
    request(app)
      .post("/1/functions/onVerified/sms")
      .set('X-Uluru-Application-Id', appId)
      .set('X-Uluru-Application-Key', appKey)
      .send({
        object: {
          objectId: '54fd6a03e4b06c41e00b1f40',
          username: 'admin',
          __sign: '1464591343092,b0c8463a3c12bf4241820c52963515d9a363b6bc'
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
    request(app)
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

  it('timeoutTest', function(done) {
    this.timeout(17000);
    request(app)
      .post('/1.1/functions/testTimeout')
      .set('X-AVOSCloud-Application-Id', appId)
      .set('X-AVOSCloud-Application-Key', appKey)
      .send({
        delay: 15200,
      })
      .expect(503)
      .end(function(err, res) {
        res.body.should.eql({code:124, error:"The request timed out on the server."});
        setTimeout(function() { // 等待业务逻辑真正响应，确认异常信息
          done();
        }, 1000);
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
    var doRequest = function(sessionToken, username, cb) {
      var r = request(app)
        .post('/1.1/functions/userMatching')
        .set('X-AVOSCloud-Application-Id', appId)
        .set('X-AVOSCloud-Application-Key', appKey);
      if (sessionToken) {
        r.set('X-AVOSCloud-session-token', sessionToken);
      }
      r.end(function(err, res) {
          if (username) {
            res.body.result.reqUser.username.should.equal(username);
          } else {
            should.not.exist(res.body.reqUser);
          }
          return cb(err);
      });
    };
    for (var i = 0; i <= 4; i++) {
      doRequest(sessionToken_admin, 'admin', cb);
      doRequest('0hgr13u12tmgyv4x594682sv5', 'zhangsan', cb);
      doRequest(null, null, cb);
    }
  });

  it('_metadatas', function(done) {
    request(app)
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
    request(app)
      .options('/1/functions')
      .set('Origin', 'http://foo.bar')
      .set('Access-Control-Request-Method', 'POST')
      .set('Access-Control-Request-Headers', 'X-AVOSCloud-Application-Id, X-AVOSCloud-Application-Key')
      .expect('access-control-allow-origin', 'http://foo.bar')
      .expect(200, done);
  });

  it('onCompleteBigqueryJob', function(done) {
    request(app)
      .post('/1.1/functions/BigQuery/onComplete')
      .set('X-AVOSCloud-Application-Id', appId)
      .set('X-AVOSCloud-Application-Key', appKey)
      .send({
        id : "job id",
        status: "OK/ERROR",
        message: "当 status 为 ERROR 时的错误消息",
        __sign: '1464591343092,44c8f6a8a0520bc4636d890935aee0977ef34dd6'
      })
      .expect(200, done);
  });

});
