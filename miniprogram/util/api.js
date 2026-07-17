const config = require('../config')

function request({ method = 'GET', path, data }) {
  return new Promise((resolve, reject) => {
    if (!wx.request) {
      reject(new Error('wx.request is unavailable'))
      return
    }

    wx.request({
      url: `${config.apiBaseUrl}${path}`,
      method,
      data,
      header: {
        'content-type': 'application/json',
      },
      success(res) {
        if (res.statusCode >= 200 && res.statusCode < 300 && res.data && res.data.ok !== false) {
          resolve(res.data)
          return
        }

        reject(new Error((res.data && res.data.message) || `HTTP ${res.statusCode}`))
      },
      fail(error) {
        reject(error)
      },
    })
  })
}

function get(path, data) {
  return request({ method: 'GET', path, data })
}

function post(path, data) {
  return request({ method: 'POST', path, data })
}

function put(path, data) {
  return request({ method: 'PUT', path, data })
}

function del(path) {
  return request({ method: 'DELETE', path })
}

function upload(path, filePath, name = 'file') {
  return new Promise((resolve, reject) => {
    wx.uploadFile({
      url: `${config.apiBaseUrl}${path}`,
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

module.exports = {
  get,
  post,
  put,
  del,
  upload,
}
