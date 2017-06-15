const assert = require('assert');
const should = require('should');
const fs = require('fs');

const AV = require('../..');

const sessionTokenAdmin = require('./app-info').sessionTokenAdmin;

const TestObject = AV.Object.extend('TestObject');
const ComplexObject = AV.Object.extend('ComplexObject');

AV.Cloud.define('foo', function(request, response) {
  assert.ok(request.meta.remoteAddress);
  response.success("bar");
});

AV.Cloud.define('hello', function(request, response) {
  response.success({action: "hello", name: request.params.name});
});

AV.Cloud.define('getObjectPromise', function() {
  var query = new AV.Query(TestObject);
  return query.get('55069f5be4b0c93838ed9b17').then( object => {
    return object;
  });
});

AV.Cloud.define('choicePromise', function(req) {
  if (req.params.choice) {
    return 'OK~'
  } else {
    throw new AV.Cloud.Error('OMG...');
  }
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
  query.find().then(
    function(results) {
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
  );
});

AV.Cloud.define('bareAVObject', function(request, response) {
  var query = new AV.Query(ComplexObject);
  query.include('fileColumn');
  query.ascending('createdAt');
  query.find().then(
    function(results) {
      response.success(results[0]);
    }
  );
});

AV.Cloud.define('AVObjects', function(request, response) {
  var query = new AV.Query(ComplexObject);
  query.include('fileColumn');
  query.ascending('createdAt');
  query.find().then(
    function(results) {
      response.success(results);
    }
  );
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
  req.sessionToken.should.be.equal(sessionTokenAdmin);
  res.success();
});

AV.Cloud.define('testRun', function(request, response) {
  if (request.params.shouldRemote && process.env.NODE_ENV != 'production') {
    return response.error('Should be run on remote');
  }

  AV.Cloud.run('hello', {name: '李四'}).then(
    function(data) {
      assert.deepEqual(data, {action: "hello", name: '李四'});
      response.success();
    }
  );
});

AV.Cloud.define('testRun_promise', function(request) {
  return AV.Cloud.run('choice', {choice: true}).then(function(data) {
    assert.equal('OK~', data);
    AV.Cloud.run('choice', {choice: false}).then(function(data) {
      assert.ifError(data);
    }, function(err) {
      assert.equal('OMG...', err);
    });
  });
});

AV.Cloud.define('testRunUndefinedFunction', function(request) {
  return AV.Cloud.run('undefinedFunction');
});

AV.Cloud.define('testRunWithUser', function(request, response) {
  AV.Cloud.run('testUser', {}, {
    user: request.user
  }).then(function(data) {
    assert.equal('ok', data);
    response.success();
  });
});

AV.Cloud.define('testRunWithAVObject', function(request, response) {
  AV.Cloud.run('complexObject', {}, {
    user: request.user
  }).then(function(datas) {
    response.success(datas);
  });
});

AV.Cloud.define('testRunWithSessionToken', function(request, response) {
  AV.Cloud.run('testUser', {}, {
    sessionToken: request.sessionToken
  }).then(function(datas) {
    response.success(datas);
  });
});

AV.Cloud.define('testRpcRemote', function(request, response) {
  AV.Cloud.rpc('testRun', {shouldRemote: true}, {
    remote: true,
  }).then(function(datas) {
    response.success(datas);
  });
});

AV.Cloud.define('readDir', function(request, response) {
  fs.readdir('.', function(err, dir) {
    dir.should.containEql('package.json');
    response.success(dir);
  });
});

AV.Cloud.define('testThrowError', function(request, response) {
  /* jshint ignore:start */
  noThisMethod();
  /* jshint ignore:end */
  response.success();
});

AV.Cloud.define('clientErrorPromise', function(request) {
  throw new AV.Cloud.Error('some message', {code: 400});
});

AV.Cloud.define('serverErrorPromise', function(request) {
  noThisMethod();
});

AV.Cloud.define('testTimeout', function(req, res) {
  setTimeout(function() {
    try {
      res.success('ok');
    } catch (err) {
      console.error(err);
    }
  }, req.params.delay);
});

AV.Cloud.onIMMessageReceived(function(request, response) {
  response.success('ok');
});
