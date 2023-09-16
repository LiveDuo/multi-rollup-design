const { VM } = require('@ethereumjs/vm')
const { Wallet } = require('@ethereumjs/wallet')
const { TransactionFactory } = require('@ethereumjs/tx')

// constants
const GAS_PRICE = '0x10', GAS_LIMIT = '0x20000'
const OP_CODES = { PUSH1: '60', SSTORE: '55' }

// signer
const senderWallet = Wallet.generate()
const senderWallet2 = Wallet.generate()

const vm1 = new VM()
const vm2 = new VM()

; (async () => {
	
	// deploy contract 1
	const code = [OP_CODES.PUSH1, '02', OP_CODES.PUSH1, '03', OP_CODES.SSTORE]
	const unsignedTx = TransactionFactory.fromTxData({ gasPrice: GAS_PRICE, gasLimit: GAS_LIMIT, data: '0x' + code.join(''), nonce: 0 })
	const signedTx = unsignedTx.sign(senderWallet.getPrivateKey())
	const result = await vm1.runTx({ tx: signedTx, skipBalance: true })
	
	// debug contract 1
	const storage = await vm1.stateManager.dumpStorage(result.createdAddress)
	console.log('Address', result.createdAddress.toString(), '\n', storage)

	// deploy contract 2
	const code2 = [OP_CODES.PUSH1, '04', OP_CODES.PUSH1, '05', OP_CODES.SSTORE]
	const unsignedTx2 = TransactionFactory.fromTxData({ gasPrice: GAS_PRICE, gasLimit: GAS_LIMIT, data: '0x' + code2.join(''), nonce: 0 })
	const signedTx2 = unsignedTx2.sign(senderWallet2.getPrivateKey())
	const result2 = await vm2.runTx({ tx: signedTx2, skipBalance: true })
	
	// debug contract 2
	const storage2 = await vm2.stateManager.dumpStorage(result2.createdAddress)
	console.log('Address', result2.createdAddress.toString(), '\n', storage2)

})()

