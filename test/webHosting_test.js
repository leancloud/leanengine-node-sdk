'use strict';
var config = require('./config'),
  AV = require('..'),
  assert = require('assert'),
  express = require('express'),
  bodyParser = require('body-parser');

var appId = config.appId;
var appKey = config.appKey;
var masterKey = config.masterKey;

AV.initialize(appId, appKey, masterKey);

var app = express();
app.use(AV.Cloud);
app.use(bodyParser.json());
app.use(AV.Cloud.CookieSession({ secret: 'my secret', maxAge: 3600000, fetchUser: false }));

app.get('/', function (req, res) {
  res.send('Hello World!');
});

app.post('/login', function(req, res) {
  AV.User.logIn(req.body.username, req.body.password).then(
    function() {
      res.redirect('/profile');
    },
    function(error) {
      res.status = 500;
      res.send(error);
    }
  );
});

app.get('/logout', function(req, res) {
  AV.User.logOut();
  res.redirect('/profile');
});

app.post('/testCookieSession', function(req, res) {
  AV.User.logIn(req.body.username, req.body.password).then(function(user) {
    assert.equal(req.body.username, user.get('username'));
    assert.equal(AV.User.current(), user);
    AV.User.logOut();
    assert(!AV.User.current());
    // 登出再登入不会有问题
    return AV.User.logIn(req.body.username, req.body.password);
  }).then(function(user) {
    assert.equal(AV.User.current(), user);
    // 在已登录状态，直接用另外一个账户登录
    return AV.User.logIn('zhangsan', 'zhangsan');
  }).then(function(user) {
    assert.equal('zhangsan', user.get('username'));
    assert.equal(AV.User.current(), user);
    res.send('ok');
  }, function(err) {
    assert.ifError(err);
  });
});

app.get('/profile', function(req, res) {
  if (req.AV.user) {
    res.send(req.AV.user);
  } else {
    res.send({});
  }
});

AV.Cloud.define('foo', function(request, response) {
  response.success("bar");
});


var request = require('supertest'),
  should = require('should');

describe('webHosting', function() {
  it('index', function(done) {
    request(app)
      .get('/')
      .expect(200)
      .expect("Hello World!", done);
  });

  it('function_is_ok', function(done) {
    request(app)
      .post('/1/functions/foo')
      .set('X-AVOSCloud-Application-Id', appId)
      .set('X-AVOSCloud-Application-Key', appKey)
      .expect(200)
      .expect({result: "bar"}, done);
  });
  it("Should return profile.", function(done) {
    this.timeout(10000);
    return request(app).get("/profile").expect(200, function(err, res) {
      if (err) {
        throw err;
      }
      res.body.should.eql({});
      return request(app).post("/login").send({
        username: "admin",
        password: "admin"
      }).expect(302, function(err, res) {
        if (err) {
          throw err;
        }
        res.headers.location.should.equal('/profile');
        res.headers['set-cookie'][0].indexOf('avos:sess=eyJfdWlkIjoiNTRmZDZhMDNlNGIwNmM0MWUwMGIxZjQwIiwiX3Nlc3Npb25Ub2tlbiI6IncyanJ0a2JlaHAzOG90cW1oYnF1N3liczkifQ==; path=/; expires=').should.equal(0);
        res.headers['set-cookie'][1].indexOf('avos:sess.sig=jMYF3Iwhmw903-K1K12MVdAFOh0; path=/; expires=').should.equal(0);
        return request(app).get("/profile")
          .set('Cookie', 'avos:sess=eyJfdWlkIjoiNTRmZDZhMDNlNGIwNmM0MWUwMGIxZjQwIiwiX3Nlc3Npb25Ub2tlbiI6IncyanJ0a2JlaHAzOG90cW1oYnF1N3liczkifQ==; avos:sess.sig=jMYF3Iwhmw903-K1K12MVdAFOh0')
          .expect(200, function(err, res) {
          if (err) {
            throw err;
          }
          should.exist(res.body.objectId);
          return request(app).get("/logout").expect(302, function(err, res) {
            if (err) {
              throw err;
            }
            res.headers['set-cookie'][0].indexOf('avos:sess=; path=/; expires=').should.equal(0);
            res.headers.location.should.equal('/profile');
            return request(app).get("/profile").set('Cookie', 'avos:sess=; avos:sess.sig=qRTO8CJG5Ccg4ZftDVoGbuhUH90').expect(200).expect({}, done);
          });
        });
      });
    });
  });

  it("test cookie session", function(done) {
    this.timeout(10000);
    return request(app).post("/testCookieSession")
      .send({
        username: 'admin',
        password: 'admin'
      }).expect(200, done);
  });

});
