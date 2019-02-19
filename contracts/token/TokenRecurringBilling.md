# Token Recurring Billing Smart Contract Factory Documentation

This document describes how to work with the recurring billing smart contract factory and a recurring billing smart contract.

Table of Contents
-----------------

<!--ts-->
   * [Smart Contracts Addresses](#smart-contract-addresses)
   * [Recurring Billing Smart Contract Factory](#recurring-billing-smart-contract-factory)
      * [Creating a New Recurring Billing Smart Contract for Your Token](#creating-a-new-recurring-billing-smart-contract-for-your-token)
      * [Verifying Recurring Billing Smart Contract Code on Etherscan](#verifying-recurring-billing-smart-contract-code-on-etherscan)
   * [Using Recurring Billing Smart Contract](#using-recurring-billing-smart-contract)
      * [Workflow](#workflow)
      * [Setup](#setup)
<!--te-->

## Smart Contract Addresses

**Mainnet:**

+ [0xDCc90D21186e9c1B60439FdBf88f0f14ad3A7355: Recurring Billing Smart Contract Factory](https://etherscan.io/address/0xdcc90d21186e9c1b60439fdbf88f0f14ad3a7355#writeContract)
+ [0x9dF38BdF603b36B8FE8040De760dFbB84cCeFa6d: Recurring Billing Smart Contract (for DREAM token)](https://etherscan.io/address/0x9df38bdf603b36b8fe8040de760dfbb84ccefa6d#readContract)

**Testnet (Ropsten):**

+ [Recurring Billing Smart Contract Factory](https://ropsten.etherscan.io/address/0x80891b1fcb7f47ac1f5e423b092bed9dd1ed2be7#writeContract)

Please create an issue/pull request regarding deploying recurring billing smart contract factories for any other networks.

## Recurring Billing Smart Contract Factory

Recurring billing smart contract factory allows to create recurring billing smart contracts for **any ERC20-compatible tokens**. Thus, you can enable recurring billing for your own tokens.

### Creating a New Recurring Billing Smart Contract for Your Token

To create new recurring billing smart contract for your token, execute `newRecurringBillingContract` function in recurring billing smart contract factory, providing a token address as an argument. You can make this transaction from any account: this account won't be provided with any special control over the new recurring billing smart contract.

Once mined, check the event logs of the transaction and find `NewRecurringBillingContractCreated(address token, address recurringBillingContract)` event. This event has an address of the new recurring billing smart contract for your token ([example for DREAM token](https://etherscan.io/tx/0xeae6302871727f4e037783c2a32962424365cc72e6331d5f874222214e178bba#eventlog): `9df38bdf603b36b8fe8040de760dfbb84ccefa6d` is the new recurring billing contract address). You don't need to create more than 1 recurring billing smart contract for your token. However, in case you really need this you can publish more transactions to `newRecurringBillingContract` function, each one will create a new recurring billing smart contract.

You can use Etherscan or similar resources to find out event logs of past transactions and check whether recurring billing smart contract was created for your token.

### Verifying Recurring Billing Smart Contract Code on Etherscan

Etherscan does not inherit verified smart contract code for newly created smart contracts yet, so you have to verify smart contract code manually. In order to verify the code of your newly created recurring billing smart contract, go to [verify smart contract code on Etherscan](https://etherscan.io/verifyContract2) and:
1. Copy-paste the code from the [smart contract factory]((https://etherscan.io/address/0xdcc90d21186e9c1b60439fdbf88f0f14ad3a7355#writeContract)). To make things more clear, you can delete `contract RecurringBillingContractFactory` definition from the code.
2. In the `Address` input, put the address of your newly created recurring billing smart contract.
3. In the `Contract Name` input, put `TokenRecurringBilling`.
4. Select `0.5.2` as a compiler version.
5. Select `Yes` for `Optimization Enabled`. Ensure that `Runs` says `200`.
6. **In "Constructor Arguments ABI-encoded"**, put the newly created smart contract address as it appears in the `NewRecurringBillingContractCreated` [event log](https://etherscan.io/tx/0xeae6302871727f4e037783c2a32962424365cc72e6331d5f874222214e178bba#eventlog). E.g. for DREAM token we had to put `0000000000000000000000009df38bdf603b36b8fe8040de760dfbb84ccefa6d` ([0x9df38bdf603b36b8fe8040de760dfbb84ccefa6d](https://etherscan.io/address/0x9df38bdf603b36b8fe8040de760dfbb84ccefa6d)).
7. Press `Verify and Publish`.

## Using Recurring Billing Smart Contract

Once you've got the recurring billing smart contract address for your token, you can use it for your needs, it's permanent. Example: [Recurring Billing for DREAM Token](https://etherscan.io/address/0x9df38bdf603b36b8fe8040de760dfbb84ccefa6d#writeContract).

### Workflow

The recurring billing smart contract defines workflow between a merchant and a customer. Workflow:

1. Merchant registers themselves in this smart contract using `registerNewMerchant`.
    1. Merchant specifies `beneficiary` address, which receives tokens.
    2. Merchant specifies `merchant` address, which is able to change `merchant` and `beneficiary` addresses.
    3. Merchant specified an address that is authorized to call `charge` related to this merchant.
        1. Later, merchant can (de)authorize another addresses to call `charge` using `changeMerchantChargingAccount`.
    4. As a result, merchant gets `merchantId`, which is used to initialize recurring billing by customers.
    5. Merchant account can change their `beneficiary`, `merchant` and authorized charging addresses by calling:
        1. Function `changeMerchantAccount`, which changes account that can control this merchant (`merchantId`).
        2. Function `changeMerchantBeneficiaryAddress`, which changes merchant's `beneficiary`.
        3. Function `changeMerchantChargingAccount`, which (de)authorizes addresses to call `charge` on behalf of this merchant.
2. According to an off-chain agreement with merchant, customer calls `allowRecurringBilling` and:
    1. Specifies `billingId`, which is given off-chain by merchant (merchant will listen blockchain Event on this ID).
    2. Specifies `merchantId`, the merchant which will receive tokens.
    3. Specifies `period` in seconds, during which only one charge can occur.
    4. Specifies `value`, amount in tokens which can be charged each `period`.
        1. If the customer doesn't have at least `value` tokens, `allowRecurringBilling` errors.
        2. If the customer haven't approved at least `value` tokens for a smart contract, `allowRecurringBilling` errors.
    5. `billingId` is then used by merchant to charge customer each `period`.
3. Merchant use authorized accounts (1.iii) to call the `charge` function each `period` to charge agreed amount from a customer.
    1. It is impossible to call `charge` if the date of the last charge is less than `period`.
    2. Calling `charge` cancels billing when called after 2 `period`s from the last charge.
    3. Thus, to successfully charge an account, `charge` must be strictly called within 1 and 2 `period`s after the last charge.
    4. Calling `charge` errors if any of the following occur:
        1. Customer canceled recurring billing with `cancelRecurringBilling`.
        2. Customer's balance is lower than the chargeable amount.
        3. Customer's allowance to the smart contract is less than the chargeable amount.
        4. Specified `billingId` does not exists.
        5. There's no `period` passed since the last charge.
    5. Next charge date increments strictly by `period` each charge, thus, there's no need to exec `charge` strictly on time.
4. Customer can cancel further billing by calling `cancelRecurringBilling` and passing `billingId`.
5. TokenRecurringBilling smart contract implements `receiveApproval` function for allowing/cancelling billing within one call from the token smart contract. Parameter `data` is encoded as tightly-packed (uint256 metadata, uint256 billingId).
    1. `metadata` is encoded using `encodeBillingMetadata`.
    2. As for `receiveApproval`, `lastChargeAt` in `metadata` is used as an action identifier.
    3. `lastChargeAt=0` specifies that customer wants to allow new recurring billing.
    4. `lastChargeAt=1` specifies that customer wants to cancel existing recurring billing.
    5. Make sure that passed `bytes` parameter is exactly 64 bytes in length.

### Setup

The common automated setup for the recurring billing smart contract can be arranged like this:

1. (**One-time action**) Merchant (a business representative) register themselves in a smart contract, determining which address will receive tokens and which address will be authorized to charge customers on behalf of merchant account.
2. (**One-time action**) Merchant develops back end for recurring charges from authorized charging account. In short, back end publishes charge Ethereum transaction from charging account each time it sees `BillingAllowed` event or when the time allows to do the next charge. Additionally, back end can listen for `BillingCharged` event to strictly define the next charge date.
3. (**One-time action**) Merchant develops front end for end users, primarily allowing them to call `allowRecurringBilling` function. Note that billing parameters should arrive and get validated on the back end. If billing parameters don't match with ones generated on a back end, merchant should not perform any charges.
4. (**Recurring**) Each time there is a charge possible, back end charges customers using `charge` function.

More detailed description of how to work with these smart contracts is coming on the [developer's Medium](https://medium.com/@zitro).
