const dayjs = require('dayjs');

jest.mock('../../models', () => ({
  Assignment: {
    findOne: jest.fn(),
    findByPk: jest.fn(),
  },
  Device: {
    findByPk: jest.fn(),
  },
}));

const { Assignment, Device } = require('../../models');
const { confirmAssignment } = require('../confirmController');
const { hashToken } = require('../../utils/assignmentToken');

const mockReqRes = (token) => {
  const req = {
    body: { token },
    query: {},
    ip: '1.1.1.1',
    get: jest.fn().mockReturnValue('jest-agent'),
  };
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
  };
  return { req, res };
};

describe('confirmAssignment', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('confirm success when token valid and device available', async () => {
    const token = 'abc';
    const tokenHash = hashToken(token);
    const device = { status: 'available', code: 'DEV-1', update: jest.fn() };
    const assignment = {
      id: 1,
      status: 'PENDING_CONFIRM',
      employeeName: 'John',
      confirmTokenExpiresAt: dayjs().add(1, 'hour').toDate(),
      confirmToken: tokenHash,
      device_id: 10,
      Device: device,
      update: jest.fn(),
    };
    Assignment.findOne.mockResolvedValue(assignment);

    const { req, res } = mockReqRes(token);
    await confirmAssignment(req, res);

    expect(device.update).toHaveBeenCalledWith({ status: 'assigned' });
    expect(assignment.update).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'CONFIRMED', confirmToken: null }),
    );
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ ok: true, code: assignment.id, deviceCode: device.code }),
    );
  });

  test('fails when token expired', async () => {
    const token = 'expired-token';
    const tokenHash = hashToken(token);
    const assignment = {
      id: 2,
      status: 'PENDING_CONFIRM',
      employeeName: 'Jane',
      confirmTokenExpiresAt: dayjs().subtract(1, 'hour').toDate(),
      confirmToken: tokenHash,
      Device: { status: 'available', code: 'DEV-2', update: jest.fn() },
      update: jest.fn(),
    };
    Assignment.findOne.mockResolvedValue(assignment);

    const { req, res } = mockReqRes(token);
    await confirmAssignment(req, res);

    expect(assignment.update).toHaveBeenCalledWith({ status: 'FAILED' });
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test('returns alreadyConfirmed flag on second confirm', async () => {
    const token = 'token-confirmed';
    const tokenHash = hashToken(token);
    const assignment = {
      id: 3,
      status: 'CONFIRMED',
      employeeName: 'Bob',
      confirmToken: tokenHash,
      Device: { code: 'DEV-3' },
      update: jest.fn(),
    };
    Assignment.findOne.mockResolvedValue(assignment);

    const { req, res } = mockReqRes(token);
    await confirmAssignment(req, res);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ ok: true, alreadyConfirmed: true, deviceCode: 'DEV-3' }),
    );
    expect(assignment.update).not.toHaveBeenCalled();
  });
});
