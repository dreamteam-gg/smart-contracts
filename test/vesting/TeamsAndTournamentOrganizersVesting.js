const TeamsAndTournamentOrganizersVesting = artifacts.require("TeamsAndTournamentOrganizersVesting");
const Token = artifacts.require("DreamTeamToken");

contract("TeamsAndTournamentOrganizersVesting", (accounts) => {
    
    it("Got correct initial values via constructor", async function () {

        const withdrawAddress = accounts[3];
        const token = await Token.deployed();
        const vesting = await TeamsAndTournamentOrganizersVesting.deployed();

        assert.equal(
            (await vesting.dreamToken()).toString(),
            token.address
        );

        assert.equal(
            (await vesting.withdrawAddress()).toString(),
            withdrawAddress
        );

    });

});