#!/usr/bin/env node
/**
 * SVG 素材审计脚本
 * 全面审计项目中 SVG / 插画资源的完整度
 *
 * 运行: node scripts/audit-svg-assets.js
 */

const fs = require('fs')
const path = require('path')

// ─── Config ────────────────────────────────────────────────────────────────────

const ROOT = path.resolve(__dirname, '..')

const CODE_DIRS = ['pages', 'components', 'stores', 'composables', 'services']
    .map(d => path.join(ROOT, d))
    .filter(d => fs.existsSync(d))

const CODE_EXTS = ['.vue', '.ts', '.js']

const STATIC_ICONS = path.join(ROOT, 'static', 'icons')
const STATIC_IMAGES = path.join(ROOT, 'static', 'images')
const OLD_STATIC = path.join(ROOT, 'src', 'static')

const REPORT_PATH = path.join(ROOT, 'SVG_AUDIT_REPORT.md')

// ─── HfIcon path alias map (copied from HfIcon.vue) ───────────────────────────

const ICON_ALIAS = {
    check: 'check-circle-bold',
    'check-bold': 'check-circle-bold',
    clock: 'clock-circle-linear',
    'clock-bold': 'clock-circle-linear',
    'clock-linear': 'clock-circle-linear',
    'clock-circle-bold': 'clock-circle-linear',
    running: 'running-2-bold',
    'running-bold': 'running-2-bold',
    meditation: 'meditation-round-bold',
    'meditation-bold': 'meditation-round-bold',
    heart: 'heart-pulse-bold',
    'heart-bold': 'heart-pulse-bold',
    music: 'music-note-bold',
    'music-bold': 'music-note-bold',
    hashtag: 'notes-linear',
    'hashtag-bold': 'notes-linear',
    'notes-bold': 'notes-linear',
    route: 'flag-bold',
    'route-linear': 'flag-bold',
    'wi-fi-router': 'cloud-bold',
    'wi-fi-router-bold': 'cloud-bold',
    'user-circle-bold': 'user-circle-linear',
}

// ─── HfEmpty illustrations map (copied from HfEmpty.vue) ───────────────────────

const EMPTY_ILLUSTRATIONS = {
    habit: 'empty/no-habit.svg',
    archive: 'empty/archive.svg',
    checkin: 'empty/no-habit.svg',
    data: 'empty/no-stats.svg',
    search: 'empty/no-note.svg',
    archive: 'empty/archive.svg',
    network: 'empty/network.svg',
    journey: 'empty/no-journey.svg',
    note: 'empty/no-note.svg',
}

// ─── HfEmpty fallback icons (TYPE_CONFIG from HfEmpty.vue) ─────────────────────

const EMPTY_ICONS = {
    habit: 'notes-linear',
    archive: 'box-bold',
    checkin: 'calendar-linear',
    data: 'chart-2-bold',
    search: 'magnifer-bold',
    network: 'cloud-bold',
    journey: 'flag-bold',
    note: 'notes-linear',
}

// ─── Utilities ─────────────────────────────────────────────────────────────────

function walkDir(dir, exts) {
    const results = []
    if (!fs.existsSync(dir)) return results
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name)
        if (entry.isDirectory()) {
            results.push(...walkDir(full, exts))
        } else if (!exts || exts.some(e => entry.name.endsWith(e))) {
            results.push(full)
        }
    }
    return results
}

function relPath(absPath) {
    return path.relative(ROOT, absPath).replace(/\\/g, '/')
}

function fileSize(absPath) {
    try {
        return fs.statSync(absPath).size
    } catch {
        return 0
    }
}

function humanSize(bytes) {
    if (bytes < 1024) return `${bytes} B`
    return `${(bytes / 1024).toFixed(1)} KB`
}

/**
 * Simulate HfIcon candidate resolution.
 * Returns array of candidate absolute paths.
 */
function resolveIconCandidates(rawName) {
    const name = ICON_ALIAS[rawName] || rawName
    if (!name) return []

    // Root-relative path from pages.json (e.g. "static/icons/tabbar/home.png")
    if (name.startsWith('static/')) {
        return [path.join(ROOT, name)]
    }
    if (name.startsWith('/static/')) {
        return [path.join(ROOT, name)]
    }
    if (name.endsWith('.png')) {
        return [path.join(STATIC_ICONS, name)]
    }
    if (name.endsWith('.svg')) {
        return [
            path.join(STATIC_ICONS, 'solar', name),
            path.join(STATIC_ICONS, name),
        ]
    }
    return [
        path.join(STATIC_ICONS, 'solar', `${name}.svg`),
        path.join(STATIC_ICONS, `${name}.svg`),
    ]
}

/**
 * Simulate HfIllustration path resolution.
 */
function resolveIllustrationPath(name) {
    const hasExt = /\.\w+$/.test(name)
    const resolved = hasExt ? name : name + '.svg'
    return path.join(STATIC_IMAGES, resolved)
}

// ─── Step 1: Scan code references ──────────────────────────────────────────────

/**
 * Check if a value looks like a JS variable/expression rather than a static icon name.
 * Static icon names: 'fire-bold', 'arrow-left-linear', 'check-circle-bold'
 * Dynamic expressions: 'habit.icon', 'config.icon', 'isRunning ? ...'
 */
function isDynamicExpression(val) {
    if (!val) return true
    // Contains JS operators or member access
    if (/[.?()&|!+[\]]/.test(val)) return true
    // Contains spaces that suggest an expression (ternary, etc.)
    if (/\s/.test(val.trim())) return true
    // Starts with uppercase (likely a component/variable)
    if (/^[A-Z]/.test(val)) return true
    return false
}

/**
 * Extract static string values from ternary expressions.
 * e.g. "isX ? 'foo' : 'bar'" -> ['foo', 'bar']
 */
function extractTernaryStrings(expr) {
    const strings = []
    const strMatches = expr.matchAll(/'([^']+)'/g)
    for (const m of strMatches) {
        strings.push(m[1])
    }
    return strings
}

function scanCodeReferences() {
    const iconRefs = []       // { name, file, line, raw, isDynamic }
    const illustRefs = []     // { name, file, line, raw, isDynamic }
    const staticPathRefs = [] // { pathStr, file, line }

    const codeFiles = CODE_DIRS.flatMap(d => walkDir(d, CODE_EXTS))

    // Also scan pages.json for tabbar icons
    const pagesJsonPath = path.join(ROOT, 'pages.json')
    if (fs.existsSync(pagesJsonPath)) {
        try {
            const pagesContent = fs.readFileSync(pagesJsonPath, 'utf-8')
            // Match iconPath and selectedIconPath
            const tabbarMatches = pagesContent.matchAll(/"(?:icon|selected\w*)Path"\s*:\s*"([^"]+)"/g)
            for (const m of tabbarMatches) {
                const iconPath = m[1]
                // These are root-relative paths like "static/icons/tabbar/home.png"
                staticPathRefs.push({ pathStr: iconPath, file: 'pages.json', line: 0 })
                // Mark as icon ref too
                iconRefs.push({ name: iconPath, file: 'pages.json', line: 0, raw: m[0], isDynamic: false })
            }
        } catch { /* ignore */ }
    }

    for (const filePath of codeFiles) {
        const content = fs.readFileSync(filePath, 'utf-8')
        const lines = content.split('\n')
        const rel = relPath(filePath)

        // Track context: are we inside an HfIllustration or HfEmpty tag?
        let inIllustration = false
        let inEmpty = false

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i]
            const lineNum = i + 1

            // Context tracking for multi-line component usage
            if (/<HfIllustration/i.test(line)) inIllustration = true
            if (/<HfEmpty/i.test(line)) inEmpty = true
            if (/\/>/.test(line) || /<\/Hf(Illustration|Empty)/i.test(line)) {
                inIllustration = false
                inEmpty = false
            }

            // ── Icon references ──

            // 1. Static prop: name="icon-name" (no colon before name)
            const staticPropMatch = line.match(/(?<![:])\bname="([^"]+)"/)
            if (staticPropMatch && !inIllustration && !inEmpty) {
                const val = staticPropMatch[1]
                if (!val.includes('/') || val.startsWith('/static/icons/')) {
                    iconRefs.push({ name: val, file: rel, line: lineNum, raw: staticPropMatch[0], isDynamic: false })
                }
            }

            // 2. Bound prop: :name="..." — need to parse the binding value
            const boundNameMatch = line.match(/:name="([^"]+)"/)
            if (boundNameMatch && !inIllustration && !inEmpty) {
                const expr = boundNameMatch[1]

                // Case A: Literal string: :name="'icon-name'"
                const literalMatch = expr.match(/^'([^']+)'$/)
                if (literalMatch) {
                    iconRefs.push({ name: literalMatch[1], file: rel, line: lineNum, raw: boundNameMatch[0], isDynamic: false })
                }
                // Case B: Ternary with string literals: :name="cond ? 'a' : 'b'"
                else if (expr.includes('?') && expr.includes("'")) {
                    const ternaryValues = extractTernaryStrings(expr)
                    for (const val of ternaryValues) {
                        iconRefs.push({ name: val, file: rel, line: lineNum, raw: boundNameMatch[0], isDynamic: false })
                    }
                    // Also log as dynamic for awareness
                    if (ternaryValues.length > 0) {
                        // We extracted the values, no need to also log as dynamic
                    }
                }
                // Case C: Fallback with string: :name="x || 'default'"
                else if (expr.includes('||') && expr.includes("'")) {
                    const fallbackStrings = extractTernaryStrings(expr)
                    for (const val of fallbackStrings) {
                        iconRefs.push({ name: val, file: rel, line: lineNum, raw: boundNameMatch[0], isDynamic: false })
                    }
                    // The variable part is dynamic
                    iconRefs.push({ name: expr, file: rel, line: lineNum, raw: boundNameMatch[0], isDynamic: true })
                }
                // Case D: Pure dynamic expression
                else if (isDynamicExpression(expr)) {
                    iconRefs.push({ name: expr, file: rel, line: lineNum, raw: boundNameMatch[0], isDynamic: true })
                }
                // Case E: Looks like a static name that was bound
                else {
                    iconRefs.push({ name: expr, file: rel, line: lineNum, raw: boundNameMatch[0], isDynamic: false })
                }
            }

            // 3. icon="xxx" prop (static)
            const iconStaticMatch = line.match(/(?<![:])\bicon="([^"]+)"/)
            if (iconStaticMatch) {
                iconRefs.push({ name: iconStaticMatch[1], file: rel, line: lineNum, raw: iconStaticMatch[0], isDynamic: false })
            }

            // 4. :icon="'xxx'" (bound literal)
            const iconBoundMatch = line.match(/:icon="'([^']+)'"/)
            if (iconBoundMatch) {
                iconRefs.push({ name: iconBoundMatch[1], file: rel, line: lineNum, raw: iconBoundMatch[0], isDynamic: false })
            }

            // ── Illustration references ──

            // HfIllustration name (static)
            if (inIllustration) {
                const illustNameMatch = line.match(/(?<![:])\bname="([^"]+)"/)
                if (illustNameMatch) {
                    illustRefs.push({ name: illustNameMatch[1], file: rel, line: lineNum, raw: illustNameMatch[0], isDynamic: false })
                }
                // :name binding on HfIllustration
                const illustBoundMatch = line.match(/:name="([^"]+)"/)
                if (illustBoundMatch) {
                    const expr = illustBoundMatch[1]
                    const literalMatch = expr.match(/^'([^']+)'$/)
                    if (literalMatch) {
                        illustRefs.push({ name: literalMatch[1], file: rel, line: lineNum, raw: illustBoundMatch[0], isDynamic: false })
                    } else {
                        illustRefs.push({ name: expr, file: rel, line: lineNum, raw: illustBoundMatch[0], isDynamic: true })
                    }
                }
            }

            // HfEmpty type prop — these resolve to known illustration paths
            if (inEmpty) {
                const emptyTypeMatch = line.match(/type="([^"]+)"/)
                if (emptyTypeMatch) {
                    const type = emptyTypeMatch[1]
                    if (EMPTY_ILLUSTRATIONS[type]) {
                        illustRefs.push({
                            name: EMPTY_ILLUSTRATIONS[type],
                            file: rel, line: lineNum,
                            raw: `HfEmpty type="${type}"`,
                            isDynamic: false,
                        })
                    }
                }
            }

            // ── Static path strings in JS/template ──

            // /static/icons/ paths in strings
            const iconPathMatches = line.matchAll(/['"`]([^'"`${}]*\/static\/icons\/[^'"`${}]+)['"`]/g)
            for (const m of iconPathMatches) {
                staticPathRefs.push({ pathStr: m[1], file: rel, line: lineNum })
            }

            // /static/images/ paths in strings
            const imgPathMatches = line.matchAll(/['"`]([^'"`${}]*\/static\/images\/[^'"`${}]+)['"`]/g)
            for (const m of imgPathMatches) {
                illustRefs.push({ name: m[1].replace(/^.*\/static\/images\//, ''), file: rel, line: lineNum, raw: m[0], isDynamic: false })
            }
        }
    }

    // Always mark HfEmpty illustrations as referenced (they're resolved at runtime via the ILLUSTRATIONS map)
    for (const [type, illustPath] of Object.entries(EMPTY_ILLUSTRATIONS)) {
        illustRefs.push({ name: illustPath, file: 'components/base/HfEmpty.vue', line: 0, raw: `ILLUSTRATIONS['${type}']`, isDynamic: false })
    }

    return { iconRefs, illustRefs, staticPathRefs }
}

// ─── Step 2: Scan actual files ─────────────────────────────────────────────────

function scanActualFiles() {
    const iconFiles = walkDir(STATIC_ICONS, ['.svg', '.png']).map(f => relPath(f))
    const imageFiles = walkDir(STATIC_IMAGES, ['.svg', '.png', '.jpg', '.jpeg', '.webp']).map(f => relPath(f))
    let oldFiles = []
    if (fs.existsSync(OLD_STATIC)) {
        oldFiles = walkDir(OLD_STATIC, ['.svg', '.png', '.jpg']).map(f => relPath(f))
    }
    return { iconFiles, imageFiles, oldFiles }
}

// ─── Step 3: Cross-reference ───────────────────────────────────────────────────

function crossReference(iconRefs, illustRefs, iconFiles, imageFiles) {
    const missing = []      // { expectedPath, refs[] }
    const unused = []        // { filePath, size }
    const matched = new Set()
    const dynamic = []       // { file, line, expression }

    // Collect all referenced icon file paths (de-duplicated)
    const iconPathToRefs = new Map() // absPath -> ref[]

    for (const ref of iconRefs) {
        if (ref.isDynamic) {
            dynamic.push({ file: ref.file, line: ref.line, expression: ref.name })
            continue
        }

        const candidates = resolveIconCandidates(ref.name)
        let found = false
        for (const candidate of candidates) {
            if (fs.existsSync(candidate)) {
                const rel = relPath(candidate)
                matched.add(rel)
                found = true
                break
            }
        }
        if (!found && candidates.length > 0) {
            const expectedRel = relPath(candidates[0])
            if (!iconPathToRefs.has(expectedRel)) {
                iconPathToRefs.set(expectedRel, [])
            }
            iconPathToRefs.get(expectedRel).push(ref)
        }
    }

    // Collect all referenced illustration file paths
    const illustPathToRefs = new Map()

    for (const ref of illustRefs) {
        if (ref.isDynamic) {
            dynamic.push({ file: ref.file, line: ref.line, expression: ref.name })
            continue
        }

        const absPath = resolveIllustrationPath(ref.name)
        if (fs.existsSync(absPath)) {
            matched.add(relPath(absPath))
        } else {
            const rel = relPath(absPath)
            if (!illustPathToRefs.has(rel)) {
                illustPathToRefs.set(rel, [])
            }
            illustPathToRefs.get(rel).push(ref)
        }
    }

    // Combine missing
    for (const [filePath, refs] of iconPathToRefs) {
        missing.push({ expectedPath: filePath, refs })
    }
    for (const [filePath, refs] of illustPathToRefs) {
        missing.push({ expectedPath: filePath, refs })
    }

    // Find unused files
    for (const f of iconFiles) {
        if (!matched.has(f)) {
            unused.push({ filePath: f, size: fileSize(path.join(ROOT, f)) })
        }
    }
    for (const f of imageFiles) {
        if (!matched.has(f)) {
            unused.push({ filePath: f, size: fileSize(path.join(ROOT, f)) })
        }
    }

    return { missing, unused, matched: matched.size, dynamic }
}

// ─── Step 4 & 5: HfEmpty coverage check ────────────────────────────────────────

function checkHfEmptyCoverage() {
    const results = []
    for (const [type, illustPath] of Object.entries(EMPTY_ILLUSTRATIONS)) {
        const absPath = path.join(STATIC_IMAGES, illustPath)
        const exists = fs.existsSync(absPath)
        const iconName = EMPTY_ICONS[type]
        const iconCandidates = resolveIconCandidates(iconName)
        const iconExists = iconCandidates.some(c => fs.existsSync(c))
        results.push({ type, illustPath, illustExists: exists, iconName, iconExists })
    }
    return results
}

// ─── Step 6: Generate report ───────────────────────────────────────────────────

function generateReport() {
    console.log('\n🔍 SVG 素材审计开始...\n')

    // Step 1
    console.log('  📄 扫描代码引用...')
    const { iconRefs, illustRefs } = scanCodeReferences()

    // Step 2
    console.log('  📂 扫描实际文件...')
    const { iconFiles, imageFiles, oldFiles } = scanActualFiles()

    // Step 3
    console.log('  🔗 交叉对比...')
    const { missing, unused, matched, dynamic } = crossReference(iconRefs, illustRefs, iconFiles, imageFiles)

    // Step 4 & 5
    console.log('  🏷️  检查 HfEmpty 覆盖...')
    const emptyCoverage = checkHfEmptyCoverage()

    // De-duplicate icon names for summary
    const uniqueIconNames = new Set(iconRefs.filter(r => !r.isDynamic).map(r => r.name))
    const uniqueIllustNames = new Set(illustRefs.filter(r => !r.isDynamic).map(r => r.name))

    // ── Build report ──

    const now = new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })
    const lines = []

    lines.push('# SVG 素材审计报告')
    lines.push(`生成时间: ${now}`)
    lines.push('')

    // ── Summary ──
    lines.push('## 总览')
    lines.push(`- 图标文件总数: **${iconFiles.length}**`)
    lines.push(`- 插画文件总数: **${imageFiles.length}**`)
    lines.push(`- 代码引用图标数: **${uniqueIconNames.size}**（去重）`)
    lines.push(`- 代码引用插画数: **${uniqueIllustNames.size}**（去重）`)
    lines.push(`- ❌ 缺失文件数: **${missing.length}** ← 需要修复`)
    lines.push(`- ⚠️ 未引用文件数: **${unused.length}** ← 可清理`)
    lines.push(`- 🔍 动态引用数: **${dynamic.length}** ← 需人工确认`)
    if (oldFiles.length > 0) {
        lines.push(`- 🏚️ 旧目录 src/static/ 残留: **${oldFiles.length}** 个文件`)
    }
    lines.push('')

    // ── Missing files ──
    if (missing.length > 0) {
        lines.push('## ❌ 缺失文件（必须修复）')
        lines.push('')
        lines.push('| 缺失文件路径 | 引用位置 | 行号 | 建议 |')
        lines.push('|---|---|---|---|')
        for (const m of missing) {
            for (const ref of m.refs) {
                const suggestion = m.expectedPath.includes('icons/solar/')
                    ? '需下载或创建此 SVG'
                    : m.expectedPath.includes('images/')
                        ? '需创建插画素材'
                        : '检查路径拼写'
                lines.push(`| \`${m.expectedPath}\` | \`${ref.file}\` | ${ref.line} | ${suggestion} |`)
            }
        }
        lines.push('')
    } else {
        lines.push('## ❌ 缺失文件')
        lines.push('✅ 无缺失文件，所有引用都找到了对应的素材文件！')
        lines.push('')
    }

    // ── Unused files ──
    if (unused.length > 0) {
        lines.push('## ⚠️ 未引用文件（可清理）')
        lines.push('')
        lines.push('| 文件路径 | 大小 | 建议 |')
        lines.push('|---|---|---|')
        for (const u of unused) {
            const suggestion = u.filePath.includes('solar/')
                ? '可能是备用图标，确认后可删除'
                : '确认无动态引用后可删除'
            lines.push(`| \`${u.filePath}\` | ${humanSize(u.size)} | ${suggestion} |`)
        }
        lines.push('')
    } else {
        lines.push('## ⚠️ 未引用文件')
        lines.push('✅ 所有文件都被代码引用，无需清理！')
        lines.push('')
    }

    // ── Dynamic references ──
    if (dynamic.length > 0) {
        lines.push('## 🔍 动态引用（人工确认）')
        lines.push('')
        lines.push('以下引用使用了变量，无法静态分析其实际值，需人工确认：')
        lines.push('')
        lines.push('| 代码位置 | 行号 | 表达式 |')
        lines.push('|---|---|---|')
        for (const d of dynamic) {
            lines.push(`| \`${d.file}\` | ${d.line} | \`:name="${d.expression}"\` |`)
        }
        lines.push('')
    }

    // ── HfEmpty coverage ──
    lines.push('## 🏷️ HfEmpty 类型覆盖检查')
    lines.push('')
    lines.push('| 类型 | 插画路径 | 插画存在 | 回退图标 | 图标存在 |')
    lines.push('|---|---|---|---|---|')
    for (const e of emptyCoverage) {
        const illustStatus = e.illustExists ? '✅' : '❌'
        const iconStatus = e.iconExists ? '✅' : '❌'
        lines.push(`| \`${e.type}\` | \`${e.illustPath}\` | ${illustStatus} | \`${e.iconName}\` | ${iconStatus} |`)
    }
    lines.push('')

    // ── Old static directory ──
    if (oldFiles.length > 0) {
        lines.push('## 🏚️ 旧目录残留 (src/static/)')
        lines.push('')
        lines.push('以下文件在旧目录中，可能需要迁移或清理：')
        lines.push('')
        for (const f of oldFiles) {
            lines.push(`- \`${f}\``)
        }
        lines.push('')
    }

    // ── Matched summary ──
    lines.push('## ✅ 正常匹配统计')
    lines.push(`- 成功匹配: **${matched}** 个文件`)
    lines.push(`- 图标引用总数: ${iconRefs.length} 次（来自 ${uniqueIconNames.size} 个去重名称）`)
    lines.push(`- 插画引用总数: ${illustRefs.length} 次（来自 ${uniqueIllustNames.size} 个去重名称）`)
    lines.push('')

    // ── Write report ──
    const report = lines.join('\n')
    fs.writeFileSync(REPORT_PATH, report, 'utf-8')

    // ── Console summary ──
    console.log('')
    console.log('  ═══════════════════════════════════════')
    console.log('  📊 SVG 素材审计摘要')
    console.log('  ═══════════════════════════════════════')
    console.log(`  📁 图标: ${iconFiles.length} 文件 | 插画: ${imageFiles.length} 文件`)
    console.log(`  📝 代码引用: ${uniqueIconNames.size} 图标 + ${uniqueIllustNames.size} 插画`)
    console.log(`  ✅ 匹配: ${matched}`)
    console.log(`  ❌ 缺失: ${missing.length}`)
    console.log(`  ⚠️  未引用: ${unused.length}`)
    console.log(`  🔍 动态引用: ${dynamic.length}`)
    if (oldFiles.length > 0) {
        console.log(`  🏚️  旧目录残留: ${oldFiles.length}`)
    }
    console.log('  ═══════════════════════════════════════')
    console.log(`  📄 完整报告: ${relPath(REPORT_PATH)}`)
    console.log('')

    if (missing.length > 0) {
        console.log('  ❌ 缺失文件:')
        for (const m of missing) {
            console.log(`     → ${m.expectedPath}`)
            for (const ref of m.refs.slice(0, 3)) {
                console.log(`       引用: ${ref.file}:${ref.line}`)
            }
            if (m.refs.length > 3) {
                console.log(`       ... 还有 ${m.refs.length - 3} 处引用`)
            }
        }
        console.log('')
    }
}

// ─── Run ───────────────────────────────────────────────────────────────────────

generateReport()
