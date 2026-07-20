const config = require('./config')

App({
  onLaunch() {
    if (wx.cloud) {
      wx.cloud.init({
        env: config.envId,
        traceUser: true,
      })
      this.globalData.cloudbase = wx.cloud
    }
  },
  globalData: {
    cloudbase: null,
    appName: '生物做题小程序',
  },
})
