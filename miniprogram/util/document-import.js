const MAX_FILE_SIZE = 5 * 1024 * 1024

async function importQuestionDocument(file) {
  if (!file || !file.path) {
    throw new Error('没有找到要导入的文件')
  }
  if (!wx.cloud || typeof wx.cloud.uploadFile !== 'function' || typeof wx.cloud.callFunction !== 'function') {
    throw new Error('云开发不可用，请重新打开小程序后再试')
  }
  if (Number(file.size) > MAX_FILE_SIZE) {
    throw new Error('文件不能超过 5 MB')
  }

  const originalName = file.name || getFileName(file.path)
  if (!/\.(docx|doc)$/i.test(originalName)) {
    throw new Error('仅支持 .docx 或 .doc 格式的 Word 文件')
  }

  const extension = originalName.split('.').pop().toLowerCase()
  const cloudPath = `question-imports/${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${extension}`
  let fileID = ''

  try {
    const uploadResult = await wx.cloud.uploadFile({ cloudPath, filePath: file.path })
    fileID = uploadResult.fileID
    if (!fileID) {
      throw new Error('文件上传失败，请重试')
    }

    let callResult
    try {
      callResult = await wx.cloud.callFunction({
        name: 'documentImport',
        data: { fileID, originalName },
      })
    } catch (error) {
      if (isDocumentImportFunctionMissing(error)) {
        throw new Error('导入服务尚未部署，请在开发者工具中部署 documentImport 云函数')
      }
      throw error
    }
    const result = callResult.result || {}
    if (result.ok === false) {
      throw new Error(result.message || 'Word 文件解析失败')
    }
    return result
  } finally {
    if (fileID && typeof wx.cloud.deleteFile === 'function') {
      try {
        await wx.cloud.deleteFile({ fileList: [fileID] })
      } catch (error) {
        console.warn('Failed to remove temporary import file.', error)
      }
    }
  }
}

function getFileName(filePath) {
  const parts = String(filePath || '').replace(/\\/g, '/').split('/')
  return parts[parts.length - 1] || ''
}

function isDocumentImportFunctionMissing(error) {
  const message = String(error && (error.errMsg || error.message) || '')
  return message.includes('FUNCTION_NOT_FOUND')
    || message.includes('FunctionName parameter could not be found')
    || message.includes('errCode: -501000')
}

module.exports = { importQuestionDocument }
