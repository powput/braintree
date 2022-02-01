import { Dispatcher, ExternalPositionFactory, ExternalPositionManager, FundDeployer } from '@enzymefinance/protocol';
import type { DeployFunction } from 'hardhat-deploy/types';

const fn: DeployFunction = async function (hre) {
  const {
    deployments: { get, getOrNull },
    ethers: { getSigners },
  } = hre;

  const deployer = (await getSigners())[0];

  const compoundDebtPositionLib = await getOrNull('CompoundDebtPositionLib');
  const compoundDebtPositionParser = await getOrNull('CompoundDebtPositionParser');
  const dispatcher = await get('Dispatcher');
  const externalPositionFactory = await get('ExternalPositionFactory');
  const externalPositionManager = await get('ExternalPositionManager');
  const fundDeployer = await get('FundDeployer');
  const uniswapV3ExternalPositionLib = await getOrNull('UniswapV3LiquidityPositionLib');
  const uniswapV3ExternalPositionParser = await getOrNull('UniswapV3LiquidityPositionParser');

  // AF action: Set the release live, renouncing ownership
  const fundDeployerInstance = new FundDeployer(fundDeployer.address, deployer);
  await fundDeployerInstance.setReleaseLive();

  // Council action: Add the ExternalPositionManager as a "deployer" on the ExternalPositionFactory
  const externalPositionFactoryInstance = new ExternalPositionFactory(externalPositionFactory.address, deployer);
  await externalPositionFactoryInstance.addPositionDeployers([externalPositionManager]);

  // Council action: Add the new external position types to the ExternalPositionFactory
  const positionTypes = [
    ...(compoundDebtPositionLib && compoundDebtPositionParser ? ['COMPOUND_DEBT'] : []),
    ...(uniswapV3ExternalPositionLib && uniswapV3ExternalPositionParser ? ['UNISWAP_V3_LIQUIDITY'] : []),
  ];

  if (positionTypes.length) {
    await externalPositionFactoryInstance.addNewPositionTypes(['COMPOUND_DEBT', 'UNISWAP_V3_LIQUIDITY']);
  }

  // Council action: Add the external position contracts (lib + parser) to the ExternalPositionManager
  const externalPositionManagerInstance = new ExternalPositionManager(externalPositionManager.address, deployer);
  // TODO: this can technically fail if the above "&&" statements yield false, because the typeIds will be thrown off.
  // Should either bundle these actions and add new types one-by-one, or more likely create a helper to loop through
  // all position type labels on the factory to find the matching label (e.g., which id is "COMPOUND_DEBT")
  if (compoundDebtPositionLib && compoundDebtPositionParser) {
    await externalPositionManagerInstance.updateExternalPositionTypesInfo(
      [0],
      [compoundDebtPositionLib],
      [compoundDebtPositionParser],
    );
  }

  if (uniswapV3ExternalPositionLib && uniswapV3ExternalPositionParser) {
    await externalPositionManagerInstance.updateExternalPositionTypesInfo(
      [1],
      [uniswapV3ExternalPositionLib],
      [uniswapV3ExternalPositionParser],
    );
  }

  // Council action: Set the current FundDeployer on the Dispatcher contract, making the release active
  const dispatcherInstance = new Dispatcher(dispatcher.address, deployer);
  await dispatcherInstance.setCurrentFundDeployer(fundDeployer.address);
};

fn.tags = ['Release'];

const externalPositionContractDependencies = [
  'CompoundDebtPositionLib',
  'CompoundDebtPositionParser',
  'UniswapV3LiquidityPositionLib',
  'UniswapV3LiquidityPositionParser',
];

// Include PostDeployment so the handoff gets run afterwards
fn.dependencies = [
  'Dispatcher',
  'ExternalPositionFactory',
  'FundDeployer',
  'PostDeployment',
  ...externalPositionContractDependencies,
];
fn.runAtTheEnd = true;

// NOTE: On live networks, this is part of the hand over / release routine.
fn.skip = async (hre) => hre.network.live;

export default fn;
