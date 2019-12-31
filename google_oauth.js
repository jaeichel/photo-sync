var express = require('express')
const { google } = require('googleapis')
const Sequelize = require('sequelize')

const database = new Sequelize({
  dialect: 'sqlite',
  storage: './token.sqlite',
  operatorsAliases: false
})

const Token = database.define('token', {
  accessToken: Sequelize.STRING,
  refreshToken: Sequelize.STRING
})

const getTokens = () => {
  return database.sync().then(() => Token.findOne({
    order: [['id', 'DESC']]
  }))
}

const saveTokens = (accessToken, refreshToken) => {
  return database.sync().then(() => Token.create({
    accessToken,
    refreshToken
  }))
}

var oauth2Client

const initializeOauth2Client = async (app, clientId, clientSecret, scopes, redirectUri) => {
  oauth2Client = new google.auth.OAuth2(
    clientId,
    clientSecret,
    `${redirectUri}/oauth/callback`
  )

  oauth2Client.on('tokens', async (tokens) => {
    if (tokens.refresh_token) {
      await saveTokens(tokens.access_token, tokens.refresh_token)
    }
  })

  const tokens = await getTokens()
  if (tokens) {
    await oauth2Client.setCredentials({
      refresh_token: tokens.refreshToken
    })
  }

  const router = express.Router()

  router.get('/authenticate', async (req, res) => {
    const url = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes
    })
    res.redirect(url)
  })

  router.get('/callback', async (req, res) => {
    const { code } = req.query
    const { tokens } = await oauth2Client.getToken(code)
    oauth2Client.setCredentials(tokens)
    res.send('authenticated')
  })

  app.use('/oauth', router)
}

const getOauth2Client = () => oauth2Client

module.exports = {
  initializeOauth2Client,
  getOauth2Client
}
