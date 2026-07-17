// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init()

async function sendTemplateMessage(event) {
  const {OPENID} = cloud.getWXContext()

  // 接下来将新增模板、发送模板消息、然后删除模板
  // 注意：新增模板然后再删除并不是建议的做法，此处只是为了演示，模板 ID 应在添加后保存起来后续使用
  const addResult = await cloud.openapi.templateMessage.addTemplate({
    id: 'AT0002',
    keywordIdList: [3, 4, 5]
  })

  const templateId = addResult.result.templateId

  const sendResult = await cloud.openapi.templateMessage.send({
    touser: OPENID,
    templateId,
    formId: event.formId,
    page: 'page/cloud/pages/scf-openapi/scf-openapi',
    data: {
      keyword1: {
        value: '未名咖啡屋',
      },
      keyword2: {
        value: '2019 年 1 月 1 日',
      },
      keyword3: {
        value: '拿铁',
      },
    }
  })

  await cloud.openapi.templateMessage.deleteTemplate({
    templateId,
  })

  return sendResult
}

async function getWXACode() {
  const {result} = await cloud.openapi.wxacode.getUnlimited({
    scene: 'x=1',
  })

  // 此处返回 Base64 图片仅作为演示用，在实际开发中，
  // 应上传图片至云文件存储，然后在小程序中通过云文件 ID 使用
  return `data:${result.contentType};base64,${result.buffer.toString('base64')}`
}

async function ocrPrintedText(event) {
  try {
    const imgUrl = await getOcrImageUrl(event)
    if (!imgUrl) {
      return {
        ok: false,
        message: '缺少 OCR 图片。',
      }
    }

    const result = await cloud.openapi.ocr.printedText({
      imgUrl,
    })

    const text = extractOcrText(result)
    return {
      ok: Boolean(text),
      text,
      raw: result,
      message: text ? '' : '没有识别到可用文字。',
    }
  } catch (error) {
    return {
      ok: false,
      message: error.errMsg || error.message || 'OCR 调用失败。',
      error,
    }
  }
}

async function getOcrImageUrl(event) {
  if (event.imgUrl) {
    return event.imgUrl
  }

  if (!event.fileID) {
    return ''
  }

  const result = await cloud.getTempFileURL({
    fileList: [event.fileID],
  })
  const file = result.fileList && result.fileList[0]
  return file && file.tempFileURL ? file.tempFileURL : ''
}

function extractOcrText(result) {
  const candidates = []
  collectOcrText(result, candidates)
  return candidates
    .map((item) => String(item || '').trim())
    .filter(Boolean)
    .join('\n')
}

function collectOcrText(value, candidates) {
  if (!value) return

  if (typeof value === 'string') {
    try {
      collectOcrText(JSON.parse(value), candidates)
    } catch (error) {
      candidates.push(value)
    }
    return
  }

  if (Array.isArray(value)) {
    value.forEach((item) => collectOcrText(item, candidates))
    return
  }

  if (typeof value !== 'object') return

  ;['text', 'words', 'itemstring', 'itemString'].forEach((key) => {
    if (typeof value[key] === 'string') {
      candidates.push(value[key])
    }
  })

  ;['items', 'Items', 'ocrResult', 'ocr_result', 'textDetections', 'TextDetections'].forEach((key) => {
    if (value[key]) {
      collectOcrText(value[key], candidates)
    }
  })

  ;['result', 'data'].forEach((key) => {
    if (value[key]) {
      collectOcrText(value[key], candidates)
    }
  })
}

// 云函数入口函数
// eslint-disable-next-line
exports.main = async (event) => {
  switch (event.action) {
    case 'sendTemplateMessage': {
      return sendTemplateMessage(event)
    }
    case 'getWXACode': {
      return getWXACode(event)
    }
    case 'ocrPrintedText': {
      return ocrPrintedText(event)
    }
    default: break
  }
}
