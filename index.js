const util = require('util')
const crypto = require('crypto')

const { VM } = require('@ethereumjs/vm')
const { Wallet } = require('@ethereumjs/wallet')
const { TransactionFactory } = require('@ethereumjs/tx')

const hash = (d) => crypto.createHash('md5').update(d).digest('hex')
const submitTransaction = async (tx) => { daLayer.push(tx); const result = await processTransaction(tx); return result }

const daLayer = []
const executionLayer = { rollups: {}, hub: { contracts: {}, sequencers: {} } }

const senderWallet = Wallet.generate()
const txOptions = { gasPrice: '0x10', gasLimit: '0x20000' }

const OP_CODES = {PUSH1: '60', SSTORE: '55'}
const code = [OP_CODES.PUSH1, '02', OP_CODES.PUSH1, '03', OP_CODES.SSTORE]

const vm = new VM()

const processTransaction = async (tx) => {
    if (tx.type === 'hub') {
        if (tx.action === 'create_contract') {

            // deploy contract
            const unsignedTx = TransactionFactory.fromTxData({ ...txOptions, data: tx.data, })
            const signedTx = unsignedTx.sign(senderWallet.getPrivateKey())
            const result = await vm.runTx({ tx: signedTx, skipBalance: true })

            // update hub
            const rollupId = 0 // TODO
            const contractId = hash(tx.data)
            executionLayer['hub'].contracts[contractId] = { rollupId, code: tx.data }

            return result

        }
    } else if (tx.type === 'rollup') {
        if (tx.action === 'call_contract') {
            
            // call contract
            const contractAddress = tx.actionParams[0]
            const unsignedTx2 = TransactionFactory.fromTxData({ ...txOptions, to: contractAddress, nonce: 1 })
            const tx2 = unsignedTx2.sign(senderWallet.getPrivateKey())
            const result = await vm.runTx({ tx: tx2, skipBalance: true })

            // update rollup
            const rollupId = tx.typeParams[0]
            const contractStorage = await vm.stateManager.dumpStorage(contractAddress)
            const storage = { ...executionLayer.rollups[rollupId], storage: { [contractAddress]: contractStorage }}
            executionLayer.rollups[rollupId] = storage

            return result
        }
    }
}

;(async () => {
    const result = await submitTransaction({type: 'hub', action: 'create_contract', data: '0x' + code.join('')})
    await submitTransaction({type: 'rollup', typeParams: [0], action: 'call_contract', actionParams: [result.createdAddress], data: ''})
    console.log(util.inspect(executionLayer, {depth: null}))

})()

