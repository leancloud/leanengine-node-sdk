'use strict';

const request = require('supertest');
const should = require('should');
const assert = require('assert');

const AV = require('..');
const appInfo = require('./fixtures/app-info');

require('./fixtures/functions');
require('./fixtures/hooks');

const appId = appInfo.appId;
const appKey = appInfo.appKey;
const masterKey = appInfo.masterKey;
const hookKey = appInfo.hookKey;
const sessionTokenAdmin = appInfo.sessionTokenAdmin;

const app = require('./fixtures/app')();

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

        result.avObject.__type.should.equal('Pointer');
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
          object.__type.should.equal('Pointer');
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
       res.body.result.avObjects[0].__type.should.equal('Pointer');
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
      .set('X-LC-Hook-Key', hookKey)
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
        code: 1,
        error: `No such cloud function 'noThisMethod'`
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

  // 测试调用 run 方法，返回值是 promise 类型
  it('testRun_promise', function(done) {
    request(app)
      .post('/1/functions/testRun_promise')
      .set('X-AVOSCloud-Application-Id', appId)
      .set('X-AVOSCloud-Application-Key', appKey)
      .set('x-avoscloud-session-token', sessionTokenAdmin)
      .expect(200, done);
  });

  it('run undefined function', function(done) {
    request(app)
      .post('/1/functions/testRunUndefinedFunction')
      .set('X-AVOSCloud-Application-Id', appId)
      .set('X-AVOSCloud-Application-Key', appKey)
      .expect(404, done);
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

  // 测试抛出异常时的处理
  it('throw Error', function(done) {
    request(app)
      .post('/1/functions/testThrowError')
      .set('X-AVOSCloud-Application-Id', appId)
      .set('X-AVOSCloud-Application-Key', appKey)
      .expect(500, (err, res) => {
        res.body.error.should.be.equal('noThisMethod is not defined');
        done(err)
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
          'testThrowError']);
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
});
