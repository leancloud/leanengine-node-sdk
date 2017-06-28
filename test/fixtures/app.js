const Koa = require('koa');

const AV = require('../..');

module.exports = function() {
  if (process.env.FRAMEWORK == 'koa') {
   var app = new Koa();
   app.use(AV.koa());
   return app.listen();
  } else {
   return AV.express();
  }
}
