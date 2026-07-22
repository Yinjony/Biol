const path = require('path')
const mammoth = require('mammoth')
const WordExtractor = require('word-extractor')

async function parseQuestionDocument(file) {
  const text = await extractDocumentText(file)
  return parseQuestionText(text)
}

async function extractDocumentText(file) {
  const extension = path.extname(file.originalname || '').toLowerCase()

  if (extension === '.docx') {
    const result = await mammoth.extractRawText({ buffer: file.buffer })
    return result.value || ''
  }

  if (extension === '.doc') {
    const extractor = new WordExtractor()
    const document = await extractor.extract(file.buffer)
    return document.getBody() || ''
  }

  throw new Error('仅支持 .docx 或 .doc 格式的 Word 文件')
}

function parseQuestionText(rawText) {
  const blocks = splitQuestionBlocks(rawText)
  const questions = []
  const invalid = []

  blocks.forEach((block, index) => {
    const parsed = parseQuestionBlock(block)
    if (parsed.ok) {
      questions.push(parsed.question)
      return
    }

    invalid.push({
      index: index + 1,
      message: parsed.message,
      content: trimQuestionNumber(block).slice(0, 80),
    })
  })

  return { questions, invalid }
}

function splitQuestionBlocks(rawText) {
  const text = String(rawText || '')
    .replace(/\r/g, '\n')
    .replace(/\u00a0/g, ' ')
    .trim()

  if (!text) return []

  return text
    .split(/(?=^\s*\d+\s*[.．、]\s*)/m)
    .map((block) => block.trim())
    .filter(Boolean)
}

function parseQuestionBlock(block) {
  const answerMatch = block.match(/(?:参考答案|正确答案|答案)\s*[:：]?\s*(正确|错误|对|错|√|×|true|false|[A-Da-d])/i)
  if (!answerMatch) {
    return { ok: false, message: '未识别到答案' }
  }

  const answerValue = answerMatch[1]
  const type = /^[A-Da-d]$/.test(answerValue) ? 'CHOICE' : 'JUDGE'
  const answer = normalizeAnswer(answerValue, type)
  if (!answer) {
    return { ok: false, message: '答案格式不正确' }
  }

  const content = trimQuestionNumber(block.slice(0, answerMatch.index))
  if (!content) {
    return { ok: false, message: '题干为空' }
  }

  if (type === 'JUDGE') {
    return {
      ok: true,
      question: {
        type,
        content,
        options: null,
        answer,
      },
    }
  }

  const options = parseChoiceOptions(block.slice(answerMatch.index + answerMatch[0].length))
  const hasAllOptions = ['A', 'B', 'C', 'D'].every((label) => options.some((option) => option.label === label))
  if (options.length !== 4 || !hasAllOptions) {
    return { ok: false, message: '选择题未读取到完整的 A-D 四个选项' }
  }

  return {
    ok: true,
    question: {
      type,
      content,
      options,
      answer,
    },
  }
}

function parseChoiceOptions(source) {
  const optionPattern = /([A-Da-d])\s*[.．、:：]\s*/g
  const matches = []
  let matched = optionPattern.exec(source)

  while (matched) {
    matches.push({
      label: matched[1].toUpperCase(),
      start: optionPattern.lastIndex,
      markerStart: matched.index,
    })
    matched = optionPattern.exec(source)
  }

  return matches
    .map((item, index) => ({
      label: item.label,
      text: compactText(source.slice(item.start, index + 1 < matches.length ? matches[index + 1].markerStart : source.length)),
    }))
    .filter((option) => option.text)
}

function trimQuestionNumber(value) {
  return compactText(String(value || '').replace(/^\s*\d+\s*[.．、]\s*/, ''))
}

function normalizeAnswer(value, type) {
  const answer = String(value || '').trim()
  if (type === 'CHOICE') return answer.toUpperCase()
  if (['对', '正确', 'true', '√'].includes(answer.toLowerCase())) return '对'
  if (['错', '错误', 'false', '×'].includes(answer.toLowerCase())) return '错'
  return ''
}

function compactText(value) {
  return String(value || '')
    .replace(/\s*\n\s*/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .trim()
}

module.exports = {
  parseQuestionDocument,
  parseQuestionText,
}
