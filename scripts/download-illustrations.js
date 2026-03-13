/**
 * HabitFlow 插画素材获取与管理
 * 
 * 从 unDraw (开源免费 MIT) 获取 SVG 插画
 * unDraw 不提供 API，所以这里预置经过筛选的 SVG 内容
 * 实际操作: 访问 undraw.co, 设置颜色 #E8725C, 搜索下载
 * 
 * 备选开源来源:
 *   - https://www.opendoodles.com (CC0)
 *   - https://illustrations.co (MIT)
 *   - https://storyset.com (Free with attribution)
 *   - https://www.humaaans.com (CC0)
 */

const fs = require('fs');
const path = require('path');

// 需要的插画清单 + 推荐搜索关键词 + 放置路径
const ILLUSTRATIONS = {
    onboarding: {
        dir: 'static/images/onboarding',
        items: [
            { file: 'habit.svg', search: 'healthy habit / morning routine', desc: '养成习惯 - 人物做晨间运动' },
            { file: 'ritual.svg', search: 'daily routine / workflow', desc: '建立仪式 - 人物按步骤做事' },
            { file: 'journey.svg', search: 'adventure / path / hiking', desc: '成长旅程 - 人物攀登/行走' },
            { file: 'start.svg', search: 'launch / begin / rocket', desc: '开始使用 - 人物起飞/出发' },
        ]
    },
    empty: {
        dir: 'static/images/empty',
        items: [
            { file: 'no-habit.svg', search: 'add tasks / to do list empty', desc: '无习惯 - 空列表+加号暗示' },
            { file: 'no-note.svg', search: 'notes / sticky notes / blank', desc: '无便签 - 空白板' },
            { file: 'no-journey.svg', search: 'explore / compass / map', desc: '无旅程 - 地图/指南针' },
            { file: 'no-stats.svg', search: 'chart / analytics / growing', desc: '无数据 - 萌芽生长' },
            { file: 'no-letter.svg', search: 'mailbox / letter / envelope', desc: '无信件 - 空邮箱' },
            { file: 'network.svg', search: 'connection lost / offline', desc: '断网 - 断开的线缆' },
        ]
    },
    journeys: {
        dir: 'static/images/journeys',
        items: [
            { file: 'early-riser.svg', search: 'sunrise / morning / wake up', desc: '早起者旅程封面' },
            { file: 'exercise.svg', search: 'running / fitness / sport', desc: '运动旅程封面' },
            { file: 'mindfulness.svg', search: 'meditation / zen / peaceful', desc: '正念旅程封面' },
        ]
    },
    decorative: {
        dir: 'static/images/decorative',
        items: [
            { file: 'celebration.svg', search: 'celebration / party / success', desc: '庆祝 - 里程碑弹窗用' },
            { file: 'welcome.svg', search: 'welcome / hello / greeting', desc: '欢迎 - 首次使用' },
        ]
    }
};

// 创建目录
function ensureDirs() {
    Object.values(ILLUSTRATIONS).forEach(group => {
        const dir = path.join(__dirname, '..', group.dir);
        fs.mkdirSync(dir, { recursive: true });
        console.log(`📁 目录创建: ${group.dir}`);
    });
}

// 生成下载指引
function generateGuide() {
    let guide = '# HabitFlow 插画素材下载指引\n\n';
    guide += '> **颜色统一设置为 #E8725C (品牌珊瑚色)**\n\n';
    guide += '## 下载步骤\n\n';
    guide += '1. 访问 [unDraw](https://undraw.co/illustrations)\n';
    guide += '2. 点击右上角颜色选择器，输入 `#E8725C`\n';
    guide += '3. 搜索下方对应关键词，找到合适的插画\n';
    guide += '4. 点击 Download SVG，替换占位文件\n\n';
    guide += '---\n\n';

    Object.entries(ILLUSTRATIONS).forEach(([category, group]) => {
        guide += `## ${category.charAt(0).toUpperCase() + category.slice(1)}\n\n`;
        guide += `**目录**: \`${group.dir}/\`\n\n`;
        guide += '| 文件 | 搜索关键词 | 说明 |\n';
        guide += '|------|-----------|------|\n';
        group.items.forEach(item => {
            guide += `| \`${item.file}\` | ${item.search} | ${item.desc} |\n`;
        });
        guide += '\n';
    });

    guide += '---\n\n';
    guide += '## 备选来源\n\n';
    guide += '- **[Open Doodles](https://www.opendoodles.com)** - CC0, 手绘风格\n';
    guide += '- **[Illustrations.co](https://illustrations.co)** - MIT, 多种风格\n';
    guide += '- **[Storyset](https://storyset.com)** - 免费（需署名），可定制颜色\n';
    guide += '- **[Humaaans](https://www.humaaans.com)** - CC0, 人物插画库\n\n';
    guide += '## 占位说明\n\n';
    guide += '当前所有文件都是**抽象几何占位 SVG**（品牌配色），即使不替换也不会难看。\n';
    guide += '替换时直接覆盖同名文件即可。\n';

    fs.writeFileSync(path.join(__dirname, '..', 'ILLUSTRATIONS_GUIDE.md'), guide);
    console.log('\n✅ 指引已生成: ILLUSTRATIONS_GUIDE.md');
}

// 生成美观的占位 SVG（不是空白，而是有设计感的抽象图形）
function generatePlaceholder(desc, category) {
    const colors = {
        onboarding: ['#E8725C', '#F5C563', '#FAF8F5'],
        empty: ['#D4CEC8', '#F5F2ED', '#FAF8F5'],
        journeys: ['#8BA888', '#7EB8C9', '#FAF8F5'],
        decorative: ['#E8725C', '#F5C563', '#8BA888'],
    };
    const [c1, c2, c3] = colors[category] || colors.decorative;

    return `<svg viewBox="0 0 400 300" xmlns="http://www.w3.org/2000/svg">
  <rect width="400" height="300" fill="${c3}"/>
  <circle cx="200" cy="120" r="60" fill="${c1}" opacity="0.15"/>
  <circle cx="200" cy="120" r="40" fill="${c1}" opacity="0.25"/>
  <circle cx="200" cy="120" r="20" fill="${c1}" opacity="0.4"/>
  <rect x="140" y="200" width="120" height="8" rx="4" fill="${c2}" opacity="0.3"/>
  <rect x="160" y="220" width="80" height="6" rx="3" fill="${c2}" opacity="0.2"/>
  <!-- ${desc} -->
</svg>`;
}

// 主执行
function main() {
    console.log('🎨 HabitFlow 插画素材管理工具\n');

    // 创建目录结构
    ensureDirs();

    // 生成占位 SVG
    let placeholderCount = 0;
    Object.entries(ILLUSTRATIONS).forEach(([category, group]) => {
        group.items.forEach(item => {
            const placeholder = generatePlaceholder(item.desc, category);
            const filePath = path.join(__dirname, '..', group.dir, item.file);
            if (!fs.existsSync(filePath)) {
                fs.writeFileSync(filePath, placeholder);
                console.log(`📝 占位: ${group.dir}/${item.file}`);
                placeholderCount++;
            } else {
                console.log(`⏭️  跳过: ${group.dir}/${item.file} (已存在)`);
            }
        });
    });

    // 生成下载指引
    generateGuide();

    console.log(`\n📊 统计: 创建了 ${placeholderCount} 个占位 SVG`);
    console.log('\n📋 下一步:');
    console.log('   1. 查看 ILLUSTRATIONS_GUIDE.md 获取下载指引');
    console.log('   2. 访问 undraw.co，设置颜色 #E8725C');
    console.log('   3. 按指引搜索并下载，替换占位文件\n');
    console.log('💡 提示: 占位文件是品牌配色的抽象图形，不替换也可用\n');
}

main();
