'use strict';
var AV = require('..');
var express = require('express');
var request = require('supertest');
require('should');

const appInfo = require('./helpers/app-info');

var app = express();

app.enable('trust proxy');
app.use(AV.Cloud.HttpsRedirect());

app.get('/test', function (req, res) {
  res.send('Hello World!');
});

describe('https-redirect', function() {
  it('should redirect', function(done) {
    request(app)
      .get('/test')
      .set('host', 'stg-abc.leanapp.cn')
      .expect(302)
      .end(function(err, res) {
        res.headers.location.should.equal('https://stg-abc.leanapp.cn/test');
        res.text.should.endWith('Redirecting to https://stg-abc.leanapp.cn/test');
        done();
      });
  });

  it('should not redirect', function(done) {
    request(app)
      .get('/test')
      .expect(200)
      .expect("Hello World!", done);
  });
});
