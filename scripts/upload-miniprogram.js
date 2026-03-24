/**
 * Upload WeChat Mini Program via miniprogram-ci
 *
 * Usage:
 *   node scripts/upload-miniprogram.js --version 1.0.1 --desc "feat: profile sync" --robot 2
 *
 * Requires:
 *   - miniprogram-ci (devDependency)
 *   - Private key: env WECHAT_CI_PRIVATE_KEY_PATH or .wxci/private.<appid>.key
 */

const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')

// ── Fix: miniprogram-ci bundles less@4 (ESM) which breaks in Node 22+ worker threads.
//    Downgrade to less@3 (CJS) if needed. ──

const ciLessDir = path.join(__dirname, '..', 'node_modules', 'miniprogram-ci', 'node_modules', 'less')
if (fs.existsSync(ciLessDir)) {
  try {
    const lessPkg = JSON.parse(fs.readFileSync(path.join(ciLessDir, 'package.json'), 'utf8'))
    if (lessPkg.type === 'module') {
      console.log('Patching miniprogram-ci: replacing less@4 (ESM) with less@3 (CJS)...')
      fs.rmSync(ciLessDir, { recursive: true, force: true })
      execSync('npm pack less@3.13.1', { cwd: path.dirname(ciLessDir), stdio: 'pipe' })
      fs.mkdirSync(ciLessDir, { recursive: true })
      execSync('tar xzf ../less-3.13.1.tgz --strip-components=1', { cwd: ciLessDir, stdio: 'pipe' })
      fs.unlinkSync(path.join(path.dirname(ciLessDir), 'less-3.13.1.tgz'))
      console.log('Patched successfully.\n')
    }
  } catch (e) {
    console.warn('Warning: failed to patch less version:', e.message)
  }
}

const ci = require('miniprogram-ci')

// ── Parse CLI args ──

function parseArgs(argv) {
  const result = {}
  for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith('--') && i + 1 < argv.length) {
      result[argv[i].slice(2)] = argv[i + 1]
      i++
    }
  }
  return result
}

const args = parseArgs(process.argv.slice(2))

// ── Resolve paths ──

const projectRoot = path.resolve(__dirname, '..')
const devtoolsDir = path.join(projectRoot, '_mp_devtools')
const projectConfigPath = path.join(projectRoot, 'project.config.json')

if (!fs.existsSync(path.join(devtoolsDir, 'app.json'))) {
  console.error('ERROR: _mp_devtools/app.json not found.')
  console.error('Please run `npm run prepare:wechat` first.')
  process.exit(1)
}

// ── Read appid from project.config.json ──

const projectConfig = JSON.parse(fs.readFileSync(projectConfigPath, 'utf8'))
const appid = projectConfig.appid
if (!appid) {
  console.error('ERROR: appid not found in project.config.json')
  process.exit(1)
}

// ── Resolve private key ──

const envKeyPath = process.env.WECHAT_CI_PRIVATE_KEY_PATH
const fallbackKeyPath = path.join(projectRoot, `.wxci/private.${appid}.key`)

let privateKeyPath
if (envKeyPath && fs.existsSync(envKeyPath)) {
  privateKeyPath = envKeyPath
} else if (fs.existsSync(fallbackKeyPath)) {
  privateKeyPath = fallbackKeyPath
} else {
  console.error('ERROR: No private key found.')
  console.error(`  Set env WECHAT_CI_PRIVATE_KEY_PATH or place key at:`)
  console.error(`  ${fallbackKeyPath}`)
  process.exit(1)
}

// ── Upload params ──

const version = args.version || '1.0.0'
const desc = args.desc || `Upload at ${new Date().toISOString()}`
const robot = parseInt(args.robot || '1', 10)

console.log(`\nUploading Mini Program...`)
console.log(`  appid:   ${appid}`)
console.log(`  version: ${version}`)
console.log(`  desc:    ${desc}`)
console.log(`  robot:   ${robot}`)
console.log(`  project: ${devtoolsDir}`)
console.log(`  key:     ${privateKeyPath}\n`)


// ── Trim unused static assets from main package ──
// onboarding SVGs are inlined via illustration-map.js (base64); the raw files are dead weight.

const unusedStaticDirs = ['static/images/onboarding']
for (const rel of unusedStaticDirs) {
  const dir = path.join(devtoolsDir, rel)
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true })
    console.log(`Trimmed unused: ${rel}`)
  }
}

// ── Patch _mp_devtools/project.config.json to disable compilation ──
// miniprogram-ci reads settings from the project's own project.config.json,
// sometimes ignoring the `setting` parameter passed to ci.upload().
// HBuilderX already produces final output, so we must disable es6/es7/minify
// to prevent miniprogram-ci from choking on ES2019+ syntax (??, ?.).

const devtoolsConfigPath = path.join(devtoolsDir, 'project.config.json')
if (fs.existsSync(devtoolsConfigPath)) {
  const devtoolsConfig = JSON.parse(fs.readFileSync(devtoolsConfigPath, 'utf8'))
  devtoolsConfig.setting = {
    ...(devtoolsConfig.setting || {}),
    es6: false,
    es7: false,
    minified: false,
    minifyWXSS: false,
    minifyWXML: false,
  }
  fs.writeFileSync(devtoolsConfigPath, JSON.stringify(devtoolsConfig, null, 2), 'utf8')
  console.log('Patched _mp_devtools/project.config.json: disabled es6/es7/minify')
}

// ── Execute upload ──

const project = new ci.Project({
  appid,
  type: 'miniProgram',
  projectPath: devtoolsDir,
  privateKeyPath,
  ignores: ['node_modules/**/*'],
})

const uploadSetting = {
  es6: false,
  es7: false,
  minified: false,
  minifyWXSS: false,
  minifyWXML: false,
}

ci.upload({
  project,
  version,
  desc,
  robot,
  setting: uploadSetting,
})
  .then((res) => {
    console.log('Upload succeeded!')
    if (res) console.log(JSON.stringify(res, null, 2))
  })
  .catch((err) => {
    console.error('Upload failed:', err.message || err)
    process.exit(1)
  })
