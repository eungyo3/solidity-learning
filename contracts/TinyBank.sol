// staking
// deposit(MyToken) / withdraw(MyToken)
// - user --> deposit --> TinyBank --> tranfer(user --> TinyBank)

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;
import "./ManagedAccess.sol";
import "./MultiManagedAccess.sol";

interface IMyToken {
    function transferFrom(address from, address to, uint256 amount) external;

    function transfer(uint256 amount, address to) external;

    function mint(uint256 amount, address owner) external;
}

contract TinyBank is MultiManagedAccess {
    event Staked(address from, uint256 amount);
    event Withdrawn(uint256 amount, address to);

    IMyToken public stakingtoken;

    mapping(address => uint256) public lastClaimedBlock;

    uint256 public defaultRewardPerBlock = 1 * 10 ** 18;
    uint256 public rewardPerBlock;

    mapping(address => uint256) public staked;
    uint256 public totalStaked;

    constructor(
        IMyToken _stakingToken,
        address[MANAGER_NUMBERS] memory _managers
    ) MultiManagedAccess(msg.sender, _managers) {
        stakingtoken = _stakingToken;
        rewardPerBlock = defaultRewardPerBlock;
    }

    function setRewardPerBlock(
        uint256 _amount
    ) external onlyManager onlyAllConfirmed {
        rewardPerBlock = _amount;
    }

    //who, when?

    modifier updateReward(address to) {
        //internel
        if (staked[to] > 0) {
            uint256 blocks = block.number - lastClaimedBlock[to];
            uint256 reward = (blocks * rewardPerBlock * staked[to]) /
                totalStaked;
            stakingtoken.mint(reward, to);
        }

        lastClaimedBlock[to] = block.number;
        _;
    }

    function stake(uint256 _amount) external updateReward(msg.sender) {
        require(_amount >= 0, "cannot stake 0 amount");
        stakingtoken.transferFrom(msg.sender, address(this), _amount); //TinyBank contract로 토큰 전송
        staked[msg.sender] += _amount;
        totalStaked += _amount;
        emit Staked(msg.sender, _amount);
    }

    function withdraw(uint256 _amount) external updateReward(msg.sender) {
        require(staked[msg.sender] >= _amount, "insufficient staked token");
        stakingtoken.transfer(_amount, msg.sender); //TinyBank contract에서 토큰 전송
        staked[msg.sender] -= _amount;
        totalStaked -= _amount;

        emit Withdrawn(_amount, msg.sender);
    }
}
