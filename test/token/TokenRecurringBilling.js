const Token = artifacts.require("DreamTeamToken");
const TokenRecurringBilling = artifacts.require("TokenRecurringBilling");
const { forwardTime, latestTime } = require("../helpers/forwardTime");
const assertRevert = require("../helpers/assertRevert");
const { getUsedGas } = require("../helpers/getUsedGas.js");
const Web3 = require("web3"); // Latest web3 version
web3m = new Web3(web3.currentProvider);

const infoLog = (text) => console.log(`      ⓘ ${ text }`);

contract("TokenRecurringBilling", (accounts) => {

    const merchantAddress = accounts[3];
    const beneficiaryAddress = accounts[2];
    const chargingAccount = accounts[7];
    const anotherMerchantAddress = accounts[4];
    const anotherBeneficiaryAddress = accounts[5];
    const customerAddress = accounts[6];
    const anotherChargingAccount = accounts[8];

    let token;
    let recurringBilling;
    let lastMerchantId = 0;
    let lastBillingId = 0;

    async function mintTokens (amount = 99999, address = customerAddress) {
        await token.multiMint([address], [amount]);
    }
    async function approveTokens (amount = 99999, address = recurringBilling.address) {
        await token.approve(address, amount, {
            from: customerAddress
        });
    }

    async function createNewMerchant (beneficiary = beneficiaryAddress, charging = chargingAccount) {

        const tx = await recurringBilling.registerNewMerchant(beneficiary, charging, {
            from: merchantAddress
        });
        infoLog(`registerNewMerchant: ${ getUsedGas(tx) }`);
        
        assert.equal(tx.logs[0].event, "MerchantRegistered");
        assert.equal(+tx.logs[0].args.merchantId, ++lastMerchantId);
        assert.equal(tx.logs[0].args.merchantAccount, merchantAddress);
        assert.equal(tx.logs[0].args.beneficiaryAddress, beneficiary);

        assert.equal(tx.logs[1].event, "MerchantChargingAccountAllowed");
        assert.equal(+tx.logs[1].args.merchantId, lastMerchantId);
        assert.equal(tx.logs[1].args.chargingAccount, charging);
        assert.equal(tx.logs[1].args.allowed, true);

        const merchant = await recurringBilling.merchantRegistry(lastMerchantId);
        const allowed = await recurringBilling.merchantChargingAccountAllowed(lastMerchantId, charging);

        assert.equal(merchant[0], merchantAddress);
        assert.equal(merchant[1], beneficiary);
        assert.equal(allowed, true);

        return lastMerchantId;

    }

    async function allowBilling (merchantId, value, period, billingId = ++lastBillingId) {

        const tx = await recurringBilling.allowRecurringBilling(billingId, merchantId, value, period, {
            from: customerAddress
        });
        infoLog(`allowRecurringBilling: ${ getUsedGas(tx) }`);
        
        assert.equal(tx.logs[0].event, "BillingAllowed");
        assert.equal(+tx.logs[0].args.billingId, billingId);
        assert.equal(tx.logs[0].args.customer, customerAddress);
        assert.equal(tx.logs[0].args.merchantId, merchantId);
        assert.equal(tx.logs[0].args.timestamp <= (await latestTime()), true);
        assert.equal(tx.logs[0].args.period, period);
        assert.equal(tx.logs[0].args.value, value);

        const [$customerAddress, $metadata] = await recurringBilling.billingRegistry(billingId);

        assert.equal($customerAddress, customerAddress);
        const [$value, $lastChargeAt, $merchantId, $period] = await recurringBilling.decodeBillingMetadata($metadata);

        assert.equal($value, value);
        assert.equal($lastChargeAt <= (await latestTime()) - period, true);
        assert.equal($merchantId, merchantId);
        assert.equal($period, period);

        return billingId;

    }

    beforeEach(async function () {

        lastMerchantId = 0;
        lastBillingId = 0;
        token = await Token.new("DreamTeam Token", "DREAM");
        recurringBilling = await TokenRecurringBilling.new(token.address);

    });

    describe("Merchant actions", () => {

        it("Allows creating a new merchant", async function () {

            await createNewMerchant();

        });

        it("Allows changing merchant account by merchant", async function () {

            const merchantId = await createNewMerchant();

            const tx = await recurringBilling.changeMerchantAccount(merchantId, anotherMerchantAddress, {
                from: merchantAddress
            });
            infoLog(`changeMerchantAccount: ${ getUsedGas(tx) }`);

            assert.equal(tx.logs[0].event, "MerchantAccountChanged");
            assert.equal(+tx.logs[0].args.merchantId, merchantId);
            assert.equal(tx.logs[0].args.merchantAccount, anotherMerchantAddress);

        });

        it("Does not allow changing merchant address for everyone but merchant", async function () {

            const merchantId = await createNewMerchant();

            await assertRevert(recurringBilling.changeMerchantAccount(merchantId, anotherMerchantAddress, {
                from: customerAddress
            }));

        });

        it("Allows changing merchant beneficiary address by merchant", async function () {

            const merchantId = await createNewMerchant();

            const tx = await recurringBilling.changeMerchantBeneficiaryAddress(merchantId, anotherBeneficiaryAddress, {
                from: merchantAddress
            });
            infoLog(`changeMerchantBeneficiaryAddress: ${ getUsedGas(tx) }`);

            assert.equal(tx.logs[0].event, "MerchantBeneficiaryAddressChanged");
            assert.equal(+tx.logs[0].args.merchantId, merchantId);
            assert.equal(tx.logs[0].args.beneficiaryAddress, anotherBeneficiaryAddress);

        });

        it("Does not allow changing beneficiary address for everyone but merchant", async function () {

            const merchantId = await createNewMerchant();

            await assertRevert(recurringBilling.changeMerchantBeneficiaryAddress(merchantId, anotherBeneficiaryAddress, {
                from: customerAddress
            }));

        });

        it("Allows changing merchant charging account by merchant", async function () {

            const merchantId = await createNewMerchant();

            const tx = await recurringBilling.changeMerchantChargingAccount(merchantId, anotherChargingAccount, true, {
                from: merchantAddress
            });
            infoLog(`changeMerchantChargingAccount: ${ getUsedGas(tx) }`);

            assert.equal(tx.logs[0].event, "MerchantChargingAccountAllowed");
            assert.equal(+tx.logs[0].args.merchantId, merchantId);
            assert.equal(tx.logs[0].args.chargingAccount, anotherChargingAccount);
            assert.equal(tx.logs[0].args.allowed, true);

        });

        it("Allows changing merchant charging account by merchant (to false)", async function () {

            const merchantId = await createNewMerchant();

            const tx = await recurringBilling.changeMerchantChargingAccount(merchantId, chargingAccount, false, {
                from: merchantAddress
            });
            infoLog(`changeMerchantChargingAccount: ${ getUsedGas(tx) }`);

            assert.equal(tx.logs[0].event, "MerchantChargingAccountAllowed");
            assert.equal(+tx.logs[0].args.merchantId, merchantId);
            assert.equal(tx.logs[0].args.chargingAccount, chargingAccount);
            assert.equal(tx.logs[0].args.allowed, false);

        });

        it("Does not allow changing charging account for everyone but merchant", async function () {

            const merchantId = await createNewMerchant();

            await assertRevert(recurringBilling.changeMerchantChargingAccount(merchantId, anotherChargingAccount, true, {
                from: customerAddress
            }));

        });

    });

    describe("Customer actions", () => {

        it("Registers new recurring billing without allowance", async function () {

            const merchantId = await createNewMerchant();
            const amount = 100;

            await mintTokens(amount * 2);
            await approveTokens(amount * 2);
            await allowBilling(merchantId, amount, 60 * 60 * 24);
            await allowBilling(merchantId, amount, 60 * 60 * 24); // Once again to display the gas price on a second run

        });

        it("Cannot charge themselves", async function () {

            const amount = 100;
            const merchantId = await createNewMerchant();
            await mintTokens(amount);
            await approveTokens(amount);
            const billingId = await allowBilling(merchantId, amount, 60 * 60 * 24);

            await assertRevert(recurringBilling.charge(billingId, {
                from: customerAddress
            }));

        });

        it("Can cancel their recurring billing", async function () {

            const amount = 100;
            const merchantId = await createNewMerchant();
            await mintTokens(amount);
            await approveTokens(amount);
            const billingId = await allowBilling(merchantId, amount, 60 * 60 * 24);

            const tx = await recurringBilling.cancelRecurringBilling(billingId, {
                from: customerAddress
            });
            infoLog(`cancelRecurringBilling: ${ getUsedGas(tx) }`);

            assert.equal(tx.logs[0].event, "BillingCanceled");
            assert.equal(+tx.logs[0].args.billingId, billingId);
            assert.equal(tx.logs.length, 1);

        });

    });

    describe("Utility Functions", () => {

        it("Encodes and decodes the same", async function () {
            const packedData = await recurringBilling.encodeBillingMetadata(1, 2, 3, 4);
            const unpackedData = await recurringBilling.decodeBillingMetadata(packedData);
            unpackedData.forEach((value, index) => assert.equal(+value, index + 1));
        });

    });

    describe("Billing Workflow", () => {

        it("Merchant can charge customer from allowed address", async function () {

            const amount = 100;
            await createNewMerchant(accounts[9]); // Skip ID=1
            const merchantId = await createNewMerchant(anotherBeneficiaryAddress, anotherChargingAccount);
            const period = 60 * 60 * 24;
            await mintTokens(amount);
            await approveTokens(amount);
            const billingId = await allowBilling(merchantId, amount, period);

            assert.equal(await token.balanceOf(customerAddress), amount);

            const tx = await recurringBilling.charge(billingId, {
                from: anotherChargingAccount
            });
            infoLog(`charge: ${ getUsedGas(tx) }`);
            const blockchainTime = await latestTime();

            assert.equal(+(await token.balanceOf(customerAddress)), 0);
            assert.equal(+(await token.balanceOf(accounts[9])), 0);
            assert.equal(+(await token.balanceOf(anotherBeneficiaryAddress)), amount);
            assert.equal(tx.logs[0].event, "BillingCharged");
            assert.equal(tx.logs[0].args.billingId, billingId);
            assert.equal(typeof(tx.logs[0].args.timestamp) !== "undefined", true);
            assert.equal(tx.logs[0].args.nextChargeTimestamp > blockchainTime + period / 1.2, true);
            assert.equal(tx.logs[0].args.nextChargeTimestamp < blockchainTime + period * 1.2, true);

        });

        it("Merchant can't charge customer from allowed address twice", async function () {

            const amount = 100;
            const merchantId = await createNewMerchant();
            await mintTokens(amount);
            await approveTokens(amount);
            const billingId = await allowBilling(merchantId, amount, 60 * 60 * 24);

            const tx = await recurringBilling.charge(billingId, {
                from: chargingAccount
            });
            infoLog(`charge: ${ getUsedGas(tx) }`);
            await assertRevert(recurringBilling.charge(billingId, {
                from: chargingAccount
            }));

        });

        it("Merchant can do multiple charges over time", async function () {

            const amount = 100;
            const times = 4;
            const period = 60 * 60 * 24;
            const merchantId = await createNewMerchant();
            await mintTokens(amount * times);
            await approveTokens(amount * times);
            const billingId = await allowBilling(merchantId, amount, period);

            for (let i = 0; i < times; ++i) {
                const tx = await recurringBilling.charge(billingId, {
                    from: chargingAccount
                });
                infoLog(`charge: ${ getUsedGas(tx) }`);
                await forwardTime(period);
            }

            assert.equal(await token.balanceOf(customerAddress), 0);
            assert.equal(await token.balanceOf(beneficiaryAddress), amount * times);

        });

        it("Merchant can do multiple charges with slight delay over time", async function () {

            const amount = 100;
            const times = 4;
            const period = 60 * 60 * 24;
            const merchantId = await createNewMerchant();
            await mintTokens(amount * times);
            await approveTokens(amount * times);
            const billingId = await allowBilling(merchantId, amount, period);

            for (let i = 0; i < times; ++i) {
                const tx = await recurringBilling.charge(billingId, {
                    from: chargingAccount
                });
                infoLog(`charge: ${ getUsedGas(tx) }`);
                await forwardTime(period + Math.round(period / (times + 1))); // 4 times are valid due to totalDelay < period
            }

            assert.equal(+(await token.balanceOf(customerAddress)), 0);
            assert.equal(+(await token.balanceOf(beneficiaryAddress)), amount * times);

        });

        it("Merchant can't do a charge after billing cancellation", async function () {

            const amount = 100;
            const period = 60 * 60 * 24;
            const merchantId = await createNewMerchant();
            await mintTokens(amount * 2);
            await approveTokens(amount * 2);
            const billingId = await allowBilling(merchantId, amount, period);

            const tx = await recurringBilling.charge(billingId, {
                from: chargingAccount
            });
            infoLog(`charge: ${ getUsedGas(tx) }`);

            const tx2 = await recurringBilling.cancelRecurringBilling(billingId, {
                from: customerAddress
            });
            infoLog(`cancelRecurringBilling: ${ getUsedGas(tx2) }`);

            await forwardTime(period + period / 3);

            assertRevert(recurringBilling.charge(billingId, {
                from: chargingAccount
            }));

            assert.equal(await token.balanceOf(customerAddress), amount);
            assert.equal(await token.balanceOf(beneficiaryAddress), amount);

        });

        it("Billing is auto-cancelled if charged too late", async function () {

            const amount = 100;
            const period = 60 * 60 * 24;
            const merchantId = await createNewMerchant();
            await mintTokens(amount);
            await approveTokens(amount);
            const billingId = await allowBilling(merchantId, amount, period);

            await forwardTime(period + 1);

            const tx = await recurringBilling.charge(billingId, {
                from: chargingAccount
            });
            infoLog(`charge: ${ getUsedGas(tx) }`);

            assert.equal(await token.balanceOf(customerAddress), amount);
            assert.equal(await token.balanceOf(beneficiaryAddress), 0);
            assert.equal(tx.logs[0].event, "BillingCanceled");
            assert.equal(tx.logs[0].args.billingId, billingId);

        });

        it("Does not allow recurring billing when not enough tokens present on a balance", async function () {

            const amount = 100;
            const merchantId = await createNewMerchant();

            try {
                await allowBilling(merchantId, amount, 60 * 60 * 24);
            } catch (e) {
                return assert.ok(true);
            }
            assert.fail("Allows billing");

        });

        it("Does not allow recurring billing when tokens are not approved", async function () {

            const amount = 100;
            const merchantId = await createNewMerchant();
            await mintTokens(amount);

            try {
                await allowBilling(merchantId, amount, 60 * 60 * 24);
            } catch (e) {
                return assert.ok(true);
            }
            assert.fail("Allows billing");

        });

        it("Does not allow to register the same billing twice", async function () {

            const amount = 100;
            const merchantId = await createNewMerchant();
            await mintTokens(amount);
            await approveTokens(amount);

            const id = await allowBilling(merchantId, amount, 60 * 60 * 24);
            try {
                await allowBilling(merchantId, amount, 60 * 60 * 24, id);
            } catch (e) {
                return assert.ok(true);
            }
            assert.fail("Allows billing");

        });

    });

    describe("Billing with Delegated Transactions (DREAM Token)", () => {

        it("Allows user to register billing ID using approveAndCall", async function () {

            const amount = 100;
            const period = 60 * 60 * 24;
            const merchantId = await createNewMerchant();
            const billingId = 77766655589;
            const packedData = await recurringBilling.encodeBillingMetadata(amount, 0, merchantId, period);
            const bytes = "0x" + packedData.toString(16).padStart(64, "0") + billingId.toString(16).padStart(64, "0");

            mintTokens(amount, customerAddress);

            const tx = await token.approveAndCall(recurringBilling.address, amount, bytes, {
                from: customerAddress
            });
            infoLog(`approveAndCall: ${ getUsedGas(tx) }`);

            const [$customerAddress, $metadata] = await recurringBilling.billingRegistry(billingId);
            const [$value, $lastChargeAt, $merchantId, $period] = await recurringBilling.decodeBillingMetadata($metadata);

            assert.equal($customerAddress, customerAddress);
            assert.equal($value, amount);
            assert.equal($lastChargeAt <= (await latestTime()) - period, true);
            assert.equal($merchantId, merchantId);
            assert.equal($period, period);

        });

        it("Allows user to register and cancel recurring billing using approveAndCallViaSignature", async function () {

            const amount = 100;
            const period = 60 * 60 * 24;
            const merchantId = await createNewMerchant();
            const billingId = 1555444692;
            const packedData = await recurringBilling.encodeBillingMetadata(amount, 0, merchantId, period);
            const bytes = "0x" + packedData.toString(16).padStart(64, "0") + billingId.toString(16).padStart(64, "0");
            const sigId = 1000;
            const argsToSign = [
                token.address, customerAddress, recurringBilling.address, 999999, bytes, 0, beneficiaryAddress, 999999999999, sigId
            ];

            mintTokens(amount, customerAddress);

            const dataToSign = web3m.utils.soliditySha3.apply(web3m.utils, argsToSign);
            const signature = await web3m.eth.sign(dataToSign, customerAddress);
            const tx = await token.approveAndCallViaSignature.apply(token, argsToSign.slice(1).concat([signature, 1, {
                from: beneficiaryAddress
            }]));
            infoLog(`approveAndCallViaSignature (allow recurring billing): ${ getUsedGas(tx) }`);

            const [$customerAddress, $metadata] = await recurringBilling.billingRegistry(billingId);
            const [$value, $lastChargeAt, $merchantId, $period] = await recurringBilling.decodeBillingMetadata($metadata);

            assert.equal($customerAddress, customerAddress);
            assert.equal($value, amount);
            assert.equal($lastChargeAt <= (await latestTime()) - period, true);
            assert.equal($merchantId, merchantId);
            assert.equal($period, period);

            // Cancel recurring billing

            const packedData2 = await recurringBilling.encodeBillingMetadata(amount, 1, merchantId, period);
            const bytes2 = "0x" + packedData2.toString(16).padStart(64, "0") + billingId.toString(16).padStart(64, "0");
            const sigId2 = 1001;

            // Test that a random customer cannot cancel billing of another customer
            const argsToSign3 = [
                token.address, anotherBeneficiaryAddress, recurringBilling.address, 999999, bytes2, 0, beneficiaryAddress, 999999999999, sigId2 + 1
            ];
            const dataToSign3 = web3m.utils.soliditySha3.apply(web3m.utils, argsToSign3);
            const signature3 = await web3m.eth.sign(dataToSign3, anotherBeneficiaryAddress);
            await assertRevert(token.approveAndCallViaSignature.apply(token, argsToSign3.slice(1).concat([signature3, 1, {
                from: beneficiaryAddress
            }])));
            // ------------------------------------------------

            const argsToSign2 = [
                token.address, customerAddress, recurringBilling.address, 999999, bytes2, 0, beneficiaryAddress, 999999999999, sigId2
            ];
            const dataToSign2 = web3m.utils.soliditySha3.apply(web3m.utils, argsToSign2);
            const signature2 = await web3m.eth.sign(dataToSign2, customerAddress);

            const tx2 = await token.approveAndCallViaSignature.apply(token, argsToSign2.slice(1).concat([signature2, 1, {
                from: beneficiaryAddress
            }]));
            infoLog(`approveAndCallViaSignature (cancel recurring billing): ${ getUsedGas(tx2) }`);

            const [$customerAddress2] = await recurringBilling.billingRegistry(billingId);

            assert.equal(parseInt($customerAddress2), 0);

        });

        it("Does not allow to register the same billing twice", async function () {

            const amount = 100;
            const period = 60 * 60 * 24;
            const merchantId = await createNewMerchant();
            const billingId = 123123213;
            const packedData = await recurringBilling.encodeBillingMetadata(amount, 0, merchantId, period);
            const bytes = "0x" + packedData.toString(16).padStart(64, "0") + billingId.toString(16).padStart(64, "0");

            mintTokens(amount, customerAddress);

            const tx = await token.approveAndCall(recurringBilling.address, amount, bytes, {
                from: customerAddress
            });
            infoLog(`approveAndCall: ${ getUsedGas(tx) }`);

            try {
                await token.approveAndCall(recurringBilling.address, amount, bytes, {
                    from: customerAddress
                });
            } catch (e) {
                return assert.ok(true);
            }
            assert.fail("Must fail");

        });

    });

});
