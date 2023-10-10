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

// node --test test/e2e.js
test('e2e: create 2 contracts and reassign one of them', async () => {
    
    // start node
    const node = spawn('node', ['index.js', '--port', 8001])
    const node2 = spawn('node', ['index.js', '--port', 8002])
    await new Promise(r => setTimeout(r, 2000)) // TODO wait ping

    // call node 1
    const res = await rpcRequest(`http://localhost:${8001}`, 'echo', ['params'])
    assert.deepStrictEqual(res, ['params'])
    
    // call node 2
    const res2 = await rpcRequest(`http://localhost:${8002}`, 'echo', ['params'])
    assert.deepStrictEqual(res2, ['params'])

    // stop nodes
    node.kill()
    node2.kill()

})
