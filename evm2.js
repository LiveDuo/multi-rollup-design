const { VM } = require('@ethereumjs/vm')
const { Wallet } = require('@ethereumjs/wallet')
const { TransactionFactory } = require('@ethereumjs/tx')
const { Account, Address } = require('@ethereumjs/util')

const OP_CODES = {STOP: '00', ADD: '01', PUSH1: '60', SSTORE: '55'}
const code = [OP_CODES.PUSH1, '02', OP_CODES.PUSH1, '03', OP_CODES.SSTORE]

const vm = new VM()

// prepare sender
const senderWallet = Wallet.generate()
const senderAddress = Address.fromPrivateKey(senderWallet.getPrivateKey())

// https://github.com/ethereumjs/ethereumjs-monorepo/blob/master/packages/util/test/account.spec.ts#L500
;(async () => {

  // assign sender
  const account = await vm.stateManager.getAccount(senderAddress)
  await vm.stateManager.putAccount(senderAddress, Account.fromAccountData({ ...account, balance: 1000n ** 18n }))
  
  // run tx
  const txOptions = { gasPrice: '0x10', gasLimit: '0x20000' }
  const unsignedTx = TransactionFactory.fromTxData({ ...txOptions, data: '0x' + code.join(''), })
  const tx = unsignedTx.sign(senderWallet.getPrivateKey())
  const result = await vm.runTx({ tx })
  console.log('tx error:', result.execResult?.exceptionError)
  
  // run tx2
  const unsignedTx2 = TransactionFactory.fromTxData({ ...txOptions, to: result.createdAddress, nonce: 1 })
  const tx2 = unsignedTx2.sign(senderWallet.getPrivateKey())
  const result2 = await vm.runTx({ tx: tx2 })
  console.log('tx2 error:', result2.execResult?.exceptionError)

  // dump storage
  console.log('senderAddress dumpStorage:', await vm.stateManager.dumpStorage(senderAddress))
  console.log('createdAddress:', result.createdAddress.toString())
  console.log('createdAddress dumpStorage:', await vm.stateManager.dumpStorage(result.createdAddress))

})()
