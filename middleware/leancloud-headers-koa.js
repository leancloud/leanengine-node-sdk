const leancloudHeaders = require('./leancloud-headers');

module.exports = function(AV) {
  return function(options) {
    var middleware = leancloudHeaders(AV, options);

    return function *(next) {
      yield middleware.bind(null, this.req, this.res);
      yield next;
    }
  };
};
