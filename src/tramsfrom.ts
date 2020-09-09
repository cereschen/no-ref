import { ts, Project, Node } from "ts-morph";

import ms from "magic-string"
type Range = { start: number, end: number }
export function transformJs () {
  let project = new Project({ useInMemoryFileSystem: true, compilerOptions: { allowJs: true, jsx: 1, target: ts.ScriptTarget.ESNext } })
  return function ({ code }: { code: string }) {
    const sf = project.createSourceFile('tmp.ts', code, { overwrite: true })
    let s = new ms(code)
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


function process (node: Node, s: ms) {

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
  node.getVariableDeclarations().map(item => {
    let nameNode = item.getNameNode()
    if (Node.isObjectBindingPattern(nameNode)) {

      nameNode.getElements().map(item => {
        transformReferences(item, range, s)
      })
    }
    transformReferences(item, range, s)
  })
}

function transformReferences (node: Node, range: Range | undefined, s: ms) {

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
    if (content) s.overwrite(content.getStart(), content.getEnd(), `ref(${content.getText()})`);
    item.getReferences().map((item, i) => {
      let node = item.getNode()
      if (i !== 0 && !node.getParentIfKind(ts.SyntaxKind.ParenthesizedExpression)) {

        if (range && node.getStart() > range.start && node.getEnd() < range.end) {
          return
        }
        s.appendLeft(node.getEnd(), '.value')
      }
    })
  });
}

//  let result= transformJs()({
//     code: `export default {
//     setup(){
//         const data =2222
//         console.log(data);

//         console.log(123231);

//     }
// }`}).code
