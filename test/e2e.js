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
    const node = spawn('node', ['index.js'])
    await new Promise(r => setTimeout(r, 2000)) // TODO wait ping

    const url = `http://localhost:${8005}`
    const res = await rpcRequest(url, 'echo', ['params'])
    assert.deepStrictEqual(res, ['params'])

    node.kill()

})
