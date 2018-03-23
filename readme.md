# DreamTeam Smart Contracts

**Notes for Contract Reviewers**

Hello! Thanks for taking a moment to review our code.

We're developing a smart contract(s) which will manage contracts (agreements) between teams (team owners)
and players (team members), with adding more and more functionality to team owners/members in the future.

The whole dApp keeps track only of those parts of DreamTeam which are somehow related to crypto assets.
This includes team creation (team owner assignment), adding or removing team members and paying to them.

We will have an authorized address (DreamTeam address) to manage teams (create new teams, add/remove
team members with appropriate rules). The crucial thing is guaranteed payouts to team members. Once
a team contract (meaning the contract between the team owner and a player) is established (when
DreamTeam account will actually trigger an `addMember` function of a smart contract), the player is
**guaranteed** to receive their tokens due to a publicly available function `payout` in TeamContracts
smart contract.

Normally, in the future, DreamTeam is going to trigger payouts once a day, massively for all the teams
which need to be paid out, for a little fee in tokens. If DreamTeam for some unknown reason does not
trigger payouts, team members theirselves can trigger one, by using any services publicly available like 
Etherscan or so.

## Contracts for review:

Logic (entry point)

+ contracts\teams\TeamContracts.sol (upgradeable/replaceable smart contract which communicates with storage)

Storage (eternal ownable storage)

+ contracts\storage\BasicStorage.sol (basic functions for DreamTeamStorage.sol)
+ contracts\storage\DreamTeamStorage.sol (deployable contract)
+ contracts\storage\StorageInterface.sol (interface used in TeamsStorageController.sol)
+ contracts\storage\TeamsStorageController.sol (storage utilities)

Notes/questions:

+ Check test\teams\TeamContracts.js for complete flows of smart contracts deployment, interaction with
  them and other useful stuff to understand how this works.
+ To avoid losing permission to storage in case of deployment mistake, we'll grant access to the storage
  to our own account (in addition to TeamContracts smart contract address) and will securely store the key
  from this account.
+ We'll always deploy new contracts ensuring that they call selfdestruct() after upgrading, and ols smart
  contracts lose their permissions to write to the storage.
+ What would be your recommendation in case of more and more functionality added to the contracts? For 
  now, all tokens are stored on the TeamContracts smart contract address and are transferred to a new
  TeamContracts in case of contract upgrading, which does not break the consistency. But, deployment of
  TeamContracts is close the block gas limit, and we'll need to split its functionality at some point of
  time to many smart contracts. The question is, which smart contract should hold the tokens? Options:
  + Leave tokens on the account of TeamContracts smart contract, and additionally implement functions to
    make transfers for authorized smart contracts, which will be deployed in the future;
  + Hold tokens on the DreamTeamStorage smart contract account and additionally implement functions for 
    storage owners to make transfers. This strategy seems to have a caveat that storage is deployed once
    and transfers logic will be hard-coded and will not be replaceable.
  + In future, make a dedicated smart contract which will manage tokens on its address and allow token
    transfers only from authorized smart contracts.
+ We'll keep track of the most actual smart contract address(es) to interact with off-chain on our servers,
  which does not influence neither user experience nor ability to upgrade smart contracts. We'll always
  provide the most recent deployed contract address to users in case they want to trigger payments 
  theirselves. We'll implement a registry to keep track of actual smart contract addresses in the future
  if there will be a need to do so.

For any further questions contact me, the developer of smart contracts directly, at 
[nikita.tk](https://nikita.tk) or n.savchenko@dreamteam.gg.