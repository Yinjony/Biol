/**
 * 小程序配置文件
 */

const host = '14592619.qcloud.la'

const config = {
  // This HTTP endpoint is used only for Word document parsing during import.
  documentImportApiBaseUrl: 'http://127.0.0.1:3000',

  // 测试的请求地址，用于测试会话
  requestUrl: 'https://mp.weixin.qq.com',
  host,

  // 云开发环境 ID
  envId: 'cloud1-d4g11jwpy015d4066',
  // envId: 'test-f0b102',

  // Question data is stored exclusively in CloudBase RDB.
  rdbQuestionTable: 'question',
  rdbProfileTable: 'user_profile',

  // 云开发-存储 示例文件的文件 ID
  demoImageFileId: 'cloud://release-b86096.7265-release-b86096-1258211818/demo.jpg',
  demoVideoFileId: 'cloud://release-b86096.7265-release-b86096/demo.mp4',
}

module.exports = config
