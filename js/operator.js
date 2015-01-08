define(function(require, exports, module) {
  'use strict';
  
  function Operator(isAnd) {
    this._isAnd = Boolean(isAnd);
    
    return this;
  }
  
  Operator.prototype.toString = function() {
    return this.isAnd() ? 'AND' : 'OR';
  };
  
  Operator.prototype.isAnd = function() {
    return this._isAnd;
  };
  
  Operator.prototype.isOr = function() {
    return !this._isAnd;
  };
  
  return Operator;

});