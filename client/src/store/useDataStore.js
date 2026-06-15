import { create } from 'zustand';

export const useDataStore = create((set) => ({
  data: null,
  selectedMetrics: [],
  selectedChecklistItemName: null,
  
  // Admin Inspection states
  adminUsers: [],
  inspectedUser: null,
  inspectedData: null,
  inspectedMetrics: [],
  inspectedSearch: '',
  isInspectDropdownOpen: false,
  loadingInspect: false,
  selectedOrganisation: null,
  overviewTab: 'dashboard',
  isTourOpen: false,

  setData: (data) => set({ data }),
  setSelectedMetrics: (selectedMetrics) => set({ selectedMetrics }),
  setSelectedChecklistItemName: (selectedChecklistItemName) => set({ selectedChecklistItemName }),

  setAdminUsers: (adminUsers) => set({ adminUsers }),
  setInspectedUser: (inspectedUser) => set({ inspectedUser }),
  setInspectedData: (inspectedData) => set({ inspectedData }),
  setInspectedMetrics: (inspectedMetrics) => set({ inspectedMetrics }),
  setInspectedSearch: (inspectedSearch) => set({ inspectedSearch }),
  setIsInspectDropdownOpen: (isInspectDropdownOpen) => set({ isInspectDropdownOpen }),
  setLoadingInspect: (loadingInspect) => set({ loadingInspect }),
  setSelectedOrganisation: (selectedOrganisation) => set({ selectedOrganisation }),
  setOverviewTab: (overviewTab) => set({ overviewTab }),
  setIsTourOpen: (isTourOpen) => set({ isTourOpen }),

  resetData: () => set({
    data: null,
    selectedMetrics: [],
    selectedChecklistItemName: null,
    adminUsers: [],
    inspectedUser: null,
    inspectedData: null,
    inspectedMetrics: [],
    inspectedSearch: '',
    isInspectDropdownOpen: false,
    loadingInspect: false,
    selectedOrganisation: null,
    overviewTab: 'dashboard',
    isTourOpen: false
  })
}));
