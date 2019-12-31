const Sequelize = require('sequelize')
const epilogue = require('epilogue')

const database = new Sequelize({
  dialect: 'sqlite',
  storage: './data.sqlite',
  operatorsAliases: false
})

const PhotoSource = database.define('photoSource', {
  uri: Sequelize.STRING
})

const Album = database.define('album', {
  title: Sequelize.STRING,
  googleId: Sequelize.STRING,
  googleProductUrl: Sequelize.STRING
})

const MediaItem = database.define('mediaItem', {
  filekey: Sequelize.STRING,
  filepath: Sequelize.STRING,
  description: Sequelize.STRING,
  albumId: Sequelize.STRING,
  hash: Sequelize.STRING,
  status: Sequelize.ENUM('PENDING', 'UPLOADING', 'UPLOADED', 'COMPLETE'),
  googleUploadToken: Sequelize.STRING,
  googleId: Sequelize.STRING,
  googleProductUrl: Sequelize.STRING
})

const initializeDatabase = async (app) => {
  epilogue.initialize({ app, sequelize: database })

  epilogue.resource({
    model: Album,
    endpoints: ['/albums', '/albums/:id']
  })

  epilogue.resource({
    model: PhotoSource,
    endpoints: ['/photoSources', '/photoSources/:id']
  })

  epilogue.resource({
    model: MediaItem,
    endpoints: ['/mediaItems', '/mediaItems/:id']
  })

  await database.sync()
}

module.exports = initializeDatabase
