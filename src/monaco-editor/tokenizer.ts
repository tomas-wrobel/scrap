import {editor, languages} from "monaco-editor";

languages.registerTokensProviderFactory("typescript", {
    create: () => ({
        // Set defaultToken to invalid to see what you do not tokenize yet
        defaultToken: "invalid",
        tokenPostfix: ".ts",
        motion: [
            "move",
            "turnLeft",
            "turnRight",
            "pointInDirection",
            "pointTowards",
            "pointTo",
            "goTo",
            "goTowards",
            "glide",
            "x",
            "y",
            "direction",
            "setRotationStyle",
            "ifOnEdgeBounce"
        ],
        looks: [
            "sayWait",
            "say",
            "think",
            "thinkWait",
            "effects",
            "switchCostumeTo",
            "nextCostume",
            "switchBackdropToWait",
            "switchBackdropTo",
            "nextBackdrop",
            "show",
            "hide",
            "goForward",
            "goBackward",
            "goToFront",
            "goToBack",
            "visible",
            "size",
            "costume",
            "backdrop",
        ],
        sounds: [
            "playSound",
            "playSoundUntilDone",
            "volume",
            "stopSounds"
        ],
        pen: [
            "penClear",
            "penDown",
            "penUp",
            "isPenDown",
            "stamp",
            "penSize",
            "penColor",
        ],
        events: [
            "whenLoaded",
            "whenFlag",
            "whenBackdropChangesTo",
            "whenKeyPressed",
            "whenTimerElapsed",
            "whenMouse",
            "broadcastMessage",
            "whenReceiveMessage",
            "broadcastMessageWait"
        ],
        flow: [
            "if",
            "else",
            "for",
            "do",
            "while",
            "break",
            "continue",
            "try",
            "catch"
        ],
        controls: [
            "wait",
            "delete",
            "clone",
            "stop"
        ],
        sensing: [
            "isTouching",
            "isTouchingBackdropColor",
            "isTouchingEdge",
            "isTouchingMouse",
            "distanceTo",
            "ask",
            "isKeyPressed",
            "mouseDown",
            "mouseX",
            "mouseY",
            "draggable",
            "getTimer",
            "resetTimer",
            // Date
            "getFullYear",
            "getMonth",
            "getDate",
            "getDay",
            "getHours",
            "getMinutes",
            "getSeconds",
            // Window
            "alert",
            "confirm",
            "prompt",
            "isTurbo",
        ],
        math: [
            "abs",
            "floor",
            "ceil",
            "round",
            "sqrt",
            "sin",
            "cos",
            "tan",
            "asin",
            "acos",
            "atan",
            "log",
            "log10",
            "exp",
            "PI",
            "E",
            "random"
        ],
        types: [
            "number",
            "string",
            "boolean",
            "any",
            "Sprite",
            "true",
            "false",
            "Infinity",
            "NaN",
            "Color"
        ],
        iterables: [
            "length",
            "reverse",
            "join",
            "includes",
            "indexOf",
            "slice"
        ],
        functions: [
            "function",
            "call",
            "Date",
            "Array",
            "window",
            "interface",
            "Stage",
            "const",
            "var",
            "let",
            "Scrap",
            "new"
        ],
        sprites: [
            "self",
            "$"
        ],
        operators: [
            "<=",
            ">=",
            "==",
            "!=",
            "===",
            "!==",
            "=>",
            "+",
            "-",
            "**",
            "*",
            "/",
            "%",
            "++",
            "--",
            "<<",
            "</",
            ">>",
            ">>>",
            "&",
            "|",
            "^",
            "!",
            "~",
            "&&",
            "||",
            "??",
            "?",
            ":",
            "=",
            "+=",
            "-=",
            "*=",
            "**=",
            "/=",
            "%=",
            "<<=",
            ">>=",
            ">>>=",
            "&=",
            "|=",
            "^=",
            "@"
        ],
        // we include these common regular expressions
        symbols: /[=><!~?:&|+\-*\/\^%]+/,
        escapes: /\\(?:[abfnrtv\\"']|x[0-9A-Fa-f]{1,4}|u[0-9A-Fa-f]{4}|U[0-9A-Fa-f]{8})/,
        digits: /\d+(_+\d+)*/,
        octaldigits: /[0-7]+(_+[0-7]+)*/,
        binarydigits: /[0-1]+(_+[0-1]+)*/,
        hexdigits: /[[0-9a-fA-F]+(_+[0-9a-fA-F]+)*/,
        regexpctl: /[(){}\[\]\$\^|\-*+?\.]/,
        regexpesc: /\\(?:[bBdDfnrstvwWn0\\\/]|@regexpctl|c[A-Z]|x[0-9a-fA-F]{2}|u[0-9a-fA-F]{4})/,
        // The main tokenizer for our languages
        tokenizer: {
            root: [[/[{}]/, "delimiter.bracket"], {include: "common"}],
            common: [
                [
                    /(Color)([ \n\t\r]*\.[ \n\t\r]*)(fromHex|random|fromRGB|)/,
                    [
                        "Color",
                        "delimiter",
                        "pen"
                    ]
                ],
                [
                    /(new)([ \t\r\n]+)([A-Z]\w*)/,
                    [
                        "functions",
                        "white",
                        {
                            cases: {
                                "@functions": "constructor",
                                "@default": "interface"
                            }
                        }
                    ]
                ],
                // identifiers and keywords
                [
                    /(\.[ \n\t\r]*)([A-Za-z_$][\w$]*)/,
                    [
                        "delimiter",
                        {
                            cases: {
                                "@motion": "motion",
                                "@looks": "looks",
                                "@sounds": "sounds",
                                "@pen": "pen",
                                "@events": "events",
                                "@controls": "controls",
                                "@sensing": "sensing",
                                "@default": "identifier",
                                "@iterables": "iterables",
                                "@math": "operators"
                            }
                        }
                    ]
                ],
                [
                    /([A-Za-z_$][\w$]*)/,
                    {
                        cases: {
                            "@flow": "controls",
                            "@types": "operators",
                            "@functions": "functions",
                            "Variables": "interface",
                            "@sprites": "sprites",
                            "@default": "variables",
                        }
                    }
                ],
                // whitespace
                {include: "@whitespace"},
                // regular expression: ensure it is terminated before beginning (otherwise it is an opeator)
                [
                    /\/(?=([^\\\/]|\\.)+\/([dgimsuy]*)(\s*)(\.|;|,|\)|\]|\}|$))/,
                    {token: "regexp", bracket: "@open", next: "@regexp"}
                ],
                // delimiters and operators
                [/[()\[\]]/, "@brackets"],
                [/[<>](?!@symbols)/, "@brackets"],
                [/!(?=([^=]|$))/, "delimiter"],
                [
                    /@symbols/,
                    {
                        cases: {
                            "@operators": "delimiter",
                            "@default": ""
                        }
                    }
                ],
                // numbers
                [/(@digits)[eE]([\-+]?(@digits))?/, "number.float"],
                [/(@digits)\.(@digits)([eE][\-+]?(@digits))?/, "number.float"],
                [/0[xX](@hexdigits)n?/, "number.hex"],
                [/0[oO]?(@octaldigits)n?/, "number.octal"],
                [/0[bB](@binarydigits)n?/, "number.binary"],
                [/(@digits)n?/, "number"],
                // delimiter: after number because of .\d floats
                [/[;,.]/, "delimiter"],
                // strings
                [/"([^"\\]|\\.)*$/, "string.invalid"],
                // non-teminated string
                [/'([^'\\]|\\.)*$/, "string.invalid"],
                // non-teminated string
                [/"/, "string", "@string_double"],
                [/'/, "string", "@string_single"],
                [/`/, "string", "@string_backtick"]
            ],
            whitespace: [
                [/[ \t\r\n]+/, ""],
                [/\/\*\*(?!\/)/, "comment.doc", "@jsdoc"],
                [/\/\*/, "comment", "@comment"],
                [/\/\/.*$/, "comment"]
            ],
            comment: [
                [/[^\/*]+/, "comment"],
                [/\*\//, "comment", "@pop"],
                [/[\/*]/, "comment"]
            ],
            jsdoc: [
                [/[^\/*]+/, "comment.doc"],
                [/\*\//, "comment.doc", "@pop"],
                [/[\/*]/, "comment.doc"]
            ],
            // We match regular expression quite precisely
            regexp: [
                [
                    /(\{)(\d+(?:,\d*)?)(\})/,
                    ["regexp.escape.control", "regexp.escape.control", "regexp.escape.control"]
                ],
                [
                    /(\[)(\^?)(?=(?:[^\]\\\/]|\\.)+)/,
                    ["regexp.escape.control", {token: "regexp.escape.control", next: "@regexrange"}]
                ],
                [/(\()(\?:|\?=|\?!)/, ["regexp.escape.control", "regexp.escape.control"]],
                [/[()]/, "regexp.escape.control"],
                [/@regexpctl/, "regexp.escape.control"],
                [/[^\\\/]/, "regexp"],
                [/@regexpesc/, "regexp.escape"],
                [/\\\./, "regexp.invalid"],
                [/(\/)([dgimsuy]*)/, [{token: "regexp", bracket: "@close", next: "@pop"}, "keyword.other"]]
            ],
            regexrange: [
                [/-/, "regexp.escape.control"],
                [/\^/, "regexp.invalid"],
                [/@regexpesc/, "regexp.escape"],
                [/[^\]]/, "regexp"],
                [
                    /\]/,
                    {
                        token: "regexp.escape.control",
                        next: "@pop",
                        bracket: "@close"
                    }
                ]
            ],
            string_double: [
                [/[^\\"]+/, "string"],
                [/@escapes/, "string.escape"],
                [/\\./, "string.escape.invalid"],
                [/"/, "string", "@pop"]
            ],
            string_single: [
                [/[^\\']+/, "string"],
                [/@escapes/, "string.escape"],
                [/\\./, "string.escape.invalid"],
                [/'/, "string", "@pop"]
            ],
            string_backtick: [
                [/\$\{/, {token: "delimiter.bracket", next: "@bracketCounting"}],
                [/[^\\`$]+/, "string"],
                [/@escapes/, "string.escape"],
                [/\\./, "string.escape.invalid"],
                [/`/, "string", "@pop"]
            ],
            bracketCounting: [
                [/\{/, "delimiter.bracket", "@bracketCounting"],
                [/\}/, "delimiter.bracket", "@pop"],
                {include: "common"}
            ]
        }
    })
});

languages.register({
    id: "typescript",
    extensions: [".ts", ".tsx", ".cts", ".mts"],
    aliases: ["TypeScript", "ts", "typescript"],
    mimetypes: ["text/typescript"],
});

languages.onLanguageEncountered("typescript", () => {
    languages.registerColorProvider("typescript", {
        provideColorPresentations(model, info) {
            const code = model.getValue().slice(
                model.getOffsetAt({
                    lineNumber: info.range.startLineNumber,
                    column: info.range.startColumn
                }),
                model.getOffsetAt({
                    lineNumber: info.range.endLineNumber,
                    column: info.range.endColumn
                })
            );
            const rgb = [Math.round(info.color.red * 255), Math.round(info.color.green * 255), Math.round(info.color.blue * 255)];
            return [
                {
                    label: `rgb(${Math.round(info.color.red * 100)}%, ${Math.round(info.color.blue * 100)}%, ${Math.round(info.color.green * 100)}%)`,
                    textEdit: {
                        range: info.range,
                        text: code[0] === '"' ? `"#${rgb.map(s => s.toString(16).padStart(2, "0")).join("")}"` : rgb.join(", ")
                    }
                }
            ];
        },
        async provideDocumentColors(model) {
            try {
                const babel = await import("@babel/core");
                const ast = await babel.parseAsync(
                    model.getValue(),
                    {
                        sourceType: "module",
                        filename: "script.ts",
                        presets: [
                            await import("@babel/preset-typescript")
                        ],

                    }
                );

                if (!ast) {
                    return [];
                }

                const colors: languages.IColorInformation[] = [];

                babel.traverse(ast, {
                    CallExpression(path) {
                        if (!path.node.loc) {
                            return;
                        }

                        if (path.node.callee.type === "MemberExpression") {
                            const {object, property} = path.node.callee;
                            if (object.type === "Identifier" && object.name === "Color") {
                                if (property.type === "Identifier") {
                                    if (property.name === "fromRGB") {
                                        const [red, green, blue] = path.node.arguments;
                                        if (red.type === "NumericLiteral" && green.type === "NumericLiteral" && blue.type === "NumericLiteral") {
                                            colors.push({
                                                color: {
                                                    red: red.value / 255,
                                                    green: green.value / 255,
                                                    blue: blue.value / 255,
                                                    alpha: 1
                                                },
                                                range: {
                                                    startLineNumber: red.loc!.start.line,
                                                    startColumn: red.loc!.start.column + 1,
                                                    endLineNumber: blue.loc!.end.line,
                                                    endColumn: blue.loc!.end.column + 1,
                                                }
                                            });
                                        }
                                    } else if (property.name === "fromHex") {
                                        const [hex] = path.node.arguments;
                                        if (hex.type === "StringLiteral") {
                                            if (!/^#[0-9A-F]{6}$/i.test(hex.value)) {
                                                return;
                                            }
                                            colors.push({
                                                color: {
                                                    red: Number.parseInt(hex.value.slice(1, 3), 16) / 255,
                                                    green: Number.parseInt(hex.value.slice(3, 5), 16) / 255,
                                                    blue: Number.parseInt(hex.value.slice(5, 7), 16) / 255,
                                                    alpha: 1
                                                },
                                                range: {
                                                    startLineNumber: hex.loc!.start.line,
                                                    startColumn: hex.loc!.start.column + 1,
                                                    endLineNumber: hex.loc!.end.line,
                                                    endColumn: hex.loc!.end.column + 1
                                                }
                                            });
                                        }
                                    }
                                }
                            }
                        }
                    }
                });

                return colors;
            } catch (e) {
                return [];
            }
        },
    });
    languages.setLanguageConfiguration("typescript", {
        wordPattern: /(-?\d*\.\d\w*)|([^\`\~\!\@\#\%\^\&\*\(\)\-\=\+\[\{\]\}\\\|\;\:\'\"\,\.\<\>\/\?\s]+)/g,
        comments: {
            lineComment: "//",
            blockComment: ["/*", "*/"]
        },
        brackets: [
            ["{", "}"],
            ["[", "]"],
            ["(", ")"]
        ],
        onEnterRules: [
            {
                // e.g. /** | */
                beforeText: /^\s*\/\*\*(?!\/)([^\*]|\*(?!\/))*$/,
                afterText: /^\s*\*\/$/,
                action: {
                    indentAction: languages.IndentAction.IndentOutdent,
                    appendText: " * "
                }
            },
            {
                // e.g. /** ...|
                beforeText: /^\s*\/\*\*(?!\/)([^\*]|\*(?!\/))*$/,
                action: {
                    indentAction: languages.IndentAction.None,
                    appendText: " * "
                }
            },
            {
                // e.g.  * ...|
                beforeText: /^(\t|(\ \ ))*\ \*(\ ([^\*]|\*(?!\/))*)?$/,
                action: {
                    indentAction: languages.IndentAction.None,
                    appendText: "* "
                }
            },
            {
                // e.g.  */|
                beforeText: /^(\t|(\ \ ))*\ \*\/\s*$/,
                action: {
                    indentAction: languages.IndentAction.None,
                    removeText: 1
                }
            }
        ],
        autoClosingPairs: [
            {open: "{", close: "}"},
            {open: "[", close: "]"},
            {open: "(", close: ")"},
            {open: '"', close: '"', notIn: ["string"]},
            {open: "'", close: "'", notIn: ["string", "comment"]},
            {open: "`", close: "`", notIn: ["string", "comment"]},
            {open: "/**", close: " */", notIn: ["string"]}
        ],
        folding: {
            markers: {
                start: new RegExp("^\\s*//\\s*#?region\\b"),
                end: new RegExp("^\\s*//\\s*#?endregion\\b")
            }
        }
    });
});

editor.defineTheme("scrap", {
    base: "vs",
    inherit: false,
    rules: [
        {token: "motion", foreground: "4C97FF"},
        {token: "looks", foreground: "9966FF"},
        {token: "pen", foreground: "0FBD8C"},
        {token: "events", foreground: "FFBF00"},
        {token: "controls", foreground: "FFAB19"},
        {token: "sensing", foreground: "5CB1D6"},
        {token: "sprites", foreground: "5CB1D6", fontStyle: "bold"},
        {token: "sounds", foreground: "CF63CF"},
        {token: "iterables", foreground: "FF661A"},
        {token: "variables", foreground: "FF8C1A"},
        {token: "functions", foreground: "FF6680"},
        {token: "operators", foreground: "59C059"},
        {token: 'comment', foreground: '008000'},
        {token: 'string', foreground: 'A31515'},
        {token: 'number', foreground: '098658'},
        {token: "interface", foreground: "FF8C1A", fontStyle: "bold"},
        {token: "constructor", foreground: "FF6680", fontStyle: "bold"},
        {token: "Color", foreground: "59C059", fontStyle: "bold"},
    ],
    colors: {
        "editor.background": "#FFFFFF",
        "editor.foreground": "#000000",
        "editor.inactiveSelectionBackground": "#E5EBF1",
        "editorIndentGuide.background1": '#D3D3D3',
        "editorIndentGuide.activeBackground1": '#939393',
        "editor.selectionHighlightBackground": '#ADD6FF4D'
    }
});

editor.setTheme("scrap");