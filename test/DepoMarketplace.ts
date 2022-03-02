import chai from 'chai';
import { solidity } from 'ethereum-waffle';
import { expect } from 'chai';
import { ethers } from 'hardhat';
import { SignerWithAddress } from 'hardhat-deploy-ethers/dist/src/signers';
import { DepoMarketplace, TestCollection } from '../types';
import { parseEther } from 'ethers/lib/utils';

chai.use(solidity);

describe('DepoMarketplace', function () {
  let depoMarketplace: DepoMarketplace;
  let nftCollection: TestCollection;
  let minter1: SignerWithAddress;
  let minter2: SignerWithAddress;
  let buyer: SignerWithAddress;
  let treasury: SignerWithAddress;

  before(async function () {
    [, minter1, minter2, buyer, treasury] = await ethers.getSigners();
    const DepoMarketplace = await ethers.getContractFactory('DepoMarketplace');
    depoMarketplace = (await DepoMarketplace.deploy()) as DepoMarketplace;
    await depoMarketplace.deployed();

    const TestCollection = await ethers.getContractFactory('TestCollection');
    nftCollection = (await TestCollection.deploy()) as TestCollection;
    await nftCollection.deployed();

    await nftCollection.connect(minter1).safeMint(); // tokenId: 1
    await nftCollection.connect(minter1).safeMint(); // tokenId: 2
    await nftCollection.connect(minter2).safeMint(); // tokenId: 3
    await nftCollection.connect(minter2).safeMint(); // tokenId: 4

    // create 3 listings
    nftCollection
      .connect(minter1)
      .setApprovalForAll(depoMarketplace.address, true);
    nftCollection
      .connect(minter2)
      .setApprovalForAll(depoMarketplace.address, true);

    await depoMarketplace
      .connect(minter1)
      .createListing(nftCollection.address, 1, parseEther('1'));
    await depoMarketplace
      .connect(minter1)
      .createListing(nftCollection.address, 2, parseEther('2'));
    await depoMarketplace
      .connect(minter2)
      .createListing(nftCollection.address, 3, parseEther('2'));
    await depoMarketplace
      .connect(minter2)
      .createListing(nftCollection.address, 4, parseEther('2'));
  });

  describe('#sales', () => {
    it('buy', async function () {
      await depoMarketplace.connect(buyer).buy(1, { value: parseEther('1') });
      expect(await nftCollection.ownerOf(1)).to.eq(buyer.address);
      const listing = await depoMarketplace.listings(1);
      expect(listing.sold).to.eq(true);
      expect(await depoMarketplace.userFunds(minter1.address)).to.eq(
        parseEther('0.975')
      );
      expect(await depoMarketplace.feeCollected()).to.eq(parseEther('0.025'));

      await depoMarketplace.connect(buyer).buy(3, { value: parseEther('2') });
      expect(await nftCollection.ownerOf(3)).to.eq(buyer.address);
      const listing3 = await depoMarketplace.listings(3);
      expect(listing3.sold).to.eq(true);
      expect(await depoMarketplace.userFunds(minter2.address)).to.eq(
        parseEther('1.95')
      );
      expect(await depoMarketplace.feeCollected()).to.eq(parseEther('0.075'));

      // Failed cases
      await expect(depoMarketplace.buy(1)).to.revertedWith('Already sold');
      await expect(depoMarketplace.buy(5)).to.revertedWith('Invalid listingId');
      await expect(depoMarketplace.connect(minter1).buy(2)).to.revertedWith(
        'The owner cannot buy it'
      );
      await expect(
        depoMarketplace.buy(2, { value: parseEther('5') })
      ).to.revertedWith('Not exact price');
    });

    it('cancel', async function () {
      await depoMarketplace.connect(minter1).cancel(2);
      const listing = await depoMarketplace.listings(2);
      expect(listing.canceled).to.eq(true);

      // Failed cases
      await expect(depoMarketplace.cancel(5)).to.revertedWith(
        'Invalid listingId'
      );
      await expect(depoMarketplace.cancel(1)).to.revertedWith('Already sold');
      await expect(depoMarketplace.cancel(2)).to.revertedWith(
        'Already canceled'
      );
      await expect(depoMarketplace.connect(minter1).cancel(4)).to.revertedWith(
        'Should only be canceled by the owner'
      );
    });

    it('withdraw', async function () {
      let balanceBefore = await ethers.provider.getBalance(treasury.address);
      await depoMarketplace
        .connect(minter1)
        .withdraw(treasury.address, parseEther('0.9'));
      let balanceAfter = await ethers.provider.getBalance(treasury.address);
      expect(balanceAfter.sub(balanceBefore)).to.eq(parseEther('0.9'));

      await expect(
        depoMarketplace
          .connect(minter1)
          .withdraw(treasury.address, parseEther('0.1'))
      ).to.revertedWith('Not enough to withdraw');

      balanceBefore = await ethers.provider.getBalance(treasury.address);
      await depoMarketplace
        .connect(minter1)
        .withdraw(treasury.address, parseEther('0.075'));
      balanceAfter = await ethers.provider.getBalance(treasury.address);
      expect(balanceAfter.sub(balanceBefore)).to.eq(parseEther('0.075'));
    });
  });

  describe('#ownable', () => {
    it('setFee', async function () {
      await depoMarketplace.setFee(50);
      expect(await depoMarketplace.fee()).to.eq(50);

      await expect(depoMarketplace.connect(minter1).setFee(50)).to.revertedWith(
        'Ownable: caller is not the owner'
      );
      await expect(depoMarketplace.setFee(0)).to.revertedWith(
        'Should be greater than 0 and less than 10%'
      );
      await expect(depoMarketplace.setFee(100)).to.revertedWith(
        'Should be greater than 0 and less than 10%'
      );
    });

    it('claimFee', async function () {
      let balanceBefore = await ethers.provider.getBalance(treasury.address);
      await depoMarketplace.claimFee(treasury.address, parseEther('0.025'));
      let balanceAfter = await ethers.provider.getBalance(treasury.address);
      expect(balanceAfter.sub(balanceBefore)).to.eq(parseEther('0.025'));

      await expect(
        depoMarketplace.claimFee(treasury.address, parseEther('0.1'))
      ).to.revertedWith('Invalid amount to claim');

      balanceBefore = await ethers.provider.getBalance(treasury.address);
      await depoMarketplace.claimFee(treasury.address, parseEther('0.05'));
      balanceAfter = await ethers.provider.getBalance(treasury.address);
      expect(balanceAfter.sub(balanceBefore)).to.eq(parseEther('0.05'));
    });
  });
});
