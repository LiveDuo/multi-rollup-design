const test = require('node:test')
const assert = require('node:assert')
const { spawn } = require('node:child_process')

const { OP_CODES } = require('../lib')
const { rpcRequest, waitRpcServer, waitWsServer, logSpawn } = require('./utils')

// node --test test/e2e.js
test('e2e: create 2 contracts and reassign one of them', async () => {
    
    // start da
    const daOptions = { address: 'localhost', port: 9000 }
    const da = spawn('node', ['da.js', '--port', daOptions.port])
    const wsUrl = `ws://${daOptions.address}:${daOptions.port}`
    await waitWsServer(wsUrl)

    logSpawn(da)

    // start node 1
    const nodeOptions = { address: 'localhost', port: 8001 }
    const node = spawn('node', ['index.js', '--port', nodeOptions.port, '--da', wsUrl])
    const nodeUrl = `http://${nodeOptions.address}:${nodeOptions.port}`
    await waitRpcServer(nodeUrl)
    
    logSpawn(node)

    // start node 2
    const nodeOptions2 = { address: 'localhost', port: 8002 }
    const node2 = spawn('node', ['index.js', '--port', nodeOptions2.port, '--da', wsUrl])
    const nodeUrl2 = `http://${nodeOptions2.address}:${nodeOptions2.port}`
    await waitRpcServer(nodeUrl2)

    // create rollup 1
    const addResult = await rpcRequest(nodeUrl, 'add_rollup', [])
    assert.strictEqual(addResult.rollupId, 0)
    
    // create rollup 2
    const addResult2 = await rpcRequest(nodeUrl, 'add_rollup', [])
    assert.strictEqual(addResult2.rollupId, 1)

	// create contract 1
    const code = [OP_CODES.PUSH1, '02', OP_CODES.PUSH1, '03', OP_CODES.SSTORE]
    const createResult = await rpcRequest(nodeUrl, 'create_contract', ['0x' + code.join('')])
    assert.deepStrictEqual(createResult.createdAddress.substring(2).length, 40)

    // create contract 2
    const code2 = [OP_CODES.PUSH1, '04', OP_CODES.PUSH1, '05', OP_CODES.SSTORE]
    const createResult2 = await rpcRequest(nodeUrl, 'create_contract', ['0x' + code2.join('')])
    assert.deepStrictEqual(createResult2.createdAddress.substring(2).length, 40)
    
    // call contract 1
    await rpcRequest(nodeUrl, 'call_contract', [createResult.createdAddress.toString()])
    const stateData = await rpcRequest(nodeUrl, 'query_state', [createResult.createdAddress.toString()])
    assert.deepStrictEqual(Object.values(stateData)[0], '0x02')

    // call contract 1
    await rpcRequest(nodeUrl, 'call_contract', [createResult.createdAddress.toString()])
    const stateData2 = await rpcRequest(nodeUrl, 'query_state', [createResult.createdAddress.toString()])
    assert.deepStrictEqual(Object.values(stateData2)[0], '0x02')
    
    // call contract 2
    await rpcRequest(nodeUrl, 'call_contract', [createResult2.createdAddress.toString()])
    const stateData3 = await rpcRequest(nodeUrl, 'query_state', [createResult2.createdAddress.toString()])
    assert.deepStrictEqual(Object.values(stateData3)[0], '0x04')

    // // reassign contract 2
    // await rpcRequest(nodeUrl, 'reassign_contract', [createResult2.createdAddress.toString(), 0])
    // await rpcRequest(nodeUrl, 'call_contract', [createResult2.createdAddress.toString()])
    // const stateData4 = await rpcRequest(nodeUrl, 'query_state', [createResult2.createdAddress.toString()])
    // assert.deepStrictEqual(Object.values(stateData4)[0], '0x04')

    // // remove rollup
    // await rpcRequest(nodeUrl, 'remove_rollup', [1])
    // const stateData5 = await rpcRequest(nodeUrl, 'query_state', [createResult2.createdAddress.toString()])
    // assert.strictEqual(Object.values(stateData5)[0], '0x04')

    // stop nodes
    da.kill()
    node.kill()
    node2.kill()

})
