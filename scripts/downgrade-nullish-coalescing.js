/**
 * Replace nullish coalescing operator (??) with ES5-compatible code.
 *
 * miniprogram-ci's parser rejects ?? even with es6/es7 disabled.
 * HBuilderX emits `??` in compiled output, so we post-process before upload.
 *
 * Strategy: Use a simple character-level scanner to find `??` tokens (not inside
 * strings or comments) and replace them with a helper function call.
 *
 * Injects: `function __nullish__(a, b) { return a != null ? a : b; }`
 * Replaces: `expr ?? fallback` → `__nullish__(expr, fallback)`
 *
 * This is simpler and more reliable than trying to parse complex AST patterns.
 * However, `??` has very low precedence, making it hard to determine the left
 * operand boundary. Instead, we take the simplest reliable approach:
 *
 * Since HBuilderX compiles `x ?? y` into patterns where `x` and `y` are usually
 * simple expressions (identifiers, property accesses, numbers, strings), we:
 * 1. Inject a polyfill function at the top of each file that uses `??`
 * 2. Split on `??` tokens (avoiding strings/comments) and rejoin with the function
 *
 * Actually, the SIMPLEST approach for compiled uni-app output:
 * HBuilderX/Vite already wraps expressions properly. The `??` typically appears as:
 *   `someExpr ?? defaultValue`
 * inside parenthesized expressions, assignments, return statements, etc.
 *
 * We'll use a token-aware approach: scan for `??` outside strings/template literals,
 * regex comments, etc., and replace with a helper.
 *
 * Usage: node scripts/downgrade-nullish-coalescing.js <directory>
 */

const fs = require('fs')
const path = require('path')

const targetDir = process.argv[2]
if (!targetDir) {
  console.error('Usage: node downgrade-nullish-coalescing.js <directory>')
  process.exit(1)
}

const HELPER_NAME = '__$nc'
const HELPER_FN = `function ${HELPER_NAME}(a,b){return a!=null?a:b;}`

let patchedFiles = 0

function walkDir(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules') continue
      walkDir(full)
    } else if (entry.name.endsWith('.js')) {
      processFile(full)
    }
  }
}

/**
 * Find all positions of `??` that are actual operators (not inside strings/comments).
 */
function findNullishPositions(code) {
  const positions = []
  let i = 0
  while (i < code.length) {
    const ch = code[i]

    // Skip string literals
    if (ch === '"' || ch === "'" || ch === '`') {
      i++
      while (i < code.length && code[i] !== ch) {
        if (code[i] === '\\') i++ // skip escaped char
        i++
      }
      i++ // skip closing quote
      continue
    }

    // Skip single-line comments
    if (ch === '/' && code[i + 1] === '/') {
      i += 2
      while (i < code.length && code[i] !== '\n') i++
      continue
    }

    // Skip multi-line comments
    if (ch === '/' && code[i + 1] === '*') {
      i += 2
      while (i < code.length && !(code[i] === '*' && code[i + 1] === '/')) i++
      i += 2
      continue
    }

    // Check for ??
    if (ch === '?' && code[i + 1] === '?') {
      // Make sure it's not ??? or ??=
      if (code[i + 2] !== '?' && code[i + 2] !== '=') {
        positions.push(i)
      }
      i += 2
      continue
    }

    i++
  }
  return positions
}

/**
 * For a given `??` position, find the left and right operand boundaries.
 *
 * Left operand: scan backwards from `??`, skipping whitespace, finding the
 * expression boundary (respecting balanced parens, brackets, property access).
 *
 * Right operand: scan forwards from `??`, skipping whitespace, finding the
 * expression boundary.
 */
function findLeftBoundary(code, qqPos) {
  let i = qqPos - 1

  // Skip whitespace
  while (i >= 0 && /\s/.test(code[i])) i--

  if (i < 0) return 0

  // If ending with ), ], scan backwards to find matching open
  const closeToOpen = { ')': '(', ']': '[' }
  if (code[i] in closeToOpen) {
    const open = closeToOpen[code[i]]
    let depth = 1
    i--
    while (i >= 0 && depth > 0) {
      if (code[i] === code[qqPos - 1] && code[i] in closeToOpen) depth++ // same close char — but we need to match the right one
      if (code[i] === open) depth--
      else if (code[i] === code[i] && closeToOpen[code[i]]) depth++ // another close
      i--
    }
    // This is getting complex. Let me use a simpler balanced-paren approach.
  }

  // Simpler approach: the left operand of ?? is typically:
  // - an identifier/property chain: `a.b.c`
  // - a function call result: `foo(x)`
  // - a subscript: `a[b]`
  // - a number: `0`
  // - void 0
  //
  // Scan backwards, tracking balanced brackets.
  return scanExprBackward(code, qqPos - 1)
}

function scanExprBackward(code, start) {
  let i = start

  // Skip trailing whitespace
  while (i >= 0 && /\s/.test(code[i])) i--

  if (i < 0) return 0

  // Handle closing ) or ]
  const stack = []
  while (i >= 0) {
    const ch = code[i]

    if (ch === ')' || ch === ']') {
      stack.push(ch === ')' ? '(' : '[')
      i--
      continue
    }

    if (ch === '(' || ch === '[') {
      if (stack.length > 0 && stack[stack.length - 1] === ch) {
        stack.pop()
        i--
        // After matching open paren, continue to pick up the function name / array before it
        continue
      } else {
        // Unmatched — this is the boundary
        return i + 1
      }
    }

    if (stack.length > 0) {
      // Inside balanced parens/brackets, keep going
      i--
      continue
    }

    // Outside brackets
    if (/[a-zA-Z0-9_$.]/.test(ch)) {
      i--
      continue
    }

    // Hit an operator or other boundary
    return i + 1
  }

  return 0
}

function scanExprForward(code, start) {
  let i = start

  // Skip leading whitespace
  while (i < code.length && /\s/.test(code[i])) i++

  if (i >= code.length) return code.length

  const stack = []
  while (i < code.length) {
    const ch = code[i]

    // Skip string literals
    if (ch === '"' || ch === "'" || ch === '`') {
      i++
      while (i < code.length && code[i] !== ch) {
        if (code[i] === '\\') i++
        i++
      }
      i++
      continue
    }

    if (ch === '(' || ch === '[') {
      stack.push(ch === '(' ? ')' : ']')
      i++
      continue
    }

    if (ch === ')' || ch === ']') {
      if (stack.length > 0 && stack[stack.length - 1] === ch) {
        stack.pop()
        i++
        continue
      } else {
        return i
      }
    }

    if (stack.length > 0) {
      i++
      continue
    }

    // Outside brackets/parens
    if (/[a-zA-Z0-9_$.]/.test(ch)) {
      i++
      continue
    }

    // Handle unary operators like `void`, `!`, `-`, `+`, `~`, `typeof`
    if (i === start && (ch === '!' || ch === '-' || ch === '+' || ch === '~')) {
      i++
      continue
    }

    // Boundary
    return i
  }

  return code.length
}

function processFile(filePath) {
  let code = fs.readFileSync(filePath, 'utf8')
  const positions = findNullishPositions(code)
  if (positions.length === 0) return

  // Process from right to left so positions don't shift
  for (let p = positions.length - 1; p >= 0; p--) {
    const qqPos = positions[p]

    const leftStart = scanExprBackward(code, qqPos - 1)
    const rightEnd = scanExprForward(code, qqPos + 2)

    const leftExpr = code.slice(leftStart, qqPos).trim()
    const rightExpr = code.slice(qqPos + 2, rightEnd).trim()

    const replacement = `${HELPER_NAME}(${leftExpr}, ${rightExpr})`
    code = code.slice(0, leftStart) + replacement + code.slice(rightEnd)
  }

  // Inject helper at the top (after any "use strict" or initial comments)
  let injectPos = 0
  if (code.startsWith('"use strict"') || code.startsWith("'use strict'")) {
    injectPos = code.indexOf(';') + 1
    if (code[injectPos] === '\n') injectPos++
  }
  code = code.slice(0, injectPos) + HELPER_FN + '\n' + code.slice(injectPos)

  fs.writeFileSync(filePath, code, 'utf8')
  patchedFiles++
  const rel = path.relative(targetDir, filePath)
  console.log(`  Patched: ${rel} (${positions.length} replacements)`)
}

console.log(`Downgrading ?? in: ${targetDir}`)
walkDir(targetDir)
console.log(`Done: ${patchedFiles} files patched.`)
