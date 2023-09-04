const { VM } = require('@ethereumjs/vm')
const { Wallet } = require('@ethereumjs/wallet')
const { TransactionFactory } = require('@ethereumjs/tx')
const { Account, Address } = require('@ethereumjs/util')

const vm = new VM()

// prepare sender
const senderWallet = Wallet.generate()
const senderAddress = Address.fromPrivateKey(senderWallet.getPrivateKey())

// prepare tx
const txOptions = { gasPrice: '0x10', gasLimit: '0x20000' }
const bytecode = '0x60'
const unsignedTx = TransactionFactory.fromTxData({ ...txOptions, data: bytecode, })
const tx = unsignedTx.sign(senderWallet.getPrivateKey())

// https://github.com/ethereumjs/ethereumjs-monorepo/blob/master/packages/util/test/account.spec.ts#L500
;(async () => {

  // assign sender
  const account = await vm.stateManager.getAccount(senderAddress)
  await vm.stateManager.putAccount(senderAddress, Account.fromAccountData({ ...account, balance: 1000n ** 18n }))
  
  // run tx
  const result = await vm.runTx({ tx })
  console.log('totalGasSpent:', result.totalGasSpent)
  console.log('error:', result.execResult?.exceptionError)
  
  // dump storage
  console.log('senderAddress dumpStorage:', await vm.stateManager.dumpStorage(senderAddress))
  console.log('createdAddress:', result.createdAddress.toString())
  console.log('createdAddress dumpStorage:', await vm.stateManager.dumpStorage(result.createdAddress))

})()
