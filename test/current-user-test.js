'use strict';

var express = require('express');
var assert = require('assert');
var bodyParser = require('body-parser');

var AV = require('..');
const appInfo = require('./helpers/app-info');
var request = require('supertest');

var appId = appInfo.appId;
var appKey = appInfo.appKey;
var masterKey = appInfo.masterKey;
var sessionTokenAdmin = appInfo.sessionTokenAdmin;

describe('current user', function() {
  var app = express();

  before(function() {
    app.use(AV.express());
    app.use(bodyParser.json());
    app.use(AV.Cloud.CookieSession({ secret: 'my secret', fetchUser: true }));

    AV.Cloud.define('currentUserFromRequest', function(request, response) {
      var user = request.currentUser;

      response.success({
        currentUser: user,
        username: user && user.get('username')
      });
    });

    app.post('/login', function(req, res) {
      AV.User.logIn(req.body.username, req.body.password).then(function(user) {
        res.saveCurrentUser(user);
        res.sendStatus(200);
      }, function(error) {
        res.status = 500;
        res.send(error);
      });
    });

    app.post('/logout', function(req, res) {
      res.clearCurrentUser();
      res.send();
    });

    app.post('/currentUserFromRequest', function(req, res) {
      var user = req.currentUser;

      res.json({
        currentUser: user,
        username: user && user.get('username'),
        sessionToken: req.sessionToken
      });
    });
  });

  describe('cloudfunction', function() {
    var agent = request.agent(app);

    it('use req.currentUser (no user info)', function(done) {
      agent.post('/1/functions/currentUserFromRequest')
      .set('X-AVOSCloud-Application-Id', appId)
      .set('X-AVOSCloud-Application-Key', appKey)
      .expect(200, function(err, res) {
        assert.equal(null, res.body.result.currentUser);
        done(err);
      });
    });

    it('use req.currentUser (from header)', function(done) {
      agent.post('/1/functions/currentUserFromRequest')
      .set('X-AVOSCloud-Application-Id', appId)
      .set('X-AVOSCloud-Application-Key', appKey)
      .set('x-AVOSCloud-Session-Token', sessionTokenAdmin)
      .expect(200, function(err, res) {
        res.body.result.username.should.be.equal('admin');
        done(err);
      });
    });
  });

  describe('express', function() {
    var agent = request.agent(app);

    it('request req.currentUser (no user info)', function(done) {
      agent.post('/currentUserFromRequest')
      .expect(200, function(err, res) {
        assert.equal(null, res.body.currentUser);
        done(err);
      });
    });

    it('logIn', function(done) {
      agent.post('/login').send({
        username: 'admin',
        password: 'admin'
      }).expect(200, done);
    });

    it('request req.currentUser (from cookie)', function(done) {
      agent.post('/currentUserFromRequest')
      .expect(200, function(err, res) {
        res.body.username.should.be.equal('admin');
        res.body.sessionToken.should.be.equal(sessionTokenAdmin);
        done(err);
      });
    });

    it('logOut', function(done) {
      agent.post('/logout').send({
        username: 'admin',
        password: 'admin'
      }).expect(200, done);
    });

    it('request req.currentUser (already logout)', function(done) {
      agent.post('/currentUserFromRequest')
      .expect(200, function(err, res) {
        assert.equal(null, res.body.currentUser);
        done(err);
      });
    });
  });
});
