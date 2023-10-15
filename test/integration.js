const test = require('node:test')
const assert = require('node:assert')

const { Wallet } = require('@ethereumjs/wallet')

const { OP_CODES, processTransaction, queryState, queryHub, setRollupId, debug } = require('../lib')

const { getSignature } = require('../test/utils')

const senderWallet = Wallet.generate()

const submitTransaction = async (tx) => {
    tx.signature = getSignature(tx, senderWallet)
    return await processTransaction(tx)
}

// node --test test/integration.js
test('integration: create 2 contracts and reassign one of them', async () => {
    
    // create rollup 1
	const addResult = await submitTransaction({ type: 'hub', action: 'add_rollup' })
    assert.strictEqual(addResult.rollupId, 0)

    // create rollup 2
	const addResult2 = await submitTransaction({ type: 'hub', action: 'add_rollup' })
    assert.strictEqual(addResult2.rollupId, 1)
    
    // set rollup id
    setRollupId(1)

    // check hub
    const hubData = await queryHub()
    assert.strictEqual(hubData.count, 2)

    const rollupId = addResult.rollupId
    const rollupId2 = addResult2.rollupId

    // create contract 1
	const code = [OP_CODES.PUSH1, '02', OP_CODES.PUSH1, '03', OP_CODES.SSTORE]
	const createResult = await submitTransaction({ type: 'hub', action: 'create_contract', params: ['0x' + code.join(''), 0]})
    
    // create contract 2
	const code2 = [OP_CODES.PUSH1, '04', OP_CODES.PUSH1, '05', OP_CODES.SSTORE]
	const createResult2 = await submitTransaction({ type: 'hub', action: 'create_contract', params: ['0x' + code2.join(''), 1]})

	// call contract 1
	await submitTransaction({ type: 'rollup', action: 'call_contract', params: [createResult.createdAddress.toString(), []] })
    const stateData = await queryState(createResult.createdAddress.toString())
    assert.strictEqual(Object.values(stateData)[0], '0x02')

    // call contract 1
	await submitTransaction({ type: 'rollup', action: 'call_contract', params: [createResult.createdAddress.toString(), []] })
    const stateData2 = await queryState(createResult.createdAddress.toString())
    assert.strictEqual(Object.values(stateData2)[0], '0x02')

    // call contract 2
	await submitTransaction({ type: 'rollup', action: 'call_contract', params: [createResult2.createdAddress.toString(), []] })
    const stateData3 = await queryState(createResult2.createdAddress.toString())
    assert.strictEqual(Object.values(stateData3)[0], '0x04')

	// reassign contract 2
	await submitTransaction({ type: 'hub', action: 'reassign_contract', params: [createResult2.createdAddress.toString()] })
    const stateData4 = await queryState(createResult2.createdAddress.toString())
    assert.strictEqual(Object.values(stateData4)[0], '0x04')
    
    // remove rollup
	await submitTransaction({ type: 'hub', action: 'remove_rollup', params: [rollupId2] })
    const stateData5 = await queryState(createResult2.createdAddress.toString())
    assert.strictEqual(stateData5, null)

    // await debug()

})
