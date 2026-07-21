const cloud = require('wx-server-sdk')
const crypto = require('crypto')

cloud.init()

// 云函数入口函数
exports.main = async () => {
  const wxContext = cloud.getWXContext()

  return {
    openid: wxContext.OPENID,
    appid: wxContext.APPID,
    unionid: wxContext.UNIONID,
    ownerKey: crypto
      .createHash('sha256')
      .update(`question-owner:${wxContext.OPENID}`)
      .digest('hex'),
  }
}
