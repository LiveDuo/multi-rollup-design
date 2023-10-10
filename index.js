const express = require('express')
const bodyParser = require('body-parser')
const { JSONRPCServer } = require('json-rpc-2.0')

// https://www.npmjs.com/package/json-rpc-2.0
const server = new JSONRPCServer()
server.addMethod('echo', (message) => message)
server.addMethod('log', (message) => console.log(message))

const app = express()
app.use(bodyParser.json())

// curl -X POST http://127.0.0.1:8005 -H 'Content-Type: application/json' -d '{"jsonrpc":"2.0","method":"log", "id":1, "params": ["message"]}'
app.post('/', async (req, res) => {
	const rpcRes = await server.receive(req.body)
	if (!rpcRes) return res.sendStatus(204)
	res.json(rpcRes)
})

app.listen(8005)
