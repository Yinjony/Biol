const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV }) // 云函数内初始化

exports.main = async (event, context) => {
  try {
    // 云函数拥有管理员权限，调用 getTempFileURL 不会报越权错误！
    const res = await cloud.getTempFileURL({
      fileList: [event.fileID], // 从前端传入的 fileID
    })
    return {
      success: true,
      tempURL: res.fileList[0].tempFileURL // 返回临时链接
    }
  } catch (err) {
    return { success: false, error: err }
  }
}
