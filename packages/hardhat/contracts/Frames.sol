
pragma solidity >=0.6.0 <0.8.0;
pragma experimental ABIEncoderV2;
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

contract Frames is ERC721 {
  using Counters for Counters.Counter;
  using Strings for uint256;
  Counters.Counter private _tokenIds;
  mapping (uint256 => string[]) private _tokenURIs;
  uint256 public minted;
  uint256 public maxSupply = 369;
  uint256 public mintPrice = 20000000000000000;//0.03 ETH
  mapping (uint256 => uint256) public iterations;
  mapping(address=>bool) public wl;//whitelist
  address private owner;

  event Mint(uint256 id, address recipient);

  modifier onlyOwner() {
      require(msg.sender == owner, "not owner");
      _;
  }
  
  constructor() ERC721("Frame", "Frame") {
    owner = 0x804C4AC4FdC73767b54F8E69eB447d64516F912F;
  }  

  function setOwner(address newowner) public onlyOwner() {
    owner = newowner;
  }

  function addToWhitelist(address add) public onlyOwner() {
    wl[add] = true;

  }
  
  function _setTokenURI(uint256 tokenId, string memory _tokenURI)
    internal
    override
    virtual
  {
    
    _tokenURIs[tokenId].push(_tokenURI);
    
  }  
  
  function tokenURI(uint256 tokenId) 
    public
    view
    virtual
    override
    returns (string memory)
  {
    require(_exists(tokenId), "ERC721Metadata: URI query for nonexistent token");
    uint256 iteration = iterations[tokenId];
    string memory _tokenURI = _tokenURIs[tokenId][iteration];
    return _tokenURI;
  }

  function history(uint256 tokenId)
    public 
    view
    virtual
    returns (string[] memory) {
      require(_exists(tokenId), "ERC721Metadata: URI query for nonexistent token");
      return _tokenURIs[tokenId];
    } 

    function update(uint256 tokenId, string memory uri) public {
      require(ownerOf(tokenId) == msg.sender, "You can't update this Frame, its not yours.");
      iterations[tokenId]+=1;
      _setTokenURI(tokenId, uri);
    }
  
   function mint(address recipient, string memory uri, address referal)
    public
    payable
  {
    require(_tokenIds.current() < maxSupply, "All frames have been minted");
    require(msg.value >= mintPrice || wl[msg.sender], "Ser you must pay to play");
   
    if (wl[msg.sender]) {
      wl[msg.sender] = false;
    }

    _tokenIds.increment();
    uint256 newItemId = _tokenIds.current();   
    minted = newItemId; 
    _mint(recipient, newItemId);
    _setTokenURI(newItemId, uri);

    emit Mint(newItemId, recipient);
   
    if (referal != 0x0000000000000000000000000000000000000000) {
        //someone refered, they get 10% of sale
        payable(referal).transfer(msg.value / 10);
    }
  }
}

