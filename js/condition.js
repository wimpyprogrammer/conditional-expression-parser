define(function(require, exports, module) {
  'use strict';

  function Condition(text) {
    this.text = text;
    
    return this;
  }
  
  Condition.prototype.toString = function() {
    return this.text;
  };
  
  exports.Condition = Condition;

});