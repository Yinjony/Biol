const cloud = require('wx-server-sdk')
const { parseQuestionDocument } = require('./document-parser')

const MAX_FILE_SIZE = 5 * 1024 * 1024

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

exports.main = async (event) => {
  const fileID = String(event && event.fileID || '')
  const originalName = String(event && event.originalName || '')

  if (!fileID) {
    return { ok: false, message: '缺少待导入的文件' }
  }

  if (!/\.(docx|doc)$/i.test(originalName)) {
    return { ok: false, message: '仅支持 .docx 或 .doc 格式的 Word 文件' }
  }

  try {
    const downloadResult = await cloud.downloadFile({ fileID })
    const fileBuffer = Buffer.from(downloadResult.fileContent || [])
    if (!fileBuffer.length) {
      return { ok: false, message: '文件内容为空，无法导入' }
    }
    if (fileBuffer.length > MAX_FILE_SIZE) {
      return { ok: false, message: '文件不能超过 5 MB' }
    }

    const result = await parseQuestionDocument({
      originalname: originalName,
      buffer: fileBuffer,
    })

    return { ok: true, data: result.questions, invalid: result.invalid }
  } catch (error) {
    console.error('Failed to parse uploaded Word document.', error)
    return {
      ok: false,
      message: error && error.message ? error.message : 'Word 文件解析失败，请检查文件是否损坏',
    }
  }
}
