#!/usr/bin/env node

// Take a file, hash it, describe it, and send the metadata to a notary.

var fs = require('fs');
var crypto = require('crypto');
var path = require("path");
var util = require('util');

var argv = require('optimist')
    .usage('Notarize a file with the CitizenMediaNotary network.')
    .demand('f')
    .alias('f', 'file')
    .describe('f', 'File to notarize')
    .demand('n')
    .default('n', 'http://localhost:2000/new')
    .alias('n', 'notary')
    .describe('n', 'Notary to use')
    .alias('d', 'description')
    .describe('d', 'A description of the file being notarized')
    .argv
;

var data=[]; //TODO actually use this.

// Simple utility that doesn't error out when the file doesn't exist
// and returns the size    
function getSize(filename, callback) {
  fs.stat(filename,( function (err, stat) {
      console.log('Size: ', stat.size);
    }));
}

var sha1sum = crypto.createHash('sha1');

var s = fs.ReadStream(argv.file);
s.on('data', function(d) {
  sha1sum.update(d);
});

s.on('end', function() {

  var d = sha1sum.digest('hex');
  console.log('Filename: ', argv.file.replace(/^.*[\\\/]/, ''));
  console.log('SHA1: ', d);

});

getSize(argv.file);
console.log('Time: ', new Date().getTime());