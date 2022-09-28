//SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "./ITuringHelper.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "base64-sol/base64.sol";

contract Calculator {

    ITuringHelper public hcHelper;
    string private _hcEndpoint;

    event CalcResult(uint256 result);

    constructor(address turingHelper_, string memory hcEndpoint_) {
        hcHelper = ITuringHelper(turingHelper_);
        _hcEndpoint = hcEndpoint_;
    }

    /// @dev Calculates time dilation according to Einstein's special relativity theory
    function calcTimeDilation(uint256 properTime, uint256 velocity) external {
        bytes memory encRequest = abi.encode(properTime, velocity);
        bytes memory byteRes = hcHelper.TuringTx(_hcEndpoint, encRequest); // TODO: depending on params one might need to use V1

        (uint256 result) = abi.decode(byteRes, (uint256));
        emit CalcResult(result);
    }
}
