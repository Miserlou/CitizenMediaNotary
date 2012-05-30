# Crypto

## How to: Generate public and private 2048-bit RSA keys.
_Keep it secret. Keep it safe._

There are two keys included here for testing. Don't actually use them for anything.

### To generate keys:

> openssl genrsa -out private.pem 2048
> openssl rsa -pubout -in private.pem -out public.pem

### To verify:

> openssl rsa -text -in private.pem
