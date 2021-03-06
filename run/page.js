#!/usr/bin/env node

// page --verbose
(function(global) {

var USAGE = _multiline(function() {/*
    Usage:
        node bin/page.js [-h][--help]
                         [-v][--verify]
                         [--noverify]
                         [--noverbose]
                         [--nopublish]
                         [--release]
*/});

var ERR  = "\u001b[31m";
var WARN = "\u001b[33m";
var INFO = "\u001b[32m";
var CLR  = "\u001b[0m";

var fs    = require("fs");
var wmlib = process.argv[1].split("/").slice(0, -2).join("/") + "/lib/"; // "WebModule/lib/"
var wmmodsys = require(wmlib + "ModuleSystem.js");
var argv  = process.argv.slice(2);
var modpkg = JSON.parse(fs.readFileSync("package.json", "utf8"));

var options = _parseCommandLineOptions(argv, {
        help:           false,          // show help.               --help or -h
        verify_state:   true,           // WebModule.verify state.  --noverify
        verbose_state:  true,           // WebModule.verbose state. --noverbose
        publish_state:  true,           // WebModule.publish state. --nopublish
        verbose:        false,          // verbos mode.             --verbose or -v
    });

_createTestPages();

/*
    ▾ lib/
        WebModule.js
    ▾ test/
        testcase.js
        wmtools.js
        ▾ browser/
          ▾ template/
              index.html
              worker.js
            index.html
            worker.js
        ▾ node/
          ▾ template/
              index.js
            index.js
        ▾ nw/
          ▾ template/
              index.html
            index.html
            package.json
        ▾ el/
          ▾ template/
              index.html
            index.html
            main.js
            package.json
 */

function _createTestPages() {
    var releaseBuild = false;
    var deps = wmmodsys.getDependencies(releaseBuild);

    if (options.verbose) {
//      console.log("\u001b[31m" + "packages: " + JSON.stringify(deps.packages, null, 2) + "\u001b[0m");
        console.log("\u001b[32m" + "tree: "     + JSON.stringify(deps.tree,     null, 2) + "\u001b[0m");
        console.log("\u001b[33m" + "modules: "  + JSON.stringify(deps.modules,  null, 2) + "\u001b[0m");
        console.log("files: "                   + JSON.stringify(deps.files,    null, 2));
    }
    if ( !fs["existsSync"]("test") ) {
        console.error(ERR + "ERROR. test/ directory was not found." + CLR);
    }
    var browser = _convertBrowserFile(deps.files, modpkg);
    var worker  = _convertWorkerFile(deps.files, modpkg);
    var node    = _convertNodeFile(deps.files, modpkg);
    var nw      = _convertNWFile(deps.files, modpkg);
    var el      = _convertElectronFile(deps.files, modpkg);

    if (options.verbose) {
        if (browser) { console.log( "update test/browser/index.html: \n    " + browser.replace(/\n/g, "\n    " ) ); }
        if (worker)  { console.log( "update test/browser/worker.js: \n    "  + worker.replace(/\n/g, "\n    " ) ); }
        if (node)    { console.log( "update test/node/index.js: \n    "      + node.replace(/\n/g, "\n    " ) ); }
        if (nw)      { console.log( "update test/nw/index.html: \n    "      + nw.replace(/\n/g, "\n    " ) ); }
        if (el)      { console.log( "update test/el/index.html: \n    "      + el.replace(/\n/g, "\n    " ) ); }
    }
    // package.json に webmodule{browser|worker|node|nw|el} プロパティが無い場合でも、
    // テスト用のページはそれぞれ生成します。
    if (browser) { fs.writeFileSync("test/browser/index.html", browser); }
    if (worker)  { fs.writeFileSync("test/browser/worker.js",  worker); }
    if (node)    { fs.writeFileSync("test/node/index.js",      node); }
    if (nw)      { fs.writeFileSync("test/nw/index.html",      nw); }
    if (el)      { fs.writeFileSync("test/el/index.html",      el); }

/*
    // copy test/template/nw.package.json to test/package.json
    var nwpkg = fs.readFileSync("test/template/nw.package.json", "utf8");

    fs.writeFileSync("test/package.json", nwpkg);
 */
}

function _convertBrowserFile(files,         // @arg Object - { node, worker, browser, nw, el, label }
                             packagejson) { // @arg Object - module package.json
                                            // @ret String
    var target = wmmodsys.collectBuildTarget(packagejson);
    var wm = packagejson["webmodule"];

    if (fs.existsSync("test/browser/template/index.html")) {
        var browser = {
                template:       fs.readFileSync("test/browser/template/index.html", "utf8"),
                enable:         wm.browser,
                __MODULES__:    files.browser.map(_script_updir).join("\n"),
                __WMTOOLS__:    _script("../wmtools.js"),
                __SOURCES__:    target.browser.source.map(_script_updir).join("\n"),
                __OUTPUT__:     _script_updir(target.browser.output),
                __TEST_CASE__:  _script("../testcase.js"),
            };
        return _mapping(browser, _ignoreNotationVariability(_migration(browser.template)));
    }
    return "";
}

function _convertWorkerFile(files,         // @arg Object - { node, worker, browser, nw, el, label }
                            packagejson) { // @arg Object - module package.json
                                           // @ret String
    var target = wmmodsys.collectBuildTarget(packagejson);
    var wm = packagejson["webmodule"];

    if (fs.existsSync("test/browser/template/worker.js")) {
        var worker = {
                template:       fs.readFileSync("test/browser/template/worker.js", "utf8"),
                enable:         wm.worker,
                __MODULES__:    files.worker.map(_import_updir).join("\n    "),
                __WMTOOLS__:    _import("../wmtools.js"),
                __SOURCES__:    target.worker.source.map(_import_updir).join("\n    "),
                __OUTPUT__:     _import_updir(target.worker.output),
                __TEST_CASE__:  _import("../testcase.js"),
            };
        return _mapping(worker,  _ignoreNotationVariability(_migration(worker.template)));
    }
    return "";
}

function _convertNodeFile(files,         // @arg Object - { node, worker, browser, nw, el, label }
                          packagejson) { // @arg Object - module package.json
                                         // @ret String
    var target = wmmodsys.collectBuildTarget(packagejson);
    var wm = packagejson["webmodule"];

    if (fs.existsSync("test/node/template/index.js")) {
        var node = {
                template:       fs.readFileSync("test/node/template/index.js", "utf8"),
                enable:         wm.node,
                __MODULES__:    files.node.map(_require_updir).join("\n"),
                __WMTOOLS__:    _require("../wmtools.js"),  // node.js require spec. add "./"
                __SOURCES__:    target.node.source.map(_require_updir).join("\n"),
                __OUTPUT__:     _require_updir(target.node.output),
                __TEST_CASE__:  _require("../testcase.js"), // node.js require spec. add "./"
            };
        return _mapping(node,    _ignoreNotationVariability(_migration(node.template)));
    }
    return "";
}

function _convertNWFile(files,         // @arg Object - { node, worker, browser, nw, el, label }
                        packagejson) { // @arg Object - module package.json
                                       // @ret String
    var target = wmmodsys.collectBuildTarget(packagejson);
    var wm = packagejson["webmodule"];

    if (fs.existsSync("test/nw/template/index.html")) {
        var nw = {
                template:       fs.readFileSync("test/nw/template/index.html", "utf8"),
                enable:         wm.nw,
                __MODULES__:    files.nw.map(_script_updir).join("\n"),
                __WMTOOLS__:    _script("../wmtools.js"),
                __SOURCES__:    target.nw.source.map(_script_updir).join("\n"),
                __OUTPUT__:     _script_updir(target.nw.output),
                __TEST_CASE__:  _script("../testcase.js"),
            };
        return _mapping(nw,      _ignoreNotationVariability(_migration(nw.template)));
    }
    return "";
}

function _convertElectronFile(files,         // @arg Object - { node, worker, browser, nw, el, label }
                              packagejson) { // @arg Object - module package.json
                                             // @ret String
    var target = wmmodsys.collectBuildTarget(packagejson);
    var wm = packagejson["webmodule"];

    if (fs.existsSync("test/el/template/index.html")) {
        var el = {
                template:       fs.readFileSync("test/el/template/index.html", "utf8"),
                enable:         wm.el,
                __MODULES__:    files.el.map(_script_updir).join("\n"),
                __WMTOOLS__:    _script("../wmtools.js"),
                __SOURCES__:    target.el.source.map(_script_updir).join("\n"),
                __OUTPUT__:     _script_updir(target.el.output),
                __TEST_CASE__:  _script("../testcase.js"),
            };
        return _mapping(el,      _ignoreNotationVariability(_migration(el.template)));
    }
    return "";
}

function _script(file)        { return '<script src="'          + file + '"></script>'; }
function _script_updir(file)  { return '<script src="../../'    + file + '"></script>'; }
function _import(file)        { return 'importScripts("'        + file + '");'; }
function _import_updir(file)  { return 'importScripts("../../'  + file + '");'; }
function _require(file)       { return 'require("'              + file + '");'; }
function _require_updir(file) { return 'require("../../'        + file + '");'; }

function _mapping(res, template) {
    var enable = res.enable;
    return template.replace("__MODULES__",   enable ? res.__MODULES__   : "").
                    replace("__WMTOOLS__",   enable ? res.__WMTOOLS__   : "").
                    replace("__SOURCES__",   enable ? res.__SOURCES__   : "").
                    replace("__OUTPUT__",    enable ? res.__OUTPUT__    : "").
                    replace("__TEST_CASE__", enable ? res.__TEST_CASE__ : "").
                    replace("__WEBMODULE_VERIFY__",  options.verify_state  ? "true" : "false").
                    replace("__WEBMODULE_VERBOSE__", options.verbose_state ? "true" : "false").
                    replace("__WEBMODULE_PUBLISH__", options.publish_state ? "true" : "false");
}

function _ignoreNotationVariability(template) { // ( fix typo :)
    return template.replace("__MODULE__",   "__MODULES__").
                    replace("__WMTOOL__",   "__WMTOOLS__").
                    replace("__SOURCE__",   "__SOURCES__").
                    replace("__OUTPUTS__",  "__OUTPUT__").
                    replace("__TESTCASE__", "__TEST_CASE__");
}

function _migration(template) {
    return template.replace("__SCRIPT__", "__MODULES__\n__WMTOOLS__\n__SOURCES__\n__OUTPUT__\n__TEST_CASE__");
}

function _parseCommandLineOptions(argv, options) {
    for (var i = 0, iz = argv.length; i < iz; ++i) {
        switch (argv[i]) {
        case "-h":
        case "--help":      options.help = true; break;
        case "-v":
        case "--verbose":   options.verbose = true; break;
        case "--noverify":  options.verify_state = false; break;
        case "--noverbose": options.verbose_state = false; break;
        case "--nopublish": options.publish_state = false; break;
        case "--release":   options.verify_state = false;
                            options.verbose_state = false;
                            options.publish_state = false; break;
        default:
            throw new TypeError("UNKNOWN argument: " + argv[i]);
        }
    }
    return options;
}

function _multiline(fn) { // @arg Function:
                          // @ret String:
    return (fn + "").split("\n").slice(1, -1).join("\n");
}

})(GLOBAL);

