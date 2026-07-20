const config = require('./config')
const { init } = require("@cloudbase/wx-cloud-client-sdk");

App({
  onLaunch() {
    if (wx.cloud) {
      wx.cloud.init({
        env: config.envId,
        traceUser: true,
      })
      this.globalData.cloudbase = init(wx.cloud)
    }
  },
  globalData: {
    appName: '生物做题小程序',
  },
})
