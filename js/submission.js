define(function(require, exports, module) {
  'use strict';
  
  var Utils = require('utils'),
      Expression = require('expression');
  
  function Submission(text) {
    var matchLineBreaks = new RegExp(
          '(?:' + Utils.tokensLineBreak.join('|') + ')'
        , 'ig'),
        captureExpression = new RegExp(
          '^(?:' + Utils.tokensIgnoreLeading.join('|') + ')*' + // ignore any leading syntax
          '([^]*?)' + // capture what's in-between
          '(?:' + Utils.tokensIgnoreTrailing.join('|') + ')*$' // ignore any trailing syntax
        , 'igm');
    
    var textToParse = text;
    // collapse to a single line
    textToParse = textToParse.replace(matchLineBreaks, ' ');
    // capture the conditional text
    textToParse = captureExpression.exec(textToParse)[1];
    
    this.expression = new Expression(textToParse);
    
    return this;
  }
  
  return Submission;

});