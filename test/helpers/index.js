const koa = require('koa');
const request = require('supertest');

const AV = require('../..');

exports.app = function() {
  if (process.env.FRAMEWORK == 'koa') {
   var app = koa();
   app.use(AV.koa());
   return app.listen();
  } else {
   return AV.express();
  }
}
