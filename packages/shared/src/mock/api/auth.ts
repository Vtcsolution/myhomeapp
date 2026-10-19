import type { AuthApi, Session } from '../../api/contracts';
import { ApiError } from '../../api/errors';
import { brand } from '../../brand/brand.config';
import { DAY_MS, MINUTE_MS, toMs } from '../../domain/time';
import { isValidKuwaitMobile, normalizeKuwaitPhone } from '../../format/phone';
import type { UserRole } from '../../types';
import type { MockContext } from './context';
import type { Runner } from './runner';

const OTP_TTL_MS = 5 * MINUTE_MS;
const SESSION_TTL_MS = 30 * DAY_MS;
const MAX_ATTEMPTS = 5;

export function createAuthApi(ctx: MockContext, run: Runner): AuthApi {
  const startSession = (role: UserRole, userId: string, isNewUser: boolean): Session => {
    const session: Session = {
      token: `mock.${role}.${userId}.${Math.random().toString(36).slice(2, 10)}`,
      role,
      userId,
      expiresAt: new Date(ctx.now() + SESSION_TTL_MS).toISOString(),
      isNewUser,
    };
    ctx.state.session = session;
    return session;
  };

  return {
    requestOtp: (phone, role) =>
      run.write(() => {
        if (!isValidKuwaitMobile(phone)) {
          throw new ApiError('VALIDATION', 'Enter a valid Kuwaiti mobile number.');
        }
        const normalized = normalizeKuwaitPhone(phone) as string;
        if (role === 'technician' && !ctx.state.technicians.some((t) => t.phone === normalized)) {
          throw new ApiError(
            'NOT_REGISTERED',
            `This number is not registered as a ${brand.name} professional.`,
          );
        }
        const customer = ctx.state.customers.find((c) => c.phone === normalized);
        if (role === 'customer' && customer?.status === 'blocked') {
          throw new ApiError(
            'ACCOUNT_BLOCKED',
            'This account has been suspended. Please contact support.',
          );
        }
        const record = {
          id: ctx.nextId('otp'),
          phone: normalized,
          role,
          code: ctx.config.demoOtpCode,
          expiresAt: new Date(ctx.now() + OTP_TTL_MS).toISOString(),
          attempts: 0,
          used: false,
        };
        ctx.state.otpRequests = [
          ...ctx.state.otpRequests.filter((o) => !o.used).slice(-20),
          record,
        ];
        return {
          requestId: record.id,
          phone: normalized,
          expiresInSec: OTP_TTL_MS / 1000,
          resendInSec: 30,
          demoCode: record.code,
        };
      }),

    verifyOtp: (requestId, code) =>
      run.write(() => {
        const record = ctx.state.otpRequests.find((o) => o.id === requestId);
        if (
          !record ||
          record.used ||
          toMs(record.expiresAt) < ctx.now() ||
          record.attempts >= MAX_ATTEMPTS
        ) {
          throw new ApiError('OTP_EXPIRED', 'This code has expired. Please request a new one.');
        }
        if (code.trim() !== record.code) {
          record.attempts += 1;
          throw new ApiError('OTP_INVALID', 'The code you entered is incorrect.', {
            attemptsLeft: MAX_ATTEMPTS - record.attempts,
          });
        }
        record.used = true;

        if (record.role === 'technician') {
          const technician = ctx.state.technicians.find((t) => t.phone === record.phone);
          if (!technician) throw new ApiError('NOT_REGISTERED', 'This number is not registered.');
          return startSession('technician', technician.id, false);
        }

        let customer = ctx.state.customers.find((c) => c.phone === record.phone);
        const isNew = !customer;
        if (!customer) {
          customer = {
            id: ctx.nextId('cus'),
            fullName: '',
            phone: record.phone,
            preferredLocale: 'en',
            membership: 'classic',
            addresses: [],
            walletBalance: 0,
            status: 'active',
            createdAt: ctx.nowISO(),
          };
          ctx.state.customers.push(customer);
        }
        return startSession('customer', customer.id, isNew || !customer.fullName);
      }),

    adminSignIn: (email, password) =>
      run.write(() => {
        const admin = ctx.state.admins.find(
          (a) => a.email.toLowerCase() === email.trim().toLowerCase(),
        );
        if (!admin || admin.password !== password) {
          throw new ApiError('UNAUTHORIZED', 'Invalid email or password.');
        }
        return startSession('admin', admin.id, false);
      }),

    getSession: () =>
      run.read(() => {
        const session = ctx.state.session;
        return session && toMs(session.expiresAt) > ctx.now() ? session : null;
      }),

    restoreSession: (session) =>
      run.write(() => {
        const exists =
          (session.role === 'customer' &&
            ctx.state.customers.some((c) => c.id === session.userId)) ||
          (session.role === 'technician' &&
            ctx.state.technicians.some((t) => t.id === session.userId)) ||
          (session.role === 'admin' && ctx.state.admins.some((a) => a.id === session.userId));
        if (!exists || toMs(session.expiresAt) <= ctx.now()) {
          throw new ApiError('UNAUTHORIZED', 'Session is no longer valid.');
        }
        ctx.state.session = session;
      }),

    signOut: () =>
      run.write(() => {
        ctx.state.session = null;
      }),
  };
}
