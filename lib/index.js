const { VM } = require('@ethereumjs/vm')
const { Wallet } = require('@ethereumjs/wallet')
const { TransactionFactory } = require('@ethereumjs/tx')
const { Address } = require('@ethereumjs/util')

// constants
const GAS_PRICE = '0x10', GAS_LIMIT = '0x20000'
const OP_CODES = { PUSH1: '60', SSTORE: '55' }

// signer
const senderWallet = Wallet.generate()

// state
const rollupState = { vm: new VM(), synced: true }
const hubState = { count: 0, contracts: {} }

const processTransaction = async (tx) => {
	
	if (tx.action === 'add_rollup') {
		
		// update hub
		hubState.count += 1
		
		const rollupId = hubState.count - 1
		return { rollupId }
		
	} else if (tx.action === 'remove_rollup') {

		// update hub
		const [rollupId, targetRollupId] = tx.params
		for (let [address, data] of Object.entries(hubState.contracts)) {
			if (data.rollupId === targetRollupId) {
				hubState.contracts[address].rollupId = targetRollupId
			}
		}
		hubState.count -= 1

		// remove rollup
		if (rollupId === targetRollupId) {
			rollupState = undefined
		}
		
	} else if (tx.action === 'create_contract') {

		// get account
		const senderAddress = Address.fromString(senderWallet.getAddressString())
		const sender = await rollupState.vm.stateManager.getAccount(senderAddress)

		// deploy contract
		const [rollupId, code] = tx.params
		const lastRollupId = hubState.count - 1
		const senderNonce = sender?.nonce ?? 0n
		if (rollupId === lastRollupId) {
			const unsignedTx2 = TransactionFactory.fromTxData({ gasPrice: GAS_PRICE, gasLimit: GAS_LIMIT, data: code, nonce: senderNonce })
			const signedTx2 = unsignedTx2.sign(senderWallet.getPrivateKey())
			await rollupState.vm.runTx({ tx: signedTx2, skipBalance: true }) // Note: maybe return result
		}

		// update hub
		const address = Address.generate(senderAddress, BigInt(senderNonce))
		hubState.contracts[address] = { rollupId: lastRollupId }

		return { createdAddress: address }

	} else if (tx.action === 'reassign_contract') {
		const [rollupId,targetRollupId, address] = tx.params
		
		// assign to target rollup
		hubState.contracts[address] = {rollupId: targetRollupId}
		
		// remove from current rollup
		const contractRollupId = hubState.contracts[address].rollupId
		if(rollupId === contractRollupId) {
			await rollupState.vm.stateManager.clearContractStorage(Address.fromString(address))
		}
	} else if (tx.action === 'call_contract') {

		// check rollup id
		const targetRollupId = tx.params[0]
		const contractAddress = tx.params[1]
		const rollupId = hubState.contracts[contractAddress]?.rollupId
		if (rollupId !== targetRollupId) {
			return
		}

		// get tx
		const txUnsigned = TransactionFactory.fromTxData({ gasPrice: GAS_PRICE, gasLimit: GAS_LIMIT, to: contractAddress, nonce: tx.nonce })
		const txSigned = txUnsigned.sign(senderWallet.getPrivateKey())
		
		// call contract
		const result = await rollupState.vm.runTx({ tx: txSigned, skipBalance: true, skipNonce: true })

		return result
	}
}

const queryState = async (address) => {
	try {
		const storage = await rollupState.vm.stateManager.dumpStorage(Address.fromString(address))
		return storage
	} catch (error) {
		return null
	}
}

const queryHub = () => hubState

const debug = async () => {
	for ([address, data] of Object.entries(hubState.contracts)) {
		const storage = await rollupState.vm.stateManager.dumpStorage(Address.fromString(address))
		console.log('Address', address, '-', 'Rollup Id', data.rollupId, '\n', storage)
	}
}

const setSynced = (synced) => rollupState.synced = synced

exports.OP_CODES = OP_CODES
exports.processTransaction = processTransaction
exports.queryState = queryState
exports.queryHub = queryHub
exports.setSynced = setSynced
exports.debug = debug

