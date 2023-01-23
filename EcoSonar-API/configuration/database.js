const mongoose = require('mongoose')
const { retrievePassword } = require('./retrieveDatabasePasswordFromCloudProvider')

class DataBase {
}
DataBase.prototype.connection = async function () {
  let protocol = 'mongodb'
  let options = {}
  let serverParameters = (process.env.ECOSONAR_ENV_DB_SERVER_PARAMETERS || '')
      .split('&')
      .filter(parameter => parameter.length > 0)

  const mongoDBType = process.env.ECOSONAR_ENV_DB_TYPE || ''
  const user = process.env.ECOSONAR_ENV_USER || ''
  const password = await retrievePassword()
  const cluster = process.env.ECOSONAR_ENV_CLUSTER || ''
  const port = process.env.ECOSONAR_ENV_DB_PORT || ''
  const dbName = process.env.ECOSONAR_ENV_DB_NAME || ''

  if (mongoDBType === 'MongoDB_Atlas') {
    protocol = 'mongodb+srv'
    options = {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    }
    serverParameters.push('retryWrites=true')
    serverParameters.push('w=majority')
  } else if (mongoDBType === 'CosmosDB') {
    options = {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      retryWrites: false,
    }
    serverParameters.push('sl=true')
    serverParameters.push('replicaSet=globaldb')
  } else if (mongoDBType === 'MongoDB') {
  } else {
    console.log('Could not connect to any database, unknown database type')
    return
  }

  const connectionString = protocol + '://'
    + user
    + (password !== '' ? (':' + password) : '')
    + ((user !== '' || password !== '') ? '@' : '')
    + cluster
    + (port !== '' ? (':' + port) : '')
    + '/' + dbName
    + (serverParameters.length > 0 ? ('?' + serverParameters.join('&')) : '')

  mongoose.connect(connectionString, options)
      .then(() => console.log(`Connection to ${mongoDBType} successful`))
      .catch((reason) => console.error('\x1b[31m%s\x1b[0m', 'Unable to connect to the mongodb instance. Error: ', reason))
}

const bdd = new DataBase()
module.exports = bdd
