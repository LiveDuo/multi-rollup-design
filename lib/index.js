const { VM } = require('@ethereumjs/vm')
const { Address, Account, toBytes, ecrecover, bytesToBigInt } = require('@ethereumjs/util')

const { getMessageHash } = require('../test/utils')

// constants
const OP_CODES = { PUSH1: '60', SSTORE: '55' }

// state
const rollupState = { vm: new VM(), synced: true }
const hubState = { count: 0, contracts: {} }

// rollup id
let rollupId = 0
const setRollupId = (_rollupId) => rollupId = _rollupId

const processTransaction = async (tx) => {
	
	// verify signature
	const signature = Buffer.from(tx.signature.substring(2), 'hex')
	const [v, r, s] = [signature.subarray(0, 1), signature.subarray(1, 33), signature.subarray(33, 65)]
	const messageHash = getMessageHash(tx)
	const publicKey = ecrecover(messageHash, bytesToBigInt(v), r, s, 1n)

	// get sender
	const senderAddress = Address.fromPublicKey(publicKey)
	
	// get nonce
	const sender = await rollupState.vm.stateManager.getAccount(senderAddress)
	const senderNonce = sender?.nonce ?? 0n

	// debug
	console.log(`tx.action=${tx.action}`, `tx.params=${tx.params}`, `sender=${senderAddress.toString()}`, `nonce=${senderNonce}`)

	if (tx.action === 'add_rollup') {
		
		// update hub
		hubState.count += 1
		
		const targetRollupId = hubState.count - 1
		return { rollupId: targetRollupId }
		
	} else if (tx.action === 'remove_rollup') {

		// update hub
		const [targetRollupId] = tx.params
		for (let [address, data] of Object.entries(hubState.contracts)) {
			if (data.rollupId === targetRollupId) {
				hubState.contracts[address].rollupId = targetRollupId
			}
		}
		hubState.count -= 1

		// remove rollup
		if (rollupId === targetRollupId) {
			rollupState.vm = undefined
		}
		
	} else if (tx.action === 'create_contract') {

		const [code, salt] = tx.params
		
		// update nonce
		await rollupState.vm.stateManager.putAccount(senderAddress, new Account(BigInt(salt), 0n))
		
		// get address
		const address = Address.generate(senderAddress, BigInt(salt))
		console.log('|-', 'result', `address=${address.toString()}`, `salt=${salt}`)

		// deploy contract
		const lastRollupId = hubState.count - 1
		if (rollupId === lastRollupId) {
			const result = await rollupState.vm.evm.runCall({ caller: senderAddress, data: toBytes(code) })
			if (!result?.createdAddress.equals(address)) throw new Error(`Invalid address: ${result?.createdAddress} !== ${address}`)	
		}

		// update hub
		hubState.contracts[address] = { rollupId: lastRollupId }

		// restore nonce
		await rollupState.vm.stateManager.putAccount(senderAddress, new Account(BigInt(salt) + 1n, 0n))

		return { createdAddress: address }

	} else if (tx.action === 'reassign_contract') {
		const [targetRollupId, address] = tx.params
		
		// assign to target rollup
		hubState.contracts[address] = { rollupId: targetRollupId }
		
		// remove from current rollup
		const contractRollupId = hubState.contracts[address].rollupId
		if (rollupId === contractRollupId) {
			await rollupState.vm.stateManager.clearContractStorage(Address.fromString(address))
		}
	} else if (tx.action === 'call_contract') {

		// check rollup id
		const [targetRollupId, contractAddress] = tx.params
		const currentRollupId = hubState.contracts[contractAddress]?.rollupId
		if (currentRollupId !== targetRollupId) return

		// call contract
		const result = await rollupState.vm.evm.runCall({ to: contractAddress, caller: senderAddress, origin: senderAddress })

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
exports.setRollupId = setRollupId
exports.debug = debug

