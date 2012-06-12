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
    console.log('Party started on port ' + config.port + '.\n');
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

    signed_metadata = signMetadata(metadata);

    /*
      Store
    */
    db.save(signed_metadata['hash'], signed_metadata, function (err, res) {
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

    for(var sister in sisters.sisters){
        console.log(sister);
        if (sisters.sisters.hasOwnProperty(sister)) {
          console.log(sister + " -> " + sisters.sisters[sister]['port']);
        }
        duplicateNotarization(sisters.sisters[sister], signed_metadata);
    }

    // Return response
    res.send(req.body);

});

// Verify and store a duplicate from a sister server.
app.post('/duplicate', function(req, res){

    console.log("Body..");
    console.log(req.body);

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
            res.render(__dirname + '/html/verify.html', {domain: config.siteDomain, metadata: doc});
        }
    });

});


// Check database for a record with the given hash.
app.get('/verify/json/:hash', function (req, res) {
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

// Upload a file
app.get('/upload', function (req, res) {
  res.render(__dirname + '/html/upload.html', {domain: config.siteDomain});
});

app.post('/upload', function(req, res) {

  var metadata = {};
  metadata['filename'] = req.files.uploadfile.name;
  metadata['size'] = String(req.files.uploadfile.size);
  console.log(req.files.uploadfile.path);

  try {
    var file_data = fs.readFileSync(req.files.uploadfile.path, 'binary');
  }
  catch (err) {
    console.error("There was an error opening the file:");
    console.log(err);
    res.send("Error.");
    return;
  }
   
   var sha1sum = crypto.createHash('sha1');
   sha1sum.update(file_data);
   var d = sha1sum.digest('hex');

   //We've hashed it, so delete this file.
   //XXX: I really, really hope there aren't any possible dir traversal attacks here.
   fs.unlinkSync(req.files.uploadfile.path);

   metadata['hash'] = d;
   metadata['hashAlgorithm'] = 'SHA1';

   metadata['time'] = String(new Date().getTime());
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
    }
    
    /*
      Sign
    */

    signed_metadata = signMetadata(metadata);
    console.log("Data signed.");

    /*
      Store
    */
    db.save(signed_metadata['hash'], signed_metadata, function (err, res) {
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

    for(var sister in sisters.sisters){
        console.log(sister);
        if (sisters.sisters.hasOwnProperty(sister)) {
          console.log(sister + " -> " + sisters.sisters[sister]['port']);
        }
        duplicateNotarization(sisters.sisters[sister], signed_metadata);
    }

    console.log("Hooorayyyy");
    res.redirect('/verify/' + signed_metadata.hash); 
    }

);

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

function signMetadata(metadata){
    var signer = crypto.createSign(config.signatureAlgorithm); // Signers can only be used once, so make a new one.
    signer.update(JSON.stringify(metadata)); // Feed it
    var signature = signer.sign(privateKey, 'base64'); // Signer is now spent.
    metadata['signature'] = signature; // Attach it.
    return metadata;
}


// Sharing
