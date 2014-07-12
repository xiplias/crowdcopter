var json = require('through-json')
var pumpify = require('pumpify')
var websocket = require('websocket-stream')

if (!localStorage.getItem("user")) localStorage.setItem("user", 'user-'+Math.random().toString(16).slice(2));

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

$(function () {
  $("#nameField").val(localStorage.getItem("user"));3
});

setInterval(function () {
  if (stream) stream.write("ping");
}, 1000);

$.each(s, function(key, value) {
  KeyboardJS.on(key, function() {
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

$("#nameField").blur(function () {
  localStorage.setItem("user", $(this).val());
  awebsocket.destroy();
});


function connectWebsocket () {
  var loc = window.location;
  window.awebsocket = websocket((loc.protocol === 'http:' ? 'ws://' : 'wss://') + loc.host);
  var test =  pumpify.obj(json.stringify(), awebsocket, json.parse());

  test.on('data', function (data) {
    $("#current").html(data);

    var votes = "";
    $.each(data.votes, function(key, value) {
      votes += "<div class=\"person clearfix\"><div class=\"left\">"+key+"</div><div class=\"right\">"+value+"</div></div>";
    });

    $("#connected").html(Object.keys(data.votes).length);

    $("#votes").html(votes);
  });

  test.on("error", function (e) {
    setTimeout(function () {
      connectWebsocket();
    }, 1000);
  });

  test.write(localStorage.getItem("user"));

  window.stream = test;
}
