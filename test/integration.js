const test = require('node:test')
const assert = require('node:assert')

const { OP_CODES, submitTransaction, queryState, queryHub, debug } = require('../lib')

// node --test test/integration.js
test('integration: create 2 contracts and reassign one of them', async () => {
    
    // create rollup 1
	const addResult = await submitTransaction({ type: 'hub', action: 'add_rollup' })
    const rollupData = await queryHub(addResult.rollupId)
    assert.strictEqual(!!rollupData, true)
    
    // create rollup 2
	const addResult2 = await submitTransaction({ type: 'hub', action: 'add_rollup' })
    const rollupData2 = await queryHub(addResult2.rollupId)
    assert.strictEqual(!!rollupData2, true)

    // create contract 1
	const code = [OP_CODES.PUSH1, '02', OP_CODES.PUSH1, '03', OP_CODES.SSTORE]
	const createResult = await submitTransaction({ type: 'hub', action: 'create_contract', data: '0x' + code.join('') })
    
    // create contract 2
	const code2 = [OP_CODES.PUSH1, '04', OP_CODES.PUSH1, '05', OP_CODES.SSTORE]
	const createResult2 = await submitTransaction({ type: 'hub', action: 'create_contract', data: '0x' + code2.join('') })

	// call contract 1
	await submitTransaction({ type: 'rollup', action: 'call_contract', actionParams: [createResult.createdAddress], data: '' })
    const stateData = await queryState(createResult.createdAddress)
    assert.strictEqual(Object.values(stateData)[0], '0x02')

    // call contract 1
	await submitTransaction({ type: 'rollup', action: 'call_contract', actionParams: [createResult.createdAddress], data: '' })
    const stateData2 = await queryState(createResult.createdAddress)
    assert.strictEqual(Object.values(stateData2)[0], '0x02')

    // call contract 2
	await submitTransaction({ type: 'rollup', action: 'call_contract', actionParams: [createResult2.createdAddress], data: '' })
    const stateData3 = await queryState(createResult2.createdAddress)
    assert.strictEqual(Object.values(stateData3)[0], '0x04')

	// reassign contract 2
	await submitTransaction({ type: 'hub', action: 'reassign_contract', data: [createResult2.createdAddress, 0] })

    // call contract 2
    const stateData4 = await queryState(createResult2.createdAddress)
    assert.strictEqual(Object.values(stateData4)[0], '0x04')

    // await debug()

})