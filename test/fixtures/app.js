const AV = require('../..');

module.exports = function(options) {
  if (process.env.FRAMEWORK == 'koa') {
    const Koa = require('koa');
    var app = new Koa();
    app.use(AV.koa(options));
    return app.listen();
  } else {
    return AV.express(options);
  }
}
