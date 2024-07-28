message WithdrawTon {
    amount: Int as coins;
}
message CheckInMessage {
    sender: Address;
    timestamp: Int as uint64;
}

contract CheckInContract {
    owner: Address;
    fee: Int as coins;
    reward: Int as coins;
    const minTonsForStorage: Int = ton("0.02");
    const gasConsumption: Int = ton("0.02");
    init(owner: Address){
        self.owner = owner;
        self.fee = 800000000;
        self.reward = 460000000;
    }

    fun checkIn() {
        // Check sender
        let ctx: Context = context();
        let value: Int = self.msg_value(ctx.value);
        require(ctx.sender != self.owner, "Owner cannot check in");
        // Ensure the sender has sent the required fee
        require(ctx.value >= self.fee, "Insufficient fee sent");
        // Send the reward to the sender
        send(SendParameters{to: ctx.sender, value: self.reward, mode: SendBounceIfActionFail, bounce: true, body: null}
        );
        emit(CheckInMessage{sender: ctx.sender, timestamp: now()}.toCell());
    }

    fun setFee(newFee: Int) {
        // Check sender
        let ctx: Context = context();
        require(ctx.sender == self.owner, "Only owner can set the fee");
        // Set new fee
        self.fee = newFee;
    }

    fun setReward(newReward: Int) {
        // Check sender
        let ctx: Context = context();
        require(ctx.sender == self.owner, "Only owner can set the reward");
        // Set new reward
        self.reward = newReward;
    }

    get fun msg_value(value: Int): Int {
        let msg_value: Int = value;
        let ton_balance_before_msg: Int = (myBalance() - msg_value);
        let storage_fee: Int = (self.minTonsForStorage - min(ton_balance_before_msg, self.minTonsForStorage));
        msg_value = (msg_value - (storage_fee + self.gasConsumption));
        return msg_value;
    }

    receive(withdrawInfo: WithdrawTon){
        let ctx: Context = context();
        require(ctx.sender == self.owner, "Not owner");
        send(SendParameters{
                to: self.owner,
                value: withdrawInfo.amount,
                bounce: false,
                body: null,
                mode: SendIgnoreErrors
            }
        );
    }
}