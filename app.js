/**
 * 咪咕视频 直播/回看 采集器 —— 单文件版（由原多文件 ESM 项目合并）
 * 来源: app.js + config.js + utils/*.js
 * 运行: node migu.js   （需 Node >= 18，自带 fetch；无需任何 npm 依赖）
 * 环境变量: muserId mtoken mhost mrateType mpass mdebug
 * 产出: interface.txt / interfaceTXT.txt / playback.xml
 */
const fs = require('node:fs');
const os = require('os');
const crypto = require('crypto');
process.env.TZ = 'Asia/Shanghai';

// ==================== config.js ====================
// 用户id
const userId = process.env.muserId || ""
// 用户token 可以使用网页登录获取
const token = process.env.mtoken || ""
// 本地运行端口号
const port = process.env.mport || 1234
// 公网/自定义访问地址
const host = process.env.mhost || "4"
// 画质
// 4蓝光(需要登录且账号有VIP)
// 3高清
// 2标清
const rateType = process.env.mrateType || 3
// 是否刷新token，可能是导致封号的原因
// const refreshToken = process.env.mrefreshToken || true
const debug = process.env.mdebug || false
// 访问密码 大小写字母和数字 添加后访问格式 http://ip:port/mpass/...
const pass = process.env.mpass || ""

// ==================== utils/time.js ====================
function getDateString(date) {
  return `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, "0")}${String(date.getDate()).padStart(2, "0")}`
}

function getTimeString(date) {
  return `${String(date.getHours()).padStart(2, "0")}${String(date.getMinutes()).padStart(2, "0")}${String(date.getSeconds()).padStart(2, "0")}`
}

function getDateTimeString(date) {
  return `${getDateString(date)}${getTimeString(date)}`
}

function getDateTimeStr(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")} ` +
    `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}:${String(date.getSeconds()).padStart(2, "0")}`
}

function getLogDateTime(date) {
  return `${getDateTimeStr(date)}:${String(date.getMilliseconds()).padStart(3, "0")}`
}

// ==================== utils/colorOut.js ====================
function basePrint(color, msg) {
  console.log(`${color}%s %s\x1B[0m`, `[${getLogDateTime(new Date())}]`, msg)
}

function printRed(msg) {
  basePrint("\x1B[31m", msg)
}

function printGreen(msg) {
  basePrint("\x1B[32m", msg)
}

function printYellow(msg) {
  basePrint("\x1B[33m", msg)
}

function printBlue(msg) {
  basePrint("\x1B[34m", msg)
}

function printMagenta(msg) {
  basePrint("\x1B[35m", msg)
}

function printGrey(msg) {
  basePrint("\x1B[2m", msg)
}
function printDebug(obj) {
  if (debug) {
    console.dir(obj, { depth: null })
  }
}

// ==================== utils/EncryUtils.js ====================
const KEY_AES = "MQDUjI19MGe3BhaqTlpc9g==";
const IV = "abcdefghijklmnop";

const RSA_PRIVATE_KEY_PKCS8 = "MIICdQIBADANBgkqhkiG9w0BAQEFAASCAl8wggJbAgEAAoGBAOhvWsrglBpQGpjB\r8okxLUCaaiKKOytn9EtvytB5tKDchmgkSaXpreWcDy/9imsuOiVCSdBr6hHjrTN7\rQKkA4/QYS8ptiFv1ap61PiAyRFDI1b8wp2haJ6HF1rDShG2XdfWIhLk4Hj6efVZA\rSfa3taM7C8NseWoWh05Cp26g4hXZAgMBAAECgYBzqZXghsisH1hc04ZBRrth/nT6\rIxc2jlA+ia6+9xEvSw2HHSeY7COgsnvMQbpzg1lj2QyqLkkYBdfWWmrerpa/mb7j\rm6w95YKs5Ndii8NhFWvC0eGK8Ygt02DeLohmkQu3B+Yq8JszjB7tQJRR2kdG6cPt\rKp99ZTyyPom/9uD+AQJBAPxCwajHAkCuH4+aKdZhH6n7oDAxZoMH/mihDRxHZJof\rnT+K662QCCIx0kVCl64s/wZ4YMYbP8/PWDvLMNNWC7ECQQDr4V23KRT9fAPAN8vB\rq2NqjLAmEx+tVnd4maJ16Xjy5Q4PSRiAXYLSr9uGtneSPP2fd/tja0IyawlP5UPL\rl76pAkAeXqMWAK+CvfPKxBKZXqQDQOnuI2RmDgZQ7mK3rtirvXae+ciZ4qc4Bqt7\r7yJ3s68YRlHQR+OMzzeeKz47kzZhAkAPteH1ChJw06q4Sb8TdiPX++jbkFiCxgiN\rCsaMTfGVU/Y8xGSSYCgPelEHxu1t2wwVa/tdYs505zYmkSGT1NaJAkBCS5hymXsA\rB92Fx8eGW5WpLfnpvxl8nOcP+eNXobi8Sc6q1FmoHi8snbcmBhidcDdcieKn+DbX\rGG3BQE/OCOkM\r";

/**
 * MD5 加密
 * @param {string} str - 
 * @returns {string} - 
 */
function getStringMD5(str) {
  // 创建 MD5 哈希对象
  const md5 = crypto.createHash("md5");
  // 更新数据（默认 UTF-8 编码）
  md5.update(str);
  // 生成十六进制哈希值并转为小写
  return md5.digest("hex").toLowerCase();
}

/**
 * base64 加密
 * @param {string} str - 
 * @returns {string} - 
 */
function Base64encrypt(str) {
  const buff = Buffer.from(str, 'utf-8');
  return buff.toString('base64')
}

/**
 * base64 解密
 * @param {string} str - 
 * @returns {string} - 
 */
function Base64decrypt(str) {
  const buff = Buffer.from(str, 'base64');
  return buff.toString('utf-8')
}

/**
 * AES 加密
 * @param {string} data - 
 * @param {string} baseKey - 
 * @param {string} ivStr - 
 * @returns {string} - 
 */
function AESencrypt(data, baseKey = KEY_AES, ivStr = IV) {
  let key = Buffer.from(baseKey, "utf8")
  let iv = Buffer.from(ivStr, "utf8")

  // 填充长度
  if (key.length < 32) {
    const paddedKey = Buffer.alloc(32);
    key.copy(paddedKey);
    key = paddedKey;
  }
  if (iv.length < 16) {
    const paddedIV = Buffer.alloc(16);
    iv.copy(paddedIV);
    iv = paddedIV;
  } const cipher = crypto.createCipheriv("aes-256-cbc", key, iv)
  const dest = cipher.update(data, "utf8", "base64") + cipher.final("base64")
  return dest.toString()
}

/**
 * AES 解密
 * @param {string} baseData - 
 * @param {string} baseKey - 
 * @param {string} ivStr - 
 * @returns {string} - 
 */
function AESdecrypt(baseData, baseKey = KEY_AES, ivStr = IV) {
  let key = Buffer.from(baseKey, "utf8")
  let iv = Buffer.from(ivStr, "utf8")

  // 填充长度
  if (key.length < 32) {
    const paddedKey = Buffer.alloc(32);
    key.copy(paddedKey);
    key = paddedKey;
  } if (iv.length < 16) {
    const paddedIV = Buffer.alloc(16);
    iv.copy(paddedIV);
    iv = paddedIV;
  }
  const data = Buffer.from(baseData, "utf8")
  const decipher = crypto.createDecipheriv("aes-256-cbc", key, iv)
  const dest = Buffer.concat([decipher.update(data), decipher.final()])
  return dest.toString()
}


/**
 * RSA 私钥签名加密
 * @param {string} data - 
 * @param {string} publicKeyBase - 
 * @returns {string} - 
 */
function RSAencrypt(data, publicKeyBase = RSA_PRIVATE_KEY_PKCS8) {
  const clearKey = publicKeyBase.replace(/\r/g, "")
  const keyBytes = Buffer.from(clearKey, "base64")
  const privateKey = crypto.createPrivateKey({
    key: keyBytes,
    format: "der",
    type: "pkcs8"
  })
  const dest = crypto.privateEncrypt({
    key: privateKey,
    padding: crypto.constants.RSA_PKCS1_PADDING,
  }, data)
  return dest.toString("base64")
}

// ==================== utils/datas.js ====================
// 回放
const cntvNames = {
  "CCTV1综合": "cctv1",
  "CCTV2财经": "cctv2",
  "CCTV3综艺": "cctv3",
  "CCTV4中文国际": "cctv4",
  "CCTV5体育": "cctv5",
  "CCTV5+体育赛事": "cctv5plus",
  "CCTV6电影": "cctv6",
  "CCTV7国防军事": "cctv7",
  "CCTV8电视剧": "cctv8",
  "CCTV9纪录": "cctvjilu",
  "CCTV10科教": "cctv10",
  "CCTV11戏曲": "cctv11",
  "CCTV12社会与法": "cctv12",
  "CCTV13新闻": "cctv13",
  "CCTV14少儿": "cctvchild",
  "CCTV15音乐": "cctv15",
  "CCTV17农业农村": "cctv17",
  "CCTV4欧洲": "cctveurope",
  "CCTV4美洲": "cctvamerica",
}

// ==================== utils/net.js ====================
function getLocalIPv(ver = 4) {
  const ips = []
  const inter = os.networkInterfaces()
  // console.dir(inter, { depth: null })
  for (let net in inter) {

    // console.dir(net, { depth: null })
    // console.log()
    for (let netPort of inter[net]) {
      // netPort = inter[net][netPort]
      // console.dir(netPort, { depth: null })
      if (netPort.family === `IPv${ver}`) {
        // console.dir(netPort, { depth: null })
        ips.push(netPort.address)
      }
    }
  }
  // console.log()
  // console.dir(ips, { depth: null })
  return ips
}

async function fetchUrl(url, opts = {}) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort()
    printRed("请求超时")
  }, 6000);
  opts["signal"] = controller.signal
  const res = await fetch(url, opts)
    .then(r => r.json())
    .catch(err => {
      console.log(err)
      clearTimeout(timeoutId);
    })
  clearTimeout(timeoutId);
  return res
}

// ==================== utils/fileUtil.js ====================
function createFile(filePath) {
  if (!fs.existsSync(filePath)) {
    writeFile(filePath, "")
  }
}

function writeFile(filePath, content) {
  fs.writeFile(filePath, content, error => {
    if (error) {
      throw new Error(`${filePath}:写入${content}失败`)
    }
  })
}

function appendFile(filePath, content) {
  fs.appendFile(filePath, content, error => {
    if (error) {
      throw new Error(`${filePath}:追加${content}失败`)
    }
  })
}

function appendFileSync(filePath, content) {
  fs.appendFileSync(filePath, content, error => {
    if (error) {
      throw new Error(`${filePath}:同步追加${content}失败`)
    }
  })
}

function readFileSync(filePath) {
  return fs.readFileSync(filePath)
}

function renameFileSync(oldFilePath, newFilePath) {
  fs.renameSync(oldFilePath, newFilePath, err => {
    if (err) {
      throw new Error(`文件重命名失败${oldFilePath} -> ${newFilePath}`)
    }
  })
}
function copyFileSync(filePath, newFilePath, mode) {
  fs.copyFileSync(filePath, newFilePath, mode, err => {
    if (err) {
      throw new Error(`文件复制失败${filePath} -> ${newFilePath}`)
    }
  })
}

// ==================== utils/fetchList.js ====================
function delay(ms) {
  return new Promise(resolve => {
    setTimeout(resolve, ms)
  })
}

// 获取分类集合
async function cateList() {
  const resp = await fetchUrl("https://program-sc.miguvideo.com/live/v2/tv-data/1ff892f2b5ab4a79be6e25b69d2f5d05")
  let liveList = resp.body.liveList
  // 热门内容重复
  liveList = liveList.filter(item => {
    return item.name != "热门"
  })

  // 央视作为首个分类
  liveList.sort((a, b) => {
    if (a.name === "央视") return -1;
    if (b.name === "央视") return 1
    return 0
  })

  return liveList
}

// 所有数据
async function dataList() {
  let cates = await cateList()

  for (let cate in cates) {
    try {
      const resp = await fetchUrl("https://program-sc.miguvideo.com/live/v2/tv-data/" + cates[cate].vomsID)
      cates[cate].dataList = resp.body.dataList
    } catch (error) {
      cates[cate].dataList = [];
    }
  }

  // 去除重复节目
  cates = uniqueData(cates)
  // console.dir(cates, { depth: null })
  // console.log(cates)
  return cates
}

// 对data的dataList去重
function uniqueData(liveList) {

  const allItems = []
  // 提取全部dataList
  liveList.forEach(category => {
    category.dataList.forEach(program => {

      allItems.push({
        ...program,
        categoryName: category.name
      })
    })

  })

  // 使用set确保唯一
  const set = new Set()
  // 保存唯一的数据
  const uniqueItem = []

  allItems.forEach(item => {
    // set用来确定已经出现过
    if (!set.has(item.name)) {
      set.add(item.name)
      uniqueItem.push(item)
    }
  })

  const categoryMap = []

  // 清空原dataList内容
  liveList.forEach(live => {
    live.dataList = []
    categoryMap[live.name] = []
  })

  // 去除添加字段，根据分类填充内容
  uniqueItem.forEach(item => {
    const { categoryName, ...program } = item
    categoryMap[categoryName].push(program)
  })

  // liveList赋值
  liveList.forEach(live => {
    live.dataList = categoryMap[live.name]
  })

  return liveList
}

// ==================== utils/playback.js ====================
async function getPlaybackData(programId) {
  const date = new Date()
  const today = getDateString(date)
  const resp = await fetchUrl(`https://program-sc.miguvideo.com/live/v2/tv-programs-data/${programId}/${today}`)
  return resp.body?.program[0]?.content
}

async function updatePlaybackDataByMigu(program, filePath) {
  // 今日节目数据
  const playbackData = await getPlaybackData(program.pID)
  if (!playbackData) {
    return false
  }
  // 写入频道信息
  appendFileSync(filePath,
    `    <channel id="${program.name}">\n` +
    `        <display-name lang="zh">${program.name}</display-name>\n` +
    `    </channel>\n`
  )

  // 写入节目信息
  for (let i = 0; i < playbackData.length; i++) {
    // 特殊字符转义
    const contName = playbackData[i].contName.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll("\"", "&quot;").replaceAll("'", "&apos;");

    appendFileSync(filePath,
      `    <programme channel="${program.name}" start="${getDateTimeString(new Date(playbackData[i].startTime))} +0800" stop="${getDateTimeString(new Date(playbackData[i].endTime))} +0800">\n` +
      `        <title lang="zh">${contName}</title>\n` +
      `    </programme>\n`
    )
  }
  return true
}

async function updatePlaybackDataByCntv(program, filePath) {
  // 今日节目数据
  const date = new Date()
  const today = getDateString(date)
  const cntvName = cntvNames[program.name]
  const resp = await fetchUrl(`https://api.cntv.cn/epg/epginfo3?serviceId=shiyi&d=${today}&c=${cntvName}`)

  const playbackData = resp[cntvName]?.program
  if (!playbackData) {
    return false
  }
  // 写入频道信息
  appendFileSync(filePath,
    `    <channel id="${program.name}">\n` +
    `        <display-name lang="zh">${program.name}</display-name>\n` +
    `    </channel>\n`
  )

  // 写入节目信息
  for (let i = 0; i < playbackData.length; i++) {
    // 特殊字符转义
    const contName = playbackData[i].t.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll("\"", "&quot;").replaceAll("'", "&apos;");

    appendFileSync(filePath,
      `    <programme channel="${program.name}" start="${getDateTimeString(new Date(playbackData[i].st * 1000))} +0800" stop="${getDateTimeString(new Date(playbackData[i].et * 1000))} +0800">\n` +
      `        <title lang="zh">${contName}</title>\n` +
      `    </programme>\n`
    )
  }
  return true
}

async function updatePlaybackData(program, filePath) {
  if (cntvNames[program.name]) {
    return updatePlaybackDataByCntv(program, filePath)
  }
  return updatePlaybackDataByMigu(program, filePath)

}

// ==================== utils/refreshToken.js ====================
/**
 * @param {string} str - 
 * @returns {string} - 
 */
function encodeURLEncoder(str) {
  return encodeURIComponent(str)
    .replace(/[!'()*]/g, (c) =>
      '%' + c.charCodeAt(0).toString(16).toUpperCase()
    )
    .replace(/%20/g, '+');
}

/**
 * 刷新token
 * @param {string} userId - 用户ID
 * @param {string} token - 用户token
 * @returns {} - 是否成功
 */
async function refreshToken(userId, token) {

  if (userId == null || userId == undefined || token == null || token == undefined) {
    return false
  }

  // 请求体data加密前
  const time = Math.floor(Date.now() / 1000)
  const baseData = `{"userToken":"${token}","autoDelay":true,"deviceId":"","userId":"${userId}","timestamp":"${time}"}`

  // 请求体加密
  const encryData = AESencrypt(baseData)
  const data = '{"data":"' + encryData + '"}'

  // 签名
  const str = getStringMD5(data)
  const sign = encodeURLEncoder(RSAencrypt(str))

  const headers = {
    userId: userId,
    userToken: token,
    "Content-Type": "appsication/json; charset=utf-8"
  }

  const baseURL = "https://migu-app-umnb.miguvideo.com/login/token_refresh_migu_plus"
  const params = `?clientId=27fb3129-5a54-45bc-8af1-7dc8f1155501&sign=${sign}&signType=RSA`

  try {
    // 发送请求
    const respResult = await fetchUrl(baseURL + params, {
      headers: headers,
      method: "post",
      body: data
    })

    // 处理响应结果
    if (respResult.resultCode == "REFRESH_TOKEN_SUCCESS") {
      // console.log(respResult)
      return true
    }
    console.dir(respResult, { depth: null })
  } catch (error) {
  }

  return false
}

// ==================== utils/updateData.js ====================
/**
 * @param {Number} hours -更新小时数 
 */
async function updateTV(hours) {

  const date = new Date()
  const start = date.getTime()
  let interfacePath = ""
  let interfaceTXTPath = ""
  // 获取数据
  const datas = await dataList()
  printGreen("TV数据获取成功！")

  interfacePath = `${process.cwd()}/interface.txt.bak`
  // txt
  interfaceTXTPath = `${process.cwd()}/interfaceTXT.txt.bak`
  // 创建写入空内容
  writeFile(interfacePath, "")
  // txt
  writeFile(interfaceTXTPath, "")

  if (!(hours % 24)) {
    // 每24小时刷新token
    if (userId != "" && token != "") {
      // if (mrefreshToken) {
      await refreshToken(userId, token) ? printGreen("token刷新成功") : printRed("token刷新失败")
      // } else {
      // printGreen(`跳过token刷新`)
      // }
    }
  }
  appendFile(interfacePath, `#EXTM3U x-tvg-url="\${replace}/${pass == "" ? "" : pass + "/"}playback.xml" catchup="append" catchup-source="?playbackbegin=\${(b)yyyyMMddHHmmss}&playbackend=\${(e)yyyyMMddHHmmss}"\n`)
  printYellow("开始更新TV...")
  // 回放
  const playbackFile = `${process.cwd()}/playback.xml.bak`
  writeFile(playbackFile,
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<tv generator-info-name="Tak" generator-info-url="${host}">\n`)

  // 分类列表
  for (let i = 0; i < datas.length; i++) {

    const data = datas[i].dataList
    // txt
    appendFile(interfaceTXTPath, `${datas[i].name},#genre#\n`)
    // 写入节目
    for (let j = 0; j < data.length; j++) {

      await updatePlaybackData(data[j], playbackFile)

      // 写入节目
      appendFile(interfacePath, `#EXTINF:-1 tvg-id="${data[j].name}" tvg-name="${data[j].name}" tvg-logo="${data[j].pics.highResolutionH}" group-title="${datas[i].name}",${data[j].name}\n\${replace}/${pass == "" ? "" : pass + "/"}${data[j].pID}\n`)
      // txt
      appendFile(interfaceTXTPath, `${data[j].name},\${replace}/${pass == "" ? "" : pass + "/"}${data[j].pID}\n`)
      // printGreen(`    节目链接更新成功`)
    }
    printGreen(`分类###:${datas[i].name} 更新完成！`)
  }

  appendFileSync(playbackFile, `</tv>\n`)

  // 重命名
  renameFileSync(playbackFile, playbackFile.replace(".bak", ""))
  renameFileSync(interfacePath, interfacePath.replace(".bak", ""))
  // txt
  renameFileSync(interfaceTXTPath, interfaceTXTPath.replace(".bak", ""))
  printGreen("TV更新完成！")
  const end = Date.now()
  printYellow(`TV更新耗时: ${(end - start) / 1000}秒`)
}

/**
 * @param {Number} hours -更新小时数 
 */
async function updatePE(hours) {

  const date = new Date()
  const start = date.getTime()
  // 获取PE数据
  const datas = await fetchUrl("http://v0-sc.miguvideo.com/vms-match/v6/staticcache/basic/match-list/normal-match-list/0/all/default/1/miguvideo")
  printGreen("PE数据获取成功！")
  // console.dir(datas, { depth: null })

  copyFileSync(`${process.cwd()}/interface.txt`, `${process.cwd()}/interface.txt.bak`, 0)
  copyFileSync(`${process.cwd()}/interfaceTXT.txt`, `${process.cwd()}/interfaceTXT.txt.bak`, 0)

  const interfacePath = `${process.cwd()}/interface.txt.bak`
  const interfaceTXTPath = `${process.cwd()}/interfaceTXT.txt.bak`

  printYellow("开始更新PE...")

  for (let i = 1; i < 4; i++) {
    // 日期
    const date = datas.body?.days[i]
    let relativeDate = "昨天"
    const dateString = getDateString(new Date())
    if (date == dateString) {
      relativeDate = "今天"
    } else if (parseInt(date) > parseInt(dateString)) {
      relativeDate = "明天"
    }

    appendFile(interfaceTXTPath, `体育-${relativeDate},#genre#\n`)
    for (const data of datas.body?.matchList[date]) {

      let pkInfoTitle = data.pkInfoTitle
      if (data.confrontTeams) {
        pkInfoTitle = `${data.confrontTeams[0].name}VS${data.confrontTeams[1].name}`
      }
      // const peResult = await fetch(`http://app-sc.miguvideo.com/vms-match/v5/staticcache/basic/all-view-list/${data.mgdbId}/2/miguvideo`).then(r => r.json())
      const peResult = await fetchUrl(`https://vms-sc.miguvideo.com/vms-match/v6/staticcache/basic/basic-data/${data.mgdbId}/miguvideo`)
      try {
        // 比赛已结束
        if (peResult.body.endTime < Date.now()) {
          const replayResult = await fetchUrl(`http://app-sc.miguvideo.com/vms-match/v5/staticcache/basic/all-view-list/${data.mgdbId}/2/miguvideo`)
          let replayList = replayResult.body?.replayList
          if (replayList == null || replayList == undefined) {
            replayList = peResult.body.multiPlayList.replayList
          }
          if (replayList == null || replayList == undefined) {
            printYellow(`${data.mgdbId} ${pkInfoTitle} 无回放`)
            continue
          }
          for (const replay of replayList) {
            if (replay.name.match(/.*集锦|训练.*/) != null) {
              continue
            }
            if (replay.name.match(/.*回放|赛.*/) != null) {
              let timeStr = peResult.body.keyword.substring(7)
              const peResultStartTimeStr = peResult.body.multiPlayList.preList[peResult.body.multiPlayList.preList.length - 1].startTimeStr
              if (peResultStartTimeStr != undefined) {
                timeStr = peResultStartTimeStr.substring(11, 16)
              }
              const competitionDesc = `${data.competitionName} ${pkInfoTitle} ${replay.name} ${timeStr}`
              // 写入赛事
              appendFileSync(interfacePath, `#EXTINF:-1 tvg-id="${pkInfoTitle}" tvg-name="${competitionDesc}" tvg-logo="${data.competitionLogo}" group-title="体育-${relativeDate}",${competitionDesc}\n\${replace}/${pass == "" ? "" : pass + "/"}${replay.pID}\n`)
              appendFileSync(interfaceTXTPath, `${competitionDesc},\${replace}/${pass == "" ? "" : pass + "/"}${replay.pID}\n`)
            }
          }
          continue
        }
        // 比赛未结束
        const liveList = peResult.body.multiPlayList.liveList
        for (const live of liveList) {
          if (live.name.match(/.*集锦.*/) != null || live.startTimeStr == undefined) {
            continue
          }
          const competitionDesc = `${data.competitionName} ${pkInfoTitle} ${live.name} ${live.startTimeStr.substring(11, 16)}`
          // 写入赛事
          appendFileSync(interfacePath, `#EXTINF:-1 tvg-id="${pkInfoTitle}" tvg-name="${competitionDesc}" tvg-logo="${data.competitionLogo}" group-title="体育-${relativeDate}",${competitionDesc}\n\${replace}/${pass == "" ? "" : pass + "/"}${live.pID}\n`)
          appendFileSync(interfaceTXTPath, `${competitionDesc},\${replace}/${pass == "" ? "" : pass + "/"}${live.pID}\n`)
        }
      } catch (error) {
        printRed(`${data.mgdbId} ${pkInfoTitle} 更新失败`)
        printRed(error)
      }
    }
    printGreen(`日期 ${date} 更新完成！`)
  }

  // 重命名
  renameFileSync(interfacePath, interfacePath.replace(".bak", ""))
  renameFileSync(interfaceTXTPath, interfaceTXTPath.replace(".bak", ""))
  printGreen("PE更新完成！")
  const end = Date.now()
  printYellow(`PE更新耗时: ${(end - start) / 1000}秒`)
}

/**
 * @param {Number} hours - 更新小时数
 */
async function update(hours) {
  await updateTV(hours)
  await updatePE(hours)
}

// ==================== app.js (入口) ====================
async function main() {
  let hours = 0;
  try {
    printBlue(`开始初始化数据 ${getDateTimeStr(new Date())}`);
    await update(hours);
    printGreen("文件生成/更新完成！");
  } catch (error) {
    console.error("更新过程出错：", error);
    printRed("文件生成失败！");
    process.exit(1);
  }
  process.exit(0);
}
main();
