import hre, { ethers } from "hardhat";
import {providers, Wallet} from "ethers";

const cfg = hre.network.config;

async function main() {

  const local_provider = new providers.JsonRpcProvider(cfg["url"]);
  const testPrivateKey = process.env.PRIVATE_KEY ?? "0x___________";
  const testWallet = new Wallet(testPrivateKey, local_provider);

  const Factory__Calculator = await ethers.getContractFactory("Calculator");
  const calculatorContract = await Factory__Calculator.deploy("https://q8v29dik8g.execute-api.us-east-1.amazonaws.com/Prod/"); // this is our example endpoint for this workshop
  await calculatorContract.deployed();

  console.log("Calculator deployed at", calculatorContract.address);
  console.log("You can now set up your TuringHelper and execute 'set_turing.ts' afterwards.")
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});