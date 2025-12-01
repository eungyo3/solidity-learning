//SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;
import "./ManagedAccess.sol";

interface IMyToken {
    function transferFrom(address from, address to, uint256 amount) external;

    function transfer(uint256 amount, address to) external;

    function mint(uint256 amount, address owner) external;
}

contract TinyBank is ManagedAccess {
    event Staked(address indexed from, uint256 amount);
    event Withdraw(uint256 amount, address indexed to);

    IMyToken public stakingToken;

    mapping(address => uint256) public lastClaimedBlock;

    uint256 public defaultRewardPerBlock = 1 * 10 ** 18;
    uint256 public rewardPerBlock;

    mapping(address => uint256) public staked;
    uint256 public totalStaked;

    constructor(IMyToken _stakingToken) ManagedAccess(msg.sender, msg.sender) {
        stakingToken = _stakingToken;
        rewardPerBlock = defaultRewardPerBlock;
    }

    function setRewardPerBlock(uint256 _amount) external onlyManager {
        rewardPerBlock = _amount;
    }

    modifier updateReward(address to) {
        if (staked[to] > 0) {
            uint256 blocks = block.number - lastClaimedBlock[to];
            uint256 reward = (blocks * rewardPerBlock * staked[to]) /
                totalStaked; //1MT/block
            stakingToken.mint(reward, to);
        }

        lastClaimedBlock[to] = block.number;
        _;
    }

    function stake(uint256 _amount) external updateReward(msg.sender) {
        require(_amount >= 0, "cannot stake 0 amount");
        stakingToken.transferFrom(msg.sender, address(this), _amount);
        staked[msg.sender] += _amount;
        totalStaked += _amount;
        emit Staked(msg.sender, _amount);
    }

    function withdraw(uint256 _amount) external updateReward(msg.sender) {
        require(staked[msg.sender] >= _amount, "insufficient staked token");
        stakingToken.transfer(_amount, msg.sender);
        staked[msg.sender] -= _amount;
        totalStaked -= _amount;

        emit Withdraw(_amount, msg.sender);
    }

    function currentReward(address to) external view returns (uint256) {
        if (staked[to] > 0) {
            uint256 blocks = block.number - lastClaimedBlock[to];
            uint256 reward = (blocks * rewardPerBlock * staked[to]) /
                totalStaked;
            return reward;
        } else {
            return 0;
        }
    }
}
