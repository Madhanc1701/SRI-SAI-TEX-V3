import { z } from 'zod';
import { 
  insertProfileSchema, 
  insertBillSchema, 
  insertBillItemSchema,
  insertStockSchema,
  insertStockItemSchema,
  insertLabourWorkRecordSchema,
  insertSalaryPaymentSchema,
  createBillWithItemsSchema,
  createStockWithItemsSchema,
  createLabourUserSchema,
  rateConfigSchema,
  profiles,
  bills,
  stocks,
  labourWorkRecords,
  salaryPayments,
  rateConfig
} from './schema';

// Export the types that are missing in the frontend
export { 
  insertProfileSchema, 
  insertBillSchema, 
  insertBillItemSchema,
  insertStockSchema,
  insertStockItemSchema,
  insertLabourWorkRecordSchema,
  insertSalaryPaymentSchema,
  createBillWithItemsSchema,
  createStockWithItemsSchema,
  createLabourUserSchema,
  rateConfigSchema
};

export type { 
  InsertProfile, 
  InsertBill, 
  InsertBillItem, 
  InsertStock, 
  InsertStockItem, 
  InsertLabourWorkRecord, 
  InsertSalaryPayment,
  CreateBillWithItems,
  CreateStockWithItems,
  CreateLabourUser,
  RateRange,
  RateConfigData,
  RateConfigRow
} from './schema';


// ============================================
// SHARED ERROR SCHEMAS
// ============================================
export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  internal: z.object({
    message: z.string(),
  }),
  unauthorized: z.object({
    message: z.string(),
  }),
};

// ============================================
// API CONTRACT
// ============================================
export const api = {
  // --- Auth & Profiles ---
  auth: {
    me: {
      method: 'GET' as const,
      path: '/api/auth/me' as const,
      responses: {
        200: z.object({
          user: z.any(), // Supabase user object
          profile: z.custom<typeof profiles.$inferSelect>().nullable()
        }),
        401: errorSchemas.unauthorized
      }
    }
  },
  profiles: {
    get: {
      method: 'GET' as const,
      path: '/api/profiles/:id' as const,
      responses: {
        200: z.custom<typeof profiles.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    update: {
      method: 'PATCH' as const,
      path: '/api/profiles/:id' as const,
      input: insertProfileSchema.partial(),
      responses: {
        200: z.custom<typeof profiles.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    listLabour: { // For owner to see all labour profiles
      method: 'GET' as const,
      path: '/api/profiles/labour' as const,
      responses: {
        200: z.array(z.custom<typeof profiles.$inferSelect>()),
      },
    },
    createLabour: { // Owner creates labour account
      method: 'POST' as const,
      path: '/api/profiles/labour' as const,
      input: createLabourUserSchema,
      responses: {
        201: z.object({
          user: z.any(),
          profile: z.custom<typeof profiles.$inferSelect>()
        }),
        400: errorSchemas.validation,
        500: errorSchemas.internal
      }
    }
  },

  // --- Bills ---
  bills: {
    list: {
      method: 'GET' as const,
      path: '/api/bills' as const,
      input: z.object({
        billNo: z.string().optional(),
        companyName: z.string().optional(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        colour: z.string().optional(),
        illai: z.string().optional(),
        lengthM: z.string().optional(),
      }).optional(),
      responses: {
        200: z.array(z.custom<typeof bills.$inferSelect>()),
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/bills/:id' as const,
      responses: {
        200: z.object({
          bill: z.custom<typeof bills.$inferSelect>(),
          items: z.array(z.any()) // Using any for joined items to simplify for now, strictly it's billItems type
        }),
        404: errorSchemas.notFound,
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/bills' as const,
      input: createBillWithItemsSchema,
      responses: {
        201: z.object({
          bill: z.custom<typeof bills.$inferSelect>(),
          pdfUrl: z.string().optional()
        }),
        400: errorSchemas.validation,
      },
    },
  },

  // --- Stocks ---
  stocks: {
    list: {
      method: 'GET' as const,
      path: '/api/stocks' as const,
      input: z.object({
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        colour: z.string().optional(),
      }).optional(),
      responses: {
        200: z.array(z.custom<typeof stocks.$inferSelect>()),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/stocks' as const,
      input: createStockWithItemsSchema,
      responses: {
        201: z.custom<typeof stocks.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
  },

  // --- Labour Work Records ---
  labourWork: {
    list: { // Owner sees all, Labour sees own
      method: 'GET' as const,
      path: '/api/work-records' as const,
      input: z.object({
        labourUserId: z.string().optional(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
      }).optional(),
      responses: {
        200: z.array(z.custom<typeof labourWorkRecords.$inferSelect>()),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/work-records' as const,
      input: insertLabourWorkRecordSchema,
      responses: {
        201: z.custom<typeof labourWorkRecords.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
  },

  // --- Salary Payments ---
  salaries: {
    list: {
      method: 'GET' as const,
      path: '/api/salaries' as const,
      input: z.object({
        labourUserId: z.string().optional(),
        status: z.enum(['PENDING', 'PAID']).optional(),
      }).optional(),
      responses: {
        200: z.array(z.custom<typeof salaryPayments.$inferSelect>()),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/salaries' as const,
      input: insertSalaryPaymentSchema,
      responses: {
        201: z.custom<typeof salaryPayments.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    update: {
      method: 'PATCH' as const,
      path: '/api/salaries/:id' as const,
      input: z.object({
        status: z.enum(['PENDING', 'PAID']),
        paidDate: z.string().optional()
      }),
      responses: {
        200: z.custom<typeof salaryPayments.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    }
  },

  // --- Rate Config ---
  rateConfig: {
    get: {
      method: 'GET' as const,
      path: '/api/rate-config' as const,
      responses: {
        200: z.object({
          lengthRanges: z.array(z.object({ min: z.number(), max: z.number().nullable(), rate: z.number() })),
          illaiRanges: z.array(z.object({ min: z.number(), max: z.number().nullable(), rate: z.number() })),
        })
      }
    },
    update: {
      method: 'PUT' as const,
      path: '/api/rate-config' as const,
      input: rateConfigSchema,
      responses: {
        200: z.object({
          lengthRanges: z.array(z.object({ min: z.number(), max: z.number().nullable(), rate: z.number() })),
          illaiRanges: z.array(z.object({ min: z.number(), max: z.number().nullable(), rate: z.number() })),
        })
      }
    }
  }
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}
