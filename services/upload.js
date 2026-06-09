const config = require('../config/index')

function isLocalFilePath(filePath) {
  if (!filePath || typeof filePath !== 'string') return false
  const value = filePath.trim()
  if (!value) return false
  if (/^https?:\/\/tmp\//i.test(value)) return true
  if (/^https?:\/\//i.test(value)) return false
  if (/^data:/i.test(value)) return false
  return true
}

function uploadFile(filePath) {
  return new Promise((resolve, reject) => {
    wx.getStorage({
      key: 'token',
      complete(storageRes) {
        wx.uploadFile({
          url: `${config.apiBaseUrl}/api/upload`,
          filePath,
          name: 'file',
          header: {
            Authorization: storageRes.data ? `Bearer ${storageRes.data}` : '',
          },
          success(res) {
            if (res.statusCode === 200) {
              try {
                const body = JSON.parse(res.data)
                if (body.data && body.data.url) {
                  resolve(body.data.url)
                } else {
                  reject(new Error(body.msg || 'upload failed'))
                }
              } catch (e) {
                reject(new Error('parse upload response failed'))
              }
            } else {
              reject(new Error('upload ' + res.statusCode))
            }
          },
          fail: reject,
        })
      },
    })
  })
}

async function uploadFileIfNeeded(filePath) {
  if (!isLocalFilePath(filePath)) {
    return filePath || ''
  }
  return uploadFile(filePath)
}

module.exports = { uploadFile, uploadFileIfNeeded, isLocalFilePath }
