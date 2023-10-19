const { Trie } = require('@ethereumjs/trie')
const { bytesToUtf8, utf8ToBytes } = require('@ethereumjs/util')

// node scripts/examples/trie-proof.js
; (async () => {

	// setup trie
	const trie = new Trie()
	await trie.put(utf8ToBytes('test'), utf8ToBytes('one'))

	// create proof
	const proof = await trie.createProof(utf8ToBytes('test'))

	// verify proof
	const value = await trie.verifyProof(trie.root(), utf8ToBytes('test'), proof)
	console.log(value ? bytesToUtf8(value) : 'not found') // 'one'
})()
