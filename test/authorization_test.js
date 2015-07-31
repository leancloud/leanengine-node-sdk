'use strict';
var config = require('./config'),
  AV = require('..');

var appId = config.appId;
var appKey = config.appKey;
var masterKey = config.masterKey;

AV.initialize(appId, appKey, masterKey);

AV.Cloud.define('foo', function(request, response) {
  response.success("bar");
});

var request = require('supertest');

describe('authorization', function() {
  it('ok', function(done) {
    request(AV.Cloud)
      .post('/1/functions/foo')
      .set('X-AVOSCloud-Application-Id', appId)
      .set('X-AVOSCloud-Application-Key', appKey)
      .expect(200)
      .expect({result: "bar"}, done);
  });

  it('no_appId_or_appKey', function(done) {
    request(AV.Cloud)
      .post('/1/functions/hello')
      .send({name: "张三"})
      .expect(401)
      .expect({code: 401, error: 'Unauthorized.'}, done);
  });

  it('mismatching', function(done) {
    request(AV.Cloud)
      .post('/1/functions/foo')
      .set('X-AVOSCloud-Application-Id', appId)
      .set('X-AVOSCloud-Application-Key', 'errorKey')
      .expect({code: 401, error: 'Unauthorized.'}, done);
  });

  it('masterKey', function(done) {
    request(AV.Cloud)
      .post('/1/functions/foo')
      .set('X-AVOSCloud-Application-Id', appId)
      .set('X-AVOSCloud-Application-Key', masterKey)
      .expect(200)
      .expect({result: "bar"}, done);
  });

  it('sign', function(done) {
    request(AV.Cloud)
      .post('/1/functions/foo')
      .set('X-AVOSCloud-Application-Id', appId)
      .set('X-AVOSCloud-Request-Sign', '4aaee8dee8821173931f03f7efd7067a,1389085779854')
      .expect(200)
      .expect({result: "bar"}, done);
  });

  it('sign_md5_upper', function(done) {
    request(AV.Cloud)
      .post('/1/functions/foo')
      .set('X-AVOSCloud-Application-Id', appId)
      .set('X-AVOSCloud-Request-Sign', '4AAEE8DEE8821173931F03F7EFD7067A,1389085779854')
      .expect(200)
      .expect({result: "bar"}, done);
  });

  it('sign_master', function(done) {
    request(AV.Cloud)
      .post('/1/functions/foo')
      .set('X-AVOSCloud-Application-Id', appId)
      .set('X-AVOSCloud-Request-Sign', 'c9bd13ecd484736ce550d1a2ff9dbc0f,1389085779854,master')
      .expect(200)
      .expect({result: "bar"}, done);
  });

  it('sign_mismatching', function(done) {
    request(AV.Cloud)
      .post('/1/functions/foo')
      .set('X-AVOSCloud-Application-Id', appId)
      .set('X-AVOSCloud-Request-Sign', '11111111111111111111111111111111,1389085779854')
      .expect({code: 401, error: 'Unauthorized.'}, done);
  });

});

