// staking
// deposit(MyToken) / withdraw(MyToken)
// - user --> deposit --> TinyBank --> tranfer(user --> TinyBank)

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;
import "./ManagedAccess.sol";

interface IMyToken {
    function transferFrom(address from, address to, uint256 amount) external;

    function transfer(uint256 amount, address to) external;

    function mint(uint256 amount, address owner) external;
}

contract TinyBank is ManagedAccess {
    event Staked(address from, uint256 amount);
    event Withdraw(uint256 amount, address to);

    IMyToken public stakingToken; //MyToken contract type

    mapping(address => uint256) public lastClaimedBlock; //유저가 지금까지 받은 보상

    uint256 public defaultRewardPerBlock = 1 * 10 ** 18;
    uint256 public rewardPerBlock;

    mapping(address => uint256) public staked; //누가 얼마 예치했는지
    uint256 public totalStaked; //전체 예치된 양

    constructor(IMyToken _stakingToken) ManagedAccess(msg.sender, msg.sender) {
        stakingToken = _stakingToken;
        rewardPerBlock = defaultRewardPerBlock;
    }

    function setRewardPerBlock(uint256 _amount) external onlyManager {
        /////////////////////////////////////////////////////////////
        rewardPerBlock = _amount;
    }

    //who, when?
    // genesis staking
    modifier updateReward(address to) {
        //internel
        if (staked[to] > 0) {
            uint256 blocks = block.number - lastClaimedBlock[to];
            uint256 reward = (blocks * rewardPerBlock * staked[to]) /
                totalStaked; //1MT/block
            stakingToken.mint(reward, to); //MyToken contract의 mint 호출
        }

        lastClaimedBlock[to] = block.number;
        _; //어떤 함수 앞에 insert 효과 //caller's code
    }

    //approve -> transferFrom
    function stake(uint256 _amount) external updateReward(msg.sender) {
        require(_amount >= 0, "cannot stake 0 amount");
        //MyToken contract의 approve가 먼저 호출되어야함
        stakingToken.transferFrom(msg.sender, address(this), _amount); //TinyBank contract로 토큰 전송
        staked[msg.sender] += _amount;
        totalStaked += _amount;
        emit Staked(msg.sender, _amount);
    }

    function withdraw(uint256 _amount) external updateReward(msg.sender) {
        require(staked[msg.sender] >= _amount, "insufficient staked token");
        stakingToken.transfer(_amount, msg.sender); //TinyBank contract에서 토큰 전송
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
