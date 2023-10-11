const express = require('express')
const http = require('http')
const WebSocket = require('ws')

const app = express()
const server = http.createServer(app)
const wss = new WebSocket.Server({ server })

const PORT = 8080

// wscat -c ws://localhost:8080
wss.on('connection', (ws) => {

	// connected
	ws.id = ~~(Math.random() * 1000)
	console.log('Connected', `(id=${ws.id})`)

	// message
	// NOTE: send to all with `wss.clients`
  ws.on('message', (message) => {
		console.log('Received', message.toString(), `(id=${ws.id})`)
		ws.send(`Echo: ${message}`)
  })
})

server.listen(PORT, () => {
  console.log('Wss started on port', PORT)
})
