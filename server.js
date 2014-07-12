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

  var factor = 1/connected.length

  var status = connected.reduce(function(result, ws) {
    result[ws.username] = ws.vote || 'none'
    return result
  }, {})

  connected.forEach(function(ws) {
    var vote = ws.vote

    ws.vote = 'none'

    switch (vote) {
      case 'take-off':
      return data.takeoff += factor

      case 'land':
      return data.land += factor

      case 'forward':
      return data.speed += factor

      case 'back':
      return data.speed -= factor

      case 'left':
      return data.strafe -= factor

      case 'right':
      return data.strafe += factor

      case 'rotate-right':
      return data.rotate += factor

      case 'rotate-left':
      return data.rotate -= factor

      case 'up':
      return data.height += factor

      case 'down':
      return data.height -= factor
    }

    ws.write(status)
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
  var str = json.stringify()

  str.destroy = function() {
    str.emit('close')
  }

  ws = pumpify.obj(str, websocket(ws), json.parse())
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
