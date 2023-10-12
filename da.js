

const minimist = require('minimist')
const express = require('express')
const bodyParser = require('body-parser')
const { JSONRPCServer } = require('json-rpc-2.0')
const http = require('http')
const WebSocket = require('ws')

const app = express()
const server = http.createServer(app)
const wss = new WebSocket.Server({ server })

const argv = minimist(process.argv.slice(2))
const wsPort = argv.wsPort ?? 9000
const rpcPort = argv.rpcPort ?? 9001

const transactions = []

const parseTransaction = (message) => {
	try {
		return JSON.parse(message)
	} catch (error) {
		return undefined
	}
}

// wscat -c ws://localhost:8080
wss.on('connection', (ws) => {

	// connected
	ws.id = ~~(Math.random() * 1000)
	console.log('Connected', `(id=${ws.id})`)

	// message
  ws.on('message', (message) => {

		// check
		const tx = parseTransaction(message)
		if (!tx) return ws.send('Invalid message')

		console.log('Received', message.toString(), `(id=${ws.id})`)

		// store
		transactions.push(tx)

		// broadcast
		wss.clients.forEach((client) => {
			if (client.id !== ws.id) {
				client.send(message)
			}
		})

  })
})


server.listen(wsPort, () => {
	console.log('Wss started on port', wsPort)
})


const RPCServer = new JSONRPCServer()
RPCServer.addMethod('get_txs', ([contractAddress]) => {
	return transactions.filter(tx => tx.action === 'create_contract' || (tx.action === 'call_contract' && tx.params[1] === contractAddress))
})


const RPCApp = express()
RPCApp.use(bodyParser.json())

RPCApp.post('/', async (req, res) => {
	const rpcRes = await RPCServer.receive(req.body)
	if (!rpcRes) return res.sendStatus(204)
	res.json(rpcRes)
})

RPCApp.listen(rpcPort, () => {
	console.log('RPC server started on port', rpcPort)
})
