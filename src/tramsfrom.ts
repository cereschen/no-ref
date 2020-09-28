import { ts, Project, Node, VariableDeclaration } from "ts-morph";

import ms from "magic-string"
type Range = { start: number, end: number }
export function transformJs() {
  let project = new Project({ useInMemoryFileSystem: true, compilerOptions: { allowJs: true, jsx: 1, target: ts.ScriptTarget.ESNext } })
  return function ({ code }: { code: string }) {
    const scriptMatch = code.match(/([^]*)(<\s*script[^<]*?>[\r\n\s]*)([^]*)([\r\n\s]*<\/\s*script\s*>[^]*)/)
    const s = new ms(code)
    const isScriptRefs = !!scriptMatch?.[2].match(/<script[^]*(?=refs)[^<]*?>/)
    const isScriptSetup = !!scriptMatch?.[2].match(/<script[^]*(?=setup)[^<]*?>/)
    let offset = scriptMatch ? (scriptMatch[1].length + scriptMatch[2].length) : 0
    let scriptCode = code
    if (scriptMatch) {
      if (isScriptRefs) {
        for (let match of scriptMatch[3].matchAll(/ref(?!\s*[\(\)\{\}\,])/g)) {
          if (match.index) {
            s.overwrite(match.index + offset, match.index + match[0].length + offset, 'let')
          }
        }
        scriptCode = s.toString().substr(offset, scriptMatch[3].length)
      } else {
        scriptCode = scriptMatch[3]
      }
    }
    const sf = project.createSourceFile('tmp.ts', scriptCode, { overwrite: true })
    if (isScriptSetup) {
      const transformFn = transformVariableDeclaration(s, undefined, offset)
      sf.getVariableStatements().filter((declaration) => {
        let modifiers = declaration.getNodeProperty("modifiers")
        if (!modifiers) return false
        return modifiers.some(item => {
          return item.getKind() === ts.SyntaxKind.ExportKeyword
        })
      }).map(item => {
        item.getDeclarations().map(transformFn)
      })
    }
    let setup = sf.getFunction('setup')
    if (!setup) {
      let setupFn
      let theDefault = sf.getDefaultExportSymbol()?.getValueDeclaration()

      // webpack
      if (Node.isExportAssignment(theDefault)) {
        let exportObj = theDefault.getFirstDescendantByKind(ts.SyntaxKind.ObjectLiteralExpression)

        setupFn = exportObj?.getProperty("setup")
      }

      if (setupFn) process(setupFn, s)
      else {
        // vite
        let __scriptObj = sf.getVariableDeclaration('__script')?.getInitializer()
        if (Node.isObjectLiteralExpression(__scriptObj)) {
          let setup = __scriptObj.getProperty("setup")
          if (Node.isMethodDeclaration(setup)) {
            process(setup, s)
          }
        }
      }


    } else {
      process(setup, s)
    }

    return { code: s.toString(), map: s.generateMap() }
  }
}


function process(node: Node, s: ms) {

  let range: Range | undefined

  if (!Node.isFunctionDeclaration(node) && !Node.isMethodDeclaration(node) && !Node.isArrowFunction(node)) {
    return
  }
  let returnType = node.getReturnType()
  if (returnType.isObject()) {
    let returnNode = returnType.getSymbol()?.getValueDeclaration()
    if (returnNode) {
      range = { start: returnNode.getStart(), end: returnNode.getEnd() }
    }
  }
  let transformFn = transformVariableDeclaration(s, range)
  node.getVariableDeclarations().map(transformFn)
}

function transformVariableDeclaration(s: ms, range?: Range | undefined, offset = 0) {
  return function (item: VariableDeclaration) {
    let nameNode = item.getNameNode()


    if (Node.isObjectBindingPattern(nameNode)) {

      nameNode.getElements().map(item => {
        transformReferences(item, range, s, offset)
      })
    }
    transformReferences(item, range, s, offset)
  }
}
function transformReferences(node: Node, range: Range | undefined, s: ms, offset: number = 0) {

  if (!Node.isBindingElement(node) && !Node.isVariableDeclaration(node)) {
    return
  }

  if (node.getTrailingCommentRanges()) {
    let match = node.getTrailingCommentRanges().some(item => {
      return item.getText().match(/\s*?use-ref/)
    })
    if (match) return
  }

  node.findReferences().map(item => {

    let definition = item.getDefinition().getNode()

    let content = definition?.getParentIfKind(ts.SyntaxKind.VariableDeclaration)?.getNodeProperty("initializer")

    if (Node.isArrowFunction(content) || Node.isFunctionExpression(content) || Node.isCallExpression(content)) {
      return
    }
    if (content) s.overwrite(content.getStart() + offset, content.getEnd() + offset, `ref(${content.getText()})`);

    item.getReferences().map((item, i) => {
      let node = item.getNode()
      if (i !== 0 && !node.getParentIfKind(ts.SyntaxKind.ParenthesizedExpression)) {

        if (range && node.getStart() > range.start && node.getEnd() < range.end) {
          return
        }
        s.appendLeft(node.getEnd() + offset, '.value')
      }
    })
  });
}


