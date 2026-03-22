import { pgTable, text, serial, integer, boolean, timestamp, date, numeric, uuid } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// === TABLE DEFINITIONS (Mirroring Supabase Schema) ===

// 1. Profiles (linked to auth.users)
export const profiles = pgTable("profiles", {
  id: uuid("id").primaryKey(), // references auth.users(id)
  role: text("role").notNull(), // 'owner' | 'labour'
  labourCode: text("labour_code"), // unique nullable
  name: text("name"),
  phone: text("phone"),
  address: text("address"),
  upiId: text("upi_id"),
  upiQrUrl: text("upi_qr_url"),
  createdAt: timestamp("created_at").defaultNow(),
});

// 2. Bills
export const bills = pgTable("bills", {
  id: uuid("id").primaryKey().defaultRandom(),
  billNo: text("bill_no").unique().notNull(),
  ownerUserId: uuid("owner_user_id").notNull(),
  companyName: text("company_name").notNull(),
  billDate: date("bill_date").notNull(),
  totalAmount: numeric("total_amount").default('0'),
  pdfUrl: text("pdf_url"),
  createdAt: timestamp("created_at").defaultNow(),
});

// 3. Bill Items
export const billItems = pgTable("bill_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  billId: uuid("bill_id").references(() => bills.id, { onDelete: 'cascade' }),
  slNo: integer("sl_no").notNull(),
  colour: text("colour"),
  illai: integer("illai"),
  lengthM: integer("length_m"),
  quantity: integer("quantity"),
  amount: numeric("amount"),
  createdAt: timestamp("created_at").defaultNow(),
});

// 4. Stocks
export const stocks = pgTable("stocks", {
  id: uuid("id").primaryKey().defaultRandom(),
  stockNo: text("stock_no").unique().notNull(),
  ownerUserId: uuid("owner_user_id").notNull(),
  companyName: text("company_name"),
  stockDate: date("stock_date").notNull(),
  totalAmount: numeric("total_amount").default('0'),
  createdAt: timestamp("created_at").defaultNow(),
});

// 5. Stock Items
export const stockItems = pgTable("stock_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  stockId: uuid("stock_id").references(() => stocks.id, { onDelete: 'cascade' }),
  slNo: integer("sl_no").notNull(),
  colour: text("colour"),
  no: integer("no"),
  weight: integer("weight"),
  count: integer("count"),
  amount: numeric("amount"),
  createdAt: timestamp("created_at").defaultNow(),
});

// 6. Labour Work Records
export const labourWorkRecords = pgTable("labour_work_records", {
  id: uuid("id").primaryKey().defaultRandom(),
  labourUserId: uuid("labour_user_id").notNull(), // references auth.users(id)
  workDate: date("work_date").notNull().defaultNow(),
  slNo: integer("sl_no"),
  colour: text("colour"),
  length: integer("length"),
  illai: integer("illai"),
  setCount: integer("set_count"),
  amount: numeric("amount"),
  createdAt: timestamp("created_at").defaultNow(),
});

// 7. Salary Payments
export const salaryPayments = pgTable("salary_payments", {
  id: uuid("id").primaryKey().defaultRandom(),
  ownerUserId: uuid("owner_user_id").notNull(),
  labourUserId: uuid("labour_user_id").notNull(),
  workRecordId: uuid("work_record_id").references(() => labourWorkRecords.id, { onDelete: 'set null' }),
  salaryAmount: numeric("salary_amount").notNull(),
  status: text("status").default('PENDING'), // 'PENDING' | 'PAID'
  paidDate: date("paid_date"),
  createdAt: timestamp("created_at").defaultNow(),
});

// === RELATIONS ===
export const billsRelations = relations(bills, ({ many }) => ({
  items: many(billItems),
}));

export const billItemsRelations = relations(billItems, ({ one }) => ({
  bill: one(bills, {
    fields: [billItems.billId],
    references: [bills.id],
  }),
}));

export const stocksRelations = relations(stocks, ({ many }) => ({
  items: many(stockItems),
}));

export const stockItemsRelations = relations(stockItems, ({ one }) => ({
  stock: one(stocks, {
    fields: [stockItems.stockId],
    references: [stocks.id],
  }),
}));

export const labourWorkRecordsRelations = relations(labourWorkRecords, ({ one }) => ({
  profile: one(profiles, {
    fields: [labourWorkRecords.labourUserId],
    references: [profiles.id],
  }),
}));


// === SCHEMAS ===

// Profiles
export const insertProfileSchema = createInsertSchema(profiles);
export const selectProfileSchema = createInsertSchema(profiles);
export type InsertProfile = z.infer<typeof insertProfileSchema>;
export type Profile = typeof profiles.$inferSelect;

// Bills
export const insertBillSchema = createInsertSchema(bills).omit({ id: true, createdAt: true });
export type InsertBill = z.infer<typeof insertBillSchema>;
export type Bill = typeof bills.$inferSelect;

// Bill Items
export const insertBillItemSchema = createInsertSchema(billItems).omit({ id: true, createdAt: true });
export type InsertBillItem = z.infer<typeof insertBillItemSchema>;
export type BillItem = typeof billItems.$inferSelect;

// Stocks
export const insertStockSchema = createInsertSchema(stocks).omit({ id: true, createdAt: true });
export type InsertStock = z.infer<typeof insertStockSchema>;
export type Stock = typeof stocks.$inferSelect;

// Stock Items
export const insertStockItemSchema = createInsertSchema(stockItems).omit({ id: true, createdAt: true });
export type InsertStockItem = z.infer<typeof insertStockItemSchema>;
export type StockItem = typeof stockItems.$inferSelect;

// Labour Work Records
export const insertLabourWorkRecordSchema = createInsertSchema(labourWorkRecords).omit({ id: true, createdAt: true });
export type InsertLabourWorkRecord = z.infer<typeof insertLabourWorkRecordSchema>;
export type LabourWorkRecord = typeof labourWorkRecords.$inferSelect;

// Salary Payments
export const insertSalaryPaymentSchema = createInsertSchema(salaryPayments).omit({ id: true, createdAt: true });
export type InsertSalaryPayment = z.infer<typeof insertSalaryPaymentSchema>;
export type SalaryPayment = typeof salaryPayments.$inferSelect;


// === API CONTRACT TYPES ===

// Auth/User types
export type UserRole = 'owner' | 'labour';

// Bill + Items structure for creation
export const createBillWithItemsSchema = z.object({
  bill: insertBillSchema,
  items: z.array(insertBillItemSchema)
});
export type CreateBillWithItems = z.infer<typeof createBillWithItemsSchema>;

// Stock + Items structure for creation
export const createStockWithItemsSchema = z.object({
  stock: insertStockSchema,
  items: z.array(insertStockItemSchema)
});
export type CreateStockWithItems = z.infer<typeof createStockWithItemsSchema>;

// Labour creation by Owner
export const createLabourUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string(),
  labourCode: z.string()
});
export type CreateLabourUser = z.infer<typeof createLabourUserSchema>;
