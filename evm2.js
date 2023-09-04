const { VM } = require('@ethereumjs/vm')
const { Wallet } = require('@ethereumjs/wallet')
const { TransactionFactory } = require('@ethereumjs/tx')
const { Account, Address } = require('@ethereumjs/util')

const vm = new VM()

// prepare sender
const senderWallet = Wallet.generate()
const senderAddress = Address.fromPrivateKey(senderWallet.getPrivateKey())

// prepare tx
const txOptions = { gasPrice: '0x09', gasLimit: '0x27100' }
const bytecode = '0x606060405260405161023e38038061023e833981016040528051018051610260913960ff1660e01b8152600401600060405180830381600087803b15801561003e57600080fd5b505af1158015610052573d6000803e3d6000fd5b5050505050565b60608061006a6000396000f3fe6080604052600080fdfea165627a7a7230582056a2a83614981fb8c7c486949b71e646d82f94c0e0ed89308f94d16452fb557b0029'
const unsignedTx = TransactionFactory.fromTxData({ ...txOptions, to: Wallet.generate().getAddressString(), data: bytecode, })
const tx = unsignedTx.sign(senderWallet.getPrivateKey())

;(async () => {

  // assign sender
  const account = await vm.stateManager.getAccount(senderAddress)
  await vm.stateManager.putAccount(senderAddress, Account.fromAccountData({ ...account, balance: 10n ** 18n }))
  
  // run tx
  const result = await vm.runTx({ tx })
  console.log('totalGasSpent:', result.totalGasSpent)

})()
