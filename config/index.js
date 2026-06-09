/**
 * 应用配置
 */

module.exports = {
  // 环境：'dev' | 'prod'
  env: 'dev',

  // API 域名。本地开发时请先启动 child-notes-backend，默认端口 8080。
  // 生产或测试环境请改成你自己的 HTTPS 域名，并在微信公众平台配置 request 合法域名。
  apiBaseUrl: 'http://localhost:8080',
  // 是否启用接口预留模式。接入真实后端后保持 false。
  useMockApi: false,

  // 应用名称
  appName: '成长记录',

  // 记录类型常量
  recordType: {
    FEED: 'feed',           // 喂奶
    SLEEP: 'sleep',         // 睡眠
    DIAPER: 'diaper',       // 换尿布
    GROWTH: 'growth',       // 成长（身高/体重）
    TEMPERATURE: 'temp',    // 体温
    VACCINE: 'vaccine',     // 疫苗
    MILESTONE: 'milestone', // 里程碑
    SUPPLEMENT: 'supplement', // 补给用药
    PUMP: 'pump',             // 吸奶
    COMPLEMENTARY: 'complementary', // 辅食
  },

  // 喂奶类型
  feedType: {
    BREAST: 'breast',       // 母乳
    BOTTLE: 'bottle',       // 配方奶
    EXPRESSED: 'expressed', // 母乳瓶喂
  },

  // 尿布类型
  diaperType: {
    WET: 'wet',             // 小便
    DIRTY: 'dirty',         // 大便
    BOTH: 'both',           // 都有
  },
}
