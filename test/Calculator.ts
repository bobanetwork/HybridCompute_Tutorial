import {Contract, ContractFactory, providers, Wallet, utils} from 'ethers'
import chai, { expect } from 'chai'
import { solidity } from 'ethereum-waffle'
chai.use(solidity)
import * as request from 'request-promise-native'
import hre, { ethers, upgrades } from "hardhat";
import CalculatorJson from "../artifacts/contracts/Calculator.sol/Calculator.json"
import TuringHelperJson from "../artifacts/contracts/TuringHelper.sol/TuringHelper.json"
import L2GovernanceERC20Json from '../abi/L2GovernanceERC20.json'
import BobaTuringCreditJson from '../abi/BobaTuringCredit.json'
import * as process from "process";

const cfg = hre.network.config

const PYTHON_COMMAND = 'python3'
const USE_LOCAL_BACKEND = true
const hPort = 1235 // Port for local HTTP server
let localTuringUrl;
const gasOverride =  { gasLimit: 3_000_000 }

let Factory__Helper: ContractFactory

let calcContract: Contract
let helper: Contract
let turingCredit: Contract
let L2BOBAToken: Contract
let addressesBOBA

const local_provider = new providers.JsonRpcProvider(cfg['url'])

let BOBAL2Address;
let BobaTuringCreditAddress;
const testPrivateKey = hre.network.name === 'boba_local' ? process.env.LOCAL_PRIVATE_KEY : process.env.PRIVATE_KEY ?? '0x___________'
const testWallet = new Wallet(testPrivateKey, local_provider)

// convenience method for readability
const oldConsole = console.log
console.log = (message?: any, ...optionalParams: any[]) => oldConsole(`--> ${message}`, optionalParams)

describe("Calculator", () => {

  //#region setup
  const loadPythonResult = (params) => {
    // console.log("Loading python script..", params)
    const {spawn, execSync} = require('child_process');
    return new Promise((resolve , reject) => {
      const childPython = spawn(PYTHON_COMMAND ,['./aws/run-local-server.py', params]);
      let result = '';
      childPython.stdout.on(`data` , (data) => {
        result += data.toString();
        // console.log("Python: got data -> ", result)
      });

      childPython.on('close' , function(code) {
        // console.log("Python: Child process exited with result & code -> ", result, code)
        resolve(result)
      });

      childPython.stderr.on('data', (err) => {
        console.error('Python error stderr: ', err.toString())
      })

      childPython.on('error' , function(err){
        console.error("Python error: ", err)
        reject(err)
      });

    })
  }

  const createServer = () => {
    const http = require('http');
    const ip = require("ip");

    const server = module.exports = http.createServer(async function (req, res) {

      if (req.headers['content-type'] === 'application/json') {

        let bodyStr = '';

        req.on('data', chunk => {
          bodyStr += chunk.toString()
        })

        req.on('end', async () => {

          let jBody = JSON.stringify({body: bodyStr, logs: false})

          // console.log("Local server request: ", jBody, req.url)
          let result

          if (req.url === "/test") {
            result = (await loadPythonResult(jBody) as string).replace('\r\n', '') // load Python directly, since examples are currently in Python & to have common test-base
          } else {
            throw new Error('Invalid route: ' + req.route)
          }

          //console.log("Returned object: ", result)

          let jResp2 = {
            id: JSON.parse(bodyStr).id,
            jsonrpc: "2.0",
            result: JSON.parse(JSON.parse(result).body).result
          }

          console.log("Response local: ", JSON.stringify(jResp2))

          res.end(JSON.stringify(jResp2))
          server.emit('success', bodyStr)

        });

      } else {
        console.log("Other request:", req)
        res.writeHead(400, {'Content-Type': 'text/plain'})
        res.end('Expected content-type: application/json')
      }
    }).listen(hPort);

    // Get a non-localhost IP address of the local machine, as the target for the off-chain request
    const urlBase = "http://" + ip.address() + ":" + hPort
    localTuringUrl = urlBase + "/test"

    console.log("    Created local HTTP server at", localTuringUrl)
  }

  before(async () => {

    if (USE_LOCAL_BACKEND) {
      createServer()
    }

    if (hre.network.name === 'boba_rinkeby') {
      BOBAL2Address = '0xF5B97a4860c1D81A1e915C40EcCB5E4a5E6b8309'
      BobaTuringCreditAddress = '0x208c3CE906cd85362bd29467819d3AcbE5FC1614'
    } else if (hre.network.name === 'boba_mainnet') {
      BOBAL2Address = '0x_________________'
      BobaTuringCreditAddress = '0x___________________'
    } else {
      const result = await request.get({
        uri: 'http://127.0.0.1:8080/boba-addr.json',
      })
      addressesBOBA = JSON.parse(result)
      BOBAL2Address = addressesBOBA.TOKENS.BOBA.L2
      BobaTuringCreditAddress = addressesBOBA.BobaTuringCredit
    }

    console.error(`Using Token ${BOBAL2Address}, TuringCredit ${BobaTuringCreditAddress}`)


    // Deploy your Turing Helper
    Factory__Helper = new ContractFactory(
      TuringHelperJson.abi,
      TuringHelperJson.bytecode,
      testWallet)

    helper = await Factory__Helper.deploy()
    helper = await helper.deployed()
    console.log("Turing Helper contract deployed at", helper.address)

    const CalculatorFactory = new ContractFactory(
      CalculatorJson.abi,
      CalculatorJson.bytecode,
      testWallet,
    );
    calcContract = await CalculatorFactory.deploy(helper.address,
        USE_LOCAL_BACKEND ? localTuringUrl : "https://{YOUR_ID}.execute-api.{YOUR_REGION}.amazonaws.com/Prod/");
    calcContract = await calcContract.deployed();

    console.log("Calculator deployed at", calcContract.address);


    // white list your contract in your helper
    // this is for your own security, so that only your contract can call your helper
    const tr1 = await helper.addPermittedCaller(calcContract.address)
    const res1 = await tr1.wait()
    console.log("adding your contract as PermittedCaller to TuringHelper", res1.events[0].data)

    L2BOBAToken = new Contract(
      BOBAL2Address,
      L2GovernanceERC20Json.abi,
      testWallet
    )

    turingCredit = new ContractFactory(
      BobaTuringCreditJson.abi,
      BobaTuringCreditJson.bytecode,
      testWallet).attach(BobaTuringCreditAddress)

  })
  //#endregion

  it('Should register and fund your Turing helper contract in turingCredit', async () => {

    const depositAmount = utils.parseEther('1')

    const bobaBalance = await L2BOBAToken.balanceOf(testWallet.address)
    console.log("BOBA Balance in your account", bobaBalance.toString())

    const approveTx = await L2BOBAToken.approve(
      turingCredit.address,
      depositAmount
    )
    await approveTx.wait()

    const depositTx = await turingCredit.addBalanceTo(
      depositAmount,
      helper.address,
    )
    await depositTx.wait()

    const postBalance = await turingCredit.prepaidBalance(
      helper.address
    )

  })

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

