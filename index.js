const util = require('util')

const daLayer = []
const executionLayer = {
    rollups: {},
    hub: { contracts: {}, sequencers: {} }
}

const submitTransaction = (tx) => {
    daLayer.push(tx)
    processTransaction(tx)
}

const processTransaction = (tx) => {
    if (tx.type === 'hub') {
        if (tx.action === 'create_contract') {
            const contractId = 0 // TODO
            const rollupId = 0 // TODO
            executionLayer['hub'].contracts[contractId] = { rollupId }
        }
    } else if (tx.type === 'rollup') {
        if (tx.action === 'call_contract') {
            
            
            const storage = { storage: { [tx.actionParams[0]]: 'updated_storage' }}

            executionLayer.rollups[tx.typeParams[0]] = storage
        }
    }
}

submitTransaction({type: 'hub', action: 'create_contract', data: '000402'})
submitTransaction({type: 'rollup', typeParams: [0], action: 'call_contract', actionParams: [0], data: '01'})

console.log(util.inspect(executionLayer, {depth: null}))
