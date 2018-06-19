const DreamTokensVestingTest = artifacts.require("DreamTokensVestingTest");
const Token = artifacts.require("DreamTeamToken");

const assertRevert = require("../helpers/assertRevert");
const { increaseTimeTo, latestTime } = require("../helpers/forwardTime");

contract("DreamTokensVestingTest", (accounts) => {

    const totalTokensAmount = 8278689000000;
    const withdrawAddress = accounts[3];
    const thirdPartyAddress = accounts[2];
    const day = 24 * 60 * 60;

    let token;
    let vesting;
    let vestingStartTimestamp;
    let stages;
    let lastBlockTimestamp;

    beforeEach(async function () {

        lastBlockTimestamp = await latestTime();
        vestingStartTimestamp = lastBlockTimestamp + day;

        // Stages according to vesting table 
        // https://dreamteam-gg.atlassian.net/wiki/spaces/DREAM/pages/469401604/BC+Dream+tokens+vesting+SC
        stages = [
            {
                date: vestingStartTimestamp,
                tokensUnlockedPercentage: 25,
                tokensAmount: totalTokensAmount * 25 / 100
            },
            {
                date: vestingStartTimestamp + day * 183,
                tokensUnlockedPercentage: 50,
                tokensAmount: totalTokensAmount * 50 / 100
            },
            {
                date: vestingStartTimestamp + day * 366,
                tokensUnlockedPercentage: 75,
                tokensAmount: totalTokensAmount * 75 / 100
            },
            {
                date: vestingStartTimestamp + day * 366 + day * 183,
                tokensUnlockedPercentage: 88,
                tokensAmount: totalTokensAmount * 88 / 100
            },
            {
                date: vestingStartTimestamp + day * 2 * 366,
                tokensUnlockedPercentage: 100,
                tokensAmount: totalTokensAmount * 100 / 100
            }
        ];

        token = await Token.new("DreamTeam Token", "DTT");
        vesting = await DreamTokensVestingTest.new(token.address, withdrawAddress, vestingStartTimestamp);

        await token.multiMint([vesting.address], [totalTokensAmount]);

    });

    describe("Vesting checkup", () => {

        it("Initial setup", async function () {

            let stage;
            let stageDate;
            let stagePercentage;

            for (let i = 0; i < stages.length; i++) {

                stage = await vesting.getStageAttributes(i);
                stageDate = stage[0].toNumber();
                stagePercentage = stage[1].toNumber();

                assert.equal(stageDate, stages[i].date);
                assert.equal(stagePercentage, stages[i].tokensUnlockedPercentage);

            }

            assert.equal(
                (await vesting.dreamToken()).toString(),
                token.address
            );

            assert.equal(
                (await vesting.withdrawAddress()).toString(),
                withdrawAddress
            );

        });

        it("Total tokens amount setup", async function () {

            await increaseTimeTo(stages[0].date);
            await vesting.sendTransaction({ from: withdrawAddress });

            assert.equal(
                (await vesting.initialTokensBalance()).toNumber(),
                totalTokensAmount
            );

        });

        it("Total amount will be zero until tokens balance is zero", async function () {

            token = await Token.new("DreamTeam Token", "DTT");
            vesting = await DreamTokensVestingTest.new(token.address, withdrawAddress, vestingStartTimestamp);

            await increaseTimeTo(stages[0].date);
            await vesting.sendTransaction({ from: withdrawAddress });

            // Tokens balance should be zero
            assert.equal(
                (await vesting.initialTokensBalance()).toNumber(),
                0
            );

            // Add tokens to vesting
            await token.multiMint([vesting.address], [totalTokensAmount]);
            await vesting.sendTransaction({ from: withdrawAddress });

            // Tokens balance should be equal to tokens sent
            assert.equal(
                (await vesting.initialTokensBalance()).toNumber(),
                totalTokensAmount
            );

        });

    });

    describe("Withdrawing tokens for the two years period", () => {

        it("All stages withdraw", async function () {

            for (let i = 0; i < stages.length; i++) {

                await increaseTimeTo(stages[i].date);

                await vesting.sendTransaction({ from: withdrawAddress });

                // Trying to get rest tokens
                await vesting.sendTransaction({ from: withdrawAddress });

                assert.equal(
                    (await token.balanceOf(withdrawAddress)).toNumber(),
                    stages[i].tokensAmount
                );

            }

        });

        it("Take all tokens when last but one when stage were passed", async function () {

            await increaseTimeTo(stages[stages.length - 2].date);
            await vesting.sendTransaction({ from: withdrawAddress });

            // Trying to get the rest tokens
            await vesting.sendTransaction({ from: withdrawAddress });
            assert.equal(
                (await token.balanceOf(withdrawAddress)).toNumber(),
                stages[stages.length - 2].tokensAmount
            );

        });

        it("Take all tokens at once when all stages were passed", async function () {

            await increaseTimeTo(stages[stages.length - 1].date);

            await vesting.sendTransaction({ from: withdrawAddress });
            assert.equal(
                (await token.balanceOf(withdrawAddress)).toNumber(),
                totalTokensAmount
            );
            
        });

        it(
            "Sends additional tokens when vesting was started and take them after last stage was passed only",
            async function () {

                // Go through all the stages except last one.
                for (let i = 0; i < stages.length - 1; i++) {

                    await increaseTimeTo(stages[i].date);

                    await vesting.sendTransaction({ from: withdrawAddress });

                    // Adding some tokens on every stage.
                    await token.multiMint([vesting.address], [totalTokensAmount]);

                    // Overall withdraw should not be changed.
                    assert.equal(
                        (await token.balanceOf(withdrawAddress)).toNumber(),
                        stages[i].tokensAmount
                    );

                }

                // Moving to the last stage
                await increaseTimeTo(stages[stages.length - 1].date);
                // Getting all tokens including added after vesting was started.
                await vesting.sendTransaction({ from: withdrawAddress });
                assert.equal(
                    (await token.balanceOf(withdrawAddress)).toNumber(),
                    totalTokensAmount * 5
                );

            }
        );

        it("Tokens can't be withdrawn before the first stage started", async function () {

            await vesting.sendTransaction({ from: withdrawAddress });

            // Checking initial tokens balance. Should not be zero.
            assert.notEqual(
                (await vesting.initialTokensBalance()).toNumber(),
                0
            );

            // Balance of withdraw address should be zero.
            assert.equal(
                (await token.balanceOf(withdrawAddress)).toNumber(),
                0
            );

        });

        it("Can't withdraw tokens from non-allowed address", async function () {
            await assertRevert(vesting.sendTransaction({ from: thirdPartyAddress }));
        });

    });

});
