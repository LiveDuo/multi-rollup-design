const { VM } = require('@ethereumjs/vm')
const { Wallet } = require('@ethereumjs/wallet')
const { TransactionFactory } = require('@ethereumjs/tx')
const { Address, Account } = require('@ethereumjs/util')

// constants
const GAS_PRICE = '0x10', GAS_LIMIT = '0x20000'
const OP_CODES = { PUSH1: '60', SSTORE: '55' }

// signer
const senderWallet = Wallet.generate()

// state
const rollupState = { vm: new VM() }
const hubState = { count: 0, contracts: {} }

const getRandom = (min, max) => ~~(Math.random() * (max - min + 1)) + min

const reassignContract = async (createdAddress, rollupId) => {

	// TODO query txs from da (for specific smart contract) // NOTE mock query for integration test
	// TODO for (tx of txs) { processTransaction(tx) }

	const rollupTo = rollupState
	const rollupFrom = rollupState
	
	// update rollup hub
	hubState.contracts[createdAddress] = { rollupId }

	// assign contract account to new rollup
	const account = await rollupFrom.vm.stateManager.getAccount(createdAddress).then((a) => new Account(BigInt(a.nonce), BigInt(a.balance)))
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

const processTransaction = async (tx) => {
	if (tx.type === 'hub') {
		if (tx.action === 'add_rollup') {
			
			// add rollup
			const rollupId = hubState.count // get new
			hubState.count += 1

			return { rollupId }
			
		} else if (tx.action === 'remove_rollup') {
			
			// reassign contracts
			const rollupId = tx.actionParams[0]
			const rollupCount = hubState.count
			const contracts = Object.entries(hubState.contracts).filter(([_, contract]) => contract.rollupId === rollupId)
			for (const [i, address] of contracts.map(([address, _]) => address).entries()) {
				const targetRollupId = i % rollupCount
				await reassignContract(Address.fromString(address), targetRollupId)
			}

			// remove rollup
			rollupState = undefined
			
		} else if (tx.action === 'create_contract') {

			// get rollup
			const rollupId = hubState.count - 1 // get last

			// deploy contract
			const nonceCount = getRandom(10, 20)
			await runMultipleTxs(rollupState.vm, nonceCount) // hack to increase nonce and get different contract addresses
			const unsignedTx2 = TransactionFactory.fromTxData({ gasPrice: GAS_PRICE, gasLimit: GAS_LIMIT, data: tx.data, nonce: nonceCount })
			const signedTx2 = unsignedTx2.sign(senderWallet.getPrivateKey())
			const result = await rollupState.vm.runTx({ tx: signedTx2, skipBalance: true, skipNonce: true })

			// update hub
			hubState.contracts[result.createdAddress] = { rollupId } // code: tx.data

			return result

		} else if (tx.action === 'reassign_contract') {
			
			const [createdAddress, rollupId] = tx.data
			await reassignContract(Address.fromString(createdAddress), rollupId)
			
		}
	} else if (tx.type === 'rollup') {
		if (tx.action === 'call_contract') {

			// get rollup
			const contractAddress = tx.actionParams[0]

			// call contract
			const unsignedTx2 = TransactionFactory.fromTxData({ gasPrice: GAS_PRICE, gasLimit: GAS_LIMIT, to: contractAddress, nonce: tx.nonce })
			const tx2 = unsignedTx2.sign(senderWallet.getPrivateKey())
			const result = await rollupState.vm.runTx({ tx: tx2, skipBalance: true, skipNonce: true })

			return result
		}
	}
}

const runMultipleTxs = async (vm, count) => {
	for(let i = 0; i < count; i++){
		const unsignedTx = TransactionFactory.fromTxData({ gasPrice: GAS_PRICE, gasLimit: GAS_LIMIT, data: '', nonce: i })
		const signedTx = unsignedTx.sign(senderWallet.getPrivateKey())
		await vm.runTx({ tx: signedTx, skipBalance: true, skipNonce: true  })
	}
}

const queryState = async (address) => {
	const storage = await rollupState.vm.stateManager.dumpStorage(Address.fromString(address))
	return storage
}

const queryHub = async () => {
	return hubState
}

const debug = async () => {
	for ([address, data] of Object.entries(hubState.contracts)) {
		const storage = await rollupState.vm.stateManager.dumpStorage(Address.fromString(address))
		console.log('Address', address, '-', 'Rollup Id', data.rollupId, '\n', storage)
	}
}

exports.OP_CODES = OP_CODES
exports.processTransaction = processTransaction
exports.queryState = queryState
exports.queryHub = queryHub
exports.debug = debug

