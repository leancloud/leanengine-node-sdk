var packageVersion = require('../package').version;

module.exports = function() {
  return function(req, res, next) {
    if (req.url == '/__engine/1/ping') {
      res.setHeader('content-type', 'application/json');
      res.end(JSON.stringify({
        runtime: 'nodejs-' + process.version,
        version: packageVersion
      }));
    } else {
      next();
    }
  };
};
