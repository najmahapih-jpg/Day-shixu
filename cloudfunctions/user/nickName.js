const GraphemeSplitter = require('grapheme-splitter')

const splitter = new GraphemeSplitter()
const CONTROL_CHAR_REGEX = /[\x00-\x1f]/g
const MAX_NICK_NAME_GRAPHEMES = 20

function sanitizeNickName(raw) {
  if (typeof raw !== 'string') return ''
  return raw.trim().replace(CONTROL_CHAR_REGEX, '')
}

function countNickNameGraphemes(raw) {
  const value = sanitizeNickName(raw)
  if (!value) return 0
  return splitter.countGraphemes(value)
}

function normalizeNickName(raw) {
  const value = sanitizeNickName(raw)
  if (!value) return ''
  if (countNickNameGraphemes(value) > MAX_NICK_NAME_GRAPHEMES) return ''
  return value
}

module.exports = {
  MAX_NICK_NAME_GRAPHEMES,
  countNickNameGraphemes,
  normalizeNickName,
}
