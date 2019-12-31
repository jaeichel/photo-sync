const express = require('express')
const fs = require('fs')
const path = require('path')
const request = require('request')

const createAlbumRouter = oauth2Client => {
  const router = express.Router()

  router.get('/', async (req, res) => {
    const { pageSize } = req.query
    const { pageToken } = req.query

    let uri
    if (pageSize && pageToken) {
      uri = `https://photoslibrary.googleapis.com/v1/albums?pageSize=${pageSize}&pageToken=${pageToken}`
    } else if (pageSize) {
      uri = `https://photoslibrary.googleapis.com/v1/albums?pageSize=${pageSize}`
    } else if (pageToken) {
      uri = `https://photoslibrary.googleapis.com/v1/albums?pageToken=${pageToken}`
    } else {
      uri = `https://photoslibrary.googleapis.com/v1/albums`
    }

    const headers = await oauth2Client.getRequestHeaders()
    const promise = new Promise((resolve, reject) => request({
      uri,
      headers,
      method: 'GET'
    }, (err, resp, body) => {
      if (err) {
        reject(err)
        return
      }
      res.send(JSON.parse(body))
    }))
    return promise
  })

  router.get('/:id', async (req, res) => {
    const { id } = req.params

    let uri = `https://photoslibrary.googleapis.com/v1/albums/${id}`

    const headers = await oauth2Client.getRequestHeaders()
    const promise = new Promise((resolve, reject) => request({
      uri,
      headers,
      method: 'GET'
    }, (err, resp, body) => {
      if (err) {
        reject(err)
        return
      }
      res.send(JSON.parse(body))
    }))
    return promise
  })

  router.post('/', async (req, res) => {
    const { title } = req.body

    const uri = 'https://photoslibrary.googleapis.com/v1/albums'
    const body = {
      album: {
        title
      }
    }

    const headers = await oauth2Client.getRequestHeaders()
    const promise = new Promise((resolve, reject) => request({
      uri,
      headers,
      body: JSON.stringify(body),
      method: 'POST'
    }, (err, resp, body) => {
      if (err) {
        reject(err)
        return
      }
      res.send(JSON.parse(body))
    }))
    return promise
  })

  return router
}

const createMediaItemRouter = oauth2Client => {
  const router = express.Router()

  router.get('/', async (req, res) => {
    const { pageSize } = req.query
    const { pageToken } = req.query

    let uri
    if (pageSize && pageToken) {
      uri = `https://photoslibrary.googleapis.com/v1/mediaItems?pageSize=${pageSize}&pageToken=${pageToken}`
    } else if (pageSize) {
      uri = `https://photoslibrary.googleapis.com/v1/mediaItems?pageSize=${pageSize}`
    } else if (pageToken) {
      uri = `https://photoslibrary.googleapis.com/v1/mediaItems?pageToken=${pageToken}`
    } else {
      uri = `https://photoslibrary.googleapis.com/v1/mediaItems`
    }

    const headers = await oauth2Client.getRequestHeaders()
    const promise = new Promise((resolve, reject) => request({
      uri,
      headers,
      method: 'GET'
    }, (err, resp, body) => {
      if (err) {
        reject(err)
        return
      }
      res.send(JSON.parse(body))
    }))
    return promise
  })

  router.get('/search', async (req, res) => {
    const { pageSize } = req.query
    const { pageToken } = req.query
    const { albumId } = req.query

    const uri = 'https://photoslibrary.googleapis.com/v1/mediaItems:search'
    const body = {
      albumId,
      pageSize,
      pageToken
    }

    const headers = await oauth2Client.getRequestHeaders()
    const promise = new Promise((resolve, reject) => request({
      uri,
      headers,
      body: JSON.stringify(body),
      method: 'POST'
    }, (err, resp, body) => {
      if (err) {
        reject(err)
        return
      }
      res.send(JSON.parse(body))
    }))
    return promise
  })

  router.get('/:id', async (req, res) => {
    const { id } = req.params

    let uri = `https://photoslibrary.googleapis.com/v1/mediaItems/${id}`

    const headers = await oauth2Client.getRequestHeaders()
    const promise = new Promise((resolve, reject) => request({
      uri,
      headers,
      method: 'GET'
    }, (err, resp, body) => {
      if (err) {
        reject(err)
        return
      }
      res.send(JSON.parse(body))
    }))
    return promise
  })

  router.post('/upload', async (req, res) => {
    const { mediaItem } = req.body

    const uri = 'https://photoslibrary.googleapis.com/v1/uploads'

    const headers = await oauth2Client.getRequestHeaders()
    headers['Content-Type'] = 'application/octet-stream'
    headers['X-Goog-Upload-File-Name'] = path.basename(mediaItem.filekey)
    headers['X-Goog-Upload-Protocol'] = 'raw'

    const promise = new Promise((resolve, reject) => request({
      uri,
      headers,
      body: fs.createReadStream(mediaItem.filepath),
      method: 'POST'
    }, (err, resp, body) => {
      if (err) {
        reject(err)
        return
      }
      res.send(body)
    }))
    return promise
  })

  router.post('/batchCreate', async (req, res) => {
    const { albumId } = req.body
    const { mediaItems } = req.body

    const uri = 'https://photoslibrary.googleapis.com/v1/mediaItems:batchCreate'
    const body = {
      albumId,
      newMediaItems: mediaItems.map(mediaItem => ({
        simpleMediaItem: {
          uploadToken: mediaItem.googleUploadToken
        }
      }))
    }

    const headers = await oauth2Client.getRequestHeaders()
    const promise = new Promise((resolve, reject) => request({
      uri,
      headers,
      body: JSON.stringify(body),
      method: 'POST'
    }, (err, resp, body) => {
      if (err) {
        reject(err)
        return
      }
      res.send(JSON.parse(body))
    }))
    return promise
  })

  return router
}

const initializeGooglePhotoApi = (app, oauth2Client) => {
  const router = express.Router()
  router.use('/albums', createAlbumRouter(oauth2Client))
  router.use('/mediaItems', createMediaItemRouter(oauth2Client))
  app.use('/google', router)
}

module.exports = {
  initializeGooglePhotoApi
}
