#!/usr/bin/env node

/*
  This is a CitizenMediaNotary server.
  See README.md for more details.
  http://notary.openwatch.net
*/

/*
  Imports
*/

// Web requirements
var app = require('express').createServer()
  , express = require('express')
  , jqtpl = require("jqtpl");

var querystring = require('querystring');  
var http = require('http'); 

// Load the config file,
var config = require('config').Server;
var sisters;

// DB Requirements
var cradle = require('cradle');
var db = new(cradle.Connection)().database(config.tableName);

// Validation requirements
var sys = require('util'), fs = require('fs');
var validate = require('commonjs-utils/lib/json-schema').validate;
var schema;

// Crypto setup
var crypto = require('crypto');
var signer = crypto.createSign(config.signatureAlgorithm);
var verifier = crypto.createVerify(config.signatureAlgorithm);

var publicKey;
var privateKey;

/*
  Load local resources.
*/

// Keys open doors.
fs.readFile(__dirname + '/crypto/private.pem', 'utf8', function (err,data) {
  if (err) {
    console.log("Private key not found!");
    return console.log(err);
  }
  privateKey = data;
  console.log("Private key loaded.");
});

fs.readFile(__dirname + '/crypto/public.pem', 'utf8', function (err,data) {
  if (err) {
    console.log("Public key not found!");
    return console.log(err);
  }
  publicKey = data;
  console.log("Public key loaded.");
});

// TODO: Discovery service.
fs.readFile(__dirname + '/config/sisters.json', 'utf8', function(err,data) {
  if(err) throw err;
  sisters = JSON.parse(data);
});

// Load a schema by which to validate
fs.readFile(__dirname + '/schema/schema.json', 'utf8', function(err,data) {
  if(err) throw err;
  schema = JSON.parse(data);
});

/*
  Set up/confirm database.
*/
db.exists(function (err, exists) {
  if (err) {
    console.log('error', err);
  } else if (exists) {
    console.log('Database exists, hooray!');
    console.log('Party started..\n');
  } else {
    console.log('No database. Creating one..');
    db.create();
    // It crashes here the first time. Wtf.
  }
});

/*
  Web API
*/
app.use('/public', express.static(__dirname + '/public'));
app.use(express.bodyParser()); //nicer POST
app.listen(config.port);
app.set("view engine", "html");
app.set("view options", {layout: false});
app.register(".html", require("jqtpl").express);

// Validate, sign, store and duplicate a new record.
app.post('/new', function(req, res){

    /*
      Validate
    */
    metadata = req.body;
    metadata['storeTime'] = new Date().getTime();

    //Get remote address
    if(req.headers['x-forwarded-for']){
        ip_address = req.headers['x-forwarded-for'];
    }
    else {
        ip_address = req.connection.remoteAddress;
    }

    metadata['remoteAddress'] = ip_address;
    metadata['host'] = req.headers.host;

    var validation = validate(metadata, schema);
    console.log('Is this data valid.. ', validation.valid);

    if (!validation.valid){
      console.log(validation.errors);

      // Log the error.
      db.save('error', validation.errors, function (err, res) {
      if (err) {
          // Something is very, very wrong if you get here.
      } else {
         console.log('Failed submission attempt saved.');
            }
      });

      return res.send("You sent some invalid data.");
    }

    /*
      Sign
    */
    var signer = crypto.createSign(config.signatureAlgorithm); // Signers can only be used once, so make a new one.
    signer.update(JSON.stringify(metadata)); // Feed it
    var signature = signer.sign(privateKey, 'base64'); // Signer is now spent.
    metadata['signature'] = signature; // Attach it.

    /*
      Store
    */
    db.save(metadata['hash'], metadata, function (err, res) {
          if (err) {
              // TODO. Handle error
              console.log('Entry NOT saved!');
              console.log(err);
          } else {
             console.log('Entry saved.');
             //XXX Share.
          }
      });

    /*
      Share
    */

    for(var key in sisters.sisters){
        console.log(key);
        if (sisters.sisters.hasOwnProperty(key)) {
          console.log(key + " -> " + sisters.sisters[key]['port']);
        }
        duplicateNotarization(sisters.sisters[key], metadata);
    }

    // Return response
    res.send(req.body);

});

// Verify and store a duplicate from a sister server.
app.post('/duplicate', function(req, res){

    // Verify and store duplicate
    console.log(req);

    // Return response
    res.send(req.body);
});


// Check database for a record with the given hash.
app.get('/verify/:hash', function (req, res) {
  db.get(req.params.hash, 
     function (err, doc) {
        if (err) {
            res.send("We have no record for a file of with that hash.");
        } else {
            res.send(doc);
        }
    });

});

// My public key.
app.get('/key', function (req, res) {
  res.send(publicKey);

});

app.get('/sisters', function (req, res) {
  res.send(sisters);

});

// Homepage
app.get('/', function (req, res) {
  res.render(__dirname + '/html/home.html', {domain: config.siteDomain});
});

/*
  Utility Functions
*/

function duplicateNotarization(host, data){

  console.log(host.port);
  console.log(host.address);

  var encoded_data = querystring.stringify(data);

  var options = {
    host: host.address,
    port: host.port,
    path: '/duplicate',
    method: 'POST'
  };

  var req = http.request(options, function(res) {
    res.setEncoding('utf8');
    res.on('data', function (chunk) {
    });
  });

  req.on('error', function(e) {
    console.log('Problem talking to', host.address, ': ')
    console.log(e.message);
  });

  // write data to request body
  req.write(encoded_data);
  req.end();
  
}


// Sharing

