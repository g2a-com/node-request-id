import { describe, it } from 'mocha';
import { expect } from 'chai';
import * as requestId from '../src';

describe('request-id', function () {
  describe('generateRootId', function () {
    it('should generate an ID', function () {
      const rootId = requestId.generateRootId();
      expect(rootId).to.match(/^\|[0-9a-zA-Z/+=-]{36}\.$/);
    });
  });

  describe('generateIncomingId', function () {
    it('should generate a new Incoming ID, even if it\'s already in the Incoming ID format', function () {
      const inputIncomingId = '|AABBCCDD.EE_';
      const outputIncomingId = requestId.generateIncomingId(inputIncomingId);

      expect(outputIncomingId).to.match(/^[|]AABBCCDD[.]EE_[0-9a-zA-Z/+=-]{8}[.][0-9a-zA-Z/+=-]{8}_$/);
    });

    it('should generate a new Incoming ID using provided Root ID', function () {
      const rootId = '|AABBCCDD.';
      const incomingId = requestId.generateIncomingId(rootId);

      expect(incomingId).to.match(/^[|]AABBCCDD[.][0-9a-zA-Z/+=-]{8}_$/);
    });

    it('should generate a new Incoming ID using provided Outgoing ID', function () {
      const outgoingId = '|AABBCCDD.EEFFGGHH_IIJJKKLL.';
      const incomingId = requestId.generateIncomingId(outgoingId);

      expect(incomingId).to.match(/^[|]AABBCCDD[.]EEFFGGHH_IIJJKKLL.[0-9a-zA-Z/+=-]{8}_$/);
    });

    it('should generate a new Overflowed ID using provided Overflowed ID', function () {
      const overflowedId = '|AABBCCDD.EEFFGGHH#';
      const incomingId = requestId.generateIncomingId(overflowedId);

      expect(incomingId).to.be.not.equal(overflowedId);
      expect(incomingId).to.match(/^[|]AABBCCDD[.][0-9a-zA-Z/+=-]{8}#$/);
    });

    it('should generate a new Overflowed ID instead of a Incoming ID if new Incoming ID couldn\'t be extended any more', function () {
      const rootId = '|AABBCCDD.';
      const maxNumberOfParts = Math.floor((1024 - rootId.length - 8 - 1) / 18);
      const outgoingId = rootId + '12345678_12345678.'.repeat(maxNumberOfParts);

      const incomingId = requestId.generateIncomingId(outgoingId);

      expect(incomingId.slice(0, outgoingId.length)).to.be.equal(outgoingId);
      expect(incomingId).to.have.length(outgoingId.length + 8 + 1);
      expect(incomingId).to.match(/^[|]AABBCCDD[.](12345678_12345678[.])+[0-9a-zA-Z/+=-]{8}#$/);
    });
  });

  describe('generateOutgoingId', function () {
    it('should generate a new Outgoing ID using provided Incoming ID', function () {
      const incomingId = '|AABBCCDD.EEFFGGHH_';
      const outgoingId = requestId.generateOutgoingId(incomingId);

      expect(outgoingId).to.match(/^[|]AABBCCDD[.]EEFFGGHH_[0-9a-zA-Z/+=-]{8}.$/);
    });

    it('should generate a new Overflowed ID using provided Overflowed ID', function () {
      const overflowedId = '|AABBCCDD.EEFFGGHH#';
      const outgoingId = requestId.generateOutgoingId(overflowedId);

      expect(outgoingId).to.be.not.equal(overflowedId);
      expect(outgoingId).to.match(/^[|]AABBCCDD[.][0-9a-zA-Z/+=-]{8}#$/);
    });

    it('should generate a new Overflowed ID instead of a Outgoing ID if new Outgoing ID couldn\'t be extended any more', function () {
      const rootId = '|AABBCCDD.';
      const suffix = '12345678_';
      const maxNumberOfParts = Math.floor((1024 - rootId.length - suffix.length - 8 - 1) / 18);
      const incomingId = rootId + '12345678_12345678.'.repeat(maxNumberOfParts) + suffix;

      const outgoingId = requestId.generateOutgoingId(incomingId);

      expect(outgoingId.slice(0, incomingId.length - suffix.length)).to.be.equal(incomingId.slice(0, -suffix.length));
      expect(outgoingId).to.have.length(incomingId.length - suffix.length + 8 + 1);
      expect(outgoingId).to.match(/^[|]AABBCCDD[.](12345678_12345678[.])+[0-9a-zA-Z/+=-]{8}#$/);
    });
  });

  describe('generateOverflowedId', function () {
    it('should generate a new Overflowed ID based on a provided ID', function () {
      const baseId = '|AABBCCDD.';
      const overflowedId = requestId.generateOverflowedId(baseId);

      expect(overflowedId).to.match(/^[|]AABBCCDD[.][0-9a-zA-Z/+=-]{8}#$/);
    });

    it('should generate a new Overflowed ID from a provided ID when there is no place for a local ID left', function () {
      const baseId = '|AABBCCDD.EEFFGGHH_IIJJKKLL.'.padEnd(1023, 'X') + '.';
      const overflowedId = requestId.generateOverflowedId(baseId);

      expect(overflowedId).to.match(/^[|]AABBCCDD[.]EEFFGGHH_IIJJKKLL[.][0-9a-zA-Z/+=-]{8}#$/);
    });

    it('should generate a new Overflowed ID from an Overflowed ID', function () {
      const baseId = '|AABBCCDD.EEFFGGHH#';
      const overflowedId = requestId.generateOverflowedId(baseId);

      expect(overflowedId).to.be.not.equal(baseId);
      expect(overflowedId).to.match(/^[|]AABBCCDD[.][0-9a-zA-Z/+=-]{8}#$/);
    });

    it('should use new root id when provided id is not valid', function () {
      const baseId = 'ZAŻÓŁĆ GĘŚLĄ JAŹŃ';
      const overflowedId = requestId.generateOverflowedId(baseId);

      expect(overflowedId).to.be.not.equal(baseId);
      expect(overflowedId).to.match(/^[|][^.]+[.][0-9a-zA-Z/+=-]{8}#$/);
    });
  });

  describe('isValid', function () {
    it(`should return "true" for valid IDs`, function () {
      const validIds = [
        '|a.',
        '|a.b.',
        '|a.b.c.',
        '|a.b.c#',
        '|a.b.c_',
        '|a.b_c.',
        '|a.b_c.d.',
        '|a.b_c.d_',
        '|a.b_c.d#',
        '|' + 'a'.repeat(1024 - 2 - 9) + '.b.'
      ];

      for (const id of validIds) {
        const result = requestId.isValid(id);
        expect(result).to.be.equal(true, `should return "true" for "${id}"`);
      }
    });

    it(`should return "true" for valid IDs`, function () {
      const invalidIds = [
        '',
        '|',
        '|.',
        '|a',
        '|a.b',
        '|a.b_.c.',
        '|a.b#.c.',
        '|a.b..c.',
        '|a.b.' + 'c'.repeat(2000) + '.d.',
        '|' + 'a'.repeat(1024 - 2 - 9 + 1) + '.b.'
      ];

      for (const id of invalidIds) {
        const result = requestId.isValid(id);
        expect(result).to.be.equal(false, `should return "false" for "${id}"`);
      }
    });
  });

  describe('isOverflowed', function () {
    it('should return "true" when id ends with "#"', function () {
      const id = '|a.b#';
      const result = requestId.isOverflowed(id);
      expect(result).to.be.equal(true);
    });

    it('should return "false" when id doesn\'t end with "#"', function () {
      const id = '|a.'.padEnd(1023, 'b') + '.';
      const result = requestId.isOverflowed(id);
      expect(result).to.be.equal(false);
    });

    it('should return "false" when id is not valid', function () {
      const id = '|a#';
      const result = requestId.isOverflowed(id);
      expect(result).to.be.equal(false);
    });
  });

  describe('isIncoming', function () {
    it('should return "true" when id ends with "_"', function () {
      const id = '|a.b_';
      const result = requestId.isIncoming(id);
      expect(result).to.be.equal(true);
    });

    it('should return "false" when id doesn\'t end with "_"', function () {
      const id = '|a.b_c.';
      const result = requestId.isIncoming(id);
      expect(result).to.be.equal(false);
    });

    it('should return "false" when id is not valid', function () {
      const id = '|a';
      const result = requestId.isIncoming(id);
      expect(result).to.be.equal(false);
    });
  });

  describe('isOutgoing', function () {
    it('should return "true" when id ends with "."', function () {
      const id = '|a.b_c.';
      const result = requestId.isOutgoing(id);
      expect(result).to.be.equal(true);
    });

    it('should return "false" when id doesn\'t end with "."', function () {
      const id = '|a.b_';
      const result = requestId.isOutgoing(id);
      expect(result).to.be.equal(false);
    });

    it('should return "false" when id is a Root ID', function () {
      const id = '|a.';
      const result = requestId.isOutgoing(id);
      expect(result).to.be.equal(false);
    });

    it('should return "false" when id is not valid', function () {
      const id = '|a';
      const result = requestId.isOutgoing(id);
      expect(result).to.be.equal(false);
    });
  });

  describe('isRoot', function () {
    it('should return "true" when id have only one segment', function () {
      const id = '|a.';
      const result = requestId.isRoot(id);
      expect(result).to.be.equal(true);
    });

    it('should return "false" when has more segments', function () {
      const id = '|a.b.';
      const result = requestId.isRoot(id);
      expect(result).to.be.equal(false);
    });

    it('should return "false" when id is not valid', function () {
      const id = '|a';
      const result = requestId.isRoot(id);
      expect(result).to.be.equal(false);
    });
  });

  describe('extractRootId', function () {
    it('should return null when id is invalid', function () {
      const id = '|a';
      const result = requestId.extractRootId(id);
      expect(result).to.be.equal(null);
    });

    it('should return specified id when it\'s alread a root ID', function () {
      const id = '|a.';
      const result = requestId.extractRootId(id);
      expect(result).to.be.equal(id);
    });

    it('should return root ID when id is valid and it\'s not root id', function () {
      const id = '|a.b_c.d.e.f#';
      const result = requestId.extractRootId(id);
      expect(result).to.be.equal('|a.');
    });
  });
});
