// TODO: The ability to flip a condition from == to != or vice versa to make it easier to understand.  Don't alter the input.

define(function(require, exports, module) {
  'use strict';
  
  // load global polyfills
  require('polyfills');
  
  var $ = require('jquery'),
      Expression = require('expression'),
      Submission = require('submission'),
      Tutorial = require('tutorial');
  
  function trackEvent(category, action, label, value, _isInteractive) {
    var dataLayer = window.dataLayer || [],
        isInteractive = (_isInteractive === undefined) ? true : _isInteractive;
    dataLayer.push({
      'event': 'event',
      'eventCategory': 'Conditional - ' + category,
      'eventAction': action,
      'eventLabel': label,
      'eventValue': value,
      'isNonInteractive': !Boolean(isInteractive)
    });
  }
  
  function trackEventTutorialStart(stepNum) {
    trackEvent('Tutorial', 'Start', 'Step ' + stepNum);
  }
  
  function trackEventTutorialEnd(stepNum) {
    trackEvent('Tutorial', 'End', 'Step ' + stepNum);
  }
  
  function trackEventTutorialNext(prevStep, nextStep) {
    trackEvent('Tutorial', 'Next', 'Step ' + prevStep + ' to ' + nextStep);
  }
  
  function trackEventTutorialPrev(prevStep, nextStep) {
    trackEvent('Tutorial', 'Prev', 'Step ' + prevStep + ' to ' + nextStep);
  }
  
  function trackEventInputMixedOperators() {
    trackEvent('Parse', 'Mixed Operators');
  }
  
  function trackEventInputParse() {
    trackEvent('Parse', 'Success');
  }
  
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
        $submit = $('.js-submit'),
        $inputForm = $('.js-input-form'),
        $introText = $('.js-intro-text'),
        $alertMixedOperators = $('.js-alert-mixed-operators'),
        $resultTable = $('.js-result-table'),
        $startTutorial = $('.js-tutorial-start'),
        lastTutorialStepNum = null;
    
    function processInput(trackEvents) {
      var input = $input.val(),
          expression, columnClasses;
      
      $introText.removeClass('hidden');
      $inputForm.removeClass('has-error');
      $alertMixedOperators.addClass('hidden');
      $resultTable.addClass('hidden');
      
      if(input.trim() !== '') {
        
        $introText.addClass('hidden');
      
        expression = (new Submission.Submission(input)).expression;
        columnClasses = calculateColumnClasses(expression);
        
        if(expression.hasMixedOperatorsDeep()) {
          $inputForm.addClass('has-error');
          $alertMixedOperators.removeClass('hidden');
          
          if(trackEvents) { trackEventInputMixedOperators(); }
        } else {
          
          $resultTable.removeClass('hidden');
          $resultTable.find('thead').html(
            '<tr>' + printHeadings(expression, columnClasses) + '<\/tr>'
          );
          $resultTable.find('tbody').html(
            printCells(expression, columnClasses)
          );
          
          if(trackEvents) { trackEventInputParse(); }
          
        }
        
      }
    }
    
    $submit.on('click keypress', function() {
      processInput(true);
    });
    
    $input.on('tutorial.change', function() {
      processInput(false);
    });
    
    $startTutorial.click(function() {
      var thisStepNum = function(tour) { return tour.getCurrentStep() + 1; },
          userInput;
      
      var tutorial = new Tutorial.Tutorial({
        onShow: function() {
          // onStart does not fire if the user has previously seen the tutorial,
          // so detect the start using onShow
          if(lastTutorialStepNum === null) {
            userInput = $input.val();
            $input.val('').trigger('tutorial.change');
          }
        },
        onShown: function(tour) {
          // the step number is only accurate in onShown, not onShow
          if(lastTutorialStepNum === null) {
            trackEventTutorialStart(thisStepNum(tour));
          } else {
            if(lastTutorialStepNum < thisStepNum(tour)) {
              trackEventTutorialNext(lastTutorialStepNum, thisStepNum(tour));
            } else {
              trackEventTutorialPrev(lastTutorialStepNum, thisStepNum(tour));
            }
          }
          
          lastTutorialStepNum = thisStepNum(tour);
        },
        onEnd: function(tour) {
          lastTutorialStepNum = null;
          $input.val(userInput).trigger('tutorial.change');
          trackEventTutorialEnd(thisStepNum(tour));
        }
      });
      
      tutorial.start(true);
    });
    
  });

});