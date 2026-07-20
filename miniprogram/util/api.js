const config = require('../config')

function upload(path, filePath, name = 'file') {
  return new Promise((resolve, reject) => {
    wx.uploadFile({
      url: `${config.documentImportApiBaseUrl}${path}`,
      filePath,
      name,
      success(res) {
        let data
        try {
          data = JSON.parse(res.data || '{}')
        } catch (error) {
          reject(new Error('文件解析服务返回了无效数据'))
          return
        }

        if (res.statusCode >= 200 && res.statusCode < 300 && data.ok !== false) {
          resolve(data)
          return
        }

        reject(new Error(data.message || `HTTP ${res.statusCode}`))
      },
      fail(error) {
        reject(error)
      },
    })
  })
}

module.exports = { upload }
