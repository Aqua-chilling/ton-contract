import { beginCell, contractAddress, toNano, TonClient4, WalletContractV4, internal, fromNano, Address, external } from "@ton/ton";
import { mnemonicToPrivateKey } from "ton-crypto";
import { buildOnchainMetadata } from "./utils/jetton-helpers";
import {SampleJetton, storeMint, storeTokenTransferInternal} from './output/SampleJetton_SampleJetton'
import { JettonDefaultWallet, storeTokenTransfer } from './output/AquaJetton_JettonDefaultWallet'
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
        name: "Test Ton farm",
        description: "Test Ton farm",
        symbol: "TTT",
        image: "https://aquachilling.com/logo.svg",
    };

    
    // Create content Cell
    let content = buildOnchainMetadata(jettonParams);
    let max_supply = toNano(1_000_000_000); // 🔴 Set the specific total supply in nano

    // Compute init data for deployment
    // NOTICE: the parameters inside the init functions were the input for the contract address
    // which means any changes will change the smart contract address as well
    let init = await SampleJetton.init(deployer_wallet_contract.address, content, max_supply);
    let jettonMaster = contractAddress(workchain, init);

    let wallet_init = await JettonDefaultWallet.init(jettonMaster, Address.parse('EQA5Cj_BSGgwLsIaqPFQRh5gmiNjFg5TH21taTzFvYouXlPx'));
    let walletMaster = await contractAddress(workchain, wallet_init);

    let wallet_init1 = await JettonDefaultWallet.init(jettonMaster, deployer_wallet_contract.address);
    let walletMaster1 = await contractAddress(workchain, wallet_init1);
    let deployAmount = toNano("0.5");

    

    // send a message on new address contract to deploy it
    let seqno: number = await deployer_wallet_contract.getSeqno();
    console.log("🛠️Preparing new outgoing massage from deployment wallet. \n" + deployer_wallet_contract.address);
    console.log("Seqno: ", seqno + "\n");
    printSeparator();

    // Get deployment wallet balance
    let balance: bigint = await deployer_wallet_contract.getBalance();

    console.log("Current deployment wallet balance = ", fromNano(balance).toString(), "💎TON");
    printSeparator();

    console.log('master:: ', jettonMaster);

    let mint = beginCell()
    .store(
        storeMint({
            $$type: "Mint",
            receiver: deployer_wallet.address,
            amount: toNano(1_000_000_000)
        })
    ).endCell()

    let forward_string_test = beginCell().storeAddress(deployer_wallet.address).endCell();

    // await deployer_wallet_contract.sendTransfer({
    //     seqno,
    //     secretKey,
    //     messages: [
    //         internal({
    //             to: Address.parse('kQBMKgc9da6lUPQEvO_PHVBtIBXNpORMzqEy77TtXOumHe9T'),
    //             value: deployAmount,
    //             init: null,
    //             body: null,
    //         }),
    //     ],
    // });
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
    console.log("====== Deployment message sent to =======\n", jettonMaster, walletMaster, walletMaster1);
})();