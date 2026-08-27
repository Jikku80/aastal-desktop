import { AccountType, normalBalanceForType } from './entities/account.entity';
import { ExpenseCategory } from '../expenses/entities/expense.entity';

/**
 * Sensible default COA seeded per clinic on creation (Phase 9 §1).
 * Codes follow the conventional 1000s=Asset / 2000s=Liability /
 * 3000s=Equity / 4000s=Revenue / 5000s=Expense block layout so an admin
 * adding sub-accounts later has an obvious range to drop them in.
 */
export interface DefaultAccountSeed {
  code: string;
  name: string;
  type: AccountType;
  description?: string;
}

export const DEFAULT_COA: DefaultAccountSeed[] = [
  // Assets
  { code: '1000', name: 'Cash', type: AccountType.ASSET, description: 'Cash and cash-equivalent receipts (cash, card, mobile wallet, bank transfer settlements).' },
  { code: '1100', name: 'Accounts Receivable', type: AccountType.ASSET, description: 'Amounts owed by patients on unpaid/partially-paid invoices.' },
  { code: '1200', name: 'Inventory', type: AccountType.ASSET, description: 'Pharmacy and medical-supply stock on hand, at cost.' },

  // Liabilities
  { code: '2000', name: 'Accounts Payable', type: AccountType.LIABILITY, description: 'Amounts owed to vendors/suppliers.' },

  // Equity
  { code: '3000', name: "Owner's Equity", type: AccountType.EQUITY, description: "Owner's capital contributions and retained earnings." },

  // Revenue
  { code: '4000', name: 'Service Revenue', type: AccountType.REVENUE, description: 'Consultation and clinical-service revenue.' },
  { code: '4100', name: 'Pharmacy Revenue', type: AccountType.REVENUE, description: 'Dispensed-medicine sales revenue.' },
  { code: '4200', name: 'Lab Revenue', type: AccountType.REVENUE, description: 'Lab/diagnostic test revenue.' },
  { code: '4900', name: 'Other Revenue', type: AccountType.REVENUE, description: 'Website-order and miscellaneous revenue.' },

  // Expenses — one per ExpenseCategory so the auto-posting hook has a
  // stable 1:1 mapping (see finance-category-map.ts) plus a payroll and
  // a write-off specific pair for the two flows the phase doc calls out
  // by name.
  { code: '5000', name: 'Salaries Expense', type: AccountType.EXPENSE },
  { code: '5100', name: 'Rent Expense', type: AccountType.EXPENSE },
  { code: '5200', name: 'Utilities Expense', type: AccountType.EXPENSE },
  { code: '5300', name: 'Medical Supplies Expense', type: AccountType.EXPENSE },
  { code: '5400', name: 'Equipment Expense', type: AccountType.EXPENSE },
  { code: '5500', name: 'Marketing Expense', type: AccountType.EXPENSE },
  { code: '5600', name: 'Maintenance Expense', type: AccountType.EXPENSE },
  { code: '5700', name: 'Software Expense', type: AccountType.EXPENSE },
  { code: '5800', name: 'Lab Supplies Expense', type: AccountType.EXPENSE },
  { code: '5900', name: 'Inventory Write-off Expense', type: AccountType.EXPENSE, description: 'Expired/disposed pharmacy stock, at cost — see Pharmacy → Dispose Expired Stock.' },
  { code: '5999', name: 'Other Expense', type: AccountType.EXPENSE },
];

/** Maps ExpenseCategory → the default account code it posts against. Kept
 * as its own lookup (not inlined in JournalService) so it's the one place
 * to update if a clinic's admin ever wants to remap a category. */
export const EXPENSE_CATEGORY_ACCOUNT_CODE: Record<ExpenseCategory, string> = {
  [ExpenseCategory.SALARIES]:         '5000',
  [ExpenseCategory.RENT]:             '5100',
  [ExpenseCategory.UTILITIES]:        '5200',
  [ExpenseCategory.MEDICAL_SUPPLIES]: '5300',
  [ExpenseCategory.EQUIPMENT]:        '5400',
  [ExpenseCategory.MARKETING]:        '5500',
  [ExpenseCategory.MAINTENANCE]:      '5600',
  [ExpenseCategory.SOFTWARE]:         '5700',
  [ExpenseCategory.LAB_SUPPLIES]:     '5800',
  [ExpenseCategory.INVENTORY]:        '5900',
  [ExpenseCategory.OTHER]:            '5999',
};

export const CASH_ACCOUNT_CODE               = '1000';
export const SERVICE_REVENUE_ACCOUNT_CODE    = '4000';
export const PHARMACY_REVENUE_ACCOUNT_CODE   = '4100';
export const LAB_REVENUE_ACCOUNT_CODE        = '4200';
export const OTHER_REVENUE_ACCOUNT_CODE      = '4900';
export const OWNERS_EQUITY_ACCOUNT_CODE      = '3000';

export { normalBalanceForType };