const bodyParser = require('koa-bodyparser');
const Koa = require('koa');
const request = require('supertest');
const should = require('should');

const AV = require('../..');
const appInfo = require('../fixtures/app-info');

const app = new Koa();

if (process.env.KOA_VER === '1') {
  app.use(AV.koa());
  app.use(bodyParser());
  app.use(AV.Cloud.HttpsRedirect({framework: 'koa'}));
  app.use(AV.Cloud.CookieSession({framework: 'koa', secret: 'my secret', maxAge: 3600000, fetchUser: true}));
  app.use(AV.Cloud.LeanCloudHeaders({framework: 'koa'}));
} else {
  app.use(AV.koa2());
  app.use(bodyParser());
  app.use(AV.Cloud.HttpsRedirect({framework: 'koa2'}));
  app.use(AV.Cloud.CookieSession({framework: 'koa2', secret: 'my secret', maxAge: 3600000, fetchUser: true}));
  app.use(AV.Cloud.LeanCloudHeaders({framework: 'koa2'}));
}


const server = app.listen();

describe('koa', function() {
  it('health-check', done => {
    request(server)
      .get('/__engine/1/ping')
      .expect(200, (err, res) => {
        should.exist(res.body.runtime);
        should.exist(res.body.version);
        done(err);
      });
  });
});
