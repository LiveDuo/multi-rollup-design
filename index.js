const minimist = require('minimist')
const express = require('express')
const bodyParser = require('body-parser')
const { JSONRPCServer } = require('json-rpc-2.0')
const WebSocket = require('ws')
const { Wallet } = require('@ethereumjs/wallet')

const { processTransaction, queryState, queryHub, setSynced, setRollupId } = require('./lib')

const { rpcRequest, getSignature } = require('./test/utils')

const argv = minimist(process.argv.slice(2))
const rollupId = parseInt(argv.id) ?? 0
const port = parseInt(argv.port) ?? 8000
const daWsUrl = argv.daWs ?? 'ws://localhost:9000'
const daRpcUrl = argv.daRpc ?? 'http://localhost:9001'

const senderWallet = Wallet.generate()

setRollupId(rollupId)

console.log('init', `rollupId=${rollupId}`)

const ws = new WebSocket(daWsUrl)
ws.on('open', () => {
	console.log('da websocket connected')
})
ws.on('message', async (message) => {
	const tx = JSON.parse(message.toString())
	await processTransaction(tx)
})

const submitTransaction = async (tx) => {
	tx.signature = getSignature(tx, senderWallet)
	ws.send(JSON.stringify(tx))
	const result = await processTransaction(tx)
	return result
}

// https://www.npmjs.com/package/json-rpc-2.0
const server = new JSONRPCServer()
server.addMethod('ping', () => 'pong')

server.addMethod('add_rollup', async () => {
	return await submitTransaction({ action: 'add_rollup', params: [] })
})
server.addMethod('remove_rollup', async ([targetRollupId]) => {
	await submitTransaction({ action: 'remove_rollup', params: [targetRollupId] })

	// get rollup contracts
	const stateHub = queryHub()
	const rollupContracts = Object.entries(stateHub.contracts).filter(([_, data]) => data.rollupId === targetRollupId)

	// reassign contracts
	const txs = await rpcRequest(daRpcUrl, 'get_txs', [])
	for (const [i, [address, data]] of rollupContracts.entries()) {
		const contractRollupId = i % stateHub.count
		if (contractRollupId === rollupId) {
			const txsRollup = txs.filter(tx => (tx.action === 'create_contract' && data.rollupId === targetRollupId) || (tx.action === 'call_contract' && tx.params[1] === address))
			for (let tx of txsRollup) {
				await processTransaction(tx)
			}
		}
	}
})
server.addMethod('create_contract', async ([code, salt]) => {
	const createResult = await submitTransaction({ action: 'create_contract', params: [code, salt] })
	return { createdAddress: createResult.createdAddress.toString() }
})
server.addMethod('reassign_contract', async ([targetRollupId, address]) => {
	await submitTransaction({ action: 'reassign_contract', params: [targetRollupId, address] })

	const stateHub = queryHub()
	const contractRollupId =  stateHub.contracts[address].rollupId

	if (contractRollupId === targetRollupId) {
		setSynced(false)
		
		const txs = await rpcRequest(daRpcUrl, 'get_txs', [])
		
		const txsAddress = txs.filter(tx => (tx.action === 'create_contract' && stateHub.contracts[address].rollupId === targetRollupId) || (tx.action === 'call_contract' && tx.params[1] === address))
		for (let tx of txsAddress) {
			await processTransaction(tx)
		}
		
		setSynced(true)
	}
})
server.addMethod('call_contract', async ([address, calldata]) => {
	await submitTransaction({ action: 'call_contract', params: [address, calldata] })
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
