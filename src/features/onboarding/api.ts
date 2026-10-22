import type { OnboardingValues } from './schema';

export interface ConnectedOrganization {
  registerNumber: string;
  name: string;
}

export class OnboardingError extends Error {}

/** Register number that makes the mock fail, to demo the error and rewind path. */
export const DEMO_FAILING_REGISTER = '0000000';

/**
 * Mock of the request that opens M corporate for an organisation.
 * Replace with the real API call; the animation only needs the promise to
 * resolve (build the mark) or reject (rewind to the star field).
 */
export async function connectOrganization(values: OnboardingValues): Promise<ConnectedOrganization> {
  await new Promise((resolve) => setTimeout(resolve, 5200));
  if (values.registerNumber === DEMO_FAILING_REGISTER) {
    throw new OnboardingError('Энэ регистрийн дугаартай байгууллага олдсонгүй. Дугаараа шалгаад дахин оролдоно уу.');
  }
  return { registerNumber: values.registerNumber, name: 'Жишээ ХХК' };
}
