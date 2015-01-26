define(function(require, exports, module) {
  'use strict';
  
  var lodash = require('lodash');
  
  // Regex classes
  exports.tokensLineBreak = [ '\\r', '\\n', '\\r\\n' ];
  exports.tokensAnd = [ '&&', '\\sAND\\s' ]; // "&&" or "AND"
  exports.tokensOr = [ '\\|\\|', '\\sOR\\s' ]; // "||" or "OR"
  exports.tokensXor = [ '\\^', '\\sXOR\\s' ]; // "^" or "XOR"
  exports.tokensAndOrXor = [].concat(exports.tokensAnd, exports.tokensOr, exports.tokensXor);
  
  exports.tokensIgnoreLeading = [ '\\s', 'if', 'else', 'elseif', '\\}' ];
  exports.tokensIgnoreTrailing = [ '\\s', '\\{', ';' ];
  
  function isEscaped(string, index) {
    return (index > 0 && string[index - 1] === '\\' && !isEscaped(string, index - 1));
  }
  
  function isFunctionCall(string, index) {
    // To determine if the parenthesis is a sub-expression or a function call, look at the preceding characters
    var precedingCharacters = string.substring(0, index + 1),
        matchConditional = new RegExp(
          '(?:^|' + exports.tokensAndOrXor.join('|') + ')\\s*\\($'
        , 'i');
    return !matchConditional.test(precedingCharacters);
  }
  
  exports.findTopLevelParenthesis = function(string) {
    var inSingleQuote = false,
      inDoubleQuote = false,
      conditionalDepth = 0,
      functionCallDepth = 0,
      parenthesisPairs = [/*{ start, end }*/],
      i, iParenthesisStart;
    
    for(i = 0; i < string.length; i++) {
      // If the character is escaped, don't mistake it as syntax
      if(isEscaped(string, i)) { continue; }
      
      if(inSingleQuote && string[i] === "'") { // found the closing single quote
        inSingleQuote = false;
      } else if(inDoubleQuote && string[i] === '"') { // found the closing double quote
        inDoubleQuote = false;
      } else if(string[i] === "'") { // found an opening single quote
        inSingleQuote = true;
      } else if(string[i] === '"') { // found an opening double quote
        inDoubleQuote = true;
      } else if(string[i] === ')') { // found a closing parenthesis
        if(functionCallDepth > 0) { // ignore parenthesis within a function call
          functionCallDepth--;
        } else {
          conditionalDepth--;
          if(conditionalDepth === 0) { // found a top-level parenthesis
            parenthesisPairs.push({ start: iParenthesisStart, end: i });
          }
        }
      } else if(string[i] === '(') { // found an opening parenthesis
        if(functionCallDepth > 0 || isFunctionCall(string, i)) { // ignore parenthesis to start or within a function call
          functionCallDepth++;
        } else {
          if(conditionalDepth === 0) { // found top-level parenthesis
            iParenthesisStart = i;
          }
          conditionalDepth++;
        }
      }
    }
    
    return parenthesisPairs;
  };
  
  // Replace one substring with another. From http://stackoverflow.com/a/21350614.
  function stringSplice(str, index, count, add) {
    return str.slice(0, index) + add + str.slice(index + count);
  }
  
  exports.restoreIgnoredText = function(string, ignoredText) {
    var captureIgnoredTextPlaceholder = new RegExp(
      '(\\{(\\d+)\\})' // capture curly braces and the digits inside
    , 'ig'), matches, replacementText;
    
    while(matches = captureIgnoredTextPlaceholder.exec(string)) {
      replacementText = ignoredText[matches[2]];
      // Swap the placeholder text {#} with the referenced text in ignoredText.
      string = stringSplice(string, matches.index, matches[1].length, replacementText);
      captureIgnoredTextPlaceholder.lastIndex -= matches[0].length;
    }
    
    return string;
  };
  
  exports.removeIgnoredText = function(string) {
    var inSingleQuote = false,
        inDoubleQuote = false,
        conditionalDepth = 0,
        functionCallDepth = 0,
        ignoredText = [],
        i, iSingleQuoteStart, iDoubleQuoteStart, iFunctionCallStart;
    
    var captureIgnoredText = function(iStart, iEnd) {
      var strToRemove = string.substring(iStart, iEnd + 1);
      ignoredText.push(strToRemove);
      var strToInsert = '{' + (ignoredText.length - 1) + '}';
      // Adjust i to the end of the inserted string instead of the removed one
      i += strToInsert.length - strToRemove.length;
      return stringSplice(string, iStart, iEnd - iStart + 1, strToInsert);
    };
    
    for(i = 0; i < string.length; i++) {
      // If the character is escaped, don't mistake it as syntax
      if(isEscaped(string, i)) { continue; }
      
      if(string[i] === '{' || string[i] === '}') {
        string = captureIgnoredText(i, i); // capture curly braces so they don't interfere with our placeholder syntax
      } else if(inSingleQuote && string[i] === "'") { // found the closing single quote
        inSingleQuote = false;
        string = captureIgnoredText(iSingleQuoteStart, i); // ignore contents of single-quoted strings
      } else if(inDoubleQuote && string[i] === '"') { // found the closing double quote
        inDoubleQuote = false;
        string = captureIgnoredText(iDoubleQuoteStart, i); // ignore contents of double-quoted strings
      } else if(string[i] === "'") { // found an opening single quote
        inSingleQuote = true;
        iSingleQuoteStart = i;
      } else if(string[i] === '"') { // found an opening double quote
        inDoubleQuote = true;
        iDoubleQuoteStart = i;
      } else if(string[i] === ')') { // found a closing parenthesis
        if(functionCallDepth > 0) { // ignore parenthesis within a function call
          functionCallDepth--;
          if(functionCallDepth === 0) { // found the end of a function call
            string = captureIgnoredText(iFunctionCallStart, i); // ignore contents of function calls
          }
        }
      } else if(string[i] === '(') { // found an opening parenthesis
        if(functionCallDepth > 0 || isFunctionCall(string, i)) { // ignore parenthesis to start or within a function call
          if(functionCallDepth === 0) {
            iFunctionCallStart = i;
          }
          functionCallDepth++;
        }
      }
    }
    
    return [string, ignoredText];
  };
  
  exports.trimParenthesisPairs = function(string) {
    var process = function(input) {
      input = input.trim();
      if(input[0] === '(' && input[input.length - 1] === ')') {
        input = input.substring(1, input.length - 1);
      }
      return input;
    };
    
    var processedString = process(string);
    
    // Continue removing parenthesis pairs until no more remain.
    while(string !== processedString) {
      string = processedString;
      processedString = process(string);
    }
    
    return string;
  };
  
  exports.hasMixedOperators = function(operators) {
    var preceedingConditionMismatch = function(e, i, arr) {
      return (i > 0 && (e.toString() !== arr[i - 1].toString()));
    };
    return (operators.length > 1 && operators.some(preceedingConditionMismatch));
  };
  
  function isCustomObject(o) {
    return !(lodash.isPlainObject(o) || !lodash.isObject(o) || 
             lodash.isArray(o) || lodash.isBoolean(o) ||
             lodash.isDate(o) || lodash.isElement(o) ||
             lodash.isFunction(o) || lodash.isRegExp(o) ||
             lodash.isString(o) || lodash.isNumber(o));
  }
  
  exports.cloneDeep = function(value) {
    var cloneCallback = function(valueToClone) {
      if(!isCustomObject(valueToClone)) {
          // Allow lodash to handle native clones
          return;
      }
      
      // For custom objects, handle the clone manually so the prototype is properly set
      return Object.create(valueToClone);
    };
    
    return lodash.cloneDeep(value, cloneCallback);
  };
  
});