const { EVM } = require('@ethereumjs/evm')
const { Account, Address } = require('@ethereumjs/util')

const OP_CODES = {PUSH1: '60', SSTORE: '55'}
const code = [OP_CODES.PUSH1, '02', OP_CODES.PUSH1, '03', OP_CODES.SSTORE]

const evm = new EVM()

// https://www.npmjs.com/package/@ethereumjs/evm
;(async () => {

    console.log('---- Code ----')
    console.log(code.join(''))
    console.log()

    console.log('---- Stack ----')
    evm.events.on('step', (data) => console.log(`${data.opcode.name}\t-> ${data.stack}`))

    await evm.stateManager.putAccount(Address.zero(), Account.fromAccountData({}))
    const result = await evm.runCode({ code: Buffer.from(code.join(''), 'hex') })
    console.log()
    console.log('---- Result ----')
    console.log('dumpStorage:', await evm.stateManager.dumpStorage(Address.zero()))
    console.log('executionGasUsed', result.executionGasUsed)
    console.log()

    // console.log('storageRoot:', Buffer.from(result.runState.contract.storageRoot).toString('hex'))
    // console.log('codeHash', Buffer.from(result.runState.contract.codeHash).toString('hex'))
    // console.log('returnValue', result.returnValue)
    // console.log('storageRoot:', await evm.stateManager.getStateRoot().then(t => Buffer.from(t).toString('hex')))

})()


// https://github.com/brownie-in-motion/eth/blob/main/source/execute.ts

