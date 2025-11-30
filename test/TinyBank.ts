import hre from "hardhat";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { MyToken, TinyBank } from "../typechain-types";
import { expect } from "chai";
import { DECIMALS, MINTING_AMOUNT } from "./constant";

describe("TinyBank", () => {
  let signers: HardhatEthersSigner[];
  let myTokenC: MyToken;
  let TinyBankC: TinyBank;
  beforeEach(async () => {
    signers = await hre.ethers.getSigners();
    myTokenC = await hre.ethers.deployContract("MyToken", [
      "MyToken",
      "MT",
      DECIMALS,
      MINTING_AMOUNT,
    ]);

    TinyBankC = await hre.ethers.deployContract("TinyBank", [
      await myTokenC.getAddress(),
    ]);
    await myTokenC.setManager(await TinyBankC.getAddress());
  });

  describe("Initialized State check", () => {
    it("should return totalStaked 0", async () => {
      expect(await TinyBankC.totalStaked()).to.equal(0n);
    });
    it("should return staked 0 amount of signer0", async () => {
      const signer0 = signers[0];
      expect(await TinyBankC.staked(signer0.address)).to.equal(0n);
    });
  });
  describe("Staking", async () => {
    it("should return staked amount", async () => {
      const signer0 = signers[0];
      const stakingAmount = hre.ethers.parseUnits("50", DECIMALS);

      await myTokenC.approve(TinyBankC.getAddress(), stakingAmount);
      await expect(TinyBankC.stake(stakingAmount))
        .to.emit(TinyBankC, "Staked")
        .withArgs(signer0.address, stakingAmount);

      expect(await TinyBankC.staked(signer0.address)).to.equal(stakingAmount);
      expect(await TinyBankC.totalStaked()).to.equal(stakingAmount);
      expect(await myTokenC.balanceOf(signer0.address)).to.equal(
        await TinyBankC.totalStaked()
      );
    });
  });
  describe("Withdraw", async () => {
    it("should return 0 staked after withdrawing total token", async () => {
      const signer0 = signers[0];
      const stakingAmount = hre.ethers.parseUnits("50", DECIMALS);
      await myTokenC.approve(TinyBankC.getAddress(), stakingAmount);
      await TinyBankC.stake(stakingAmount);
      await expect(TinyBankC.withdraw(stakingAmount))
        .to.emit(TinyBankC, "Withdraw")
        .withArgs(stakingAmount, signer0.address);
      expect(await TinyBankC.staked(signer0.address)).to.equal(0n);
    });
  });

  describe("reward", async () => {
    it("should reward 1MT every blocks", async () => {
      const signer0 = signers[0];
      const stakingAmount = hre.ethers.parseUnits("50", DECIMALS);
      await myTokenC.approve(await TinyBankC.getAddress(), stakingAmount);
      await TinyBankC.stake(stakingAmount);

      const BLOCKS = 5n;
      const transferAmount = hre.ethers.parseUnits("1", DECIMALS);
      for (var i = 0; i < BLOCKS; i++) {
        await myTokenC.transfer(transferAmount, signer0.address);
      }

      await TinyBankC.withdraw(stakingAmount);
      expect(await myTokenC.balanceOf(signer0.address)).to.equal(
        hre.ethers.parseUnits((BLOCKS + MINTING_AMOUNT + 1n).toString())
      );
    });

    it("should revert when changing rewardPerBlock by hacker", async () => {
      const hacker = signers[3];
      const rewardToChange = hre.ethers.parseUnits("10000", DECIMALS);
      await expect(
        TinyBankC.connect(hacker).setRewardPerBlock(rewardToChange)
      ).to.be.revertedWith("You are not authorized to manage this contract");
    });
  });
});

/*

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
      for (var i = 10; i < 15; i++) {
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

*/
