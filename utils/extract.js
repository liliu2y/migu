const fs = require('fs');
const https = require('https');
const http = require('http');

// 设置时区为 亚洲/上海 (北京时间)
process.env.TZ = 'Asia/Shanghai';

// 数据源
const sources = [
  "https://gh.dpik.top/https://github.com/kakaxi-1/IPTV/blob/main/iptv.txt",
  "https://gh.dpik.top/https://github.com/q1017673817/iptvz/blob/main/zubo_all.txt"
];

// 省份拼音映射
const provincePinyin = {
  '北京': 'bj', '上海': 'sh', '广东': 'gd', '江苏': 'js', '浙江': 'zj',
  '山东': 'sd', '四川': 'sc', '湖北': 'hb', '湖南': 'hn', '河南': 'hn',
  '河北': 'heb', '安徽': 'ah', '福建': 'fj', '江西': 'jx', '广西': 'gx',
  '重庆': 'cq', '云南': 'yn', '贵州': 'gz', '陕西': 'sn', '山西': 'sx',
  '甘肃': 'gs', '宁夏': 'nx', '新疆': 'xj', '内蒙古': 'nmg', '黑龙江': 'hlj',
  '吉林': 'jl', '辽宁': 'ln', '天津': 'tj', '海南': 'hn'
};

// 运营商映射
const operatorMap = {
  '电信': 'ct',
  '联通': 'cu',
  '移动': 'cm'
};

// 抓取远程文本
async function fetch(url) {
  return new Promise((resolve) => {
    const client = url.startsWith('https') ? https : http;
    const req = client.get(url, {
      timeout: 10000,
      headers: { 'User-Agent': 'Mozilla/5.0' }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', () => resolve(''));
    req.on('error', () => resolve(''));
  });
}

// 主逻辑
(async () => {
  let allLines = [];

  // 抓取所有源
  for (const url of sources) {
    const c = await fetch(url);
    if (c) allLines = allLines.concat(c.split('\n'));
  }

  const ipData = {};
  const globalIp = [];
  let total = 0, valid = 0, dup = 0;
  let currentGroup = '';

  // 逐行解析
  for (const line of allLines) {
    const trimLine = line.trim();
    total++;
    if (!trimLine) continue;

    // 处理 #genre#
    if (trimLine.includes('#genre#')) {
      currentGroup = trimLine.split(',')[0] || '';
      currentGroup = currentGroup.replace(/-组播\d+/, '').trim();
      continue;
    }

    // 处理 $ 分隔
    let urlPart = '', provider = '';
    if (trimLine.includes('$')) {
      const [left, right] = trimLine.split('$', 2);
      urlPart = left;
      provider = right;
    } else {
      urlPart = trimLine;
      provider = currentGroup;
    }

    // 提取 IP:端口
    const ipMatch = urlPart.match(/http:\/\/([\d\.]+:\d+)\//i);
    if (!ipMatch) continue;
    const ip = ipMatch[1];

    if (globalIp.includes(ip)) {
      dup++;
      continue;
    }

    // 匹配省份 + 运营商
    let prov = '', oper = '';
    for (const [k, v] of Object.entries(provincePinyin)) {
      if (provider.includes(k)) {
        prov = v;
        break;
      }
    }
    for (const [k, v] of Object.entries(operatorMap)) {
      if (provider.includes(k)) {
        oper = v;
        break;
      }
    }
    if (!prov || !oper) continue;

    const key = prov + oper;
    if (!ipData[key] || ipData[key].length < 3) {
      if (!ipData[key]) ipData[key] = [];
      ipData[key].push(ip);
      globalIp.push(ip);
      valid++;
    }
  }

  // 生成 JSON（标准北京时间）
  const now = new Date();
  const result = {
    update_time: now.toLocaleString('zh-CN'),
    statistics: {
      total_processed: total,
      valid_ip_count: valid,
      duplicate_ip_count: dup
    },
    ip_list: ipData
  };

  // 写入文件（zubo/ip_all.json）
  fs.writeFileSync('ip_all.json', JSON.stringify(result, null, 2), 'utf8');

  console.log(`✅ 生成完成：zubo/ip_all.json`);
  console.log(`✅ 有效IP：${valid}`);
  console.log(`✅ 更新时间：${now.toLocaleString()}`);
})();
