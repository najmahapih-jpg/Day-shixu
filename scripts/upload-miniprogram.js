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

const ci = require('miniprogram-ci')
const fs = require('fs')
const path = require('path')

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

// ── Execute upload ──

const project = new ci.Project({
  appid,
  type: 'miniProgram',
  projectPath: devtoolsDir,
  privateKeyPath,
  ignores: ['node_modules/**/*'],
})

ci.upload({
  project,
  version,
  desc,
  robot,
  setting: projectConfig.setting || {},
})
  .then((res) => {
    console.log('Upload succeeded!')
    if (res) console.log(JSON.stringify(res, null, 2))
  })
  .catch((err) => {
    console.error('Upload failed:', err.message || err)
    process.exit(1)
  })
