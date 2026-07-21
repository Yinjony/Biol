const profileRdb = require('../../util/profile-rdb')
const { getImageUrls } = require('../../util/cloud-images')

const defaultProfile = {
  id: '',
  nickname: '',
  avatarUrl: '',
}

Page({
  data: {
    logoUrl: '',
    profile: defaultProfile,
    avatarDisplayUrl: '',
    profileInitial: '我',
    loading: true,
    saving: false,
    hasProfile: false,
    statusText: '',
  },

  onLoad() {
    getImageUrls().then(({ logo }) => this.setData({ logoUrl: logo }))
      .catch((error) => console.error('Failed to load logo from cloud storage.', error))
  },

  onShow() {
    syncTabBar(this, 3)
    this.loadProfile()
  },

  async loadProfile() {
    this.setData({ loading: true })
    try {
      const profile = await profileRdb.fetchMyProfile()
      const nextProfile = profile || defaultProfile
      const avatarDisplayUrl = await getDisplayAvatarUrl(nextProfile.avatarUrl)
      this.setData({
        profile: nextProfile,
        avatarDisplayUrl,
        profileInitial: getInitial(nextProfile.nickname),
        hasProfile: Boolean(profile),
        statusText: profile ? '已同步你的个人资料' : '填写昵称后保存，即可创建个人资料',
      })
    } catch (error) {
      console.error('Failed to load user profile.', error)
      this.setData({
        statusText: '个人资料暂不可用，请先完成 user_profile 表配置',
      })
      showToast('个人资料加载失败')
    } finally {
      this.setData({ loading: false })
    }
  },

  onNicknameInput(event) {
    const nickname = String(event.detail.value || '').slice(0, 20)
    this.setData({
      'profile.nickname': nickname,
      profileInitial: getInitial(nickname),
    })
  },

  onChooseAvatar(event) {
    const avatarUrl = event.detail && event.detail.avatarUrl
    if (!avatarUrl) return
    this.setData({
      'profile.avatarUrl': avatarUrl,
      avatarDisplayUrl: avatarUrl,
    })
  },

  async saveProfile() {
    if (this.data.saving) return

    const nickname = this.data.profile.nickname.trim()
    if (!nickname) {
      showToast('请填写昵称')
      return
    }

    this.setData({ saving: true })
    try {
      const avatarUrl = await uploadAvatar(this.data.profile.avatarUrl)
      const savedProfile = await profileRdb.saveMyProfile({
        ...this.data.profile,
        nickname,
        avatarUrl,
      })
      const profile = savedProfile.id ? savedProfile : await profileRdb.fetchMyProfile()
      const avatarDisplayUrl = await getDisplayAvatarUrl(avatarUrl)

      this.setData({
        profile: { ...this.data.profile, ...profile, nickname, avatarUrl },
        avatarDisplayUrl,
        profileInitial: getInitial(nickname),
        hasProfile: true,
        statusText: '个人资料已保存',
      })
      showToast('保存成功')
    } catch (error) {
      console.error('Failed to save user profile.', error)
      showToast('保存失败，请检查资料表权限')
    } finally {
      this.setData({ saving: false })
    }
  },
})

async function uploadAvatar(avatarUrl) {
  if (!avatarUrl || avatarUrl.startsWith('cloud://')) return avatarUrl
  if (!wx.cloud || typeof wx.cloud.uploadFile !== 'function') {
    throw new Error('Cloud storage is unavailable.')
  }

  const extensionMatch = avatarUrl.match(/\.([a-zA-Z0-9]+)(?:\?.*)?$/)
  const extension = extensionMatch ? extensionMatch[1].toLowerCase() : 'png'
  const cloudPath = `profile-avatars/${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${extension}`
  const { fileID } = await wx.cloud.uploadFile({ cloudPath, filePath: avatarUrl })
  if (!fileID) throw new Error('Cloud storage did not return a file ID.')
  return fileID
}

async function getDisplayAvatarUrl(avatarUrl) {
  if (!avatarUrl || !avatarUrl.startsWith('cloud://')) return avatarUrl
  if (!wx.cloud || typeof wx.cloud.getTempFileURL !== 'function') return ''

  try {
    const { fileList = [] } = await wx.cloud.getTempFileURL({ fileList: [avatarUrl] })
    return fileList[0] && fileList[0].tempFileURL || ''
  } catch (error) {
    console.error('Failed to resolve profile avatar from cloud storage.', error)
    return ''
  }
}

function getInitial(nickname) {
  return String(nickname || '').trim().slice(0, 1) || '我'
}

function showToast(title) {
  wx.showToast({ title, icon: 'none' })
}

function syncTabBar(page, selected) {
  const tabBar = typeof page.getTabBar === 'function' && page.getTabBar()
  if (tabBar) tabBar.setSelected(selected)
}
