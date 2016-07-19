var endsWith = require('../lib/utils').endsWith;

module.exports = function(AV) {
  return function() {
    return function *(next) {
      if ((AV.Cloud.__prod || endsWith(this.request.hostname, '.leanapp.cn')) && (!this.request.secure)) {
        this.response.redirect('https://' + this.request.hostname + this.request.originalUrl);
      } else {
        yield next;
      }
    }
  }
};
