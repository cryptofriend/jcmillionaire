// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/EIP712.sol";

/**
 * @title JCClaimDistributor
 * @notice Distributes JC tokens to winners based on signed claims from the backend
 * @dev Uses EIP-712 typed signatures for secure, gasless claim authorization
 */
contract JCClaimDistributor is EIP712, Ownable {
    using ECDSA for bytes32;

    // The JC token to distribute
    IERC20 public immutable jcToken;
    
    // Address authorized to sign claims
    address public signer;
    
    // Track used nonces to prevent replay attacks
    mapping(bytes32 => bool) public usedNonces;
    
    // EIP-712 type hash for Claim struct
    bytes32 public constant CLAIM_TYPEHASH = keccak256(
        "Claim(address recipient,uint256 amount,bytes32 nonce,uint256 expiry)"
    );
    
    // Events
    event Claimed(address indexed recipient, uint256 amount, bytes32 nonce);
    event SignerUpdated(address indexed oldSigner, address indexed newSigner);
    event TokensWithdrawn(address indexed to, uint256 amount);
    
    // Errors
    error InvalidSignature();
    error NonceAlreadyUsed();
    error ClaimExpired();
    error InsufficientBalance();
    error ZeroAddress();
    
    constructor(
        address _jcToken,
        address _signer
    ) EIP712("JackpotChain", "1") Ownable(msg.sender) {
        if (_jcToken == address(0) || _signer == address(0)) revert ZeroAddress();
        jcToken = IERC20(_jcToken);
        signer = _signer;
    }
    
    /**
     * @notice Claim JC tokens with a valid signature from the backend
     * @param amount Amount of JC tokens to claim (in wei)
     * @param nonce Unique nonce to prevent replay
     * @param expiry Timestamp when the claim expires
     * @param signature EIP-712 signature from the authorized signer
     */
    function claim(
        uint256 amount,
        bytes32 nonce,
        uint256 expiry,
        bytes calldata signature
    ) external {
        // Check expiry
        if (block.timestamp > expiry) revert ClaimExpired();
        
        // Check nonce hasn't been used
        if (usedNonces[nonce]) revert NonceAlreadyUsed();
        
        // Verify signature
        bytes32 structHash = keccak256(
            abi.encode(CLAIM_TYPEHASH, msg.sender, amount, nonce, expiry)
        );
        bytes32 digest = _hashTypedDataV4(structHash);
        address recoveredSigner = ECDSA.recover(digest, signature);
        
        if (recoveredSigner != signer) revert InvalidSignature();
        
        // Mark nonce as used
        usedNonces[nonce] = true;
        
        // Check balance
        if (jcToken.balanceOf(address(this)) < amount) revert InsufficientBalance();
        
        // Transfer tokens
        jcToken.transfer(msg.sender, amount);
        
        emit Claimed(msg.sender, amount, nonce);
    }
    
    /**
     * @notice Update the authorized signer
     * @param newSigner Address of the new signer
     */
    function setSigner(address newSigner) external onlyOwner {
        if (newSigner == address(0)) revert ZeroAddress();
        address oldSigner = signer;
        signer = newSigner;
        emit SignerUpdated(oldSigner, newSigner);
    }
    
    /**
     * @notice Withdraw tokens from the contract (emergency function)
     * @param to Address to send tokens to
     * @param amount Amount to withdraw
     */
    function withdrawTokens(address to, uint256 amount) external onlyOwner {
        if (to == address(0)) revert ZeroAddress();
        jcToken.transfer(to, amount);
        emit TokensWithdrawn(to, amount);
    }
    
    /**
     * @notice Check the contract's token balance
     */
    function tokenBalance() external view returns (uint256) {
        return jcToken.balanceOf(address(this));
    }
    
    /**
     * @notice Get the EIP-712 domain separator
     */
    function domainSeparator() external view returns (bytes32) {
        return _domainSeparatorV4();
    }
}
