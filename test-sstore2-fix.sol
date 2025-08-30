// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./src/nft/libraries/SSTORE2Enhanced.sol";

contract TestSSTORE2Fix {
    event DataStored(address indexed pointer, uint256 dataLength);
    event DataRetrieved(bytes data);
    
    function testStoreData(string memory testData) external returns (address pointer) {
        bytes memory data = bytes(testData);
        
        // Try enhanced SSTORE2 with higher gas
        pointer = SSTORE2Enhanced.write(data);
        
        emit DataStored(pointer, data.length);
        return pointer;
    }
    
    function testStoreSVGData(bytes memory svgData) external returns (address pointer) {
        // Try storing actual SVG data
        pointer = SSTORE2Enhanced.write(svgData);
        
        emit DataStored(pointer, svgData.length);
        return pointer;
    }
    
    function testReadData(address pointer) external returns (bytes memory) {
        bytes memory data = SSTORE2Enhanced.read(pointer);
        emit DataRetrieved(data);
        return data;
    }
    
    function testWithSalt(string memory testData) external returns (address pointer) {
        bytes memory data = bytes(testData);
        
        // Try CREATE2 approach
        pointer = SSTORE2Enhanced.writeWithSalt(data);
        
        emit DataStored(pointer, data.length);
        return pointer;
    }
}