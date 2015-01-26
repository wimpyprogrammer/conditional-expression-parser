// TODO: The ability to flip a condition from == to != or vice versa to make it easier to understand.  Don't alter the input.

define(function(require, exports, module) {
  'use strict';
  
  // load global polyfills
  require('polyfills');
  
  var $ = require('jquery'),
      Expression = require('expression'),
      Submission = require('submission'),
      Tutorial = require('tutorial');
  
  function printHeadings(/*Expression*/ expression, newDepth) {
    var headings = '',
        depth = newDepth || 0,
        headingClass, operatorClass;
    
    expression.conditions.forEach(function(e, i, arr) {
      if(e instanceof Expression.Expression) {
        // Recursively print sub-expressions
        headings += printHeadings(e, depth + 1);
      } else {
        headingClass = 'condition depth-' + ((depth % 4) + 1);
        if(i === 0) { headingClass += ' begin-expression'; }
        if(i === arr.length - 1) { headingClass += ' end-expression'; }
        headings += '<th class="' + headingClass + '">' + e + '<\/th>';
      }
      
      // Print the operator
      if(i < expression.operators.length) {
        operatorClass = 'operator depth-' + ((depth % 4) + 1);
        headings += '<th class="' + operatorClass + '">' + expression.operators[i] + '<\/th>';
      }
    });
    return headings;
  }
  
  function printCells(/*Expression*/ expression) {
    var cells = '',
        expandedTruePaths = expression.truePaths.expand(),
        displayValue;
    
    expandedTruePaths.forEach(function(expandedTruePath) {
      cells += '<tr>';
      expandedTruePath.forEach(function(truePathCondition, i) {
        if(i !== 0) { cells += '<td class="operator">&nbsp;<\/td>'; }
        displayValue = (truePathCondition.result === null) ? '' : truePathCondition.result;
        cells += '<td class="condition">' + displayValue + '<\/td>';
      });
      cells += '<\/tr>';
    });
    
    return cells;
  }

  $(function() {
    var $input = $('#input'),
        $alertMixedOperators = $('.js-alert-mixed-operators'),
        $truthTable = $('.js-truth-table'),
        $startTutorial = $('.js-tutorial-start');
    
    $input.change(function() {
      var input = $input.val(),
          expression, output;
      
      $alertMixedOperators.addClass('hide');
      $truthTable.addClass('hide');
      
      if(input.trim() !== '') {
      
        expression = (new Submission.Submission(input)).expression;
        
        if(expression.hasMixedOperatorsDeep()) {
          $alertMixedOperators.removeClass('hide');
        } else {
          
          $truthTable.removeClass('hide');
          $truthTable.find('thead').html('<tr>' + printHeadings(expression) + '<\/tr>');
          $truthTable.find('tbody').html(printCells(expression));
          
        }
        
      }
    });
    
    $startTutorial.click(function() {
      var hasStarted = false,
          userInput;
      
      var tutorial = new Tutorial.Tutorial({
        onShow: function() {
          // onStart does not fire if the user has previously seen the tutorial
          if(!hasStarted) {
            hasStarted = true;
            userInput = $input.val();
            $input.val('').change();
          }
          $input.change();
        },
        onEnd: function() {
          hasStarted = false;
          $input.val(userInput).change();
        }
      });
      
      tutorial.start(true);
    });
    
  });

});