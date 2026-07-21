const config = require('../config')

function getProfileTable() {
  const cloudbase = getApp().globalData.cloudbase
  if (!cloudbase || typeof cloudbase.rdb !== 'function') {
    throw new Error('CloudBase RDB is unavailable. Check app.js initialization first.')
  }

  return cloudbase.rdb().from(config.rdbProfileTable)
}

async function fetchMyProfile() {
  const { data, error } = await getProfileTable()
    .select('*')
    .limit(1)
  assertSuccess(error, 'query user profile')

  const rows = Array.isArray(data) ? data : []
  return rows[0] ? mapProfile(rows[0]) : null
}

async function saveMyProfile(profile) {
  const record = {
    nickname: profile.nickname,
    avatar_url: profile.avatarUrl || null,
  }

  if (profile.id) {
    const { data, error, count } = await getProfileTable()
      .update(record, { count: 'exact' })
      .eq('id', profile.id)
    assertSuccess(error, 'update user profile')
    assertAffected(count, 'update user profile')
    return mapFirstProfile(data, { id: profile.id, ...record })
  }

  const { data, error } = await getProfileTable()
    .insert(record)
    .select()
  assertSuccess(error, 'create user profile')
  return mapFirstProfile(data, record)
}

function mapFirstProfile(data, fallback) {
  const row = Array.isArray(data) ? data[0] : data
  return mapProfile(row || fallback)
}

function mapProfile(row) {
  const id = row && row.id
  return {
    id: id === undefined || id === null ? '' : String(id),
    nickname: row && row.nickname ? String(row.nickname) : '',
    avatarUrl: row && row.avatar_url || row && row.avatarUrl || '',
  }
}

function assertSuccess(error, operation) {
  if (error) {
    throw new Error(`${operation} failed: ${error.message || error.code || 'unknown error'}`)
  }
}

function assertAffected(count, operation) {
  if (Number(count) === 0) {
    throw new Error(`${operation} did not affect any record. Check RDB write permissions.`)
  }
}

module.exports = {
  fetchMyProfile,
  saveMyProfile,
}
