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

message UpdateJettonWallet {
    contract_jettonWallet: Address;
}


contract SampleBuyPack {
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

    // The notification for the Jetton Token contract noification(when current address receive the token will get the notification)
    receive(buyInfo: TokenNotification){
        require(context().sender == self.contract_jettonWallet, "not from one of any jetton wallet");
        let buyPackId: Int = buyInfo.forward_payload.loadUint(8);        
        let price: Int = self.packages.get(buyPackId)!!;
        require(price != null, "invalid pack");

        let amount: Int = buyInfo.amount / price;

        require(amount > 0, "not enough price");
    
        emit(BoughtPackEvent{ packId: buyPackId, buyer: buyInfo.from, amount: amount }.toCell());
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
                    destination: context().sender,
                    response_destination: myAddress(),
                    custom_payload: null,
                    forward_ton_amount: ton("0.01"),
                    forward_payload: emptySlice()
                }.toCell()
            }
        );
    }
} 