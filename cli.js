const request = require('request')

var serverPrefix = 'http://localhost'

const initializeCli = serverUriPrefix => {
  serverPrefix = serverUriPrefix
}

const runCli = server => {
  const argv = require('yargs')  // eslint-disable-line
    .command('authenticate', 'register with google')
    .example('$0 --authenticate')
    .command('backup', 'backup files to google')
    .example('$0 --backup')
    .command('addPhotoSource', 'add path for backup')
    .example('$0 --addPhotoSource=/backup/photos')
    .command('restore database', 'restore database from google')
    .example('$0 --restore --database')
    .command('restore downloads dirpath [albumId]', 'restore downloads from google')
    .example('$0 --restore --downloads --dirpath=/restore/photos --albumId=2')
    .argv

  if (argv.authenticate) {
    const uri = `${serverPrefix}/oauth/authenticate`
    console.log(`visit: ${uri}`)
  } else if (argv.addPhotoSource) {
    const uri = `${serverPrefix}/photoSources`
    const body = {uri: `file://${argv.addPhotoSource}`}
    console.log(uri)
    console.log(body)
    request({
      uri,
      headers: {
        'content-type': 'application/json'
      },
      body: JSON.stringify(body),
      method: 'POST'
    }, (err, res, body) => {
      server.close()
      if (err) {
        console.error(err)
        return
      }
      console.log(body)
    })
  } else if (argv.backup) {
    const uri = `${serverPrefix}/backup`
    console.log(uri)
    request.post(uri, { json: {} }, (err, res, body) => {
      server.close()
      if (err) {
        console.error(err)
        return
      }
      console.log(body)
    })
  } else if (argv.restore && argv.database) {
    const uri = `${serverPrefix}/restore/database`
    console.log(uri)
    request.post(uri, { json: {} }, (err, res, body) => {
      server.close()
      if (err) {
        console.error(err)
        return
      }
      console.log(body)
    })
  } else if (argv.restore && argv.downloads) {
    let uri = `${serverPrefix}/restore/downloads`
    console.log(uri)
    request.post(uri, {
      json: {
        dirpath: argv.dirpath,
        albumId: argv.albumId
      }
    }, (err, res, body) => {
      server.close()
      if (err) {
        console.error(err)
        return
      }
      console.log(body)
    })
  }
}

module.exports = {
  initializeCli,
  runCli
}
