var domain = require('domain');

module.exports = function() {
  return function(req, res, next) {
    if (process.domain) {
      return next();
    }
    var d = domain.create();
    d.add(req);
    d.add(res);
    d.on('error', function(err) {
      console.error('LeanEngine function uncaughtException url=%s, msg=%s', req.originalUrl, err.stack || err.message || err);
      if(!res.finished) {
        res.statusCode = 500;
        res.setHeader('content-type', 'application/json; charset=UTF-8');
        res.end(JSON.stringify({code: 1, error: 'LeanEngine function uncaughtException'}));
      }
    });
    d.run(next);
  };
};
