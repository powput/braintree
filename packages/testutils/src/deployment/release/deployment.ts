import { AddressLike, SignerWithAddress } from '@crestproject/crestproject';
import {
  AdapterBlacklist,
  AdapterWhitelist,
  AggregatedDerivativePriceFeed,
  AssetBlacklist,
  AssetWhitelist,
  ChaiAdapter,
  ChainlinkPriceFeed,
  ChaiPriceFeed,
  CompoundAdapter,
  CompoundPriceFeed,
  ComptrollerLib,
  Engine,
  EngineAdapter,
  EntranceRateBurnFee,
  EntranceRateDirectFee,
  FeeManager,
  FundCalculator,
  FundDeployer,
  FundLifecycleLib,
  IntegrationManager,
  InvestorWhitelist,
  KyberAdapter,
  ManagementFee,
  MaxConcentration,
  PerformanceFee,
  PermissionedVaultActionLib,
  PolicyManager,
  TrackedAssetsAdapter,
  UniswapV2Adapter,
  UniswapV2PoolPriceFeed,
  ValueInterpreter,
  VaultLib,
  ZeroExV2Adapter,
} from '@melonproject/protocol';
import { BigNumberish, BytesLike } from 'ethers';
import { describeDeployment } from '../deployment';

export interface ReleaseDeploymentConfig {
  deployer: SignerWithAddress;
  dispatcher: AddressLike;
  mgm: AddressLike;
  weth: AddressLike;
  mln: AddressLike;
  registeredVaultCalls: {
    contracts: AddressLike[];
    selectors: BytesLike[];
  };
  engine: {
    thawDelay: BigNumberish;
  };
  integrationManager: {
    trackedAssetsLimit: BigNumberish;
  };
  chainlink: {
    ethUsdAggregator: AddressLike;
    staleRateThreshold: BigNumberish;
    primitives: AddressLike[];
    aggregators: AddressLike[];
    rateAssets: BigNumberish[];
  };
  derivatives: {
    chai: AddressLike;
    compound: {
      ccomp: AddressLike;
      cdai: AddressLike;
      ceth: AddressLike;
      crep: AddressLike;
      cusdc: AddressLike;
      czrx: AddressLike;
    };
    uniswapV2: {
      mlnWeth: AddressLike;
      kncWeth: AddressLike;
    };
  };
  integratees: {
    kyber: AddressLike;
    makerDao: {
      dai: AddressLike;
      pot: AddressLike;
    };
    uniswapV2: {
      router: AddressLike;
      factory: AddressLike;
    };
    zeroExV2: {
      allowedMakers: AddressLike[];
      exchange: AddressLike;
      erc20Proxy: AddressLike;
    };
  };
}

export interface ReleaseDeploymentOutput {
  // Core
  comptrollerLib: Promise<ComptrollerLib>;
  fundDeployer: Promise<FundDeployer>;
  fundLifecycleLib: Promise<FundLifecycleLib>;
  permissionedVaultActionLib: Promise<PermissionedVaultActionLib>;
  vaultLib: Promise<VaultLib>;
  // Shared Infrastructure
  engine: Promise<Engine>;
  valueInterpreter: Promise<ValueInterpreter>;
  // Extensions
  feeManager: Promise<FeeManager>;
  integrationManager: Promise<IntegrationManager>;
  policyManager: Promise<PolicyManager>;
  // Price feeds
  chainlinkPriceFeed: Promise<ChainlinkPriceFeed>;
  // Derivative price feeds
  aggregatedDerivativePriceFeed: Promise<AggregatedDerivativePriceFeed>;
  chaiPriceFeed: Promise<ChaiPriceFeed>;
  compoundPriceFeed: Promise<CompoundPriceFeed>;
  uniswapV2PoolPriceFeed: Promise<UniswapV2PoolPriceFeed>;
  // Integration adapters
  chaiAdapter: Promise<ChaiAdapter>;
  compoundAdapter: Promise<CompoundAdapter>;
  engineAdapter: Promise<EngineAdapter>;
  kyberAdapter: Promise<KyberAdapter>;
  trackedAssetsAdapter: Promise<TrackedAssetsAdapter>;
  uniswapV2Adapter: Promise<UniswapV2Adapter>;
  zeroExV2Adapter: Promise<ZeroExV2Adapter>;
  // Fees
  entranceRateBurnFee: Promise<EntranceRateBurnFee>;
  entranceRateDirectFee: Promise<EntranceRateDirectFee>;
  managementFee: Promise<ManagementFee>;
  performanceFee: Promise<PerformanceFee>;
  // Policies
  adapterBlacklist: Promise<AdapterBlacklist>;
  adapterWhitelist: Promise<AdapterWhitelist>;
  assetBlacklist: Promise<AssetBlacklist>;
  assetWhitelist: Promise<AssetWhitelist>;
  maxConcentration: Promise<MaxConcentration>;
  investorWhitelist: Promise<InvestorWhitelist>;
  // Peripheral
  fundCalculator: Promise<FundCalculator>;
}

export const deployRelease = describeDeployment<ReleaseDeploymentConfig, ReleaseDeploymentOutput>({
  // Core
  async comptrollerLib(config, deployment) {
    const comptrollerLib = await ComptrollerLib.deploy(
      config.deployer,
      await deployment.fundDeployer,
      await deployment.valueInterpreter,
      await deployment.feeManager,
      await deployment.integrationManager,
      await deployment.policyManager,
      await deployment.fundLifecycleLib,
      await deployment.permissionedVaultActionLib,
      await deployment.engine,
    );

    const fundDeployer = await deployment.fundDeployer;
    await fundDeployer.setComptrollerLib(comptrollerLib);

    return comptrollerLib;
  },
  async fundDeployer(config, deployment) {
    return FundDeployer.deploy(
      config.deployer,
      config.dispatcher,
      await deployment.engine,
      await deployment.vaultLib,
      config.registeredVaultCalls.contracts,
      config.registeredVaultCalls.selectors,
    );
  },
  async fundLifecycleLib(config, deployment) {
    return FundLifecycleLib.deploy(
      config.deployer,
      await deployment.fundDeployer,
      await deployment.chainlinkPriceFeed,
      await deployment.feeManager,
      await deployment.integrationManager,
      await deployment.policyManager,
    );
  },
  async permissionedVaultActionLib(config, deployment) {
    return PermissionedVaultActionLib.deploy(
      config.deployer,
      await deployment.fundDeployer,
      await deployment.feeManager,
      await deployment.integrationManager,
    );
  },
  async vaultLib(config) {
    return VaultLib.deploy(config.deployer);
  },
  // Shared Infrastructure
  async engine(config, deployment) {
    return Engine.deploy(
      config.deployer,
      config.dispatcher,
      config.mgm,
      config.mln,
      config.weth,
      await deployment.valueInterpreter,
      config.engine.thawDelay,
    );
  },
  async valueInterpreter(config, deployment) {
    return ValueInterpreter.deploy(
      config.deployer,
      await deployment.chainlinkPriceFeed,
      await deployment.aggregatedDerivativePriceFeed,
    );
  },
  // Extensions
  async feeManager(config, deployment) {
    return await FeeManager.deploy(config.deployer, await deployment.fundDeployer);
  },
  async integrationManager(config, deployment) {
    return IntegrationManager.deploy(
      config.deployer,
      await deployment.fundDeployer,
      await deployment.policyManager,
      await deployment.aggregatedDerivativePriceFeed,
      await deployment.chainlinkPriceFeed,
      config.integrationManager.trackedAssetsLimit,
    );
  },
  async policyManager(config, deployment) {
    return PolicyManager.deploy(config.deployer, await deployment.fundDeployer);
  },
  // Price feeds
  async chainlinkPriceFeed(config) {
    return ChainlinkPriceFeed.deploy(
      config.deployer,
      config.dispatcher,
      config.weth,
      config.chainlink.ethUsdAggregator,
      config.chainlink.staleRateThreshold,
      config.chainlink.primitives,
      config.chainlink.aggregators,
      config.chainlink.rateAssets,
    );
  },
  // Derivative price feeds
  async aggregatedDerivativePriceFeed(config, deployment) {
    // Await all derivative price feeds, since the AggregatedDerivativePriceFeed relies on
    // isSupportedAsset() calls to each feed

    const chaiPriceFeed = await deployment.chaiPriceFeed;

    const cTokens = Object.values(config.derivatives.compound);
    const compoundPriceFeeds: Array<AddressLike> = new Array(cTokens.length).fill(await deployment.compoundPriceFeed);

    const uniswapPoolTokens = Object.values(config.derivatives.uniswapV2);
    const uniswapPoolPriceFeeds: Array<AddressLike> = new Array(uniswapPoolTokens.length).fill(
      await deployment.uniswapV2PoolPriceFeed,
    );

    return AggregatedDerivativePriceFeed.deploy(
      config.deployer,
      config.dispatcher,
      [config.derivatives.chai, ...cTokens, ...uniswapPoolTokens],
      [chaiPriceFeed, ...compoundPriceFeeds, ...uniswapPoolPriceFeeds],
    );
  },
  async chaiPriceFeed(config) {
    return ChaiPriceFeed.deploy(
      config.deployer,
      config.derivatives.chai,
      config.integratees.makerDao.dai,
      config.integratees.makerDao.pot,
    );
  },
  async compoundPriceFeed(config) {
    const { ceth, ...cTokens } = config.derivatives.compound;

    return CompoundPriceFeed.deploy(config.deployer, config.dispatcher, config.weth, ceth, Object.values(cTokens));
  },
  async uniswapV2PoolPriceFeed(config) {
    return UniswapV2PoolPriceFeed.deploy(config.deployer);
  },
  // Adapters
  async chaiAdapter(config, deployment) {
    return ChaiAdapter.deploy(
      config.deployer,
      await deployment.integrationManager,
      config.derivatives.chai,
      config.integratees.makerDao.dai,
    );
  },
  async compoundAdapter(config, deployment) {
    return CompoundAdapter.deploy(
      config.deployer,
      await deployment.integrationManager,
      await deployment.compoundPriceFeed,
      config.weth,
    );
  },
  async engineAdapter(config, deployment) {
    return EngineAdapter.deploy(
      config.deployer,
      await deployment.integrationManager,
      await deployment.engine,
      config.mln,
      config.weth,
    );
  },
  async kyberAdapter(config, deployment) {
    return KyberAdapter.deploy(
      config.deployer,
      await deployment.integrationManager,
      config.integratees.kyber,
      config.weth,
    );
  },
  async trackedAssetsAdapter(config, deployment) {
    return TrackedAssetsAdapter.deploy(config.deployer, await deployment.integrationManager);
  },
  async uniswapV2Adapter(config, deployment) {
    return UniswapV2Adapter.deploy(
      config.deployer,
      await deployment.integrationManager,
      config.integratees.uniswapV2.router,
      config.integratees.uniswapV2.factory,
    );
  },
  async zeroExV2Adapter(config, deployment) {
    return ZeroExV2Adapter.deploy(
      config.deployer,
      await deployment.integrationManager,
      config.integratees.zeroExV2.exchange,
      await deployment.fundDeployer,
      config.integratees.zeroExV2.allowedMakers,
    );
  },
  // Fees
  async entranceRateBurnFee(config, deployment) {
    return EntranceRateBurnFee.deploy(config.deployer, await deployment.feeManager);
  },
  async entranceRateDirectFee(config, deployment) {
    return EntranceRateDirectFee.deploy(config.deployer, await deployment.feeManager);
  },
  async managementFee(config, deployment) {
    return ManagementFee.deploy(config.deployer, await deployment.feeManager);
  },
  async performanceFee(config, deployment) {
    return PerformanceFee.deploy(config.deployer, await deployment.feeManager);
  },
  // Policies
  async adapterBlacklist(config, deployment) {
    return AdapterBlacklist.deploy(config.deployer, await deployment.policyManager);
  },
  async adapterWhitelist(config, deployment) {
    return AdapterWhitelist.deploy(config.deployer, await deployment.policyManager);
  },
  async assetBlacklist(config, deployment) {
    return AssetBlacklist.deploy(config.deployer, await deployment.policyManager);
  },
  async assetWhitelist(config, deployment) {
    return AssetWhitelist.deploy(config.deployer, await deployment.policyManager);
  },
  async maxConcentration(config, deployment) {
    return MaxConcentration.deploy(config.deployer, await deployment.policyManager, await deployment.valueInterpreter);
  },
  async investorWhitelist(config, deployment) {
    return InvestorWhitelist.deploy(config.deployer, await deployment.policyManager);
  },
  // Peripheral
  async fundCalculator(config, deployment) {
    return FundCalculator.deploy(config.deployer, await deployment.feeManager);
  },
  // Post-deployment config
  async postDeployment(_config, deployment) {
    // Register adapters
    const adapters = [
      await deployment.chaiAdapter,
      await deployment.compoundAdapter,
      await deployment.engineAdapter,
      await deployment.kyberAdapter,
      await deployment.trackedAssetsAdapter,
      await deployment.uniswapV2Adapter,
      await deployment.zeroExV2Adapter,
    ];

    const integrationManager = await deployment.integrationManager;
    await integrationManager.registerAdapters(adapters);

    // Register ether takers on engine
    const engineAdapter = await deployment.engineAdapter;
    const engine = await deployment.engine;
    await engine.addEtherTakers([engineAdapter]);

    // Register fees
    const fees = [
      await deployment.entranceRateBurnFee,
      await deployment.entranceRateDirectFee,
      await deployment.managementFee,
      await deployment.performanceFee,
    ];

    const feeManager = await deployment.feeManager;
    await feeManager.registerFees(fees);

    // Register policies
    const policies = [
      await deployment.adapterBlacklist,
      await deployment.adapterWhitelist,
      await deployment.assetBlacklist,
      await deployment.assetWhitelist,
      await deployment.maxConcentration,
      await deployment.investorWhitelist,
    ];

    const policyManager = await deployment.policyManager;
    await policyManager.registerPolicies(policies);
  },
});