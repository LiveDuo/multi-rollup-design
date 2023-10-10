const minimist = require('minimist')
const express = require('express')
const bodyParser = require('body-parser')
const { JSONRPCServer } = require('json-rpc-2.0')

const argv = minimist(process.argv.slice(2))
const port = argv.port ?? 8000

// https://www.npmjs.com/package/json-rpc-2.0
const server = new JSONRPCServer()
server.addMethod('log', (message) => console.log(message))
server.addMethod('echo', (message) => message)
server.addMethod('ping', () => 'pong')

server.addMethod('add_rollup', (message) => message)
server.addMethod('remove_rollup', (message) => message)
server.addMethod('create_contract', (message) => message)
server.addMethod('reassign_contract', (message) => message)
server.addMethod('call_contract', (message) => message)

const app = express()
app.use(bodyParser.json())

// curl -X POST http://127.0.0.1:8005 -H 'Content-Type: application/json' -d '{"jsonrpc":"2.0","method":"log", "id":1, "params": ["message"]}'
app.post('/', async (req, res) => {
	const rpcRes = await server.receive(req.body)
	if (!rpcRes) return res.sendStatus(204)
	res.json(rpcRes)
})

app.listen(port)
