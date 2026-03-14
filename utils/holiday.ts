export type HolidayType = 'official' | 'traditional' | 'special' | 'international'

export interface HolidayInfo {
  name: string
  shortName: string
  slogan: string
  type: HolidayType
}

export interface LunarDate {
  year: number
  month: number
  day: number
  isLeap: boolean
}

const BASE_DATE_UTC = Date.UTC(1900, 0, 31)

// Lunar data range: 1900-2100
const LUNAR_INFO = [
  0x04bd8, 0x04ae0, 0x0a570, 0x054d5, 0x0d260, 0x0d950, 0x16554, 0x056a0, 0x09ad0, 0x055d2,
  0x04ae0, 0x0a5b6, 0x0a4d0, 0x0d250, 0x1d255, 0x0b540, 0x0d6a0, 0x0ada2, 0x095b0, 0x14977,
  0x04970, 0x0a4b0, 0x0b4b5, 0x06a50, 0x06d40, 0x1ab54, 0x02b60, 0x09570, 0x052f2, 0x04970,
  0x06566, 0x0d4a0, 0x0ea50, 0x06e95, 0x05ad0, 0x02b60, 0x186e3, 0x092e0, 0x1c8d7, 0x0c950,
  0x0d4a0, 0x1d8a6, 0x0b550, 0x056a0, 0x1a5b4, 0x025d0, 0x092d0, 0x0d2b2, 0x0a950, 0x0b557,
  0x06ca0, 0x0b550, 0x15355, 0x04da0, 0x0a5d0, 0x14573, 0x052d0, 0x0a9a8, 0x0e950, 0x06aa0,
  0x0aea6, 0x0ab50, 0x04b60, 0x0aae4, 0x0a570, 0x05260, 0x0f263, 0x0d950, 0x05b57, 0x056a0,
  0x096d0, 0x04dd5, 0x04ad0, 0x0a4d0, 0x0d4d4, 0x0d250, 0x0d558, 0x0b540, 0x0b5a0, 0x195a6,
  0x095b0, 0x049b0, 0x0a974, 0x0a4b0, 0x0b27a, 0x06a50, 0x06d40, 0x0af46, 0x0ab60, 0x09570,
  0x04af5, 0x04970, 0x064b0, 0x074a3, 0x0ea50, 0x06b58, 0x05ac0, 0x0ab60, 0x096d5, 0x092e0,
  0x0c960, 0x0d954, 0x0d4a0, 0x0da50, 0x07552, 0x056a0, 0x0abb7, 0x025d0, 0x092d0, 0x0cab5,
  0x0a950, 0x0b4a0, 0x0baa4, 0x0ad50, 0x055d9, 0x04ba0, 0x0a5b0, 0x15176, 0x052b0, 0x0a930,
  0x07954, 0x06aa0, 0x0ad50, 0x05b52, 0x04b60, 0x0a6e6, 0x0a4e0, 0x0d260, 0x0ea65, 0x0d530,
  0x05aa0, 0x076a3, 0x096d0, 0x04bd7, 0x04ad0, 0x0a4d0, 0x1d0b6, 0x0d250, 0x0d520, 0x0dd45,
  0x0b5a0, 0x056d0, 0x055b2, 0x049b0, 0x0a577, 0x0a4b0, 0x0aa50, 0x1b255, 0x06d20, 0x0ada0,
  0x14b63, 0x09370, 0x049f8, 0x04970, 0x064b0, 0x168a6, 0x0ea50, 0x06b20, 0x1a6c4, 0x0aae0,
  0x0a2e0, 0x0d2e3, 0x0c960, 0x0d557, 0x0d4a0, 0x0da50, 0x05d55, 0x056a0, 0x0a6d0, 0x055d4,
  0x052d0, 0x0a9b8, 0x0a950, 0x0b4a0, 0x0b6a6, 0x0ad50, 0x055a0, 0x0aba4, 0x0a5b0, 0x052b0,
  0x0b273, 0x06930, 0x07337, 0x06aa0, 0x0ad50, 0x14b55, 0x04b60, 0x0a570, 0x054e4, 0x0d160,
  0x0e968, 0x0d520, 0x0daa0, 0x16aa6, 0x056d0, 0x04ae0, 0x0a9d4, 0x0a2d0, 0x0d150, 0x0f252,
  0x0d520,
]

const SOLAR_OFFICIAL: Record<string, Omit<HolidayInfo, 'type'>> = {
  '01-01': { name: '元旦', shortName: '元旦', slogan: '新年新计划，从今天开始。' },
  '05-01': { name: '劳动节', shortName: '劳动', slogan: '每一次坚持，都是对生活的认真回应。' },
  '10-01': { name: '国庆节', shortName: '国庆', slogan: '把目标排进今天，让热爱落在行动上。' },
}

const SOLAR_SPECIAL: Record<string, Omit<HolidayInfo, 'type'>> = {
  '02-14': { name: '情人节', shortName: '情人', slogan: '认真生活的人，也在认真爱自己。' },
  '03-08': { name: '妇女节', shortName: '妇女', slogan: '愿每一次努力都被温柔看见。' },
  '03-12': { name: '植树节', shortName: '植树', slogan: '播种今天的习惯，收获未来的自己。' },
  '05-04': { name: '青年节', shortName: '青年', slogan: '保持锋利，也保持长期主义。' },
  '06-01': { name: '儿童节', shortName: '儿童', slogan: '保留好奇心，行动会更有生命力。' },
  '07-01': { name: '建党节', shortName: '七一', slogan: '目标清晰，步伐就会稳定。' },
  '08-01': { name: '建军节', shortName: '八一', slogan: '自律让节奏更坚定。' },
  '09-10': { name: '教师节', shortName: '教师', slogan: '向坚持与引导致敬。' },
  '09-30': { name: '烈士纪念日', shortName: '纪念', slogan: '记住来路，坚定前行。' },
  '11-11': { name: '购物节', shortName: '双11', slogan: '先下单自己的成长，再下单物品。' },
  '12-24': { name: '平安夜', shortName: '平安', slogan: '保持节奏，给自己一份安心。' },
  '12-25': { name: '圣诞节', shortName: '圣诞', slogan: '愿坚持成为送给自己的礼物。' },
  '12-31': { name: '跨年夜', shortName: '跨年', slogan: '把今年最后一天，过成最有仪式感的一天。' },
}

const LUNAR_OFFICIAL: Record<string, Omit<HolidayInfo, 'type'>> = {
  '01-01': { name: '春节', shortName: '春节', slogan: '从新春第一天开始，稳稳走在目标上。' },
  '05-05': { name: '端午节', shortName: '端午', slogan: '把专注留给重要的事。' },
  '08-15': { name: '中秋节', shortName: '中秋', slogan: '团圆也要记得和目标保持连接。' },
}

const LUNAR_TRADITIONAL: Record<string, Omit<HolidayInfo, 'type'>> = {
  '01-15': { name: '元宵节', shortName: '元宵', slogan: '点亮今天，继续发光。' },
  '02-02': { name: '龙抬头', shortName: '龙抬头', slogan: '抬头向前，状态重新起航。' },
  '03-03': { name: '上巳节', shortName: '上巳', slogan: '整理心绪，轻装前进。' },
  '07-07': { name: '七夕节', shortName: '七夕', slogan: '爱意和自律，都要落在日常。' },
  '07-15': { name: '中元节', shortName: '中元', slogan: '回望与前行，都是生活的一部分。' },
  '09-09': { name: '重阳节', shortName: '重阳', slogan: '登高望远，也别忘了今日小目标。' },
  '12-08': { name: '腊八节', shortName: '腊八', slogan: '冬日慢下来，习惯不要停下来。' },
  '12-23': { name: '小年', shortName: '小年', slogan: '提前整理节奏，过年更从容。' },
}

const WEEK_BASED_HOLIDAYS = [
  {
    month: 5,
    weekday: 0,
    nth: 2,
    info: { name: '母亲节', shortName: '母亲', slogan: '感谢每一份温柔，也照顾好自己。', type: 'international' as const },
  },
  {
    month: 6,
    weekday: 0,
    nth: 3,
    info: { name: '父亲节', shortName: '父亲', slogan: '稳定与担当，体现在每个坚持的今天。', type: 'international' as const },
  },
  {
    month: 11,
    weekday: 4,
    nth: 4,
    info: { name: '感恩节', shortName: '感恩', slogan: '感谢已完成，也珍惜下一次努力。', type: 'international' as const },
  },
]

const HOLIDAY_TYPE_PRIORITY: Record<HolidayType, number> = {
  official: 1,
  traditional: 2,
  special: 3,
  international: 4,
}

export const HOLIDAY_TYPE_LABEL: Record<HolidayType, string> = {
  official: '法定节日',
  traditional: '传统节日',
  special: '节日纪念',
  international: '国际节日',
}

function pad(num: number): string {
  return String(num).padStart(2, '0')
}

function parseDate(dateStr: string): { year: number; month: number; day: number } | null {
  const [year, month, day] = (dateStr || '').split('-').map(Number)
  if (!year || !month || !day) return null
  return { year, month, day }
}

function toDateKey(month: number, day: number): string {
  return `${pad(month)}-${pad(day)}`
}

function isLeapYear(year: number): boolean {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0)
}

function getQingmingDay(year: number): number {
  const y = year % 100
  const c = year >= 2000 ? 4.81 : 5.59
  let day = Math.floor(y * 0.2422 + c) - Math.floor((y - 1) / 4)
  if (isLeapYear(year) && year >= 2000 && day > 4) {
    day -= 1
  }
  return Math.max(4, Math.min(6, day))
}

function nthWeekdayOfMonth(year: number, month: number, weekday: number, nth: number): number {
  const firstWeekday = new Date(Date.UTC(year, month - 1, 1)).getUTCDay()
  const offset = (weekday - firstWeekday + 7) % 7
  const day = 1 + offset + (nth - 1) * 7
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate()
  if (day > daysInMonth) return -1
  return day
}

function leapMonth(year: number): number {
  return LUNAR_INFO[year - 1900] & 0xf
}

function leapDays(year: number): number {
  if (leapMonth(year)) {
    return (LUNAR_INFO[year - 1900] & 0x10000) ? 30 : 29
  }
  return 0
}

function monthDays(year: number, month: number): number {
  return (LUNAR_INFO[year - 1900] & (0x10000 >> month)) ? 30 : 29
}

function lunarYearDays(year: number): number {
  let sum = 348
  for (let i = 0x8000; i > 0x8; i >>= 1) {
    sum += (LUNAR_INFO[year - 1900] & i) ? 1 : 0
  }
  return sum + leapDays(year)
}

export function getLunarDate(dateStr: string): LunarDate | null {
  const parsed = parseDate(dateStr)
  if (!parsed) return null
  return solarToLunar(parsed.year, parsed.month, parsed.day)
}

function solarToLunar(year: number, month: number, day: number): LunarDate | null {
  if (year < 1900 || year > 2100) return null
  const targetUtc = Date.UTC(year, month - 1, day)
  let offset = Math.floor((targetUtc - BASE_DATE_UTC) / 86400000)
  if (offset < 0) return null

  let lunarYear = 1900
  let daysInYear = 0
  while (lunarYear < 2101 && offset > 0) {
    daysInYear = lunarYearDays(lunarYear)
    offset -= daysInYear
    if (offset < 0) {
      offset += daysInYear
      break
    }
    lunarYear += 1
  }

  let lunarMonth = 1
  let isLeap = false
  const leap = leapMonth(lunarYear)
  let daysInMonth = 0

  while (lunarMonth <= 12 && offset > 0) {
    if (leap > 0 && lunarMonth === leap + 1 && !isLeap) {
      lunarMonth -= 1
      isLeap = true
      daysInMonth = leapDays(lunarYear)
    } else {
      daysInMonth = monthDays(lunarYear, lunarMonth)
    }
    offset -= daysInMonth
    if (isLeap && lunarMonth === leap + 1) {
      isLeap = false
    }
    lunarMonth += 1
  }

  if (offset === 0 && leap > 0 && lunarMonth === leap + 1) {
    if (isLeap) {
      isLeap = false
    } else {
      isLeap = true
      lunarMonth -= 1
    }
  }

  if (offset < 0) {
    offset += daysInMonth
    lunarMonth -= 1
  }

  return {
    year: lunarYear,
    month: lunarMonth,
    day: offset + 1,
    isLeap,
  }
}

function getWeekBasedHoliday(year: number, month: number, day: number): HolidayInfo | null {
  for (const item of WEEK_BASED_HOLIDAYS) {
    if (item.month !== month) continue
    const targetDay = nthWeekdayOfMonth(year, month, item.weekday, item.nth)
    if (targetDay === day) return item.info
  }
  return null
}

function getLunarHoliday(lunar: LunarDate): HolidayInfo | null {
  if (lunar.isLeap) return null

  const key = toDateKey(lunar.month, lunar.day)
  const official = LUNAR_OFFICIAL[key]
  if (official) {
    return { ...official, type: 'official' }
  }

  const traditional = LUNAR_TRADITIONAL[key]
  if (traditional) {
    return { ...traditional, type: 'traditional' }
  }

  const monthLastDay = monthDays(lunar.year, 12)
  if (lunar.month === 12 && lunar.day === monthLastDay) {
    return {
      name: '除夕',
      shortName: '除夕',
      slogan: '给今年一个漂亮收尾，也给明天一个新开始。',
      type: 'traditional',
    }
  }

  return null
}

export function getHolidayInfo(dateStr: string): HolidayInfo | null {
  const parsed = parseDate(dateStr)
  if (!parsed) return null
  const { year, month, day } = parsed
  const solarKey = toDateKey(month, day)
  const hits: HolidayInfo[] = []

  const qingmingDay = getQingmingDay(year)
  if (month === 4 && day === qingmingDay) {
    hits.push({
      name: '清明节',
      shortName: '清明',
      slogan: '清明风起，保持节奏，认真生活。',
      type: 'official',
    })
  } else if (month === 4 && day === qingmingDay - 1) {
    hits.push({
      name: '寒食节',
      shortName: '寒食',
      slogan: '收一收喧闹，回到内心的秩序。',
      type: 'traditional',
    })
  }

  const solarOfficial = SOLAR_OFFICIAL[solarKey]
  if (solarOfficial) hits.push({ ...solarOfficial, type: 'official' })

  const solarSpecial = SOLAR_SPECIAL[solarKey]
  if (solarSpecial) {
    const specialType: HolidayType = solarSpecial.name.includes('圣诞') || solarSpecial.name.includes('情人')
      ? 'international'
      : 'special'
    hits.push({ ...solarSpecial, type: specialType })
  }

  const weekHoliday = getWeekBasedHoliday(year, month, day)
  if (weekHoliday) hits.push(weekHoliday)

  const lunar = solarToLunar(year, month, day)
  if (lunar) {
    const lunarHoliday = getLunarHoliday(lunar)
    if (lunarHoliday) hits.push(lunarHoliday)
  }

  if (hits.length === 0) return null
  hits.sort((a, b) => HOLIDAY_TYPE_PRIORITY[a.type] - HOLIDAY_TYPE_PRIORITY[b.type])

  if (hits.length === 1) return hits[0]

  const primary = hits[0]
  const secondary = hits[1]
  return {
    ...primary,
    name: `${primary.name} · ${secondary.name}`,
  }
}

const SOLAR_TERMS = [
  "小寒", "大寒", "立春", "雨水", "惊蛰", "春分", "清明", "谷雨",
  "立夏", "小满", "芒种", "夏至", "小暑", "大暑", "立秋", "处暑",
  "白露", "秋分", "寒露", "霜降", "立冬", "小雪", "大雪", "冬至"
]

const ST_INFO = [
  0, 21208, 42467, 63836, 85337, 107014, 128867, 150921,
  173149, 195551, 218072, 240693, 263343, 285989, 308563, 331033,
  353350, 375494, 397447, 419210, 440795, 462224, 483532, 504758
]

export interface UpcomingHoliday {
  dateStr: string
  name: string
  shortName: string
  slogan: string
  type: HolidayType
  daysUntil: number
}

export function getUpcomingHolidays(year: number, month: number, todayStr: string, limit = 6): UpcomingHoliday[] {
  const todayParsed = parseDate(todayStr)
  if (!todayParsed) return []
  const todayUtc = Date.UTC(todayParsed.year, todayParsed.month - 1, todayParsed.day)

  const results: UpcomingHoliday[] = []
  const seen = new Set<string>()

  const scanMonth = (y: number, m: number) => {
    const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate()
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${y}-${pad(m)}-${pad(d)}`
      const info = getHolidayInfo(dateStr)
      if (!info) continue
      if (seen.has(dateStr)) continue
      seen.add(dateStr)

      const dateUtc = Date.UTC(y, m - 1, d)
      const daysUntil = Math.round((dateUtc - todayUtc) / 86400000)

      results.push({
        dateStr,
        name: info.name,
        shortName: info.shortName,
        slogan: info.slogan,
        type: info.type,
        daysUntil,
      })
    }
  }

  // Scan current + next month first, then expand up to 6 months to guarantee at least 1 result
  let scanY = year
  let scanM = month
  for (let i = 0; i < 6; i++) {
    scanMonth(scanY, scanM)
    if (i >= 1 && results.length >= 1) break // After current+next, stop once we have results
    scanM += 1
    if (scanM > 12) { scanM = 1; scanY += 1 }
  }

  // Split into past and upcoming
  const past = results.filter(h => h.daysUntil < 0).sort((a, b) => b.daysUntil - a.daysUntil) // most recent past first
  const upcoming = results.filter(h => h.daysUntil >= 0).sort((a, b) => a.daysUntil - b.daysUntil) // soonest first

  // Keep max 1 past + max 2 upcoming
  const selected = [
    ...past.slice(0, 1),
    ...upcoming.slice(0, 2),
  ]

  selected.sort((a, b) => a.dateStr.localeCompare(b.dateStr))
  return selected
}

export function getSolarTerm(dateStr: string): string | null {
  const parsed = parseDate(dateStr)
  if (!parsed) return null
  const { year, month, day } = parsed

  if (year < 1900 || year > 2100) return null

  const targetUtc = Date.UTC(year, month - 1, day)

  // Calculate specific moments for all terms in the year to see if the target date matches any
  for (let i = 0; i < 24; i++) {
    const termMins = 31556925974.7 * (year - 1900) + ST_INFO[i] * 60000 + Date.UTC(1900, 0, 6, 2, 5, 0)
    const termDate = new Date(termMins)

    if (termDate.getUTCMonth() + 1 === month && termDate.getUTCDate() === day) {
      return SOLAR_TERMS[i]
    }
  }

  return null
}
