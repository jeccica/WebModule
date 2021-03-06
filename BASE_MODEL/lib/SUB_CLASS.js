(function moduleExporter(name, closure) {
"use strict";

var entity = GLOBAL["WebModule"]["exports"](name, closure);

if (typeof module !== "undefined") {
    module["exports"] = entity;
}
return entity;

})("<<SUB_CLASS_NAME>>", function moduleClosure(global, WebModule, VERIFY, VERBOSE) {
"use strict";

// --- technical terms / data structure --------------------
// --- dependency modules ----------------------------------
// --- import / local extract functions --------------------
// --- define / local variables ----------------------------
var <<BASE_CLASS_NAME>> = WebModule["<<BASE_CLASS_NAME>>"];

// --- class / interfaces ----------------------------------
function <<SUB_CLASS_NAME>>() {
    <<BASE_CLASS_NAME>>.apply(this, arguments); // constructor chain.
}

<<SUB_CLASS_NAME>>["prototype"] = Object.create(<<BASE_CLASS_NAME>>.prototype, {
    "constructor": {
        "value": <<SUB_CLASS_NAME>> // new <<SUB_CLASS_NAME>>():<<SUB_CLASS_NAME>>
    },
    // --- methods ---
    "method": {
        "value": <<SUB_CLASS_NAME>>_method // <<SUB_CLASS_NAME>>#method(a:String, b:String):String
    },
    // --- accessor ---
    "value": {
        "set": function(v) { this._value = v;    },
        "get": function()  { return this._value; }
    },
});

// --- implements ------------------------------------------
function <<SUB_CLASS_NAME>>_method(a, b) {
    return a + b;
}

return <<SUB_CLASS_NAME>>; // return entity

});

