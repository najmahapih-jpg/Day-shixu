#!/usr/bin/env node
/**
 * Copy cloudfunctions/_shared/streak.js into each cloud function that
 * uses it. WeChat cloud functions package per-directory, so each
 * function needs its own copy at deploy time.
 *
 * Run after editing _shared/streak.js. Parity test enforces this.
 */
const fs = require('fs')
const path = require('path')

const ROOT = path.resolve(__dirname, '..')
const CANONICAL = path.join(ROOT, '_shared', 'streak.js')
const TARGETS = ['habit', 'ritual', 'stats', 'backfill-streaks']

const src = fs.readFileSync(CANONICAL)
for (const fn of TARGETS) {
  const dest = path.join(ROOT, fn, 'streak.js')
  fs.writeFileSync(dest, src)
  console.log(`wrote ${path.relative(ROOT, dest)}`)
}
console.log('done.')
