const FILE_IDS = Object.freeze({
  logo: 'cloud://cloud1-d4g11jwpy015d4066.636c-cloud1-d4g11jwpy015d4066-1455956417/logo.png',
  tabBank: 'cloud://cloud1-d4g11jwpy015d4066.636c-cloud1-d4g11jwpy015d4066-1455956417/tab-bank.png',
  tabBankActive: 'cloud://cloud1-d4g11jwpy015d4066.636c-cloud1-d4g11jwpy015d4066-1455956417/tab-bank-active.png',
  tabQuiz: 'cloud://cloud1-d4g11jwpy015d4066.636c-cloud1-d4g11jwpy015d4066-1455956417/tab-quiz.png',
  tabQuizActive: 'cloud://cloud1-d4g11jwpy015d4066.636c-cloud1-d4g11jwpy015d4066-1455956417/tab-quiz-active.png',
  tabCreate: 'cloud://cloud1-d4g11jwpy015d4066.636c-cloud1-d4g11jwpy015d4066-1455956417/tab-create.png',
  tabCreateActive: 'cloud://cloud1-d4g11jwpy015d4066.636c-cloud1-d4g11jwpy015d4066-1455956417/tab-create-active.png',
})

let imageUrlsPromise

function getImageUrls() {
  if (imageUrlsPromise) return imageUrlsPromise

  if (!wx.cloud || !wx.cloud.getTempFileURL) {
    return Promise.reject(new Error('Cloud storage is unavailable. Check wx.cloud.init().'))
  }

  const keys = Object.keys(FILE_IDS)
  imageUrlsPromise = wx.cloud.getTempFileURL({
    fileList: keys.map((key) => FILE_IDS[key]),
  }).then(({ fileList = [] }) => {
    const filesById = fileList.reduce((files, file) => {
      files[file.fileID] = file
      return files
    }, {})
    const imageUrls = keys.reduce((urls, key) => {
      const file = filesById[FILE_IDS[key]]
      urls[key] = file && file.tempFileURL || ''
      if (!urls[key]) {
        console.error(`Failed to resolve cloud image: ${key}`, file || 'Missing response item')
      }
      return urls
    }, {})
    if (!keys.some((key) => imageUrls[key])) {
      throw new Error('All cloud image URLs are empty. Check the cloud environment ID and Cloud Storage read permission.')
    }
    return imageUrls
  }).catch((error) => {
    imageUrlsPromise = null
    throw error
  })

  return imageUrlsPromise
}

function getImageFileIds() {
  return FILE_IDS
}

module.exports = { getImageUrls, getImageFileIds }
