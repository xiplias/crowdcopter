var http = require('http')
var send = require('send')
var pumpify = require('pumpify')
var ws = require('ws')
var ardrone = require('ar-drone')
var json = require('through-json')
var eos = require('end-of-stream')
var websocket = require('websocket-stream')
var path = require('path')
var log = require('single-line-log')

var client  = ardrone.createClient();

var server = http.createServer(function(req, res) {
  send(req, req.url, {root: path.join(__dirname, 'static')}).pipe(res)
})

var wss = new ws.Server({server: server})

var connected = []

var print = function(data) {
  data = ''+
    'Connected users: '+connected.length+'\n'+
    'Strafe : '+data.strafe.toFixed(2)+'\n'+
    'Speed  : '+data.speed.toFixed(2)+'\n'+
    'Height : '+data.height.toFixed(2)+'\n'+
    'Rotate : '+data.rotate.toFixed(2)+'\n'+
    'Takeoff: '+data.takeoff.toFixed(2)+'\n'+
    'Land   : '+data.land.toFixed(2)+'\n'+
  ''

  log.stdout(data)
}

var publish = function() {
  var data = {
    strafe: 0,
    speed: 0,
    height: 0,
    rotate: 0,
    takeoff: 0,
    land: 0
  }

  var active = connected.reduce(function(result, ws) {
    ws.active = ws.active || Date.now()
    return result + (((Date.now() - ws.active) < 10000) ? 1 : 0)
  }, 0)

  var factor = 1/active

  var votes = connected.reduce(function(result, ws) {
    result[ws.username] = ws.vote || 'none'
    return result
  }, {})

  connected.forEach(function(ws) {
    var vote = ws.vote

    ws.vote = 'none'

    switch (vote) {
      case 'take-off':
      data.takeoff += factor
      break

      case 'land':
      data.land += factor
      break

      case 'forward':
      data.speed += factor
      break

      case 'back':
      data.speed -= factor
      break

      case 'left':
      data.strafe -= factor
      break

      case 'right':
      data.strafe += factor
      break

      case 'rotate-right':
      data.rotate += factor
      break

      case 'rotate-left':
      data.rotate -= factor
      break

      case 'up':
      data.height += factor
      break

      case 'down':
      data.height -= factor
      break

      default:
      return
    }

    ws.active = Date.now()
  })

  connected.forEach(function(ws) {
    ws.write({votes:votes, data:data})
  })

  if (data.takeoff) client.takeoff()
  if (data.land) client.land()

  if (data.speed >= 0) client.front(data.speed)
  else client.back(-data.speed)

  if (data.height >= 0) client.up(data.height)
  else client.down(-data.height)

  if (data.rotate >= 0) client.clockwise(data.rotate)
  else client.counterClockwise(-data.rotate)

  if (data.straft >= 0) client.right(data.strafe)
  else client.left(-data.strafe)

  var stop = Object.keys(data).every(function(key) {
    return !data[key]
  })

  if (stop) client.stop()

  print(data)
}

setInterval(publish, 150)

wss.on('connection', function(ws) {
  ws = pumpify.obj(json.stringify(), websocket(ws), json.parse())
  ws.vote = null

  var destroy = function() {
    ws.destroy()
  }

  var timeout = setTimeout(destroy, 5000)

  ws.once('data', function(username) {
    ws.username = username

    connected.push(ws)
    eos(ws, function() {
      if (connected.indexOf(ws) > -1) connected.splice(connected.indexOf(ws), 1)
    })

    ws.on('data', function(data) {
      clearTimeout(timeout)
      timeout = setTimeout(destroy, 5000)
      if (data === 'ping') return
      ws.vote = data
    })
  })
})

server.listen(9090)
