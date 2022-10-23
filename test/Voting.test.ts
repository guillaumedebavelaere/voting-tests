import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers } from "hardhat";
import { Voting } from "../typechain-types";

describe("Voting contract test", async function () {
  // Fixture is faster than beforEach see https://hardhat.org/hardhat-runner/docs/guides/test-contracts#using-fixtures
  async function deployVotingFixture() {
    const [owner, otherAccount1, otherAccount2] = await ethers.getSigners();
    const votingContract = await ethers.getContractFactory("Voting");
    const voting: Voting = await votingContract.deploy();

    return { voting, owner, otherAccount1, otherAccount2 };
  }

  describe("addVoter", () => {
    it("reverts when the the caller is not the owner", async () => {
      const { voting, otherAccount1 } = await loadFixture(deployVotingFixture);

      await expect(
        // calling addVote from otherAccount1
        voting.connect(otherAccount1).addVoter(otherAccount1.address)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("reverts when the workflow status is not WorkflowStatus.RegisteringVoters ", async () => {
      const { voting, owner } = await loadFixture(deployVotingFixture);
      await voting.startProposalsRegistering(); // moving workflow status to ProposalsRegistrationStarted

      await expect(voting.addVoter(owner.address, { from: owner.address }))
        .to.be.revertedWith("Voters registration is not open yet");
    })

    it("reverts when registering a voter twice", async () => {
      const { voting, owner } = await loadFixture(deployVotingFixture);
      await voting.addVoter(owner.address, { from: owner.address });

      await expect(voting.addVoter(owner.address, { from: owner.address }))
        .to.be.revertedWith("Already registered");
    });

    it("adds a voter", async () => {
      const { voting, owner } = await loadFixture(deployVotingFixture);
      await voting.addVoter(owner.address, { from: owner.address });

      const { isRegistered, hasVoted, votedProposalId } = await voting.getVoter(owner.address);
      expect(isRegistered).to.be.true;
      expect(hasVoted).to.be.false;
      expect(votedProposalId).to.be.equal(0);
    });

    it("emits a VoterRegistered event", async () => {
      const { voting, owner } = await loadFixture(deployVotingFixture);

      await expect(voting.addVoter(owner.address, { from: owner.address }))
        .to.emit(voting, "VoterRegistered").withArgs(owner.address);

    });
  });

  describe("addProposal", async () => {
    it("reverts when the sender is not registered as a voter", async () => {
      const { voting, owner } = await loadFixture(deployVotingFixture);

      await expect(voting.addProposal("Proposal 1", { from: owner.address }))
        .to.be.revertedWith("You're not a voter");
    });

    context("when the sender is registered as a voter", async () => {
      let _voting: Voting;
      let voterAccount: SignerWithAddress;

      beforeEach("register otherAccount1 as a voter", async () => {
        const { voting, owner, otherAccount1 } = await loadFixture(deployVotingFixture);
        await voting.addVoter(otherAccount1.address, { from: owner.address });
        _voting = voting;
        voterAccount = otherAccount1;
      });

      it("reverts when the workflow status is not ProposalsRegistrationStarted", async () => {
        await expect(_voting.connect(voterAccount).addProposal("Proposal 1"))
          .to.be.revertedWith("Proposals are not allowed yet");
      });

      context("when the workflow status is ProposalsRegistrationStarted", async () => {
        beforeEach("move workflow status to ProposalsRegistrationStarted", async () => {
          await _voting.startProposalsRegistering();
        })

        it("reverts when the proposal is empty", async () => {
          await expect(_voting.connect(voterAccount).addProposal(""))
            .to.be.revertedWith("Vous ne pouvez pas ne rien proposer");
        });

        it("adds the proposal", async () => {
          await _voting.connect(voterAccount).addProposal("Proposal 1");

          // Expect proposal to be added at index 1 because genesis proposal is added 
          // by default when proposals registration starts
          const { description, voteCount } = await _voting.connect(voterAccount).getOneProposal(1);
          expect(description).to.equal("Proposal 1");
          expect(voteCount).to.be.equal(0);
        });

        it("emits a ProposalRegistered event", async () => {
          await expect(_voting.connect(voterAccount).addProposal("Proposal 1"))
            .to.emit(_voting, "ProposalRegistered").withArgs(1);
        });
      })
    });
  });

  describe("setVote", async () => {
    it("reverts when the sender is not registered as a voter", async () => {
      const { voting, owner } = await loadFixture(deployVotingFixture);

      await expect(voting.setVote(0, { from: owner.address }))
        .to.be.revertedWith("You're not a voter");
    });

    context("when the sender is registered as a voter", async () => {
      let _voting: Voting;
      let voterAccount: SignerWithAddress;

      beforeEach("register otherAccount1 as a voter", async () => {
        const { voting, owner, otherAccount1 } = await loadFixture(deployVotingFixture);
        await voting.addVoter(otherAccount1.address, { from: owner.address });
        _voting = voting;
        voterAccount = otherAccount1;
      });

      it("reverts when the workflow status is not VotingSessionStarted", async () => {
        await expect(_voting.connect(voterAccount).setVote(0))
          .to.be.revertedWith("Voting session havent started yet");
      });

      context("when the workflow status is VotingSessionStarted", async () => {
        beforeEach("move workflow status to VotingSessionStarted with one proposal", async () => {
          await _voting.startProposalsRegistering();
          await _voting.connect(voterAccount).addProposal("Proposal 1")
          await _voting.endProposalsRegistering();
          await _voting.startVotingSession();
        })

        it("reverts when a voter vote more than once", async () => {
          _voting.connect(voterAccount).setVote(1)

          await expect(_voting.connect(voterAccount).setVote(1))
            .to.be.revertedWith("You have already voted");
        });

        it("reverts when the proposal does not exist", async () => {
          await expect(_voting.connect(voterAccount).setVote(10))
            .to.be.revertedWith("Proposal not found");
        });

        it("adds a vote to the correct proposal", async () => {
          await _voting.connect(voterAccount).setVote(1);
          const { description, voteCount } = await _voting.connect(voterAccount).getOneProposal(1);

          expect(voteCount).to.equal(1);
          expect(description).to.equal("Proposal 1");
        });

        it("updates the voter informations", async () => {
          await _voting.connect(voterAccount).setVote(1);
          const { isRegistered, hasVoted, votedProposalId } = await _voting.connect(voterAccount).getVoter(voterAccount.address);

          expect(hasVoted).to.be.true;
          expect(votedProposalId).to.equal(1);
          expect(isRegistered).to.be.true; // just checking it hasn't changed
        });

        it("emits a Voted event", async () => {
          await expect(_voting.connect(voterAccount).setVote(1))
            .to.emit(_voting, "Voted").withArgs(voterAccount.address, 1);
        });

      });

    });
  });

  describe("startProposalsRegistering", async () => {
    it("reverts when the the caller is not the owner", async () => {
      const { voting, otherAccount1 } = await loadFixture(deployVotingFixture);

      await expect(
        voting.connect(otherAccount1).startProposalsRegistering()
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("reverts when the current status is not RegisteringVoters", async () => {
      const { voting } = await loadFixture(deployVotingFixture);
      // move the current status to a different than RegisteringVoters
      await voting.startProposalsRegistering();

      await expect(voting.startProposalsRegistering())
        .to.be.revertedWith("Registering proposals cant be started now");
    })

    it("stores a GENESIS proposal", async () => {
      const { voting, otherAccount1 } = await loadFixture(deployVotingFixture);
      await voting.addVoter(otherAccount1.address); // registering as a voter in order to call getOneProposal
      await voting.startProposalsRegistering();

      const { description, voteCount } = await voting.connect(otherAccount1).getOneProposal(0);
      expect(description).to.equal("GENESIS");
      expect(voteCount).to.equal(0);
    });

    it("emits a WorkflowStatusChange event", async () => {
      const { voting } = await loadFixture(deployVotingFixture);
      await expect(voting.startProposalsRegistering())
        .to.emit(voting, "WorkflowStatusChange").withArgs(0, 1)
        ;
    });

  })

  describe("endProposalsRegistering", async () => {
    it("reverts when the the caller is not the owner", async () => {
      const { voting, otherAccount1 } = await loadFixture(deployVotingFixture);

      await expect(
        voting.connect(otherAccount1).endProposalsRegistering()
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("reverts when the Registering proposals havent started yet", async () => {
      const { voting } = await loadFixture(deployVotingFixture);

      await expect(voting.endProposalsRegistering())
        .to.be.revertedWith("Registering proposals havent started yet");
    });
  });

  describe("startVotingSession", async () => {
    it("reverts when the the caller is not the owner", async () => {
      const { voting, otherAccount1 } = await loadFixture(deployVotingFixture);

      await expect(
        voting.connect(otherAccount1).startVotingSession()
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("reverts when the Registering proposals phase is not finished", async () => {
      const { voting } = await loadFixture(deployVotingFixture);

      await expect(voting.startVotingSession())
        .to.be.revertedWith("Registering proposals phase is not finished");
    });

  })

  describe("endVotingSession", async () => {
    it("reverts when the the caller is not the owner", async () => {
      const { voting, otherAccount1 } = await loadFixture(deployVotingFixture);

      await expect(
        voting.connect(otherAccount1).endVotingSession()
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("reverts when the Voting session havent started yet", async () => {
      const { voting } = await loadFixture(deployVotingFixture);

      await expect(voting.endVotingSession())
        .to.be.revertedWith("Voting session havent started yet");
    });
  })

  describe("tallyVotes", async () => {
    it("reverts when the the caller is not the owner", async () => {
      const { voting, otherAccount1 } = await loadFixture(deployVotingFixture);

      await expect(
        voting.connect(otherAccount1).tallyVotes()
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("reverts when the Current status is not voting session ended", async () => {
      const { voting } = await loadFixture(deployVotingFixture);

      await expect(voting.tallyVotes())
        .to.be.revertedWith("Current status is not voting session ended");
    });

    it("sets the winnning proposal id", async () => {
      const { voting, owner, otherAccount1 } = await loadFixture(deployVotingFixture);
      const voterAccount = otherAccount1;
      // Runs a scenario up to tally votes step
      await voting.addVoter(voterAccount.address, { from: owner.address });
      await voting.startProposalsRegistering();
      await voting.connect(voterAccount).addProposal("Proposal 1")
      await voting.endProposalsRegistering();
      await voting.startVotingSession();
      await voting.connect(voterAccount).setVote(1);
      await voting.endVotingSession();

      await voting.tallyVotes();
      const winningProposalId = await voting.winningProposalID();
      expect(winningProposalId).to.equal(1);
    })

  });

  describe("Workflow status changes", async () => {
    let _voting: Voting;

    before(async () => {
      const { voting, owner, otherAccount1 } = await loadFixture(deployVotingFixture);
      await voting.addVoter(otherAccount1.address, { from: owner.address });
      _voting = voting;
    });

    it("startProposalsRegistering emits a WorkflowStatusChange", async () => {
      await expect(_voting.startProposalsRegistering())
        .to.emit(_voting, "WorkflowStatusChange").withArgs(0, 1);
    })

    it("endProposalsRegistering emits a WorkflowStatusChange", async () => {
      await expect(_voting.endProposalsRegistering())
        .to.emit(_voting, "WorkflowStatusChange").withArgs(1, 2);
    })

    it("startVotingSession emits a WorkflowStatusChange", async () => {
      await expect(_voting.startVotingSession())
        .to.emit(_voting, "WorkflowStatusChange").withArgs(2, 3);
    })

    it("endVotingSession emits a WorkflowStatusChange", async () => {
      await expect(_voting.endVotingSession())
        .to.emit(_voting, "WorkflowStatusChange").withArgs(3, 4);
    })

    context("tallyVotes",async () => {
      it("emits a WorkflowStatusChange", async () => {
        await expect(_voting.tallyVotes())
          .to.emit(_voting, "WorkflowStatusChange").withArgs(4, 5);
      })
  
      it("changes the workflow status to VotesTallied", async () => {
        const workflowStatus = await _voting.workflowStatus();
        expect(workflowStatus).to.equal(5);
      });
    });
  });
});