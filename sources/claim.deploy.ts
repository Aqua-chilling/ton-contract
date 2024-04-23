import { beginCell, contractAddress, toNano, TonClient4, WalletContractV4, internal, fromNano, Address, BitString } from "@ton/ton";
import { mnemonicToPrivateKey } from "ton-crypto";
import { buildOnchainMetadata } from "./utils/jetton-helpers";

import { SampleBuyPack, storeBuyPack, storeCreatePack, storeUpdateJettonWallet } from "./output/SampleJetton_SampleBuyPack";
import { SampleJetton, storeTokenTransfer } from "./output/SampleJetton_SampleJetton";

import { printSeparator } from "./utils/print";
import * as dotenv from "dotenv";
import { JettonDefaultWallet } from "./output/SampleJetton_JettonDefaultWallet";
import * as nacl from 'ton-crypto'
import { SampleClaimContract, storeClaimInfo } from './output/SampleClaim_SampleClaimContract'
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


    let jettonContent = buildOnchainMetadata(jettonParams);
    console.log('key',keyPair.publicKey.toString('hex'));

    let public_key_int = BigInt("0x" + deployer_wallet.publicKey.toString('hex'));

    // Compute init data for deployment
    let init = await SampleClaimContract.init(deployer_wallet_contract.address, public_key_int);
    let claimAddress = await contractAddress(workchain, init);
    let jetton_init = await SampleJetton.init(deployer_wallet_contract.address, jettonContent, max_supply);
    let jettonMaster = await contractAddress(workchain, jetton_init);

    let wallet_init = await JettonDefaultWallet.init(jettonMaster, deployer_wallet.address);
    let walletMaster = await contractAddress(workchain, wallet_init);
    let wallet_claim_init = await JettonDefaultWallet.init(jettonMaster, claimAddress);
    let walletClaimMaster = await contractAddress(workchain, wallet_claim_init);
    let deployAmount = toNano("0.15");

    // send a message on new address contract to deploy it
    let seqno: number = await deployer_wallet_contract.getSeqno();
    console.log("🛠️Preparing new outgoing massage from deployment wallet. \n" + deployer_wallet_contract.address);
    console.log("Seqno: ", seqno + "\n");
    printSeparator();

    // Get deployment wallet balance
    let balance: bigint = await deployer_wallet_contract.getBalance();
    let updateJettonMessage = beginCell()
        .store(
            storeUpdateJettonWallet({
                $$type: "UpdateJettonWallet",
                contract_jettonWallet: walletClaimMaster
            })
        )
    .endCell();

    // console.log(`Deploying contract to ${claimAddress.toString()}, ${jettonMaster.toString()}`);
    // await deployer_wallet_contract.sendTransfer({
    //     seqno,
    //     secretKey,
    //     messages: [
    //         internal({
    //             to: claimAddress,
    //             value: deployAmount,
    //             init: {
    //                 code: init.code,
    //                 data: init.data,
    //             },
    //             body: updateJettonMessage,
    //         }),
    //     ],
    // });

    // console.log(`Send token ${deployer_wallet.address} to contract claim ${claimAddress.toString()}, ${walletMaster.toString()}`);
    // let packed = beginCell()
    //     .store(
    //         storeTokenTransfer({
    //             $$type: "TokenTransfer",
    //             queryId: 0n,
    //             amount: toNano(100000),
    //             destination: claimAddress,
    //             response_destination: deployer_wallet_contract.address,
    //             custom_payload: null,
    //             forward_ton_amount: 0n,
    //             forward_payload: beginCell().endCell(),
    //         })
    //     )
    // .endCell();

    // await deployer_wallet_contract.sendTransfer({
    //     seqno,
    //     secretKey,
    //     messages: [
    //         internal({
    //             to: walletMaster,
    //             value: deployAmount,
    //             init: null,
    //             body: packed,
    //             bounce: true,
    //         }),
    //     ],
    // });

    console.log('Generating signature....')
    const signatureData = beginCell()
      .storeUint(1n, 256)
      .storeUint(toNano('10'), 256)
      .storeAddress(deployer_wallet_contract.address)
      .endCell()
    const signature = nacl.sign(signatureData.hash(), secretKey);
    console.log(`Signature: ${signature.toString('base64')}, hash: ${signatureData.hash().toString('base64')}`);

    console.log(`claiming data ${claimAddress.toString()}`);
    let claimMessage = beginCell()
        .store(
            storeClaimInfo({
                $$type: "ClaimInfo",
                data: signatureData,
                signature: beginCell().storeBits(new BitString(signature, 0, 512)).endCell(),
            })
        )
    .endCell();

    await deployer_wallet_contract.sendTransfer({
        seqno,
        secretKey,
        messages: [
            internal({
                to: claimAddress,
                value: deployAmount,
                init: null,
                body: claimMessage,
                bounce: true,
            }),
        ],
    })
})();
