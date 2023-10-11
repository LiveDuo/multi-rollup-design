const reassignContract = async (createdAddress, rollupId) => {
	const rollupIdFrom = executionState['hub'].contracts[createdAddress].rollupId
	const rollupTo = executionState['rollups'][rollupId]
	const rollupFrom = executionState['rollups'][rollupIdFrom]
	
	// update rollup hub
	executionState['hub'].contracts[createdAddress] = { rollupId }

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