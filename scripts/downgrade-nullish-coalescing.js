/**
 * Downgrade modern operators in compiled mp-weixin output to syntax accepted by
 * WeChat DevTools / miniprogram-ci.
 *
 * HBuilderX already bundles the Babel packages we need, so this script resolves
 * them from the local repo first and then from the HBuilderX installation.
 *
 * Usage: node scripts/downgrade-nullish-coalescing.js <directory>
 */

const fs = require('fs')
const path = require('path')

const repoRoot = path.resolve(__dirname, '..')
const targetDirArg = process.argv[2]

if (!targetDirArg) {
  console.error('Usage: node downgrade-nullish-coalescing.js <directory>')
  process.exit(1)
}

const targetDir = path.resolve(targetDirArg)

function getSearchRoots() {
  const roots = [
    repoRoot,
    path.join(repoRoot, 'node_modules'),
    process.env.HX_APP_ROOT,
    process.env.HBUILDERX_HOME,
    'D:\\Program Files\\HBuilderX',
    'C:\\Program Files\\HBuilderX',
  ].filter(Boolean)

  const searchRoots = new Set()
  for (const root of roots) {
    searchRoots.add(root)
    searchRoots.add(path.join(root, 'plugins', 'uniapp-cli-vite'))
    searchRoots.add(path.join(root, 'plugins', 'uniapp-cli-vite', 'node_modules'))
  }
  return Array.from(searchRoots).filter((candidate) => fs.existsSync(candidate))
}

function resolvePackage(name) {
  for (const base of getSearchRoots()) {
    try {
      const resolved = require.resolve(name, { paths: [base] })
      return require(resolved)
    } catch (error) {
      if (error && error.code !== 'MODULE_NOT_FOUND') {
        throw error
      }
    }
  }

  throw new Error(
    `Unable to resolve ${name}. Checked: ${getSearchRoots().join(', ')}`
  )
}

function unwrapDefault(mod) {
  return mod && mod.default ? mod.default : mod
}

const babel = resolvePackage('@babel/core')
const transformOptionalChaining = unwrapDefault(
  resolvePackage('@babel/plugin-transform-optional-chaining')
)
const transformNullishCoalescing = unwrapDefault(
  resolvePackage('@babel/plugin-transform-nullish-coalescing-operator')
)

let patchedFiles = 0

function walkDir(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules') continue
      walkDir(full)
      continue
    }

    if (entry.name.endsWith('.js')) {
      processFile(full)
    }
  }
}

function needsDowngrade(code) {
  return code.includes('??') || code.includes('?.')
}

function processFile(filePath) {
  const code = fs.readFileSync(filePath, 'utf8')
  if (!needsDowngrade(code)) {
    return
  }

  let result
  try {
    result = babel.transformSync(code, {
      filename: filePath,
      babelrc: false,
      configFile: false,
      sourceType: 'unambiguous',
      assumptions: {
        noDocumentAll: true,
      },
      parserOpts: {
        allowReturnOutsideFunction: true,
        plugins: ['optionalChaining', 'nullishCoalescingOperator'],
      },
      generatorOpts: {
        comments: true,
        compact: true,
        jsescOption: {
          minimal: true,
        },
      },
      plugins: [transformOptionalChaining, transformNullishCoalescing],
    })
  } catch (error) {
    const rel = path.relative(targetDir, filePath)
    throw new Error(`Failed to downgrade ${rel}: ${error.message}`)
  }

  if (!result || typeof result.code !== 'string') {
    const rel = path.relative(targetDir, filePath)
    throw new Error(`Failed to downgrade ${rel}: Babel returned no code.`)
  }

  if (result.code !== code) {
    fs.writeFileSync(filePath, result.code, 'utf8')
    patchedFiles++
    const rel = path.relative(targetDir, filePath)
    console.log(`  Patched: ${rel}`)
  }
}

console.log(`Downgrading modern operators in: ${targetDir}`)
walkDir(targetDir)
console.log(`Done: ${patchedFiles} files patched.`)
