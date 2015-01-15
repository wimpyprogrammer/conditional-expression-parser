define(function(require, exports, module) {
  'use strict';
  
  var Utils = require('utils'),
      Expression = require('expression');
  
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
  
  /**
   * @param conditions  An array of Condition and Expression objects
   * @param treeType  True to solve the true paths; False to solve the false paths
   */
  function EvalTree(/*Expression*/ expression, _treeType) {
    var self = this,
        treeType = Boolean(_treeType);
    self.evalPaths = [/*{ condition, result }*/];
  
    // Calculate the combinations of Conditions that will resolve to true
    if(!expression.hasMixedOperators) { // TODO: Can we calculate when operators are mixed?
      if(expression.conditions.length === 1) {
        // There's only one condition, so it must match treeType
        self.evalPaths.push([{ condition: expression.conditions[0], result: treeType }]);
      } else {
        
        if(expression.operators[0].isAnd()) {
          
          if(treeType === true) {
            // Create one evalPath where every condition is true
            self.evalPaths = generateEvalPathsUniformResult(expression.conditions, true);
          } else {
            // Create a separate falsePath for each Condition where one is false
            self.evalPaths = generateEvalPathsIndividualResult(expression.conditions, false);
          }
          
        } else if(expression.operators[0].isOr()) {
          
          if(treeType === true) {
            // Create a separate evalPath for each Condition where one is true
            self.evalPaths = generateEvalPathsIndividualResult(expression.conditions, true);
          } else {
            // Create one falsePath where every condition is false
            self.evalPaths = generateEvalPathsUniformResult(expression.conditions, false);
          }
          
        } else { // XOR operator
          
          // A XOR expression is true if it has an odd number of true conditions
          var isTrueCondition = function(c) { return c.result; },
              hasOddTrues = function(ep) {
                return ep.filter(isTrueCondition).length % 2 === 1;
              },
              allEvalPaths = calculateAllEvalPaths(expression.conditions);
          
          allEvalPaths.forEach(function(evalPath) {
            if(hasOddTrues(evalPath) ^ treeType === false) {
              self.evalPaths.push(evalPath);
            }
          });
          
        }
      }
    }
    
    return self;
  }
    
  EvalTree.prototype.expand = function() {
    var self = this;
      
    var replaceSubExpressionWithEvalPath = function(appendInto, toAppend, subExpressionPos) {
      // Create a copy of the object so that modifications will not leak in or out by reference
      var tempAppendInto = Utils.cloneDeep(appendInto),
          spliceArgs = [subExpressionPos, 1].concat(toAppend);
      Array.prototype.splice.apply(tempAppendInto, spliceArgs);
      
      return tempAppendInto;
    };
    
    var expandedEvalPaths = Utils.cloneDeep(self.evalPaths),
        i, k, subEvalPaths, nullSubEvalPath, tempEvalPath;
    
    // Iterate through the first evalPath, as a template of the conditions and sub-expressions.
    // Step through it backwards so expanded paths will not throw off the upcoming indicies.
    for(i = self.evalPaths[0].length - 1; i >= 0; i--) {
      if(self.evalPaths[0][i].condition instanceof Expression.Expression) {
        for(k = expandedEvalPaths.length - 1; k >= 0; k--) {
          
          if(expandedEvalPaths[k][i].result === null) {
            
            // Start with the expanded truePaths as a template for all of the Conditions
            subEvalPaths = self.evalPaths[0][i].condition.truePaths.expand();
            // Create a single evalPath where all conditions are null
            nullSubEvalPath = Utils.cloneDeep(subEvalPaths[0]);
            nullSubEvalPath.forEach(function(e) { e.result = null; } );
            // Insert these conditions once, no matter how many true paths the sub-Expression contains
            tempEvalPath = replaceSubExpressionWithEvalPath(expandedEvalPaths[k], nullSubEvalPath, i);
            // Append the new true path after the existing one. Because k counts down, it won't be processed.
            expandedEvalPaths.splice(k + 1, 0, tempEvalPath);
            
          } else {
            
            // Cross-apply the child eval paths to the one for this Expression
            // Retrieve the Expression's truePaths or falsePaths, depending on how the Expression should evaluate
            subEvalPaths = expandedEvalPaths[k][i].condition.getEvalPaths(expandedEvalPaths[k][i].result).expand();
            // Insert the expanded conditions
            subEvalPaths.forEach(function(e) {
              // Update this eval path to replace the sub-expression with its expanded conditions
              tempEvalPath = replaceSubExpressionWithEvalPath(expandedEvalPaths[k], e, i);
              // Append the new eval path after the existing one. Because k counts down, it won't be processed.
              expandedEvalPaths.splice(k + 1, 0, tempEvalPath);
            });
            
          }
          
          // Remove the sub-expression, now that it's been replaced above by the expansion(s)
          expandedEvalPaths.splice(k, 1);
          
        }
      }
    }
    
    return expandedEvalPaths;
  };
  
  exports.EvalTree = EvalTree;

});