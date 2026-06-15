import { create } from 'zustand';

export const useFilterStore = create((set) => ({
  datePreset: 'all-time',
  startDate: '',
  endDate: '',
  selectedDepartment: 'Overview',

  deptDatePreset: 'all-time',
  deptStartDate: '',
  deptEndDate: '',

  setDatePreset: (datePreset) => set({ datePreset }),
  setStartDate: (startDate) => set({ startDate }),
  setEndDate: (endDate) => set({ endDate }),
  setSelectedDepartment: (selectedDepartment) => set({ selectedDepartment }),

  setDeptDatePreset: (deptDatePreset) => set({ deptDatePreset }),
  setDeptStartDate: (deptStartDate) => set({ deptStartDate }),
  setDeptEndDate: (deptEndDate) => set({ deptEndDate }),
  
  resetFilters: () => set({
    datePreset: 'all-time',
    startDate: '',
    endDate: '',
    selectedDepartment: 'Overview',
    deptDatePreset: 'all-time',
    deptStartDate: '',
    deptEndDate: ''
  })
}));
