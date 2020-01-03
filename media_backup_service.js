const express = require('express')
const request = require('request')
const glob = require('glob')
const hasha = require('hasha')
const path = require('path')
const S = require('string')

var serverPrefix = 'http://localhost'

const createPhotoSource = uri => {
  return new Promise((resolve, reject) => request.post(`${serverPrefix}/photoSources`, {
    json: {
      uri
    }
  }, (err, res, body) => {
    if (err) {
      reject(err)
      return
    }
    resolve(body)
  }))
}

const getPhotoSources = () => {
  return new Promise((resolve, reject) => request.get(`${serverPrefix}/photoSources`, (err, res, body) => {
    if (err) {
      reject(err)
      return
    }
    resolve(JSON.parse(body))
  }))
}

const createGoogleAlbum = title => {
  return new Promise((resolve, reject) => request.post(`${serverPrefix}/google/albums`, {
    json: {
      title
    }
  }, (err, res, body) => {
    if (err) {
      reject(err)
      return
    }
    resolve(body)
  }))
}

const createDatabaseAlbum = values => {
  return new Promise((resolve, reject) => request.post(`${serverPrefix}/albums`, {
    json: values
  }, (err, res, body) => {
    if (err) {
      reject(err)
      return
    }
    resolve(body)
  }))
}

const createAlbum = title => {
  return createGoogleAlbum(title).then(album => createDatabaseAlbum({
    title: title,
    googleId: album.id,
    googleProductUrl: album.productUrl
  }))
}

const getAlbum = id => {
  return new Promise((resolve, reject) => request.get(`${serverPrefix}/albums/${encodeURIComponent(id)}`, (err, res, body) => {
    if (err) {
      reject(err)
      return
    }
    const album = JSON.parse(body)
    resolve(album)
  }))
}

const findAlbum = title => {
  return new Promise((resolve, reject) => request.get(`${serverPrefix}/albums?title=${encodeURIComponent(title)}`, (err, res, body) => {
    if (err) {
      reject(err)
      return
    }
    const [album] = JSON.parse(body)
    resolve(album)
  }))
}

const createDatabaseMediaItem = values => {
  return new Promise((resolve, reject) => request.post(`${serverPrefix}/mediaItems`, {
    json: values
  }, (err, res, body) => {
    if (err) {
      reject(err)
      return
    }
    resolve(body)
  }))
}

const uploadMediaItem = mediaItem => {
  return new Promise((resolve, reject) => request.post(`${serverPrefix}/google/mediaItems/upload`, {
    json: {
      mediaItem
    }
  }, (err, res, body) => {
    if (err) {
      reject(err)
      return
    }
    resolve(body)
  }))
}

const createGoogleMediaItems = (album, mediaItems) => {
  return new Promise((resolve, reject) => request.post(`${serverPrefix}/google/mediaItems/batchCreate`, {
    json: {
      albumId: album.googleId,
      mediaItems
    }
  }, (err, res, body) => {
    if (err) {
      reject(err)
      return
    }
    resolve(body)
  }))
}

const updateDatabaseMediaItem = (id, values) => {
  return new Promise((resolve, reject) => request.put(`${serverPrefix}/mediaItems/${encodeURIComponent(id)}`, {
    json: values
  }, (err, res, body) => {
    if (err) {
      reject(err)
      return
    }
    resolve(body)
  }))
}

const findMediaItem = filekey => {
  return new Promise((resolve, reject) => request.get(`${serverPrefix}/mediaItems?filekey=${encodeURIComponent(filekey)}`, (err, res, body) => {
    if (err) {
      reject(err)
      return
    }
    const [mediaItem] = JSON.parse(body)
    resolve(mediaItem)
  }))
}

const getFileInfos = dirpath => {
  return new Promise((resolve, reject) => glob('**/*+(.png|.jpg|.jpeg|.bmp|.gif|.heic|.ico|.tiff|.tif|.webp|.raw|.3gp|.3g2|.asf|.avi|.divx|.m2t|.m2ts|.m4v|.mkv|.mmv|.mod|.mov|.mp4|.mpg|.mts|.tod|.wmv)', {
    cwd: dirpath
  }, async (err, files) => {
    if (err) {
      reject(err)
      return
    }
    const fileInfo = []
    for (let i in files) {
      const file = files[i]
      fileInfo.push({
        file,
        filepath: `${dirpath}/${file}`,
        filename: path.basename(file),
        name: path.parse(file).name,
        relativePath: path.dirname(file),
        albumTitle: path.dirname(file).split('/').join(' - '),
        hash: await hasha.fromFile(`${dirpath}/${file}`, {algorithm: 'md5'})
      })
    }
    resolve(fileInfo)
  }))
}

const processPhotoSources = () => {
  return getPhotoSources().then(photoSources => {
    let promise = Promise.resolve()
    for (let i in photoSources) {
      const photoSource = photoSources[i]
      promise = promise.then(allFiles =>
        getFileInfos(S(photoSource.uri).stripLeft('file://').toString()).then(files => {
          if (allFiles) {
            allFiles.push.apply(allFiles, files)
            return allFiles
          }
          return files
        })
      )
    }
    return promise
  }).then(async fileInfos => {
    const map = {}
    for (let i in fileInfos) {
      const fileInfo = fileInfos[i]
      if (!map.hasOwnProperty(fileInfo.albumTitle)) {
        map[fileInfo.albumTitle] = []
      }
      map[fileInfo.albumTitle].push(fileInfo)
    }

    const infos = []
    for (let title in map) {
      let album = await findAlbum(title)
      if (!album) {
        album = await createAlbum(title)
      }
      for (let i in map[title]) {
        const fileInfo = map[title][i]
        fileInfo.album = album
        infos.push(fileInfo)
      }
    }
    return infos
  }).then(fileInfos => fileInfos.map(fileInfo => ({
    filekey: `${fileInfo.album.title}/${fileInfo.filename}`,
    filepath: fileInfo.filepath,
    albumId: fileInfo.album.id,
    hash: fileInfo.hash
  }))).then(async mediaItems => {
    const databaseMediaItems = []
    for (let i in mediaItems) {
      const mediaItem = mediaItems[i]
      let databaseMediaItem = await findMediaItem(mediaItem.filekey)
      if (!databaseMediaItem) {
        databaseMediaItem = await createDatabaseMediaItem(mediaItem)
      }
      if (databaseMediaItem.hash !== mediaItem.hash) {
        console.error('hash mismatch: ', {
          mediaItem,
          databaseMediaItem
        })
      }
      if (!databaseMediaItem.googleId && databaseMediaItem.status !== 'PENDING') {
        databaseMediaItem.status = 'PENDING'
        await updateDatabaseMediaItem(databaseMediaItem.id, databaseMediaItem)
      }
      if (databaseMediaItem.status === 'PENDING') {
        databaseMediaItems.push(databaseMediaItem)
      }
    }
    return databaseMediaItems
  }).then(async mediaItems => {
    const map = {}
    const nextMediaItems = []
    for (let i in mediaItems) {
      const mediaItem = mediaItems[i]
      if (!mediaItem.googleId) {
        if (!map.hasOwnProperty(mediaItem.albumId)) {
          map[mediaItem.albumId] = []
        }
        map[mediaItem.albumId].push(mediaItem)
      } else {
        nextMediaItems.push(mediaItem)
      }
    }

    for (let albumId in map) {
      const album = await getAlbum(albumId)

      for (let i in map[albumId]) {
        const mediaItem = map[albumId][i]
        if (!mediaItem.googleUploadToken) {
          mediaItem.status = 'UPLOADING'
          await updateDatabaseMediaItem(mediaItem.id, mediaItem)
          const uploadToken = await uploadMediaItem(mediaItem)
          mediaItem.googleUploadToken = uploadToken
          mediaItem.status = 'UPLOADED'
          await updateDatabaseMediaItem(mediaItem.id, mediaItem)
          map[albumId][i] = mediaItem
        }
      }

      const response = await createGoogleMediaItems(album, map[albumId])
      const googleMediaItems = response.newMediaItemResults

      for (let i in map[albumId]) {
        const mediaItem = map[albumId][i]
        if (googleMediaItems) {
          const [googleMediaItem] = googleMediaItems.filter(googleMediaItem => mediaItem.googleUploadToken === googleMediaItem.uploadToken)
          if (googleMediaItem.status.message === 'Success') {
            mediaItem.googleId = googleMediaItem.mediaItem.id
            mediaItem.googleProductUrl = googleMediaItem.mediaItem.productUrl
            mediaItem.status = 'COMPLETE'
            await updateDatabaseMediaItem(mediaItem.id, mediaItem)
          } else {
            console.error(googleMediaItem)
          }
        } else {
          console.error('googleMediaItems is undefined')
        }
        nextMediaItems.push(mediaItem)
      }
    }

    return nextMediaItems
  }).then(mediaItems => {
    console.log(mediaItems)
  })
}

const createRouter = () => {
  const router = express.Router()

  router.post('/', async (req, res) => {
    getPhotoSources().then(async photoSources => {
      if (photoSources.length === 0) {
        // await createPhotoSource('file://C:/Users/jaeic/Downloads/photos')
      }
    }).then(() => processPhotoSources())
      .then(() => res.send('done'))
  })

  return router
}

const initializeMediaBackupService = (app, serverUriPrefix) => {
  serverPrefix = serverUriPrefix
  app.use('/backup', createRouter())
}

module.exports = {
  initializeMediaBackupService,
  createPhotoSource,
  createAlbum
}
