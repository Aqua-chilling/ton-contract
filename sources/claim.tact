import "./jetton.tact";
import "./messages.tact";


message(0xab35b679) ClaimInfo {
    data: Slice;
    signature: Slice;
}

message(0x8bfebb71) UpdateJetton {
    contract_jettonWallet: Address;
}

contract SampleClaimContract {
    const minTonsForStorage: Int = ton("0.01");
    const gasConsumption: Int = ton("0.01");

    contract_jettonWallet: Address?;
    owner: Address;
    public_key: Int;
    ENTERED: Bool;
    claimedIds: map<Int, Bool>;
    
    init(owner: Address, public_key: Int) {
        self.owner = owner;
        self.public_key = public_key;
        self.ENTERED = false;
    }

    receive(info: UpdateJetton) {
        let ctx: Context = context();
        require(ctx.sender == self.owner, "Not owner");
        
        self.contract_jettonWallet = info.contract_jettonWallet;
    }

    receive(info: ClaimInfo) {
        require(!self.ENTERED, "entered");
        let ctx: Context = context();
        let data: Slice = info.data;
        let claimId: Int = data.loadUint(256);
        let amount: Int = data.loadUint(256);
        let receiver: Address = data.loadAddress();
        let signature: Slice = info.signature;
        let sliceHash: Slice = beginCell().storeUint(claimId, 256).storeUint(amount, 256).storeAddress(receiver).endCell().asSlice();


        let isClaimed: Bool? = self.claimedIds.get(claimId);
        require(isClaimed == null, "id claimed");
        self.ENTERED = true;

        require(receiver == ctx.sender, "invalid receiver");

        let isValid: Bool = checkSignature(sliceHash.hash(), signature.loadBits(512), self.public_key);
        require(isValid, "invalid signer");
        send(SendParameters{
            to: self.contract_jettonWallet!!,
            value: 0,
            mode: SendRemainingValue,
            bounce: false, 
            body: TokenTransfer{
                queryId: 0,
                amount: amount,
                destination: context().sender,
                response_destination: receiver,
                custom_payload: null,
                forward_ton_amount: 0,
                forward_payload: emptySlice()
            }.toCell()
        });
        self.claimedIds.set(claimId, true);
        self.ENTERED = false;

        emit(ClaimEvent{ claimId: claimId, amount: amount }.toCell());
    }

} 