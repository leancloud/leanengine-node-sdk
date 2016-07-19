'use strict';

var express = require('express');
var bodyParser = require('body-parser');
var request = require('supertest');
var should = require('should');

var AV = require('..');
var config = require('./config');

var app = express();

AV.init(config);

app.use(AV.express());
app.use(bodyParser.json());
app.use(AV.Cloud.CookieSession({secret: 'my secret', maxAge: 3600000, fetchUser: true}));

app.get('/', function (req, res) {
  res.send('<p>Hello world</p>');
});

app.post('/login', function(req, res) {
  AV.User.logIn(req.body.username, req.body.password).then(
    function(user) {
      res.saveCurrentUser(user);
      res.redirect('/profile');
    },
    function(error) {
      res.status = 500;
      res.send(error);
    }
  );
});

app.post('/logout', function(req, res) {
  res.saveCurrentUser(null);
  res.send();
});

app.get('/profile', function(req, res) {
  res.send(req.currentUser);
});

describe('webhosting', function() {
  it('index', function(done) {
    request(app).get('/')
    .expect(200, function(err, res) {
      res.headers['content-type'].should.be.startWith('text/html');
      res.text.should.be.equal('<p>Hello world</p>');
      done(err);
    });
  });

  it('loign', function(done) {
    request(app).post('/login')
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
    request(app).get('/profile')
    .set('Cookie', 'avos:sess=eyJfdWlkIjoiNTRmZDZhMDNlNGIwNmM0MWUwMGIxZjQwIiwiX3Nlc3Npb25Ub2tlbiI6IncyanJ0a2JlaHAzOG90cW1oYnF1N3liczkifQ==; avos:sess.sig=jMYF3Iwhmw903-K1K12MVdAFOh0')
    .expect(200, function(err, res) {
      should.exist(res.body.objectId);
      res.body.username.should.be.equal('admin');
      done(err);
    });
  });

  it('profile without cookie', function(done) {
    request(app).get('/profile')
    .expect(200, function(err, res) {
      res.body.should.be.empty();
      done(err);
    });
  });

  it('logout', function(done) {
    request(app).post('/logout')
    .set('Cookie', 'avos:sess=eyJfdWlkIjoiNTRmZDZhMDNlNGIwNmM0MWUwMGIxZjQwIiwiX3Nlc3Npb25Ub2tlbiI6IncyanJ0a2JlaHAzOG90cW1oYnF1N3liczkifQ==; avos:sess.sig=jMYF3Iwhmw903-K1K12MVdAFOh0')
    .expect(200, function(err, res) {
      res.headers['set-cookie'][0].indexOf('avos:sess=; path=/; expires=').should.equal(0);
      done(err);
    });
  })
});
