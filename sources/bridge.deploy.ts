import { beginCell, contractAddress, toNano, TonClient4, WalletContractV4, internal, fromNano, Address } from "@ton/ton";
import { mnemonicToPrivateKey } from "ton-crypto";
import { buildOnchainMetadata } from "./utils/jetton-helpers";

import { SampleJetton, storeTokenTransfer } from "./output/SampleJetton_SampleJetton";

import { printSeparator } from "./utils/print";
import * as dotenv from "dotenv";
import { SampleBridgeContract, storeDepositData } from "./output/SampleBridge_SampleBridgeContract";
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

    let deployer_wallet_contract = client4.open(deployer_wallet);
    let init = await SampleBridgeContract.init(deployer_wallet_contract.address);
    let bridgeAddress = await contractAddress(workchain, init);
    // send a message on new address contract to deploy it
    let seqno: number = await deployer_wallet_contract.getSeqno();
    console.log("🛠️Preparing new outgoing massage from deployment wallet. \n" + deployer_wallet_contract.address);
    console.log("Seqno: ", seqno + "\n");
    printSeparator();

    // Get deployment wallet balance
    let balance: bigint = await deployer_wallet_contract.getBalance();

    console.log("Current deployment wallet balance = ", fromNano(balance).toString(), "💎TON");
    console.log("Deploying contract...... ");
    printSeparator();

    // await deployer_wallet_contract.sendTransfer({
    //     seqno,
    //     secretKey,
    //     messages: [
    //         internal({to: bridgeAddress, value: toNano('0.1'), init: {code: init.code, data: init.data}, body: null}),
    //     ]
    // })
    
    let deposit_msg = beginCell().store(
        storeDepositData({
            $$type: "DepositData",
            queryId: 1n,
            response_destination: deployer_wallet_contract.address,
            receiver: deployer_wallet_contract.address
        })
    )
    .endCell() 
    
    await deployer_wallet_contract.sendTransfer({
        seqno,
        secretKey,
        messages: [
            internal({
                to: bridgeAddress,
                value: toNano('0.4'),
                init: null,
                body: deposit_msg,
            }),
        ],
    });
    console.log("====== Deployment message sent to =======\n", bridgeAddress);
})();
