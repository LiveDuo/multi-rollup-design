const { hexToBytes } = require('@ethereumjs/util')
const { EVM } = require('@ethereumjs/evm')

;(async () => {

    const evm = new EVM()
    const result = await evm.runCode({ code: hexToBytes('0x01') })
    console.log(result)
})()

// https://www.npmjs.com/package/@ethereumjs/evm