const minimist = require('minimist')
const express = require('express')
const bodyParser = require('body-parser')
const { JSONRPCServer } = require('json-rpc-2.0')
const WebSocket = require('ws')
const { Address } = require('@ethereumjs/util')

const { processTransaction, queryState, queryHub, setSynced, setRollupId } = require('./lib')

const { rpcRequest, recoverSender } = require('./test/utils')

const argv = minimist(process.argv.slice(2))
const rollupId = parseInt(argv.id) ?? 0
const port = parseInt(argv.port) ?? 8000
const daWsUrl = argv.daWs ?? 'ws://localhost:9000'
const daRpcUrl = argv.daRpc ?? 'http://localhost:9001'

setRollupId(rollupId)

console.log('init', `rollupId=${rollupId}`)

const getTxAddress = (tx) => Address.generate(recoverSender(tx), BigInt(tx.params[1]))

const isCreateContractAddress = (tx, address) => tx.action === 'create_contract' && getTxAddress(tx).equals(Address.fromString(address))
const isCallContract = (tx, address) => tx.action === 'call_contract' && tx.params[0] === address

const processTransactionAsync = async (_tx) => {
	
	if (_tx.action === 'reassign_contract') {

		const [address, targetRollupId] = _tx.params

		if (targetRollupId === rollupId) {
			setSynced(false)

			const txs = await rpcRequest(daRpcUrl, 'get_txs', [])
			const txsAddress = txs.filter(tx => isCreateContractAddress(tx, address) || isCallContract(tx, address))
			for (let tx of txsAddress) {
				tx.reassign = { rollupId: targetRollupId }
				await processTransaction(tx)
			}
			
			setSynced(true)
		}
	} else if (_tx.action === 'remove_rollup') {

		const [targetRollupId] = _tx.params

		// get rollup contracts
		const stateHub = queryHub()
		const rollupContracts = Object.entries(stateHub.contracts).filter(([_, data]) => data.rollupId === targetRollupId)
		
		// reassign contracts
		const txs = await rpcRequest(daRpcUrl, 'get_txs', [])
		for (const [i, [address, _]] of rollupContracts.entries()) {
			
			// check rollup id
			const contractRollupId = i % stateHub.count
			if (contractRollupId !== rollupId) continue

			// process contract
			const txsRollup = txs.filter(tx => isCreateContractAddress(tx, address) || isCallContract(tx, address))
			for (let tx of txsRollup) {
				tx.reassign = { rollupId: contractRollupId }
				await processTransaction(tx)
			}
		}
		
	}
}

const ws = new WebSocket(daWsUrl)
ws.on('open', () => {
	console.log('da websocket connected')
})
ws.on('message', async (message) => {
	const tx = JSON.parse(message.toString())
	await processTransaction(tx)

	await processTransactionAsync(tx)
})

const submitTransaction = async (tx) => {
	ws.send(JSON.stringify(tx))
	const result = await processTransaction(tx)
	return result
}

// https://www.npmjs.com/package/json-rpc-2.0
const server = new JSONRPCServer()
server.addMethod('ping', () => 'pong')

server.addMethod('submit_tx', async ([tx]) => {
	return await submitTransaction(tx)
})
server.addMethod('query_state', async ([address]) => {
	return await queryState(address)
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
