'use strict';

var koa = require('koa');
var request = require('supertest');
require('should');

var AV = require('../..');
var config = require('../config');

AV.init(config);

var app = koa();

app.proxy = true;
app.use(AV.Cloud.HttpsRedirect({framework: 'koa'}));

app.use(function *(next) {
  this.body = 'Hello World!';
});

var server = app.listen();

describe('https-redirect', function() {
  it('should redirect', function(done) {
    request(server)
      .get('/test')
      .set('host', 'stg-abc.leanapp.cn')
      .expect(302)
      .end(function(err, res) {
        res.headers.location.should.equal('https://stg-abc.leanapp.cn/test');
        res.text.should.match('Redirecting to <a href="https://stg-abc.leanapp.cn/test">https://stg-abc.leanapp.cn/test</a>.');
        done();
      });
  });

  it('should not redirect', function(done) {
    request(server)
      .get('/test')
      .expect(200)
      .expect("Hello World!", done);
  });
});
