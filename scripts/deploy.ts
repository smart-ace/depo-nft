import { ethers, run } from 'hardhat';
import { DepoMarketplace, DepoMarketplace__factory } from '../types';

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log('Deployer: ', deployer.address);

  const depoMarketplaceFactory: DepoMarketplace__factory =
    await ethers.getContractFactory('DepoMarketplace');
  let depoMarketplace = await depoMarketplaceFactory.deploy();
  await depoMarketplace.deployed();

  console.log('Deployed: ', depoMarketplace.address);

  // Verification
  try {
    await run('verify:verify', {
      address: depoMarketplace.address,
      constructorArguments: [],
    });
  } catch (e) {
    console.log(e);
  }
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
