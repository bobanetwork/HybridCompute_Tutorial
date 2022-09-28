# Get started

## Testnet setup
1. Deploy your contract by running `yarn run deploy --network boba_rinkeby` and copy the contract address. 
2. Add your contract address into the `set_turing.ts` file by changing the `CONTRACT_CALCULATOR` constant.
3. Deploy and fund Turing Helper: https://docs.boba.network/turing/turing-start
4. **NOTE: During the process you will be asked to add the address of your previously deployed smart contract.**

## Local setup
This assumes you have common toolchains such as node/npm, etc. installed.

1. Clone the boba repository: `git clone git@github.com:bobanetwork/boba.git`
2. Start local stack with `BUILD=0 ./up_local.sh` from within the `/ops` directory.
-> Note for Boba devs: Ensure these Docker images already support the extended payload.
3. Your local stack should be up running.

You can now run your tests by:
1. Copy the `.env.example` file and rename it to `.env`. 
2. If you are just running the tests locally you don't need to adapt anything. Otherwise, update accordingly.
3. Run `yarn` or `npm i` to set up the project.
4. Run `yarn run test:local` or `npm run test:local` to run local tests. 


