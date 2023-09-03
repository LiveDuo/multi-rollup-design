const { EVM } = require('@ethereumjs/evm')

const OP_CODES = {STOP: '00', ADD: '01', PUSH1: '60'}
const code = [OP_CODES.PUSH1, '03', OP_CODES.PUSH1, '05', OP_CODES.ADD, OP_CODES.STOP]

const evm = new EVM()

// https://www.npmjs.com/package/@ethereumjs/evm
;(async () => {

    console.log('---- Code ----')
    console.log(code.join(''))
    console.log()

    console.log('---- Stack ----')
    evm.events.on('step', (data) => console.log(`${data.opcode.name}\t-> ${data.stack}`))

    const result = await evm.runCode({ code: Buffer.from(code.join(''), 'hex') })
    console.log()
    console.log('---- Result ----')
    console.log('storageRoot:', Buffer.from(result.runState.contract.storageRoot).toString('hex'))
    console.log('codeHash', Buffer.from(result.runState.contract.codeHash).toString('hex'))
    console.log('executionGasUsed', result.executionGasUsed)
    console.log('stack', result.runState.stack._store[0])
    console.log('returnValue', result.returnValue)
    console.log()

    // console.log(Object.keys(result))

})()
