const util = require('util')
const crypto = require('crypto')

const daLayer = []
const executionLayer = { rollups: {}, hub: { contracts: {}, sequencers: {} } }

const submitTransaction = (tx) => { daLayer.push(tx); processTransaction(tx) }
const hash = (d) => crypto.createHash('md5').update(d).digest('hex')

const processTransaction = (tx) => {
    if (tx.type === 'hub') {
        if (tx.action === 'create_contract') {
            const rollupId = 0 // TODO
            const contractId = hash(tx.data)
            executionLayer['hub'].contracts[contractId] = { rollupId, code: tx.data }
        }
    } else if (tx.type === 'rollup') {
        if (tx.action === 'call_contract') {
            const rollupId = tx.typeParams[0]
            const updatedStorage = 'updated_storage' // TODO
            const storage = { ...executionLayer.rollups[rollupId], storage: { [tx.actionParams[0]]: updatedStorage }}
            executionLayer.rollups[rollupId] = storage
        }
    }
}

submitTransaction({type: 'hub', action: 'create_contract', data: '000402'})
submitTransaction({type: 'rollup', typeParams: [0], action: 'call_contract', actionParams: [hash('000402')], data: '01'})

console.log(util.inspect(executionLayer, {depth: null}))
