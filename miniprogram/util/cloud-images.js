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

  const keys = Object.keys(FILE_IDS)
  imageUrlsPromise = wx.cloud.getTempFileURL({
    fileList: keys.map((key) => FILE_IDS[key]),
  }).then(({ fileList }) => keys.reduce((urls, key, index) => {
    urls[key] = fileList[index] && fileList[index].tempFileURL || ''
    return urls
  }, {})).catch((error) => {
    imageUrlsPromise = null
    throw error
  })

  return imageUrlsPromise
}

module.exports = { getImageUrls }
