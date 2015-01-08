// TODO: The ability to flip a condition from == to != or vice versa to make it easier to understand.  Don't alter the input.

define(function(require, exports, module) {
  'use strict';
  
  var $ = require('jquery'),
      Expression = require('expression'),
      Submission = require('submission');
  
  function printHeadings(/*Expression*/ expression, newDepth) {
    var headings = '',
      depth = newDepth || 0,
      i, headingClass, operatorClass;
    for(i = 0; i < expression.conditions.length; i++) {
      if(expression.conditions[i] instanceof Expression) {
        // Recursively print sub-expressions
        headings += printHeadings(expression.conditions[i], depth + 1);
      } else {
        headingClass = 'condition depth-' + ((depth % 4) + 1);
        if(i === 0) { headingClass += ' begin-expression'; }
        if(i === expression.conditions.length - 1) { headingClass += ' end-expression'; }
        headings += '<th class="' + headingClass + '">' + expression.conditions[i] + '<\/th>';
      }
      
      // Print the operator
      if(i < expression.operators.length) {
        operatorClass = 'operator depth-' + ((depth % 4) + 1);
        headings += '<th class="' + operatorClass + '">' + expression.operators[i] + '<\/th>';
      }
    }
    return headings;
  }
  
  function printCells(/*Expression*/ expression, newDepth) {
    var cells = '',
        depth = newDepth || 0,
        expandedTruePaths = expression.expandTruePaths(),
        i, j, cellClass, operatorClass;
    for(i = 0; i < expandedTruePaths.length; i++) {
      cells += '<tr>';
      for(j = 0; j < expandedTruePaths[i].length; j++) {
        if(j !== 0) { cells += '<td class="operator">&nbsp;<\/td>'; } // 
        cells += '<td class="condition">' + (expandedTruePaths[i][j].result ? 'true' : '') + '<\/td>';
      }
      cells += '<\/tr>';
    }
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
  });

});