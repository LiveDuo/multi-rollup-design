const minimist = require('minimist')
const express = require('express')
const bodyParser = require('body-parser')
const { JSONRPCServer } = require('json-rpc-2.0')

const argv = minimist(process.argv.slice(2))
const port = argv.port ?? 8000

const { processTransaction, queryState: queryStateInner } = require('./lib')

const daLayer = []
const executionLayer = { rollups: {}, hub: { contracts: {} } }

const submitTransaction = async (tx) => {
	daLayer.push(tx)
	const result = await processTransaction(executionLayer, tx)
	// TODO trigger subscription
	return result
}
const queryState = (address) => queryStateInner(executionLayer, address)

// https://www.npmjs.com/package/json-rpc-2.0
const server = new JSONRPCServer()
server.addMethod('log', (message) => console.log(message))
server.addMethod('echo', (message) => message)
server.addMethod('ping', () => 'pong')

server.addMethod('add_rollup', async () => {
	return await submitTransaction({ type: 'hub', action: 'add_rollup' })
})
server.addMethod('remove_rollup', async (message) => {
	return await submitTransaction({ type: 'hub', action: 'remove_rollup', actionParams: [message[0]] })
})
server.addMethod('create_contract', async (message) => {
	const createResult = await submitTransaction({ type: 'hub', action: 'create_contract', data: message[0] })
	return { createdAddress: createResult.createdAddress.toString() }
})
server.addMethod('reassign_contract', async (message) => {
	await submitTransaction({ type: 'hub', action: 'reassign_contract', data: [message[0], message[1]] })
})
server.addMethod('call_contract', async (message) => {
	await submitTransaction({ type: 'rollup', action: 'call_contract', actionParams: [message[0]], data: '' })
})
server.addMethod('query_state', async (message) => {
	return await queryState(message[0])
})
/*
server.addSubscription('subscribe_tx'), async (message) => {
	// TODO process tx
}
*/

const app = express()
app.use(bodyParser.json())

// curl -X POST http://127.0.0.1:8005 -H 'Content-Type: application/json' -d '{"jsonrpc":"2.0","method":"log", "id":1, "params": ["message"]}'
app.post('/', async (req, res) => {
	const rpcRes = await server.receive(req.body)
	if (!rpcRes) return res.sendStatus(204)
	res.json(rpcRes)
})

app.listen(port)
