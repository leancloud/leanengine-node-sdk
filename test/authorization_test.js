'use strict';
var config = require('./config'),
  AV = require('..');

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

AV.Cloud.define('foo', function(request, response) {
  response.success("bar");
});

var request = require('supertest');

describe('authorization', function() {
  it('ok', function(done) {
    request(app)
      .post('/1/functions/foo')
      .set('X-AVOSCloud-Application-Id', appId)
      .set('X-AVOSCloud-Application-Key', appKey)
      .expect(200)
      .expect({result: "bar"}, done);
  });

  it('no_appId_or_appKey', function(done) {
    request(app)
      .post('/1/functions/hello')
      .send({name: "张三"})
      .expect(401)
      .expect({code: 401, error: 'Unauthorized.'}, done);
  });

  it('mismatching', function(done) {
    request(app)
      .post('/1/functions/foo')
      .set('X-AVOSCloud-Application-Id', appId)
      .set('X-AVOSCloud-Application-Key', 'errorKey')
      .expect({code: 401, error: 'Unauthorized.'}, done);
  });

  it('masterKey', function(done) {
    request(app)
      .post('/1/functions/foo')
      .set('X-AVOSCloud-Application-Id', appId)
      .set('X-AVOSCloud-Application-Key', masterKey)
      .expect(200)
      .expect({result: "bar"}, done);
  });

  it('sign', function(done) {
    request(app)
      .post('/1/functions/foo')
      .set('X-AVOSCloud-Application-Id', appId)
      .set('X-AVOSCloud-Request-Sign', '4aaee8dee8821173931f03f7efd7067a,1389085779854')
      .expect(200)
      .expect({result: "bar"}, done);
  });

  it('sign_md5_upper', function(done) {
    request(app)
      .post('/1/functions/foo')
      .set('X-AVOSCloud-Application-Id', appId)
      .set('X-AVOSCloud-Request-Sign', '4AAEE8DEE8821173931F03F7EFD7067A,1389085779854')
      .expect(200)
      .expect({result: "bar"}, done);
  });

  it('sign_master', function(done) {
    request(app)
      .post('/1/functions/foo')
      .set('X-AVOSCloud-Application-Id', appId)
      .set('X-AVOSCloud-Request-Sign', 'c9bd13ecd484736ce550d1a2ff9dbc0f,1389085779854,master')
      .expect(200)
      .expect({result: "bar"}, done);
  });

  it('sign_mismatching', function(done) {
    request(app)
      .post('/1/functions/foo')
      .set('X-AVOSCloud-Application-Id', appId)
      .set('X-AVOSCloud-Request-Sign', '11111111111111111111111111111111,1389085779854')
      .expect({code: 401, error: 'Unauthorized.'}, done);
  });

  it('short_header', function(done) {
    request(app)
      .post('/1/functions/foo')
      .set('X-LC-Id', appId)
      .set('X-LC-Key', appKey)
      .expect(200)
      .expect({result: "bar"}, done);
  });

  it('short_header_masterKey', function(done) {
    request(app)
      .post('/1/functions/foo')
      .set('X-LC-Id', appId)
      .set('X-LC-Key', masterKey + ',master')
      .expect(200)
      .expect({result: "bar"}, done);
  });

  it('short_header_sign', function(done) {
    request(app)
      .post('/1/functions/foo')
      .set('X-LC-Id', appId)
      .set('X-LC-Sign', '4aaee8dee8821173931f03f7efd7067a,1389085779854')
      .expect(200)
      .expect({result: "bar"}, done);
  });

  it('short_header_mismatching', function(done) {
    request(app)
      .post('/1/functions/foo')
      .set('X-LC-Id', appId)
      .set('X-LC-Key', appKey + ',master')
      .expect({code: 401, error: 'Unauthorized.'}, done);
  });

});
