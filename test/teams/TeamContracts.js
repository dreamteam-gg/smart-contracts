const Storage = artifacts.require("DreamTeamStorage");
const Token = artifacts.require("DreamTeamToken");
const TeamContracts = artifacts.require("TeamContracts"); // Main contract!

const tokenDecimals = 6;
const initialSupply = 2500000000 * Math.pow(10, tokenDecimals) - 1; // does not count fractions
const teamInitialTokenReward = 100;

// Account 0..9 roles
const deployer = 0;
const DreamTeam = 1;
const teamOwner1 = 2;
const teamOwner2 = 3;
const teamMember1 = 4;

const anonymous = 8;
const hacker = 9;

const pass = () => { };
const weeksToMinutes = (weeks) => weeks * 7 * 24 * 60;

const decodeEventsFromTx = require("../helpers/decodeEventsFromTx");

/**
 * Note that this method will only work on TestRPC or Truffle Develop networks.
 * @param {number} minutesToForward
 */
const forwardTime = require("../helpers/forwardTime").forwardTime;

const gasPrice = require("../helpers/getUsedGas").gasPrice;
const ethToUsdRate = require("../helpers/getUsedGas").ethToUsdRate;
const getUsedGas = require("../helpers/getUsedGas").getUsedGas;

contract("TeamContracts", (accounts) => {

    // state of the network data for testing, updated during the test execution
    let memberContractId = 0,
        storage,
        token,
        teamContracts,
        expectedBalanceToLockOnMember1,
        expectedTeams = [{
            id: 0, // to be set
            balance: 0,
            members: 0,
            member: []
        }, {
            id: 1, // to be set
            balance: 0,
            members: 0,
            member: []
        }];

    /**
     * Returns team information in human-friendly format. You can re-use this function whereever you like.
     * @param {number} teamId 
     */
    async function getTeamParsed (teamId) {
        const [
            memberAccounts, payoutDate, agreementMinutes, agreementValue, singleTermAgreement, balance, owner, ids
        ] = await teamContracts.getTeam.call(teamId, {
            from: accounts[DreamTeam]
        });
        const members = [];
        for (let i = 0; i < memberAccounts.length; ++i) {
            members.push({
                account: memberAccounts[i],
                payoutDate: +payoutDate[i],
                agreementMinutes: +agreementMinutes[i],
                agreementValue: +agreementValue[i],
                singleTermAgreement: singleTermAgreement[i],
                contractIds: ids[i]
            });
        }
        return {
            balance: +balance,
            owner,
            members
        };
    }

    async function createTeam (teamOwner) {

        const txReceipt = await teamContracts.createTeam(teamOwner, {
            from: accounts[DreamTeam]
        });

        return txReceipt;

    }

    function addMemberTestCaseFactory ({ team, agreementWeeks, weeklyRate, memberAccount, singleTermAgreement }) {
        return async function () {

            const weeks = agreementWeeks;
            expectedBalanceToLockOnMember1 = weeks * weeklyRate;

            assert.ok(expectedTeams[team].balance >= expectedBalanceToLockOnMember1, "Test structure fail: first team must have at least something to give to the first member");

            try {
                const tx = await teamContracts.addMember(
                    expectedTeams[team].id,
                    memberAccount,
                    weeksToMinutes(weeks),
                    expectedBalanceToLockOnMember1,
                    !!singleTermAgreement,
                    ++memberContractId,
                    { from: accounts[DreamTeam] }
                );
                console.log(`      ⓘ teamContracts.addMember: ${ getUsedGas(tx) }`);
            } catch (e) {
                assert.fail("DreamTeam cannot add new team member; " + e);
            }

            expectedTeams[team].balance -= expectedBalanceToLockOnMember1;
            expectedTeams[team].members += 1;

            const teamData = await getTeamParsed(expectedTeams[team].id);

            assert.equal(teamData.balance, expectedTeams[team].balance, "Balance should be updated (new amount must be locked)");
            assert.equal(teamData.members.length, expectedTeams[team].members, "Team now must have 1 member");
            assert.equal(teamData.members[expectedTeams[team].members - 1].account, memberAccount, "Team member must have expected address");
            expectedTeams[team].member[teamData.members.length - 1] = {
                contractId: memberContractId
            };

        }
    }

    before(async function () {
        console.log(
            `Estimations used for this test: ETH/USD=${ ethToUsdRate }, gasPrice=${ gasPrice / Math.pow(10, 9) } GWei`
        );
        storage = await Storage.deployed();
        token = await Token.deployed();
        teamContracts = await TeamContracts.deployed();
        console.log(`Deployed team contracts: ${ teamContracts.address }`);
    });

    describe("Token checkup", () => {

        it("Initial multi-mint in token", async function () {
            const balance = +(await token.balanceOf.call(accounts[DreamTeam], {
                from: accounts[DreamTeam]
            }));
            if (balance >= initialSupply)
                return assert.ok(true);
            await token.multiMint([accounts[DreamTeam]], [initialSupply - balance], {
                from: accounts[deployer]
            });
            assert.ok(true);
        });

        it("DreamTeam must own all the tokens", async function () {
            const balance = await token.balanceOf.call(accounts[DreamTeam], {
                from: accounts[DreamTeam]
            });
            assert.equal(+balance, initialSupply, "DreamTeam must own initialSupply tokens");
        });

    });

    describe("Initial deployment", () => {

        it("Contracts must be deployed correctly", () => {
            assert(storage && storage.address, "Storage must be deployed");
            assert(token && token.address, "Token must be deployed");
            assert(teamContracts && teamContracts.address, "TeamContracts must be deployed");
        });

    });

    describe("Teams creation", () => {

        it("Must not allow to create a team, as storage is not authorized", async function () {
            try {
                await teamContracts.createTeam(teamOwner1);
            } catch (e) {
                assert.equal(!!e, true);
                return;
            }
            assert.fail("Storage is not authorized but team creation is possible");
        });

    });

    describe("DB authorization", () => {

        // todo: more unauthorized tests here

        it("Must allow database owner to transfer ownership", () => {
            return storage.isOwner(teamContracts.address).then((isOwner) => {
                assert.equal(isOwner, true, "Deployed contract must be an owner");
                return storage.isOwner(accounts[deployer]);
            }).then((isOwner) => {
                assert.equal(isOwner, false, "Some guy must not be an owner");
            });
        });

    });

    describe("Team Creation", () => {

        it("Must not allow anyone to create teams", async function () {

            let caught = false;
            try {
                await teamContracts.createTeam(accounts[hacker], {
                    from: accounts[hacker]
                });
            } catch (e) {
                caught = true;
            } finally {
                assert.equal(caught, true, "Must not allow anyone to create teams (by design)");
            }

        });

        it("Must allow DreamTeam to create teams", async function () {

            const tx = await createTeam(accounts[teamOwner1]);
            console.log(`      ⓘ teamContracts.createTeam: ${ getUsedGas(tx) }`);
            expectedTeams[0].id = +decodeEventsFromTx(tx).TeamCreated.teamId;
            assert.equal(+(await teamContracts.getNumberOfTeams.call()), expectedTeams[0].id + 1, "Must have one new team added");
            const teamData = await getTeamParsed(expectedTeams[0].id);
            assert.equal(teamData.owner, accounts[teamOwner1], "Team must have team owner properly set");
            assert.equal(teamData.balance, expectedTeams[0].balance = 0, "Team must not have any initial balance");
            assert.equal(teamData.members.length, expectedTeams[0].members = 0, "Must not have any team members initially");

        });

        it("Must allow DreamTeam to create second team", async function () {

            const tx = await createTeam(accounts[teamOwner2]);
            console.log(`      ⓘ teamContracts.createTeam (2nd): ${ getUsedGas(tx) }`);
            expectedTeams[1].id = +decodeEventsFromTx(tx).TeamCreated.teamId;
            assert.equal(+(await teamContracts.getNumberOfTeams.call()), expectedTeams[1].id + 1, "Must have one new team added");
            assert.equal(expectedTeams[0].id + 1, expectedTeams[1].id, "Team IDs must be sequential");
            const teamData = await getTeamParsed(expectedTeams[1].id);
            assert.equal(teamData.owner, accounts[teamOwner2], "Team must have team owner properly set");
            assert.equal(teamData.balance, expectedTeams[1].balance = 0, "Team must not have any initial balance");
            assert.equal(teamData.members.length, expectedTeams[1].members = 0, "Must not have any team members initially");

        });

    });

    describe("Team balance refill", () => {

        const factoryRefillBalance = (fromAccount, amount) => async function () {

            if (fromAccount !== accounts[DreamTeam]) { // first, give to fromAccount some tokens
                await token.transfer(fromAccount, amount, {
                    from: accounts[DreamTeam]
                });
            }

            if (fromAccount !== accounts[DreamTeam]) { // PRE-APPROVAL must be performed for DreamTeam account 
                try { // Phase 1: allow smart contract to withdrawal teamInitialTokenReward tokens from DreamTeam account
                    const tx = await token.approve(teamContracts.address, amount, {
                        from: fromAccount
                    });
                    console.log(`      ⓘ token.approve: ${ getUsedGas(tx) }`);
                } catch (e) {
                    assert.fail("Cannot approve in ERC20 token; " + e);
                }
            }

            try { // Phase 2: tell the team ID and amount to transfer to that team
                const tx = await teamContracts.transferToTeam(expectedTeams[0].id, amount, {
                    from: fromAccount
                });
                console.log(`      ⓘ teamContracts.transferToTeam: ${ getUsedGas(tx) }`);
            } catch (e) {
                assert.fail("Cannot do transferToTeam; " + e);
            }

            expectedTeams[0].balance += amount;
            assert.equal(
                (await getTeamParsed(expectedTeams[0].id)).balance,
                expectedTeams[0].balance,
                "Team balance must be properly updated"
            );

        };

        it(
            "Must allow DreamTeam to refill team balance",
            factoryRefillBalance(accounts[DreamTeam], teamInitialTokenReward)
        );
        it(
            "Must allow team owner to refill team balance of their team",
            factoryRefillBalance(accounts[teamOwner1], 50)
        );
        it(
            "Must allow anyone to refill team balance of the team",
            factoryRefillBalance(accounts[anonymous], 50)
        );

    });

    describe("Team member adding", () => {

        it("Must not allow anyone to add team members", async function () {

            try {
                await teamContracts.addMember(expectedTeams[0].id, accounts[hacker], weeksToMinutes(2), 50, false, {
                    from: accounts[hacker]
                });
            } catch (e) {
                return assert.ok(true);
            }

            assert.fail("Must not allow anyone to add team members (by design)");

        });

        it("Must allow DreamTeam to add team member", addMemberTestCaseFactory({
            team: 0,
            agreementWeeks: 2,
            weeklyRate: 50,
            memberAccount: accounts[teamMember1],
            singleTermAgreement: false
        }));

    });

    describe("Team member removal", () => {

        it("Must not allow anyone to remove team members", async function () {
            try {
                await teamContracts.removeMember(expectedTeams[0].id, expectedTeams[0].members, {
                    from: accounts[hacker]
                });
            } catch (e) {
                assert.ok(true, "Must not allow anyone to remove team members");
                return;
            }
            assert.fail("Anyone can remove team members");
        });

        it("Must allow DreamTeam to remove team members", async function () {
            const tx = await teamContracts.removeMember(
                expectedTeams[0].id,
                expectedTeams[0].member[expectedTeams[0].members - 1].contractId,
                {
                    from: accounts[DreamTeam]
                }
            );
            console.log(`      ⓘ teamContracts.removeMember: ${ getUsedGas(tx) }`);
            const teamData = await getTeamParsed(expectedTeams[0].id);
            expectedTeams[0].balance += expectedBalanceToLockOnMember1; // First team receives a full refund
            expectedTeams[0].members -= 1;
            expectedTeams[0].member.pop();
            assert.equal(teamData.members.length, 0, "Must not have any members");
            assert.equal(
                teamData.balance,
                expectedTeams[0].balance,
                "Balance must be refunded to a team as team member didn't spend even a single day in a team"
            );
        });

    });

    describe("Empty payout", () => {

        it("Must allow payout for anyone", async function () {
            const tx = await teamContracts.batchPayout([expectedTeams[0].id], {
                from: accounts[anonymous]
            });
            console.log(`      ⓘ teamContracts.batchPayout (idle): ${ getUsedGas(tx) }`);
            const teamData = await getTeamParsed(expectedTeams[0].id);
            assert.equal(
                teamData.balance,
                expectedTeams[0].balance,
                "Payout must not yet change a team balance, as no one is paid out yet"
            );
        });

    });

    // For team member 1
    const agreementWeeks = 2;
    const weeklyRate = 50;

    describe("Team member receives their reward", () => {

        it("DreamTeam adds back first team member", addMemberTestCaseFactory({
            team: 0,
            agreementWeeks: agreementWeeks,
            weeklyRate: weeklyRate,
            memberAccount: accounts[teamMember1],
            singleTermAgreement: false
        }));

        it("Nothing to payout when the team member just added", async function () {
            await teamContracts.payout(expectedTeams[0].id, {
                from: accounts[anonymous]
            });
            const teamData = await getTeamParsed(expectedTeams[0].id);
            assert.equal(teamData.balance, expectedTeams[0].balance, "Team balance must not change");
            assert.equal(await token.balanceOf.call(accounts[teamMember1]), 0, "Team member balance is still empty");
        });

        it(`Time forward, +${ agreementWeeks } weeks`, async function () {
            await forwardTime(agreementWeeks * 7 * 24 * 60 * 60);
            assert.ok(true);
        });

        it("Must payout and extend a contract", async function () {
            assert.equal(expectedTeams[0].balance === agreementWeeks * weeklyRate, true, "Must have correct amount to extend the contract with team member");
            const tx = await teamContracts.payout(expectedTeams[0].id, {
                from: accounts[anonymous]
            });
            console.log(`      ⓘ teamContracts.payout: ${ getUsedGas(tx) }`);
            expectedTeams[0].balance -= agreementWeeks * weeklyRate;
            const teamData = await getTeamParsed(expectedTeams[0].id);
            assert.equal(+(await token.balanceOf.call(accounts[teamMember1])), agreementWeeks * weeklyRate, "Team member must receive their reward");
            assert.equal(teamData.balance, expectedTeams[0].balance, "Team balance must lock the next amount");
        });

        it("Must not payout twice", async function () {
            const tx = await teamContracts.payout(expectedTeams[0].id, {
                from: accounts[anonymous]
            });
            console.log(`      ⓘ teamContracts.payout (idle): ${ getUsedGas(tx) }`);
            const teamData = await getTeamParsed(expectedTeams[0].id);
            assert.equal(+(await token.balanceOf.call(accounts[teamMember1])), agreementWeeks * weeklyRate, "Team member balance must not change");
            assert.equal(teamData.balance, expectedTeams[0].balance, "Team balance must not change");
        });

    });

    describe("Contract upgrade", () => {

        let newTeamContracts,
            oldTeamContracts,
            oldContractBalance;

        it("Must deploy new contract", async function () {
            oldTeamContracts = teamContracts;
            newTeamContracts = await TeamContracts.new(accounts[DreamTeam], token.address, storage.address, { from: accounts[DreamTeam] });
            oldContractBalance = +await token.balanceOf.call(teamContracts.address);
            assert.notEqual(oldContractBalance, 0, "Balance on an old contract must be positive (testing consistency corrupted)");
        });

        it("Must not allow anyone to upgrade a contract", async function () {
            try {
                await teamContracts.upgrade(newTeamContracts.address, {
                    from: accounts[anonymous]
                });
            } catch (e) {
                return assert.ok(true);
            }
            assert.fail("Anyone can deploy a new TeamContracts smart contract!");
        });

        it("Must allow DreamTeam to upgrade a contract", async function () {
            const tx = await teamContracts.upgrade(newTeamContracts.address, {
                from: accounts[DreamTeam]
            });
            console.log(`      ⓘ teamContracts.upgrade: ${ getUsedGas(tx) }`);
            let newBalance = +await token.balanceOf.call(newTeamContracts.address);
            assert.equal(newBalance, oldContractBalance, "Tokens must be transferred to a new contract");
            teamContracts = newTeamContracts; // Swap the references
            const teamData = await getTeamParsed(expectedTeams[0].id);
            assert.equal(+(await token.balanceOf.call(accounts[teamMember1])), agreementWeeks * weeklyRate, "Team member balance must not change");
            assert.equal(teamData.balance, expectedTeams[0].balance, "Team balance must not change");
        });

        it(`Time forward, +${ agreementWeeks } weeks`, async function () {
            await forwardTime(agreementWeeks * 7 * 24 * 60 * 60);
            assert.ok(true);
        });

        it("Previous contract must be disabled", async function () {
            try {
                const tx = await oldTeamContracts.payout(expectedTeams[0].id, {
                    from: accounts[anonymous]
                }); // This function must be idle
            } catch (e) {
                return assert.ok(true); // Doesn't happen yet. Most likely, in the future, txs on destroyed contracts will cause an error to happen
            }
        });

    });

    describe("Payout after contract upgrade should happen as expected", () => {

        it("Must payout and terminate a contract", async function () {
            assert.equal((await getTeamParsed(expectedTeams[0].id)).balance, expectedTeams[0].balance);
            assert.equal(expectedTeams[0].balance, 0, "Must not have a balance to extend the payout");
            const tx = await teamContracts.payout(expectedTeams[0].id, {
                from: accounts[anonymous]
            });
            console.log(`      ⓘ teamContracts.payout: ${ getUsedGas(tx) }`);
            const teamData = await getTeamParsed(expectedTeams[0].id);
            assert.equal(+(await token.balanceOf.call(accounts[teamMember1])), 2 * agreementWeeks * weeklyRate, "Team member must receive their reward");
            assert.equal(teamData.balance, expectedTeams[0].balance, "Team balance must be 0");
            assert.equal(teamData.members.length, 0, "Team member must be removed from the team as balance is over");
        });

    });

});