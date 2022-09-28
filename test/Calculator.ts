import {Contract, ContractFactory, providers, Wallet} from 'ethers'
import chai, { expect } from 'chai'
import { solidity } from 'ethereum-waffle'
chai.use(solidity)
import hre  from "hardhat";
import CalculatorJson from "../artifacts/contracts/Calculator.sol/Calculator.json"
import TuringHelperJson from "../artifacts/contracts/TuringHelper.sol/TuringHelper.json"
import * as process from "process";

const cfg = hre.network.config

const gasOverride =  { gasLimit: 3_000_000 }

let Factory__Helper: ContractFactory

let calcContract: Contract
let helper: Contract

const local_provider = new providers.JsonRpcProvider(cfg['url'])

const CONTRACT_CALCULATOR = process.env.CONTRACT_CALCULATOR ?? '0x______'
const CONTRACT_HELPER = process.env.CONTRACT_HELPER ?? '0x________'

const testPrivateKey = hre.network.name === 'boba_local' ? process.env.LOCAL_PRIVATE_KEY : process.env.PRIVATE_KEY ?? '0x___________'
const testWallet = new Wallet(testPrivateKey, local_provider)

// convenience method for readability
const oldConsole = console.log
console.log = (message?: any, ...optionalParams: any[]) => oldConsole(`--> ${message}`, optionalParams)

describe("Calculator", () => {

  //#region setup

  before(async () => {

    // Deploy your Turing Helper
    Factory__Helper = new ContractFactory(
        TuringHelperJson.abi,
        TuringHelperJson.bytecode,
        testWallet)

    helper = Factory__Helper.attach(CONTRACT_HELPER)
    console.log("Turing Helper contract deployed at", helper.address)

    const CalculatorFactory = new ContractFactory(
        CalculatorJson.abi,
        CalculatorJson.bytecode,
        testWallet,
    );
    calcContract = CalculatorFactory.attach(CONTRACT_CALCULATOR)

    console.log("Calculator deployed at", calcContract.address);
  })

  //#endregion

  it("Your contract should be whitelisted", async () => {
    const tr2 = await helper.checkPermittedCaller(calcContract.address, gasOverride)
    const res2 = await tr2.wait()
    const rawData = res2.events[0].data
    const result = parseInt(rawData.slice(-64), 16)
    expect(result).to.equal(1)
    console.log("Contract whitelisted in TuringHelper (1 = yes)?", result)
  })

  it('Calculate time dilation acc. to Einstein\'s special relativity theory', async () => {
    const properTime = 15;
    const velocity = 299792; // almost light speed

    await calcContract.estimateGas.calcTimeDilation(properTime, velocity, gasOverride)
    const tx = calcContract.calcTimeDilation(properTime, velocity, gasOverride)
    await expect(tx).to.emit(calcContract, "CalcResult").withArgs(8581318860107011)

    const newTime = 8_581_318_860_107_011 / 1_000_000_000_000;
    const timeDilation = newTime - properTime;

    console.log(`Time dilation for properTime: ${timeDilation}`)
  })

})

