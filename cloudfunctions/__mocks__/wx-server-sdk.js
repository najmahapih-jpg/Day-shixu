/**
 * wx-server-sdk mock for Jest
 * Provides controllable behavior for cloud DB and openapi calls.
 */

// ── DB mock store ──────────────────────────────────────

const _collections = {}

function _getCol(name) {
  if (!_collections[name]) _collections[name] = []
  return _collections[name]
}

function _resetDB() {
  Object.keys(_collections).forEach(k => delete _collections[k])
}

// ── Mock implementations ───────────────────────────────

let _msgSecCheckResult = { result: { suggest: 'pass', label: 0 } }
let _wxContext = { OPENID: 'test-openid', APPID: 'test-appid' }

function setMsgSecCheckResult(result) {
  _msgSecCheckResult = result
  // Re-set the mock implementation to use updated result
  cloud.openapi.security.msgSecCheck.mockImplementation(
    () => Promise.resolve(_msgSecCheckResult),
  )
}

function setWXContext(ctx) {
  _wxContext = ctx
}

// ── command helpers ─────────────────────────────────────

function _matchCondition(doc, condition) {
  for (const [key, val] of Object.entries(condition)) {
    const docVal = doc[key]
    if (val && typeof val === 'object' && val.__type) {
      // Handle command operators
      switch (val.__type) {
        case 'neq':
          if (docVal === val.__value) return false
          break
        case 'gte':
          if (docVal < val.__value) return false
          break
        case 'lte':
          if (docVal > val.__value) return false
          break
        case 'in':
          if (!val.__value.includes(docVal)) return false
          break
        case 'and':
          for (const sub of val.__conditions) {
            if (!_matchCondition(doc, { [key]: sub })) return false
          }
          break
        default:
          if (docVal !== val) return false
      }
    } else {
      if (docVal !== val) return false
    }
  }
  return true
}

const command = {
  neq: (v) => ({ __type: 'neq', __value: v }),
  gte: (v) => ({
    __type: 'gte',
    __value: v,
    and: (other) => ({ __type: 'and', __conditions: [{ __type: 'gte', __value: v }, other] }),
  }),
  lte: (v) => ({ __type: 'lte', __value: v }),
  in: (v) => ({ __type: 'in', __value: v }),
  inc: (v) => ({ __type: 'inc', __value: v }),
}

// ── Collection & query chain ───────────────────────────

function createQueryChain(colName, where) {
  let _limit = 100
  let _skip = 0
  let _orderKey = null
  let _orderDir = 'asc'

  const chain = {
    where: (w) => createQueryChain(colName, w),
    orderBy: (key, dir) => { _orderKey = key; _orderDir = dir; return chain },
    limit: (n) => { _limit = n; return chain },
    skip: (n) => { _skip = n; return chain },
    count: () => {
      const col = _getCol(colName)
      const matched = where ? col.filter(d => _matchCondition(d, where)) : col
      return Promise.resolve({ total: matched.length })
    },
    get: () => {
      const col = _getCol(colName)
      let matched = where ? col.filter(d => _matchCondition(d, where)) : [...col]
      if (_orderKey) {
        matched.sort((a, b) => {
          if (_orderDir === 'asc') return a[_orderKey] < b[_orderKey] ? -1 : 1
          return a[_orderKey] > b[_orderKey] ? -1 : 1
        })
      }
      return Promise.resolve({ data: matched.slice(_skip, _skip + _limit) })
    },
    update: ({ data: updateData }) => {
      const col = _getCol(colName)
      let updated = 0
      col.forEach((doc, i) => {
        if (where && _matchCondition(doc, where)) {
          Object.entries(updateData).forEach(([k, v]) => {
            if (v && typeof v === 'object' && v.__type === 'inc') {
              col[i][k] = (col[i][k] || 0) + v.__value
            } else {
              col[i][k] = v
            }
          })
          updated++
        }
      })
      return Promise.resolve({ stats: { updated } })
    },
  }
  return chain
}

function createDocRef(colName, docId) {
  return {
    get: () => {
      const col = _getCol(colName)
      const doc = col.find(d => d._id === docId)
      if (!doc) return Promise.reject(new Error('document not found'))
      return Promise.resolve({ data: doc })
    },
    update: ({ data: updateData }) => {
      const col = _getCol(colName)
      const idx = col.findIndex(d => d._id === docId)
      if (idx === -1) return Promise.reject(new Error('document not found'))
      Object.entries(updateData).forEach(([k, v]) => {
        if (v && typeof v === 'object' && v.__type === 'inc') {
          col[idx][k] = (col[idx][k] || 0) + v.__value
        } else {
          col[idx][k] = v
        }
      })
      return Promise.resolve({ stats: { updated: 1 } })
    },
    remove: () => {
      const col = _getCol(colName)
      const idx = col.findIndex(d => d._id === docId)
      if (idx !== -1) col.splice(idx, 1)
      return Promise.resolve({ stats: { removed: 1 } })
    },
  }
}

function collection(name) {
  let _id_counter = 0
  return {
    where: (w) => createQueryChain(name, w),
    orderBy: (key, dir) => createQueryChain(name, null),
    limit: (n) => createQueryChain(name, null),
    doc: (id) => createDocRef(name, id),
    add: ({ data }) => {
      const col = _getCol(name)
      const _id = data._id || `mock-id-${++_id_counter}`
      const doc = { ...data, _id }
      col.push(doc)
      return Promise.resolve({ _id })
    },
    count: () => {
      const col = _getCol(name)
      return Promise.resolve({ total: col.length })
    },
    get: () => {
      const col = _getCol(name)
      return Promise.resolve({ data: [...col] })
    },
  }
}

// ── Exports ────────────────────────────────────────────

const cloud = {
  init: jest.fn(),
  DYNAMIC_CURRENT_ENV: 'test-env',
  database: () => ({
    collection,
    command,
    serverDate: () => new Date().toISOString(),
  }),
  getWXContext: () => _wxContext,
  openapi: {
    security: {
      msgSecCheck: jest.fn(() => Promise.resolve(_msgSecCheckResult)),
    },
    subscribeMessage: {
      send: jest.fn(() => Promise.resolve({ errCode: 0 })),
    },
  },
}

// Test helpers
cloud.__resetDB = _resetDB
cloud.__setMsgSecCheckResult = setMsgSecCheckResult
cloud.__setWXContext = setWXContext
cloud.__getCol = _getCol

module.exports = cloud
