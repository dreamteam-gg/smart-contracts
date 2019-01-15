# DreamTeam Smart Contracts

This repository contains the code of smart contracts used by [DreamTeam](https://dreamteam.gg). It also provides documentation regarding using these smart contracts for your own projects.

Table of Contents
-----------------

<!--ts-->
   * [Resources](#resources)
      * [Smart Contract Addresses](#smart-contract-addresses)
      * [Smart Contracts Source Code](#smart-contracts-source-code)
      * [Smart Contract Audits](#smart-contract-audits)
   * [Smart Contracts Documentation](#smart-contracts-documentation)
   * [Feedback](#feedback)
<!--te-->

## Resources

Below you can find all necessary information about DreamTeam smart contracts.

### Smart Contract Addresses

+ [0x82f4dED9Cec9B5750FBFf5C2185AEe35AfC16587](https://etherscan.io/token/0x82f4ded9cec9b5750fbff5c2185aee35afc16587) DREAM (DreamTeam Token)
+ [0xEF50320525251339128b0C7970284E5032142365](https://etherscan.io/address/0xef50320525251339128b0c7970284e5032142365) Pro Teams and Tournament Organizers Vesting Smart Contract
+ [0xff595b6F3C6929FcfCF06F8dc3f46AefA21647f7](https://etherscan.io/address/0xff595b6f3c6929fcfcf06f8dc3f46aefa21647f7) Team and Early Investors Vesting Smart Contract
+ [0xDCc90D21186e9c1B60439FdBf88f0f14ad3A7355](https://etherscan.io/address/0xdcc90d21186e9c1b60439fdbf88f0f14ad3a7355#writeContract) Token Recurring Billing Smart Contract Factory
+ [0x9dF38BdF603b36B8FE8040De760dFbB84cCeFa6d](https://etherscan.io/address/0x9df38bdf603b36b8fe8040de760dfbb84ccefa6d#readContract) DREAM Token Recurring Billing Smart Contract

### Smart Contracts Source Code

+ [DREAM Token (DreamTeam Token)](contracts/token/DreamTeamToken.sol)
+ [DREAM Token Vesting](contracts/vesting/DreamTokensVesting.sol) ([team and early investors](contracts/vesting/TeamAndEarlyInvestorsVesting.sol) and [pro teams and tournament organizers](contracts/vesting/TeamsAndTournamentOrganizersVesting.sol) vesting smart contracts)
+ [Token Recurring Billing Factory](contracts/token/TokenRecurringBilling.sol) (also works with other tokens)
+ [Team Contracts Manager Contract](contracts/teams/TeamContracts.sol) (smart contract for team payments management)

### Smart Contract Audits

+ DreamTeam Token: [Coinfabrik](https://blog.coinfabrik.com/dreamteam-token-audit/)
+ TeamContracts, DreamTeam Test Token: [Coinfabrik](https://blog.coinfabrik.com/dreamteam-smart-contract-for-players-compensation/)

## Smart Contracts Documentation

This section provides links to available documentation of smart contracts.

+ [Token Recurring Billing Smart Contract Factory](contracts/token/TokenRecurringBilling.md)

## Feedback

For any smart contracts issues or related questions please contact [support@dreamteam.gg](mailto:support@dreamteam.gg), denoting that your issue is related to Ethereum and smart contracts. Thanks!

---

[Apache License v2.0](LICENSE) © DREAMTEAM