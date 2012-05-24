// Requirements
var app = require('express').createServer()
  , express = require('express')
  , jqtpl = require("jqtpl");

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

