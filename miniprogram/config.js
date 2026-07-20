/**
 * 小程序配置文件
 */

const host = '14592619.qcloud.la'

const config = {
  apiBaseUrl: 'mysql://[DB-USERNAME]:[DB-PASSWORD]@sh-cynosdbmysql-grp-mavu3pdo.sql.tencentcdb.com:22025/cloud1-d4g11jwpy015d4066',

  // 测试的请求地址，用于测试会话
  requestUrl: 'https://mp.weixin.qq.com',
  host,

  // 云开发环境 ID
  envId: 'cloud1-d4g11jwpy015d4066',
  // envId: 'test-f0b102',

  // Question data source: use CloudBase RDB first and retain the original HTTP API as fallback.
  questionDataSource: 'cloud-rdb',
  rdbQuestionTable: 'question',

  // 云开发-存储 示例文件的文件 ID
  demoImageFileId: 'cloud://release-b86096.7265-release-b86096-1258211818/demo.jpg',
  demoVideoFileId: 'cloud://release-b86096.7265-release-b86096/demo.mp4',
}

module.exports = config
