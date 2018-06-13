# DreamTeam Smart Contracts

This repository contains the code of the smart contracts used within [DreamTeam](https://dreamteam.gg) services. This repository is provided for informational purposes only.

Currently all smart contracts in this repository [are used](https://ropsten.etherscan.io/token/0x671c81d8731f9582f17e7519f46243040e7d9642) for test purposes on the Ethereum
test network (Ropsten). Smart contracts on the live network (mainnet) can be slightly different due to the active
development process.

## Description

This repository contains smart contracts used within the DreamTeam platform. Some of these smart contracts are
upgradable by design, preserving the opportunity for DreamTeam to add more and more functionalities in the future.

The whole dApp (smart contracts) only keeps track of those parts of DreamTeam which are somehow related to crypto assets.
This includes team creation (team owner assignment), adding or removing team members and paying to them, token transfers and so on.

We have an authorized address (DreamTeam address) to manage teams (create new teams, add/remove
team members with appropriate rules). The crucial thing is that all payouts to team members **are guaranteed
once an agreement is established**. Once a team contract (meaning the contract between the team owner and a 
player) is established (technically speaking, when the DreamTeam account actually triggers an `addMember`
function of a smart contract), the player is guaranteed to receive their tokens due to a publicly
available function `payout` in the TeamContracts smart contract.

Normally, in the future, DreamTeam is going to trigger payouts once a day, collectively, for all teams
which need to be paid out, for a small token fee. If DreamTeam for some unknown reason does not
trigger payouts, team members themselves can trigger them, by using any services publicly available like 
[Etherscan](https://ropsten.etherscan.io), MyEtherWallet, or others to trigger the payout.

## Smart Contracts Source Code (entry points)

+ [DreamTeam Test Token (DreamTeam Token)](contracts/token/DreamTeamToken.sol) (potential DreamTeam token contract in Ethereum test network)
+ [DreamTeam Test Token (TDTT)](contracts/token/TDTT.sol) (This version of the test token was used on the Ethereum test network until 5/7/2018)
+ [Team Contracts Manager Contract](contracts/teams/TeamContracts.sol) (smart contract for team compensation payments)

## Smart Contract Audits

+ TeamContracts, DreamTeam Test Token: [Coinfabrik](https://blog.coinfabrik.com/dreamteam-smart-contract-for-players-compensation/)
+ DreamTeam Token: [Coinfabrik](https://blog.coinfabrik.com/dreamteam-token-audit/)

## Smart Contract Addresses

+ TeamContracts: [0x7ddb3d916877366b0cce9e034c0b748773301308](https://ropsten.etherscan.io/address/0x7ddb3d916877366b0cce9e034c0b748773301308)
+ DreamTeam Test Token (DreamTeam Token): [0xcad9c6677f51b936408ca3631220c9e45a9af0f6](https://ropsten.etherscan.io/token/0xcad9c6677f51b936408ca3631220c9e45a9af0f6)
+ DreamTeam Test Token (TDTT): [0x671c81d8731f9582f17e7519f46243040e7d9642](https://ropsten.etherscan.io/token/0x671c81d8731f9582f17e7519f46243040e7d9642)
