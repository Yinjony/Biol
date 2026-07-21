let ownerKeyPromise

function getCurrentOwnerKey() {
  if (ownerKeyPromise) return ownerKeyPromise

  if (!wx.cloud || typeof wx.cloud.callFunction !== 'function') {
    return Promise.reject(new Error('Cloud functions are unavailable.'))
  }

  ownerKeyPromise = wx.cloud.callFunction({ name: 'wxContext' })
    .then((result) => {
      const ownerKey = result && result.result && result.result.ownerKey
      if (!ownerKey) {
        throw new Error('Cloud function did not return the current user identifier.')
      }
      return ownerKey
    })
    .catch((error) => {
      ownerKeyPromise = null
      throw error
    })

  return ownerKeyPromise
}

module.exports = { getCurrentOwnerKey }
