define(function(require, exports, module) {
  'use strict';
  
  var Utils = require('utils'),
      Condition = require('condition'),
      Operator = require('operator');
  
  function Expression(text) {
    var self = this;
    self.operators = [/*Operator*/];
    self.conditions = [/*Condition*/];
    self.truePaths = [/*{ condition, result }*/];
    
    // trim surrounding space and parenthesis pairs
    var textToParse = Utils.trimParenthesisPairs(text);
    var topLevelParenthesis = Utils.findTopLevelParenthesis(textToParse);
    
    var textChunks = [],
        lastPosition = 0,
        i, j, k, l, m; // iterators
    
    // Break the text into sub-expressions and top-level expressions
    // TODO: Identify when a ! precedes an Expression, and pass that into the constructor
    if(topLevelParenthesis.length === 0) {
      // There are no sub-expressions to extract.  Store the entire string
      textChunks.push(textToParse);
    } else {
      for(i = 0; i < topLevelParenthesis.length; i++) {
        // Store the text between previous chunk and start of this Expression
        textChunks.push(textToParse.substring(lastPosition, topLevelParenthesis[i].start));
        // Store the sub-expression
        textChunks.push(new Expression(textToParse.substring(topLevelParenthesis[i].start, topLevelParenthesis[i].end + 1)));
        // Advance the pointer
        lastPosition = topLevelParenthesis[i].end + 1;
      }
      // Store any trailing text
      if(lastPosition < textToParse.length - 1) {
        textChunks.push(textToParse.substring(lastPosition));
      }
    }
    
    var conditionChunks = [],
        matchAndOr = new RegExp(
            '(\\s|\\b)(?=' + Utils.tokensAndOr.join('|') + ')'
        , 'ig'),
        captureLeadingAnd = new RegExp(
            '^(' + Utils.tokensAnd.join('|') + ')'
        , 'ig'),
        captureLeadingOr = new RegExp(
            '^(' + Utils.tokensOr.join('|') + ')'
        , 'ig'),
        condition, leadingAndMatch, leadingOrMatch;
    
    // TODO: Identify when the condition is preceded by a ! or has a negative comparison
    for(j = 0; j < textChunks.length; j++) {
      // If this chunk is a sub-expression, just store it without parsing
      if(textChunks[j] instanceof Expression) {
        self.conditions.push(textChunks[j]);
      } else {
        conditionChunks = textChunks[j].split(matchAndOr);
        for(k = 0; k < conditionChunks.length; k++) {
          condition = conditionChunks[k];
          
          // Determine if an AND operator or an OR operator was found.
          // If so, store which was found and then remove it.
          if((leadingAndMatch = condition.match(captureLeadingAnd)) !== null) {
            self.operators.push(new Operator(true)); // AND operator
            condition = condition.substring(leadingAndMatch[0].length);
          } else if((leadingOrMatch = condition.match(captureLeadingOr)) !== null) {
            self.operators.push(new Operator(false)); // OR operator
            condition = condition.substring(leadingOrMatch[0].length);
          }
          
          // Store anything that's not still empty.
          condition = condition.trim();
          if(condition !== '') {
            self.conditions.push(new Condition(condition));
          }
        }
      }
    }
    
    self.hasMixedOperators = Utils.hasMixedOperators(self.operators);
    
    // Calculate the combinations of Conditions that will resolve to true
    var truePath;
    if(!self.hasMixedOperators) { // TODO: Can we calculate when operators are mixed?
      if(self.conditions.length === 1) {
        // There's only one condition, so it must be true
        self.truePaths.push([{ condition: self.conditions[0], result: true }]);
      } else {
        if(self.operators[0].isAnd()) {
          
          // Create one truePath where every condition is true
          truePath = [];
          
          for(l = 0; l < self.conditions.length; l++) {
            truePath.push({ condition: self.conditions[l], result: true });
          }
          self.truePaths.push(truePath);
          
        } else {
          
          // Create a separate truePath for each Condition where one is true
          for(l = 0; l < self.conditions.length; l++) {
            truePath = [];
            for(m = 0; m < self.conditions.length; m++) {
              truePath.push({ condition: self.conditions[m], result: (l === m) });
            }
            self.truePaths.push(truePath);
          }
          
        }
      }
    }
    
    return this;
  }
  
  Expression.prototype.expandTruePaths = function() {
    var self = this;
      
    var replaceSubExpressionWithTruePath = function(appendInto, toAppend, subExpressionPos) {
      // Create a copy of the object so that modifications will not leak in or out by reference
      var tempAppendInto = Utils.cloneDeep(appendInto),
          spliceArgs = [subExpressionPos, 1].concat(toAppend);
      Array.prototype.splice.apply(tempAppendInto, spliceArgs);
      
      return tempAppendInto;
    };
    
    var expandedTruePaths = Utils.cloneDeep(self.truePaths),
        i, j, k, kMax, subTruePaths, falseSubTruePath, tempTruePath;
    
    // Iterate through the first truePath, as a template of the conditions and sub-expressions.
    // Step through it backwards so expanded paths will not throw off the upcoming indicies.
    for(i = self.truePaths[0].length - 1; i >= 0; i--) {
      if(self.truePaths[0][i].condition instanceof Expression) {
        subTruePaths = self.truePaths[0][i].condition.expandTruePaths();
        
        // Cross-apply the child true paths to the one for this Expression
        for(k = expandedTruePaths.length - 1; k >= 0; k--) {
          
          if(expandedTruePaths[k][i].result === false) {
            // If the sub-expression doesn't need to be true, create a version where all conditions are false
            falseSubTruePath = Utils.cloneDeep(subTruePaths[0]);
            falseSubTruePath.forEach(function(e) { e.result = false; } );
            // Insert these conditions once, no matter how many true paths the sub-Expression contains
            tempTruePath = replaceSubExpressionWithTruePath(expandedTruePaths[k], falseSubTruePath, i);
            // Append the new true path after the existing one. Because k counts down, it won't be processed.
            expandedTruePaths.splice(k + 1, 0, tempTruePath);
          } else {
            // The sub-expression needs to be true, so insert each of its true paths
            for(j = subTruePaths.length - 1; j >= 0; j--) {
              // Update this true path to replace the sub-expression with its expanded conditions
              tempTruePath = replaceSubExpressionWithTruePath(expandedTruePaths[k], subTruePaths[j], i);
              // Append the new true path after the existing one. Because k counts down, it won't be processed.
              expandedTruePaths.splice(k + 1, 0, tempTruePath);
            }
          }
          
          // Remove the sub-expression, now that it's been replaced above by the expansion(s)
          expandedTruePaths.splice(k, 1);
          
        }
      }
    }
    
    return expandedTruePaths;
  };
  
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
  
  return Expression;

});