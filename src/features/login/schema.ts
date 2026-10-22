import { z } from 'zod';

export const loginSchema = z.object({
  username: z.string().trim().min(1, { error: 'Нэвтрэх нэрээ оруулна уу' }),
  password: z.string().min(1, { error: 'Нууц үгээ оруулна уу' }),
  remember: z.boolean(),
});

export type LoginValues = z.infer<typeof loginSchema>;
