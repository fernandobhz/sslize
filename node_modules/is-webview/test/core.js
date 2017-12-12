'use strict';

var test = require('tape');
var iswebview = require('../index.js');

test('no argument (really?)', function(t){
  t.plan(1);

  t.false(iswebview());
});

test('undefined user agent', function(t){
  t.plan(1);

  t.false(iswebview(undefined));
});

test('string defined user agent', function(t){
  t.plan(2);

  t.false(iswebview('Mozilla/5.0 (iPad; CPU OS 5_1 like Mac OS X) AppleWebKit/534.46 (KHTML, like Gecko) Version/5.1 Mobile/9B176 Safari/7534.48.3'));
  t.true(iswebview('Mozilla/5.0 (iPad; CPU OS 5_1 like Mac OS X) AppleWebKit/534.46 (KHTML, like Gecko) Mobile/9B176'));
});

test('single/dual argument', function(t){
  t.plan(5);

  t.false(iswebview({}));
  t.false(iswebview({}, {}));
  t.false(iswebview({ appName: 'FooBar' }));
  t.false(iswebview('', { appName: 'FooBar' }));
  t.false(iswebview('', {}));
});

test('appName argument', function(t){
  t.plan(3);

  t.false(iswebview('Mozilla/5.0 (iPad; CPU OS 5_1 like Mac OS X)', { appName: 'FooBar' }));
  t.true(iswebview('FooBar/1.3.37 /Windows CE/ Mobile', { appName: 'FooBar' }));
  t.false(iswebview('FooBar/1.3.37 /Windows CE/ Mobile'));
});