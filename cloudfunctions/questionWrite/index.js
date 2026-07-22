const crypto = require('crypto')
const cloud = require('wx-server-sdk')
const cloudbase = require('@cloudbase/node-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const app = cloudbase.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const models = app.models

const CREATE_QUESTION_SQL = [
  'INSERT INTO `question` (`id`, `type`, `content`, `options`, `answer`, `createdAt`, `updatedAt`, `_openid`, `owner_key`)',
  'VALUES ({{id}}, {{type}}, {{content}}, {{optionsJson}}, {{answer}}, CURRENT_TIMESTAMP(6), CURRENT_TIMESTAMP(6), {{openid}}, {{ownerKey}})',
].join(' ')

const UPDATE_QUESTION_SQL = [
  'UPDATE `question`',
  'SET `type` = {{type}}, `content` = {{content}}, `options` = {{optionsJson}}, `answer` = {{answer}}, `updatedAt` = CURRENT_TIMESTAMP(6)',
  'WHERE `id` = {{id}} AND `owner_key` = {{ownerKey}}',
].join(' ')

const DELETE_QUESTION_SQL = 'DELETE FROM `question` WHERE `id` = {{id}} AND `owner_key` = {{ownerKey}}'

const ALL_QUESTION_STATS_SQL = [
  'SELECT COUNT(*) AS `total`,',
  "SUM(CASE WHEN `type` = 'CHOICE' THEN 1 ELSE 0 END) AS `choice`,",
  "SUM(CASE WHEN `type` = 'JUDGE' THEN 1 ELSE 0 END) AS `judge`",
  'FROM `question`',
].join(' ')

const MY_QUESTION_STATS_SQL = `${ALL_QUESTION_STATS_SQL} WHERE \`owner_key\` = {{ownerKey}}`

exports.main = async (event) => {
  try {
    const action = String(event && event.action || '')
    const context = cloud.getWXContext()
    const openid = String(context.OPENID || '')
    if (!openid) {
      throw new Error('无法识别当前用户，请重新登录后再试')
    }

    const ownerKey = createOwnerKey(openid)
    if (action === 'stats') {
      const sql = event.ownerOnly ? MY_QUESTION_STATS_SQL : ALL_QUESTION_STATS_SQL
      const result = await models.$runSQL(sql, event.ownerOnly ? { ownerKey } : {})
      return { ok: true, stats: extractStats(result) }
    }

    if (action === 'create') {
      const question = normalizeQuestion(event.payload)
      const id = createUuid()
      await models.$runSQL(CREATE_QUESTION_SQL, buildQuestionParameters({ id, question, openid, ownerKey }))
      return { ok: true, question: { id, ...question } }
    }

    if (action === 'update') {
      const id = requireId(event.id)
      const question = normalizeQuestion(event.payload)
      const result = await models.$runSQL(UPDATE_QUESTION_SQL, buildQuestionParameters({ id, question, ownerKey }))
      assertAffected(result, '题目不存在或无权修改')
      return { ok: true, question: { id, ...question } }
    }

    if (action === 'delete') {
      const id = requireId(event.id)
      const result = await models.$runSQL(DELETE_QUESTION_SQL, { id, ownerKey })
      assertAffected(result, '题目不存在或无权删除')
      return { ok: true }
    }

    throw new Error('不支持的题目写入操作')
  } catch (error) {
    console.error('Failed to write question.', error)
    return {
      ok: false,
      message: error && error.message ? error.message : '题目保存失败',
    }
  }
}

function buildQuestionParameters({ id, question, openid, ownerKey }) {
  return {
    id,
    type: question.type,
    content: question.content,
    // Keep JSON as a string parameter. MySQL validates and stores it in the JSON
    // column, while the SQL driver never receives a JavaScript array.
    optionsJson: question.type === 'CHOICE' ? JSON.stringify(question.options) : null,
    answer: question.answer,
    openid,
    ownerKey,
  }
}

function normalizeQuestion(payload) {
  const source = payload || {}
  const type = source.type === 'JUDGE' ? 'JUDGE' : source.type === 'CHOICE' ? 'CHOICE' : ''
  const content = compactText(source.content)
  const answer = String(source.answer || '').trim()

  if (!type || !content || !answer) {
    throw new Error('题目内容不完整')
  }

  if (type === 'JUDGE') {
    if (!['对', '错'].includes(answer)) {
      throw new Error('判断题答案必须为“对”或“错”')
    }
    return { type, content, options: null, answer }
  }

  const options = normalizeChoiceOptions(source.options)
  if (options.length !== 4 || !['A', 'B', 'C', 'D'].every((label) => options.some((option) => option.label === label))) {
    throw new Error('选择题必须包含完整的 A-D 四个选项')
  }
  if (!options.some((option) => option.label === answer)) {
    throw new Error('选择题答案必须对应已有选项')
  }

  return { type, content, options, answer }
}

function normalizeChoiceOptions(value) {
  if (!Array.isArray(value)) return []

  return value
    .map((option) => ({
      label: String(option && option.label || '').trim().toUpperCase(),
      text: compactText(option && option.text),
    }))
    .filter((option) => ['A', 'B', 'C', 'D'].includes(option.label) && option.text)
}

function assertAffected(result, message) {
  const affected = Number(result && result.data && result.data.total || 0)
  if (affected === 0) throw new Error(message)
}

function extractStats(result) {
  const data = result && result.data || {}
  const rows = data.executeResultList || data.data || []
  const row = Array.isArray(rows) ? rows[0] : rows
  return {
    total: Number(row && row.total || 0),
    choice: Number(row && row.choice || 0),
    judge: Number(row && row.judge || 0),
  }
}

function requireId(value) {
  const id = String(value || '')
  if (!id) throw new Error('缺少题目编号')
  return id
}

function createOwnerKey(openid) {
  return crypto
    .createHash('sha256')
    .update(`question-owner:${openid}`)
    .digest('hex')
}

function createUuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (character) => {
    const random = Math.floor(Math.random() * 16)
    const value = character === 'x' ? random : (random & 0x3) | 0x8
    return value.toString(16)
  })
}

function compactText(value) {
  return String(value || '')
    .replace(/\s*\n\s*/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .trim()
}
