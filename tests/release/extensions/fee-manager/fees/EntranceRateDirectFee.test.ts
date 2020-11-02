/*
 * @file Only tests the EntranceRateDirectFee functionality not covered by
 * the EntranceRateFeeBase tests, i.e., the use of settlement type
 */

import { BigNumber, utils } from 'ethers';
import { EthereumTestnetProvider, randomAddress } from '@crestproject/crestproject';
import {
  EntranceRateDirectFee,
  FeeHook,
  FeeSettlementType,
  entranceRateFeeConfigArgs,
  entranceRateFeeSharesDue,
  settlePostBuySharesArgs,
} from '@melonproject/protocol';
import { assertEvent, defaultTestDeployment } from '@melonproject/testutils';

async function snapshot(provider: EthereumTestnetProvider) {
  const {
    accounts: [EOAFeeManager, ...remainingAccounts],
    deployment,
    config,
  } = await defaultTestDeployment(provider);

  // Create standalone EntranceRateDirectFee
  const standaloneEntranceRateFee = await EntranceRateDirectFee.deploy(config.deployer, EOAFeeManager);

  return {
    accounts: remainingAccounts,
    config,
    deployment,
    EOAFeeManager,
    standaloneEntranceRateFee,
  };
}

describe('constructor', () => {
  it('sets state vars', async () => {
    const {
      deployment: { entranceRateDirectFee },
    } = await provider.snapshot(snapshot);

    const getSettlementTypeCall = await entranceRateDirectFee.getSettlementType();
    expect(getSettlementTypeCall).toBe(FeeSettlementType.Direct);
  });
});

describe('settle', () => {
  it('correctly handles valid call', async () => {
    const { EOAFeeManager, standaloneEntranceRateFee } = await provider.snapshot(snapshot);

    // Add fee settings for a random ComptrollerProxy address
    const comptrollerProxyAddress = randomAddress();
    const rate = utils.parseEther('.1'); // 10%
    const entranceRateFeeConfig = await entranceRateFeeConfigArgs(rate);
    await standaloneEntranceRateFee
      .connect(EOAFeeManager)
      .addFundSettings(comptrollerProxyAddress, entranceRateFeeConfig);

    // Create settlementData
    const buyer = randomAddress();
    const sharesBought = utils.parseEther('2');
    const investmentAmount = utils.parseEther('2');
    const settlementData = await settlePostBuySharesArgs({
      buyer,
      sharesBought,
      investmentAmount,
    });

    // Get the expected shares due for the settlement
    const expectedSharesDueForCall = entranceRateFeeSharesDue({
      rate,
      sharesBought,
    });

    // Check the return values via a call() to settle()
    const settleCall = await standaloneEntranceRateFee
      .connect(EOAFeeManager)
      .settle.args(comptrollerProxyAddress, randomAddress(), FeeHook.PostBuyShares, settlementData)
      .call();

    expect(settleCall).toMatchFunctionOutput(standaloneEntranceRateFee.settle.fragment, {
      settlementType_: FeeSettlementType.Direct,
      payer_: buyer,
      sharesDue_: expectedSharesDueForCall,
    });

    // Send the tx to actually settle()
    const receipt = await standaloneEntranceRateFee
      .connect(EOAFeeManager)
      .settle(comptrollerProxyAddress, randomAddress(), FeeHook.PostBuyShares, settlementData);

    // Assert the event was emitted
    assertEvent(receipt, 'Settled', {
      comptrollerProxy: comptrollerProxyAddress,
      payer: buyer,
      sharesQuantity: BigNumber.from(expectedSharesDueForCall),
    });
  });
});

describe('integration', () => {
  it.todo(
    'can create a new fund with this fee, works correctly while buying shares, and is not called during __settleContinuousFees()',
  );

  it.todo('can create a migrated fund with this fee');
});
