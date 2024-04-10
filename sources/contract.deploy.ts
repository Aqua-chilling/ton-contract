import { beginCell, contractAddress, toNano, TonClient4, WalletContractV4, internal, fromNano, Address } from "@ton/ton";
import { mnemonicToPrivateKey } from "ton-crypto";
import { buildOnchainMetadata } from "./utils/jetton-helpers";

import { SampleBuyPack, storeBuyPack, storeCreatePack, storeUpdateJettonWallet } from "./output/SampleJetton_SampleBuyPack";
import { SampleJetton, storeTokenTransfer } from "./output/SampleJetton_SampleJetton";

import { printSeparator } from "./utils/print";
import * as dotenv from "dotenv";
import { JettonDefaultWallet } from "./output/SampleJetton_JettonDefaultWallet";
dotenv.config();

(async () => {
    //create client for testnet sandboxv4 API - alternative endpoint
    const client4 = new TonClient4({
        endpoint: "https://sandbox-v4.tonhubapi.com",
        // endpoint: "https://mainnet-v4.tonhubapi.com",
    });

    let mnemonics = (process.env.MNEMONICS || "").toString(); // 🔴 Change to your own, by creating .env file!
    let keyPair = await mnemonicToPrivateKey(mnemonics.split(" "));
    let secretKey = keyPair.secretKey;
    let workchain = 0; //we are working in basechain.
    let deployer_wallet = WalletContractV4.create({ workchain, publicKey: keyPair.publicKey });
    console.log(deployer_wallet.address);

    let deployer_wallet_contract = client4.open(deployer_wallet);
    let max_supply = toNano(123456766689011); // 🔴 Set the specific total supply in nano

    const jettonParams = {
        name: "Test2 Aqua",
        description: "Testing Aqua Token",
        symbol: "AQUA",
        image: "https://test.aquachilling.com/logo.svg",
    };

    const buypackParams = {
        name: "Test4 Aqua",
        description: "Testing Aqua Saler Testing contract",
        symbol: "Seller",
        image: "https://test.aquachilling.com/logo.svg",
    };

    // Create content Cell
    let content = buildOnchainMetadata(buypackParams);

    let jettonContent = buildOnchainMetadata(jettonParams)

    // Compute init data for deployment
    // NOTICE: the parameters inside the init functions were the input for the contract address
    // which means any changes will change the smart contract address as well
    let init = await SampleBuyPack.init(deployer_wallet_contract.address, content);
    let buyPackAddress = await contractAddress(workchain, init);
    let jetton_init = await SampleJetton.init(deployer_wallet_contract.address, jettonContent, max_supply);
    let jettonMaster = await contractAddress(workchain, jetton_init);

    let wallet_init = await JettonDefaultWallet.init(jettonMaster, buyPackAddress);
    let walletMaster = await contractAddress(workchain, wallet_init);
    let deployAmount = toNano("0.15");

    // send a message on new address contract to deploy it
    let seqno: number = await deployer_wallet_contract.getSeqno();
    console.log("🛠️Preparing new outgoing massage from deployment wallet. \n" + deployer_wallet_contract.address);
    console.log("Seqno: ", seqno + "\n");
    printSeparator();

    // Get deployment wallet balance
    let balance: bigint = await deployer_wallet_contract.getBalance();

    console.log("Current deployment wallet balance = ", fromNano(balance).toString(), "💎TON");
    console.log("Creating pack::.... ");
    printSeparator();

    let packed_msg = beginCell()
    .store(
        storeCreatePack({
            $$type: "CreatePack",
            packId: 1n,
            full_price: toNano('0.01'),
        })
    ).endCell()
    let msg = beginCell().store(storeUpdateJettonWallet({
        $$type: "UpdateJettonWallet",
        contract_jettonWallet: walletMaster
    }))
    .endCell();
    let custom_msg = beginCell().store(
        storeBuyPack({
            $$type: "BuyPack",
            queryId: 1n,
            packId: 1n,
            response_destination: deployer_wallet_contract.address,
        })
    )
    .endCell() 
    await deployer_wallet_contract.sendTransfer({
        seqno,
        secretKey,
        messages: [
            internal({
                to: buyPackAddress,
                value: toNano('0.5'),
                init: null,
                body: custom_msg,
            }),
        ],
    });
    console.log("====== Deployment message sent to =======\n", buyPackAddress);
})();
