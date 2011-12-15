(function() {

  /*
  CoffeeLint
  
  Copyright (c) 2011 Matthew Perpick.
  CoffeeLint is freely distributable under the MIT license.
  */

  var CoffeeScript, DEFAULT_CONFIG, LexicalLinter, LineLinter, RULES, coffeelint, createError, defaults, extend, regexes;
  var __slice = Array.prototype.slice;

  coffeelint = {};

  if (typeof exports !== "undefined" && exports !== null) {
    coffeelint = exports;
    CoffeeScript = require('coffee-script');
  } else {
    this.coffeelint = coffeelint;
    CoffeeScript = this.CoffeeScript;
  }

  coffeelint.VERSION = "0.0.4";

  RULES = {
    no_tabs: {
      message: 'Line contains tab indentation'
    },
    no_trailing_whitespace: {
      message: 'Line ends with trailing whitespace'
    },
    max_line_length: {
      message: 'Line exceeds maximum allowed length'
    },
    camel_case_classes: {
      message: 'Class names should be camel cased'
    },
    indentation: {
      message: 'Line contains inconsistent indentation'
    },
    no_implicit_braces: {
      message: 'Implicit braces are forbidden'
    },
    no_trailing_semicolons: {
      message: 'Line contains a trailing semicolon'
    }
  };

  DEFAULT_CONFIG = {
    tabs: false,
    trailing: false,
    lineLength: 80,
    indent: 2,
    camelCaseClasses: true,
    trailingSemicolons: false,
    implicitBraces: false
  };

  regexes = {
    trailingWhitespace: /\s+$/,
    indentation: /\S/,
    camelCase: /^[A-Z][a-zA-Z\d]*$/,
    trailingSemicolon: /;$/
  };

  extend = function() {
    var destination, k, source, sources, v, _i, _len;
    destination = arguments[0], sources = 2 <= arguments.length ? __slice.call(arguments, 1) : [];
    for (_i = 0, _len = sources.length; _i < _len; _i++) {
      source = sources[_i];
      for (k in source) {
        v = source[k];
        destination[k] = v;
      }
    }
    return destination;
  };

  defaults = function(source, defaults) {
    return extend({}, defaults, source);
  };

  createError = function(rule, attrs) {
    if (attrs == null) attrs = {};
    attrs.rule = rule;
    return defaults(attrs, RULES[rule]);
  };

  LineLinter = (function() {

    function LineLinter(source, config, tokensByLine) {
      this.source = source;
      this.config = config;
      this.line = null;
      this.lineNumber = 0;
      this.tokensByLine = tokensByLine;
    }

    LineLinter.prototype.lint = function() {
      var error, errors, line, lineNumber, _len, _ref;
      errors = [];
      _ref = this.source.split('\n');
      for (lineNumber = 0, _len = _ref.length; lineNumber < _len; lineNumber++) {
        line = _ref[lineNumber];
        this.lineNumber = lineNumber;
        this.line = line;
        error = this.lintLine();
        if (error) errors.push(error);
      }
      return errors;
    };

    LineLinter.prototype.lintLine = function() {
      return this.checkTabs() || this.checkTrailingWhitespace() || this.checkLineLength() || this.checkTrailingSemicolon();
    };

    LineLinter.prototype.checkTabs = function() {
      var indent;
      if (this.config.tabs) return null;
      indent = this.line.split(regexes.indentation)[0];
      if (this.lineHasToken() && ~indent.indexOf('\t')) {
        return this.createLineError('no_tabs');
      } else {
        return null;
      }
    };

    LineLinter.prototype.checkTrailingWhitespace = function() {
      if (!this.config.trailing && regexes.trailingWhitespace.test(this.line)) {
        return this.createLineError('no_trailing_whitespace');
      } else {
        return null;
      }
    };

    LineLinter.prototype.checkLineLength = function() {
      var max;
      max = this.config.lineLength;
      if (max && max < this.line.length) {
        return this.createLineError('max_line_length');
      } else {
        return null;
      }
    };

    LineLinter.prototype.checkTrailingSemicolon = function() {
      var first, hasNewLine, hasSemicolon, last, _i, _ref;
      if (this.config.trailingSemiColons) return null;
      hasSemicolon = regexes.trailingSemicolon.test(this.line);
      _ref = this.getLineTokens(), first = 2 <= _ref.length ? __slice.call(_ref, 0, _i = _ref.length - 1) : (_i = 0, []), last = _ref[_i++];
      hasNewLine = last && (last.newLine != null);
      if (hasSemicolon && !hasNewLine && this.lineHasToken()) {
        return this.createLineError('no_trailing_semicolons');
      } else {
        return null;
      }
    };

    LineLinter.prototype.createLineError = function(rule) {
      return createError(rule, {
        lineNumber: this.lineNumber,
        evidence: this.line
      });
    };

    LineLinter.prototype.lineHasToken = function() {
      return this.tokensByLine[this.lineNumber] != null;
    };

    LineLinter.prototype.getLineTokens = function() {
      return this.tokensByLine[this.lineNumber] || [];
    };

    return LineLinter;

  })();

  LexicalLinter = (function() {

    function LexicalLinter(source, config) {
      this.source = source;
      this.tokens = CoffeeScript.tokens(source);
      this.config = config;
      this.i = 0;
      this.tokensByLine = {};
    }

    LexicalLinter.prototype.lint = function() {
      var error, errors, i, token, _len, _ref;
      errors = [];
      _ref = this.tokens;
      for (i = 0, _len = _ref.length; i < _len; i++) {
        token = _ref[i];
        this.i = i;
        error = this.lintToken(token);
        if (error) errors.push(error);
      }
      return errors;
    };

    LexicalLinter.prototype.lintToken = function(token) {
      var lineNumber, type, value, _base, _ref;
      type = token[0], value = token[1], lineNumber = token[2];
      if ((_ref = (_base = this.tokensByLine)[lineNumber]) == null) {
        _base[lineNumber] = [];
      }
      this.tokensByLine[lineNumber].push(token);
      this.lineNumber = lineNumber;
      switch (type) {
        case "INDENT":
          return this.lintIndentation(token);
        case "CLASS":
          return this.lintClass(token);
        case "{":
          return this.lintBrace(token);
        default:
          return null;
      }
    };

    LexicalLinter.prototype.lintBrace = function(token) {
      var line, numIndents, type;
      type = token[0], numIndents = token[1], line = token[2];
      if (this.config.implicitBraces && token.generated) {
        return this.createError('no_implicit_braces');
      } else {
        return null;
      }
    };

    LexicalLinter.prototype.lintIndentation = function(token) {
      var context, inInterp, lineNumber, numIndents, previousToken, type;
      type = token[0], numIndents = token[1], lineNumber = token[2];
      if (!this.config.indent || (token.generated != null)) return null;
      previousToken = this.peek(-2);
      inInterp = previousToken && previousToken[0] === '+';
      if (!inInterp && numIndents !== this.config.indent) {
        context = ("Expected " + this.config.indent + " spaces ") + ("and got " + numIndents);
        return this.createError('indentation', {
          context: context
        });
      } else {
        return null;
      }
    };

    LexicalLinter.prototype.lintClass = function(token) {
      var className, lineNumber, offset, type, value, _ref, _ref2;
      _ref = this.peek(), type = _ref[0], value = _ref[1], lineNumber = _ref[2];
      className = null;
      offset = 1;
      while (!className) {
        if (((_ref2 = this.peek(offset + 1)) != null ? _ref2[0] : void 0) === '.') {
          offset += 2;
        } else {
          className = this.peek(offset)[1];
        }
      }
      if (this.config.camelCaseClasses && !regexes.camelCase.test(className)) {
        return this.createError('camel_case_classes', {
          evidence: className
        });
      } else {
        return null;
      }
    };

    LexicalLinter.prototype.createError = function(rule, attrs) {
      if (attrs == null) attrs = {};
      attrs.lineNumber = this.lineNumber;
      return createError(rule, attrs);
    };

    LexicalLinter.prototype.peek = function(n) {
      if (n == null) n = 1;
      return this.tokens[this.i + n] || null;
    };

    return LexicalLinter;

  })();

  coffeelint.lint = function(source, userConfig) {
    var config, errors, lexErrors, lexicalLinter, lineErrors, lineLinter, tokensByLine;
    if (userConfig == null) userConfig = {};
    config = defaults(userConfig, DEFAULT_CONFIG);
    if (config.tabs) config.indent = 1;
    lexicalLinter = new LexicalLinter(source, config);
    lexErrors = lexicalLinter.lint();
    tokensByLine = lexicalLinter.tokensByLine;
    lineLinter = new LineLinter(source, config, tokensByLine);
    lineErrors = lineLinter.lint();
    errors = lexErrors.concat(lineErrors);
    errors.sort(function(a, b) {
      return a.lineNumber - b.lineNumber;
    });
    return errors;
  };

}).call(this);