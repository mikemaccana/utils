let readArcFile = require('../read-arc')
let parallel = require('run-parallel')
let code = require('./lambda-code')
let assets = require('./public-code')
/**
 * [new!] cannonical code generator
 *
 * rules:
 *
 * - goes fast: init an entire .arc file in one shot in parallel
 * - dep free!!!
 * - min code possible
 * - only one comment at the top of the file
 * - add .arc-config by default
 * -
 *
 * @param {Function} callback - a node style errback
 * @returns {Promise} - (if no callback is supplied)
 */
module.exports = function init(callback) {

  let promise
  if (!callback) {
    promise = new Promise(function ugh(res, rej) {
      callback = function errback(err, result) {
        err ? rej(err) : res(result)
      }
    })
  }

  let {arc} = readArcFile()
  let find = setting=> setting[0] === 'runtime'
  let runtime = arc.aws && arc.aws.some(find)? arc.aws.find(find)[1] : 'nodejs10.x'
  let functions = []

  // generate ./public with minimal set of static assets
  if (arc.static)
    functions = functions.concat(assets)

  // generate minimal lambda functions
  if (arc.http) {
    let type = 'http'
    functions = functions.concat(arc.http.map(route=> {
      return code.bind({}, {type, runtime, method: route[0], path: route[1]})
    }))
  }

  if (arc.events) {
    let type = 'events'
    functions = functions.concat(arc.events.map(name=> {
      return code.bind({}, {type, runtime, name})
    }))
  }

  if (arc.queues) {
    let type = 'queues'
    functions = functions.concat(arc.queues.map(name=> {
      return code.bind({}, {type, runtime, name})
    }))
  }

  /**
   *
   * TODO scheduled
  if (arc.scheduled) {
    let type = 'scheduled'
    functions = functions.concat(arc.scheduled.map(tuple=> {
      let name = tuple.shift()
      let rule = tuple.join(' ').trim()
      return code.bind({}, {type, runtime, name})
    }))
  }

   * TODO ws lamddaaaa
   * TODO generate dynamo streams code
   * let tables
  if (arc.tables) {
    let type = 'tables'
    functions = functions.concat()

    arc.tables.map(table=> {
      let name = Object.keys(table)[0]
      var hasInsert = table[name].hasOwnProperty('insert')
      var hasUpdate = table[name].hasOwnProperty('update')
      var hasDestroy = table[name].hasOwnProperty('destroy')
      var hasTrigger = hasInsert || hasUpdate || hasDestroy
      if (hasTrigger)
        code.bind({}, {type, runtime, name})
    })
  }*/

  parallel(functions, function done(err) {
    if (err) callback(err)
    else callback()
  })

  return promise
}
