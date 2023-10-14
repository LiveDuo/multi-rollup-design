const { TransactionFactory } = require('@ethereumjs/tx')
const { Wallet } = require('@ethereumjs/wallet')
const { VM } = require('@ethereumjs/vm')

const keccak = require('ethereum-cryptography/keccak')

const solc = require('solc')

const filename = 'test.sol'
const code = 'contract C { uint public count = 1337; function get() public view returns (uint) { return count; } }'

const senderWallet = Wallet.generate()

const GAS_PRICE = '0x10', GAS_LIMIT = '0x20000'

const vm = new VM()

const input = {
  language: 'Solidity',
  sources: { [filename]: { content: code } },
  settings: { outputSelection: { '*': { '*': ['*'] } } }
}

// node scripts/examples/compile-solc.js
; (async () => {
  
  // compile contract
  const output = JSON.parse(solc.compile(JSON.stringify(input)))
  const compiled = output.contracts[filename]
  const contractData = compiled['C'].evm.bytecode.object

  // deploy contract
  const unsignedTx = TransactionFactory.fromTxData({ gasPrice: GAS_PRICE, gasLimit: GAS_LIMIT, data: '0x' + contractData, nonce: 0 })
  const signedTx = unsignedTx.sign(senderWallet.getPrivateKey())
  const result = await vm.runTx({ tx: signedTx, skipBalance: true })
  const contractAddress = result.createdAddress
  console.log('Contract Address: ', contractAddress.toString())

  // read contract
  const methodSignature = 'get()'
  const methodIdBuffer = keccak.keccak256(Buffer.from(methodSignature)) //0xc7cee1b7
  const methodId = '0x' + Buffer.from(methodIdBuffer).toString('hex').substring(0, 8)
  const result2 = await vm.evm.runCall({ to: contractAddress, data: methodIdBuffer })
  const returnValue = result2.execResult.returnValue
  console.log('Read Return Value:', parseInt(Buffer.from(returnValue).toString('hex'), 16))

  // call contract
  const unsignedTx2 = TransactionFactory.fromTxData({ gasPrice: GAS_PRICE, gasLimit: GAS_LIMIT, data: methodId, nonce: 1 })
  const signedTx2 = unsignedTx2.sign(senderWallet.getPrivateKey())
  const result3 = await vm.runTx({ tx: signedTx2, skipBalance: true })
  const returnValue2 = result3.execResult.runState.returnValue
  console.log('Call Return Value:', returnValue2)

  // debug
  const contractStorage = await vm.stateManager.dumpStorage(contractAddress)
  console.log(contractStorage)
})()

