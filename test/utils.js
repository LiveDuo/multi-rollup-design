const { keccak256 } = require('ethereum-cryptography/keccak')
const { Address, ecsign, ecrecover, bigIntToBytes, bytesToBigInt } = require('@ethereumjs/util')
const { RLP } = require('@ethereumjs/rlp')

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
            if (i===MAX_RETRIES-1) throw new Error('Server timeout')
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
            if (i===MAX_RETRIES-1) throw new Error('Server timeout')
        }
    }
}
exports.waitWsServer = waitWsServer

const logSpawn = (node, name) => {
    node.stderr.on('data', (d) => console.log(name, 'stderr:', d.toString()))
    node.stdout.on('data', (d) => console.log(name, 'stdout:', d.toString()))
}
exports.logSpawn = logSpawn

const getMessageHash = (tx) => {
    const message = [tx.to !== undefined ? tx.to.bytes : new Uint8Array(0), tx.data]
    return keccak256(RLP.encode(message))
}
exports.getMessageHash = getMessageHash

const getSignature = (tx, senderWallet) => {
    const messageHash = getMessageHash(tx)
    const ecSignature = ecsign(messageHash, senderWallet.getPrivateKey(), 1n)
    const signature = new Uint8Array([ ...bigIntToBytes(ecSignature.v), ...ecSignature.r, ...ecSignature.s ])
    return '0x' + Buffer.from(signature).toString('hex')
}
exports.getSignature = getSignature

const recoverSender = (tx) => {
	const signature = Buffer.from(tx.signature.substring(2), 'hex')
	const [v, r, s] = [signature.subarray(0, 1), signature.subarray(1, 33), signature.subarray(33, 65)]
	const messageHash = getMessageHash(tx)
	const publicKey = ecrecover(messageHash, bytesToBigInt(v), r, s, 1n)
	return Address.fromPublicKey(publicKey)
}
exports.recoverSender = recoverSender
