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

+ [DreamTeam Token (DreamTeam Token)](contracts/token/DreamTeamToken.sol)
+ [Dream Token Vesting](contracts/vesting/DreamTokensVesting.sol) ([team and early investors](contracts/vesting/TeamAndEarlyInvestorsVesting.sol) and [pro teams and tournament organizers](contracts/vesting/TeamsAndTournamentOrganizersVesting.sol) vesting smart contracts)
+ [Team Contracts Manager Contract](contracts/teams/TeamContracts.sol) (smart contract for team payments management)
+ [DreamTeam Old Test Token (TDTT)](contracts/token/TDTT.sol) (This version of the test token was used on the Ethereum test network until 5/7/2018)

## Smart Contract Audits

+ DreamTeam Token: [Coinfabrik](https://blog.coinfabrik.com/dreamteam-token-audit/)
+ TeamContracts, DreamTeam Test Token: [Coinfabrik](https://blog.coinfabrik.com/dreamteam-smart-contract-for-players-compensation/)

## Smart Contract Addresses

+ DREAM (DreamTeam Token): [0x82f4dED9Cec9B5750FBFf5C2185AEe35AfC16587](https://etherscan.io/token/0x82f4ded9cec9b5750fbff5c2185aee35afc16587)
+ Pro Teams and Tournament Organizers Vesting Smart Contract: [0xEF50320525251339128b0C7970284E5032142365](https://etherscan.io/address/0xef50320525251339128b0c7970284e5032142365)
+ Team and Early Investors Vesting Smart Contract: [0xff595b6F3C6929FcfCF06F8dc3f46AefA21647f7](https://etherscan.io/address/0xff595b6f3c6929fcfcf06f8dc3f46aefa21647f7)
