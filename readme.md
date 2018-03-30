# DreamTeam Smart Contracts

This repository contains the code of the smart contracts used within [DreamTeam](https://dreamteam.gg) services. This repository is provided for informational purposes only.

Currently all smart contracts in this repository [are used](https://ropsten.etherscan.io/token/0x671c81d8731f9582f17e7519f46243040e7d9642) for test purposes in Ethereum test network (Ropsten). Smart contracts in the live network (mainnet) can be slightly different and some of them may be replaced.

## Description

This repository contains smart contracts code which manage contracts (agreements) between teams (team owners)
and players (team members). Some of these smart contracts are meant to be upgradable, preserving opportunity for DreamTeam to add more and more functionality in the future.

The whole dApp (smart contracts) keeps track only of those parts of DreamTeam which are somehow related to crypto assets.
This includes team creation (team owner assignment), adding or removing team members and paying to them, token transfers and so on.

We have an authorized address (DreamTeam address) to manage teams (create new teams, add/remove
team members with appropriate rules). The crucial thing is that all payouts to team members are guaranteed
once an agreement is established. Once a team contract (meaning the contract between the team owner and a 
player) is established (technically speaking, when DreamTeam account will actually trigger an `addMember`
function of a smart contract), the player is **guaranteed** to receive their tokens due to a publicly
available function `payout` in TeamContracts smart contract.

Normally, in the future, DreamTeam is going to trigger payouts once a day, massively, for all teams
which need to be paid out, for a little fee in tokens. If DreamTeam for some unknown reason does not
trigger payouts, team members theirselves can trigger ones, by using any services publicly available like 
Etherscan, MyEtherWallet or so.

## Smart Contracts

Currently, we expose two smart contracts for a public use:

+ [contracts/teams/TeamContracts.sol](contracts/teams/TeamContracts.sol) (an upgradeable/replaceable smart contract)
+ [contracts/token/TDTT.sol](contracts/token/TDTT.sol) (ERC20 test token: a simple token deployed for testing purposes only)

## Smart Contract Addresses (Test Network)

+ TeamContracts: [0xfa48ab1c05ab1e7727e15ab879c88faa8a7357ef](https://ropsten.etherscan.io/address/0xfa48ab1c05ab1e7727e15ab879c88faa8a7357ef)
+ DreamTeam Test Token (TDTT): [0x671c81d8731f9582f17e7519f46243040e7d9642](https://ropsten.etherscan.io/token/0x671c81d8731f9582f17e7519f46243040e7d9642)
