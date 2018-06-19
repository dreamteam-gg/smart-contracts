const Token = artifacts.require("DreamTeamToken");
const Web3 = require("web3"); // Latest web3 version
web3m = new Web3(web3.currentProvider);
const sigUtils = require("eth-sig-util");
const Buffer = require("safe-buffer").Buffer;

/**
 * Generate random token sale distribution table.
 * @param {number} tokenDecimals 
 */
function getTokenSaleDistributionTable (tokenDecimals = 18) {
    const approximateTokens = 40000000 /* USD */ / 300 /* ETH/USD */ * 1800 /* Tokens per 1 ETH */; // +- 100%
    const numberOfParticipants = 20; //Math.round(1000 + Math.random() * 400);
    const tokensPerParticipant = approximateTokens / numberOfParticipants;
    return Array.from({ length: numberOfParticipants }, () => {
        const newAccount = web3m.eth.accounts.create();
        const tokens = Math.max(Math.random() * tokensPerParticipant * 2, 1);
        const round = Math.random() > 0.5;
        return {
            address: newAccount.address,
            value: Math.round((round ? Math.round(tokens) : tokens) * 10 ** tokenDecimals),
            privateKey: newAccount.privateKey
        };
    }).sort((a, b) => b.value - a.value);
}

const gasPrice = require("../helpers/getUsedGas").gasPrice;
const ethToUsdRate = require("../helpers/getUsedGas").ethToUsdRate;
const getUsedGas = require("../helpers/getUsedGas").getUsedGas;
const blockGasLimit = 4600000 - 600000; // Give 600000 spare gas per block
const expectedTotalSupply = 250000000;
const infoLog = (text) => console.log(`      ⓘ ${ text }`);

contract("DTT", (accounts) => {

    const SIG_STANDARD_TYPED = 0;
    const SIG_STANDARD_PERSONAL = 1;
    const SIG_STANDARD_HEX_STRING = 2;
    const tokenDeployerAccount = accounts[0];
    const dreamTeamAccount = accounts[1];
    const account1 = accounts[2];
    const account2 = accounts[3];
    const strangerAccount = accounts[9];
    let token,
        decimals,
        distTable,
        totalSupply = 0,
        sigId = 0;

    before(async function () {
        token = await Token.deployed();
        infoLog(`Deployed DTT address: ${ token.address }`);
        infoLog(
            `Estimations used for this test: ETH/USD=${ ethToUsdRate }, gasPrice=${ gasPrice / Math.pow(10, 9) } GWei`
        );
    });

    describe("Token initial checkup", () => {

        it("Total supply must be 0", async function () {
            const balance = await token.totalSupply.call();
            assert.equal(balance, 0);
        });

        it("Token must be deployed from tokenDeployerAccount address", async function () {
            const address = await token.tokenDistributor.call();
            assert.equal(address, tokenDeployerAccount);
        });

        it("DreamTeam address must not have any tokens", async function () {
            const balance = await token.balanceOf.call(dreamTeamAccount);
            assert.equal(balance, 0);
        });

        it(`Token decimals JavaScript safety check`, async function () {
            decimals = +(await token.decimals.call());
            infoLog(`Token decimals: ${ decimals }`);
            const ts = expectedTotalSupply;
            assert.notEqual(ts * 10 ** decimals, ts * 10 ** decimals + 1, "Number.MAX_SAFE_INTEGER");
            assert.notEqual(ts * 10 ** decimals, ts * 10 ** decimals - 1, "Number.MAX_SAFE_INTEGER");
        });

    });

    describe("Token sale", () => {

        let approxGasPerOneAddress = blockGasLimit,
            tempGas = 0;

        it(`Must correctly prepare token sale participants`, async function () {
            distTable = getTokenSaleDistributionTable(decimals);
            assert.equal(distTable.length > 0, true);
            assert.equal(Math.min.apply(distTable.map(({ value }) => value)) >= 10 ** decimals, true);
            infoLog(`${ distTable.length } token sale participants are ready`);
            const toDisplay = 4;
            for (let i = 0; i < Math.min(toDisplay, distTable.length); ++i) {
                infoLog(`[#${ i }] ${ distTable[i].value } DTT -> ${ distTable[i].address }`);
            }
            infoLog(`[..] ... (${ distTable.length - Math.min(toDisplay, distTable.length) } more)`);
        });

        it("Must not allow anyone to mint tokens", async function () {
            try {
                await token.multiMint([strangerAccount], [2 * 10 ** decimals], {
                    from: strangerAccount
                });
            } catch (e) {
                return assert.ok(true);
            }
            assert.fail("Anonymous account can mint tokens");
        });

        it("Must only allow tokenDeployerAccount to mint tokens", async function () {
            const toMint = 20000;
            const tx = await token.multiMint([strangerAccount], [toMint * 10 ** decimals], {
                from: tokenDeployerAccount
            });
            totalSupply += toMint * 10 ** decimals;
            const tokens = await token.balanceOf.call(strangerAccount);
            assert.equal(+tokens, toMint * 10 ** decimals, `Target account must have ${ toMint } tokens`);
            assert.equal(await token.totalSupply.call(), totalSupply, "Must increase total supply");
            tempGas = tx.receipt.gasUsed;
            infoLog(`TX (multiMint for 1 account) gas usage: ${ getUsedGas(tx) }`);
        });

        it("Must allow tokenDeployerAccount to mint tokens for 7 accounts", async function () {
            const accCount = 7;
            const todo = accounts.slice(2, 2 + accCount).map(address => ({
                address,
                tokens: (10000 + Math.round(Math.random() * 1000)) * 10 ** decimals
            }));
            const tx = await token.multiMint(todo.map(x => x.address), todo.map(x => x.tokens), {
                from: tokenDeployerAccount
            });
            totalSupply += todo.map(x => x.tokens).reduce((a, b) => a + b);
            const balances = (await Promise.all(todo.map(x => token.balanceOf.call(x.address)))).map(x => +x);
            todo.forEach(({ address, tokens }, i) => {
                assert.equal(balances[i], tokens, `Account ${ address } must have ${ tokens } tokens`);
            });
            assert.equal(await token.totalSupply.call(), totalSupply, "Must increase total supply");
            approxGasPerOneAddress = (tx.receipt.gasUsed - tempGas) / (accCount - 1);
            infoLog(`TX (multiMint) gas usage: ${ getUsedGas(tx) }`);
        });

        it("Must process the token distribution event", async function () {
            const mintsPerTransaction = Math.floor((blockGasLimit - tempGas) / approxGasPerOneAddress);
            infoLog(`One transaction is capable of minting tokens for ${ mintsPerTransaction } addresses`);
            const groups = [];
            let totalGas = 0;
            while (distTable.length > mintsPerTransaction)
                groups.push(distTable.splice(0, mintsPerTransaction));
            if (distTable.length > 0)
                groups.push(distTable);
            infoLog(`${ groups.length } groups are ready from the total of ${
                groups.map(g => g.length).reduce((a, b) => a + b)
                } accounts`);
            for (let i = 0; i < groups.length; ++i) {
                const table = groups[i];
                infoLog(`Processing a group ${ i + 1 }/${ groups.length } of ${ table.length } accounts`);
                const tx = await token.multiMint(table.map(x => x.address), table.map(x => x.value), {
                    from: tokenDeployerAccount
                });
                totalGas += tx.receipt.gasUsed;
                infoLog(`TX gas usage: ${ getUsedGas(tx) }`);
                const values = (await Promise.all(table.map(x => token.balanceOf.call(x.address)))).map(x => +x);
                table.forEach(({ value }, i) => {
                    totalSupply += value;
                    assert.equal(values[i], value, `Declared tokens must match given tokens`);
                });
            }
            const supply = +(await token.totalSupply.call());
            assert.equal(supply, totalSupply, `Total supply must still match`);
            infoLog(`Total gas used: ${ getUsedGas({ receipt: { gasUsed: totalGas } }) }`);
            infoLog(`Total supply: ${ supply }`);
        });

        it("Must not allow others to close token distribution event", async function () {
            try {
                await token.lastMint({
                    from: strangerAccount
                });
            } catch (e) {
                return assert.ok(true);
            }
            assert.fail("Anonymous account can close token distribution");
        });

        it("Must allow tokenDeployerAccount to close token distribution event", async function () {
            const tx = await token.lastMint({
                from: tokenDeployerAccount
            });
            infoLog(`TX (lastMint) gas usage: ${ getUsedGas(tx) }`);
            const expectedDeployerBalance = Math.floor(totalSupply * 40 / 60)
                - ((Math.floor(totalSupply * 40 / 60) + totalSupply) % Math.pow(10, decimals));
            assert.equal(
                +(await token.balanceOf.call(tokenDeployerAccount)),
                expectedDeployerBalance,
                `Unexpected DreamTeam balance`
            );
            infoLog(`tokenDeployerAccount gets remaining 40% tokens, ${ expectedDeployerBalance } DTT`);
            totalSupply += expectedDeployerBalance;
            assert.equal(+(await token.totalSupply.call()), totalSupply, `Unexpected totalSupply`);
            infoLog(`DTT total supply is ${ totalSupply }`);
            token.transfer(dreamTeamAccount, Math.floor(expectedDeployerBalance / 2), {
                from: tokenDeployerAccount
            });
        });

        it("Must not allow tokenDeployerAccount to issue tokens anymore", async function () {
            try {
                const tx = await token.multiMint([strangerAccount], [toMint * 10 ** decimals], {
                    from: tokenDeployerAccount
                });
            } catch (e) {
                return assert.ok(true);
            }
            assert.fail("tokenDeployerAccount can still mint tokens");
        });

        it("Must not allow anyone to issue tokens anyway", async function () {
            try {
                const tx = await token.multiMint([strangerAccount], [toMint * 10 ** decimals], {
                    from: strangerAccount
                });
            } catch (e) {
                return assert.ok(true);
            }
            assert.fail("Anyone can mint tokens!");
        });

    });

    describe("Simple token transfers", () => {

        it("Token transfer case 1", async function () {
            const value = 10 * 10 ** decimals;
            const from = dreamTeamAccount;
            const to = account1;
            const balanceFrom = +(await token.balanceOf(from));
            const balanceTo = +(await token.balanceOf(to));
            const tx = await token.transfer(to, value, { from });
            infoLog(`TX (transfer) gas usage: ${ getUsedGas(tx) }`);
            assert.equal(+(await token.balanceOf(from)), balanceFrom - value, "Must subtract balance");
            assert.equal(+(await token.balanceOf(to)), balanceTo + value, "Must add balance");
        });

        it("Token transfer case 2", async function () {
            const value = 10 * 10 ** decimals;
            const from = account1;
            const to = account1;
            const balance = +(await token.balanceOf(from));
            const tx = await token.transfer(to, value, { from });
            infoLog(`TX (transfer to self) gas usage: ${ getUsedGas(tx) }`);
            assert.equal(+(await token.balanceOf(from)), balance, "Balance must not change");
        });

        it("Token transfer case 3", async function () {
            try {
                const tx = await token.transfer(dreamTeamAccount, totalSupply * 10 ** decimals, {
                    from: account1
                });
            } catch (e) {
                return assert.ok(true);
            }
            assert.fail("Anyone can transfer tokens over their balance!");
        });

    });

    describe("Token approve and transferFrom", () => {

        it("Token transfer case 1, single transfer", async function () {

            const value = 10 * 10 ** decimals;
            const from = dreamTeamAccount;
            const to = account1;
            const balanceFrom = +(await token.balanceOf(from));
            const balanceTo = +(await token.balanceOf(to));
            let caught = false;

            try {
                const tx = await token.transferFrom(from, to, value, {
                    from: to
                });
            } catch (e) {
                caught = true;
            }
            if (!caught)
                return assert.fail(`Must not allow to transfer tokens from account without approval`);

            const tx = await token.approve(to, value, { from });
            infoLog(`TX (approve) gas usage: ${ getUsedGas(tx) }`);

            caught = false;
            try {
                const tx = await token.transferFrom(from, to, value * 2, {
                    from: to
                });
            } catch (e) {
                caught = true;
            }
            if (!caught)
                return assert.fail(`Must not allow to transfer more tokens than it was approved`);

            const tx2 = await token.transferFrom(from, to, value, {
                from: to
            });
            infoLog(`TX (transferFrom) gas usage: ${ getUsedGas(tx2) }`);

            assert.equal(+(await token.balanceOf(from)), balanceFrom - value, "Must subtract balance");
            assert.equal(+(await token.balanceOf(to)), balanceTo + value, "Must add balance");

        });

        it("Token transfer case 2, multiple transfers", async function () {

            const value = 10 * 10 ** decimals;
            const from = dreamTeamAccount;
            const to = account1;
            const balanceFrom = +(await token.balanceOf(from));
            const balanceTo = +(await token.balanceOf(to));
            let caught = false;

            const tx = await token.approve(to, value, { from });
            infoLog(`TX (approve) gas usage: ${ getUsedGas(tx) }`);

            try {
                const tx = await token.transferFrom(from, to, value * 2, {
                    from: strangerAccount
                });
            } catch (e) {
                caught = true;
            }
            if (!caught)
                return assert.fail(`Must not allow someone to transfer tokens approved by others`);

            const tx2 = await token.transferFrom(from, to, value / 2, {
                from: to
            });
            infoLog(`TX (transferFrom) gas usage: ${ getUsedGas(tx2) }`);
            const tx3 = await token.transferFrom(from, to, value / 2, {
                from: to
            });
            infoLog(`TX (transferFrom) gas usage: ${ getUsedGas(tx3) }`);

            assert.equal(+(await token.balanceOf(from)), balanceFrom - value, "Must subtract balance");
            assert.equal(+(await token.balanceOf(to)), balanceTo + value, "Must add balance");

        });

    });

    describe("Pre-signed token transfer", () => {

        let value, from, to, delegate, fee, deadline, signature, usedSigId, newAccount;

        function getTypedDataToSign () {
            return [{
                type: 'address',
                name: 'Token Contract Address',
                value: token.address
            }, {   
                type: 'address',
                name: 'Sender\'s Address',
                value: from
            }, {   
                type: 'address',
                name: 'Recipient\'s Address',
                value: to
            }, {   
                type: 'uint256',
                name: 'Amount to Transfer (last six digits are decimals)',
                value: value
            }, {   
                type: 'uint256',
                name: 'Fee in Tokens Paid to Executor (last six digits are decimals)',
                value: fee
            }, {
                type: 'address',
                name: 'Account which will Receive Fee',
                value: delegate
            }, {
                type: 'uint256',
                name: 'Signature Expiration Timestamp (unix timestamp)',
                value: deadline
            }, {   
                type: 'uint256',
                name: 'Signature ID',
                value: usedSigId
            }];
        }

        it("Does not accept signature with expired deadline", async function () {

            value = 10 * 10 ** decimals;
            from = account1;
            to = web3m.eth.accounts.create().address; // strangerAccount;
            delegate = dreamTeamAccount;
            fee = 1 * 10 ** decimals;
            deadline = (await web3m.eth.getBlock(`latest`)).timestamp - 60 * 60; // 1 hour ago
            const dataToSign = web3m.utils.soliditySha3(token.address, from, to, value, fee, delegate, deadline, usedSigId = sigId++);
            signature = await web3m.eth.sign(dataToSign, from);
            try {
                await token.transferViaSignature(
                    from, to, value, fee, delegate, deadline, usedSigId, signature, SIG_STANDARD_PERSONAL, { from: delegate }
                );
            } catch (e) {
                return assert.ok(true);
            }
            assert.fail("Must catch exception");

        });

        it("Allows pre-signed transfer using personal sign standard", async function () {

            // Takes data from previous test
            deadline = (await web3m.eth.getBlock(`latest`)).timestamp + 60 * 60 * 24 * 7; // +7 days
            const dataToSign = web3m.utils.soliditySha3(token.address, from, to, value, fee, delegate, deadline, usedSigId = sigId++);
            const balanceFrom = +(await token.balanceOf.call(from));
            const balanceTo = +(await token.balanceOf.call(to));
            const balanceDelegate = +(await token.balanceOf.call(delegate));
            signature = await web3m.eth.sign(dataToSign, from);
            const tx = await token.transferViaSignature(
                from, to, value, fee, delegate, deadline, usedSigId, signature, SIG_STANDARD_PERSONAL, { from: delegate }
            );
            infoLog(`TX (transferViaSignature) gas usage: ${ getUsedGas(tx) }`);
            assert.equal(+(await token.balanceOf(from)), balanceFrom - value - fee, "Must subtract balance");
            assert.equal(+(await token.balanceOf(to)), balanceTo + value, "Must add balance to recipient");
            assert.equal(+(await token.balanceOf(delegate)), balanceDelegate + fee, "Must pay fee to delegate");

        });

        it("Allows pre-signed transfer using personal sign standard (one more time)", async function () {

            // Takes data from previous test
            // deadline = (await web3m.eth.getBlock(`latest`)).timestamp + 60 * 60 * 24 * 7; // +7 days
            const dataToSign = web3m.utils.soliditySha3(token.address, from, to, value, fee, delegate, deadline, usedSigId = sigId++);
            const balanceFrom = +(await token.balanceOf.call(from));
            const balanceTo = +(await token.balanceOf.call(to));
            const balanceDelegate = +(await token.balanceOf.call(delegate));
            signature = await web3m.eth.sign(dataToSign, from);
            const tx = await token.transferViaSignature(
                from, to, value, fee, delegate, deadline, usedSigId, signature, SIG_STANDARD_PERSONAL, { from: delegate }
            );
            infoLog(`TX (transferViaSignature) gas usage: ${ getUsedGas(tx) }`);
            assert.equal(+(await token.balanceOf(from)), balanceFrom - value - fee, "Must subtract balance");
            assert.equal(+(await token.balanceOf(to)), balanceTo + value, "Must add balance to recipient");
            assert.equal(+(await token.balanceOf(delegate)), balanceDelegate + fee, "Must pay fee to delegate");

        });

        it("Does not allow to re-use signature", async function () {

            try {
                await token.transferViaSignature(
                    from, to, value, fee, delegate, deadline, usedSigId, signature, SIG_STANDARD_PERSONAL, { from: delegate }
                );
            } catch (e) {
                return assert.ok(true);
            }
            assert.fail(`Allows signature to be re-used (replay attack)`);

        });

        it("Allows pre-signed transfer with zero fee", async function () {

            deadline = (await web3m.eth.getBlock(`latest`)).timestamp + 60 * 60 * 24 * 7; // +7 days
            const fee = 0;
            const dataToSign = web3m.utils.soliditySha3(token.address, from, to, value, fee, delegate, deadline, usedSigId = sigId++);
            const balanceFrom = +(await token.balanceOf.call(from));
            const balanceTo = +(await token.balanceOf.call(to));
            const balanceDelegate = +(await token.balanceOf.call(delegate));
            signature = await web3m.eth.sign(dataToSign, from);
            const tx = await token.transferViaSignature(
                from, to, value, fee, delegate, deadline, usedSigId, signature, SIG_STANDARD_PERSONAL, { from: delegate }
            );
            infoLog(`TX (transferViaSignature) with no fee gas usage: ${ getUsedGas(tx) }`);
            assert.equal(+(await token.balanceOf(from)), balanceFrom - value - fee, "Must subtract balance");
            assert.equal(+(await token.balanceOf(to)), balanceTo + value, "Must add balance to recipient");
            assert.equal(+(await token.balanceOf(delegate)), balanceDelegate + fee, "Must pay fee to delegate");

        });

        it("Allows pre-signed transfer using personal hex string sign standard", async function () {

            value = 4 * 10 ** decimals;
            from = account1;
            to = web3m.eth.accounts.create().address;
            delegate = dreamTeamAccount;
            fee = 2 * 10 ** decimals - 1;
            deadline = (await web3m.eth.getBlock(`latest`)).timestamp + 60 * 60 * 24 * 7; // +7 days
            const dataToSign = web3m.utils.soliditySha3(token.address, from, to, value, fee, delegate, deadline, usedSigId = sigId++);
            const balanceFrom = +(await token.balanceOf.call(from));
            const balanceTo = +(await token.balanceOf.call(to));
            const balanceDelegate = +(await token.balanceOf.call(delegate));
            signature = await web3m.eth.sign(dataToSign.slice(2), from);
            const tx = await token.transferViaSignature(
                from, to, value, fee, delegate, deadline, usedSigId, signature, SIG_STANDARD_HEX_STRING, { from: delegate }
            );
            infoLog(`TX (transferViaSignature) gas usage: ${ getUsedGas(tx) }`);
            assert.equal(+(await token.balanceOf(from)), balanceFrom - value - fee, "Must subtract balance");
            assert.equal(+(await token.balanceOf(to)), balanceTo + value, "Must add balance to recipient");
            assert.equal(+(await token.balanceOf(delegate)), balanceDelegate + fee, "Must pay fee to delegate");

        });

        it("Allows pre-signed transfer using personal hex string sign standard (one more time)", async function () {

            // value = 4 * 10 ** decimals;
            // from = account1;
            // to = web3m.eth.accounts.create().address;
            // delegate = dreamTeamAccount;
            // fee = 2 * 10 ** decimals - 1;
            // deadline = (await web3m.eth.getBlock(`latest`)).timestamp + 60 * 60 * 24 * 7; // +7 days
            const dataToSign = web3m.utils.soliditySha3(token.address, from, to, value, fee, delegate, deadline, usedSigId = sigId++);
            const balanceFrom = +(await token.balanceOf.call(from));
            const balanceTo = +(await token.balanceOf.call(to));
            const balanceDelegate = +(await token.balanceOf.call(delegate));
            signature = await web3m.eth.sign(dataToSign.slice(2), from);
            const tx = await token.transferViaSignature(
                from, to, value, fee, delegate, deadline, usedSigId, signature, SIG_STANDARD_HEX_STRING, { from: delegate }
            );
            infoLog(`TX (transferViaSignature) gas usage: ${ getUsedGas(tx) }`);
            assert.equal(+(await token.balanceOf(from)), balanceFrom - value - fee, "Must subtract balance");
            assert.equal(+(await token.balanceOf(to)), balanceTo + value, "Must add balance to recipient");
            assert.equal(+(await token.balanceOf(delegate)), balanceDelegate + fee, "Must pay fee to delegate");

        });

        it("Does not allow to re-use signature", async function () {

            try {
                await token.transferViaSignature(
                    from, to, value, fee, delegate, deadline, usedSigId, signature, SIG_STANDARD_HEX_STRING, { from: delegate }
                );
            } catch (e) {
                return assert.ok(true);
            }
            assert.fail(`Allows signature to be re-used (replay attack)`);

        });

        it("Allows pre-signed transfer using sign typed data standard", async function () {

            newAccount = web3m.eth.accounts.create();
            value = 4 * 10 ** decimals;
            from = newAccount.address;
            // to = strangerAccount;
            // from = account1;
            to = web3m.eth.accounts.create().address;
            delegate = dreamTeamAccount;
            fee = 2 * 10 ** decimals - 1;
            deadline = (await web3m.eth.getBlock(`latest`)).timestamp + 60 * 60 * 24 * 7; // +7 days
            usedSigId = sigId++;
            const dataToSign = getTypedDataToSign();
            await token.transfer(from, 4 * (value + fee), { from: dreamTeamAccount });
            const balanceFrom = +(await token.balanceOf.call(from));
            assert.equal(balanceFrom, 4 * (value + fee), "Account balance must be refilled");
            const balanceTo = +(await token.balanceOf.call(to));
            const balanceDelegate = +(await token.balanceOf.call(delegate));
            signature = sigUtils.signTypedData(
                Buffer.from(newAccount.privateKey.slice(2), "hex"),
                { data: dataToSign }
            );
            const tx = await token.transferViaSignature(
                from, to, value, fee, delegate, deadline, usedSigId, signature, SIG_STANDARD_TYPED, { from: delegate }
            );
            infoLog(`TX (transferViaSignature) gas usage: ${ getUsedGas(tx) }`);
            assert.equal(+(await token.balanceOf(from)), balanceFrom - value - fee, "Must subtract balance");
            assert.equal(+(await token.balanceOf(to)), balanceTo + value, "Must add balance to recipient");
            assert.equal(+(await token.balanceOf(delegate)), balanceDelegate + fee, "Must pay fee to delegate");

        });

        it("Allows pre-signed transfer using sign typed data standard (one more time)", async function () {

            // const newAccount = web3m.eth.accounts.create();
            // value = 4 * 10 ** decimals;
            // from = newAccount.address;
            // to = strangerAccount;
            // from = account1;
            // to = web3m.eth.accounts.create().address;
            // delegate = dreamTeamAccount;
            // fee = 2 * 10 ** decimals - 1;
            // deadline = (await web3m.eth.getBlock(`latest`)).timestamp + 60 * 60 * 24 * 7; // +7 days
            usedSigId = sigId++;
            const dataToSign = getTypedDataToSign();
            // await token.transfer(from, value + fee, { from: dreamTeamAccount });
            const balanceFrom = +(await token.balanceOf.call(from));
            // assert.equal(balanceFrom, value + fee, "Account balance must be refilled");
            const balanceTo = +(await token.balanceOf.call(to));
            const balanceDelegate = +(await token.balanceOf.call(delegate));
            signature = sigUtils.signTypedData(
                Buffer.from(newAccount.privateKey.slice(2), 'hex'),
                { data: dataToSign }
            );
            const tx = await token.transferViaSignature(
                from, to, value, fee, delegate, deadline, usedSigId, signature, SIG_STANDARD_TYPED, { from: delegate }
            );
            infoLog(`TX (transferViaSignature) gas usage: ${ getUsedGas(tx) }`);
            assert.equal(+(await token.balanceOf(from)), balanceFrom - value - fee, "Must subtract balance");
            assert.equal(+(await token.balanceOf(to)), balanceTo + value, "Must add balance to recipient");
            assert.equal(+(await token.balanceOf(delegate)), balanceDelegate + fee, "Must pay fee to delegate");

        });

        it("Does not allow to re-use signature", async function () {

            try {
                await token.transferViaSignature(
                    from, to, value, fee, delegate, deadline, usedSigId, signature, SIG_STANDARD_TYPED, { from: delegate }
                );
            } catch (e) {
                return assert.ok(true);
            }
            assert.fail(`Allows signature to be re-used (replay attack)`);

        });

    });

    describe("Pre-signed token transferFrom", () => {

        let value, signer, from, to, delegate, fee, deadline, signature, usedSigId;

        it("Allows pre-signed transferFrom to allowed account", async function () {

            let caught = null;
            value = 10 * 10 ** decimals;
            signer = strangerAccount;
            from = dreamTeamAccount;
            to = signer;
            delegate = account1;
            fee = 1 * 10 ** decimals;
            deadline = (await web3m.eth.getBlock(`latest`)).timestamp + 60 * 60 * 24 * 7; // +7 days
            const dataToSign = web3m.utils.soliditySha3(
                token.address, from, to, value, fee, delegate, deadline, usedSigId = sigId++
            );
            const balanceFrom = +(await token.balanceOf.call(from));
            const balanceTo = +(await token.balanceOf.call(to));
            const balanceDelegate = +(await token.balanceOf.call(delegate));
            signature = await web3m.eth.sign(dataToSign, signer);
            await token.approve(signer, 0, { from });
            try {
                await token.transferFromViaSignature(
                    signer, from, to, value, fee, delegate, deadline, usedSigId, signature, SIG_STANDARD_PERSONAL, { from: delegate }
                );
            } catch (e) {
                caught = e;
            } finally {
                assert.notEqual(caught, null, "Must catch exception as allowance is not set");
            }
            await token.approve(signer, value, { from });
            const tx = await token.transferFromViaSignature(
                signer, from, to, value, fee, delegate, deadline, usedSigId, signature, SIG_STANDARD_PERSONAL, { from: delegate }
            );
            infoLog(`TX (transferFromViaSignature) gas usage: ${ getUsedGas(tx) }`);
            assert.equal(+(await token.balanceOf(from)), balanceFrom - value, "Must subtract balance from `from`");
            assert.equal(+(await token.balanceOf(to)), balanceTo + value - fee, "Must add (value - fee) to recipient");
            assert.equal(+(await token.balanceOf(delegate)), balanceDelegate + fee, "Must handle payment to delegate");
            // Signer balance is the same as to
            assert.equal(+(await token.allowance(from, signer)), 0, "Allowance must be reset to 0");

        });

        it("Allows pre-signed transferFrom with allowed account's signature but to another address", async function () {

            let caught = null;
            value = 10 * 10 ** decimals;
            signer = strangerAccount;
            from = dreamTeamAccount;
            to = tokenDeployerAccount;
            delegate = account1;
            fee = 1 * 10 ** decimals;
            deadline = (await web3m.eth.getBlock(`latest`)).timestamp + 60 * 60 * 24 * 7; // +7 days
            const dataToSign = web3m.utils.soliditySha3(
                token.address, from, to, value, fee, delegate, deadline, usedSigId = sigId++
            );
            const balanceFrom = +(await token.balanceOf.call(from));
            const balanceTo = +(await token.balanceOf.call(to));
            const balanceSigner = +(await token.balanceOf.call(signer));
            const balanceDelegate = +(await token.balanceOf.call(delegate));
            signature = await web3m.eth.sign(dataToSign, signer);
            await token.approve(signer, 0, { from });
            try {
                await token.transferFromViaSignature(
                    signer, from, to, value, fee, delegate, deadline, usedSigId, signature, SIG_STANDARD_PERSONAL, { from: delegate }
                );
            } catch (e) {
                caught = e;
            } finally {
                assert.notEqual(caught, null, "Must catch exception as allowance is not set");
            }
            await token.approve(signer, value, { from });
            const tx = await token.transferFromViaSignature(
                signer, from, to, value, fee, delegate, deadline, usedSigId, signature, SIG_STANDARD_PERSONAL, { from: delegate }
            );
            infoLog(`TX (transferFromViaSignature) gas usage: ${ getUsedGas(tx) }`);
            assert.equal(+(await token.balanceOf(from)), balanceFrom - value, "Must subtract balance from `from`");
            assert.equal(+(await token.balanceOf(to)), balanceTo + value - fee, "Must add (value - fee) to recipient");
            assert.equal(+(await token.balanceOf(delegate)), balanceDelegate + fee, "Must handle payment to delegate");
            assert.equal(+(await token.balanceOf(signer)), balanceSigner, "Must not change the signer's balance");
            assert.equal(+(await token.allowance(from, signer)), 0, "Allowance must be reset to 0");

        });

    });

    describe("Fallback scenarios", () => {

        it("Must not accept ether", async function () {
            try {
                const tx = await web3m.eth.sendTransaction({
                    from: dreamTeamAccount,
                    to: token.address,
                    value: web3m.utils.toWei("2", "ether").toString()
                });
            } catch (e) {
                return assert.ok(true);
            }
            assert.fail(`Contract accepts ether`);
        });

        it("Must allow to rescue tokens accidentally sent to a smart contract address", async function () {
            const strangerBalance = +(await token.balanceOf.call(strangerAccount));
            const dreamTeamBalance = +(await token.balanceOf.call(tokenDeployerAccount));
            const value = 1 * 10 ** decimals;
            const tx1 = await token.transfer(token.address, value, {
                from: strangerAccount
            });
            assert.equal(+(await token.balanceOf.call(strangerAccount)), strangerBalance - value, "Stranger loses tokens");
            const tx2 = await token.rescueLostTokens(token.address, value, {
                from: tokenDeployerAccount
            });
            const strangerBalance2 = +(await token.balanceOf.call(strangerAccount));
            const dreamTeamBalance2 = +(await token.balanceOf.call(tokenDeployerAccount));
            assert.equal(strangerBalance2, strangerBalance - value, "Stranger loses tokens");
            assert.equal(dreamTeamBalance2, dreamTeamBalance + value, "DreamTeam rescues stranger's tokens");
        });

    });

    describe("Edge cases and overflow checks", () => {

        it("Must not allow to transfer more than an account owns", async function () {
            const strangerBalance = +(await token.balanceOf.call(strangerAccount));
            try {
                const tx1 = await token.transfer(dreamTeamAccount, strangerBalance + 1, {
                    from: strangerAccount
                });
            } catch (e) {
                return assert.ok(true, `Cannot transfer more than ${ strangerBalance } tokens`);
            }
            return assert.fail("Allows to transfer more tokens than allowed");
        });

    });

});