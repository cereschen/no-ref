"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.transformJs = void 0;
const ts_morph_1 = require("ts-morph");
const magic_string_1 = __importDefault(require("magic-string"));
function transformJs() {
    let project = new ts_morph_1.Project({ useInMemoryFileSystem: true, compilerOptions: { allowJs: true, jsx: 1, target: ts_morph_1.ts.ScriptTarget.ESNext } });
    return function ({ code }) {
        var _a, _b;
        const scriptMatch = code.match(/([^]*)(<\s*script[^<]*?>[\r\n\s]*)([^]*)([\r\n\s]*<\/\s*script\s*>[^]*)/);
        const s = new magic_string_1.default(code);
        const isScriptRefs = !!(scriptMatch === null || scriptMatch === void 0 ? void 0 : scriptMatch[2].match(/<script[^]*(?=refs)[^<]*?>/));
        const isScriptSetup = !!(scriptMatch === null || scriptMatch === void 0 ? void 0 : scriptMatch[2].match(/<script[^]*(?=setup)[^<]*?>/));
        let offset = scriptMatch ? (scriptMatch[1].length + scriptMatch[2].length) : 0;
        let scriptCode = code;
        if (scriptMatch) {
            if (isScriptRefs) {
                for (let match of scriptMatch[3].matchAll(/ref(?!\s*[\(\)\{\}\,])/g)) {
                    if (match.index) {
                        s.overwrite(match.index + offset, match.index + match[0].length + offset, 'let');
                    }
                }
                scriptCode = s.toString().substr(offset, scriptMatch[3].length);
            }
            else {
                scriptCode = scriptMatch[3];
            }
        }
        const sf = project.createSourceFile('tmp.ts', scriptCode, { overwrite: true });
        if (isScriptSetup) {
            const transformFn = transformVariableDeclaration(s, undefined, offset);
            sf.getVariableStatements().filter((declaration) => {
                let modifiers = declaration.getNodeProperty("modifiers");
                if (!modifiers)
                    return false;
                return modifiers.some(item => {
                    return item.getKind() === ts_morph_1.ts.SyntaxKind.ExportKeyword;
                });
            }).map(item => {
                item.getDeclarations().map(transformFn);
            });
        }
        let setup = sf.getFunction('setup');
        if (!setup) {
            let setupFn;
            let theDefault = (_a = sf.getDefaultExportSymbol()) === null || _a === void 0 ? void 0 : _a.getValueDeclaration();
            // webpack
            if (ts_morph_1.Node.isExportAssignment(theDefault)) {
                let exportObj = theDefault.getFirstDescendantByKind(ts_morph_1.ts.SyntaxKind.ObjectLiteralExpression);
                setupFn = exportObj === null || exportObj === void 0 ? void 0 : exportObj.getProperty("setup");
            }
            if (setupFn)
                process(setupFn, s);
            else {
                // vite
                let __scriptObj = (_b = sf.getVariableDeclaration('__script')) === null || _b === void 0 ? void 0 : _b.getInitializer();
                if (ts_morph_1.Node.isObjectLiteralExpression(__scriptObj)) {
                    let setup = __scriptObj.getProperty("setup");
                    if (ts_morph_1.Node.isMethodDeclaration(setup)) {
                        process(setup, s);
                    }
                }
            }
        }
        else {
            process(setup, s);
        }
        return { code: s.toString(), map: s.generateMap() };
    };
}
exports.transformJs = transformJs;
function process(node, s) {
    var _a;
    let range;
    if (!ts_morph_1.Node.isFunctionDeclaration(node) && !ts_morph_1.Node.isMethodDeclaration(node) && !ts_morph_1.Node.isArrowFunction(node)) {
        return;
    }
    let returnType = node.getReturnType();
    if (returnType.isObject()) {
        let returnNode = (_a = returnType.getSymbol()) === null || _a === void 0 ? void 0 : _a.getValueDeclaration();
        if (returnNode) {
            range = { start: returnNode.getStart(), end: returnNode.getEnd() };
        }
    }
    let transformFn = transformVariableDeclaration(s, range);
    node.getVariableDeclarations().map(transformFn);
}
function transformVariableDeclaration(s, range, offset = 0) {
    return function (item) {
        let nameNode = item.getNameNode();
        if (ts_morph_1.Node.isObjectBindingPattern(nameNode)) {
            nameNode.getElements().map(item => {
                transformReferences(item, range, s, offset);
            });
        }
        transformReferences(item, range, s, offset);
    };
}
function transformReferences(node, range, s, offset = 0) {
    if (!ts_morph_1.Node.isBindingElement(node) && !ts_morph_1.Node.isVariableDeclaration(node)) {
        return;
    }
    if (node.getTrailingCommentRanges()) {
        let match = node.getTrailingCommentRanges().some(item => {
            return item.getText().match(/\s*?use-ref/);
        });
        if (match)
            return;
    }
    node.findReferences().map(item => {
        var _a;
        let definition = item.getDefinition().getNode();
        let content = (_a = definition === null || definition === void 0 ? void 0 : definition.getParentIfKind(ts_morph_1.ts.SyntaxKind.VariableDeclaration)) === null || _a === void 0 ? void 0 : _a.getNodeProperty("initializer");
        if (ts_morph_1.Node.isArrowFunction(content) || ts_morph_1.Node.isFunctionExpression(content) || ts_morph_1.Node.isCallExpression(content)) {
            return;
        }
        if (content)
            s.overwrite(content.getStart() + offset, content.getEnd() + offset, `ref(${content.getText()})`);
        item.getReferences().map((item, i) => {
            let node = item.getNode();
            if (i !== 0 && !node.getParentIfKind(ts_morph_1.ts.SyntaxKind.ParenthesizedExpression)) {
                if (range && node.getStart() > range.start && node.getEnd() < range.end) {
                    return;
                }
                s.appendLeft(node.getEnd() + offset, '.value');
            }
        });
    });
}
