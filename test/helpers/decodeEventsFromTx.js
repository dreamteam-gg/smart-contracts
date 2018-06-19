module.exports = function (tx) {
    if (!(tx.logs instanceof Array))
        throw new Error("tx is not a transaction");
    return tx.logs.reduce((obj, log) => {
        if (!log.event) {
            console.log("Skipped log", log);
            return;
        }
        obj[log.event] = log.args;
        return obj;
    }, {});
}