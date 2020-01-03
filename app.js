const express = require('express')
const bodyParser = require('body-parser')

const initializeDatabase = require('./database')
const { initializeGooglePhotoApi } = require('./google_photo_api')
const { initializeOauth2Client, getOauth2Client } = require('./google_oauth')
const { initializeMediaRestoreService } = require('./media_restore_service')
const { initializeMediaBackupService } = require('./media_backup_service')
const { initializeCli, runCli } = require('./cli')

const serverPort = process.env.SERVER_PORT || 3000

const { clientId, clientSecret } = require('./oauth.json')

// const clientId = '362510008231-jccn873jvrvsj550599kai82morre0vt.apps.googleusercontent.com'
// const clientSecret = 'oqmig67-NNBsXq9BQG2F1pL4'
const scopes = ['https://www.googleapis.com/auth/photoslibrary']
const redirectUriPrefix = `http://127.0.0.1:${serverPort}`

const app = express()
app.use(bodyParser.json())
app.use(express.json())

const startServer = async () => {
  await initializeDatabase(app)
  await initializeOauth2Client(app, clientId, clientSecret, scopes, redirectUriPrefix)
  await initializeGooglePhotoApi(app, getOauth2Client())
  await initializeMediaRestoreService(app, redirectUriPrefix)
  await initializeMediaBackupService(app, redirectUriPrefix)
  await initializeCli(redirectUriPrefix)

  const server = app.listen(serverPort, () => {
    console.log(`Listening on port ${serverPort}`)
    runCli(server)
  })
}

startServer()
