const { EVM } = require('@ethereumjs/evm')

const OP_CODES = {STOP: '00', ADD: '01', PUSH1: '60'}
const code = [OP_CODES.PUSH1, '03', OP_CODES.PUSH1, '05', OP_CODES.ADD, OP_CODES.STOP]

// https://www.npmjs.com/package/@ethereumjs/evm
;(async () => {

    const evm = new EVM()
    evm.events.on('step', (data) => console.log(`${data.opcode.name}\t-> ${data.stack}`))

    const result = await evm.runCode({ code: Buffer.from(code.join(''), 'hex') })
    console.log(Buffer.from(result.runState.contract.storageRoot).toString('hex'))
    console.log(Buffer.from(result.runState.contract.codeHash).toString('hex'))
    console.log(result.executionGasUsed)
    console.log(result.runState.stack)
    console.log(result.returnValue)

    // console.log(Object.keys(result))

})()
