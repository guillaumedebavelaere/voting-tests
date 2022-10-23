[![CI](https://github.com/guillaumedebavelaere/voting-tests/actions/workflows/ci.yml/badge.svg)](https://github.com/guillaumedebavelaere/voting-tests/actions/workflows/ci.yml)
[![Coverage Status](https://coveralls.io/repos/github/guillaumedebavelaere/voting-tests/badge.svg?branch=master)](https://coveralls.io/github/guillaumedebavelaere/voting-tests?branch=master)

# Voting tests

This project demonstrates the voting contract testing with Hardhat.

The tests have been organized by methods mainly.
A specific category for testing workflow events has been created so it is easier
to test the consecutive workflow status changes.

## Requirements 

It requires a node version > 16

## Installation
`npm install`

## Run Tests
`npx hardhat test`

## Run tests with gas reporter
`REPORT_GAS=true npx hardhat test`

## Run coverage
`npx hardhat coverage`


## Test Results

```

  Voting contract test
    addVoter
      ✔ reverts when the the caller is not the owner (645ms)
      ✔ reverts when the workflow status is not WorkflowStatus.RegisteringVoters 
      ✔ reverts when registering a voter twice
      ✔ adds a voter
      ✔ emits a VoterRegistered event
    addProposal
      ✔ reverts when the sender is not registered as a voter
      when the sender is registered as a voter
        ✔ reverts when the workflow status is not ProposalsRegistrationStarted
        when the workflow status is ProposalsRegistrationStarted
          ✔ reverts when the proposal is empty
          ✔ adds the proposal
          ✔ emits a ProposalRegistered event
    setVote
      ✔ reverts when the sender is not registered as a voter
      when the sender is registered as a voter
        ✔ reverts when the workflow status is not VotingSessionStarted
        when the workflow status is VotingSessionStarted
          ✔ reverts when a voter vote more than once
          ✔ reverts when the proposal does not exist
          ✔ adds a vote to the correct proposal
          ✔ updates the voter informations
          ✔ emits a Voted event
    startProposalsRegistering
      ✔ reverts when the the caller is not the owner
      ✔ reverts when the current status is not RegisteringVoters
      ✔ stores a GENESIS proposal
      ✔ emits a WorkflowStatusChange event
    endProposalsRegistering
      ✔ reverts when the the caller is not the owner
      ✔ reverts when the Registering proposals havent started yet
    startVotingSession
      ✔ reverts when the the caller is not the owner
      ✔ reverts when the Registering proposals phase is not finished
    endVotingSession
      ✔ reverts when the the caller is not the owner
      ✔ reverts when the Voting session havent started yet
    tallyVotes
      ✔ reverts when the the caller is not the owner
      ✔ reverts when the Current status is not voting session ended
      ✔ sets the winnning proposal id (43ms)
    Workflow status changes
      ✔ startProposalsRegistering emits a WorkflowStatusChange
      ✔ endProposalsRegistering emits a WorkflowStatusChange
      ✔ startVotingSession emits a WorkflowStatusChange
      ✔ endVotingSession emits a WorkflowStatusChange
      tallyVotes
        ✔ emits a WorkflowStatusChange
        ✔ changes the workflow status to VotesTallied

  36 passing (1s)
```

## Gas reporter
```
·------------------------------------------|----------------------------|-------------|-----------------------------·
|           Solc version: 0.8.17           ·  Optimizer enabled: false  ·  Runs: 200  ·  Block limit: 30000000 gas  │
···········································|····························|·············|······························
|  Methods                                                                                                          │
·············|·····························|··············|·············|·············|···············|··············
|  Contract  ·  Method                     ·  Min         ·  Max        ·  Avg        ·  # calls      ·  usd (avg)  │
·············|·····························|··············|·············|·············|···············|··············
|  Voting    ·  addProposal                ·           -  ·          -  ·      59280  ·            9  ·          -  │
·············|·····························|··············|·············|·············|···············|··············
|  Voting    ·  addVoter                   ·           -  ·          -  ·      50220  ·           17  ·          -  │
·············|·····························|··············|·············|·············|···············|··············
|  Voting    ·  endProposalsRegistering    ·           -  ·          -  ·      30599  ·            8  ·          -  │
·············|·····························|··············|·············|·············|···············|··············
|  Voting    ·  endVotingSession           ·           -  ·          -  ·      30533  ·            3  ·          -  │
·············|·····························|··············|·············|·············|···············|··············
|  Voting    ·  setVote                    ·           -  ·          -  ·      78013  ·            6  ·          -  │
·············|·····························|··············|·············|·············|···············|··············
|  Voting    ·  startProposalsRegistering  ·           -  ·          -  ·      95032  ·           16  ·          -  │
·············|·····························|··············|·············|·············|···············|··············
|  Voting    ·  startVotingSession         ·           -  ·          -  ·      30554  ·            8  ·          -  │
·············|·····························|··············|·············|·············|···············|··············
|  Voting    ·  tallyVotes                 ·       37849  ·      60661  ·      45453  ·            3  ·          -  │
·············|·····························|··············|·············|·············|···············|··············
|  Deployments                             ·                                          ·  % of limit   ·             │
···········································|··············|·············|·············|···············|··············
|  Voting                                  ·           -  ·          -  ·    2077414  ·        6.9 %  ·          -  │
·------------------------------------------|--------------|-------------|-------------|---------------|-------------·
```

## Coverage

```
-------------|----------|----------|----------|----------|----------------|
File         |  % Stmts | % Branch |  % Funcs |  % Lines |Uncovered Lines |
-------------|----------|----------|----------|----------|----------------|
 contracts/  |      100 |    95.83 |      100 |      100 |                |
  Voting.sol |      100 |    95.83 |      100 |      100 |                |
-------------|----------|----------|----------|----------|----------------|
All files    |      100 |    95.83 |      100 |      100 |                |
-------------|----------|----------|----------|----------|----------------|
```

A simple CI worfklow has been added to run build, test and coverage (`.github/workflows/ci.yml`).

The last step of this worflow use Coveralls to generate a more detailed report.

You can see the detailed report clicking directly on the badge: 
[![Coverage Status](https://coveralls.io/repos/github/guillaumedebavelaere/voting-tests/badge.svg?branch=master)](https://coveralls.io/github/guillaumedebavelaere/voting-tests?branch=master)