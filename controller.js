var json = require('through-json')
var pumpify = require('pumpify')
var websocket = require('websocket-stream')

connectWebsocket();

var s = {
  "w": "forward",
  "a": "left",
  "d": "right",
  "s": "back",
  "up": "up",
  "left": "rotate-left",
  "right": "rotate-right",
  "down": "down",
  "t": "take-off",
  "l": "land"
}

setInterval(function () {
  if (stream) stream.write("ping");
}, 1000);

$.each(s, function(key, value) {
  KeyboardJS.on(key, function() {
    console.log(key, value)
    stream.write(value);
    $("#"+value).addClass("highlight");
  }, function () {
    $("#"+value).removeClass("highlight");
  });

  $("#"+value).click(function () {
    console.log(key, value)
    stream.write(value);
  })
});

function connectWebsocket () {
  var loc = window.location;
  var test =  pumpify.obj(json.stringify(), websocket((loc.protocol === 'http:' ? 'ws://' : 'wss://') + loc.host), json.parse())

  test.on('data', function (data) {
    $("#current").html(data);
    console.log("data", data);
  });

  test.on("error", function (e) {
    setTimeout(function () {
      connectWebsocket();
    }, 1000);
  });

  test.on("open", function () {
    console.log("online");
  })

  window.stream = test;
}
