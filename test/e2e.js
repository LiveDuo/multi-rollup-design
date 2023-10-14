const test = require('node:test')
const assert = require('node:assert')
const { spawn } = require('node:child_process')

const { OP_CODES } = require('../lib')
const { rpcRequest, waitRpcServer, waitWsServer, logSpawn } = require('./utils')

// node --test test/e2e.js
test('e2e: create 2 contracts and reassign one of them', async () => {
    
    // start da
    const daOptions = { address: 'localhost', wsPort: 9000, rpcPort: 9001 }
    const da = spawn('node', ['da.js', '--wsPort', daOptions.wsPort, '--rpcPort', daOptions.rpcPort])
    const wsUrl = `ws://${daOptions.address}:${daOptions.wsPort}`
    const rpcUrl = `http://${daOptions.address}:${daOptions.rpcPort}`
    await waitWsServer(wsUrl)
    await waitRpcServer(rpcUrl)

    logSpawn(da)

    // start node 1
    const nodeOptions = { address: 'localhost', port: 8001 }
    const node = spawn('node', ['index.js', '--id', 0, '--port', nodeOptions.port, '--daWs', wsUrl, '--daRpc', rpcUrl])
    const nodeUrl = `http://${nodeOptions.address}:${nodeOptions.port}`
    await waitRpcServer(nodeUrl)
    
    logSpawn(node)

    // start node 2
    const nodeOptions2 = { address: 'localhost', port: 8002 }
    const node2 = spawn('node', ['index.js', '--id', 1, '--port', nodeOptions2.port, '--daWs', wsUrl, '--daRpc', rpcUrl])
    const nodeUrl2 = `http://${nodeOptions2.address}:${nodeOptions2.port}`
    await waitRpcServer(nodeUrl2)

    logSpawn(node2)

    // create rollup 1
    const addResult = await rpcRequest(nodeUrl, 'add_rollup', [])
    assert.strictEqual(addResult.rollupId, 0)
    
    // create rollup 2
    const addResult2 = await rpcRequest(nodeUrl, 'add_rollup', [])
    assert.strictEqual(addResult2.rollupId, 1)

	// create contract 1
    const code = [OP_CODES.PUSH1, '02', OP_CODES.PUSH1, '03', OP_CODES.SSTORE]
    const createResult = await rpcRequest(nodeUrl2, 'create_contract', ['0x' + code.join(''), 0])
    assert.deepStrictEqual(createResult.createdAddress.substring(2).length, 40)

    // create contract 2
    const code2 = [OP_CODES.PUSH1, '04', OP_CODES.PUSH1, '05', OP_CODES.SSTORE]
    const createResult2 = await rpcRequest(nodeUrl2, 'create_contract', ['0x' + code2.join(''), 1])
    assert.deepStrictEqual(createResult2.createdAddress.substring(2).length, 40)
    
    // call contract 1
    await rpcRequest(nodeUrl2, 'call_contract', [createResult.createdAddress.toString()])
    const stateData = await rpcRequest(nodeUrl2, 'query_state', [createResult.createdAddress.toString()])
    assert.deepStrictEqual(Object.values(stateData ?? [])[0], '0x02')

    // call contract 1
    await rpcRequest(nodeUrl2, 'call_contract', [createResult.createdAddress.toString()])
    const stateData2 = await rpcRequest(nodeUrl2, 'query_state', [createResult.createdAddress.toString()])
    assert.deepStrictEqual(Object.values(stateData2 ?? [])[0], '0x02')
    
    // call contract 2
    await rpcRequest(nodeUrl2, 'call_contract', [createResult2.createdAddress.toString()])
    const stateData3 = await rpcRequest(nodeUrl2, 'query_state', [createResult2.createdAddress.toString()])
    assert.deepStrictEqual(Object.values(stateData3 ?? [])[0], '0x04')

    // TODO
    // reassign contract 2
    await rpcRequest(nodeUrl2, 'reassign_contract', [0, createResult2.createdAddress.toString()])
    const stateData4 = await rpcRequest(nodeUrl, 'query_state', [createResult2.createdAddress.toString()])
    console.log("stateData4", stateData4)
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
