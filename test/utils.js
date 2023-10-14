const fetch = require('node-fetch')

const WebSocket = require('ws')

const MAX_RETRIES = 10
const RETRY_DELAY = 200 // ms

const rpcRequest = async (url, method, params) => {
    const request = {jsonrpc: '2.0', method, id: 1, params}
    const requestParams = { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(request) }
    const rawResponse = await fetch(url, requestParams)
    const content = await rawResponse.json()
    return content.result
}
exports.rpcRequest = rpcRequest

const waitRpcServer = async (nodeUrl) => {
    
    for (let i = 0; i < MAX_RETRIES; i++) {
        try {
            const res = await rpcRequest(nodeUrl, 'ping', [])
            if (res === 'pong') { break } else { throw new Error('Server unavailable') }
        } catch (error) {
            await new Promise(r => setTimeout(r, RETRY_DELAY))
        }
    }
}
exports.waitRpcServer = waitRpcServer

const waitWsServer = async (wsUrl) => {
    
    for (let i = 0; i < MAX_RETRIES; i++) {
        
        try {
            await new Promise ((r, e) => {
                const ws = new WebSocket(wsUrl)
                ws.onopen = () => { r(); ws.close() }
                ws.onerror = () => { e(); ws.close() }
            })
            break
        } catch (error) {
            await new Promise(r => setTimeout(r, RETRY_DELAY))
        }
    }
}
exports.waitWsServer = waitWsServer

const logSpawn = (node) => {
    node.stderr.on('data', (d) => console.log('stderr:', d.toString()))
    node.stdout.on('data', (d) => console.log('stdout:', d.toString()))
}
exports.logSpawn = logSpawn
