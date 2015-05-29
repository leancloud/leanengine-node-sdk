var should = require('should'),
    AV = require('../lib/av-extra');

describe('av-extra', function() {
  it('httpRequest', function(done) {
    AV.Cloud.httpRequest({
      url: 'https://www.bing.com/search',
      params: { q : 'leancloud怎么样' },
      success: function(httpResponse) {
        httpResponse.status.should.equal(200);
        done();   
      },
      error: function(httpResponse) {
        throw httpResponse.text;
      }
    });
  });
});
