
// https://ethereum.stackexchange.com/questions/93040/how-to-generate-solidity-encode-function-signature-from-javascript
const keccak = require('ethereum-cryptography/keccak')

const methodSignature = 'get()'
const methodIdBuffer = keccak.keccak256(Buffer.from(methodSignature)) //0xc7cee1b7
const methodId = '0x' + Buffer.from(methodIdBuffer).toString('hex').substring(0, 8)
console.log(methodId)
