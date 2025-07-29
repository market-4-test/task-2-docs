import type { IUser } from '@/types.ts';
import { USERS } from '@/constants/users.constants.ts';

export const findUserByToken = (token: string): IUser | undefined => USERS[token];