const { VM } = require('@ethereumjs/vm')
const { Wallet } = require('@ethereumjs/wallet')
const { TransactionFactory } = require('@ethereumjs/tx')

const OP_CODES = {PUSH1: '60', SSTORE: '55'}
const code = [OP_CODES.PUSH1, '02', OP_CODES.PUSH1, '03', OP_CODES.SSTORE]

const vm = new VM()

const senderWallet = Wallet.generate()

// node scripts/examples/run-tx.js
;(async () => {

  // run tx
  const txOptions = { gasPrice: '0x10', gasLimit: '0x20000' }
  const unsignedTx = TransactionFactory.fromTxData({ ...txOptions, data: '0x' + code.join(''), })
  const tx = unsignedTx.sign(senderWallet.getPrivateKey())
  const result = await vm.runTx({ tx, skipBalance: true })
  console.log('tx error:', result.execResult?.exceptionError)
  
  // run tx2
  const unsignedTx2 = TransactionFactory.fromTxData({ ...txOptions, to: result.createdAddress, nonce: 1 })
  const tx2 = unsignedTx2.sign(senderWallet.getPrivateKey())
  const result2 = await vm.runTx({ tx: tx2, skipBalance: true })
  console.log('tx2 error:', result2.execResult?.exceptionError)

  // dump storage
  console.log('createdAddress:', result.createdAddress.toString())
  console.log('dumpStorage:', await vm.stateManager.dumpStorage(result.createdAddress))

})()
