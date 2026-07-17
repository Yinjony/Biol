const config = require('./config')

App({
  onLaunch() {
    if (wx.cloud) {
      wx.cloud.init({
        env: config.envId,
        traceUser: true,
      })
    }
  },

  globalData: {
    appName: '生物做题小程序',
  },
})
