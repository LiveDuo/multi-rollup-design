const util = require('util')

const { VM } = require('@ethereumjs/vm')
const { Wallet } = require('@ethereumjs/wallet')
const { TransactionFactory } = require('@ethereumjs/tx')

// constants
const GAS_PRICE = '0x10', GAS_LIMIT = '0x20000'
const OP_CODES = { PUSH1: '60', SSTORE: '55' }

// state
const daLayer = []
const executionLayer = { rollups: {}, hub: { contracts: {}, sequencers: {} } }

// signer
const senderWallet = Wallet.generate()

const processTransaction = async (tx) => {
	if (tx.type === 'hub') {
		if (tx.action === 'create_contract') {

			// get rollup
			const rollupId = Object.keys(executionLayer.rollups).length // assign to last rollup
			const rollup = { vm: new VM() }

			// update rollup
			executionLayer['rollups'][rollupId] = rollup

			// deploy contract
			const unsignedTx = TransactionFactory.fromTxData({ gasPrice: GAS_PRICE, gasLimit: GAS_LIMIT, data: tx.data })
			const signedTx = unsignedTx.sign(senderWallet.getPrivateKey())
			const result = await rollup.vm.runTx({ tx: signedTx, skipBalance: true })

			// update hub
			executionLayer['hub'].contracts[result.createdAddress] = { rollupId } // code: tx.data

			return result

		}
	} else if (tx.type === 'rollup') {
		if (tx.action === 'call_contract') {

			// get rollup
			const rollupId = tx.typeParams[0]
			const rollup = executionLayer['rollups'][rollupId]

			// call contract
			const contractAddress = tx.actionParams[0]
			const unsignedTx2 = TransactionFactory.fromTxData({ gasPrice: GAS_PRICE, gasLimit: GAS_LIMIT, to: contractAddress, nonce: tx.nonce })
			const tx2 = unsignedTx2.sign(senderWallet.getPrivateKey())
			const result = await rollup.vm.runTx({ tx: tx2, skipBalance: true })

			// update rollup
			const contractStorage = await rollup.vm.stateManager.dumpStorage(contractAddress)
			const storage = { ...rollup, storage: { [contractAddress]: contractStorage } }
			executionLayer['rollups'][rollupId] = storage

			return result
		}
	}
}

const submitTransaction = async (tx) => { daLayer.push(tx); const result = await processTransaction(tx); return result }

const cleanupRollups = (rollups) => Object.entries(rollups).reduce((p, [k, v]) => { p[k] = { storage: v.storage }; return p }, {})

; (async () => {
	// create contract
	const code = [OP_CODES.PUSH1, '02', OP_CODES.PUSH1, '03', OP_CODES.SSTORE]
	const result = await submitTransaction({ type: 'hub', action: 'create_contract', data: '0x' + code.join('') })
	const code2 = [OP_CODES.PUSH1, '04', OP_CODES.PUSH1, '05', OP_CODES.SSTORE]
	const result2 = await submitTransaction({ type: 'hub', action: 'create_contract', data: '0x' + code2.join('') })

	// call contract
	await submitTransaction({ type: 'rollup', typeParams: [0], action: 'call_contract', actionParams: [result.createdAddress], data: '', nonce: 1 })
	await submitTransaction({ type: 'rollup', typeParams: [0], action: 'call_contract', actionParams: [result.createdAddress], data: '', nonce: 2 })
	await submitTransaction({ type: 'rollup', typeParams: [1], action: 'call_contract', actionParams: [result2.createdAddress], data: '', nonce: 1 })

	// debug
	console.log('hub', util.inspect(executionLayer.hub, { depth: null }))
	console.log('rollups', util.inspect(cleanupRollups(executionLayer.rollups), { depth: null }))

})()

