const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

try {
    require.resolve('@phosphor-icons/core');
} catch (e) {
    console.log('Installing @phosphor-icons/core...');
    execSync('npm install @phosphor-icons/core --save-dev', { stdio: 'inherit' });
}

const ICON_MAP = [
    // [Phosphor文件名（不含.svg）, 我们的文件名, 变体(bold/regular)]
    ['caret-left', 'arrow-left-linear', 'regular'],
    ['caret-right', 'arrow-right-linear', 'regular'],
    ['caret-up', 'arrow-up-linear', 'regular'],
    ['caret-up', 'arrow-up-bold', 'bold'],
    ['caret-down', 'arrow-down-linear', 'regular'],
    ['x-circle', 'close-circle-bold', 'bold'],
    ['list', 'hamburger-menu-linear', 'regular'],
    ['dots-three-vertical', 'menu-dots-bold', 'bold'],
    ['magnifying-glass', 'magnifer-bold', 'bold'],
    ['sort-ascending', 'sort-vertical-bold', 'bold'],
    ['funnel', 'filter-bold', 'bold'],
    ['share-network', 'share-bold', 'bold'],
    ['export', 'export-bold', 'bold'],
    ['info', 'info-circle-linear', 'regular'],
    ['warning', 'danger-triangle-bold', 'bold'],
    ['lock', 'lock-keyhole-bold', 'bold'],
    ['lock-open', 'lock-keyhole-unlocked-bold', 'bold'],
    ['arrow-clockwise', 'restart-bold', 'bold'],
    ['play', 'play-bold', 'bold'],
    ['pause', 'pause-bold', 'bold'],
    ['stop', 'stop-bold', 'bold'],
];

const LINEAR_SUPPLEMENTS = [
    // 这些是档位 B 图标的 linear 版本，如果代码中有引用就也从 Phosphor 取
    ['bell', 'bell-linear', 'regular'],
    ['bookmark-simple', 'bookmark-linear', 'regular'],
    ['calendar-blank', 'calendar-linear', 'regular'],
    ['clock', 'clock-circle-linear', 'regular'],
    ['envelope-simple', 'letter-linear', 'regular'],
    ['pencil-simple', 'pen-2-linear', 'regular'],
    ['gear-six', 'settings-linear', 'regular'],
    ['star', 'star-linear', 'regular'],
    ['user-circle', 'user-circle-linear', 'regular'],
    ['house', 'home-angle-linear', 'regular'],
    ['notepad', 'notes-linear', 'regular'],
];

const ALL_ICONS = [...ICON_MAP, ...LINEAR_SUPPLEMENTS];

const targetDir = path.join(__dirname, '../static/icons/solar');
if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
}

let count = 0;

for (const [phosphorName, ourName, variant] of ALL_ICONS) {
    const suffix = variant === 'regular' ? '' : `-${variant}`;
    const sourcePath = path.join(__dirname, '../node_modules/@phosphor-icons/core/assets', variant, `${phosphorName}${suffix}.svg`);

    if (!fs.existsSync(sourcePath)) {
        console.error(`❌ Source not found: ${sourcePath}`);
        continue;
    }

    let svgContent = fs.readFileSync(sourcePath, 'utf8');

    // 清洗 SVG 内容
    // 注意: 微信小程序的 <image> 标签无法通过 CSS 继承 color，
    // 所以不能用 currentColor，必须烧入一个可见的默认颜色。
    // 使用暖灰 #908880 作为默认颜色（与设计系统的 warm-gray 一致）
    svgContent = svgContent
        .replace(/\s*width="[^"]*"/g, '')
        .replace(/\s*height="[^"]*"/g, '')
        .replace(/fill="#000000"/gi, 'fill="#908880"')
        .replace(/fill="black"/gi, 'fill="#908880"')
        .replace(/fill="currentColor"/gi, 'fill="#908880"')
        .replace(/stroke="#000000"/gi, 'stroke="#908880"')
        .replace(/stroke="black"/gi, 'stroke="#908880"')
        .replace(/stroke="currentColor"/gi, 'stroke="#908880"')
        .replace(/<\?xml.*?\?>\s*/g, '')
        .replace(/<!--[\s\S]*?-->/g, '')
        .replace(/<title>.*?<\/title>\s*/g, '')
        .replace(/<rect width="256" height="256" fill="none"\s*\/>\s*/g, '')
        .replace(/<rect width="256" height="256" fill="none"><\/rect>\s*/g, '');

    const targetPath = path.join(targetDir, `${ourName}.svg`);
    fs.writeFileSync(targetPath, svgContent.trim());
    console.log(`✅ phosphor/${phosphorName}-${variant}.svg → solar/${ourName}.svg`);
    count++;
}

console.log(`\n🎉 成功复制并清洗了 ${count} 个图标！`);
