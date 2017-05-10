const leancloudHeaders = require('leancloud-cors-headers');

module.exports = function() {
  return function(req, res, next) {
    res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');

    if (req.method.toLowerCase() === 'options') {
      res.statusCode = 200;
      res.setHeader('Access-Control-Max-Age','86400');
      res.setHeader('Access-Control-Allow-Methods', 'HEAD, GET, POST, PUT, DELETE, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', leancloudHeaders.join(', '));
      res.setHeader('Content-Length', 0);
      res.end();
    } else {
      next();
    }
  };
};
