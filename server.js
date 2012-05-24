// Requirements
var app = require('express').createServer()
  , express = require('express')
  , jqtpl = require("jqtpl");

var cradle = require('cradle');
var db = new(cradle.Connection)().database('notary');

// Load the config file
var config = require('config').Server;

 // App Stuff
app.use('/public', express.static(__dirname + '/public'));
app.listen(config.port);
app.set("view engine", "html");
app.set("view options", {layout: false});
app.register(".html", require("jqtpl").express);

app.get('/', function (req, res) {
  res.render(__dirname + '/html/index.html', {domain: config.siteDomain});
});

// DB Stuff

db.exists(function (err, exists) {
  if (err) {
    console.log('error', err);
  } else if (exists) {
    console.log('Database exists..');
  } else {
    console.log('No database. Creating one..');
    db.create();
  }
});
