import hre, { ethers } from "hardhat";
import { ContractFactory, providers, Wallet } from "ethers";
import TuringHelperJson from "../artifacts/contracts/TuringHelper.sol/TuringHelper.json";

const cfg = hre.network.config;


async function main() {
  const CONTRACT_CALCULATOR = process.env.CONTRACT_CALCULATOR ?? '0x______'
  const CONTRACT_HELPER = process.env.CONTRACT_HELPER ?? '0x________'

  const local_provider = new providers.JsonRpcProvider(cfg["url"]);
  const testPrivateKey = process.env.PRIVATE_KEY ?? "0x___________";
  const testWallet = new Wallet(testPrivateKey, local_provider);

  const Factory__Calculator = await ethers.getContractFactory("Calculator");
  const calculatorContract = Factory__Calculator.attach(CONTRACT_CALCULATOR);

  console.log("Calculator found at", calculatorContract.address);


  const Factory__Helper = new ContractFactory(
      TuringHelperJson.abi,
      TuringHelperJson.bytecode, testWallet);

  const helper = Factory__Helper.attach(CONTRACT_HELPER);

  const tx = await calculatorContract.setTuringHelper(helper.address)
  const res = await tx.wait()

  console.log("Have set TuringHelper address to", helper.address)
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
