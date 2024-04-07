import { beginCell, contractAddress, toNano, TonClient4, WalletContractV4, internal, fromNano, Address, external } from "@ton/ton";
import { mnemonicToPrivateKey } from "ton-crypto";
import { buildOnchainMetadata } from "./utils/jetton-helpers";
import {SampleJetton, storeMint} from './output/SampleJetton_SampleJetton'
import { JettonDefaultWallet, storeTokenTransfer } from './output/SampleJetton_JettonDefaultWallet'
import { SampleBuyPack } from './output/SampleJetton_SampleBuyPack'


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
    console.log(deployer_wallet.address);

    let deployer_wallet_contract = client4.open(deployer_wallet);

    const jettonParams = {
        name: "AquaChilling Token",
        description: "Testing Aqua Token",
        symbol: "AQUA",
        image: "https://test.aquachilling.com/logo.svg",
    };

    const buypackParams = {
        name: "AquaChilling Saler",
        description: "Testing Aqua Saler Testing contract",
        symbol: "Seller",
        image: "https://test.aquachilling.com/logo.svg",
    };
    const buypackContent = buildOnchainMetadata(buypackParams);

    // Create content Cell
    let content = buildOnchainMetadata(jettonParams);
    let max_supply = toNano(123456766689011); // 🔴 Set the specific total supply in nano

    // Compute init data for deployment
    // NOTICE: the parameters inside the init functions were the input for the contract address
    // which means any changes will change the smart contract address as well
    let init = await SampleJetton.init(deployer_wallet_contract.address, content, max_supply);
    let jettonMaster = contractAddress(workchain, init);

    let wallet_init = await JettonDefaultWallet.init(jettonMaster, deployer_wallet_contract.address);
    let walletMaster = await contractAddress(workchain, wallet_init);
    let buypackInit = await SampleBuyPack.init(deployer_wallet_contract.address, buypackContent);
    let buyPackAddress = await contractAddress(workchain, buypackInit);
    let deployAmount = toNano("0.15");

    let supply = toNano(1000000000); // 🔴 Specify total supply in nano
    let packed_msg = beginCell()
        .store(
            storeMint({
                $$type: "Mint",
                amount: supply,
                receiver: deployer_wallet_contract.address,
            })
        )
        .endCell();
    const test_message_left = beginCell()
        .storeUint(1, 8)
        .endCell();
    let packed = beginCell()
        .store(
            storeTokenTransfer({
                $$type: "TokenTransfer",
                queryId: 0n,
                amount: toNano(1000),
                destination: Address.parse('kQCxmPSJeq_Eq6IHJwswWQtkVwQm41HLuflk4t0Z0edNUcCf'),
                response_destination: deployer_wallet_contract.address, // Original Owner, aka. First Minter's Jetton Wallet
                custom_payload: null,
                forward_ton_amount: toNano("0.1"),
                forward_payload: test_message_left,
            })
        )
        .endCell();

    // send a message on new address contract to deploy it
    let seqno: number = await deployer_wallet_contract.getSeqno();
    console.log("🛠️Preparing new outgoing massage from deployment wallet. \n" + deployer_wallet_contract.address);
    console.log("Seqno: ", seqno + "\n");
    printSeparator();

    // Get deployment wallet balance
    let balance: bigint = await deployer_wallet_contract.getBalance();

    console.log("Current deployment wallet balance = ", fromNano(balance).toString(), "💎TON");
    console.log("Minting:: ", fromNano(supply));
    printSeparator();

    console.log('master:: ', buyPackAddress)

    // await deployer_wallet_contract.sendTransfer({
    //     seqno,
    //     secretKey,
    //     messages: [
    //         internal({
    //             to: jettonMaster,
    //             value: deployAmount,
    //             init: {
    //                 code: init.code,
    //                 data: init.data,
    //             },
    //             body: packed_msg,
    //         }),
    //     ],
    // });
    await deployer_wallet_contract.sendTransfer({
        seqno,
        secretKey,
        messages: [
            internal({
                to: walletMaster,
                value: deployAmount,
                init: null,
                body: packed,
                bounce: false,
            }),
        ],
    });
    console.log("====== Deployment message sent to =======\n", walletMaster);
})();