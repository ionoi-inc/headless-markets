// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

interface IUniswapV2Factory {
    function createPair(address tokenA, address tokenB) external returns (address pair);
}

interface IUniswapV2Router02 {
    function addLiquidityETH(
        address token,
        uint amountTokenDesired,
        uint amountTokenMin,
        uint amountETHMin,
        address to,
        uint deadline
    ) external payable returns (uint amountToken, uint amountETH, uint liquidity);
}

/**
 * @title BondingCurveToken
 * @notice ERC20 token with bonding curve pricing and automatic Uniswap V2 graduation
 * @dev Implements Stage 3 (Market Launch) and Stage 4 (Graduation)
 */
contract BondingCurveToken is ERC20, ReentrancyGuard {
    
    // ============ Structs ============
    
    struct FeeRecipients {
        address platform;      // 30% fee
        address agentTreasury; // 10% fee
        // 60% stays in curve for liquidity
    }
    
    // ============ State Variables ============
    
    // Bonding curve parameters
    uint256 public constant GRADUATION_THRESHOLD = 10 ether; // 10 ETH cap
    uint256 public constant INITIAL_PRICE = 0.00001 ether;   // Starting price per token
    uint256 public constant PRICE_INCREMENT = 1;             // Linear curve increment
    
    // Fee split: 30% platform, 60% liquidity, 10% agents
    uint256 public constant PLATFORM_FEE_BPS = 3000;  // 30%
    uint256 public constant AGENT_FEE_BPS = 1000;     // 10%
    uint256 public constant LIQUIDITY_BPS = 6000;     // 60%
    uint256 public constant BPS_DIVISOR = 10000;      // 100%
    
    FeeRecipients public feeRecipients;
    
    // Quorum members (receive agent fee split)
    address[] public quorumMembers;
    mapping(address => bool) public isQuorumMember;
    
    // Bonding curve state
    uint256 public totalETHRaised;
    uint256 public liquidityReserve; // 60% of ETH goes here
    bool public graduated;
    
    // Uniswap V2 integration
    address public uniswapV2Router;
    address public uniswapV2Pair;
    address public constant WETH = address(0x4200000000000000000000000000000000000006); // Base WETH
    
    uint256 public proposalId; // Link back to quorum proposal
    
    // ============ Events ============
    
    event TokensPurchased(
        address indexed buyer,
        uint256 ethAmount,
        uint256 tokenAmount,
        uint256 newPrice
    );
    
    event TokensSold(
        address indexed seller,
        uint256 tokenAmount,
        uint256 ethAmount,
        uint256 newPrice
    );
    
    event Graduated(
        address indexed uniswapPair,
        uint256 liquidityETH,
        uint256 liquidityTokens
    );
    
    event FeesDistributed(
        uint256 platformFee,
        uint256 agentFee,
        uint256 liquidityAmount
    );
    
    // ============ Constructor ============
    
    constructor(
        string memory name,
        string memory symbol,
        address[] memory _quorumMembers,
        address _platformFeeRecipient,
        address _uniswapV2Router,
        uint256 _proposalId
    ) ERC20(name, symbol) {
        require(_quorumMembers.length >= 3 && _quorumMembers.length <= 5, "Invalid quorum size");
        require(_platformFeeRecipient != address(0), "Invalid platform address");
        require(_uniswapV2Router != address(0), "Invalid router address");
        
        quorumMembers = _quorumMembers;
        for (uint256 i = 0; i < _quorumMembers.length; i++) {
            isQuorumMember[_quorumMembers[i]] = true;
        }
        
        // Agent treasury is a simple splitter (could be more sophisticated)
        feeRecipients.platform = _platformFeeRecipient;
        feeRecipients.agentTreasury = address(this); // Distributed on claim
        
        uniswapV2Router = _uniswapV2Router;
        proposalId = _proposalId;
    }
    
    // ============ Bonding Curve Functions ============
    
    /**
     * @notice Calculate purchase price for a given ETH amount
     * @dev Uses linear bonding curve: price = INITIAL_PRICE + (totalSupply * PRICE_INCREMENT)
     */
    function calculatePurchaseReturn(uint256 ethAmount) public view returns (uint256) {
        if (ethAmount == 0) return 0;
        
        uint256 currentPrice = getCurrentPrice();
        // Simplified linear calculation
        // In production, use integral calculus for exact curve pricing
        uint256 tokenAmount = (ethAmount * 1e18) / currentPrice;
        
        return tokenAmount;
    }
    
    /**
     * @notice Calculate sale return for a given token amount
     */
    function calculateSaleReturn(uint256 tokenAmount) public view returns (uint256) {
        if (tokenAmount == 0) return 0;
        require(tokenAmount <= totalSupply(), "Exceeds supply");
        
        uint256 currentPrice = getCurrentPrice();
        uint256 ethAmount = (tokenAmount * currentPrice) / 1e18;
        
        // Can only sell up to available liquidity reserve
        if (ethAmount > liquidityReserve) {
            ethAmount = liquidityReserve;
        }
        
        return ethAmount;
    }
    
    /**
     * @notice Get current token price based on supply
     */
    function getCurrentPrice() public view returns (uint256) {
        uint256 supply = totalSupply();
        return INITIAL_PRICE + ((supply / 1e18) * PRICE_INCREMENT);
    }
    
    /**
     * @notice Buy tokens with ETH
     */
    function buy() external payable nonReentrant {
        require(!graduated, "Already graduated");
        require(msg.value > 0, "Must send ETH");
        
        uint256 tokenAmount = calculatePurchaseReturn(msg.value);
        require(tokenAmount > 0, "Invalid token amount");
        
        // Distribute fees
        uint256 platformFee = (msg.value * PLATFORM_FEE_BPS) / BPS_DIVISOR;
        uint256 agentFee = (msg.value * AGENT_FEE_BPS) / BPS_DIVISOR;
        uint256 liquidityAmount = msg.value - platformFee - agentFee;
        
        // Send platform fee
        (bool platformSuccess, ) = feeRecipients.platform.call{value: platformFee}("");
        require(platformSuccess, "Platform fee transfer failed");
        
        // Agent fee stays in contract for distribution
        // Liquidity reserve
        liquidityReserve += liquidityAmount;
        totalETHRaised += msg.value;
        
        // Mint tokens to buyer
        _mint(msg.sender, tokenAmount);
        
        emit TokensPurchased(msg.sender, msg.value, tokenAmount, getCurrentPrice());
        emit FeesDistributed(platformFee, agentFee, liquidityAmount);
        
        // Check if graduation threshold reached
        if (totalETHRaised >= GRADUATION_THRESHOLD && !graduated) {
            _graduate();
        }
    }
    
    /**
     * @notice Sell tokens back to bonding curve
     */
    function sell(uint256 tokenAmount) external nonReentrant {
        require(!graduated, "Already graduated - use Uniswap");
        require(tokenAmount > 0, "Must sell positive amount");
        require(balanceOf(msg.sender) >= tokenAmount, "Insufficient balance");
        
        uint256 ethAmount = calculateSaleReturn(tokenAmount);
        require(ethAmount > 0, "Invalid ETH amount");
        require(liquidityReserve >= ethAmount, "Insufficient liquidity");
        
        // Burn tokens
        _burn(msg.sender, tokenAmount);
        
        // Reduce liquidity reserve
        liquidityReserve -= ethAmount;
        
        // Send ETH to seller
        (bool success, ) = msg.sender.call{value: ethAmount}("");
        require(success, "ETH transfer failed");
        
        emit TokensSold(msg.sender, tokenAmount, ethAmount, getCurrentPrice());
    }
    
    // ============ Graduation Functions ============
    
    /**
     * @notice Automatically graduate to Uniswap V2 when threshold reached
     * @dev Creates pair, adds liquidity, locks LP tokens
     */
    function _graduate() internal {
        require(!graduated, "Already graduated");
        require(totalETHRaised >= GRADUATION_THRESHOLD, "Threshold not reached");
        
        graduated = true;
        
        // Create Uniswap V2 pair
        IUniswapV2Factory factory = IUniswapV2Factory(
            IUniswapV2Router02(uniswapV2Router).factory()
        );
        uniswapV2Pair = factory.createPair(address(this), WETH);
        
        // Calculate liquidity amounts
        uint256 liquidityETH = liquidityReserve;
        uint256 liquidityTokens = totalSupply() / 2; // 50% of supply to Uniswap
        
        // Mint additional tokens for liquidity
        _mint(address(this), liquidityTokens);
        
        // Approve router
        _approve(address(this), uniswapV2Router, liquidityTokens);
        
        // Add liquidity to Uniswap V2
        IUniswapV2Router02(uniswapV2Router).addLiquidityETH{value: liquidityETH}(
            address(this),
            liquidityTokens,
            0, // Accept any amount of tokens
            0, // Accept any amount of ETH
            address(0), // Burn LP tokens (permanent liquidity lock)
            block.timestamp + 15 minutes
        );
        
        emit Graduated(uniswapV2Pair, liquidityETH, liquidityTokens);
    }
    
    /**
     * @notice Allow manual graduation trigger if threshold reached
     */
    function graduate() external {
        require(!graduated, "Already graduated");
        require(totalETHRaised >= GRADUATION_THRESHOLD, "Threshold not reached");
        _graduate();
    }
    
    // ============ Agent Fee Distribution ============
    
    /**
     * @notice Claim agent fees (distributed equally among quorum members)
     */
    function claimAgentFees() external {
        require(isQuorumMember[msg.sender], "Not a quorum member");
        
        uint256 totalAgentFees = address(this).balance - liquidityReserve;
        require(totalAgentFees > 0, "No fees to claim");
        
        uint256 feePerAgent = totalAgentFees / quorumMembers.length;
        require(feePerAgent > 0, "Insufficient fees");
        
        // Send fee to caller
        (bool success, ) = msg.sender.call{value: feePerAgent}("");
        require(success, "Fee transfer failed");
    }
    
    // ============ View Functions ============
    
    function getQuorumMembers() external view returns (address[] memory) {
        return quorumMembers;
    }
    
    function getMarketStats() external view returns (
        uint256 price,
        uint256 supply,
        uint256 ethRaised,
        uint256 liquidityPool,
        bool isGraduated,
        uint256 progressToGraduation
    ) {
        return (
            getCurrentPrice(),
            totalSupply(),
            totalETHRaised,
            liquidityReserve,
            graduated,
            (totalETHRaised * 100) / GRADUATION_THRESHOLD
        );
    }
    
    // ============ Fallback ============
    
    receive() external payable {
        // Allow contract to receive ETH for graduation
    }
}
