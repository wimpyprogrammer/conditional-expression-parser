define(function(require, exports, module) {
  'use strict';
  
  var Utils = require('utils'),
      Condition = require('condition'),
      Operator = require('operator');
  
  function calculateAllEvalPaths(conditions) {
    // recursively calculate the eval paths of all the subsequent elements
    var subEvalPaths = (conditions.length === 1) ? [[]] : calculateAllEvalPaths(conditions.slice(1)),
        evalPaths = [],
        tempEvalPath;
    
    // For each of the sub paths, create versions where this condition is true and false
    subEvalPaths.forEach(function(e) {
      (tempEvalPath = Utils.cloneDeep(e)).unshift({ condition: conditions[0], result: true });
      evalPaths.push(tempEvalPath);
      (tempEvalPath = Utils.cloneDeep(e)).unshift({ condition: conditions[0], result: false });
      evalPaths.push(tempEvalPath);
    });
    
    return evalPaths;
  }
  
  // Generate an eval path with the specified result for all conditions
  function generateEvalPathsUniformResult(conditions, result) {
    var evalPaths = [[]];
    conditions.forEach(function(c) {
      evalPaths[0].push({ condition: c, result: result });
    });
    return evalPaths;
  }
  
  // Generate eval paths where each condition has the specified result
  function generateEvalPathsIndividualResult(conditions, result) {
    var evalPaths = [], evalPath;
    conditions.forEach(function(unused, i1) {
      evalPath = [];
      conditions.forEach(function(c, i2) {
        evalPath.push({ condition: c, result: (i1 === i2) ? result : null });
      });
      evalPaths.push(evalPath);
    });
    return evalPaths;
  }
  
  function Expression(text) {
    var self = this;
    self.operators = [/*Operator*/];
    self.conditions = [/*Condition*/];
    self.truePaths = [/*{ condition, result }*/];
    self.falsePaths = [/*{ condition, result }*/];
    
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
            self.operators.push(new Operator(Operator.TYPE_AND));
            condition = condition.substring(leadingAndMatch[0].length);
          } else if((leadingOrMatch = condition.match(captureLeadingOr)) !== null) {
            self.operators.push(new Operator(Operator.TYPE_OR));
            condition = condition.substring(leadingOrMatch[0].length);
          } else if((leadingXorMatch = condition.match(captureLeadingXor)) !== null) {
            self.operators.push(new Operator(Operator.TYPE_XOR));
            condition = condition.substring(leadingXorMatch[0].length);
          }
          
          // Store anything that's not still empty.
          condition = condition.trim();
          if(condition !== '') {
            self.conditions.push(new Condition(condition));
          }
        });
        
      }
    });
    
    self.hasMixedOperators = Utils.hasMixedOperators(self.operators);
    
    // Calculate the combinations of Conditions that will resolve to true
    if(!self.hasMixedOperators) { // TODO: Can we calculate when operators are mixed?
      if(self.conditions.length === 1) {
        // There's only one condition, so it must be true
        self.truePaths.push([{ condition: self.conditions[0], result: true }]);
      } else {
        
        if(self.operators[0].isAnd()) {
          
          // Create one truePath where every condition is true
          self.truePaths = generateEvalPathsUniformResult(self.conditions, true);
          // Create a separate falsePath for each Condition where one is false
          self.falsePaths = generateEvalPathsIndividualResult(self.conditions, false);
          
        } else if(self.operators[0].isOr()) {
          
          // Create a separate truePath for each Condition where one is true
          self.truePaths = generateEvalPathsIndividualResult(self.conditions, false);
          // Create one falsePath where every condition is false
          self.falsePaths = generateEvalPathsUniformResult(self.conditions, false);
          
        } else { // XOR operator
          
          // A XOR expression is true if it has an odd number of true conditions
          var isTrueCondition = function(c) { return c.result; },
              hasOddTrues = function(ep) {
                return ep.filter(isTrueCondition).length % 2 === 1;
              },
              allEvalPaths = calculateAllEvalPaths(self.conditions);
          
          allEvalPaths.forEach(function(evalPath) {
            if(hasOddTrues(evalPath)) {
              self.truePaths.push(evalPath);
            } else {
              self.falsePaths.push(evalPath);
            }
          });
          
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
        i, k, subTruePaths, nullSubTruePath, tempTruePath;
    
    // Iterate through the first truePath, as a template of the conditions and sub-expressions.
    // Step through it backwards so expanded paths will not throw off the upcoming indicies.
    for(i = self.truePaths[0].length - 1; i >= 0; i--) {
      if(self.truePaths[0][i].condition instanceof Expression) {
        subTruePaths = self.truePaths[0][i].condition.expandTruePaths();
        
        // Cross-apply the child true paths to the one for this Expression
        for(k = expandedTruePaths.length - 1; k >= 0; k--) {
          
          if(expandedTruePaths[k][i].result !== true) {
            // If the sub-expression doesn't need to be true, create a version where all conditions are null
            nullSubTruePath = Utils.cloneDeep(subTruePaths[0]);
            nullSubTruePath.forEach(function(e) { e.result = null; } );
            // Insert these conditions once, no matter how many true paths the sub-Expression contains
            tempTruePath = replaceSubExpressionWithTruePath(expandedTruePaths[k], nullSubTruePath, i);
            // Append the new true path after the existing one. Because k counts down, it won't be processed.
            expandedTruePaths.splice(k + 1, 0, tempTruePath);
          } else {
            // The sub-expression needs to be true, so insert each of its true paths
            subTruePaths.forEach(function(e) {
              // Update this true path to replace the sub-expression with its expanded conditions
              tempTruePath = replaceSubExpressionWithTruePath(expandedTruePaths[k], e, i);
              // Append the new true path after the existing one. Because k counts down, it won't be processed.
              expandedTruePaths.splice(k + 1, 0, tempTruePath);
            });
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