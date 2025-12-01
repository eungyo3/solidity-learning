//SPDX-License-Identifier:MIT
pragma solidity ^0.8.24;

abstract contract MultiManagedAccess {
    uint constant MANAGER_NUMBERS = 5;
    address public owner;
    address[MANAGER_NUMBERS] public managers;
    bool[MANAGER_NUMBERS] public confirmed;

    //manager0 --> confirmed0
    //manager1 --> confirmed1
    // ...

    constructor(address _owner, address[MANAGER_NUMBERS] memory _managers) {
        owner = _owner;
        for (uint256 i = 0; i < MANAGER_NUMBERS; i++) {
            managers[i] = _managers[i];
        }
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "You are not authorized");
        _;
    }

    function reset() internal {
        for (uint i = 0; i < MANAGER_NUMBERS; i++) {
            confirmed[i] = false;
        }
    }

    modifier onlyManager() {
        bool found = false;
        for (uint i = 0; i < MANAGER_NUMBERS; i++) {
            if (msg.sender == managers[i]) {
                found = true;
                break;
            }
        }
        require(found, "You are not a manager");
        _;
    }

    modifier onlyAllConfirmed() {
        require(allConfirmed(), "Not all confirmed yet");
        _;
    }

    function allConfirmed() internal view returns (bool) {
        for (uint i = 0; i < MANAGER_NUMBERS; i++) {
            if (!confirmed[i]) {
                return false;
            }
        }
        return true;
    }

    function confirm() external {
        bool found = false;
        for (uint i = 0; i < MANAGER_NUMBERS; i++) {
            if (msg.sender == managers[i]) {
                confirmed[i] = true;
                found = true;
                break;
            }
        }
        require(found, "You are not a manager");
    }
}
