'use strict';

const request = require('supertest');
const should = require('should');
const assert = require('assert');

const AV = require('..');
const utils = require('./utils')
const appInfo = require('./utils/app-info');

require('./utils/functions');
require('./utils/hooks');

const appId = appInfo.appId;
const appKey = appInfo.appKey;
const masterKey = appInfo.masterKey;
const sessionTokenAdmin = appInfo.sessionTokenAdmin;

const app = utils.app();

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

  it('get object (promise)', function(done) {
    request(app)
      .post('/1.1/functions/getObjectPromise')
      .set('X-AVOSCloud-Application-Id', appId)
      .set('X-AVOSCloud-Application-Key', appKey)
      .expect(200, (err, res) => {
        res.body.result.foo.should.be.equal('bar');
        done(err);
      });
  });

  it('client error (promise)', function(done) {
    request(app)
      .post('/1.1/functions/choicePromise')
      .set('X-AVOSCloud-Application-Id', appId)
      .set('X-AVOSCloud-Application-Key', appKey)
      .expect(400, (err, res) => {
        res.body.code.should.be.equal(1);
        res.body.error.should.be.equal('OMG...');
        done(err);
      });
  });

  it('customized error code (promise)', function(done) {
    request(app)
      .post('/1.1/functions/clientErrorPromise')
      .set('X-AVOSCloud-Application-Id', appId)
      .set('X-AVOSCloud-Application-Key', appKey)
      .expect(400, (err, res) => {
        res.body.code.should.be.equal(400);
        done(err);
      });
  });

  it('server error (promise)', function(done) {
    request(app)
      .post('/1.1/functions/serverErrorPromise')
      .set('X-AVOSCloud-Application-Id', appId)
      .set('X-AVOSCloud-Application-Key', appKey)
      .expect(500, (err, res) => {
        res.body.error.should.be.match(/noThisMethod is not defined/);
        done(err);
      });
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
        result.avObject.fileColumn.should.containEql({
          __type: 'File',
          objectId: '55543fc2e4b0846760bd92f3',
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
      .set('x-avoscloud-session-token', sessionTokenAdmin)
      .expect(200, done);
  });

  it('dontFetchUser', function(done) {
    request(app)
      .post('/1/functions/dontFetchUser')
      .set('X-AVOSCloud-Application-Id', appId)
      .set('X-AVOSCloud-Application-Key', appKey)
      .set('x-avoscloud-session-token', sessionTokenAdmin)
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
      .set('x-avoscloud-session-token', sessionTokenAdmin)
      .expect(200, done);
  });

  // 测试调用 run 方法 options callback
  it('testRun_options_callback', function(done) {
    request(app)
      .post('/1/functions/testRun_options_callback')
      .set('X-AVOSCloud-Application-Id', appId)
      .set('X-AVOSCloud-Application-Key', appKey)
      .set('x-avoscloud-session-token', sessionTokenAdmin)
      .expect(200, done);
  });

  // 测试调用 run 方法，返回值是 promise 类型
  it('testRun_promise', function(done) {
    request(app)
      .post('/1/functions/testRun_promise')
      .set('X-AVOSCloud-Application-Id', appId)
      .set('X-AVOSCloud-Application-Key', appKey)
      .set('x-avoscloud-session-token', sessionTokenAdmin)
      .expect(200, done);
  });

  it('testRunWithSessionToken', function(done) {
    request(app)
      .post('/1/functions/testRunWithSessionToken')
      .set('X-AVOSCloud-Application-Id', appId)
      .set('X-AVOSCloud-Application-Key', appKey)
      .set('x-avoscloud-session-token', sessionTokenAdmin)
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
    this.timeout(20000);
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
      doRequest(sessionTokenAdmin, 'admin', cb);
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
