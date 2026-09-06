import { create } from 'zustand';

export interface SubscriptionStatus {
  plan: 'trial' | 'basic' | 'medium' | 'premium' | string;
  status: 'trial' | 'active' | 'expired' | string;
  daysRemaining?: number;
  aiAccess?: boolean;
  message?: string;
  startDate?: string;
  endDate?: string;
  trialStartDate?: string;
  trialEndDate?: string;
}

export type PlatformRole =
  | 'SUPER_ADMIN'
  | 'COMPANY_OWNER'
  | 'SALES_MANAGER'
  | 'SALES_REPRESENTATIVE'
  | 'SuperAdmin'
  | 'Admin'
  | 'SalesManager'
  | 'SalesRep';

export type UserAccountStatus =
  | 'PENDING'
  | 'PENDING_COMPANY'
  | 'PENDING_APPROVAL'
  | 'ACTIVE'
  | 'SUSPENDED'
  | 'REJECTED';

export interface CompanyMembership {
  id: string;
  companyName: string;
  role: string;
  status: string;
}

export interface UserSession {
  id: string;
  name: string;
  email: string;
  role: PlatformRole;
  avatar?: string;
  companyId?: string;
  companyName?: string;
  companyStatus?: string;
  accountStatus?: UserAccountStatus;
  subscription?: SubscriptionStatus;
}

interface AuthState {
  user: UserSession | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  companies: CompanyMembership[];
  requiresCompanySelection: boolean;
  login: (accessToken: string, user: UserSession) => void;
  setMultiCompanySelection: (accessToken: string, user: UserSession, companies: CompanyMembership[]) => void;
  clearCompanySelection: () => void;
  logout: () => void;
  setAccessToken: (accessToken: string) => void;
  setLoading: (isLoading: boolean) => void;
  setAccountStatus: (status: UserAccountStatus) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
  isAuthenticated: false,
  isLoading: true, // Start in loading state to allow /auth/refresh session restoration
  companies: [],
  requiresCompanySelection: false,

  login: (accessToken, user) => {
    set({
      accessToken,
      user,
      isAuthenticated: true,
      isLoading: false,
      requiresCompanySelection: false,
      companies: [],
    });
  },

  setMultiCompanySelection: (accessToken, user, companies) => {
    set({
      accessToken,
      user,
      companies,
      requiresCompanySelection: true,
      isLoading: false,
      isAuthenticated: false, // Wait until company is chosen
    });
  },

  clearCompanySelection: () => {
    set({
      companies: [],
      requiresCompanySelection: false,
    });
  },

  logout: () => {
    set({
      accessToken: null,
      user: null,
      isAuthenticated: false,
      isLoading: false,
      companies: [],
      requiresCompanySelection: false,
    });
  },

  setAccessToken: (accessToken) => set({ accessToken }),

  setLoading: (isLoading) => set({ isLoading }),

  setAccountStatus: (status) =>
    set((state) => ({
      user: state.user ? { ...state.user, accountStatus: status } : null,
    })),
}));

export default useAuthStore;
