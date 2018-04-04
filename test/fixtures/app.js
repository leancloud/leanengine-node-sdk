const AV = require('../..');

module.exports = function(options) {
  if (process.env.FRAMEWORK === 'koa') {
    const Koa = require('koa');
    var app = new Koa();

    if (process.env.KOA_VER === '1') {
      app.use(AV.koa(options));
    } else {
      app.use(AV.koa2(options));
    }

    return app.listen();
  } else {
    return AV.express(options);
  }
}
