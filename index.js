const minimist = require('minimist')
const express = require('express')
const bodyParser = require('body-parser')
const { JSONRPCServer } = require('json-rpc-2.0')
const WebSocket = require('ws')

const argv = minimist(process.argv.slice(2))
// const rollupId = parseInt(argv.id) ?? 0
const port = parseInt(argv.port) ?? 8000
const daWsUrl = argv.da ?? 'ws://localhost:9000'

const { processTransaction, queryState: queryStateInner } = require('./lib')

const ws = new WebSocket(daWsUrl)
ws.on('open', () => {
	console.log('Da websocket connected')
})
ws.on('message', async (message) => {
	const tx = JSON.parse(message.toString())
	await processTransaction(tx)
})

const submitTransaction = async (tx) => {
	ws.send(JSON.stringify(tx))
	const result = await processTransaction(tx)
	return result
}
const queryState = (address) => queryStateInner(address)

// https://www.npmjs.com/package/json-rpc-2.0
const server = new JSONRPCServer()
server.addMethod('log', (message) => console.log(message))
server.addMethod('echo', (message) => message)
server.addMethod('ping', () => 'pong')

server.addMethod('add_rollup', async () => {
	return await submitTransaction({ action: 'add_rollup' })
})
server.addMethod('remove_rollup', async (message) => {
	return await submitTransaction({ action: 'remove_rollup', params: [message[0]] })
})
server.addMethod('create_contract', async (message) => {
	const createResult = await submitTransaction({ action: 'create_contract', params: [message[0]] })
	return { createdAddress: createResult.createdAddress.toString() }
})
server.addMethod('reassign_contract', async (message) => {
	await submitTransaction({ action: 'reassign_contract', params: [message[0], message[1]] })
})
server.addMethod('call_contract', async (message) => {
	await submitTransaction({ action: 'call_contract', params: [message[0], message[1]] })
})
server.addMethod('query_state', async (message) => {
	return await queryState(message[0])
})

const app = express()
app.use(bodyParser.json())

// curl -X POST http://127.0.0.1:8005 -H 'Content-Type: application/json' -d '{"jsonrpc":"2.0","method":"log", "id":1, "params": ["message"]}'
app.post('/', async (req, res) => {
	const rpcRes = await server.receive(req.body)
	if (!rpcRes) return res.sendStatus(204)
	res.json(rpcRes)
})

app.listen(port)
