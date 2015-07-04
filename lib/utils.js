'use strict';
exports.typeOf = function(obj) {
  var classToType;
  if (obj === void 0 || obj === null) {
    return String(obj);
  }
  classToType = {
    '[object Boolean]': 'boolean',
    '[object Number]': 'number',
    '[object String]': 'string',
    '[object Function]': 'function',
    '[object Array]': 'array',
    '[object Date]': 'date',
    '[object RegExp]': 'regexp',
    '[object Object]': 'object'
  };
  return classToType[Object.prototype.toString.call(obj)];
};
