// Reflection.js
(function(global) {
"use strict";

// --- dependency modules ----------------------------------
// --- define / local variables ----------------------------
var IGNORE_KEYWORDS = [
        "webkitStorageInfo",
        "Infinity",
        "NaN",
        "arguments",
        "caller",
        "callee",
        "buffer",
        "byteOffset",
        "byteLength", // DataView, ArrayBuffer, Float32Array, ...
        "length",
        "String.prototype.help",
        "Function.prototype.help",
        "MediaError",
        "webkitOfflineAudioContext",    // OfflineAudioContext
        "webkitAudioContext",           // AudioContext
        "webkitIDBTransaction",         // IDBTransaction
        "webkitIDBRequest",             // IDBRequest
        "webkitIDBObjectStore",         // IDBObjectStore
        "webkitIDBKeyRange",            // IDBKeyRange
        "webkitIDBIndex",               // IDBIndex
        "webkitIDBFactory",             // IDBFactory
        "webkitIDBDatabase",            // IDBDatabase
        "webkitIDBCursor",              // IDBCursor
        "webkitIndexedDB",              // indexedDB
        "webkitURL",                    // URL
    ];
var _syntaxHighlightData = {
        matcher:  null, // /^\W(function|var|...|with)\W$/
        keywords: null  // /\\[^\n]+|.../
    };
var ES6_SYNTAX_KEYWORDS = [
        "\/\/[^\n]+",       // // comment
        "\/[^\n\/]+\/",     // /regexp/
        "\"[^\n\"]*\"",     // "string"
        "\'[^\n\']*\'"      // 'string'
    ];
var ES6_IDENTIFY_KEYWORD =
        "function|var|this|self|that|if|else|in|typeof|instanceof|null|undefined|" +
        "try|catch|throw|finally|switch|case|default|for|while|do|break|continue|" +
        "return|new|debugger|void|delete|" +
        "enum|class|super|extends|implements|interface|private|protected|package|" +
        "static|public|export|import|yield|let|const|with";

var functionCache = global["WeakMap"] ? new global["WeakMap"]() : null;

// --- class / interfaces ----------------------------------
function Reflection() {
}

Reflection["lang"] = ""; // Reference language. "", "en", "ja"

Reflection["addIgnoreKeyword"]      = Reflection_addIgnoreKeyword;      // Reflection.addIgnoreKeyword(keywords:StringArray):void

// --- path ---
Reflection["resolve"]               = Reflection_resolve;               // Reflection.resolve(target:Function|String):Object
// --- module ---
Reflection["getModuleRepository"]   = Reflection_getModuleRepository;   // Reflection.getModuleRepository(moduleName:String):String
// --- class ---
Reflection["getBaseClassName"]      = Reflection_getBaseClassName;      // Reflection.getBaseClassName(value):String
Reflection["getConstructorName"]    = Reflection_getConstructorName;    // Reflection.getConstructorName(value):String
// --- function ---
Reflection["parseFunction"]         = Reflection_parseFunction;         // Reflection.parseFunction(target:Function):Object
Reflection["buildFunction"]         = Reflection_buildFunction;         // Reflection.buildFunction(declaration:Object):String
// --- link ---
Reflection["getSearchLink"]         = Reflection_getSearchLink;         // Reflection.getSearchLink(path:String):Object
Reflection["getReferenceLink"]      = Reflection_getReferenceLink;      // Reflection.getReferenceLink(path:String):Object
// --- syntax highlight ---
Reflection["syntaxHighlight"]       = Reflection_syntaxHighlight;       // Reflection.syntaxHighlight(code:String, highlight:String, target:String = "console", style:Object = {}):StringArray

// --- implements ------------------------------------------
function Reflection_addIgnoreKeyword(keywords) { // @arg StringArray
                                                 // @desc add ignore keywords.
    Array.prototype.push.apply(IGNORE_KEYWORDS, keywords);
}

function Reflection_resolve(target) { // @arg Function|String target function - Object.freeze or "Object.freeze"
                                      //                                        callback(detach:Boolean):void
                                      // @ret Object - { path, fn }
                                      // @return.path String - function absoulute path. eg: ["Object", "freeze"]
                                      // @return.fn Function - function. eg: Object.freeze
                                      // @desc resolve function absolute path.

//{@dev
    if (!/function|string/.test(typeof target)) {
        throw new Error("Reflection.resolve(target): target is not Function or String.");
    }
//}@dev

    var path = "";
    var fn   = null;

    switch (typeof target) {
    case "function":
        path = _convertFunctionToPathString(global, target, ["Object", "Function", "Array", "String", "Number"]) || // inject
               _convertFunctionToPathString(global.WebModule, target, []); // inject
        fn   = target;
        break;
    case "string":
        target = _extractSharp(target);
        path = target;
        fn   = _convertPathStringToFunction(target);
        if (!fn) {
            fn = _convertPathStringToFunction("WebModule." + target);
            if (fn) {
                path = "WebModule." + target;
            }
        }
    }
    return { "path": path, "fn": fn };
}

function _convertPathStringToFunction(target) { // @arg String        - function path.  "Object.freeze"
                                                // @ret Function|null - function object. Object.freeze
    return target.split(".").reduce(function(parent, token) {
                return ( parent && (token in parent) ) ? parent[token]
                                                       : null;
            }, global);
}

function _convertFunctionToPathString(root,         // @arg Object - find root object. global or global.WebModule
                                      target,       // @arg Function - function object. Object.freeze
                                      injectKeys) { // @arg StringArray - ["Object", "Function", ...]
                                                    // @ret String   - function path.  "Object.freeze"
    var path = "";
    var rootKeys = _enumKeys(root).sort();

    Array.prototype.unshift.apply(rootKeys, injectKeys);

    for (var i = 0, iz = rootKeys.length; i < iz && !path; ++i) {
        var className = rootKeys[i];

        if ( IGNORE_KEYWORDS.indexOf(className) < 0 &&
             root[className] != null &&
             /object|function/.test(typeof root[className]) ) {

            var klass = root[className];

            if (klass === target) {
                path = className;
            } else {
                path = _findClassMember(target, root, className, _enumKeys(klass));

                if ( !path && ("prototype" in klass) ) {
                    path = _findPropertyMember(target, root, className,
                                               _enumKeys(klass["prototype"]));
                }
            }
        }
    }
    return path.replace(/^global\./i, "");
}

function _enumKeys(object) {
    return (Object["getOwnPropertyNames"] || Object["keys"])(object);
}

function _findClassMember(target, root, className, keys) {
    for (var i = 0, iz = keys.length; i < iz; ++i) {
        var key = keys[i];
        var path = className + "." + key;

        if (IGNORE_KEYWORDS.indexOf(path) < 0 &&
            IGNORE_KEYWORDS.indexOf(key)  < 0) {

            try {
                if (root[className][key] === target) {
                    return path; // resolved
                }
            } catch (o_o) {}
        }
    }
    return "";
}

function _findPropertyMember(target, root, className, keys) {
    for (var i = 0, iz = keys.length; i < iz; ++i) {
        var key = keys[i];
        var path = className + ".prototype." + key;

        if (IGNORE_KEYWORDS.indexOf(path) < 0 &&
            IGNORE_KEYWORDS.indexOf(key)  < 0) {

            try {
                if (root[className]["prototype"][key] === target) {
                    return path; // resolved
                }
            } catch (o_o) {}
        }
    }
    return "";
}

function Reflection_parseFunction(target) { // @arg Function
                                            // @ret Object - { name:String, head:StringArray, body:StringArray, arg:StringArray, ret:StringArray }
    if (functionCache && functionCache.has(target)) {
        return functionCache.get(target);
    }
    var result = _splitFunctionDeclaration(target + ""); // { head, body }

    result["name"] = target["name"];
    result["arg"]  = _getArg(result["head"]);
    result["ret"]  = _getRet(result["head"]);

    if (functionCache) {
        functionCache.set(target, result);
    }
    return result;
}

function Reflection_buildFunction(declaration) { // @arg Object - { head, body, arg, ret }
    return ""; // TODO impl
}

function _getArg(head) { // @arg StringArray - [line, ...]
                         // @ret Object - [{ name, type, optional, comment }, ...]
    // get @arg attribute.
    //
    //      function Foo_add(name,     // @arg Function|String = ""   comment
    //                       key   ) { // @arg String                 comment
    //                                 // @ret ResultType             comment
    //                       ~~~~~             ~~~~~~~~~~~~~~~   ~~   ~~~~~~~
    //                       name              type              opt  comment
    //      }

    var result = [];
    var format = /^([\w\|\/,]+)\s*(=\s*("[^"]*"|'[^']*'|\S+))?\s*([^\n]*)$/;

    head.forEach(function(line, lineNumber) {
        if (/@arg|@var_args/.test(line)) {
            if (lineNumber === 0) {
                line = _removeFunctionDeclarationString(line);
            }
            var nameType = line.split(/@arg|@var_args/);
            var name     = nameType[0].replace(/\W+/g, "").trim();
            var type     = "";
            var optional = "";
            var comment  = "";
            var token    = format.exec(nameType[1].trim());

            if (token) {
                type     = token[1];
                optional = token[3] || "";
                comment  =(token[4] || "").replace(/^[ :#\-]+/, "");
            }
            result.push({ "name": name, "type": type,
                          "optional": optional, "comment": comment });
        }
    });
    return result;
}

function _getRet(head) { // @arg StringArray - [line, ...]
                         // @ret Object - [{ types, comment }, ...]
    // get @ret attribute.
    //
    //      function Foo_add(name,     // @arg Function|String = ""   comment
    //                       key   ) { // @arg String                 comment
    //                                 // @ret ResultType             comment
    //                                         ~~~~~~~~~~~~~~~        ~~~~~~~
    //                                         type                   comment
    //      }

    var result = [];
    var format = /^([\w\|\/,]+)\s+([^\n]*)$/;

    head.forEach(function(line, lineNumber) {
        if (/@ret/.test(line)) {
            if (lineNumber === 0) {
                line = _removeFunctionDeclarationString(line);
            }
            var typeComment = line.split(/@ret/); // -> ["  //   ", " ResultType comment"]
            var type    = "";
            var comment = "";
            var token   = format.exec(typeComment[1].trim());

            if (token) {
                type    = token[1];
                comment =(token[2] || "").replace(/^[ :#\-]+/, "");
            }
            result.push({ "type": type, "comment": comment });
        }
    });
    return result;
}

function _splitFunctionDeclaration(sourceCode) { // @arg String - function code
                                                 // @ret Object - { head:StringArray, body:StringArray }
    //
    //  sourceCode:
    //
    //      "function foo() { // @ret String\n
    //          return '';\n
    //      }"
    //
    //  result: {
    //      head: [
    //          "function foo() { // @ret String"
    //      ],
    //      body: [
    //          "    return '';",
    //          "}"
    //      ]
    //  }
    //
    var code = sourceCode.trim();
    var lines = code.split("\n");
    var basePos = lines[0].indexOf("//");
    var min = 10;

    if (basePos >= min) { // "function foo() {"
        for (var i = 1, iz = lines.length; i < iz; ++i) {
            var pos = lines[i].indexOf("//"); // get header comment position(column)

            if (pos < min || pos < basePos) {
                break;
            }
        }
    }
    return { "head": lines.slice(0, i), "body": lines.slice(i) };
}

function _removeFunctionDeclarationString(sourceCode) { // @arg String
                                                        // @ret String
    //
    //  sourceCode:
    //      "function xxx(...) { }"
    //
    //  result:
    //                  "(...) { }"
    //
    return sourceCode.replace(/^function\s+[^\x28]+/, "");
}

function _extractSharp(path) { // @arg String - "Array#forEach"
                               // @ret String - "Array.prototype.forEach"
    return path.trim().replace("#", ".prototype.");
}

function Reflection_getModuleRepository(moduleName) { // @arg String - path. "Reflection"
                                                      // @ret String
                                                      // @desc get WebModule repository url.
    if (moduleName in global["WebModule"]) {
        var repository = global["WebModule"][moduleName]["repository"] || "";

        if (repository) {
            return repository.replace(/\/+$/, ""); // trim tail slash
        }
    }
    if (moduleName in global) {
        var repository = global[moduleName]["repository"] || "";

        if (repository) {
            return repository.replace(/\/+$/, ""); // trim tail slash
        }
    }
    return ""; // global["WebModule"][moduleName] or global[moduleName] not found
}

function Reflection_getSearchLink(path) { // @arg String - "Object.freeze"
                                          // @ret Object - { title:String, url:URLString }
                                          // @desc get Google search link.
    //
    //  Google Search( Array.isArray ):
    //      http://www.google.com/search?lr=lang_ja&ie=UTF-8&oe=UTF-8&q=Array.isArray
    //
    return {
        "title": "Google Search( " + path + " ):",
        "url":   _createGoogleSearchURL(path)
    };
}

function _createGoogleSearchURL(keyword) { // @arg String - search keyword.
                                           // @ret String - "http://..."
    return "http://www.google.com/search?lr=lang_" +
                _getLanguage() + "&q=" +
                encodeURIComponent(keyword);
}

function Reflection_getReferenceLink(path) { // @arg String - "Object.freeze"
                                             // @ret Object - { title:String, url:URLString }
                                             // @desc get JavaScript/WebModule reference link.
    if ( /^WebModule\./.test(path) ) {
        path = path.replace(/^WebModule\./, "");
    }
    var className  = path.split(".")[0] || "";       // "Array.prototype.forEach" -> ["Array", "prototype", "forEach"] -> "Array"
    var repository = Reflection_getModuleRepository(className); // "https://github.com/uupaa/Help.js"

    //
    //  JavaScript API( Array.isArray ) Reference:
    //      http://www.google.com/search?btnI=I%27m+Feeling+Lucky&lr=lang_ja&ie=UTF-8&oe=UTF-8&q=MDN%20Array.isArray
    //
    //  WebModule Reference:
    //      https://github.com/uupaa/PageVisibilityEvent.js/wiki/PageVisibilityEvent#
    //
    if (/native code/.test(global[className] + "")) {
        return {
            "title": "JavaScript Reference( " + path + " ):",
            "url":   _createGoogleImFeelingLuckyURL(path, "MDN")
        };
    } else if (repository && /github/i.test(repository)) {
        return {
            "title": "WebModule Reference:",
            "url":   _createGitHubWikiURL(repository, className, path)
        };
    }
    return null;
}

function _createGoogleImFeelingLuckyURL(keyword,    // @arg String - search keyword.
                                        provider) { // @arg String - search providoer.
                                                    // @ret String - "http://..."
                                                    // @desc create I'm feeling lucky url
    return "http://www.google.com/search?btnI=I%27m+Feeling+Lucky&lr=lang_" +
                _getLanguage() + "&q=" + provider + "%20" +
                encodeURIComponent(keyword);
}

function _createGitHubWikiURL(baseURL,      // @arg String - "http://..."
                              wikiPageName, // @arg String - "Foo"
                              hash) {       // @arg String - "Foo#add"
    // replace characters
    //      space    -> "-"
    //      hyphen   -> "-"
    //      underbar -> "_"
    //      alphabet -> alphabet
    //      number   -> number
    //      other    -> ""
    //      unicode  -> encodeURIComponent(unicode)
    hash = hash.replace(/[\x20-\x7e]/g, function(match) {
                var result = / |-/.test(match) ? "-"
                           : /\W/.test(match)  ? ""
                           : match;

                return result;
            });

    // {baseURL}/wiki/{wikiPageName} or
    // {baseURL}/wiki/{wikiPageName}#{hash}
    var result = [];

    result.push( baseURL.replace(/\/+$/, ""), // remove tail slash
                 "/wiki/",
                 wikiPageName + "#" );

    if (wikiPageName !== hash) {
        result.push( "wiki-", encodeURIComponent(hash.toLowerCase()) );
    }
    return result.join("");
}

function _getLanguage() { // @ret String - "en", "ja" ...
    if (Reflection["lang"]) {
        return Reflection["lang"];
    }
    if (global["navigator"]) {
        return global["navigator"]["language"];
    }
    return "en";
}

function Reflection_getBaseClassName(value) { // @arg Any - instance, exclude null and undefined.
                                              // @ret String
    // Object.prototype.toString.call(new Error());     -> "[object Error]"
    // Object.prototype.toString.call(new TypeError()); -> "[object Error]"
    return Object.prototype.toString.call(value).split(" ")[1].slice(0, -1); // -> "Error"
}

function Reflection_getConstructorName(value) { // @arg Any - instance, exclude null and undefined.
                                                // @ret String
    // Reflection_getConstructorName(new (function Aaa() {})); -> "Aaa"
    return value.constructor["name"] ||
          (value.constructor + "").split(" ")[1].split("\x28")[0]; // for IE
}

function Reflection_syntaxHighlight(code,      // @arg String             - source code
                                    highlight, // @arg String             - highlight keyword
                                    target,    // @arg String = "console" - target environment.
                                    style) {   // @arg Object = {}        - { syntax, comment, literal, highlight }
                                               // @style.syntax    CSSStyleTextString = "color:#03f"
                                               // @style.comment   CSSStyleTextString = "color:#3c0"
                                               // @style.literal   CSSStyleTextString = "color:#f6c"
                                               // @style.highlight CSSStyleTextString = "background:#ff9;font-weight:bold"
                                               // @ret StringArray
    switch (target || "console") {
    case "console":
        return _syntaxHighlightForConsole(code, highlight, style || {});
    }
    return [];
}

function _syntaxHighlightForConsole(code, highlight, style) {
    var styleSyntax    = style["syntax"]    || "color:#03f";
    var styleComment   = style["comment"]   || "color:#3c0";
    var styleLiteral   = style["literal"]   || "color:#f6c";
    var styleHighlight = style["highlight"] || "background:#ff9;font-weight:bold";
    var highlightData  = _createSyntaxHighlightData();

    var styleDeclaration = [];
    var rexSource = highlight ? (highlight + "|" + highlightData.keyword.join("|"))
                              :                    highlightData.keyword.join("|");
    var rex = new RegExp("(" + rexSource + ")", "g");
    var body = ("\n" + code + "\n").replace(/%c/g, "% c").
                                    replace(rex, function(_, match) {
                if (match === highlight) {
                    styleDeclaration.push(styleHighlight, "");
                    return "%c" + highlight + "%c";
                } else if (/^\/\/[^\n]+$/.test(match)) {
                    styleDeclaration.push(styleComment, "");
                    return "%c" + match + "%c";
                } else if (/^(\/[^\n\/]+\/|\"[^\n\"]*\"|\'[^\n\']*\')$/.test(match)) {
                    styleDeclaration.push(styleLiteral, "");
                    return "%c" + match + "%c";
                } else if (highlightData.matcher.test(match)) {
                    styleDeclaration.push(styleSyntax, "");
                    return "%c" + match + "%c";
                }
                return match;
            }).trim();
    return [body].concat(styleDeclaration);
}

function _createSyntaxHighlightData() {
    if (!_syntaxHighlightData.matcher) { // cached?
        _syntaxHighlightData.matcher =
                new RegExp("^\\W(" + ES6_IDENTIFY_KEYWORD + ")\\W$");
        _syntaxHighlightData.keyword = [].concat(ES6_SYNTAX_KEYWORDS,
                ES6_IDENTIFY_KEYWORD.split("|").map(function(keyword) {
                    return "\\W" + keyword + "\\W";
                }));
    }
    return _syntaxHighlightData;
}

// --- exports ---------------------------------------------
if (typeof module !== "undefined") {
    module["exports"] = Reflection;
}
global["Reflection"] = Reflection;

})(GLOBAL);

