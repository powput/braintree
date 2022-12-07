import type { DeployFunction } from 'hardhat-deploy/types';

import { loadConfig } from '../../../../utils/config';
import { isOneOfNetworks, Network } from '../../../../utils/helpers';

const fn: DeployFunction = async function (hre) {
  const {
    deployments: { deploy },
    ethers: { getSigners },
  } = hre;

  const deployer = (await getSigners())[0];
  const config = await loadConfig(hre);

  // TODO: Replace with real Globals contract
  const mockMapleV2GlobalsIntegratee = await deploy('MockMapleV2GlobalsIntegratee', {
    from: deployer.address,
    log: true,
    skipIfAlreadyDeployed: true,
  });

  await deploy('MapleLiquidityPositionParser', {
    args: [mockMapleV2GlobalsIntegratee.address, config.maple.mplRewardsV1Factory],
    from: deployer.address,
    log: true,
    skipIfAlreadyDeployed: true,
  });
};

fn.tags = ['Release', 'ExternalPositions', 'MapleLiquidityPositionParser'];
fn.dependencies = ['Config'];

fn.skip = async (hre) => {
  const chain = await hre.getChainId();

  return !isOneOfNetworks(chain, [Network.HOMESTEAD]);
};

export default fn;
