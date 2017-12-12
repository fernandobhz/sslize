'use strict';

var userAgentCheck = require('./lib/userAgent.js');
var domCheck = require('./lib/noop.js');
var window = require('global/window');

var hasDOM = typeof domCheck === 'function';

/**
 *
 * @param {String} userAgent
 * @param {=Object} configObject
 */
function isWebView(userAgent, configObject){
  // we can skip everything if we have no DOM to check and no userAgent
  if (!hasDOM && !userAgent){
    return false;
  }

  if (typeof userAgent === 'object'){
    configObject = userAgent;
    userAgent = '';
  }

  configObject = configObject || {};

  // known app name
  if (configObject.appName && userAgentCheck(userAgent, configObject.appName)){
    return true;
  }

  // non-W3C properties injected by wrappers
  if (hasDOM && domCheck(window)){
    return true;
  }

  // Slower User Agent detection
  return userAgentCheck(userAgent);
}

isWebView.getRules = function getRules(){
  return rules;
};

module.exports = isWebView;