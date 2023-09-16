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
	
	// deploy contract 2
	const code2 = [OP_CODES.PUSH1, '04', OP_CODES.PUSH1, '05', OP_CODES.SSTORE]
	const unsignedTx2 = TransactionFactory.fromTxData({ gasPrice: GAS_PRICE, gasLimit: GAS_LIMIT, data: '0x' + code2.join(''), nonce: 0 })
	const signedTx2 = unsignedTx2.sign(senderWallet2.getPrivateKey())
	const result2 = await vm2.runTx({ tx: signedTx2, skipBalance: true })
	
	// reassign contract 1 to vm2
	const account = await vm1.stateManager.getAccount(result.createdAddress)
	await vm2.stateManager.putAccount(result.createdAddress, account)
	const contractCode = await vm1.stateManager.getContractCode(result.createdAddress)
	await vm2.stateManager.putContractCode(result.createdAddress, contractCode)
	const contractStorage = await vm1.stateManager.dumpStorage(result.createdAddress)
	for (const [k, v] of Object.entries(contractStorage)) {
		const key = new Uint8Array(Buffer.from(k.substring(2), 'hex'))
		const value = new Uint8Array(Buffer.from(v.substring(2), 'hex'))
		// await vm2.stateManager.putContractStorage(result.createdAddress, key, value) // FIX
	}
	await vm1.stateManager.clearContractStorage(result.createdAddress)
	
	// debug contracts
	const storage = await vm2.stateManager.dumpStorage(result.createdAddress)
	const storage2 = await vm2.stateManager.dumpStorage(result2.createdAddress)
	console.log('Address', result.createdAddress.toString(), '\n', storage)
	console.log('Address', result2.createdAddress.toString(), '\n', storage2)

})()

