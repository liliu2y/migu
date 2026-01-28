// 全局设置时区为北京时间（关键补充）
process.env.TZ = 'Asia/Shanghai';

// 改造后：仅保留文件生成核心逻辑，移除HTTP服务器、请求处理等无关代码
import { getDateTimeStr } from "./utils/time.js";
import update from "./utils/updateData.js";
import { printBlue, printGreen, printRed } from "./utils/colorOut.js";

// 核心：仅保留数据更新/文件生成逻辑
async function generateTargetFiles() {
  // 初始化运行时长（与原始逻辑保持一致）
  let hours = 0;
  
  try {
    // 执行核心更新逻辑（生成 interface.txt/interfaceTXT.txt/playback.xml）
    printBlue(`开始初始化数据 ${getDateTimeStr(new Date())}`);
    await update(hours);
    printGreen("✅ 文件生成/更新完成！");
  } catch (error) {
    console.error("❌ 更新过程出错：", error);
    printRed("文件生成失败！");
    // 生成失败时主动退出并返回错误码，让GitHub Actions感知失败
    process.exit(1);
  }

  // 生成成功后主动退出，避免进程常驻
  process.exit(0);
}

// 执行文件生成逻辑
generateTargetFiles();
