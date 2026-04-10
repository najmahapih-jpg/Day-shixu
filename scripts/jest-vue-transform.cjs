const ts = require('typescript')
const { parse, compileScript, compileTemplate } = require('@vue/compiler-sfc')

module.exports = {
  process(sourceText, sourcePath) {
    const { descriptor } = parse(sourceText, { filename: sourcePath })

    let scriptCode = 'const __sfc__ = {}'
    let bindings

    if (descriptor.scriptSetup || descriptor.script) {
      const script = descriptor.scriptSetup
        ? compileScript(descriptor, { id: sourcePath })
        : { content: descriptor.script.content, bindings: {} }
      bindings = script.bindings
      scriptCode = script.content.replace(/export\s+default/, 'const __sfc__ =')
    }

    let templateCode = ''
    if (descriptor.template) {
      const template = compileTemplate({
        id: sourcePath,
        filename: sourcePath,
        source: descriptor.template.content,
        compilerOptions: {
          bindingMetadata: bindings,
        },
      })
      if (template.errors && template.errors.length > 0) {
        throw new Error(template.errors.join('\n'))
      }
      templateCode = `${template.code.replace('export function render', 'function render')}\n__sfc__.render = render;`
    }

    const combined = `
${scriptCode}
${templateCode}
module.exports = __sfc__;
`

    const result = ts.transpileModule(combined, {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2019,
        moduleResolution: ts.ModuleResolutionKind.NodeJs,
        esModuleInterop: true,
        allowJs: true,
      },
      fileName: sourcePath,
    })

    return { code: result.outputText }
  },
}
