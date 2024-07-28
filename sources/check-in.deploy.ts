import { beginCell, contractAddress, toNano, TonClient4, WalletContractV4, internal, fromNano, Address, BitString } from "@ton/ton";
import { mnemonicToPrivateKey } from "ton-crypto";
import { CheckInContract } from './output/checkin_CheckInContract';

import { printSeparator } from "./utils/print";
import * as dotenv from "dotenv";
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

    let public_key_int = BigInt("0x" + deployer_wallet.publicKey.toString('hex'));

    // Compute init data for deployment
    let init = await CheckInContract.init(deployer_wallet_contract.address);
    let checkInAddress = await contractAddress(workchain, init);
    let deployAmount = toNano("0.1");

    // send a message on new address contract to deploy it
    let seqno: number = await deployer_wallet_contract.getSeqno();
    console.log("🛠️Preparing new outgoing massage from deployment wallet. \n" + deployer_wallet_contract.address);
    console.log("Seqno: ", seqno + "\n");
    printSeparator();

    await deployer_wallet_contract.sendTransfer({
        seqno,
        secretKey,
        messages: [
            internal({
                to: checkInAddress,
                value: deployAmount,
                init: init,
                body: null,
            }),
        ],
    })


    

    console.log(`Sent: ${checkInAddress}`)
})();
