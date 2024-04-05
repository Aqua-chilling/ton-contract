import "./jetton.tact";
import "./messages.tact";

message CreatePack {
    packId: Int;
    full_price: Int as coins;
}

message RemovePack {
    packId: Int;
}



contract SampleBuyPack {
    contract_jettonWallet: Address;
    owner: Address;
    content: Cell;
    packages: map<Int, Int>;

    init(owner: Address, content: Cell, contract_jettonWallet: Address) {
        self.contract_jettonWallet = contract_jettonWallet;
        self.owner = owner;
        self.content = content;
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
        require(context().value >= ton("0.1"), "not enough value");
        // Check the sender is from the Jetton Wallet
        require(context().sender == self.contract_jettonWallet, "not from one of any jetton wallet");
        let buyPackId: Int = buyInfo.forward_payload.loadUint(8);        
        let price: Int = self.packages.get(buyPackId)!!;

        require(price == null, "invalid pack");
        require(price <= buyInfo.amount, "not enough price");
    
        emit(BoughtPackEvent{ packId: buyPackId, buyer: buyInfo.from }.toCell());
    }
} 