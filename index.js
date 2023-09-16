const { VM } = require('@ethereumjs/vm')
const { Wallet } = require('@ethereumjs/wallet')
const { TransactionFactory } = require('@ethereumjs/tx')
const { Address } = require('@ethereumjs/util')

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
			const nonceCount = ~~(Math.random() * (20 - 10 + 1)) + 10
			await runMultipleTxs(rollup.vm, nonceCount) // hack to increase nonce and get different contract addresses
			const unsignedTx2 = TransactionFactory.fromTxData({ gasPrice: GAS_PRICE, gasLimit: GAS_LIMIT, data: tx.data, nonce: nonceCount })
			const signedTx2 = unsignedTx2.sign(senderWallet.getPrivateKey())
			const result = await rollup.vm.runTx({ tx: signedTx2, skipBalance: true })

			// update hub
			executionLayer['hub'].contracts[result.createdAddress] = { rollupId } // code: tx.data

			return result

		} else if (tx.action === 'reassign_contract') {
			
			return

			const [createdAddress, rollupId] = tx.data
			const rollupIdFrom = executionLayer['hub'].contracts[createdAddress].rollupId
			const rollupTo = executionLayer['rollups'][rollupId]
			const rollupFrom = executionLayer['rollups'][rollupIdFrom]
			
			// update rollup hub
			executionLayer['hub'].contracts[createdAddress] = { rollupId }

			// assign contract account to new rollup
			const account = await rollupFrom.vm.stateManager.getAccount(createdAddress)
			await rollupTo.vm.stateManager.putAccount(createdAddress, account)

			// assign contract code to new rollup
			const code = await rollupFrom.vm.stateManager.getContractCode(createdAddress)
			await rollupTo.vm.stateManager.putContractCode(createdAddress, code)

			// assign contract storage to new rollup
			const storage = await rollupFrom.vm.stateManager.dumpStorage(createdAddress)
			for (const [k, v] of Object.entries(storage)) {
				const key = new Uint8Array(Buffer.from(k.substring(2), 'hex'))
				const value = new Uint8Array(Buffer.from(v.substring(2), 'hex'))
				await rollupTo.vm.stateManager.putContractStorage(createdAddress, key, value)
			}

			// remove state from rollup
			await rollupFrom.vm.stateManager.clearContractStorage(createdAddress)
			
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
			const result = await rollup.vm.runTx({ tx: tx2, skipBalance: true, skipNonce: true })

			return result
		}
	}
}

const submitTransaction = async (tx) => { daLayer.push(tx); const result = await processTransaction(tx); return result }

// const cleanupRollups = (rollups) => Object.entries(rollups).reduce((p, [k, v]) => { p[k] = { storage: v.storage }; return p }, {})

const runMultipleTxs = async (vm, count) => {
	for(let i = 0; i < count; i++){
		const unsignedTx = TransactionFactory.fromTxData({ gasPrice: GAS_PRICE, gasLimit: GAS_LIMIT, data: '', nonce: i })
		const signedTx = unsignedTx.sign(senderWallet.getPrivateKey())
		await vm.runTx({ tx: signedTx, skipBalance: true  })
	}
}

; (async () => {
	// create contracts
	const code = [OP_CODES.PUSH1, '02', OP_CODES.PUSH1, '03', OP_CODES.SSTORE]
	const result = await submitTransaction({ type: 'hub', action: 'create_contract', data: '0x' + code.join('') })
	const code2 = [OP_CODES.PUSH1, '04', OP_CODES.PUSH1, '05', OP_CODES.SSTORE]
	const result2 = await submitTransaction({ type: 'hub', action: 'create_contract', data: '0x' + code2.join('') })

	// call contracts
	await submitTransaction({ type: 'rollup', typeParams: [0], action: 'call_contract', actionParams: [result.createdAddress], data: '' })
	await submitTransaction({ type: 'rollup', typeParams: [0], action: 'call_contract', actionParams: [result.createdAddress], data: '' })
	await submitTransaction({ type: 'rollup', typeParams: [1], action: 'call_contract', actionParams: [result2.createdAddress], data: '' })

	// reassign contract
	await submitTransaction({ type: 'hub', action: 'reassign_contract', data: [result2.createdAddress, 0] })

	// debug
	for ([address, data] of Object.entries(executionLayer.hub.contracts)) {
		const storage = await executionLayer.rollups[data.rollupId].vm.stateManager.dumpStorage(Address.fromString(address))
		console.log('Address', address, '-', 'Rollup Id', data.rollupId)
		console.log(storage)
	}

})()

