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


  const Factory__Helper = await ethers.getContractFactory("TuringHelper");
  const helper = Factory__Helper.attach(CONTRACT_HELPER);

  const owner = await helper.owner();
  console.log("OWNER: ", owner)

  const tx = await helper.addPermittedCaller(CONTRACT_CALCULATOR)
  const res = await tx.wait()

  console.log("Have added new contract address", CONTRACT_CALCULATOR, "to helper: ", helper.address)
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
