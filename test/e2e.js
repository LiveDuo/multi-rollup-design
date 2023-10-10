const test = require('node:test')
const assert = require('node:assert')
const fetch = require('node-fetch')
const { spawn } = require('node:child_process')

const rpcRequest = async (url, method, params) => {
    const request = {jsonrpc: '2.0', method, id: 1, params}
    const requestParams = { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(request) }
    const rawResponse = await fetch(url, requestParams)
    const content = await rawResponse.json()
    return content.result
}

const waitRpcServer = async (nodeUrl) => {
    
    for (let i = 0; i < 5; i++) {
        try {
            const res = await rpcRequest(nodeUrl, 'ping', [])
            if (res === 'pong') { break } else { throw new Error('Server unavailable') }
        } catch (error) {
            await new Promise(r => setTimeout(r, 200))
        }
    }
}

// node --test test/e2e.js
test('e2e: create 2 contracts and reassign one of them', async () => {
    
    // start node 1
    const nodeOptions = { address: 'localhost', port: 8001 }
    const node = spawn('node', ['index.js', '--port', nodeOptions.port])
    const nodeUrl = `http://${nodeOptions.address}:${nodeOptions.port}`
    await waitRpcServer(nodeUrl)
    
    // start node 2
    const nodeOptions2 = { address: 'localhost', port: 8002 }
    const node2 = spawn('node', ['index.js', '--port', nodeOptions2.port])
    const nodeUrl2 = `http://${nodeOptions2.address}:${nodeOptions2.port}`
    await waitRpcServer(nodeUrl2)

    // TODO
    // create rollup 1
	// create rollup 2
	// create contract 1
	// create contract 2
	// call contract 1
	// call contract 1
	// call contract 2
	// reassign contract 2
	// call contract 2
    
    
    // call node 1 (example)
    const res = await rpcRequest(nodeUrl, 'echo', ['params'])
    assert.deepStrictEqual(res, ['params'])
    
    // call node 2 (example)
    const res2 = await rpcRequest(nodeUrl2, 'echo', ['params'])
    assert.deepStrictEqual(res2, ['params'])

    // stop nodes
    node.kill()
    node2.kill()

})
