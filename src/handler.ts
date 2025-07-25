import serverlessExpress from '@codegenie/serverless-express'
// const handler = require('serverless-express/handler')
import app from "./app"

module.exports.api = serverlessExpress({ app })