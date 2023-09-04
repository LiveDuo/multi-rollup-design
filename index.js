const util = require('util')

const { VM } = require('@ethereumjs/vm')
const { Wallet } = require('@ethereumjs/wallet')
const { TransactionFactory } = require('@ethereumjs/tx')

const daLayer = []
const executionLayer = { rollups: {}, hub: { contracts: {}, sequencers: {} } }

const senderWallet = Wallet.generate()
const txOptions = { gasPrice: '0x10', gasLimit: '0x20000' }

const OP_CODES = {PUSH1: '60', SSTORE: '55'}
const code = [OP_CODES.PUSH1, '02', OP_CODES.PUSH1, '03', OP_CODES.SSTORE]

const processTransaction = async (tx) => {
    if (tx.type === 'hub') {
        if (tx.action === 'create_contract') {

            // get rollup
            const rollupId = 0 // TODO
            const rollup = { vm: new VM() }
            
            // update rollup
            executionLayer['rollups'][rollupId] = rollup

            // deploy contract
            const unsignedTx = TransactionFactory.fromTxData({ ...txOptions, data: tx.data, })
            const signedTx = unsignedTx.sign(senderWallet.getPrivateKey())
            const result = await rollup.vm.runTx({ tx: signedTx, skipBalance: true })

            // update hub
            executionLayer['hub'].contracts[result.createdAddress] = { rollupId } // code: tx.data

            return result

        }
    } else if (tx.type === 'rollup') {
        if (tx.action === 'call_contract') {
            
            // get rollup
            const rollupId = tx.typeParams[0]
            const rollup = executionLayer['rollups'][rollupId]

            // call contract
            const contractAddress = tx.actionParams[0]
            const unsignedTx2 = TransactionFactory.fromTxData({ ...txOptions, to: contractAddress, nonce: 1 })
            const tx2 = unsignedTx2.sign(senderWallet.getPrivateKey())
            const result = await rollup.vm.runTx({ tx: tx2, skipBalance: true })

            // update rollup
            const contractStorage = await rollup.vm.stateManager.dumpStorage(contractAddress)
            const storage = { ...rollup, storage: { [contractAddress]: contractStorage }}
            executionLayer['rollups'][rollupId] = storage

            return result
        }
    }
}

const submitTransaction = async (tx) => { daLayer.push(tx); const result = await processTransaction(tx); return result }

;(async () => {
    // create contract
    const result = await submitTransaction({type: 'hub', action: 'create_contract', data: '0x' + code.join('')})

    // call contract
    await submitTransaction({type: 'rollup', typeParams: [0], action: 'call_contract', actionParams: [result.createdAddress], data: ''})

    // debug
    const executionLayerP = {...executionLayer, rollups: Object.entries(executionLayer.rollups).reduce((p, [k, v]) => { p[k] = {storage: v.storage}; return p }, {}) }
    console.log(util.inspect(executionLayerP, {depth: null}))

})()

