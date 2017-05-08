const AWS = require('aws-sdk')
AWS.config.update({ region: process.env.AWS_REGION })
const codebuild = new AWS.CodeBuild()
const status = require('./status')
const promiseRetry = require('promise-retry')

const statuses = {
  'PENDING': 'pending',
  'IN_PROGRESS': 'pending',
  'FAILED': 'failure',
  'SUCCEEDED': 'success',
  'ERROR': 'error'
}

const messages = {
  'PENDING': 'CodeBuild is running your tests',
  'IN_PROGRESS': 'CodeBuild is running your tests',
  'FAILED': 'Your tests failed on CodeBuild',
  'SUCCEEDED': 'Your tests passed on CodeBuild',
  'ERROR': 'There was an error running your tests'
}

function greenStatus (buildId) {
  return new Promise((resolve, reject) => {
    codebuild.batchGetBuilds({ ids: [ buildId ] }, (err, data) => {
      var build = data.builds[0]
      if (build.buildStatus == 'SUCCEEDED' || build.buildStatus == 'FAILED') {
        resolve(build)
      } else {
        reject(false)
      }
    })
  })
}

module.exports.run = (buildId) => {
  return promiseRetry(function (retry, number) {
    console.log('attempt number', number);
    return greenStatus(buildId)
      .catch(retry);
  }).then(function (build) {
      const buildStatus = statuses[build.buildStatus]
      const buildMessage = messages[build.buildStatus]
      return status.update(buildStatus, buildMessage, build.sourceVersion, build.id)
    }, function (err) {
      return err
    })
}