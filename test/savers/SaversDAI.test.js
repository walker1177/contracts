const { ethers, waffle } = require("hardhat");
const { expect } = require("chai");
const { getRandomAmount } = require("../../utils/testHelpers");
const SaversVault = require("../../artifacts/contracts/savers/SaversVault.sol/SaversVault.json");

let saversVault;
let sDAI;
let owner;
let addr1;
let addr2;

describe("SaversDAI", function () {
  beforeEach(async function () {
    [owner, addr1, addr2] = await ethers.getSigners();

    saversVault = await waffle.deployMockContract(owner, SaversVault.abi);

    [sDAI] = await Promise.all([
      ethers
        .getContractFactory("SaversDAI")
        .then((c) => c.deploy(saversVault.address)),
      saversVault.mock.interestEarnedForAccount.returns(0),
    ]);
  });

  describe("minting", function () {
    it("Should pass if Owner tries to mint any amount", async function () {
      const amount = getRandomAmount();
      await sDAI.mint(owner.address, amount);

      expect(await sDAI.balanceOf(owner.address)).to.equal(amount);
    });

    it("Should fail if a normal account tries to mint any amount", async function () {
      const amount = getRandomAmount();
      const initialAddr1Balance = await sDAI.balanceOf(addr1.address);

      await expect(
        sDAI.connect(addr1).mint(addr1.address, amount)
      ).to.be.revertedWith("Ownable: caller is not the owner");

      expect(await sDAI.balanceOf(addr1.address)).to.equal(initialAddr1Balance);
    });
  });

  describe("burning", function () {
    it("Should pass if Owner tries to burn any amount", async function () {
      const amount = getRandomAmount();
      await sDAI.mint(addr1.address, amount);

      await sDAI.burn(addr1.address, amount);
      expect(await sDAI.balanceOf(addr1.address)).to.equal(0);
    });

    it("Should fail if a normal account tries to burn any amount", async function () {
      const amount = getRandomAmount();
      const initialAddr1Balance = await sDAI.balanceOf(addr1.address);

      await expect(
        sDAI.connect(addr1).burn(addr1.address, amount)
      ).to.be.revertedWith("Ownable: caller is not the owner");

      expect(await sDAI.balanceOf(addr1.address)).to.equal(initialAddr1Balance);
    });
  });

  describe("transferring", function () {
    it("Should be allowed between any accounts", async function () {
      // mint initial supply
      await sDAI.mint(owner.address, 100);

      // check initial balances
      const [initialOwnerBalance, initialAddr1Balance, initialAddr2Balance] =
        await Promise.all([
          sDAI.balanceOf(owner.address),
          sDAI.balanceOf(addr1.address),
          sDAI.balanceOf(addr2.address),
        ]);
      expect(initialOwnerBalance).to.equal(100);
      expect(initialAddr1Balance).to.equal(0);
      expect(initialAddr2Balance).to.equal(0);

      // transfer and check end balances
      await sDAI.transfer(addr1.address, 50);
      await sDAI.connect(addr1).transfer(addr2.address, 25);
      const [endOwnerBalance, endAddr1Balance, endAddr2Balance] =
        await Promise.all([
          sDAI.balanceOf(owner.address),
          sDAI.balanceOf(addr1.address),
          sDAI.balanceOf(addr2.address),
        ]);
      expect(endOwnerBalance).to.equal(50);
      expect(endAddr1Balance).to.equal(25);
      expect(endAddr2Balance).to.equal(25);
    });

    it("should send correct amounts when handled by a third account", async function () {
      // mint initial supply
      await sDAI.mint(owner.address, 100);

      // check initial balances
      const [initialOwnerBalance, initialAddr1Balance, initialAddr2Balance] =
        await Promise.all([
          sDAI.balanceOf(owner.address),
          sDAI.balanceOf(addr1.address),
          sDAI.balanceOf(addr2.address),
          sDAI.approve(owner.address, 100),
          sDAI.connect(addr1).approve(owner.address, 100),
        ]);
      expect(initialOwnerBalance).to.equal(100);
      expect(initialAddr1Balance).to.equal(0);
      expect(initialAddr2Balance).to.equal(0);

      // transfer and check end balances
      await sDAI.transferFrom(owner.address, addr1.address, 50);
      await sDAI.transferFrom(addr1.address, addr2.address, 25);
      const [endOwnerBalance, endAddr1Balance, endAddr2Balance] =
        await Promise.all([
          sDAI.balanceOf(owner.address),
          sDAI.balanceOf(addr1.address),
          sDAI.balanceOf(addr2.address),
        ]);
      expect(endOwnerBalance).to.equal(50);
      expect(endAddr1Balance).to.equal(25);
      expect(endAddr2Balance).to.equal(25);
    });

    it("Should be reverted if an account doesn't have the correct amount", async function () {
      // mint initial supply
      await sDAI.mint(owner.address, 100);

      // check initial balances
      const [initialOwnerBalance, initialAddr1Balance] = await Promise.all([
        sDAI.balanceOf(owner.address),
        sDAI.balanceOf(addr1.address),
      ]);
      expect(initialOwnerBalance).to.equal(100);
      expect(initialAddr1Balance).to.equal(0);

      // attempt transfer and check end balances
      await expect(sDAI.transfer(addr1.address, 500)).to.be.revertedWith(
        "ERC20: transfer amount exceeds balance"
      );
      const [endOwnerBalance, endAddr1Balance] = await Promise.all([
        sDAI.balanceOf(owner.address),
        sDAI.balanceOf(addr1.address),
      ]);
      expect(endOwnerBalance).to.equal(100);
      expect(endAddr1Balance).to.equal(0);
    });
  });
});
