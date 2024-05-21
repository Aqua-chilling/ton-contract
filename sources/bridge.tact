import "./jetton.tact";
import "./messages.tact";


message(0xcb75b312) DepositData {
    queryId: Int as uint256;
    receiver: Address;
}

message(0xac32a321) DepositedEvent {
    queryId: Int as uint256;
    amount: Int as coins;
    receiver: Address;
}

message(0x234ca2d) UpdatePause {
    paused: Bool;
}

message WithdrawTon {
    amount: Int as coins;
}


contract BridgeContract {
    const minTonsForStorage: Int = ton("0.01");
    const gasConsumption: Int = ton("0.01");
    owner: Address;
    paused: Bool;
    
    init(owner: Address) {
        self.owner = owner;
        self.paused = false;
    }

    receive(info: UpdatePause) {
        let ctx: Context = context();
        require(ctx.sender == self.owner, "Not owner");
        self.paused = info.paused;
    }

    receive(info: DepositData) {
        let ctx: Context = context();
        let msgValue: Int = self.msg_value(ctx.value);

        require(!self.paused, "paused");

        require(msgValue > 0, "invalid ton");

        emit(DepositedEvent{ queryId: info.queryId, amount: msgValue, receiver: info.receiver }.toCell());
    }

    receive(withdrawInfo: WithdrawTon) {
        send(SendParameters{
                to: self.owner,
                value: withdrawInfo.amount,
                bounce: false,
                body: null,
                mode: SendIgnoreErrors
            }
        );
    }


    get fun msg_value(value: Int): Int {
        let msg_value: Int = value;
        let ton_balance_before_msg: Int = myBalance() - msg_value;
        let storage_fee: Int = self.minTonsForStorage - min(ton_balance_before_msg, self.minTonsForStorage);
        msg_value = msg_value - (storage_fee + self.gasConsumption);
        return msg_value;
    }

} 