import { z } from 'zod';

export const onboardingSchema = z.object({
  registerNumber: z
    .string()
    .trim()
    .regex(/^\d{7}$/, { error: 'Регистрийн дугаар 7 оронтой тоо байна' }),
  email: z
    .string()
    .trim()
    .min(1, { error: 'Имэйл хаягаа оруулна уу' })
    .pipe(z.email({ error: 'Имэйл хаяг буруу байна' })),
  phone: z
    .string()
    .trim()
    .regex(/^\d{8}$/, { error: 'Утасны дугаар 8 оронтой байна' }),
  acceptTerms: z.boolean().refine((v) => v, { error: 'Үйлчилгээний нөхцөлийг зөвшөөрнө үү' }),
});

export type OnboardingValues = z.infer<typeof onboardingSchema>;
