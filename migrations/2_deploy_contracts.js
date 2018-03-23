const Storage = artifacts.require("DreamTeamStorage");
const Token = artifacts.require("TDTT");
const TeamContracts = artifacts.require("TeamContracts");

module.exports = async function(deployer, network, accounts) {
    const deployerAddress = accounts[0];
    const dreamTeamAddress = accounts[1];

    await deployer.deploy(Storage, [dreamTeamAddress, deployerAddress], {
        from: deployerAddress
    });

    await deployer.deploy(Token, 250000000000000000, "Test DreamTeam Token", "TDTT", {
        from: dreamTeamAddress
    });

    const storageContract = await deployer.deploy(TeamContracts, dreamTeamAddress, Token.address, Storage.address);

    await Storage.at(Storage.address).transferOwnership(TeamContracts.address, {
        from: deployerAddress
    });
};