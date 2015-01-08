define(function(require, exports, module) {
  'use strict';
  
  var Utils = require('utils'),
      Condition = require('condition'),
      Operator = require('operator');
  
  function Expression(text) {
    this.operators = [/*Operator*/];
    this.conditions = [/*Condition*/];
    this.truePaths = [/*{ condition, result }*/];
    
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
        this.conditions.push(textChunks[j]);
      } else {
        conditionChunks = textChunks[j].split(matchAndOr);
        for(k = 0; k < conditionChunks.length; k++) {
          condition = conditionChunks[k];
          
          // Determine if an AND operator or an OR operator was found.
          // If so, store which was found and then remove it.
          if((leadingAndMatch = condition.match(captureLeadingAnd)) !== null) {
            this.operators.push(new Operator(true)); // AND operator
            condition = condition.substring(leadingAndMatch[0].length);
          } else if((leadingOrMatch = condition.match(captureLeadingOr)) !== null) {
            this.operators.push(new Operator(false)); // OR operator
            condition = condition.substring(leadingOrMatch[0].length);
          }
          
          // Store anything that's not still empty.
          condition = condition.trim();
          if(condition !== '') {
            this.conditions.push(new Condition(condition));
          }
        }
      }
    }
    
    this.hasMixedOperators = Utils.hasMixedOperators(this.operators);
    
    // Calculate the combinations of Conditions that will resolve to true
    var truePath;
    if(!this.hasMixedOperators) { // TODO: Can we calculate when operators are mixed?
      if(this.conditions.length === 1) {
        // There's only one condition, so it must be true
        this.truePaths.push([{ condition: this.conditions[0], result: true }]);
      } else {
        if(this.operators[0].isAnd()) {
          // Create one truePath where every condition is true
          truePath = [];
          for(l = 0; l < this.conditions.length; l++) {
            truePath.push({ condition: this.conditions[l], result: true });
          }
          this.truePaths.push(truePath);
        } else {
          // Create a separate truePath for each Condition where one is true
          for(l = 0; l < this.conditions.length; l++) {
            truePath = [];
            for(m = 0; m < this.conditions.length; m++) {
              truePath.push({ condition: this.conditions[m], result: (l === m) });
            }
            this.truePaths.push(truePath);
          }
        }
      }
    }
    
    return this;
  }
  
  Expression.prototype.expandTruePaths = function() {
      
    var replaceSubExpressionWithTruePath = function(appendInto, toAppend, subExpressionPos) {
      var resultToInsert = appendInto[subExpressionPos].result,
          tempAppendInfo, tempToAppend, i, spliceArgs;
      
      // Create a copy of the objects so that modifications will not leak in or out by reference
      tempAppendInfo = Utils.cloneDeep(appendInto);
      tempToAppend = Utils.cloneDeep(toAppend);
      
      // If the Expression does not need to be true in this path, set all its conditions to false
      // TODO: Move this to the (expandedTruePaths[k][i].result === false) condition
      if(!resultToInsert) {
        for(i = 0; i < tempToAppend.length; i++) {
          tempToAppend[i].result = false;
        }
      }
      
      spliceArgs = [subExpressionPos, 1].concat(tempToAppend);
      Array.prototype.splice.apply(tempAppendInfo, spliceArgs);
      
      return tempAppendInfo;
    };
    
    var expandedTruePaths = Utils.cloneDeep(this.truePaths),
        i, j, k, kMax, subTruePaths, tempTruePath;
    
    // Iterate through the first truePath, as a template of the conditions and sub-expressions.
    // Step through it backwards so expanded paths will not throw off the upcoming indicies.
    for(i = this.truePaths[0].length - 1; i >= 0; i--) {
      if(this.truePaths[0][i].condition instanceof Expression) {
        subTruePaths = this.truePaths[0][i].condition.expandTruePaths();
        
        // Cross-apply the child true paths to the one for this Expression
        for(k = expandedTruePaths.length - 1; k >= 0; k--) {
          
          if(expandedTruePaths[k][i].result === false) {
            // If the sub-expression doesn't need to be true, then we can replace it with a single entry where all conditions are false
            tempTruePath = replaceSubExpressionWithTruePath(expandedTruePaths[k], subTruePaths[0], i);
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