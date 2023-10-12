
### RPC server

```js
let rpcRes

const request = req.body
if (request.method === 'log') {
    rpcRes = { jsonrpc: '2.0', result: [], error: null, id: 1 }
} else if (request.method === 'echo') {
    rpcRes = { jsonrpc: '2.0', result: request.params, error: null, id: 1 }
} else if (request.method === 'ping') {
    rpcRes = { jsonrpc: '2.0', result: ['pong'], error: null, id: 1 }
} else if (request.method === 'create_contract') {
    const createResult = await submitTransaction({ type: 'hub', action: 'create_contract', data: message[0] })
    rpcRes = { jsonrpc: '2.0', result: [createResult], error: null, id: 1 }
}
```
