const Web3 = require("web3"); // Latest web3 version
let web3m = new Web3(web3.currentProvider);

/**
 * Note that this method will only work on TestRPC or Truffle Develop networks.
 * @param {number} minutesToForward
 */
async function forwardTime (secondsToForward) {
    return new Promise((resolve, reject) => {
        web3m.currentProvider.sendAsync({
            jsonrpc: "2.0",
            method: "evm_increaseTime",
            params: [secondsToForward],
            id: Date.now(),
        }, (err) => {
            if (err)
                reject(err);
            web3m.currentProvider.sendAsync({
                jsonrpc: "2.0",
                method: "evm_mine",
                id: Date.now(),
            }, (err2, res) => {
                return err2 ? reject(err2) : resolve(res)
            });
        });
    })
}

/**
 * @param target time in seconds
 * @param now current timestamp
 */
async function increaseTimeTo (target) {
    let now = await latestTime();
    if (target < now) throw Error(`Cannot increase current time(${ now }) to a moment in the past(${ target })`);
    let diff = target - now;
    return await forwardTime(diff);
}

async function latestTime () {
    return (await web3m.eth.getBlock("latest")).timestamp;
}

module.exports = {
    increaseTimeTo: increaseTimeTo,
    forwardTime: forwardTime,
    latestTime: latestTime
};