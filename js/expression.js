define(function(require, exports, module) {
  'use strict';
  
  var Utils = require('utils'),
      Condition = require('condition'),
      Operator = require('operator'),
      EvalTree = require('evalTree');
  
  function Expression(text) {
    var self = this;
    self.operators = [/*Operator*/];
    self.conditions = [/*Condition*/];
    
    // EvalTree objects
    self.truePaths = null;
    self.falsePaths = null;
    
    // trim surrounding space and parenthesis pairs
    var textToParse = Utils.trimParenthesisPairs(text);
    var topLevelParenthesis = Utils.findTopLevelParenthesis(textToParse);
    
    var textChunks = [],
        lastPosition = 0;
    
    // Break the text into sub-expressions and top-level expressions
    // TODO: Identify when a ! precedes an Expression, and pass that into the constructor
    if(topLevelParenthesis.length === 0) {
      // There are no sub-expressions to extract.  Store the entire string
      textChunks.push(textToParse);
    } else {
      
      topLevelParenthesis.forEach(function(e) {
        // Store the text between previous chunk and start of this Expression
        textChunks.push(textToParse.substring(lastPosition, e.start));
        // Store the sub-expression
        textChunks.push(new Expression(textToParse.substring(e.start, e.end + 1)));
        // Advance the pointer
        lastPosition = e.end + 1;
      });
      
      // Store any trailing text
      if(lastPosition < textToParse.length - 1) {
        textChunks.push(textToParse.substring(lastPosition));
      }
      
    }
    
    var conditionChunks = [],
        matchAndOrXor = new RegExp(
            '(\\s|\\b)(?=' + Utils.tokensAndOrXor.join('|') + ')'
        , 'ig'),
        captureLeadingAnd = new RegExp(
            '^(' + Utils.tokensAnd.join('|') + ')'
        , 'ig'),
        captureLeadingOr = new RegExp(
            '^(' + Utils.tokensOr.join('|') + ')'
        , 'ig'),
        captureLeadingXor = new RegExp(
            '^(' + Utils.tokensXor.join('|') + ')'
        , 'ig'),
        leadingAndMatch, leadingOrMatch, leadingXorMatch;
    
    // TODO: Identify when the condition is preceded by a ! or has a negative comparison
    textChunks.forEach(function(textChunk) {
      // If this chunk is a sub-expression, just store it without parsing
      if(textChunk instanceof Expression) {
        self.conditions.push(textChunk);
      } else {
        conditionChunks = textChunk.split(matchAndOrXor);
        
        conditionChunks.forEach(function(condition) {
          // Determine if an AND operator or an OR operator was found.
          // If so, store which was found and then remove it.
          if((leadingAndMatch = condition.match(captureLeadingAnd)) !== null) {
            self.operators.push(new Operator.Operator(Operator.Operator.TYPE_AND));
            condition = condition.substring(leadingAndMatch[0].length);
          } else if((leadingOrMatch = condition.match(captureLeadingOr)) !== null) {
            self.operators.push(new Operator.Operator(Operator.Operator.TYPE_OR));
            condition = condition.substring(leadingOrMatch[0].length);
          } else if((leadingXorMatch = condition.match(captureLeadingXor)) !== null) {
            self.operators.push(new Operator.Operator(Operator.Operator.TYPE_XOR));
            condition = condition.substring(leadingXorMatch[0].length);
          }
          
          // Store anything that's not still empty.
          condition = condition.trim();
          if(condition !== '') {
            self.conditions.push(new Condition.Condition(condition));
          }
        });
        
      }
    });
    
    self.hasMixedOperators = Utils.hasMixedOperators(self.operators);
    
    self.truePaths = new EvalTree.EvalTree(self, true);
    self.falsePaths = new EvalTree.EvalTree(self, false);
    
    return this;
  }
  
  /*Expression.prototype.toArray = function() {
    var toArray = [],
        i;
    for(i = 0; i < this.conditions.length; i++) {
      toArray.push(this.conditions[i]);
      if(i < this.operators.length) {
        toArray.push(this.operators[i]);
      }
    }
    return toArray;
  };*/
  
  exports.Expression = Expression;

});