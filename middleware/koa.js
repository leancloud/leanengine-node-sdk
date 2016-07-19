module.exports = function(AV) {
  var middleware = AV.express();

  return function *(next) {
    yield middleware.bind(null, this.req, this.res);
    yield next;
  }
};
