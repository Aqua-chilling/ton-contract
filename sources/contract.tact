import "./jetton.tact";
import "./messages.tact";

message CreatePack {
    packId: Int;
    full_price: Int as coins;
}

message RemovePack {
    packId: Int;
}

message Withdraw {
    amount: Int as coins;
    contract_jettonWallet: Address;
}

message WithdrawTon {
    amount: Int as coins;
}

message UpdateJettonWallet {
    contract_jettonWallet: Address;
}

message BuyPack {
    queryId: Int as uint64;
    packId: Int;
    response_destination: Address?;
    amount: Int;
}

message WithdrawnTon {
    amount: Int as coins;
}

contract BuyPackContract {
    const minTonsForStorage: Int = ton("0.01");
    const gasConsumption: Int = ton("0.01");

    owner: Address;
    packages: map<Int, Int>;
    totalBought: Int as coins;

    init(owner: Address) {
        self.owner = owner;
        self.totalBought = 0;
    }


    receive(pack: CreatePack) {
        let ctx: Context = context();
        require(ctx.sender == self.owner, "Not owner");

        self.packages.set(pack.packId, pack.full_price);
    }

    receive(pack: RemovePack) {
        let ctx: Context = context();
        require(ctx.sender == self.owner, "Not owner");

        self.packages.set(pack.packId, null);
    }

    receive(buyInfo: BuyPack) {
        let ctx: Context = context();
        let buyPackId: Int = buyInfo.packId;
        let price: Int = self.packages.get(buyPackId)!!;

        require(price != null, "invalid pack");
        let msgValue: Int = self.msgValue(ctx.value);
        
        let amount: Int = buyInfo.amount;
        require(amount * price <= msgValue, "not enough ton");
        msgValue = msgValue - (price * amount);

        if (buyInfo.response_destination != null) { 
            send(SendParameters {
                to: buyInfo.response_destination!!, 
                value: msgValue,  
                bounce: false,
                body: TokenExcesses { 
                    queryId: buyInfo.queryId
                }.toCell(),
                mode: SendIgnoreErrors
            });
        }
        self.totalBought = self.totalBought + price * amount;

        emit(BoughtPackEvent{ queryId: buyInfo.queryId, packId: buyInfo.packId, buyer: ctx.sender, amount: amount }.toCell());
    }

    receive(withdrawInfo: WithdrawTon) {
        
        let ctx: Context = context();
        require(ctx.sender == self.owner, "Not owner");
        self.totalBought = self.totalBought - withdrawInfo.amount;
        send(SendParameters{
                to: self.owner,
                value: withdrawInfo.amount,
                bounce: false,
                body: WithdrawnTon{
                    amount: withdrawInfo.amount
                }.toCell(),
                mode: SendIgnoreErrors
            }
        );
    }

    get fun msgValue(value: Int): Int {
        let msgValue: Int = value;
        let tonBalanceBeforeMsg: Int = myBalance() - msgValue - self.totalBought;
        let storageFee: Int = self.minTonsForStorage - min(tonBalanceBeforeMsg, self.minTonsForStorage);
        msgValue = msgValue - (storageFee + self.gasConsumption);
        return msgValue;
    }
} 