import hre from "hardhat";
import { expect } from "chai";
import { DECIMALS, MINTING_AMOUNT } from "./constant";
import { MyToken, TinyBank } from "../typechain-types";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

describe("TinyBank", () => {
  let signers: HardhatEthersSigner[];
  let myTokenC: MyToken;
  let tinyBankC: TinyBank;
  let managers: [string, string, string, string, string];
  beforeEach(async () => {
    signers = await hre.ethers.getSigners();

    myTokenC = await hre.ethers.deployContract("MyToken", [
      "MyToken",
      "MT",
      DECIMALS,
      MINTING_AMOUNT,
    ]);
    managers = [
      signers[10].address,
      signers[11].address,
      signers[12].address,
      signers[13].address,
      signers[14].address,
    ];
    tinyBankC = await hre.ethers.deployContract("TinyBank", [
      await myTokenC.getAddress(),
      managers,
    ]);
    await myTokenC.setManager(await tinyBankC.getAddress());
  });

  describe("Initialized state check", () => {
    it("should return totalStaked 0", async () => {
      expect(await tinyBankC.totalStaked()).equal(0);
    });
    it("should return staked 0 amount of signer0", async () => {
      const signer0 = signers[0];
      expect(await tinyBankC.staked(signer0.address)).equal(0);
    });
  });

  describe("Staking", async () => {
    it("should return staked amount", async () => {
      const signer0 = signers[0];
      const stakingAmount = hre.ethers.parseUnits("50", DECIMALS);
      await myTokenC.approve(await tinyBankC.getAddress(), stakingAmount);
      await tinyBankC.stake(stakingAmount);
      expect(await tinyBankC.staked(signer0.address)).equal(stakingAmount);
      expect(await myTokenC.balanceOf(tinyBankC)).equal(
        await tinyBankC.totalStaked()
      );
      expect(await tinyBankC.totalStaked()).equal(stakingAmount);
    });
  });
  describe("Withdraw", () => {
    it("should return 0 staked after withdrawing total token", async () => {
      const signer0 = signers[0];
      const stakingAmount = hre.ethers.parseUnits("50", DECIMALS);
      await myTokenC.approve(await tinyBankC.getAddress(), stakingAmount);
      await tinyBankC.stake(stakingAmount);
      await tinyBankC.withdraw(stakingAmount);
      expect(await tinyBankC.staked(signer0.address)).equal(0);
    });
  });

  describe("reward", () => {
    it("should reward 1MT every blocks", async () => {
      const signer0 = signers[0];
      const stakingAmount = hre.ethers.parseUnits("50", DECIMALS);
      await myTokenC.approve(tinyBankC.getAddress(), stakingAmount);
      await tinyBankC.stake(stakingAmount);

      const BLOCKS = 5n;
      const transferAmount = hre.ethers.parseUnits("1", DECIMALS);
      for (let i = 0; i < BLOCKS; i++) {
        await myTokenC.transfer(transferAmount, signer0.address);
      }

      await tinyBankC.withdraw(stakingAmount);
      expect(await myTokenC.balanceOf(signer0.address)).to.equal(
        hre.ethers.parseUnits((BLOCKS + MINTING_AMOUNT + 1n).toString())
      );
    });

    it("should revert when changing rewardPerBlock by hacker", async () => {
      const hacker = signers[3];
      const rewardToChange = hre.ethers.parseUnits("10000", DECIMALS);

      await expect(
        tinyBankC.connect(hacker).setRewardPerBlock(rewardToChange)
      ).to.be.revertedWith("You are not a manager");
    });
  });

  describe("Multi-Manager Access Control", async () => {
    const newReward = hre.ethers.parseUnits("10", DECIMALS);

    it("should revert when a non-manager tries to confirm", async () => {
      await expect(tinyBankC.connect(signers[5]).confirm()).to.be.revertedWith(
        "You are not a manager"
      );
    });

    it("should revert setRewardPerBlock if not all managers confirmed", async () => {
      // 일부 매니저만 confirm
      await tinyBankC.connect(signers[10]).confirm();
      await tinyBankC.connect(signers[11]).confirm();
      await tinyBankC.connect(signers[12]).confirm();

      await expect(
        tinyBankC.connect(signers[10]).setRewardPerBlock(newReward)
      ).to.be.revertedWith("Not all confirmed yet");
    });

    it("should allow setRewardPerBlock after all managers confirm", async () => {
      // 모든 매니저 confirm
      for (let i = 10; i < 15; i++) {
        await tinyBankC.connect(signers[i]).confirm();
      }

      // 매니저 호출 시 정상 동작
      await expect(tinyBankC.connect(signers[10]).setRewardPerBlock(newReward))
        .to.not.be.reverted;

      expect(await tinyBankC.rewardPerBlock()).to.equal(newReward);
    });

    it("should revert if non-manager tries after all managers confirm", async () => {
      for (let i = 10; i < 15; i++) {
        await tinyBankC.connect(signers[i]).confirm();
      }

      await expect(
        tinyBankC.connect(signers[5]).setRewardPerBlock(newReward)
      ).to.be.revertedWith("You are not a manager");
    });
  });
});
