import type { User } from './user-schema';
import bcrypt from 'bcryptjs';

// This is a mock database for users.
// The hashed password for 'masterpassword' is pre-calculated.
// In a real app, never store plain text passwords.
export let users: User[] = [
  {
    id: '1',
    username: 'master',
    // "masterpassword" hashed with bcrypt
    password: '$2a$10$9.M7GZ/r7e2.YFp35s/n5eJv/3fXbF.x2.D4g.OaJ1b.zQj4f3y7G',
    role: 'master',
  }
];
