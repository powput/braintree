// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.6.8;

import "../../vault/IVault.sol";
import "../utils/ComptrollerStorage.sol";
import "./IPermissionedVaultActionLib.sol";

/// @title PermissionedVaultActionLib Contract
/// @author Melon Council DAO <security@meloncoucil.io>
/// @notice A library for permissioned vault actions callable by Extensions
/// @dev Always delegate-called by a ComptrollerProxy
contract PermissionedVaultActionLib is ComptrollerStorage, IPermissionedVaultActionLib {
    address private immutable FEE_MANAGER;
    address private immutable INTEGRATION_MANAGER;

    modifier onlyPermissionedAction(VaultAction _action) {
        require(permissionedVaultActionAllowed, "onlyPermissionedAction: No action allowed");

        bool isValidAction;
        if (msg.sender == INTEGRATION_MANAGER) {
            require(
                _action == VaultAction.ApproveAssetSpender ||
                    _action == VaultAction.AddTrackedAsset ||
                    _action == VaultAction.RemoveTrackedAsset ||
                    _action == VaultAction.WithdrawAssetTo,
                "onlyPermissionedAction: Not valid for IntegrationManager"
            );
        } else if (msg.sender == FEE_MANAGER) {
            require(
                _action == VaultAction.BurnShares ||
                    _action == VaultAction.MintShares ||
                    _action == VaultAction.TransferShares,
                "onlyPermissionedAction: Not valid for FeeManager"
            );
        } else {
            revert("onlyPermissionedAction: Not a valid actor");
        }

        _;
    }

    constructor(address _feeManager, address _integrationManager) public {
        FEE_MANAGER = _feeManager;
        INTEGRATION_MANAGER = _integrationManager;
    }

    /// @notice Dispatches an action to be called on the vault
    /// @param _action The enum VaultAction for the action to perform
    /// @param _actionData The encoded data for the action
    function dispatchAction(VaultAction _action, bytes calldata _actionData)
        external
        override
        onlyPermissionedAction(_action)
    {
        if (_action == VaultAction.AddTrackedAsset) {
            __addTrackedAsset(_actionData);
        } else if (_action == VaultAction.ApproveAssetSpender) {
            __approveAssetSpender(_actionData);
        } else if (_action == VaultAction.BurnShares) {
            __burnShares(_actionData);
        } else if (_action == VaultAction.MintShares) {
            __mintShares(_actionData);
        } else if (_action == VaultAction.RemoveTrackedAsset) {
            __removeTrackedAsset(_actionData);
        } else if (_action == VaultAction.TransferShares) {
            __transferShares(_actionData);
        } else if (_action == VaultAction.WithdrawAssetTo) {
            __withdrawAssetTo(_actionData);
        }
    }

    /// @dev Helper to add a tracked asset to the fund
    function __addTrackedAsset(bytes memory _actionData) private {
        address asset = abi.decode(_actionData, (address));
        IVault(vaultProxy).addTrackedAsset(asset);
    }

    /// @dev Helper to grant a spender an allowance for a fund's asset
    function __approveAssetSpender(bytes memory _actionData) private {
        (address asset, address target, uint256 amount) = abi.decode(
            _actionData,
            (address, address, uint256)
        );
        IVault(vaultProxy).approveAssetSpender(asset, target, amount);
    }

    /// @dev Helper to burn fund shares for a particular account
    function __burnShares(bytes memory _actionData) private {
        (address target, uint256 amount) = abi.decode(_actionData, (address, uint256));
        IVault(vaultProxy).burnShares(target, amount);
    }

    /// @dev Helper to mint fund shares to a particular account
    function __mintShares(bytes memory _actionData) private {
        (address target, uint256 amount) = abi.decode(_actionData, (address, uint256));
        IVault(vaultProxy).mintShares(target, amount);
    }

    /// @dev Helper to remove a tracked asset from the fund
    function __removeTrackedAsset(bytes memory _actionData) private {
        address asset = abi.decode(_actionData, (address));
        IVault(vaultProxy).removeTrackedAsset(asset);
    }

    /// @dev Helper to transfer fund shares from one account to another
    function __transferShares(bytes memory _actionData) private {
        (address from, address to, uint256 amount) = abi.decode(
            _actionData,
            (address, address, uint256)
        );
        IVault(vaultProxy).transferShares(from, to, amount);
    }

    /// @dev Helper to withdraw an asset from the VaultProxy to a given account
    function __withdrawAssetTo(bytes memory _actionData) private {
        (address asset, address target, uint256 amount) = abi.decode(
            _actionData,
            (address, address, uint256)
        );
        IVault(vaultProxy).withdrawAssetTo(asset, target, amount);
    }
}
