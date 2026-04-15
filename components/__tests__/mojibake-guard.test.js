const fs = require('fs')
const path = require('path')

const CASES = [
  {
    file: path.resolve(__dirname, '../../pages/timeline/index.vue'),
    required: [
      '加载中...',
      '这一天没有习惯记录',
      '今天没有安排',
      '今天没有安排习惯',
      '+ 创建习惯',
      '凌晨',
      '黎明',
      '清晨',
      '上午',
      '午间',
      '下午',
      '傍晚',
      '夜间',
      '删除习惯',
      '删除后会进入归档，你仍然可以在归档中恢复。',
      '今天都已完成',
      '还有 ${count} 项待完成',
      '未设提醒',
      "'用户'",
    ],
    forbidden: [
      '鍔犺浇涓',
      '杩欎竴澶╂病鏈変範鎯褰',
      '浠婂ぉ娌℃湁瀹夋帓',
      '鍒涘缓涔犳儻',
      '鍑屾櫒',
      '榛庢槑',
      '娓呮櫒',
      '涓婂崍',
      '鍗堥棿',
      '涓嬪崍',
      '鍌嶆櫄',
      '澶滈棿',
      '鐢ㄦ埛',
    ],
  },
  {
    file: path.resolve(__dirname, '../../components/timeline/TimelineCalendarDetail.vue'),
    required: ['今天没有安排习惯', '查看其他日期的打卡记录（即将开放）'],
    forbidden: ['浠婂ぉ娌℃湁瀹夋帓涔犳儻', '鏌ョ湅鍏朵粬鏃ユ湡鐨勬墦鍗'],
  },
  {
    file: path.resolve(__dirname, '../../services/cloud.ts'),
    required: ['网络不可用，请检查连接', '登录状态失效，请重新进入小程序', '[云函数调用失败]'],
    forbidden: ['缃戠粶涓嶅彲鐢', '鐧诲綍鐘舵€佸け鏁', '[浜戝嚱鏁拌皟鐢ㄥけ璐'],
  },
  {
    file: path.resolve(__dirname, '../../stores/board.ts'),
    required: ['清单至少需要 1 项内容', '便签内容不能为空', '云端暂不可用，已切换到本地模式'],
    forbidden: ['娓呭崟鑷冲皯闇€瑕', '渚跨鍐呭涓嶈兘涓虹┖', '浜戠鏆備笉鍙敤'],
  },
  {
    file: path.resolve(__dirname, '../../cloudfunctions/board/index.ts'),
    required: ['缺少便签数据', '便签数量已达上限', '未获取到用户身份', '服务器错误，请稍后重试'],
    forbidden: ['缂哄皯渚跨鏁版嵁', '渚跨鏁伴噺宸茶揪涓婇檺', '鏈幏鍙栧埌鐢ㄦ埛韬唤', '鏈嶅姟鍣ㄩ敊璇'],
  },
  {
    file: path.resolve(__dirname, '../../utils/publicCopy.ts'),
    required: ['首次进入', '轻启篇', '把第一件小事', 'Journey', '查看当前旅程进度'],
    forbidden: ['棣栨杩涘叆', '杞诲惎绡', '鎶婄涓€浠跺皬浜', '鏌ョ湅褰撳墠鏃呯▼杩涘害'],
  },
  {
    file: path.resolve(__dirname, '../../components/home/HomeWeekShowcase.vue'),
    required: ['本周节奏', '周{{ card.weekday }}'],
    forbidden: ['????', '?{{ card.weekday }}'],
  },
  {
    file: path.resolve(__dirname, '../../components/home/HomeGreetingPostcard.vue'),
    required: ['今日签'],
    forbidden: ['????'],
  },
  {
    file: path.resolve(__dirname, '../../components/home/HomeRitualSection.vue'),
    required: ['今日仪式', "rituals.length + ' 个'"],
    forbidden: ['????', "rituals.length + ' ?'"],
  },
  {
    file: path.resolve(__dirname, '../../composables/useTimelineCalendarShell.ts'),
    required: ['选择日期', '已完成', '暂无安排', '今天', '明天', '后天', '天后', '天前', '初一', '初三', '正月'],
    forbidden: ['????', '???', '閳?', 'é', 'å§', 'æµœ', 'æ¶“'],
  },
  {
    file: path.resolve(__dirname, '../../components/timeline/TimelineHolidayAlmanac.vue'),
    required: ['Firework burst', 'Dragon boat wave', 'Maple leaf float'],
    forbidden: ['閳?', '閸忓啯', '娑擃厾', '楠炲啿', '濮ｅ秳'],
  },
]

const SOURCE_DIRS = [
  '../../components',
  '../../pages',
  '../../composables',
  '../../utils',
  '../../stores',
  '../../services',
  '../../cloudfunctions',
]

const GLOBAL_FORBIDDEN = [
  '????',
  '?{{',
  '閳?',
  '鍔犺浇',
  '浠婂ぉ',
  '杩欎竴',
  '鐢ㄦ埛',
]

function collectSourceFiles(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true })
  const files = []

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)

    if (entry.isDirectory()) {
      if (entry.name === '__tests__' || entry.name === 'node_modules') continue
      files.push(...collectSourceFiles(fullPath))
      continue
    }

    if (/\.(vue|ts|js|scss|json)$/.test(entry.name)) {
      files.push(fullPath)
    }
  }

  return files
}

describe('mojibake guard', () => {
  test.each(CASES)('$file keeps normalized copy text', ({ file, required, forbidden }) => {
    const text = fs.readFileSync(file, 'utf8')

    for (const snippet of required) {
      expect(text).toContain(snippet)
    }

    for (const snippet of forbidden) {
      expect(text).not.toContain(snippet)
    }
  })

  test('source files do not contain broad visible mojibake markers', () => {
    const files = SOURCE_DIRS.flatMap((dir) => collectSourceFiles(path.resolve(__dirname, dir)))

    for (const file of files) {
      const text = fs.readFileSync(file, 'utf8')

      for (const snippet of GLOBAL_FORBIDDEN) {
        expect(text).not.toContain(snippet)
      }
    }
  })
})
