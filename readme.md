# DreamTeam Smart Contracts

This repository contains the code of the smart contracts used within [DreamTeam](https://dreamteam.gg) services. This repository is provided for informational purposes only.

## Smart Contract Addresses

+ DREAM (DreamTeam Token): [0x82f4dED9Cec9B5750FBFf5C2185AEe35AfC16587](https://etherscan.io/token/0x82f4ded9cec9b5750fbff5c2185aee35afc16587)
+ Pro Teams and Tournament Organizers Vesting Smart Contract: [0xEF50320525251339128b0C7970284E5032142365](https://etherscan.io/address/0xef50320525251339128b0c7970284e5032142365)
+ Team and Early Investors Vesting Smart Contract: [0xff595b6F3C6929FcfCF06F8dc3f46AefA21647f7](https://etherscan.io/address/0xff595b6f3c6929fcfcf06f8dc3f46aefa21647f7)

## Smart Contracts Source Code

+ [DREAM Token (DreamTeam Token)](contracts/token/DreamTeamToken.sol)
+ [DREAM Token Vesting](contracts/vesting/DreamTokensVesting.sol) ([team and early investors](contracts/vesting/TeamAndEarlyInvestorsVesting.sol) and [pro teams and tournament organizers](contracts/vesting/TeamsAndTournamentOrganizersVesting.sol) vesting smart contracts)
+ [Team Contracts Manager Contract](contracts/teams/TeamContracts.sol) (smart contract for team payments management)
+ [DreamTeam Old Test Token (TDTT)](contracts/token/TDTT.sol) (This version of the test token was used on the Ethereum test network until 5/7/2018)

## Smart Contract Audits

+ DreamTeam Token: [Coinfabrik](https://blog.coinfabrik.com/dreamteam-token-audit/)
+ TeamContracts, DreamTeam Test Token: [Coinfabrik](https://blog.coinfabrik.com/dreamteam-smart-contract-for-players-compensation/)
