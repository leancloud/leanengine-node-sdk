module.exports = function() {
  return function(req, res, next) {
    res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');

    if (req.method.toLowerCase() === 'options') {
      res.statusCode = 200;
      res.setHeader('Access-Control-Max-Age','86400');
      res.setHeader('Access-Control-Allow-Methods', 'PUT, GET, POST, DELETE, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'X-LC-Id, X-LC-Key, X-LC-Session, X-LC-Sign, X-LC-Prod, X-LC-UA, X-Uluru-Application-Key, X-Uluru-Application-Id, X-Uluru-Application-Production, X-Uluru-Client-Version, X-Uluru-Session-Token, X-AVOSCloud-Application-Key, X-AVOSCloud-Application-Id, X-AVOSCloud-Application-Production, X-AVOSCloud-Client-Version, X-AVOSCloud-Session-Token, X-AVOSCloud-Super-Key, X-Requested-With, Content-Type, X-AVOSCloud-Request-sign');
      res.setHeader('Content-Length', 0);
      res.end();
    } else {
      next();
    }
  };
};
