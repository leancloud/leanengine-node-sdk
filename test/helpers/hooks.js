const assert = require('assert');
const should = require('should');
const _ = require('underscore');

const AV = require('../..');

AV.Cloud.beforeSave("TestClass", function(request, response) {
  if (request.user) {
    assert.equal(request.user.className, '_User');
  }
  assert.equal(request.object.className, 'TestClass');
  request.object.set('user', request.user);
  response.success();
});

AV.Cloud.beforeSave('TestPromise', function(request) {
  assert.equal(request.object.className, 'TestPromise');
});

AV.Cloud.beforeSave('TestPromiseClientError', function(request) {
  throw new AV.Cloud.Error('OMG...');
});

AV.Cloud.beforeSave('TestPromiseServerError', function(request) {
  return Promise.resolve().then( () => {
    noThisMethod();
  });
});

AV.Cloud.afterSave('TestPromiseServerError', function(request) {
  return Promise.resolve().then( () => {
    noThisMethod();
  });
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
  request.object.get('file').url().should.be.equal('http://ac-4h2h4okw.clouddn.com/4qSbLMO866Tf4YtT9QEwJwysTlHGC9sMl7bpTwhQ.jpg');
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
  assert(request.object.updatedKeys.indexOf('foo') != -1);
  request.object.set('bizTime', bizTime);
  request.object.save().then(
    function(obj) {
      assert.equal(bizTime, obj.get('bizTime'));
    }
  );
});

AV.Cloud.beforeDelete("TestClass", function(request, response) {
  assert.equal(request.object.className, 'TestClass');
  if (request.object.get('foo') === 'important') {
    return response.error('important note');
  }
  response.success();
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

AV.Cloud.onVerified('sms', function(request) {
  assert.equal(request.object.className, '_User');
  assert.equal(request.object.id, '54fd6a03e4b06c41e00b1f40');
  assert.equal(request.object.get('username'), 'admin');
});

AV.Insight.on('end', function(result) {
  assert.deepEqual({
    "id" : "job id",
    "status": "OK/ERROR",
    "message": "当 status 为 ERROR 时的错误消息"
  }, result);
});
