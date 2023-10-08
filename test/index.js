const test = require('node:test')
const assert = require('node:assert')

const { OP_CODES, submitTransaction, queryState, debug } = require('../lib')

// node --test
test('create 2 contracts and reassign one of them', async () => {
    
    // create contract 1
	const code = [OP_CODES.PUSH1, '02', OP_CODES.PUSH1, '03', OP_CODES.SSTORE]
	const result = await submitTransaction({ type: 'hub', action: 'create_contract', data: '0x' + code.join('') })
    
    // create contract 2
	const code2 = [OP_CODES.PUSH1, '04', OP_CODES.PUSH1, '05', OP_CODES.SSTORE]
	const result2 = await submitTransaction({ type: 'hub', action: 'create_contract', data: '0x' + code2.join('') })

	// call contract 1
	await submitTransaction({ type: 'rollup', action: 'call_contract', actionParams: [result.createdAddress], data: '' })
    const result3 = await queryState(result.createdAddress)
    assert.strictEqual(Object.values(result3)[0], '0x02')

    // call contract 1
	await submitTransaction({ type: 'rollup', action: 'call_contract', actionParams: [result.createdAddress], data: '' })
    const result4 = await queryState(result.createdAddress)
    assert.strictEqual(Object.values(result4)[0], '0x02')

    // call contract 2
	await submitTransaction({ type: 'rollup', action: 'call_contract', actionParams: [result2.createdAddress], data: '' })
    const result5 = await queryState(result2.createdAddress)
    assert.strictEqual(Object.values(result5)[0], '0x04')

	// reassign contract 2
	await submitTransaction({ type: 'hub', action: 'reassign_contract', data: [result2.createdAddress, 0] })

    // call contract 2
    const result6 = await queryState(result2.createdAddress)
    assert.strictEqual(Object.values(result6)[0], '0x04')

    // await debug()

})
