function getRandomElements(arr, numberOfElements) {
    if (arr.length <= numberOfElements) {
        return arr;
    }
    const newArr = [...arr];
    for (let i = newArr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
    }
    return newArr.slice(0, numberOfElements);
}


const deductFromWalletBalance = async (wallet, amount, user_id) => {
    const wallet_details = await wallet.findOne({ user_id });
    if (wallet_details) {
        const available_balance = wallet_details.balance;
        if (amount > available_balance) return "less";
        const new_balance = parseFloat(available_balance) - parseFloat(amount);
        await wallet.findOneAndUpdate({ user_id }, { balance: new_balance });
        return "done";
    } else {
        return "not-found";
    }
};


const addToWalletBalance = async (wallet, amount, user_id) => {
    let new_balance = amount;
    const wallet_details = await wallet.findOne({ user_id });
    if (wallet_details) {
        const available_balance = wallet_details.balance;
        new_balance = parseFloat(available_balance) + parseFloat(amount);
        await wallet.findOneAndUpdate({ user_id }, { balance: new_balance });
        return "done";
    } else {
        return "not-found";
    }
};


const handleCoinDrop = async (data) => {
    const amount = data.coin_drop_amount;
    const wallet = detectWallet(data.coin_drop_token);
    const user_id = data.user_id;
    const dropper = await Profile.findOne({ user_id })
    if (dropper.vip_level < 7) {
        return
    }
    return deductFromWalletBalance(wallet, amount, user_id);
};


const handleRain = async (data, activeUsers) => {
    const wallet = detectWallet(data.coin_rain_token);
    let { user_id, coin_rain_amount, coin_rain_num, coin_rain_participant } =
        data;
    const isDeducted = await deductFromWalletBalance(wallet, coin_rain_amount, user_id);
    console.log({ isDeducted, activeUsers: activeUsers.length, coin_rain_participant })
    if (isDeducted === "done") {
        const share = coin_rain_amount / coin_rain_num;
        for (let i = 0; i < activeUsers.length; i++) {
            if (user_id !== activeUsers[i].id) {
                coin_rain_participant.push({
                    user_id: activeUsers[i].id,
                    username: activeUsers[i].username,
                    share,
                    grabbed_at: new Date(),
                });
                await addToWalletBalance(wallet, share, activeUsers[i].id);
            }
        }
    }
    data.coin_rain_participant = coin_rain_participant;
    return data;
};


const handleTip = async (data) => {
    const amount = data.tipped_amount;
    const wallet = detectWallet(data.tip_Token);
    const user_id = data.user_id;
    const receiverUsername = data.tipped_user;
    const receiver = await Profile.findOne({ username: receiverUsername });
    let deduction = await deductFromWalletBalance(wallet, amount, user_id);
    if (deduction === "done")
        await addToWalletBalance(wallet, amount, receiver.user_id);
};

module.exports ={
    handleCoinDrop,
    handleTip,
    handleRain,
    getRandomElements
}