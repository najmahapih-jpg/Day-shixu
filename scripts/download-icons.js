const https = require('https');
const fs = require('fs');
const path = require('path');

const ICONS = [
  'solar:home-angle-linear','solar:home-angle-bold',
  'solar:calendar-linear','solar:calendar-bold',
  'solar:notes-linear','solar:notes-bold',
  'solar:user-circle-linear','solar:user-circle-bold',
  'solar:sun-bold','solar:sunrise-bold',
  'solar:running-2-bold','solar:dumbbell-bold',
  'solar:meditation-round-bold','solar:brain-bold',
  'solar:heart-pulse-bold','solar:apple-bold',
  'solar:book-bold','solar:notebook-bold',
  'solar:users-group-two-rounded-bold','solar:chat-round-bold',
  'solar:palette-bold','solar:pen-new-square-bold',
  'solar:moon-bold','solar:sleeping-bold',
  'solar:add-circle-bold','solar:add-circle-linear',
  'solar:pen-2-bold','solar:pen-2-linear',
  'solar:trash-bin-trash-bold',
  'solar:settings-bold','solar:settings-linear',
  'solar:bell-bold','solar:bell-linear',
  'solar:chart-2-bold','solar:magnifer-bold',
  'solar:arrow-left-linear','solar:close-circle-bold',
  'solar:check-circle-bold',
  'solar:lock-keyhole-bold','solar:lock-keyhole-unlocked-bold',
  'solar:share-bold','solar:bookmark-bold','solar:bookmark-linear',
  'solar:filter-bold','solar:sort-vertical-bold',
  'solar:hamburger-menu-linear','solar:menu-dots-bold',
  'solar:calendar-date-bold',
  'solar:clock-circle-bold','solar:clock-circle-linear',
  'solar:star-bold','solar:star-linear','solar:cup-bold',
  'solar:flag-bold','solar:fire-bold','solar:gift-bold',
  'solar:restart-bold','solar:play-bold','solar:pause-bold','solar:stop-bold',
  'solar:confetti-bold','solar:crown-bold','solar:export-bold',
  'solar:moon-stars-bold','solar:sun-2-bold',
  'solar:info-circle-linear','solar:danger-triangle-bold',
];

const OUTPUT = path.join(__dirname, '..', 'static', 'icons', 'solar');

async function dl(icon) {
  const [prefix, name] = icon.split(':');
  const url = `https://api.iconify.design/${prefix}/${name}.svg?color=currentColor`;
  return new Promise((resolve, reject) => {
    https.get(url, res => {
      if (res.statusCode !== 200) { console.log('❌ ' + name); return reject(); }
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        fs.writeFileSync(path.join(OUTPUT, name + '.svg'), d);
        console.log('✅ ' + name);
        resolve();
      });
    }).on('error', reject);
  });
}

(async () => {
  fs.mkdirSync(OUTPUT, { recursive: true });
  console.log('下载 ' + ICONS.length + ' 个图标...\n');
  for (const icon of ICONS) {
    try { await dl(icon); await new Promise(r => setTimeout(r, 80)); }
    catch(e) { console.error('Failed:', icon); }
  }
  console.log('\n完成!');
})();
