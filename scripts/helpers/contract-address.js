
const { Address } = require('@ethereumjs/util')

const senderAddress = Address.fromString(process.argv[2])
const nonce = BigInt(process.argv[3])

// node scripts/helpers/contract-address.js 0xb363821c8ebd9b327f03965bc91555f7ea42157a 0
const address = Address.generate(senderAddress, nonce)
console.log(address.toString())
