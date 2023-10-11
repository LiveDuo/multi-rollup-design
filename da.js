

const minimist = require('minimist')
const express = require('express')
const http = require('http')
const WebSocket = require('ws')

const app = express()
const server = http.createServer(app)
const wss = new WebSocket.Server({ server })

const argv = minimist(process.argv.slice(2))
const port = argv.port ?? 9000

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
		
		console.log('Received', message.toString(), `(id=${ws.id})`)

		// check
		const tx = parseTransaction(message)
		if (!tx) return ws.send('Invalid message')

		// store
		transactions.push(tx)

		// broadcast
		wss.clients.forEach((client) => {
			if (client.id !== ws.id) ws.send(message)
		})

  })
})

server.listen(port, () => {
  console.log('Wss started on port', port)
})
