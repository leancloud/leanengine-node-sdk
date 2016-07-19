var koa = require('koa');
var bodyParser = require('koa-bodyparser');
var request = require('supertest');
var should = require('should');

var AV = require('..');
var config = require('./config');

var app = koa();

AV.init(config);

app.use(AV.koa());
app.use(bodyParser());
app.use(AV.Cloud.CookieSession({framework: 'koa', secret: 'my secret', maxAge: 3600000, fetchUser: true}));

app.use(function *(next) {
  try {
    yield next;
  } catch (err) {
    this.status = err.status || 500;
    this.body = err.message;
    this.app.emit('error', err, this);
  }
});

app.use(function *(next) {
  var method = this.request.method;
  var url = this.request.url;

  if (method === 'GET' && url === '/') {
    this.status = 200;
    this.body = '<p>Hello world</p>';
  } else if (method === 'POST' && url === '/login') {
    return AV.User.logIn(this.request.body.username, this.request.body.password).then( user => {
      this.response.saveCurrentUser(user);
      this.response.redirect('/profile');
    });
  } else if (method === 'GET' && url === '/profile') {
    this.status = 200;
    this.body = this.request.currentUser;
  } else if (method === 'POST' && url === '/logout') {
    this.status = 200;
    this.response.saveCurrentUser(null);
  } else {
    yield next;
  }
});

var server = app.listen();

describe('webhosting-koa', function() {
  it('index', function(done) {
    request(server).get('/')
    .expect(200, function(err, res) {
      res.headers['content-type'].should.be.startWith('text/html');
      res.text.should.be.equal('<p>Hello world</p>');
      done(err);
    });
  });

  it('loign', function(done) {
    request(server).post('/login')
    .send({
      username: 'admin',
      password: 'admin'
    })
    .expect(302, function(err, res) {
      res.headers.location.should.equal('/profile');
      res.headers['set-cookie'][0].indexOf('avos:sess=eyJfdWlkIjoiNTRmZDZhMDNlNGIwNmM0MWUwMGIxZjQwIiwiX3Nlc3Npb25Ub2tlbiI6IncyanJ0a2JlaHAzOG90cW1oYnF1N3liczkifQ==; path=/; expires=').should.equal(0);
      res.headers['set-cookie'][1].indexOf('avos:sess.sig=jMYF3Iwhmw903-K1K12MVdAFOh0; path=/; expires=').should.equal(0);
      done(err);
    });
  });

  it('profile', function(done) {
    request(server).get('/profile')
    .set('Cookie', 'avos:sess=eyJfdWlkIjoiNTRmZDZhMDNlNGIwNmM0MWUwMGIxZjQwIiwiX3Nlc3Npb25Ub2tlbiI6IncyanJ0a2JlaHAzOG90cW1oYnF1N3liczkifQ==; avos:sess.sig=jMYF3Iwhmw903-K1K12MVdAFOh0')
    .expect(200, function(err, res) {
      should.exist(res.body.objectId);
      res.body.username.should.be.equal('admin');
      done(err);
    });
  });

  it('profile without cookie', function(done) {
    request(server).get('/profile')
    .expect(204, function(err, res) {
      res.body.should.be.empty();
      done(err);
    });
  });

  it('logout', function(done) {
    request(server).post('/logout')
    .set('Cookie', 'avos:sess=eyJfdWlkIjoiNTRmZDZhMDNlNGIwNmM0MWUwMGIxZjQwIiwiX3Nlc3Npb25Ub2tlbiI6IncyanJ0a2JlaHAzOG90cW1oYnF1N3liczkifQ==; avos:sess.sig=jMYF3Iwhmw903-K1K12MVdAFOh0')
    .expect(200, function(err, res) {
      res.headers['set-cookie'][0].indexOf('avos:sess=; path=/; expires=').should.equal(0);
      done(err);
    });
  })
});
