import { beginCell, contractAddress, toNano, TonClient4, WalletContractV4, internal, fromNano, Address } from "@ton/ton";
import { mnemonicToPrivateKey } from "ton-crypto";
import { buildOnchainMetadata } from "./utils/jetton-helpers";

import { BuyPackContract, storeBuyPack, storeCreatePack, storeUpdateJettonWallet } from "./output/SampleJetton_BuyPackContract";
import { SampleJetton, storeTokenTransfer } from "./output/SampleJetton_SampleJetton";

import { printSeparator } from "./utils/print";
import * as dotenv from "dotenv";
import { JettonDefaultWallet } from "./output/SampleJetton_JettonDefaultWallet";
import * as nacl from 'ton-crypto'
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
    console.log('keypair', keyPair.publicKey.toString())
    console.log(deployer_wallet.address);

    let deployer_wallet_contract = client4.open(deployer_wallet);
    let max_supply = toNano(123456766689011); // 🔴 Set the specific total supply in nano

    const jettonParams = {
        name: "Test2 Aqua",
        description: "Testing Aqua Token",
        symbol: "AQUA",
        image: "https://test.aquachilling.com/logo.svg",
    };

    // Compute init data for deployment
    // NOTICE: the parameters inside the init functions were the input for the contract address
    // which means any changes will change the smart contract address as well
    let init = await BuyPackContract.init(deployer_wallet_contract.address);
    let buyPackAddress = await contractAddress(workchain, init);

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

    let pack0 = beginCell()
    .store(
        storeCreatePack({
            $$type: "CreatePack",
            packId: 0n,
            full_price: toNano('0'),
        })
    ).endCell()

    let pack1 = beginCell()
    .store(
        storeCreatePack({
            $$type: "CreatePack",
            packId: 1n,
            full_price: toNano('0.1'),
        })
    ).endCell()

    let pack2 = beginCell()
    .store(
        storeCreatePack({
            $$type: "CreatePack",
            packId: 2n,
            full_price: toNano('0.18'),
        })
    ).endCell()

    let pack3 = beginCell()
    .store(
        storeCreatePack({
            $$type: "CreatePack",
            packId: 3n,
            full_price: toNano('0.64'),
        })
    ).endCell()

    let pack4 = beginCell()
    .store(
        storeCreatePack({
            $$type: "CreatePack",
            packId: 4n,
            full_price: toNano('1.99'),
        })
    ).endCell()

    let pack5 = beginCell()
    .store(
        storeCreatePack({
            $$type: "CreatePack",
            packId: 5n,
            full_price: toNano('3.4'),
        })
    ).endCell()

    let pack6 = beginCell()
    .store(
        storeCreatePack({
            $$type: "CreatePack",
            packId: 6n,
            full_price: toNano('7.38'),
        })
    ).endCell()
    
    let buyPackBody = beginCell().store(
        storeBuyPack({
            $$type: "BuyPack",
            queryId: 1n,
            packId: 1n,
            response_destination: deployer_wallet_contract.address,
            amount: 3n,
        })
    )
    .endCell() 
    
    await deployer_wallet_contract.sendTransfer({
        seqno,
        secretKey,
        messages: [
            internal({
                to: buyPackAddress,
                value: toNano('1'),
                init: null,
                body: buyPackBody,
            }),
        ],
    });
    console.log("====== Deployment message sent to =======\n", buyPackAddress);
})();
