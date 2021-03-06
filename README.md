# Citizen Media Notary
![diagram](http://i.imgur.com/2fwoc.png)

Working on this. Don't use in production yet.

## Description

A system which enables 3rd party data observers who maintain a record of the authenticity of citizen media as it is recorded.

Check the slideshow: http://openwatch.net/static/evidence.key.pdf

## Goals:

* Secure-by-default.
* Publically queriable (but perhaps not publicaly browsable.)
* Easy to deploy.
* Come up with a spec
* Federated servers? PubSub, maybe?

## TODO:

* Review schema
* Crypto (Verification of signatures)
* Duplication
* Frontend

## Language Choice

I think I'm going to do this one in Node because Django doesn't play super nicely with non relational databases.

The drawback is that Node is kind of a pain in the ass to deploy, especially with SSL.

## Database

For now, it's gonna use CouchDB. Opinions welcome.

## Install

Make sure you have latest node, npm and CouchDB installed.

> npm install

### Set up cryptographic keys

* See ./crypto/CRYPTO.md for instructions.

### Run Server

> node server.js

### Run with Supervisor
If you're developing, it's easier to use Supervisior, which will automatically reload the app when it detects changes.
Supervisor requires that it be installed globally.

> npm install -g supervisor

> supervisor server.js

More details soon..
