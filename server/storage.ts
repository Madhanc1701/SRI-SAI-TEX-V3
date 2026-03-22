import { db } from "./db";
import {
  profiles, bills, billItems, stocks, stockItems, labourWorkRecords, salaryPayments,
  type InsertProfile, type InsertBill, type InsertBillItem, type InsertStock, type InsertStockItem,
  type InsertLabourWorkRecord, type InsertSalaryPayment, type Profile, type Bill, type Stock,
  type LabourWorkRecord, type SalaryPayment, type CreateLabourUser
} from "@shared/schema";
import { eq, desc, and, gte, lte, sql, count, ilike, inArray } from "drizzle-orm";
import { supabaseAdmin } from "./lib/supabase";

export interface IStorage {
  // Profiles
  getProfile(id: string): Promise<Profile | undefined>;
  updateProfile(id: string, profile: Partial<InsertProfile>): Promise<Profile>;
  createLabourUser(data: CreateLabourUser): Promise<Profile>;
  getLabourProfiles(): Promise<Profile[]>;

  // Bills
  getBills(filters?: { companyName?: string; billNo?: string; startDate?: string; endDate?: string; colour?: string; illai?: string; lengthM?: string }): Promise<Bill[]>;
  getBill(id: string): Promise<Bill | undefined>;
  getBillItems(billId: string): Promise<any[]>;
  createBill(bill: InsertBill, items: InsertBillItem[]): Promise<Bill>;
  updateBill(id: string, bill: Partial<InsertBill>, items: InsertBillItem[]): Promise<Bill>;
  getNextBillNo(): Promise<number>;
  getFrequentCompanies(limit?: number): Promise<{ companyName: string; count: number }[]>;

  // Stocks
  getStocks(filters?: { startDate?: string; endDate?: string; colour?: string }): Promise<Stock[]>;
  getStock(id: string): Promise<Stock | undefined>;
  getStockItems(stockId: string): Promise<any[]>;
  createStock(stock: InsertStock, items: InsertStockItem[]): Promise<Stock>;
  updateStock(id: string, stock: Partial<InsertStock>, items: InsertStockItem[]): Promise<Stock>;
  getNextStockNo(): Promise<number>;

  // Labour Work
  getLabourWorkRecords(filters?: { labourUserId?: string; startDate?: string; endDate?: string }): Promise<LabourWorkRecord[]>;
  createLabourWorkRecord(record: InsertLabourWorkRecord): Promise<LabourWorkRecord>;

  // Salaries
  getSalaryPayments(filters?: { labourUserId?: string; status?: 'PENDING' | 'PAID' }): Promise<SalaryPayment[]>;
  createSalaryPayment(payment: InsertSalaryPayment): Promise<SalaryPayment>;
  updateSalaryPayment(id: string, status: 'PENDING' | 'PAID', paidDate?: string): Promise<SalaryPayment>;
}

export class DatabaseStorage implements IStorage {
  // --- Profiles ---
  async getProfile(id: string): Promise<Profile | undefined> {
    const [profile] = await db.select().from(profiles).where(eq(profiles.id, id));
    return profile;
  }

  async updateProfile(id: string, profile: Partial<InsertProfile>): Promise<Profile> {
    const [updated] = await db.update(profiles)
      .set(profile)
      .where(eq(profiles.id, id))
      .returning();
    return updated;
  }

  async createLabourUser(data: CreateLabourUser): Promise<Profile> {
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: { role: 'labour' }
    });

    if (authError || !authData.user) {
      throw new Error(`Failed to create auth user: ${authError?.message}`);
    }

    const [profile] = await db.insert(profiles).values({
      id: authData.user.id,
      role: 'labour',
      name: data.name,
      labourCode: data.labourCode
    }).returning();

    return profile;
  }

  async getLabourProfiles(): Promise<Profile[]> {
    return await db.select().from(profiles).where(eq(profiles.role, 'labour'));
  }

  // --- Bills ---
  async getBills(filters?: { companyName?: string; billNo?: string; startDate?: string; endDate?: string; colour?: string; illai?: string; lengthM?: string }): Promise<Bill[]> {
    const conditions: any[] = [];

    if (filters?.billNo) conditions.push(eq(bills.billNo, filters.billNo));
    if (filters?.companyName) conditions.push(ilike(bills.companyName, `%${filters.companyName}%`));
    if (filters?.startDate) conditions.push(gte(bills.billDate, filters.startDate));
    if (filters?.endDate) conditions.push(lte(bills.billDate, filters.endDate));

    // If filtering by item-level fields, collect matching bill IDs first
    if (filters?.colour || filters?.illai || filters?.lengthM) {
      const itemConditions: any[] = [];
      if (filters.colour) itemConditions.push(ilike(billItems.colour, `%${filters.colour}%`));
      if (filters.illai) itemConditions.push(eq(billItems.illai, parseInt(filters.illai)));
      if (filters.lengthM) itemConditions.push(eq(billItems.lengthM, parseInt(filters.lengthM)));

      const matchingBillItems = await db
        .selectDistinct({ billId: billItems.billId })
        .from(billItems)
        .where(and(...itemConditions));

      const matchingBillIds = matchingBillItems.map(r => r.billId).filter(Boolean) as string[];
      if (matchingBillIds.length === 0) return [];
      conditions.push(inArray(bills.id, matchingBillIds));
    }

    const query = conditions.length > 0
      ? db.select().from(bills).where(and(...conditions)).orderBy(desc(bills.billDate))
      : db.select().from(bills).orderBy(desc(bills.billDate));

    return await query;
  }

  async getBill(id: string): Promise<Bill | undefined> {
    const [bill] = await db.select().from(bills).where(eq(bills.id, id));
    return bill;
  }

  async getBillItems(billId: string): Promise<any[]> {
    return await db.select().from(billItems).where(eq(billItems.billId, billId));
  }

  async createBill(bill: InsertBill, items: InsertBillItem[]): Promise<Bill> {
    return await db.transaction(async (tx) => {
      const [newBill] = await tx.insert(bills).values(bill).returning();
      
      if (items.length > 0) {
        await tx.insert(billItems).values(
          items.map(item => ({ ...item, billId: newBill.id }))
        );
      }
      
      return newBill;
    });
  }

  async updateBill(id: string, bill: Partial<InsertBill>, items: InsertBillItem[]): Promise<Bill> {
    return await db.transaction(async (tx) => {
      const [updatedBill] = await tx.update(bills)
        .set(bill)
        .where(eq(bills.id, id))
        .returning();

      await tx.delete(billItems).where(eq(billItems.billId, id));
      if (items.length > 0) {
        await tx.insert(billItems).values(
          items.map(item => ({ ...item, billId: id }))
        );
      }

      return updatedBill;
    });
  }

  async getNextBillNo(): Promise<number> {
    // Fetch all bill numbers and filter numerics in JS to avoid SQL CAST errors on legacy IDs like "INV-126068"
    const result = await db.select({ billNo: bills.billNo }).from(bills);
    const numericNos = result
      .map(r => parseInt(r.billNo, 10))
      .filter(n => !isNaN(n) && n > 0);
    return numericNos.length > 0 ? Math.max(...numericNos) + 1 : 1;
  }

  async getFrequentCompanies(limit = 5): Promise<{ companyName: string; count: number }[]> {
    const result = await db
      .select({
        companyName: bills.companyName,
        count: count(bills.id)
      })
      .from(bills)
      .groupBy(bills.companyName)
      .orderBy(desc(count(bills.id)))
      .limit(limit);
    return result.map(r => ({ companyName: r.companyName, count: Number(r.count) }));
  }

  // --- Stocks ---
  async getStocks(filters?: { startDate?: string; endDate?: string; colour?: string }): Promise<Stock[]> {
    const conditions: any[] = [];

    if (filters?.startDate) conditions.push(gte(stocks.stockDate, filters.startDate));
    if (filters?.endDate) conditions.push(lte(stocks.stockDate, filters.endDate));

    // If colour filter, find matching stock IDs via stock items
    if (filters?.colour) {
      const matchingItems = await db
        .selectDistinct({ stockId: stockItems.stockId })
        .from(stockItems)
        .where(ilike(stockItems.colour, `%${filters.colour}%`));

      const matchingIds = matchingItems.map(r => r.stockId).filter(Boolean) as string[];
      if (matchingIds.length === 0) return [];
      conditions.push(inArray(stocks.id, matchingIds));
    }

    const query = conditions.length > 0
      ? db.select().from(stocks).where(and(...conditions)).orderBy(desc(stocks.stockDate))
      : db.select().from(stocks).orderBy(desc(stocks.stockDate));

    return await query;
  }

  async getStock(id: string): Promise<Stock | undefined> {
    const [stock] = await db.select().from(stocks).where(eq(stocks.id, id));
    return stock;
  }

  async getStockItems(stockId: string): Promise<any[]> {
    return await db.select().from(stockItems).where(eq(stockItems.stockId, stockId));
  }

  async createStock(stock: InsertStock, items: InsertStockItem[]): Promise<Stock> {
    return await db.transaction(async (tx) => {
      const [newStock] = await tx.insert(stocks).values(stock).returning();
      
      if (items.length > 0) {
        await tx.insert(stockItems).values(
          items.map(item => ({ ...item, stockId: newStock.id }))
        );
      }
      
      return newStock;
    });
  }

  async updateStock(id: string, stock: Partial<InsertStock>, items: InsertStockItem[]): Promise<Stock> {
    return await db.transaction(async (tx) => {
      const [updatedStock] = await tx.update(stocks)
        .set(stock)
        .where(eq(stocks.id, id))
        .returning();

      await tx.delete(stockItems).where(eq(stockItems.stockId, id));
      if (items.length > 0) {
        await tx.insert(stockItems).values(
          items.map(item => ({ ...item, stockId: id }))
        );
      }

      return updatedStock;
    });
  }

  async getNextStockNo(): Promise<number> {
    // Fetch all stock numbers and filter numerics in JS to avoid SQL CAST errors on legacy IDs like "STK-155253"
    const result = await db.select({ stockNo: stocks.stockNo }).from(stocks);
    const numericNos = result
      .map(r => parseInt(r.stockNo, 10))
      .filter(n => !isNaN(n) && n > 0);
    return numericNos.length > 0 ? Math.max(...numericNos) + 1 : 1;
  }

  // --- Labour Work ---
  async getLabourWorkRecords(filters?: { labourUserId?: string; startDate?: string; endDate?: string }): Promise<LabourWorkRecord[]> {
    const conditions: any[] = [];

    if (filters?.labourUserId) conditions.push(eq(labourWorkRecords.labourUserId, filters.labourUserId));
    if (filters?.startDate) conditions.push(gte(labourWorkRecords.workDate, filters.startDate));
    if (filters?.endDate) conditions.push(lte(labourWorkRecords.workDate, filters.endDate));

    const query = conditions.length > 0
      ? db.select().from(labourWorkRecords).where(and(...conditions)).orderBy(desc(labourWorkRecords.workDate))
      : db.select().from(labourWorkRecords).orderBy(desc(labourWorkRecords.workDate));

    return await query;
  }

  async createLabourWorkRecord(record: InsertLabourWorkRecord): Promise<LabourWorkRecord> {
    const [newRecord] = await db.insert(labourWorkRecords).values(record).returning();
    return newRecord;
  }

  // --- Salaries ---
  async getSalaryPayments(filters?: { labourUserId?: string; status?: 'PENDING' | 'PAID' }): Promise<SalaryPayment[]> {
    const conditions: any[] = [];

    if (filters?.labourUserId) conditions.push(eq(salaryPayments.labourUserId, filters.labourUserId));
    if (filters?.status) conditions.push(eq(salaryPayments.status, filters.status));

    const query = conditions.length > 0
      ? db.select().from(salaryPayments).where(and(...conditions)).orderBy(desc(salaryPayments.createdAt))
      : db.select().from(salaryPayments).orderBy(desc(salaryPayments.createdAt));

    return await query;
  }

  async createSalaryPayment(payment: InsertSalaryPayment): Promise<SalaryPayment> {
    const [newPayment] = await db.insert(salaryPayments).values(payment).returning();
    return newPayment;
  }

  async updateSalaryPayment(id: string, status: 'PENDING' | 'PAID', paidDate?: string): Promise<SalaryPayment> {
    const [updated] = await db.update(salaryPayments)
      .set({ status, paidDate })
      .where(eq(salaryPayments.id, id))
      .returning();
    return updated;
  }
}

export const storage = new DatabaseStorage();
