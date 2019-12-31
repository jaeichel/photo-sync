const express = require('express')
const request = require('request')
var serverPrefix = 'http://localhost'

const getAllGoogleAlbums = (pageToken) => {
  let uri = `${serverPrefix}/google/albums?pageSize=50`
  if (pageToken) {
    uri += `&pageToken=${encodeURIComponent(pageToken)}`
  }
  return new Promise((resolve, reject) => request.get(uri, async (err, resp, body) => {
    if (err) {
      reject(err)
      return
    }

    const json = JSON.parse(body)

    var nextAlbums
    if (json.hasOwnProperty('nextPageToken')) {
      nextAlbums = await getAllGoogleAlbums(json.nextPageToken)
    }

    const { albums } = json
    if (nextAlbums) {
      albums.push.apply(albums, nextAlbums)
    }

    resolve(albums)
  }))
}

const findDatabaseAlbum = googleId => {
  return new Promise((resolve, reject) => request.get(`${serverPrefix}/albums?googleId=${encodeURIComponent(googleId)}`, (err, res, body) => {
    if (err) {
      reject(err)
      return
    }
    const [album] = JSON.parse(body)
    resolve(album)
  }))
}

const findDatabaseAlbums = async googleIds => {
  const databaseAlbums = []
  for (let i in googleIds) {
    const googleId = googleIds[i]
    databaseAlbums.push(await findDatabaseAlbum(googleId))
  }
  return databaseAlbums
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

const getAllAlbumMediaItems = (albumId, pageToken) => {
  let uri = `${serverPrefix}/google/mediaItems/search?albumId=${encodeURIComponent(albumId)}&pageSize=50`
  if (pageToken) {
    uri += `&pageToken=${encodeURIComponent(pageToken)}`
  }
  return new Promise((resolve, reject) => request.get(uri, async (err, res, body) => {
    if (err) {
      reject(err)
      return
    }

    const json = JSON.parse(body)

    var nextMediaItems
    if (json.hasOwnProperty('nextPageToken')) {
      nextMediaItems = await getAllGoogleAlbums(json.nextPageToken)
    }

    const { mediaItems } = json
    if (nextMediaItems) {
      mediaItems.push.apply(mediaItems, nextMediaItems)
    }

    resolve(mediaItems)
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

const restoreDatabaseFromGoogle = async () => {
  const googleAlbums = await getAllGoogleAlbums()
  let databaseAlbums = await findDatabaseAlbums(googleAlbums.map(album => album.id))

  const missingAlbums = []
  for (let i in googleAlbums) {
    const googleAlbum = googleAlbums[i]
    const databaseAlbum = databaseAlbums[i]
    if (!databaseAlbum) {
      missingAlbums.push(googleAlbum)
    }
  }

  for (let i in missingAlbums) {
    const googleAlbum = missingAlbums[i]
    await createDatabaseAlbum({
      title: googleAlbum.title,
      googleId: googleAlbum.id,
      googleProductUrl: googleAlbum.productUrl
    })
  }

  databaseAlbums = await findDatabaseAlbums(googleAlbums.map(album => album.id))
  for (let i in googleAlbums) {
    const googleAlbum = googleAlbums[i]
    const databaseAlbum = databaseAlbums[i]

    const googleMediaItems = await getAllAlbumMediaItems(googleAlbum.id)
    for (let j in googleMediaItems) {
      const googleMediaItem = googleMediaItems[j]

      const databaseMediaItem = await findMediaItem(`${googleAlbum.title}/${googleMediaItem.filename}`)
      if (!databaseMediaItem) {
        await createDatabaseMediaItem({
          filekey: `${googleAlbum.title}/${googleMediaItem.filename}`,
          albumId: databaseAlbum.id,
          googleId: googleMediaItem.id,
          googleProductUrl: googleMediaItem.productUrl,
          status: 'COMPLETE'
        })
      }
    }
  }
}

const createRouter = () => {
  const router = express.Router()

  router.post('/', async (req, res) => {
    restoreDatabaseFromGoogle()
    res.send('syncing...')
  })

  return router
}

const initializeMediaRestoreService = (app, serverUriPrefix) => {
  serverPrefix = serverUriPrefix
  app.use('/restore', createRouter())
}

module.exports = {
  initializeMediaRestoreService
}
