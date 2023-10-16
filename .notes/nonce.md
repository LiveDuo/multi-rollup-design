
### Ideas

1. Set mapped nonces
    - **Explanation:** Map nonces in `create_contract` and `call_contract` such that `rollupNonce = f(rollupId, senderNonce)`
    - **Example mapping:** `rollupNonce = rollupId * 1000 + senderNonce`

2. Set initial nonces
    - **Explanation:** Set the nonce of the initial transaction
    - **Issue:** There could be address collisions with migrated and existing contracts
    - **Issue example:** (Sender, 1) on rollup 1 and (Sender, 2) on rollup 2


### Code notes

```js
// runCall
callerAccount.nonce++ // await this.journal.putAccount(message.caller, callerAccount)

// runCall -> _executeCreate
toAccount.nonce > BIGINT_0 // return if true
toAccount.nonce += BIGINT_1 // await this.journal.putAccount(message.to, toAccount)

// runCall -> _executeCreate -> _generateAddress
const newNonce = acc.nonce - BIGINT_1 // generateAddress(message.caller.bytes, bigIntToBytes(newNonce))
```
