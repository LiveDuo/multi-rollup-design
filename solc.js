const solc = require('solc')

const filename = 'test.sol'
const code = 'contract C { function f() public { } }'

const input = {
  language: 'Solidity',
  sources: { [filename]: { content: code } },
  settings: { outputSelection: { '*': { '*': ['*'] } } }
}
const output = JSON.parse(solc.compile(JSON.stringify(input)))
const compiled = output.contracts['test.sol']
console.log(compiled['C'].evm.bytecode.object)

