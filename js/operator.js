define(function(require, exports, module) {
  'use strict';
  
  function Operator(type) {
    
    switch(type.toString().toUpperCase()) {
      case Operator.TYPE_AND:
      default:
        this._type = Operator.TYPE_AND;
        break;
      case Operator.TYPE_OR:
        this._type = Operator.TYPE_OR;
        break;
      case Operator.TYPE_XOR:
        this._type = Operator.TYPE_XOR;
        break;
    }
    
    return this;
  }
  
  Object.defineProperty(Operator, "TYPE_AND", {
    enumerable: false,
    configurable: false,
    writable: false,
    value: 'AND'
  });
  
  Object.defineProperty(Operator, "TYPE_OR", {
    enumerable: false,
    configurable: false,
    writable: false,
    value: 'OR'
  });
  
  Object.defineProperty(Operator, "TYPE_XOR", {
    enumerable: false,
    configurable: false,
    writable: false,
    value: 'XOR'
  });
  
  Operator.prototype.toString = function() {
    return this._type;
  };
  
  Operator.prototype.isAnd = function() {
    return this._type === Operator.TYPE_AND;
  };
  
  Operator.prototype.isOr = function() {
    return this._type === Operator.TYPE_OR;
  };
  
  Operator.prototype.isXor = function() {
    return this._type === Operator.TYPE_XOR;
  };
  
  exports.Operator = Operator;

});