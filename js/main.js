// TODO: The ability to flip a condition from == to != or vice versa to make it easier to understand.  Don't alter the input.

define(function(require, exports, module) {
  'use strict';
  
  // load global polyfills
  require('polyfills');
  
  var $ = require('jquery'),
      Expression = require('expression'),
      Submission = require('submission');
  
  function printHeadings(/*Expression*/ expression, newDepth) {
    var headings = '',
      depth = newDepth || 0,
      headingClass, operatorClass;
    
    expression.conditions.forEach(function(e, i, arr) {
      if(e instanceof Expression) {
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
  
  function printCells(/*Expression*/ expression, newDepth) {
    var cells = '',
        depth = newDepth || 0,
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
        $output = $('#output'),
        $example1 = $('#example1'),
        $example2 = $('#example2'),
        $example3 = $('#example3'),
        $example4 = $('#example4'),
        $example5 = $('#example5'),
        $example6 = $('#example6');
    
    $input.change(function() {
      var expression = (new Submission($input.val())).expression;
      
      var output = '<table>' +
          '<thead><tr>' + printHeadings(expression) + '<\/tr><\/thead>' +
          '<tbody>' + printCells(expression) + '<\/tbody>' +
          '<\/table>';
      
      $output.html(output);
    });
    
    $example1.click(function() {
      $input.val(
        '!HasGenerousDeadlinePassed && Active && SelectedPaymentPortalInfo.Portal != PaymentPortal.NoPortal ' + "\r\n" +
        '&& ( !IsPayPalPortalInUse || (PayPalAccountType != "CannotValidate" && !String.IsNullOrWhiteSpace(PayPalAccountType)));'
      ).change();
    });
    
    $example2.click(function() {
      $input.val(
        '!HasGenerousDeadlinePassed && Active && SelectedPaymentPortalInfo.Portal != PaymentPortal.NoPortal ' + "\r\n" +
        '&& ( !IsPayPalPortalInUse && (PayPalAccountType != "CannotValidate" && !String.IsNullOrWhiteSpace(PayPalAccountType)));'
      ).change();
    });
    
    $example3.click(function() {
      $input.val(
        'if (PaymentPortalInUse == PaymentPortal.PayPal.GetHashCode() || (!PaymentPortalInUse.HasValue || !WePayPortalInUse || !String.IsNullOrWhiteSpace(PayPalID)))' + "\r\n"
      ).change();
    });
    
    $example4.click(function() {
      $input.val(
        'if (PaymentPortalInUse == PaymentPortal.PayPal.GetHashCode() || (!PaymentPortalInUse.HasValue && !WePayPortalInUse && !String.IsNullOrWhiteSpace(PayPalID)))' + "\r\n"
      ).change();
    });
    
    $example5.click(function() {
      $input.val(
        'if (a || (b && c) )' + "\r\n"
      ).change();
    });
    
    $example6.click(function() {
      $input.val(
        'a ^ b'
      ).change();
    });
  });

});