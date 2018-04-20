# DreamTeam Smart Contracts

This repository contains the code of the smart contracts used within [DreamTeam](https://dreamteam.gg) services. This repository is provided for informational purposes only.

Currently all smart contracts in this repository [are used](https://ropsten.etherscan.io/token/0x671c81d8731f9582f17e7519f46243040e7d9642) for test purposes on the Ethereum
test network (Ropsten). Smart contracts on the live network (mainnet) can be slightly different due to the active
development process.

## Smart Contracts Source Code (entry points)

+ [DreamTeam Test Token (TDTT)](contracts/token/TDTT.sol) (test token currently used on the Ethereum test network)
+ [DreamTeam Token (DTT)](contracts/token/DTT.sol) (potential DreamTeam token contract)
+ [Team Contracts Manager Contract](contracts/teams/TeamContracts.sol) (smart contract for team compensation payments)

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

## Smart Contract Addresses (Test Network)

+ TeamContracts: [0xfa48ab1c05ab1e7727e15ab879c88faa8a7357ef](https://ropsten.etherscan.io/address/0xfa48ab1c05ab1e7727e15ab879c88faa8a7357ef)
+ DreamTeam Test Token (TDTT): [0x671c81d8731f9582f17e7519f46243040e7d9642](https://ropsten.etherscan.io/token/0x671c81d8731f9582f17e7519f46243040e7d9642)
