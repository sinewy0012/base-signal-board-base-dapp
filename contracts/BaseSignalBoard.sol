// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract BaseSignalBoard {
    uint256 public nextSignalId = 1;

    struct SignalEntry {
        address author;
        string title;
        string direction;
        uint256 intensity;
        string note;
        uint256 createdAt;
    }

    mapping(uint256 => SignalEntry) private signalEntries;

    event SignalPublished(
        uint256 indexed signalId,
        address indexed author,
        string title,
        string direction,
        uint256 intensity,
        string note
    );

    function publishSignal(
        string calldata title,
        string calldata direction,
        uint256 intensity,
        string calldata note
    ) external returns (uint256 signalId) {
        require(bytes(title).length > 0 && bytes(title).length <= 24, "Invalid title");
        require(bytes(note).length > 0 && bytes(note).length <= 160, "Invalid note");
        require(_isDirection(direction), "Invalid direction");
        require(intensity <= 100, "Invalid intensity");

        signalId = nextSignalId++;
        signalEntries[signalId] = SignalEntry({
            author: msg.sender,
            title: title,
            direction: direction,
            intensity: intensity,
            note: note,
            createdAt: block.timestamp
        });

        emit SignalPublished(signalId, msg.sender, title, direction, intensity, note);
    }

    function getSignal(
        uint256 signalId
    )
        external
        view
        returns (
            address author,
            string memory title,
            string memory direction,
            uint256 intensity,
            string memory note,
            uint256 createdAt
        )
    {
        SignalEntry storage entry = signalEntries[signalId];
        return (
            entry.author,
            entry.title,
            entry.direction,
            entry.intensity,
            entry.note,
            entry.createdAt
        );
    }

    function _isDirection(string calldata direction) internal pure returns (bool) {
        bytes32 hash = keccak256(bytes(direction));
        return
            hash == keccak256("UP") ||
            hash == keccak256("DOWN") ||
            hash == keccak256("HOLD");
    }
}
