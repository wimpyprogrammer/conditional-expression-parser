// TODO: The ability to flip a condition from == to != or vice versa to make it easier to understand.  Don't alter the input.

define(function(require, exports, module) {
  'use strict';
  
  // load global polyfills
  require('polyfills');
  
  var $ = require('jquery'),
      Expression = require('expression'),
      Submission = require('submission'),
      Tutorial = require('tutorial');
  
  function calculateColumnClasses(/*Expression*/ expression, newDepth) {
    var columnClasses = [],
        depth = newDepth || 0,
        columnClass;
    
    expression.conditions.forEach(function(e, i, arr) {
      
      if(e instanceof Expression.Expression) {
        // Recursively add column classes
        columnClasses = columnClasses.concat(calculateColumnClasses(e, depth + 1));
      } else {
        // Add the condition class
        columnClass = 'condition depth-' + ((depth % 6) + 1);
        if(i === 0) { columnClass += ' begin-expression'; }
        if(i === arr.length - 1) { columnClass += ' end-expression'; }
        columnClasses.push(columnClass);
      }
      
      // Add the operator class
      if(i < expression.operators.length) {
        columnClass = 'operator depth-' + ((depth % 6) + 1);
        columnClasses.push(columnClass);
      }
      
    });
    
    return columnClasses;
  }
  
  function printHeadings(/*Expression*/ expression, columnClasses, _startingColumn) {
    var headings = [],
        startingColumn = _startingColumn || 0,
        columnClass;
    
    expression.conditions.forEach(function(e, i, arr) {
      
      if(e instanceof Expression.Expression) {
        // Recursively print sub-expressions
        headings.push(printHeadings(e, columnClasses, startingColumn + headings.length));
      } else {
        columnClass = columnClasses[startingColumn + headings.length];
        headings.push('<th class="' + columnClass + '">' + e + '<\/th>');
      }
      
      // Print the operator
      if(i < expression.operators.length) {
        columnClass = columnClasses[startingColumn + headings.length];
        headings.push('<th class="' + columnClass + '">' + expression.operators[i] + '<\/th>');
      }
      
    });
    
    return headings.join('\r\n');
  }
  
  function printCells(/*Expression*/ expression, columnClasses) {
    var rows = [],
        expandedTruePaths = expression.truePaths.expand(),
        cells, displayValue;
    
    expandedTruePaths.forEach(function(expandedTruePath) {
      
      cells = [];
      expandedTruePath.forEach(function(truePathCondition, i) {
        if(i !== 0) {
          cells.push('<td class="' + columnClasses[cells.length] + '">&nbsp;<\/td>');
        }
        
        displayValue = (truePathCondition.result === null) ? '' : truePathCondition.result;
        cells.push('<td class="' + columnClasses[cells.length] + '">' + displayValue + '<\/td>');
      });
      rows.push(cells);
      
    });
    
    // Condense the arrays in an HTML string
    return rows.reduce(function(html, cells) {
      return html + '<tr>' + cells.join('\r\n') + '<\/tr>';
    }, '');
  }

  $(function() {
    var $input = $('#input'),
        $alertMixedOperators = $('.js-alert-mixed-operators'),
        $truthTable = $('.js-truth-table'),
        $startTutorial = $('.js-tutorial-start');
    
    $input.change(function() {
      var input = $input.val(),
          expression, columnClasses;
      
      $alertMixedOperators.addClass('hide');
      $truthTable.addClass('hide');
      
      if(input.trim() !== '') {
      
        expression = (new Submission.Submission(input)).expression;
        columnClasses = calculateColumnClasses(expression);
        
        if(expression.hasMixedOperatorsDeep()) {
          $alertMixedOperators.removeClass('hide');
        } else {
          
          $truthTable.removeClass('hide');
          $truthTable.find('thead').html(
            '<tr>' + printHeadings(expression, columnClasses) + '<\/tr>'
          );
          $truthTable.find('tbody').html(
            printCells(expression, columnClasses)
          );
          
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