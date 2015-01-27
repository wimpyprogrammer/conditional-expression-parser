define(function(require, exports, module) {
  'use strict';
  
  var $ = require('jquery'),
      Tour = require('tour'),
      $input = $('.js-tutorial-input');
  
  function Tutorial(_options) {
    var resetInput = function() {
      return $input.val('').change();
    };
    
    var example1 = 'if( A || B ) {',
        example2 = 'A || ( B && C("true && false") && ( D(this.isOpen() && this.isFree) || E )) || F',
        example3 = 'A || ( B ^ (C && D) )',
        options = {
      backdrop: true,
      backdropPadding: 1,
      steps: [
        {
          orphan: true,
          content: 'Welcome to the Conditional Expression Parser.<br><br>Use your keyboard or the buttons below to navigate this brief tutorial.'
        },{
          onShow: function() {
            if(_options.onShow) { _options.onShow(); }
            resetInput();
          },
          element: '.js-tutorial-input',
          placement: 'bottom',
          title: 'The Input Box',
          content: 'This textbox is where you\'ll enter the conditional expression you want to analyze.'
        },{
          onShow: function() {
            if(_options.onShow) { _options.onShow(); }
            resetInput().val(example1);
          },
          element: '.js-tutorial-input',
          placement: 'bottom',
          title: 'A Simple Input',
          content: 'Let\'s begin with a simple example: two conditions, A and B, separated by an OR operator.<br><br>Notice that some syntax like the "if" statement and the opening bracket are included. They are unnecessary and will be ignored.'
        },{
          onShow: function() {
            if(_options.onShow) { _options.onShow(); }
            resetInput().val(example1).change();
          },
          element: '.js-truth-table',
          placement: 'bottom',
          title: 'A Simple Output',
          content: 'The parser will generate a "truth table" showing all of the code paths in which the expression will evaluate to TRUE.  Our simple example has simple results.'
        },{
          onShow: function() {
            if(_options.onShow) { _options.onShow(); }
            resetInput().val(example2);
          },
          element: '.js-tutorial-input',
          placement: 'bottom',
          title: 'A Complex Input',
          content: 'If your conditional expressions were so simple, you wouldn\'t need this tool!<br><br>Let\'s try something harder with sub-expressions, function calls, strings, and varied operators.'
        },{
          onShow: function() {
            if(_options.onShow) { _options.onShow(); }
            resetInput().val(example2).change();
          },
          element: '.js-truth-table',
          placement: 'bottom',
          title: 'A Complex Output',
          content: 'Now our truth table is much larger. The different colored columns are used to group conditions within the same expression depth.<br><br>Notice that function parameters and strings are grouped into a single expression even if they look like conditional expressions.'
        },{
          onShow: function() {
            if(_options.onShow) { _options.onShow(); }
            resetInput().val(example3);
          },
          element: '.js-tutorial-input',
          placement: 'bottom',
          title: 'The XOR Operator',
          content: 'Lastly we\'ll look at the XOR operator. Unlike the OR operator, the XOR operator requires that one or more conditions is FALSE for the overall expression to be TRUE.'
        },{
          onShow: function() {
            if(_options.onShow) { _options.onShow(); }
            resetInput().val(example3).change();
          },
          element: '.js-truth-table',
          placement: 'bottom',
          title: 'Required "FALSE"',
          content: 'Now the truth table contains true, blank, and false cells.<br><br>A <strong>blank</strong> cell indicates that the expression will be TRUE whether that condition is TRUE or FALSE.<br><br>A <strong>false</strong> cell indicates that the condition must be FALSE for the expression to be TRUE.'
        }
      ]
    };
    
    var self = new Tour($.extend(_options, options));
    
    self.init(true);
    
    return self;
  }
  
  exports.Tutorial = Tutorial;

});