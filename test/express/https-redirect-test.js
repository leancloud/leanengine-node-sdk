'use strict';
var AV = require('../..');
var express = require('express');
var request = require('supertest');
require('should');

const appInfo = require('../fixtures/app-info');

var app = express();

app.enable('trust proxy');
app.use(AV.Cloud.HttpsRedirect());

app.get('/test', function (req, res) {
  res.send('Hello World!');
});

describe('https-redirect', function() {
  var prod = AV.Cloud.__prod

  afterEach(function() {
    // rollback changes on AV.Cloud.__prod
    AV.Cloud.__prod = prod
  })

  it('should redirect', function(done) {
    request(app)
      .get('/test')
      .set('host', 'stg-abc.leanapp.cn')
      .expect(302)
      .end(function(err, res) {
        res.headers.location.should.equal('https://stg-abc.leanapp.cn/test');
        res.text.should.endWith('Redirecting to https://stg-abc.leanapp.cn/test');
        done();
      });
  });

  it('should not redirect (local)', function(done) {
    request(app)
      .get('/test')
      .expect(200)
      .expect("Hello World!", done);
  });

  it('should not redirect (https)', function(done) {
    request(app)
      .get('/test')
      .set('HOST', 'stg-abc.leanapp.cn')
      .set('X-Forwarded-Proto', 'https')
      .expect(200)
      .expect("Hello World!", done);
  });

  it('should redirect (Forwarded, custom domain on staging)', function(done) {
    AV.Cloud.__prod = 0

    request(app)
      .get('/test')
      .set('Host', 'stg-custom.domain.com')
      .set('Forwarded', 'for=1.2.3.4; proto=http, for=10.0.0.1')
      .expect(302)
      .end(function(err, res) {
        res.headers.location.should.equal('https://stg-custom.domain.com/test');
        done();
      })
  });

  it('should not redirect (Forwarded, intranet)', function(done) {
    AV.Cloud.__prod = 0

    request(app)
      .get('/test')
      .set('Host', 'stg-custom.domain.com')
      .set('Forwarded', 'for=10.0.0.1; proto=http')
      .set('X-Forwarded-Proto', 'http')
      .expect(200)
      .expect("Hello World!", done);
  });

  it('should not redirect (Forwarded overwrite X-Forwarded-Proto)', function(done) {
    AV.Cloud.__prod = 0

    request(app)
      .get('/test')
      .set('Host', 'stg-custom.domain.com')
      .set('Forwarded', 'for=1.2.3.4; proto=https, for=10.0.0.1; proto=http')
      .set('X-Forwarded-Proto', 'http')
      .expect(200)
      .expect("Hello World!", done);
  });
});
