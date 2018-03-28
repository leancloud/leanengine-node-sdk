'use strict';

var Koa = require('koa');
var request = require('supertest');
require('should');

var AV = require('../..');
const appInfo = require('../fixtures/app-info');

var app = new Koa();

app.proxy = true;

if (process.env.KOA_VER === '1') {
  app.use(AV.Cloud.HttpsRedirect({framework: 'koa'}));

  app.use(function *(next) {
    this.body = 'Hello World!';
    yield next;
  });
} else {
  app.use(AV.Cloud.HttpsRedirect({framework: 'koa2'}));

  app.use(async ctx => {
    ctx.body = 'Hello World!';
  });
}

var server = app.listen();

describe('koa/https-redirect', function() {
  it('should redirect', function(done) {
    request(server)
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
    request(server)
      .get('/test')
      .expect(200)
      .expect("Hello World!", done);
  });

  it('should not redirect (https)', function(done) {
    request(server)
      .get('/test')
      .set('HOST', 'stg-abc.leanapp.cn')
      .set('X-Forwarded-Proto', 'https')
      .expect(200)
      .expect("Hello World!", done);
  });
});
