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
    amount: Int;
    contract_jettonWallet: Address;
}

message WithdrawTon {
    amount: Int;
}

message UpdateJettonWallet {
    contract_jettonWallet: Address;
}

message BuyPack {
    queryId: Int;
    packId: Int;
    response_destination: Address;
}

message WithdrawnTon {
    amount: Int;
}

contract SampleBuyPack {
    const minTonsForStorage: Int = ton("0.01");
    const gasConsumption: Int = ton("0.01");

    contract_jettonWallet: Address?;
    owner: Address;
    content: Cell;
    packages: map<Int, Int>;

    init(owner: Address, content: Cell) {
        self.owner = owner;
        self.content = content;
    }

    receive(update: UpdateJettonWallet) {
        self.contract_jettonWallet = update.contract_jettonWallet;
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

        require(self.contract_jettonWallet == null, "used jetton token instead");
        require(price != null, "invalid pack");
        let msgValue: Int = self.msgValue(ctx.value);  
        let amount: Int = msgValue / price;
        let fwdFee: Int = ctx.readForwardFee();

        msgValue = msgValue - (price * amount) - fwdFee;

        require(amount > 0, "not enough ton");

        if (buyInfo.response_destination != null) { 
            send(SendParameters {
                to: buyInfo.response_destination, 
                value: msgValue,  
                bounce: false,
                body: TokenExcesses { 
                    queryId: buyInfo.queryId
                }.toCell(),
                mode: SendIgnoreErrors
            });
        }

        emit(BoughtPackEvent{ queryId: buyInfo.queryId, packId: buyInfo.packId, buyer: ctx.sender, amount: amount }.toCell());
    }

    receive(buyInfo: TokenNotification){
        let ctx: Context = context();
        require(ctx.value >= 2 * self.gasConsumption + self.minTonsForStorage, "not enough fee");
        require(ctx.sender == self.contract_jettonWallet, "not from one of any jetton wallet");
        let buyPackId: Int = buyInfo.forward_payload.loadUint(8);        
        let price: Int = self.packages.get(buyPackId)!!;
        require(price != null, "invalid pack");

        let amount: Int = buyInfo.amount / price;

        require(amount > 0, "not enough price");

        let msgValue: Int = self.msgValue(ctx.value);  
        msgValue = msgValue - amount;

        if (buyInfo.from != null) { 
            send(SendParameters {
                to: buyInfo.from, 
                value: msgValue,  
                bounce: false,
                body: TokenExcesses { 
                    queryId: buyInfo.queryId
                }.toCell(),
                mode: SendIgnoreErrors
            });
        }
    
        emit(BoughtPackEvent{ queryId: buyInfo.queryId, packId: buyPackId, buyer: buyInfo.from, amount: amount }.toCell());
    }

    receive(withdrawInfo: Withdraw) {
        send(SendParameters{
                to: withdrawInfo.contract_jettonWallet,
                value: 0,
                mode: (SendRemainingValue + SendIgnoreErrors),
                bounce: false,
                body: TokenTransfer{
                    queryId: 0,
                    amount: withdrawInfo.amount,
                    destination: self.owner,
                    response_destination: myAddress(),
                    custom_payload: null,
                    forward_ton_amount: ton("0.01"),
                    forward_payload: emptySlice()
                }.toCell()
            }
        );
    }

    receive(withdrawInfo: WithdrawTon) {
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
        let tonBalanceBeforeMsg: Int = myBalance() - msgValue;
        let storageFee: Int = self.minTonsForStorage - min(tonBalanceBeforeMsg, self.minTonsForStorage);
        msgValue = msgValue - (storageFee + self.gasConsumption);
        return msgValue;
    }
} 